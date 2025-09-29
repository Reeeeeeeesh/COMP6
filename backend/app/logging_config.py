"""
Centralized logging configuration with PII-safe formatting.
Provides structured JSON logging with automatic PII scrubbing for compliance.
"""

import json
import logging
import logging.config
import os
import re
from datetime import datetime
from typing import Dict, Any, Optional, List, Union
from pathlib import Path

from .models import AuditEvent
from .utils.pii_utils import sanitize_for_logging, mask_pii


class PIISafeFormatter(logging.Formatter):
    """
    Custom formatter that automatically redacts PII from log messages.
    Extends standard JSON formatter with PII scrubbing capabilities.
    """
    
    # PII patterns to redact
    PII_PATTERNS = {
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'ssn': re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
        'phone': re.compile(r'\b\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})\b'),
        'credit_card': re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
        'employee_id': re.compile(r'\b[Ee][Mm][Pp]\d{3,}\b'),
    }
    
    # Sensitive field names that should be masked
    SENSITIVE_FIELDS = {
        'password', 'passwd', 'pwd', 'secret', 'token', 'key', 'api_key',
        'salary', 'compensation', 'bonus', 'pay', 'wage', 'income',
        'ssn', 'social_security', 'tax_id', 'employee_id', 'emp_id',
        'email', 'phone', 'address', 'first_name', 'last_name', 'name',
        'birth_date', 'dob', 'date_of_birth', 'personal_info'
    }
    
    def __init__(self, include_pii: bool = False, mask_level: str = "partial"):
        """
        Initialize PII-safe formatter.
        
        Args:
            include_pii: If True, include PII in logs (for development only)
            mask_level: Level of masking - "none", "partial", or "full"
        """
        super().__init__()
        self.include_pii = include_pii
        self.mask_level = mask_level
        self.environment = os.getenv("ENVIRONMENT", "development").lower()
    
    def format(self, record: logging.LogRecord) -> str:
        """Format log record with PII scrubbing."""
        # Create base log entry
        log_entry = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "thread": record.thread,
            "process": record.process,
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields from record
        extra_fields = {}
        for key, value in record.__dict__.items():
            if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                          'filename', 'module', 'exc_info', 'exc_text', 'stack_info',
                          'lineno', 'funcName', 'created', 'msecs', 'relativeCreated',
                          'thread', 'threadName', 'processName', 'process', 'message']:
                extra_fields[key] = value
        
        if extra_fields:
            log_entry["extra"] = extra_fields
        
        # Apply PII scrubbing unless explicitly disabled
        if not self.include_pii or self.environment == "production":
            log_entry = self._scrub_pii(log_entry)
        
        return json.dumps(log_entry, default=str, ensure_ascii=False)
    
    def _scrub_pii(self, log_entry: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively scrub PII from log entry."""
        if isinstance(log_entry, dict):
            scrubbed = {}
            for key, value in log_entry.items():
                # Check if field name indicates PII
                if any(sensitive in key.lower() for sensitive in self.SENSITIVE_FIELDS):
                    scrubbed[key] = self._mask_value(value)
                else:
                    scrubbed[key] = self._scrub_pii(value)
            return scrubbed
        
        elif isinstance(log_entry, list):
            return [self._scrub_pii(item) for item in log_entry]
        
        elif isinstance(log_entry, str):
            return self._scrub_string_patterns(log_entry)
        
        else:
            return log_entry
    
    def _mask_value(self, value: Any) -> str:
        """Mask a sensitive value based on mask level."""
        if value is None:
            return None
        
        str_value = str(value)
        
        if self.mask_level == "none":
            return str_value
        elif self.mask_level == "full":
            return "[REDACTED]"
        else:  # partial
            return mask_pii(str_value)
    
    def _scrub_string_patterns(self, text: str) -> str:
        """Scrub PII patterns from string."""
        if not isinstance(text, str):
            return text
        
        scrubbed = text
        
        for pattern_name, pattern in self.PII_PATTERNS.items():
            if pattern_name == 'email':
                scrubbed = pattern.sub(lambda m: self._mask_email(m.group()), scrubbed)
            elif pattern_name == 'ssn':
                scrubbed = pattern.sub('[SSN-REDACTED]', scrubbed)
            elif pattern_name == 'phone':
                scrubbed = pattern.sub('[PHONE-REDACTED]', scrubbed)
            elif pattern_name == 'credit_card':
                scrubbed = pattern.sub('[CARD-REDACTED]', scrubbed)
            elif pattern_name == 'employee_id':
                scrubbed = pattern.sub(lambda m: f"EMP***{m.group()[-3:]}", scrubbed)
        
        return scrubbed
    
    def _mask_email(self, email: str) -> str:
        """Mask email address partially."""
        if '@' not in email:
            return email
        
        local, domain = email.split('@', 1)
        
        if len(local) <= 2:
            masked_local = '*' * len(local)
        else:
            masked_local = local[0] + '*' * (len(local) - 2) + local[-1]
        
        if '.' in domain:
            domain_parts = domain.split('.')
            masked_domain = domain_parts[0][0] + '*' * (len(domain_parts[0]) - 1)
            if len(domain_parts) > 1:
                masked_domain += '.' + domain_parts[-1]
        else:
            masked_domain = domain[0] + '*' * (len(domain) - 1)
        
        return f"{masked_local}@{masked_domain}"


class AuditEventHandler(logging.Handler):
    """
    Custom log handler that creates audit events for specific log levels.
    Integrates logging with the audit trail system.
    """
    
    def __init__(self, db_session_factory, level=logging.WARNING):
        """
        Initialize audit event handler.
        
        Args:
            db_session_factory: Function that returns database session
            level: Minimum log level to create audit events
        """
        super().__init__(level)
        self.db_session_factory = db_session_factory
    
    def emit(self, record: logging.LogRecord):
        """Create audit event for log record."""
        try:
            # Only create audit events for significant log levels
            if record.levelno < logging.WARNING:
                return
            
            # Extract context from record
            tenant_id = getattr(record, 'tenant_id', None)
            actor_user_id = getattr(record, 'actor_user_id', None)
            entity = getattr(record, 'entity', 'system')
            entity_id = getattr(record, 'entity_id', None)

            # Guard: skip audit persistence when no tenant context is available.
            # This commonly happens during app startup or background tasks not tied
            # to a request. We still log to console/file via other handlers.
            if not tenant_id:
                return

            # Ensure non-null entity_id to satisfy schema constraints
            if entity_id is None:
                # Use a generic identifier for system-level events
                entity_id = 'system'
            
            # Create audit event
            db = self.db_session_factory()
            try:
                audit_event = AuditEvent(
                    tenant_id=tenant_id,
                    actor_user_id=actor_user_id,
                    action="system_log",
                    entity=entity,
                    entity_id=entity_id,
                    after={
                        "log_level": record.levelname,
                        "logger": record.name,
                        "message": record.getMessage(),
                        "module": record.module,
                        "function": record.funcName,
                        "line": record.lineno,
                        "timestamp": datetime.utcfromtimestamp(record.created).isoformat()
                    }
                )
                
                db.add(audit_event)
                db.commit()
            finally:
                db.close()
                
        except Exception:
            # Avoid infinite loops in logging
            self.handleError(record)


def setup_logging(
    log_level: str = None,
    log_file: str = None,
    include_pii: bool = None,
    enable_audit_handler: bool = True,
    db_session_factory = None
) -> None:
    """
    Configure application logging with PII-safe formatting.
    
    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_file: Path to log file (optional, logs to stdout if not provided)
        include_pii: Whether to include PII in logs (development only)
        enable_audit_handler: Whether to enable audit event creation
        db_session_factory: Factory function for database sessions
    """
    # Get configuration from environment
    env_log_level = os.getenv("LOG_LEVEL", "INFO").upper()
    env_log_file = os.getenv("LOG_FILE")
    env_include_pii = os.getenv("INCLUDE_PII_IN_LOGS", "false").lower() == "true"
    environment = os.getenv("ENVIRONMENT", "development").lower()
    
    # Use provided values or fall back to environment
    log_level = log_level or env_log_level
    log_file = log_file or env_log_file
    include_pii = include_pii if include_pii is not None else env_include_pii
    
    # Force PII scrubbing in production
    if environment == "production":
        include_pii = False
    
    # Create formatter
    formatter = PIISafeFormatter(
        include_pii=include_pii,
        mask_level="partial" if environment != "production" else "full"
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level))
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)
    console_handler.setLevel(getattr(logging, log_level))
    root_logger.addHandler(console_handler)
    
    # File handler if specified
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        file_handler.setLevel(getattr(logging, log_level))
        root_logger.addHandler(file_handler)
    
    # Audit handler for significant events
    if enable_audit_handler and db_session_factory:
        audit_handler = AuditEventHandler(db_session_factory, level=logging.WARNING)
        root_logger.addHandler(audit_handler)
    
    # Configure specific loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    
    # Log configuration
    root_logger.info(f"Logging configured - Level: {log_level}, PII: {'included' if include_pii else 'scrubbed'}")


def pii_safe_log(logger: logging.Logger, level: int, message: str, **kwargs) -> None:
    """
    Helper function for PII-safe logging with structured data.
    
    Args:
        logger: Logger instance to use
        level: Log level (logging.DEBUG, INFO, etc.)
        message: Log message
        **kwargs: Additional structured data to log
    """
    # Sanitize kwargs for PII
    safe_kwargs = sanitize_for_logging(kwargs)
    
    # Create log record with extra fields
    logger.log(level, message, extra=safe_kwargs)


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance with PII-safe configuration.
    
    Args:
        name: Logger name (usually __name__)
        
    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


# Convenience functions for common log levels with PII safety

def log_user_action(logger: logging.Logger, user_id: str, action: str, 
                   tenant_id: str = None, resource_id: str = None, **details):
    """Log user action with automatic PII scrubbing."""
    pii_safe_log(
        logger, logging.INFO,
        f"User action: {action}",
        user_id=user_id,
        action=action,
        tenant_id=tenant_id,
        resource_id=resource_id,
        **details
    )


def log_security_event(logger: logging.Logger, event_type: str, user_id: str = None,
                      ip_address: str = None, **details):
    """Log security event with appropriate level and PII handling."""
    pii_safe_log(
        logger, logging.WARNING,
        f"Security event: {event_type}",
        event_type=event_type,
        user_id=user_id,
        ip_address=ip_address,
        **details
    )


def log_error_with_context(logger: logging.Logger, error: Exception, 
                          user_id: str = None, tenant_id: str = None, **context):
    """Log error with context while scrubbing PII."""
    pii_safe_log(
        logger, logging.ERROR,
        f"Error occurred: {str(error)}",
        error_type=type(error).__name__,
        error_message=str(error),
        user_id=user_id,
        tenant_id=tenant_id,
        **context
    )
