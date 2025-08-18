"""
Column Mapping API router for intelligent CSV column mapping.
Provides endpoints for analyzing CSV columns and generating mapping suggestions.
"""

from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..services.column_mapping_service import get_column_mapping_service
from ..services.file_processing_service import ColumnInfo

router = APIRouter(prefix="/column-mapping", tags=["column-mapping"])


class ColumnMappingRequest(BaseModel):
    """Request payload for column mapping analysis."""
    columns: Dict[str, Dict[str, Any]]  # column_name -> {data_type, sample_values, ...}


class ColumnSuggestionResponse(BaseModel):
    """Response model for column suggestions."""
    csv_column: str
    system_field: str
    confidence: float
    reasoning: str
    match_type: str


class MappingAnalysisResponse(BaseModel):
    """Response model for complete mapping analysis."""
    suggestions: list[ColumnSuggestionResponse]
    required_fields_coverage: Dict[str, str | None]
    unmapped_csv_columns: list[str]
    confidence_score: float
    recommended_mapping: Dict[str, str]


class FieldSuggestionsRequest(BaseModel):
    """Request for getting suggestions for a specific column."""
    csv_column: str
    column_data: Dict[str, Any]


@router.post("/analyze", response_model=MappingAnalysisResponse)
async def analyze_column_mapping(
    request: ColumnMappingRequest
):
    """Analyze CSV columns and provide intelligent mapping suggestions."""
    try:
        mapping_service = get_column_mapping_service()
        
        # Convert request data to ColumnInfo objects
        column_info = {}
        for col_name, col_data in request.columns.items():
            column_info[col_name] = type('ColumnInfo', (), col_data)()
        
        # Perform analysis
        analysis = mapping_service.analyze_csv_columns(column_info)
        
        # Convert suggestions to response format
        suggestions_response = [
            ColumnSuggestionResponse(
                csv_column=s.csv_column,
                system_field=s.system_field,
                confidence=s.confidence,
                reasoning=s.reasoning,
                match_type=s.match_type
            ) for s in analysis.suggestions
        ]
        
        # Generate recommended mapping
        recommended_mapping = mapping_service.create_mapping_template(analysis)
        
        return MappingAnalysisResponse(
            suggestions=suggestions_response,
            required_fields_coverage=analysis.required_fields_coverage,
            unmapped_csv_columns=analysis.unmapped_csv_columns,
            confidence_score=analysis.confidence_score,
            recommended_mapping=recommended_mapping
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze column mapping: {str(e)}"
        )


@router.post("/field-suggestions", response_model=list[ColumnSuggestionResponse])
async def get_field_suggestions(
    request: FieldSuggestionsRequest
):
    """Get all possible field suggestions for a specific CSV column."""
    try:
        mapping_service = get_column_mapping_service()
        
        # Convert column data to object
        column_data = type('ColumnInfo', (), request.column_data)()
        
        # Get suggestions
        suggestions = mapping_service.get_field_suggestions_for_column(
            request.csv_column, 
            column_data
        )
        
        # Convert to response format
        return [
            ColumnSuggestionResponse(
                csv_column=s.csv_column,
                system_field=s.system_field,
                confidence=s.confidence,
                reasoning=s.reasoning,
                match_type=s.match_type
            ) for s in suggestions
        ]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get field suggestions: {str(e)}"
        )


@router.get("/system-fields")
async def get_system_fields():
    """Get information about all available system fields for mapping."""
    try:
        mapping_service = get_column_mapping_service()
        
        fields_info = {}
        for field_name, field_config in mapping_service.ALL_FIELDS.items():
            fields_info[field_name] = {
                'description': field_config.get('description', ''),
                'aliases': field_config.get('aliases', []),
                'expected_type': field_config.get('expected_type', []),
                'required': field_name in mapping_service.REQUIRED_FIELDS
            }
        
        return {
            'success': True,
            'data': fields_info,
            'message': 'System fields retrieved successfully'
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system fields: {str(e)}"
        )