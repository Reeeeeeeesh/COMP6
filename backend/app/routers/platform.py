"""
Platform API router for tenant and user management.
Provides endpoints for multi-tenant platform operations.
Enhanced with file storage and lineage tracking endpoints.
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware import RequiredTenant, OptionalTenant, get_tenant_db_session
from ..services.platform_service import get_platform_service, get_tenant_service
from ..services.file_processing_service import FileProcessingService
from ..services.evidence_pack_service import get_evidence_pack_service
from ..rbac.permissions import require_role, require_permission
from ..schemas import (
    TenantCreate, TenantResponse, TenantUpdate,
    UserCreate, UserResponse, UserUpdate,
    BonusPlanCreate, BonusPlanResponse, BonusPlanUpdate,
    PlatformApiResponse
)

router = APIRouter(prefix="/platform", tags=["platform"])

# ================================
# Platform-wide operations (no tenant context required)
# ================================

@router.post("/tenants", response_model=PlatformApiResponse)
async def create_tenant(
    tenant_data: TenantCreate,
    admin_email: str,
    admin_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Create a new tenant with admin user."""
    try:
        platform_service = get_platform_service(db)
        tenant, user = platform_service.create_tenant_with_admin(
            tenant_data, admin_email, admin_name
        )
        
        return PlatformApiResponse(
            success=True,
            message="Tenant created successfully",
            data={
                "tenant": tenant.model_dump(),
                "admin_user": user.model_dump()
            },
            tenant_id=tenant.id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create tenant: {str(e)}"
        )


@router.get("/tenants", response_model=PlatformApiResponse)
async def list_tenants(
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """List all tenants (platform admin only)."""
    try:
        platform_service = get_platform_service(db)
        tenants = platform_service.get_tenants(active_only=active_only)
        
        return PlatformApiResponse(
            success=True,
            data={"tenants": [t.model_dump() for t in tenants]}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tenants: {str(e)}"
        )


@router.patch("/tenants/{tenant_id}/deactivate", response_model=PlatformApiResponse)
async def deactivate_tenant(
    tenant_id: str,
    actor_user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Deactivate a tenant (soft delete)."""
    try:
        platform_service = get_platform_service(db)
        success = platform_service.deactivate_tenant(tenant_id, actor_user_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Tenant deactivated successfully",
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to deactivate tenant: {str(e)}"
        )

# ================================
# Tenant-specific operations (require tenant context)
# ================================

@router.post("/users", response_model=PlatformApiResponse)
async def create_user(
    user_data: UserCreate,
    created_by: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Create a new user within the current tenant."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        user = tenant_service.create_user(user_data, created_by)
        
        return PlatformApiResponse(
            success=True,
            message="User created successfully",
            data={"user": user.model_dump()},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create user: {str(e)}"
        )
    finally:
        db.close()


@router.get("/users", response_model=PlatformApiResponse)
async def list_users(
    role: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """List users within the current tenant."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        users = tenant_service.get_users(role=role)
        
        return PlatformApiResponse(
            success=True,
            data={"users": [u.model_dump() for u in users]},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list users: {str(e)}"
        )
    finally:
        db.close()


@router.post("/bonus-plans", response_model=PlatformApiResponse)
async def create_bonus_plan(
    plan_data: BonusPlanCreate,
    created_by: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Create a new bonus plan."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        plan = tenant_service.create_bonus_plan(plan_data, created_by)
        
        return PlatformApiResponse(
            success=True,
            message="Bonus plan created successfully",
            data={"plan": plan.model_dump()},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create bonus plan: {str(e)}"
        )
    finally:
        db.close()


@router.get("/bonus-plans", response_model=PlatformApiResponse)
async def list_bonus_plans(
    status_filter: Optional[str] = None,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """List bonus plans within the current tenant."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        plans = tenant_service.get_bonus_plans(status=status_filter)
        
        return PlatformApiResponse(
            success=True,
            data={"plans": [p.model_dump() for p in plans]},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list bonus plans: {str(e)}"
        )
    finally:
        db.close()


@router.patch("/bonus-plans/{plan_id}/lock", response_model=PlatformApiResponse)
async def lock_bonus_plan(
    plan_id: str,
    locked_by: str,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Lock a bonus plan to prevent modifications."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        success = tenant_service.lock_bonus_plan(plan_id, locked_by)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bonus plan not found or cannot be locked"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Bonus plan locked successfully",
            tenant_id=tenant_id
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to lock bonus plan: {str(e)}"
        )
    finally:
        db.close()


@router.get("/audit-trail", response_model=PlatformApiResponse)
async def get_audit_trail(
    entity: Optional[str] = None,
    entity_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    limit: int = 100,
    request: Request = None,
    tenant_id: str = Depends(RequiredTenant)
):
    """Get audit trail for the current tenant."""
    try:
        db = get_tenant_db_session(request)
        tenant_service = get_tenant_service(db, tenant_id)
        events = tenant_service.get_audit_trail(entity, entity_id, actor_user_id, limit)
        
        return PlatformApiResponse(
            success=True,
            data={"audit_events": events},
            tenant_id=tenant_id
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audit trail: {str(e)}"
        )
    finally:
        db.close()


# ================================
# Enhanced File Storage and Lineage Endpoints
# ================================

@router.post("/uploads", response_model=PlatformApiResponse)
async def upload_file_enhanced(
    file: UploadFile = File(...),
    tenant_context: RequiredTenant = Depends(RequiredTenant),
    current_user = Depends(require_role(["admin", "hr", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Upload file with enhanced storage, SHA-256 hashing, and lineage tracking.
    Requires admin, hr, or manager role.
    """
    try:
        # Read file content
        file_content = await file.read()
        
        # Initialize file processing service
        file_service = FileProcessingService(db)
        
        # Process upload with enhanced features
        success, message, upload_id = file_service.process_platform_upload(
            tenant_id=tenant_context.tenant_id,
            file_content=file_content,
            filename=file.filename,
            created_by=getattr(current_user, 'id', None),
            metadata={
                "content_type": file.content_type,
                "upload_method": "platform_api"
            }
        )
        
        if success:
            return PlatformApiResponse(
                success=True,
                message=message,
                data={"upload_id": upload_id},
                tenant_id=tenant_context.tenant_id
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=message
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File upload failed: {str(e)}"
        )


@router.get("/uploads/{upload_id}/checksum", response_model=PlatformApiResponse)
async def get_file_checksum(
    upload_id: str,
    tenant_context: RequiredTenant = Depends(RequiredTenant),
    current_user = Depends(require_role(["admin", "hr", "manager", "analyst"])),
    db: Session = Depends(get_db)
):
    """
    Get SHA-256 checksum and verification status for an uploaded file.
    Requires admin, hr, manager, or analyst role.
    """
    try:
        file_service = FileProcessingService(db)
        
        # Verify file integrity
        verification_result = file_service.verify_file_integrity(upload_id)
        
        if not verification_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=verification_result["error"]
            )
        
        return PlatformApiResponse(
            success=True,
            message="File checksum retrieved successfully",
            data={
                "upload_id": upload_id,
                "checksum": verification_result["checksum"],
                "verified": verification_result["verified"],
                "storage_path": verification_result["storage_path"],
                "file_exists": verification_result["file_exists"]
            },
            tenant_id=tenant_context.tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file checksum: {str(e)}"
        )


@router.get("/uploads/{upload_id}/lineage", response_model=PlatformApiResponse)
async def get_file_lineage(
    upload_id: str,
    tenant_context: RequiredTenant = Depends(RequiredTenant),
    current_user = Depends(require_role(["admin", "hr", "manager", "analyst"])),
    db: Session = Depends(get_db)
):
    """
    Get complete file lineage information including processing history and audit trail.
    Requires admin, hr, manager, or analyst role.
    """
    try:
        file_service = FileProcessingService(db)
        
        # Get file lineage
        lineage_info = file_service.get_file_lineage(upload_id)
        
        if not lineage_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found or no lineage information available"
            )
        
        return PlatformApiResponse(
            success=True,
            message="File lineage retrieved successfully",
            data=lineage_info,
            tenant_id=tenant_context.tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get file lineage: {str(e)}"
        )


@router.post("/uploads/{upload_id}/verify", response_model=PlatformApiResponse)
async def verify_file_integrity(
    upload_id: str,
    tenant_context: RequiredTenant = Depends(RequiredTenant),
    current_user = Depends(require_role(["admin", "hr", "manager"])),
    db: Session = Depends(get_db)
):
    """
    Verify file integrity using stored SHA-256 checksum.
    Requires admin, hr, or manager role.
    """
    try:
        file_service = FileProcessingService(db)
        
        # Verify file integrity
        verification_result = file_service.verify_file_integrity(upload_id)
        
        if not verification_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=verification_result["error"]
            )
        
        # Add verification event to lineage
        file_service.add_processing_event(
            upload_id=upload_id,
            event_type="manual_verification",
            details={
                "verified_by": getattr(current_user, 'id', None),
                "verification_result": verification_result["verified"],
                "checksum": verification_result["checksum"]
            }
        )
        
        return PlatformApiResponse(
            success=True,
            message="File integrity verification completed",
            data={
                "upload_id": upload_id,
                "verified": verification_result["verified"],
                "checksum": verification_result["checksum"],
                "file_exists": verification_result["file_exists"]
            },
            tenant_id=tenant_context.tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify file integrity: {str(e)}"
        )


@router.get("/uploads/{upload_id}/status", response_model=PlatformApiResponse)
async def get_upload_status(
    upload_id: str,
    tenant_context: RequiredTenant = Depends(RequiredTenant),
    current_user = Depends(require_role(["admin", "hr", "manager", "analyst"])),
    db: Session = Depends(get_db)
):
    """
    Get upload status and basic information.
    Requires admin, hr, manager, or analyst role.
    """
    try:
        from ..models import PlatformUpload
        
        # Get upload record
        upload = db.query(PlatformUpload).filter(
            PlatformUpload.id == upload_id,
            PlatformUpload.tenant_id == tenant_context.tenant_id
        ).first()
        
        if not upload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Upload not found"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Upload status retrieved successfully",
            data={
                "upload_id": upload.id,
                "filename": upload.filename,
                "status": upload.status,
                "file_size": upload.file_size,
                "created_at": upload.created_at.isoformat() if upload.created_at else None,
                "created_by": upload.created_by,
                "has_checksum": upload.bytes_hash is not None,
                "has_storage_path": upload.storage_path is not None
            },
            tenant_id=tenant_context.tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get upload status: {str(e)}"
        )


# ================================
# Evidence Pack Operations
# ================================

@router.post("/evidence-pack/generate/{plan_run_id}", response_model=PlatformApiResponse)
async def generate_evidence_pack(
    plan_run_id: str,
    tenant_context: RequiredTenant = Depends(),
    db: Session = Depends(get_tenant_db_session)
):
    """
    Generate a comprehensive evidence pack for a plan run.
    
    Requires 'evidence_operations.generate' permission.
    """
    try:
        # Check permissions
        from ..models import User
        current_user = User(id="system", role="admin")  # Placeholder - should come from auth
        from ..rbac.permissions import can_generate_evidence_pack
        if not can_generate_evidence_pack(current_user.role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to generate evidence pack"
            )
        
        evidence_service = get_evidence_pack_service(db)
        result = evidence_service.build_evidence_pack(
            plan_run_id=plan_run_id,
            tenant_id=tenant_context.tenant_id
        )
        
        return PlatformApiResponse(
            success=True,
            message="Evidence pack generated successfully",
            data=result,
            tenant_id=tenant_context.tenant_id
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate evidence pack: {str(e)}"
        )


@router.get("/evidence-pack/{pack_id}/download", response_model=PlatformApiResponse)
async def download_evidence_pack(
    pack_id: str,
    tenant_context: RequiredTenant = Depends(),
    db: Session = Depends(get_tenant_db_session)
):
    """
    Download an evidence pack.
    
    Requires 'evidence_operations.download' permission.
    """
    try:
        # Check permissions
        from ..models import User
        current_user = User(id="system", role="admin")  # Placeholder - should come from auth
        from ..rbac.permissions import check_group_permission
        if not check_group_permission(current_user.role, "evidence_operations", "download"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to download evidence pack"
            )
        
        # Get evidence pack from database
        from ..models import EvidencePack
        evidence_pack = db.query(EvidencePack).filter(
            EvidencePack.id == pack_id,
            EvidencePack.tenant_id == tenant_context.tenant_id
        ).first()
        
        if not evidence_pack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence pack not found"
            )
        
        # Check if pack has expired
        if evidence_pack.is_expired():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Evidence pack has expired and is no longer available"
            )
        
        # Get file store instance
        from ..storage.file_store import LocalFileStore
        file_store = LocalFileStore()
        
        # Check if file exists
        if not file_store.file_exists(evidence_pack.storage_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence pack file not found in storage"
            )
        
        return PlatformApiResponse(
            success=True,
            message="Evidence pack download information retrieved",
            data={
                "pack_id": pack_id,
                "filename": evidence_pack.pack_filename,
                "file_size": evidence_pack.file_size,
                "checksum": evidence_pack.pack_checksum,
                "download_url": f"/api/v1/platform/evidence-pack/{pack_id}/content",
                "expires_at": evidence_pack.expires_at.isoformat() if evidence_pack.expires_at else None,
                "content_type": "application/zip",
                "verification_status": evidence_pack.verification_status,
                "generated_at": evidence_pack.generated_at.isoformat(),
                "retention_days_remaining": evidence_pack.get_retention_days_remaining()
            },
            tenant_id=tenant_context.tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to prepare evidence pack download: {str(e)}"
        )


@router.get("/evidence-pack/{pack_id}/verify", response_model=PlatformApiResponse)
async def verify_evidence_pack(
    pack_id: str,
    tenant_context: RequiredTenant = Depends(),
    db: Session = Depends(get_tenant_db_session)
):
    """
    Verify the integrity and reproducibility of an evidence pack.
    
    Requires 'evidence_operations.verify' permission.
    """
    try:
        # Check permissions
        from ..models import User
        current_user = User(id="system", role="admin")  # Placeholder - should come from auth
        from ..rbac.permissions import check_group_permission
        if not check_group_permission(current_user.role, "evidence_operations", "verify"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to verify evidence pack"
            )
        
        evidence_service = get_evidence_pack_service(db)
        result = evidence_service.verify_evidence_pack(pack_id)
        
        return PlatformApiResponse(
            success=result.get("success", False),
            message="Evidence pack verification completed",
            data=result,
            tenant_id=tenant_context.tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify evidence pack: {str(e)}"
        )


@router.get("/evidence-pack/{pack_id}/content")
async def download_evidence_pack_content(
    pack_id: str,
    tenant_context: RequiredTenant = Depends(),
    db: Session = Depends(get_tenant_db_session)
):
    """
    Download the actual evidence pack ZIP file content.
    
    Requires 'evidence_operations.download' permission.
    """
    try:
        # Check permissions
        from ..models import User
        current_user = User(id="system", role="admin")  # Placeholder - should come from auth
        from ..rbac.permissions import check_group_permission
        if not check_group_permission(current_user.role, "evidence_operations", "download"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to download evidence pack"
            )
        
        # Get evidence pack from database
        from ..models import EvidencePack
        evidence_pack = db.query(EvidencePack).filter(
            EvidencePack.id == pack_id,
            EvidencePack.tenant_id == tenant_context.tenant_id
        ).first()
        
        if not evidence_pack:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evidence pack not found"
            )
        
        # Check if pack has expired
        if evidence_pack.is_expired():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Evidence pack has expired and is no longer available"
            )
        
        # Get file store instance and retrieve file
        from ..storage.file_store import LocalFileStore
        from fastapi.responses import Response
        
        file_store = LocalFileStore()
        
        try:
            file_content = file_store.get_file(evidence_pack.storage_path)
            
            return Response(
                content=file_content,
                media_type="application/zip",
                headers={
                    "Content-Disposition": f"attachment; filename={evidence_pack.pack_filename}",
                    "Content-Length": str(len(file_content)),
                    "X-Evidence-Pack-ID": pack_id,
                    "X-Evidence-Pack-Checksum": evidence_pack.pack_checksum
                }
            )
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Evidence pack file not found in storage: {str(e)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download evidence pack: {str(e)}"
        )


@router.get("/evidence-packs", response_model=PlatformApiResponse)
async def list_evidence_packs(
    plan_run_id: Optional[str] = None,
    verification_status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    tenant_context: RequiredTenant = Depends(),
    db: Session = Depends(get_tenant_db_session)
):
    """
    List evidence packs for the current tenant.
    
    Requires 'evidence_operations.read' permission.
    """
    try:
        # Check permissions
        from ..models import User
        current_user = User(id="system", role="admin")  # Placeholder - should come from auth
        from ..rbac.permissions import check_group_permission
        if not check_group_permission(current_user.role, "evidence_operations", "read"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to list evidence packs"
            )
        
        # Build query
        from ..models import EvidencePack
        query = db.query(EvidencePack).filter(
            EvidencePack.tenant_id == tenant_context.tenant_id
        )
        
        if plan_run_id:
            query = query.filter(EvidencePack.plan_run_id == plan_run_id)
        
        if verification_status:
            query = query.filter(EvidencePack.verification_status == verification_status)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination and ordering
        evidence_packs = query.order_by(EvidencePack.generated_at.desc()).offset(offset).limit(limit).all()
        
        # Convert to dict format
        pack_data = []
        for pack in evidence_packs:
            pack_dict = pack.to_dict()
            # Add plan run information
            if pack.plan_run:
                pack_dict["plan_run"] = {
                    "id": pack.plan_run.id,
                    "status": pack.plan_run.status,
                    "started_at": pack.plan_run.started_at.isoformat() if pack.plan_run.started_at else None,
                    "finished_at": pack.plan_run.finished_at.isoformat() if pack.plan_run.finished_at else None
                }
            pack_data.append(pack_dict)
        
        return PlatformApiResponse(
            success=True,
            message=f"Retrieved {len(pack_data)} evidence packs",
            data={
                "evidence_packs": pack_data,
                "pagination": {
                    "total": total_count,
                    "limit": limit,
                    "offset": offset,
                    "has_more": (offset + limit) < total_count
                }
            },
            tenant_id=tenant_context.tenant_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list evidence packs: {str(e)}"
        )