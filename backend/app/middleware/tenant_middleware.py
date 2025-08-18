"""
Tenant middleware for automatic tenant context setting.
Handles tenant identification from headers, tokens, or subdomain.
"""
import logging
from typing import Optional
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from ..database import create_tenant_session, get_db
from ..security import set_tenant_context

logger = logging.getLogger(__name__)

class TenantMiddleware:
    """Middleware to extract and set tenant context for requests."""
    
    def __init__(self, app):
        self.app = app
        self.security = HTTPBearer(auto_error=False)
    
    async def __call__(self, scope, receive, send):
        """ASGI middleware implementation."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
            
        # Create a request object to extract tenant info
        from starlette.requests import Request
        request = Request(scope, receive)
        
        tenant_id = self._extract_tenant_id(request)
        
        if tenant_id:
            # Set tenant context in scope
            scope["state"] = scope.get("state", {})
            scope["state"]["tenant_id"] = tenant_id
            logger.debug(f"Set tenant context: {tenant_id}")
        
        await self.app(scope, receive, send)
    
    def _extract_tenant_id(self, request: Request) -> Optional[str]:
        """Extract tenant ID from request headers, subdomain, or token."""
        
        # Method 1: Check X-Tenant-ID header
        tenant_id = request.headers.get("X-Tenant-ID")
        if tenant_id:
            return tenant_id
        
        # Method 2: Extract from subdomain
        host = request.headers.get("host", "")
        if "." in host:
            subdomain = host.split(".")[0]
            # Only use subdomain if it's not 'www' or common subdomains
            if subdomain not in ["www", "api", "app", "localhost"]:
                return subdomain
        
        # Method 3: Extract from Authorization token (if JWT contains tenant)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            tenant_id = self._extract_tenant_from_token(token)
            if tenant_id:
                return tenant_id
        
        # Method 4: Check query parameter (for development/testing)
        tenant_id = request.query_params.get("tenant_id")
        if tenant_id:
            return tenant_id
        
        return None
    
    def _extract_tenant_from_token(self, token: str) -> Optional[str]:
        """Extract tenant ID from JWT token (placeholder implementation)."""
        try:
            # TODO: Implement JWT token parsing when authentication is added
            # For now, return None as we don't have JWT authentication yet
            return None
        except Exception as e:
            logger.warning(f"Failed to extract tenant from token: {e}")
            return None


def get_current_tenant_id(request: Request) -> Optional[str]:
    """Get current tenant ID from request state."""
    # Try both the new scope state and the old request state for compatibility
    if hasattr(request.state, 'tenant_id'):
        return request.state.tenant_id
    # Fallback to scope state if available
    if hasattr(request, 'scope') and 'state' in request.scope:
        return request.scope['state'].get('tenant_id')
    return None


def require_tenant_context(request: Request) -> str:
    """Require tenant context or raise HTTP 400."""
    tenant_id = get_current_tenant_id(request)
    if not tenant_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant context is required. Please provide X-Tenant-ID header."
        )
    return tenant_id


def get_tenant_db_session(request: Request) -> Session:
    """Get database session with tenant context from request."""
    tenant_id = get_current_tenant_id(request)
    if tenant_id:
        return create_tenant_session(tenant_id)
    else:
        # Fallback to regular session for non-tenant operations
        from ..database import SessionLocal
        return SessionLocal()


class TenantContextDependency:
    """FastAPI dependency for tenant context."""
    
    def __init__(self, required: bool = True):
        self.required = required
    
    def __call__(self, request: Request) -> Optional[str]:
        tenant_id = get_current_tenant_id(request)
        if self.required and not tenant_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tenant context is required"
            )
        return tenant_id


# Dependency instances
OptionalTenant = TenantContextDependency(required=False)
RequiredTenant = TenantContextDependency(required=True)