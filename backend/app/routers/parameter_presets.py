from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from ..database import get_db
from ..models import ParameterPreset
from ..schemas import ParameterPresetCreate, ParameterPreset as ParameterPresetSchema
from ..schemas import ParameterPresetUpdate, ApiResponse

router = APIRouter(
    prefix="/parameter-presets",
    tags=["parameter-presets"],
)

@router.get("/", response_model=ApiResponse)
async def get_parameter_presets(db: Session = Depends(get_db)):
    """Get all parameter presets"""
    presets = db.query(ParameterPreset).all()
    return {
        "success": True,
        "data": presets,
        "message": "Parameter presets retrieved successfully"
    }

@router.get("/{preset_id}", response_model=ApiResponse)
async def get_parameter_preset(preset_id: str, db: Session = Depends(get_db)):
    """Get a specific parameter preset by ID"""
    preset = db.query(ParameterPreset).filter(ParameterPreset.id == preset_id).first()
    if not preset:
        raise HTTPException(status_code=404, detail="Parameter preset not found")
    
    return {
        "success": True,
        "data": preset,
        "message": "Parameter preset retrieved successfully"
    }

@router.post("/", response_model=ApiResponse)
async def create_parameter_preset(preset: ParameterPresetCreate, db: Session = Depends(get_db)):
    """Create a new parameter preset"""
    # Check if this is set as default and update other presets if needed
    if preset.is_default:
        # Set all other presets to non-default
        db.query(ParameterPreset).filter(ParameterPreset.is_default == True).update(
            {"is_default": False}
        )
    
    # Create new preset
    db_preset = ParameterPreset(
        id=str(uuid.uuid4()),
        name=preset.name,
        description=preset.description,
        parameters=preset.parameters.dict(),
        is_default=preset.is_default
    )
    
    db.add(db_preset)
    db.commit()
    db.refresh(db_preset)
    
    return {
        "success": True,
        "data": db_preset,
        "message": "Parameter preset created successfully"
    }

@router.put("/{preset_id}", response_model=ApiResponse)
async def update_parameter_preset(
    preset_id: str, 
    preset_update: ParameterPresetUpdate, 
    db: Session = Depends(get_db)
):
    """Update an existing parameter preset"""
    db_preset = db.query(ParameterPreset).filter(ParameterPreset.id == preset_id).first()
    if not db_preset:
        raise HTTPException(status_code=404, detail="Parameter preset not found")
    
    # Check if we're changing the default status
    if preset_update.is_default is not None and preset_update.is_default:
        # Set all other presets to non-default
        db.query(ParameterPreset).filter(ParameterPreset.id != preset_id).update(
            {"is_default": False}
        )
    
    # Update fields if provided
    if preset_update.name is not None:
        db_preset.name = preset_update.name
    
    if preset_update.description is not None:
        db_preset.description = preset_update.description
    
    if preset_update.parameters is not None:
        db_preset.parameters = preset_update.parameters.dict()
    
    if preset_update.is_default is not None:
        db_preset.is_default = preset_update.is_default
    
    db.commit()
    db.refresh(db_preset)
    
    return {
        "success": True,
        "data": db_preset,
        "message": "Parameter preset updated successfully"
    }

@router.delete("/{preset_id}", response_model=ApiResponse)
async def delete_parameter_preset(preset_id: str, db: Session = Depends(get_db)):
    """Delete a parameter preset"""
    db_preset = db.query(ParameterPreset).filter(ParameterPreset.id == preset_id).first()
    if not db_preset:
        raise HTTPException(status_code=404, detail="Parameter preset not found")
    
    # Don't allow deleting the default preset
    if db_preset.is_default:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete the default parameter preset. Set another preset as default first."
        )
    
    db.delete(db_preset)
    db.commit()
    
    return {
        "success": True,
        "data": None,
        "message": "Parameter preset deleted successfully"
    }

@router.get("/default", response_model=ApiResponse)
async def get_default_parameter_preset(db: Session = Depends(get_db)):
    """Get the default parameter preset"""
    # Try to find a preset marked as default
    preset = db.query(ParameterPreset).filter(ParameterPreset.is_default == True).first()
    
    # If no default preset exists, try to get any preset
    if not preset:
        preset = db.query(ParameterPreset).first()
    
    # If still no preset, create a new default preset
    if not preset:
        # Create a default preset with standard values
        from ..schemas import BatchParameters
        default_params = BatchParameters(
            targetBonusPct=0.15,
            investmentWeight=0.6,
            qualitativeWeight=0.4,
            investmentScoreMultiplier=1.0,
            qualScoreMultiplier=1.0,
            raf=1.0,
            rafSensitivity=0.2,
            rafLowerClamp=0,
            rafUpperClamp=1.5,
            mrtCapPct=2.0,
            useDirectRaf=True,
            baseSalaryCapMultiplier=3.0
        )
        
        # Create the preset in the database
        preset = ParameterPreset(
            id=str(uuid.uuid4()),
            name="Standard Configuration",
            description="Default parameters for standard bonus calculations",
            parameters=default_params.dict(),
            is_default=True
        )
        
        try:
            db.add(preset)
            db.commit()
            db.refresh(preset)
        except Exception as e:
            db.rollback()
            # Log the error but continue to return a default preset anyway
            import logging
            logging.error(f"Error creating default parameter preset: {str(e)}")
            
            # Return an in-memory preset if we couldn't save to the database
            return {
                "success": True,
                "data": {
                    "id": "default",
                    "name": "Standard Configuration",
                    "description": "Default parameters for standard bonus calculations",
                    "parameters": default_params.dict(),
                    "is_default": True
                },
                "message": "Generated default parameter preset"
            }
    
    return {
        "success": True,
        "data": preset,
        "message": "Default parameter preset retrieved successfully"
    }
