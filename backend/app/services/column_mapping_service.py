"""
Intelligent Column Mapping Service
Provides fuzzy matching and intelligent suggestions for CSV column mapping.
"""

import re
import logging
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
from fuzzywuzzy import fuzz
import statistics

logger = logging.getLogger(__name__)


@dataclass
class ColumnSuggestion:
    """A suggestion for mapping a CSV column to a system field."""
    csv_column: str
    system_field: str
    confidence: float
    reasoning: str
    match_type: str  # 'exact', 'fuzzy_name', 'content_pattern', 'alias'


@dataclass
class MappingAnalysis:
    """Complete analysis of CSV columns with mapping suggestions."""
    suggestions: List[ColumnSuggestion]
    required_fields_coverage: Dict[str, Optional[str]]  # system_field -> csv_column or None
    unmapped_csv_columns: List[str]
    confidence_score: float


class ColumnMappingService:
    """Service for intelligent CSV column mapping with fuzzy matching and content analysis."""
    
    # System fields that are required
    REQUIRED_FIELDS = {
        'employee_id': {
            'description': 'Unique employee identifier',
            'aliases': ['emp_id', 'empid', 'employee_number', 'staff_id', 'worker_id', 'id'],
            'content_patterns': [r'^\d+$', r'^emp\d+$', r'^e\d+$'],  # Numeric, emp123, e123
            'expected_type': ['string', 'integer']
        },
        'base_salary': {
            'description': 'Employee base salary amount',
            'aliases': ['salary', 'base_pay', 'annual_salary', 'gross_salary', 'pay'],
            'content_patterns': [r'^\d+\.?\d*$', r'^\$\d+\.?\d*$'],  # Numbers, with optional $
            'expected_type': ['float', 'integer']
        }
    }
    
    # Optional fields for better mapping
    OPTIONAL_FIELDS = {
        'first_name': {
            'description': 'Employee first name',
            'aliases': ['fname', 'given_name', 'name'],
            'content_patterns': [r'^[a-zA-Z\s\'-]+$'],  # Text names
            'expected_type': ['string']
        },
        'last_name': {
            'description': 'Employee last name',
            'aliases': ['lname', 'surname', 'family_name'],
            'content_patterns': [r'^[a-zA-Z\s\'-]+$'],  # Text names
            'expected_type': ['string']
        },
        'email': {
            'description': 'Employee email address',
            'aliases': ['email_address', 'mail'],
            'content_patterns': [r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'],
            'expected_type': ['string']
        },
        'department': {
            'description': 'Employee department',
            'aliases': ['dept', 'division', 'team'],
            'content_patterns': [r'^[a-zA-Z\s&-]+$'],  # Department names
            'expected_type': ['string']
        },
        'position': {
            'description': 'Employee job title',
            'aliases': ['job_title', 'title', 'role'],
            'content_patterns': [r'^[a-zA-Z\s&-]+$'],  # Job titles
            'expected_type': ['string']
        }
    }
    
    ALL_FIELDS = {**REQUIRED_FIELDS, **OPTIONAL_FIELDS}
    
    def __init__(self):
        self.fuzzy_threshold = 70  # Minimum fuzzy match score (0-100)
        self.content_sample_size = 10  # Number of sample values to analyze for pattern matching
    
    def analyze_csv_columns(self, column_info: Dict[str, Any]) -> MappingAnalysis:
        """
        Analyze CSV columns and provide intelligent mapping suggestions.
        
        Args:
            column_info: Dictionary with column names as keys and ColumnInfo objects as values
            
        Returns:
            Complete mapping analysis with suggestions
        """
        suggestions = []
        required_coverage = {field: None for field in self.REQUIRED_FIELDS.keys()}
        
        # Generate suggestions for each CSV column
        for csv_col, col_data in column_info.items():
            best_match = self._find_best_match(csv_col, col_data)
            if best_match:
                suggestions.append(best_match)
                
                # Update required field coverage
                if best_match.system_field in required_coverage:
                    if required_coverage[best_match.system_field] is None or \
                       best_match.confidence > self._get_confidence_for_field(required_coverage[best_match.system_field], suggestions):
                        required_coverage[best_match.system_field] = csv_col
        
        # Find unmapped CSV columns
        mapped_csv_columns = {s.csv_column for s in suggestions}
        unmapped_csv_columns = [col for col in column_info.keys() if col not in mapped_csv_columns]
        
        # Calculate overall confidence score
        confidence_score = self._calculate_overall_confidence(suggestions, required_coverage)
        
        return MappingAnalysis(
            suggestions=suggestions,
            required_fields_coverage=required_coverage,
            unmapped_csv_columns=unmapped_csv_columns,
            confidence_score=confidence_score
        )
    
    def _find_best_match(self, csv_column: str, column_data: Any) -> Optional[ColumnSuggestion]:
        """Find the best system field match for a CSV column."""
        best_match = None
        best_confidence = 0
        
        for system_field, field_config in self.ALL_FIELDS.items():
            # Try different matching strategies
            matches = [
                self._try_exact_match(csv_column, system_field),
                self._try_fuzzy_name_match(csv_column, system_field, field_config),
                self._try_alias_match(csv_column, system_field, field_config),
                self._try_content_pattern_match(csv_column, column_data, system_field, field_config)
            ]
            
            # Find best match for this field
            field_best = max([m for m in matches if m is not None], 
                           key=lambda x: x.confidence, default=None)
            
            if field_best and field_best.confidence > best_confidence:
                best_match = field_best
                best_confidence = field_best.confidence
        
        return best_match if best_confidence >= (self.fuzzy_threshold / 100.0) else None
    
    def _try_exact_match(self, csv_column: str, system_field: str) -> Optional[ColumnSuggestion]:
        """Check for exact column name match."""
        if csv_column.lower() == system_field.lower():
            return ColumnSuggestion(
                csv_column=csv_column,
                system_field=system_field,
                confidence=1.0,
                reasoning=f"Exact name match: '{csv_column}' = '{system_field}'",
                match_type='exact'
            )
        return None
    
    def _try_fuzzy_name_match(self, csv_column: str, system_field: str, field_config: Dict) -> Optional[ColumnSuggestion]:
        """Check for fuzzy name matching."""
        # Clean column name for comparison
        clean_csv = re.sub(r'[^a-zA-Z0-9]', '_', csv_column.lower()).strip('_')
        clean_system = re.sub(r'[^a-zA-Z0-9]', '_', system_field.lower()).strip('_')
        
        fuzzy_score = fuzz.ratio(clean_csv, clean_system)
        
        if fuzzy_score >= self.fuzzy_threshold:
            confidence = fuzzy_score / 100.0
            return ColumnSuggestion(
                csv_column=csv_column,
                system_field=system_field,
                confidence=confidence,
                reasoning=f"Fuzzy name match: '{csv_column}' ≈ '{system_field}' ({fuzzy_score}% similarity)",
                match_type='fuzzy_name'
            )
        return None
    
    def _try_alias_match(self, csv_column: str, system_field: str, field_config: Dict) -> Optional[ColumnSuggestion]:
        """Check for alias matching."""
        clean_csv = re.sub(r'[^a-zA-Z0-9]', '_', csv_column.lower()).strip('_')
        
        for alias in field_config.get('aliases', []):
            clean_alias = re.sub(r'[^a-zA-Z0-9]', '_', alias.lower()).strip('_')
            
            # Exact alias match
            if clean_csv == clean_alias:
                return ColumnSuggestion(
                    csv_column=csv_column,
                    system_field=system_field,
                    confidence=0.95,
                    reasoning=f"Alias match: '{csv_column}' matches alias '{alias}' for {system_field}",
                    match_type='alias'
                )
            
            # Fuzzy alias match
            fuzzy_score = fuzz.ratio(clean_csv, clean_alias)
            if fuzzy_score >= self.fuzzy_threshold:
                confidence = (fuzzy_score / 100.0) * 0.9  # Slightly lower than exact
                return ColumnSuggestion(
                    csv_column=csv_column,
                    system_field=system_field,
                    confidence=confidence,
                    reasoning=f"Fuzzy alias match: '{csv_column}' ≈ '{alias}' for {system_field} ({fuzzy_score}% similarity)",
                    match_type='alias'
                )
        return None
    
    def _try_content_pattern_match(self, csv_column: str, column_data: Any, 
                                 system_field: str, field_config: Dict) -> Optional[ColumnSuggestion]:
        """Check for content pattern matching based on sample values."""
        if not hasattr(column_data, 'sample_values') or not column_data.sample_values:
            return None
        
        patterns = field_config.get('content_patterns', [])
        if not patterns:
            return None
        
        # Check if data type matches expected
        expected_types = field_config.get('expected_type', [])
        if expected_types and hasattr(column_data, 'data_type'):
            if column_data.data_type not in expected_types:
                return None
        
        # Analyze sample values against patterns
        sample_values = column_data.sample_values[:self.content_sample_size]
        pattern_matches = []
        
        for pattern in patterns:
            matches = sum(1 for value in sample_values if re.match(pattern, str(value).strip()))
            if matches > 0:
                match_ratio = matches / len(sample_values)
                pattern_matches.append((pattern, match_ratio))
        
        if pattern_matches:
            best_pattern, best_ratio = max(pattern_matches, key=lambda x: x[1])
            
            # Confidence based on match ratio and pattern strength
            base_confidence = best_ratio * 0.8  # Content patterns are less certain than names
            
            # Boost confidence if many samples match
            if best_ratio >= 0.8:
                base_confidence = min(0.9, base_confidence + 0.1)
            
            return ColumnSuggestion(
                csv_column=csv_column,
                system_field=system_field,
                confidence=base_confidence,
                reasoning=f"Content pattern match: {int(best_ratio*100)}% of values match {system_field} pattern",
                match_type='content_pattern'
            )
        
        return None
    
    def _get_confidence_for_field(self, csv_column: str, suggestions: List[ColumnSuggestion]) -> float:
        """Get the confidence score for a specific CSV column mapping."""
        for suggestion in suggestions:
            if suggestion.csv_column == csv_column:
                return suggestion.confidence
        return 0.0
    
    def _calculate_overall_confidence(self, suggestions: List[ColumnSuggestion], 
                                    required_coverage: Dict[str, Optional[str]]) -> float:
        """Calculate overall confidence score for the mapping."""
        if not suggestions:
            return 0.0
        
        # Base confidence from suggestion quality
        suggestion_confidences = [s.confidence for s in suggestions]
        avg_confidence = statistics.mean(suggestion_confidences)
        
        # Penalty for missing required fields
        required_fields_mapped = sum(1 for field, mapping in required_coverage.items() if mapping is not None)
        required_coverage_ratio = required_fields_mapped / len(required_coverage)
        
        # Weight: 70% suggestion quality + 30% required field coverage
        overall_confidence = (avg_confidence * 0.7) + (required_coverage_ratio * 0.3)
        
        return min(1.0, overall_confidence)
    
    def create_mapping_template(self, mapping_analysis: MappingAnalysis) -> Dict[str, str]:
        """Create a column mapping template from analysis results."""
        mapping = {}
        
        for suggestion in mapping_analysis.suggestions:
            # Only include high-confidence suggestions
            if suggestion.confidence >= 0.7:
                mapping[suggestion.csv_column] = suggestion.system_field
        
        return mapping
    
    def get_field_suggestions_for_column(self, csv_column: str, column_data: Any) -> List[ColumnSuggestion]:
        """Get all possible field suggestions for a specific CSV column, ranked by confidence."""
        suggestions = []
        
        for system_field, field_config in self.ALL_FIELDS.items():
            matches = [
                self._try_exact_match(csv_column, system_field),
                self._try_fuzzy_name_match(csv_column, system_field, field_config),
                self._try_alias_match(csv_column, system_field, field_config),
                self._try_content_pattern_match(csv_column, column_data, system_field, field_config)
            ]
            
            best_match = max([m for m in matches if m is not None], 
                           key=lambda x: x.confidence, default=None)
            
            if best_match:
                suggestions.append(best_match)
        
        # Sort by confidence, descending
        return sorted(suggestions, key=lambda x: x.confidence, reverse=True)


def get_column_mapping_service() -> ColumnMappingService:
    """Factory function to create ColumnMappingService."""
    return ColumnMappingService()