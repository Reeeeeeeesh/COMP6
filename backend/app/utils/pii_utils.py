"""
PII handling utilities for data scrubbing and masking.
Provides functions to safely handle personally identifiable information in logs and data processing.
"""

import re
from typing import Dict, Any, List, Set, Union, Optional


# Common PII field patterns
PII_FIELD_PATTERNS = {
    'email', 'e_mail', 'email_address', 'mail',
    'phone', 'phone_number', 'telephone', 'mobile', 'cell',
    'ssn', 'social_security_number', 'social_security', 'tax_id',
    'employee_id', 'emp_id', 'employee_number', 'staff_id',
    'first_name', 'last_name', 'full_name', 'name', 'given_name', 'family_name',
    'address', 'street_address', 'home_address', 'mailing_address',
    'birth_date', 'date_of_birth', 'dob', 'birthday',
    'salary', 'compensation', 'pay', 'wage', 'income', 'bonus',
    'password', 'passwd', 'pwd', 'secret', 'token', 'api_key', 'key',
    'credit_card', 'card_number', 'account_number', 'bank_account',
    'license_number', 'driver_license', 'passport', 'id_number'
}

# Regex patterns for common PII formats
PII_REGEX_PATTERNS = {
    'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
    'ssn': re.compile(r'\b\d{3}-?\d{2}-?\d{4}\b'),
    'phone': re.compile(r'\b\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})\b'),
    'credit_card': re.compile(r'\b(?:\d{4}[-\s]?){3}\d{4}\b'),
    'employee_id': re.compile(r'\b[Ee][Mm][Pp]\d{3,}\b'),
    'ip_address': re.compile(r'\b(?:\d{1,3}\.){3}\d{1,3}\b'),
    'uuid': re.compile(r'\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b')
}


def is_pii_field(field_name: str) -> bool:
    """
    Identify if a field name indicates PII data.
    
    Args:
        field_name: Name of the field to check
        
    Returns:
        bool: True if field appears to contain PII
    """
    if not field_name:
        return False
    
    field_lower = field_name.lower().strip()
    
    # Direct matches
    if field_lower in PII_FIELD_PATTERNS:
        return True
    
    # Partial matches for compound field names
    for pii_pattern in PII_FIELD_PATTERNS:
        if pii_pattern in field_lower:
            return True
    
    # Check for common PII suffixes/prefixes
    pii_indicators = ['_id', '_number', '_addr', '_info', '_data', 'personal_', 'private_']
    for indicator in pii_indicators:
        if indicator in field_lower:
            return True
    
    return False


def mask_pii(value: Any, mask_char: str = '*', preserve_length: bool = True, 
             reveal_chars: int = 2) -> str:
    """
    Mask a PII value with configurable masking strategy.
    
    Args:
        value: Value to mask
        mask_char: Character to use for masking
        preserve_length: Whether to preserve original length
        reveal_chars: Number of characters to reveal at start/end
        
    Returns:
        str: Masked value
    """
    if value is None:
        return None
    
    str_value = str(value).strip()
    
    if not str_value:
        return str_value
    
    # Handle very short values
    if len(str_value) <= reveal_chars * 2:
        return mask_char * len(str_value) if preserve_length else '[MASKED]'
    
    # Special handling for email addresses
    if '@' in str_value and PII_REGEX_PATTERNS['email'].match(str_value):
        return mask_email(str_value, mask_char)
    
    # General masking strategy
    if preserve_length:
        if reveal_chars > 0:
            # Show first and last N characters
            start = str_value[:reveal_chars]
            end = str_value[-reveal_chars:] if len(str_value) > reveal_chars else ""
            middle_length = len(str_value) - len(start) - len(end)
            return start + (mask_char * middle_length) + end
        else:
            return mask_char * len(str_value)
    else:
        return '[MASKED]'


def mask_email(email: str, mask_char: str = '*') -> str:
    """
    Mask email address while preserving domain structure.
    
    Args:
        email: Email address to mask
        mask_char: Character to use for masking
        
    Returns:
        str: Masked email address
    """
    if '@' not in email:
        return mask_pii(email, mask_char)
    
    local_part, domain = email.split('@', 1)
    
    # Mask local part
    if len(local_part) <= 2:
        masked_local = mask_char * len(local_part)
    else:
        masked_local = local_part[0] + mask_char * (len(local_part) - 2) + local_part[-1]
    
    # Partially mask domain
    if '.' in domain:
        domain_parts = domain.split('.')
        masked_domain_parts = []
        
        for part in domain_parts[:-1]:  # Don't mask TLD
            if len(part) <= 2:
                masked_domain_parts.append(mask_char * len(part))
            else:
                masked_domain_parts.append(part[0] + mask_char * (len(part) - 1))
        
        masked_domain_parts.append(domain_parts[-1])  # Keep TLD
        masked_domain = '.'.join(masked_domain_parts)
    else:
        masked_domain = domain[0] + mask_char * (len(domain) - 1) if len(domain) > 1 else domain
    
    return f"{masked_local}@{masked_domain}"


def sanitize_for_logging(data: Union[Dict, List, Any], 
                        fields_to_mask: Optional[Set[str]] = None) -> Any:
    """
    Create a safe copy of data for logging by masking PII fields.
    
    Args:
        data: Data structure to sanitize
        fields_to_mask: Optional set of additional field names to mask
        
    Returns:
        Sanitized copy of the data
    """
    if fields_to_mask is None:
        fields_to_mask = set()
    
    combined_fields = PII_FIELD_PATTERNS.union(fields_to_mask)
    
    def _sanitize_recursive(obj: Any) -> Any:
        if isinstance(obj, dict):
            sanitized = {}
            for key, value in obj.items():
                if is_pii_field(key) or key.lower() in combined_fields:
                    sanitized[key] = mask_pii(value)
                else:
                    sanitized[key] = _sanitize_recursive(value)
            return sanitized
        
        elif isinstance(obj, list):
            return [_sanitize_recursive(item) for item in obj]
        
        elif isinstance(obj, tuple):
            return tuple(_sanitize_recursive(item) for item in obj)
        
        elif isinstance(obj, str):
            # Check for PII patterns in string content
            return scrub_pii_patterns(obj)
        
        else:
            return obj
    
    return _sanitize_recursive(data)


def scrub_pii_patterns(text: str) -> str:
    """
    Scrub known PII patterns from text content.
    
    Args:
        text: Text to scrub
        
    Returns:
        str: Text with PII patterns masked
    """
    if not isinstance(text, str):
        return text
    
    scrubbed = text
    
    # Apply regex patterns
    for pattern_name, pattern in PII_REGEX_PATTERNS.items():
        if pattern_name == 'email':
            # Use special email masking
            scrubbed = pattern.sub(lambda m: mask_email(m.group()), scrubbed)
        elif pattern_name == 'ssn':
            scrubbed = pattern.sub('***-**-****', scrubbed)
        elif pattern_name == 'phone':
            scrubbed = pattern.sub('(***) ***-****', scrubbed)
        elif pattern_name == 'credit_card':
            scrubbed = pattern.sub('****-****-****-****', scrubbed)
        elif pattern_name == 'employee_id':
            scrubbed = pattern.sub(lambda m: f"EMP***{m.group()[-3:]}", scrubbed)
        elif pattern_name == 'ip_address':
            scrubbed = pattern.sub('***.***.***.***', scrubbed)
        elif pattern_name == 'uuid':
            scrubbed = pattern.sub('********-****-****-****-************', scrubbed)
    
    return scrubbed


def detect_pii_in_data(data: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Detect potential PII in a data structure.
    
    Args:
        data: Data structure to analyze
        
    Returns:
        Dict mapping PII types to list of field names that may contain that PII type
    """
    pii_detected = {}
    
    def _scan_dict(obj: Dict, path: str = ""):
        for key, value in obj.items():
            current_path = f"{path}.{key}" if path else key
            
            # Check field name
            if is_pii_field(key):
                pii_type = "field_name_indicates_pii"
                if pii_type not in pii_detected:
                    pii_detected[pii_type] = []
                pii_detected[pii_type].append(current_path)
            
            # Check value content
            if isinstance(value, str):
                for pattern_name, pattern in PII_REGEX_PATTERNS.items():
                    if pattern.search(value):
                        if pattern_name not in pii_detected:
                            pii_detected[pattern_name] = []
                        pii_detected[pattern_name].append(current_path)
            
            elif isinstance(value, dict):
                _scan_dict(value, current_path)
            
            elif isinstance(value, list):
                for i, item in enumerate(value):
                    if isinstance(item, dict):
                        _scan_dict(item, f"{current_path}[{i}]")
                    elif isinstance(item, str):
                        for pattern_name, pattern in PII_REGEX_PATTERNS.items():
                            if pattern.search(item):
                                if pattern_name not in pii_detected:
                                    pii_detected[pattern_name] = []
                                pii_detected[pattern_name].append(f"{current_path}[{i}]")
    
    if isinstance(data, dict):
        _scan_dict(data)
    
    return pii_detected


def create_pii_safe_summary(data: Dict[str, Any], max_items: int = 10) -> Dict[str, Any]:
    """
    Create a PII-safe summary of data for debugging/monitoring.
    
    Args:
        data: Data to summarize
        max_items: Maximum number of items to include in summary
        
    Returns:
        Dict with safe summary information
    """
    summary = {
        "total_fields": 0,
        "pii_fields_detected": 0,
        "field_types": {},
        "sample_fields": [],
        "pii_detected": {}
    }
    
    def _analyze_dict(obj: Dict, path: str = ""):
        for key, value in obj.items():
            summary["total_fields"] += 1
            current_path = f"{path}.{key}" if path else key
            
            # Track field types
            value_type = type(value).__name__
            if value_type not in summary["field_types"]:
                summary["field_types"][value_type] = 0
            summary["field_types"][value_type] += 1
            
            # Check for PII
            if is_pii_field(key):
                summary["pii_fields_detected"] += 1
            
            # Add to sample (non-PII only)
            if len(summary["sample_fields"]) < max_items and not is_pii_field(key):
                summary["sample_fields"].append({
                    "path": current_path,
                    "type": value_type,
                    "sample_value": str(value)[:100] if isinstance(value, str) else str(type(value))
                })
            
            # Recurse into nested structures
            if isinstance(value, dict):
                _analyze_dict(value, current_path)
            elif isinstance(value, list) and value and isinstance(value[0], dict):
                _analyze_dict(value[0], f"{current_path}[0]")
    
    if isinstance(data, dict):
        _analyze_dict(data)
        
        # Detect PII patterns
        summary["pii_detected"] = detect_pii_in_data(data)
    
    return summary


def validate_pii_compliance(data: Dict[str, Any], 
                           allowed_pii_fields: Optional[Set[str]] = None) -> Dict[str, Any]:
    """
    Validate data for PII compliance.
    
    Args:
        data: Data to validate
        allowed_pii_fields: Set of field names that are allowed to contain PII
        
    Returns:
        Dict with compliance validation results
    """
    allowed_pii_fields = allowed_pii_fields or set()
    
    violations = []
    warnings = []
    
    pii_detected = detect_pii_in_data(data)
    
    for pii_type, field_paths in pii_detected.items():
        for field_path in field_paths:
            field_name = field_path.split('.')[-1].split('[')[0]  # Get base field name
            
            if field_name not in allowed_pii_fields:
                violations.append({
                    "type": pii_type,
                    "field_path": field_path,
                    "field_name": field_name,
                    "severity": "high" if pii_type in ['ssn', 'credit_card'] else "medium"
                })
            else:
                warnings.append({
                    "type": pii_type,
                    "field_path": field_path,
                    "field_name": field_name,
                    "message": "PII detected in allowed field"
                })
    
    return {
        "compliant": len(violations) == 0,
        "violations": violations,
        "warnings": warnings,
        "total_pii_fields": len(pii_detected),
        "allowed_pii_fields": list(allowed_pii_fields)
    }
