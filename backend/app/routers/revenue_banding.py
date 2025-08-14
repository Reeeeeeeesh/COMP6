"""Revenue Banding API Endpoints

Read-only endpoints to preview team banding and list entities.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
import os
from sqlalchemy.orm import Session
from typing import Optional
import logging

from ..database import get_db
from ..schemas import (
    ApiResponse,
    TeamResponse,
    TeamRevenueHistoryResponse,
    RevenueBandConfigResponse,
    BandPreviewResponse,
    BandPreviewComponents,
    TeamCreate,
    TeamUpdate,
    RevenueBandConfigCreate,
    RevenueBandConfigUpdate,
)
from ..models import Team, TeamRevenueHistory, RevenueBandConfig
from ..services.revenue_banding_service import RevenueBandingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/revenue-banding", tags=["revenue-banding"])


def admin_guard():
    """Simple feature flag guard for mutating endpoints.
    Set ENABLE_REVENUE_BANDING_ADMIN=false to disable admin writes.
    """
    enabled = os.getenv("ENABLE_REVENUE_BANDING_ADMIN", "true").lower() in ("1", "true", "yes")
    if not enabled:
        raise HTTPException(status_code=403, detail="Admin actions are disabled")
    return True


@router.get("/teams", response_model=ApiResponse)
async def list_teams(db: Session = Depends(get_db)):
    teams = db.query(Team).order_by(Team.name.asc()).all()
    payload = [TeamResponse.model_validate(t).model_dump() for t in teams]
    return ApiResponse(success=True, message=f"Found {len(payload)} teams", data=payload)

@router.post("/teams", response_model=ApiResponse, dependencies=[Depends(admin_guard)])
async def create_team(payload: TeamCreate, db: Session = Depends(get_db)):
    if db.query(Team).filter(Team.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Team name already exists")
    team = Team(name=payload.name, division=payload.division, peer_group=payload.peer_group)
    db.add(team)
    db.commit()
    db.refresh(team)
    return ApiResponse(success=True, message="Team created", data=TeamResponse.model_validate(team).model_dump())

@router.put("/teams/{team_id}", response_model=ApiResponse, dependencies=[Depends(admin_guard)])
async def update_team(team_id: str, payload: TeamUpdate, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    if payload.name is not None:
        # enforce unique name
        exists = db.query(Team).filter(Team.name == payload.name, Team.id != team_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Team name already exists")
        team.name = payload.name
    if payload.division is not None:
        team.division = payload.division
    if payload.peer_group is not None:
        team.peer_group = payload.peer_group
    db.add(team)
    db.commit()
    db.refresh(team)
    return ApiResponse(success=True, message="Team updated", data=TeamResponse.model_validate(team).model_dump())

@router.delete("/teams/{team_id}", response_model=ApiResponse, dependencies=[Depends(admin_guard)])
async def delete_team(team_id: str, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    # Will cascade delete revenue history via relationship
    db.delete(team)
    db.commit()
    return ApiResponse(success=True, message="Team deleted", data={"id": team_id})


@router.get("/teams/{team_id}/history", response_model=ApiResponse)
async def get_team_history(team_id: str, db: Session = Depends(get_db)):
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    history = (
        db.query(TeamRevenueHistory)
        .filter(TeamRevenueHistory.team_id == team_id)
        .order_by(TeamRevenueHistory.fiscal_year.asc())
        .all()
    )
    payload = [TeamRevenueHistoryResponse.model_validate(h).model_dump() for h in history]
    return ApiResponse(success=True, message=f"Found {len(payload)} history rows", data=payload)


@router.get("/configs", response_model=ApiResponse)
async def list_band_configs(db: Session = Depends(get_db)):
    configs = db.query(RevenueBandConfig).order_by(RevenueBandConfig.name.asc()).all()
    payload = [RevenueBandConfigResponse.model_validate(c).model_dump() for c in configs]
    return ApiResponse(success=True, message=f"Found {len(payload)} configs", data=payload)

@router.post("/configs", response_model=ApiResponse, dependencies=[Depends(admin_guard)])
async def create_band_config(payload: RevenueBandConfigCreate, db: Session = Depends(get_db)):
    if db.query(RevenueBandConfig).filter(RevenueBandConfig.name == payload.name).first():
        raise HTTPException(status_code=400, detail="Config name already exists")
    cfg = RevenueBandConfig(name=payload.name, settings=payload.settings.model_dump())
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return ApiResponse(success=True, message="Config created", data=RevenueBandConfigResponse.model_validate(cfg).model_dump())

@router.put("/configs/{config_id}", response_model=ApiResponse, dependencies=[Depends(admin_guard)])
async def update_band_config(config_id: str, payload: RevenueBandConfigUpdate, db: Session = Depends(get_db)):
    cfg = db.query(RevenueBandConfig).filter(RevenueBandConfig.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    if payload.name is not None:
        exists = db.query(RevenueBandConfig).filter(RevenueBandConfig.name == payload.name, RevenueBandConfig.id != config_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="Config name already exists")
        cfg.name = payload.name
    if payload.settings is not None:
        cfg.settings = payload.settings.model_dump()
    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    return ApiResponse(success=True, message="Config updated", data=RevenueBandConfigResponse.model_validate(cfg).model_dump())

@router.delete("/configs/{config_id}", response_model=ApiResponse, dependencies=[Depends(admin_guard)])
async def delete_band_config(config_id: str, db: Session = Depends(get_db)):
    cfg = db.query(RevenueBandConfig).filter(RevenueBandConfig.id == config_id).first()
    if not cfg:
        raise HTTPException(status_code=404, detail="Config not found")
    db.delete(cfg)
    db.commit()
    return ApiResponse(success=True, message="Config deleted", data={"id": config_id})


@router.get("/preview", response_model=ApiResponse)
async def preview_band(team_id: str = Query(...), config_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    try:
        service = RevenueBandingService(db)
        result = service.preview_team_band(team_id, config_id)
        payload = {
            "team_id": result.team_id,
            "config_id": result.config_id,
            "composite_score": result.composite_score,
            "band": result.band,
            "multiplier": result.multiplier,
            "components": result.components,
        }
        return ApiResponse(success=True, message="Band preview computed", data=payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.exception("Failed to preview band")
        raise HTTPException(status_code=500, detail="Failed to preview band")


