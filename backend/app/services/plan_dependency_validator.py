"""
Plan Dependency Validator for DAG validation and cycle detection.
Validates that plan steps form a valid dependency graph without cycles.
"""
import logging
from typing import Dict, List, Set, Tuple, Any, Optional
from collections import defaultdict, deque

logger = logging.getLogger(__name__)


class PlanDependencyValidator:
    """Validates plan step dependencies and detects cycles using graph algorithms."""
    
    def __init__(self, expression_parser):
        """
        Initialize validator with expression parser for variable extraction.
        
        Args:
            expression_parser: SafeDSLParser instance for analyzing expressions
        """
        self.parser = expression_parser
    
    def validate_dependencies(self, steps: List[Dict[str, Any]], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Validate plan dependencies and detect cycles.
        
        Args:
            steps: List of plan steps with 'name', 'expr', 'outputs', 'order', etc.
            inputs: List of plan inputs with 'name', etc.
            
        Returns:
            Comprehensive dependency analysis with validation results
        """
        try:
            # Build dependency graph
            graph_data = self._build_dependency_graph(steps, inputs)
            
            # Validate graph properties
            cycle_result = self._detect_cycles(graph_data)
            variable_result = self._validate_variable_definitions(graph_data)
            ordering_result = self._suggest_optimal_ordering(graph_data)
            
            # Combine results
            return {
                'valid': cycle_result['valid'] and variable_result['valid'],
                'has_cycles': not cycle_result['valid'],
                'undefined_variables': variable_result.get('undefined_variables', []),
                'dependency_cycles': cycle_result.get('cycles', []),
                'current_ordering': [step['name'] for step in sorted(steps, key=lambda s: s.get('order', 0))],
                'suggested_ordering': ordering_result.get('ordering', []),
                'ordering_changed': ordering_result.get('changed', False),
                'dependency_graph': {
                    'nodes': graph_data['nodes'],
                    'edges': dict(graph_data['edges']),  # Convert defaultdict to dict
                    'variable_definitions': dict(graph_data['variable_definitions']),
                    'variable_references': dict(graph_data['variable_references'])
                },
                'analysis_summary': {
                    'total_steps': len(steps),
                    'total_inputs': len(inputs),
                    'total_variables_defined': len(graph_data['all_outputs']),
                    'total_dependencies': sum(len(deps) for deps in graph_data['edges'].values())
                }
            }
            
        except Exception as e:
            logger.error(f"Error validating plan dependencies: {e}")
            return {
                'valid': False,
                'error': f"Dependency validation failed: {e}",
                'has_cycles': None,
                'undefined_variables': [],
                'dependency_cycles': [],
                'current_ordering': [],
                'suggested_ordering': [],
                'ordering_changed': False
            }
    
    def _build_dependency_graph(self, steps: List[Dict[str, Any]], inputs: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build dependency graph from plan steps and inputs."""
        
        # Initialize graph structures
        nodes = {}  # step_id -> step metadata
        edges = defaultdict(list)  # step_id -> [dependent_step_ids]  
        variable_definitions = defaultdict(list)  # variable_name -> [step_ids that define it]
        variable_references = defaultdict(list)  # step_id -> [variable_names it references]
        
        # Track available variables
        input_variables = {inp['name'] for inp in inputs}
        all_outputs = set()
        
        # Process each step
        for step in steps:
            step_id = step.get('id', step['name'])  # Fallback to name if no ID
            step_name = step['name']
            step_expr = step.get('expr', '')
            step_outputs = step.get('outputs', [])
            
            # Store step metadata
            nodes[step_id] = {
                'name': step_name,
                'expr': step_expr,
                'outputs': step_outputs,
                'order': step.get('order', step.get('step_order', 0)),
                'original_step': step
            }
            
            # Track variable definitions from this step
            for output_var in step_outputs:
                variable_definitions[output_var].append(step_id)
                all_outputs.add(output_var)
            
            # Extract variables referenced by this step's expression
            if step_expr.strip():
                try:
                    expr_info = self.parser.get_expression_info(step_expr)
                    referenced_vars = set(expr_info.get('variables', []))
                    variable_references[step_id] = list(referenced_vars)
                    
                    # Build dependency edges (this step depends on steps that define referenced variables)
                    for var in referenced_vars:
                        if var in input_variables:
                            # Dependency on input - no edge needed
                            continue
                        
                        # Find steps that define this variable
                        for other_step in steps:
                            other_step_id = other_step.get('id', other_step['name'])
                            other_outputs = other_step.get('outputs', [])
                            
                            if var in other_outputs and other_step_id != step_id:
                                # step_id depends on other_step_id
                                edges[other_step_id].append(step_id)
                                
                except Exception as e:
                    logger.warning(f"Error analyzing expression for step {step_name}: {e}")
                    variable_references[step_id] = []
        
        return {
            'nodes': nodes,
            'edges': edges,
            'variable_definitions': variable_definitions,
            'variable_references': variable_references,
            'input_variables': input_variables,
            'all_outputs': all_outputs
        }
    
    def _detect_cycles(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Detect cycles in dependency graph using DFS."""
        nodes = graph_data['nodes']
        edges = graph_data['edges']
        
        # DFS state tracking
        WHITE, GRAY, BLACK = 0, 1, 2
        colors = {node_id: WHITE for node_id in nodes}
        cycles = []
        
        def dfs_visit(node_id: str, path: List[str]) -> bool:
            """DFS visit with cycle detection."""
            if colors[node_id] == GRAY:
                # Found back edge - cycle detected
                cycle_start = path.index(node_id)
                cycle = path[cycle_start:] + [node_id]
                cycle_names = [nodes[nid]['name'] for nid in cycle]
                cycles.append({
                    'cycle_nodes': cycle,
                    'cycle_names': cycle_names,
                    'cycle_length': len(cycle) - 1
                })
                return True
                
            if colors[node_id] == BLACK:
                # Already processed
                return False
            
            # Mark as being processed
            colors[node_id] = GRAY
            path.append(node_id)
            
            # Visit dependents
            has_cycle = False
            for dependent_id in edges[node_id]:
                if dependent_id in nodes:  # Ensure dependent exists
                    if dfs_visit(dependent_id, path):
                        has_cycle = True
            
            # Mark as fully processed
            path.pop()
            colors[node_id] = BLACK
            
            return has_cycle
        
        # Check all nodes for cycles
        has_cycles = False
        for node_id in nodes:
            if colors[node_id] == WHITE:
                if dfs_visit(node_id, []):
                    has_cycles = True
        
        return {
            'valid': not has_cycles,
            'cycles': cycles,
            'cycle_count': len(cycles)
        }
    
    def _validate_variable_definitions(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that all referenced variables are defined somewhere."""
        variable_definitions = graph_data['variable_definitions']
        variable_references = graph_data['variable_references']
        input_variables = graph_data['input_variables']
        all_outputs = graph_data['all_outputs']
        
        # Check for undefined variables
        undefined_variables = []
        multiply_defined_variables = []
        
        # All variables that should be available
        available_variables = input_variables | all_outputs
        
        # Check each step's references
        for step_id, referenced_vars in variable_references.items():
            for var in referenced_vars:
                if var not in available_variables:
                    undefined_variables.append({
                        'variable': var,
                        'referenced_by_step': graph_data['nodes'][step_id]['name'],
                        'step_id': step_id
                    })
        
        # Check for variables defined by multiple steps
        for var, defining_steps in variable_definitions.items():
            if len(defining_steps) > 1:
                multiply_defined_variables.append({
                    'variable': var,
                    'defined_by_steps': [graph_data['nodes'][sid]['name'] for sid in defining_steps],
                    'step_ids': defining_steps
                })
        
        return {
            'valid': len(undefined_variables) == 0 and len(multiply_defined_variables) == 0,
            'undefined_variables': undefined_variables,
            'multiply_defined_variables': multiply_defined_variables
        }
    
    def _suggest_optimal_ordering(self, graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Suggest optimal step ordering using topological sort."""
        nodes = graph_data['nodes']
        edges = graph_data['edges']
        
        if not nodes:
            return {'ordering': [], 'changed': False}
        
        # Create reverse edges (who depends on this node)
        reverse_edges = defaultdict(list)
        in_degree = defaultdict(int)
        
        # Initialize in-degrees
        for node_id in nodes:
            in_degree[node_id] = 0
        
        # Build reverse edges and calculate in-degrees
        for node_id, dependents in edges.items():
            for dependent_id in dependents:
                if dependent_id in nodes:  # Ensure dependent exists
                    reverse_edges[node_id].append(dependent_id)
                    in_degree[dependent_id] += 1
        
        # Topological sort using Kahn's algorithm
        queue = deque([node_id for node_id in nodes if in_degree[node_id] == 0])
        topo_order = []
        
        while queue:
            current = queue.popleft()
            topo_order.append(current)
            
            # Remove edges from current node
            for dependent in reverse_edges[current]:
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)
        
        # Convert to step names and check if ordering changed
        suggested_names = [nodes[node_id]['name'] for node_id in topo_order]
        current_names = [nodes[node_id]['name'] for node_id in sorted(nodes.keys(), key=lambda x: nodes[x]['order'])]
        
        return {
            'ordering': suggested_names,
            'changed': suggested_names != current_names,
            'original_ordering': current_names
        }