"""
Feature flag system for managing rollout of new functionality.
Provides centralized resolver for routing between legacy and new engines.
"""

import os
import logging
from typing import Dict, List, Optional, Set
from enum import Enum

logger = logging.getLogger(__name__)


class FeatureFlag(Enum):
    """Available feature flags."""
    NEW_CALCULATION_ENGINE = "new_calculation_engine"
    CSV_PLATFORM_ENABLED = "csv_platform_enabled"
    RBAC_ENFORCEMENT_ENABLED = "rbac_enforcement_enabled"
    AUDIT_LOGGING_ENABLED = "audit_logging_enabled"
    VECTORIZED_EXECUTION = "vectorized_execution"
    ENHANCED_FILE_STORAGE = "enhanced_file_storage"
    PLAN_API_FACADE_V1 = "plan_api_facade_v1"


class FeatureFlagResolver:
    """
    Centralized feature flag resolver that reads from environment variables
    and provides routing decisions for different components.
    """
    
    def __init__(self):
        self._cache: Dict[str, any] = {}
        self._load_configuration()
    
    def _load_configuration(self):
        """Load feature flag configuration from environment variables."""
        # Tenant-specific configurations
        self.new_engine_tenants: Set[str] = set(
            os.getenv("NEW_ENGINE_TENANTS", "").split(",") if os.getenv("NEW_ENGINE_TENANTS") else []
        )
        
        # Plan-specific configurations
        self.new_engine_plans: Set[str] = set(
            os.getenv("NEW_ENGINE_PLANS", "").split(",") if os.getenv("NEW_ENGINE_PLANS") else []
        )
        
        # Global feature flags
        self.global_flags = {
            FeatureFlag.CSV_PLATFORM_ENABLED: self._parse_bool("CSV_PLATFORM_ENABLED", True),
            FeatureFlag.RBAC_ENFORCEMENT_ENABLED: self._parse_bool("RBAC_ENFORCEMENT_ENABLED", True),
            FeatureFlag.AUDIT_LOGGING_ENABLED: self._parse_bool("AUDIT_LOGGING_ENABLED", True),
            FeatureFlag.VECTORIZED_EXECUTION: self._parse_bool("VECTORIZED_EXECUTION_ENABLED", False),
            FeatureFlag.ENHANCED_FILE_STORAGE: self._parse_bool("ENHANCED_FILE_STORAGE_ENABLED", True),
            FeatureFlag.PLAN_API_FACADE_V1: self._parse_bool("PLAN_API_FACADE_V1_ENABLED", True),
        }
        
        # Rollout percentage for gradual rollout
        try:
            self.new_engine_rollout_percent = int(os.getenv("NEW_ENGINE_ROLLOUT_PERCENT", "0"))
        except ValueError:
            logger.warning("Invalid NEW_ENGINE_ROLLOUT_PERCENT; defaulting to 0")
            self.new_engine_rollout_percent = 0
        
        logger.info(f"Feature flags loaded: {self.global_flags}")
        logger.info(f"New engine tenants: {self.new_engine_tenants}")
        logger.info(f"New engine plans: {self.new_engine_plans}")
        logger.info(f"New engine rollout: {self.new_engine_rollout_percent}%")
    
    def _parse_bool(self, env_var: str, default: bool = False) -> bool:
        """Parse boolean from environment variable."""
        value = os.getenv(env_var, str(default)).lower()
        return value in ("true", "1", "yes", "on")
    
    def use_new_calculation_engine(self, plan_id: Optional[str] = None, tenant_id: Optional[str] = None) -> bool:
        """
        Determine if the new calculation engine should be used.
        
        Args:
            plan_id: Optional plan identifier
            tenant_id: Optional tenant identifier
            
        Returns:
            bool: True if new engine should be used, False for legacy engine
        """
        cache_key = f"new_engine_{plan_id}_{tenant_id}"
        
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        # Check tenant-specific override
        if tenant_id and tenant_id in self.new_engine_tenants:
            logger.info(f"Using new engine for tenant {tenant_id} (tenant override)")
            self._cache[cache_key] = True
            return True
        
        # Check plan-specific override
        if plan_id and plan_id in self.new_engine_plans:
            logger.info(f"Using new engine for plan {plan_id} (plan override)")
            self._cache[cache_key] = True
            return True
        
        # Check rollout percentage (simple hash-based distribution)
        if self.new_engine_rollout_percent > 0:
            identifier = f"{tenant_id}_{plan_id}" if tenant_id and plan_id else str(tenant_id or plan_id or "default")
            hash_value = abs(hash(identifier)) % 100
            if hash_value < self.new_engine_rollout_percent:
                logger.info(f"Using new engine for {identifier} (rollout: {hash_value} < {self.new_engine_rollout_percent})")
                self._cache[cache_key] = True
                return True
        
        # Default to legacy engine
        logger.info(f"Using legacy engine for {cache_key}")
        self._cache[cache_key] = False
        return False
    
    def is_flag_enabled(self, flag: FeatureFlag) -> bool:
        """
        Check if a global feature flag is enabled.
        
        Args:
            flag: The feature flag to check
            
        Returns:
            bool: True if flag is enabled, False otherwise
        """
        return self.global_flags.get(flag, False)
    
    def csv_platform_enabled(self) -> bool:
        """Check if CSV platform functionality is enabled."""
        return self.is_flag_enabled(FeatureFlag.CSV_PLATFORM_ENABLED)
    
    def rbac_enforcement_enabled(self) -> bool:
        """Check if RBAC enforcement is enabled."""
        return self.is_flag_enabled(FeatureFlag.RBAC_ENFORCEMENT_ENABLED)
    
    def audit_logging_enabled(self) -> bool:
        """Check if audit logging is enabled."""
        return self.is_flag_enabled(FeatureFlag.AUDIT_LOGGING_ENABLED)
    
    def vectorized_execution_enabled(self) -> bool:
        """Check if vectorized execution is enabled."""
        return self.is_flag_enabled(FeatureFlag.VECTORIZED_EXECUTION)
    
    def enhanced_file_storage_enabled(self) -> bool:
        """Check if enhanced file storage with SHA-256 is enabled."""
        return self.is_flag_enabled(FeatureFlag.ENHANCED_FILE_STORAGE)

    def plan_api_facade_enabled(self) -> bool:
        """Check if the plan API v1 facade should be exposed."""
        return self.is_flag_enabled(FeatureFlag.PLAN_API_FACADE_V1)

    def get_flag_status(self) -> Dict[str, any]:
        """
        Get current status of all feature flags for debugging/monitoring.
        
        Returns:
            dict: Current flag configuration and status
        """
        return {
            "global_flags": {flag.value: enabled for flag, enabled in self.global_flags.items()},
            "new_engine_tenants": list(self.new_engine_tenants),
            "new_engine_plans": list(self.new_engine_plans),
            "new_engine_rollout_percent": self.new_engine_rollout_percent,
            "cache_size": len(self._cache)
        }
    
    def clear_cache(self):
        """Clear the internal cache. Useful for testing or configuration changes."""
        self._cache.clear()
        logger.info("Feature flag cache cleared")


# Global instance
feature_flags = FeatureFlagResolver()


def get_feature_flags() -> FeatureFlagResolver:
    """Get the global feature flag resolver instance."""
    return feature_flags
