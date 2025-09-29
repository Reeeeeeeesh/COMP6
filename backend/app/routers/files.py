"""
Files router to securely serve generated files from storage.
Follows existing patterns for tenant context and error handling.
"""

import logging
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse

from ..middleware import RequiredTenant
from ..storage.file_store import LocalFileStore
from ..schemas import PlatformApiResponse  # Imported for consistency with router patterns

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/files", tags=["files"])


def _detect_media_type(file_path: Path) -> str:
    """Return MIME type based on file extension with sensible defaults."""
    ext = file_path.suffix.lower()
    mime_map: Dict[str, str] = {
        ".pdf": "application/pdf",
        ".csv": "text/csv",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls": "application/vnd.ms-excel",
        ".json": "application/json",
        ".txt": "text/plain",
        ".zip": "application/zip",
    }
    return mime_map.get(ext, "application/octet-stream")


@router.get("/{file_path:path}")
async def serve_file(
    file_path: str,
    request: Request,
    tenant_id: str = Depends(RequiredTenant),
):
    """
    Serve a file from the tenant-scoped storage directory.

    Security:
    - Validates that the requested path is within the storage base directory.
    - Ensures the path is prefixed with the current tenant_id to prevent cross-tenant access.
    """
    try:
        # Get file store instance from app state
        file_store: LocalFileStore = getattr(request.app.state, "file_store", None)
        if file_store is None:
            logger.error("File store not initialized on app state")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="File storage is not configured"
            )

        # Normalize and validate path
        base_path = Path(file_store.base_path).resolve()
        requested_rel = Path(file_path)

        # Reject absolute paths and parent traversals
        if requested_rel.is_absolute():
            logger.warning("Rejected absolute path access attempt: %s", file_path)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        # Enforce tenant scoping: first path segment must equal tenant_id
        parts = requested_rel.parts
        if not parts or parts[0] != tenant_id:
            logger.warning(
                "Rejected cross-tenant or invalid path access. tenant=%s path=%s",
                tenant_id,
                file_path,
            )
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        # Resolve the full path and ensure it stays within the base directory
        resolved_path = (base_path / requested_rel).resolve()
        try:
            # Raises ValueError if resolved_path is not under base_path
            resolved_path.relative_to(base_path)
        except ValueError:
            logger.warning("Path traversal attempt blocked: %s", resolved_path)
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

        # Check existence using file store API
        if not file_store.file_exists(str(requested_rel)):
            logger.info("File not found: %s", requested_rel)
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

        # Determine media type and prepare response headers
        media_type = _detect_media_type(resolved_path)
        filename = resolved_path.name

        logger.info("Serving file for tenant=%s path=%s", tenant_id, requested_rel)

        return FileResponse(
            path=str(resolved_path),
            media_type=media_type,
            filename=filename,
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
            },
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error("Failed to serve file '%s': %s", file_path, e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to serve file",
        )

