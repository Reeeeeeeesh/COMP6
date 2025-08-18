"""
Safe DSL Expression Parser for Bonus Calculation Plans
Uses Python AST for secure parsing without code execution.
"""
import ast
import logging
from typing import Dict, List, Any, Set, Optional, Union
from decimal import Decimal
from datetime import datetime

logger = logging.getLogger(__name__)

class ExpressionSecurityError(Exception):
    """Raised when an expression contains unsafe operations."""
    pass

class ExpressionValidationError(Exception):
    """Raised when an expression fails validation."""
    pass

class ExpressionEvaluationError(Exception):
    """Raised when an expression fails during runtime evaluation."""
    pass

class SafeDSLParser:
    """Safe parser for bonus calculation expressions using AST whitelisting."""
    
    # Whitelisted AST node types for safe operations
    ALLOWED_NODES = {
        ast.Expression,    # Top-level expression node
        ast.BinOp,        # Binary operations (+, -, *, /, etc.)
        ast.UnaryOp,      # Unary operations (+x, -x, not x)
        ast.Compare,      # Comparisons (==, !=, <, >, <=, >=)
        ast.BoolOp,       # Boolean operations (and, or)
        ast.IfExp,        # Conditional expressions (x if condition else y)
        ast.Name,         # Variable names
        ast.Constant,     # Literal values (numbers, strings, True/False/None)
        ast.Num,          # Numeric literals (for older Python versions)
        ast.Str,          # String literals (for older Python versions) 
        ast.NameConstant, # True, False, None (for older Python versions)
        ast.Call,         # Function calls (whitelisted functions only)
        ast.List,         # List literals [a, b, c] for functions like sum()
        ast.Tuple,        # Tuple literals (a, b, c) for functions
        ast.Load,         # Variable loading context
        ast.Store,        # Variable storing context (for completeness)
        
        # Operators
        ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow, ast.FloorDiv,  # Arithmetic
        ast.Eq, ast.NotEq, ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Is, ast.IsNot, ast.In, ast.NotIn,  # Comparison
        ast.And, ast.Or,  # Boolean
        ast.Not, ast.Invert, ast.UAdd, ast.USub,  # Unary
    }
    
    # Whitelisted functions that are safe for calculations
    ALLOWED_FUNCTIONS = {
        # Mathematical functions
        'abs': abs,
        'round': round,
        'max': max, 
        'min': min,
        'sum': sum,
        'len': len,
        
        # Type conversion functions
        'int': int,
        'float': float,
        'str': str,
        'bool': bool,
        
        # Decimal for high precision
        'Decimal': Decimal,
        
        # Safe built-ins
        'pow': pow,
    }
    
    def __init__(self):
        self.variables: Dict[str, Any] = {}
        self.available_variables: Set[str] = set()
        
    def parse(self, expression: str) -> ast.Expression:
        """Parse an expression string into a safe AST."""
        try:
            # Parse the expression into an AST
            tree = ast.parse(expression, mode='eval')
            
            # Validate that only safe nodes are used
            self._validate_ast_security(tree)
            
            return tree
            
        except SyntaxError as e:
            raise ExpressionValidationError(f"Invalid expression syntax: {e}")
        except Exception as e:
            raise ExpressionValidationError(f"Failed to parse expression: {e}")
    
    def validate_expression(self, expression: str, available_variables: Set[str] = None) -> Dict[str, Any]:
        """Validate an expression for security and correctness."""
        if available_variables is not None:
            self.available_variables = available_variables
        
        try:
            # Parse the expression
            tree = self.parse(expression)
            
            # Extract variables and functions used
            variables_used = self._extract_variables(tree)
            functions_used = self._extract_functions(tree)
            
            # Validate variables exist
            undefined_variables = variables_used - self.available_variables
            if undefined_variables:
                raise ExpressionValidationError(
                    f"Undefined variables: {', '.join(undefined_variables)}"
                )
            
            # Validate functions are allowed
            disallowed_functions = functions_used - set(self.ALLOWED_FUNCTIONS.keys())
            if disallowed_functions:
                raise ExpressionSecurityError(
                    f"Disallowed functions: {', '.join(disallowed_functions)}"
                )
            
            return {
                'valid': True,
                'variables_used': list(variables_used),
                'functions_used': list(functions_used),
                'ast_tree': tree
            }
            
        except (ExpressionSecurityError, ExpressionValidationError) as e:
            return {
                'valid': False,
                'error': str(e),
                'error_type': e.__class__.__name__
            }
        except Exception as e:
            logger.error(f"Unexpected error validating expression: {e}")
            return {
                'valid': False,
                'error': f"Validation failed: {e}",
                'error_type': 'UnexpectedError'
            }
    
    def get_expression_info(self, expression: str) -> Dict[str, Any]:
        """Get detailed information about an expression without executing it."""
        try:
            tree = self.parse(expression)
            
            return {
                'variables': list(self._extract_variables(tree)),
                'functions': list(self._extract_functions(tree)),
                'has_conditions': self._has_conditional_logic(tree),
                'complexity_score': self._calculate_complexity(tree),
                'node_count': self._count_nodes(tree)
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze expression: {e}")
            return {
                'error': str(e),
                'variables': [],
                'functions': [],
                'has_conditions': False,
                'complexity_score': 0,
                'node_count': 0
            }
    
    def evaluate(self, expression: str, variables: Dict[str, Any]) -> Decimal:
        """
        Safely evaluate an expression with provided variable values.
        
        Args:
            expression: The expression string to evaluate
            variables: Dictionary of variable name -> value mappings
            
        Returns:
            Decimal: The result of the expression evaluation
            
        Raises:
            ExpressionSecurityError: If expression contains unsafe operations
            ExpressionValidationError: If expression syntax is invalid
            ExpressionEvaluationError: If evaluation fails at runtime
        """
        try:
            # First, parse and validate the expression for security
            tree = self.parse(expression)
            
            # Convert all input variables to appropriate types for calculation
            decimal_variables = {}
            for name, value in variables.items():
                try:
                    if isinstance(value, bool):
                        # Booleans should remain as booleans for conditional logic
                        decimal_variables[name] = value
                    elif isinstance(value, (int, float)):
                        # Convert numeric types to Decimal for high-precision calculations
                        decimal_variables[name] = self._convert_to_decimal(value)
                    elif isinstance(value, str):
                        # Try to convert strings to Decimal if they're numeric, otherwise keep as string
                        try:
                            decimal_variables[name] = self._convert_to_decimal(value)
                        except ExpressionEvaluationError:
                            # Not a numeric string, keep as string
                            decimal_variables[name] = value
                    else:
                        # Keep other types as-is (None, lists, etc.)
                        decimal_variables[name] = value
                except Exception as e:
                    raise ExpressionEvaluationError(f"Cannot convert variable '{name}' with value '{value}' to calculation type: {e}")
            
            # Evaluate the AST tree
            result = self._evaluate_ast_node(tree.body, decimal_variables)
            
            # Ensure result is a Decimal for consistency
            return self._convert_to_decimal(result)
            
        except (ExpressionSecurityError, ExpressionValidationError):
            # Re-raise validation and security errors as-is
            raise
        except ExpressionEvaluationError:
            # Re-raise evaluation errors as-is
            raise
        except Exception as e:
            logger.error(f"Unexpected error evaluating expression '{expression}': {e}")
            raise ExpressionEvaluationError(f"Evaluation failed: {e}")
    
    def _validate_ast_security(self, tree: ast.AST) -> None:
        """Validate that an AST tree contains only safe operations."""
        for node in ast.walk(tree):
            node_type = type(node)
            
            if node_type not in self.ALLOWED_NODES:
                raise ExpressionSecurityError(
                    f"Disallowed operation: {node_type.__name__}"
                )
            
            # Additional security checks for specific node types
            if isinstance(node, ast.Call):
                self._validate_function_call(node)
            elif isinstance(node, ast.Name):
                self._validate_variable_name(node)
    
    def _validate_function_call(self, node: ast.Call) -> None:
        """Validate that function calls are safe."""
        if isinstance(node.func, ast.Name):
            func_name = node.func.id
            if func_name not in self.ALLOWED_FUNCTIONS:
                raise ExpressionSecurityError(f"Disallowed function: {func_name}")
        elif isinstance(node.func, ast.Attribute):
            # Disallow method calls (obj.method()) for security
            raise ExpressionSecurityError("Method calls are not allowed")
        else:
            raise ExpressionSecurityError("Complex function calls are not allowed")
    
    def _validate_variable_name(self, node: ast.Name) -> None:
        """Validate that variable names are safe."""
        var_name = node.id
        
        # Prevent access to dangerous built-ins
        dangerous_names = {
            '__import__', 'eval', 'exec', 'compile', 'open', 'file',
            'input', 'raw_input', 'reload', '__builtins__', 'globals', 'locals',
            'vars', 'dir', 'hasattr', 'getattr', 'setattr', 'delattr',
            'isinstance', 'issubclass', 'callable', 'type', 'id', 'hash'
        }
        
        if var_name in dangerous_names:
            raise ExpressionSecurityError(f"Access to '{var_name}' is not allowed")
        
        # Prevent access to private attributes
        if var_name.startswith('_'):
            raise ExpressionSecurityError(f"Access to private variable '{var_name}' is not allowed")
    
    def _extract_variables(self, tree: ast.AST) -> Set[str]:
        """Extract all variable names used in an expression."""
        variables = set()
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
                # Only count variables being loaded, not function names
                if not self._is_function_name(node, tree):
                    variables.add(node.id)
        
        return variables
    
    def _extract_functions(self, tree: ast.AST) -> Set[str]:
        """Extract all function names used in an expression."""
        functions = set()
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                functions.add(node.func.id)
        
        return functions
    
    def _is_function_name(self, name_node: ast.Name, tree: ast.AST) -> bool:
        """Check if a Name node refers to a function call."""
        for node in ast.walk(tree):
            if (isinstance(node, ast.Call) and 
                isinstance(node.func, ast.Name) and 
                node.func.id == name_node.id):
                return True
        return False
    
    def _has_conditional_logic(self, tree: ast.AST) -> bool:
        """Check if expression contains conditional logic."""
        for node in ast.walk(tree):
            if isinstance(node, (ast.IfExp, ast.BoolOp, ast.Compare)):
                return True
        return False
    
    def _calculate_complexity(self, tree: ast.AST) -> int:
        """Calculate a simple complexity score for the expression."""
        complexity = 0
        
        for node in ast.walk(tree):
            if isinstance(node, (ast.BinOp, ast.UnaryOp)):
                complexity += 1
            elif isinstance(node, ast.Compare):
                complexity += 1
            elif isinstance(node, ast.Call):
                complexity += 2  # Function calls are more complex
            elif isinstance(node, ast.IfExp):
                complexity += 3  # Conditionals are most complex
        
        return complexity
    
    def _count_nodes(self, tree: ast.AST) -> int:
        """Count the total number of nodes in the AST."""
        return len(list(ast.walk(tree)))
    
    def _convert_to_decimal(self, value: Any) -> Decimal:
        """Convert a value to Decimal for high-precision calculations."""
        if isinstance(value, Decimal):
            return value
        elif isinstance(value, (int, float)):
            return Decimal(str(value))  # Convert to string first for precision
        elif isinstance(value, str):
            try:
                return Decimal(value)
            except Exception:
                raise ExpressionEvaluationError(f"Cannot convert string '{value}' to number")
        elif isinstance(value, bool):
            return Decimal('1' if value else '0')
        elif value is None:
            raise ExpressionEvaluationError("Cannot convert None to number")
        else:
            raise ExpressionEvaluationError(f"Cannot convert {type(value).__name__} to Decimal")
    
    def _evaluate_ast_node(self, node: ast.AST, variables: Dict[str, Any]) -> Any:
        """
        Recursively evaluate an AST node with provided variables.
        
        Args:
            node: The AST node to evaluate
            variables: Dictionary of variable values
            
        Returns:
            The evaluated result (Decimal for numbers, bool for comparisons, etc.)
        """
        try:
            # Handle different node types
            if isinstance(node, ast.Constant):
                # Python 3.8+ literal values
                return self._convert_to_decimal(node.value) if isinstance(node.value, (int, float)) else node.value
                
            elif isinstance(node, (ast.Num, ast.Str, ast.NameConstant)):
                # Legacy literal values (Python < 3.8)
                if isinstance(node, ast.Num):
                    return self._convert_to_decimal(node.n)
                elif isinstance(node, ast.Str):
                    return node.s
                elif isinstance(node, ast.NameConstant):
                    return node.value
            
            elif isinstance(node, ast.Name):
                # Variable reference
                var_name = node.id
                if var_name not in variables:
                    raise ExpressionEvaluationError(f"Variable '{var_name}' is not defined")
                return variables[var_name]
            
            elif isinstance(node, ast.BinOp):
                # Binary operations (+, -, *, /, etc.)
                left = self._evaluate_ast_node(node.left, variables)
                right = self._evaluate_ast_node(node.right, variables)
                return self._evaluate_binary_op(node.op, left, right)
            
            elif isinstance(node, ast.UnaryOp):
                # Unary operations (+x, -x, not x)
                operand = self._evaluate_ast_node(node.operand, variables)
                return self._evaluate_unary_op(node.op, operand)
            
            elif isinstance(node, ast.Compare):
                # Comparisons (==, !=, <, >, etc.)
                return self._evaluate_comparison(node, variables)
            
            elif isinstance(node, ast.BoolOp):
                # Boolean operations (and, or)
                return self._evaluate_bool_op(node, variables)
            
            elif isinstance(node, ast.IfExp):
                # Conditional expression (x if condition else y)
                test_result = self._evaluate_ast_node(node.test, variables)
                if test_result:
                    return self._evaluate_ast_node(node.body, variables)
                else:
                    return self._evaluate_ast_node(node.orelse, variables)
            
            elif isinstance(node, ast.Call):
                # Function calls
                return self._evaluate_function_call(node, variables)
            
            elif isinstance(node, (ast.List, ast.Tuple)):
                # List or tuple literals [a, b, c] or (a, b, c)
                return [self._evaluate_ast_node(elt, variables) for elt in node.elts]
            
            else:
                raise ExpressionEvaluationError(f"Unsupported node type: {type(node).__name__}")
                
        except ExpressionEvaluationError:
            # Re-raise evaluation errors
            raise
        except Exception as e:
            raise ExpressionEvaluationError(f"Error evaluating {type(node).__name__}: {e}")
    
    def _evaluate_binary_op(self, op: ast.operator, left: Any, right: Any) -> Decimal:
        """Evaluate binary operations with Decimal precision."""
        # Convert operands to Decimal for arithmetic
        left_decimal = self._convert_to_decimal(left)
        right_decimal = self._convert_to_decimal(right)
        
        try:
            if isinstance(op, ast.Add):
                return left_decimal + right_decimal
            elif isinstance(op, ast.Sub):
                return left_decimal - right_decimal
            elif isinstance(op, ast.Mult):
                return left_decimal * right_decimal
            elif isinstance(op, ast.Div):
                if right_decimal == 0:
                    raise ExpressionEvaluationError("Division by zero")
                return left_decimal / right_decimal
            elif isinstance(op, ast.FloorDiv):
                if right_decimal == 0:
                    raise ExpressionEvaluationError("Division by zero")
                return left_decimal // right_decimal
            elif isinstance(op, ast.Mod):
                if right_decimal == 0:
                    raise ExpressionEvaluationError("Modulo by zero")
                return left_decimal % right_decimal
            elif isinstance(op, ast.Pow):
                return left_decimal ** right_decimal
            else:
                raise ExpressionEvaluationError(f"Unsupported binary operation: {type(op).__name__}")
                
        except Exception as e:
            if isinstance(e, ExpressionEvaluationError):
                raise
            raise ExpressionEvaluationError(f"Binary operation failed: {e}")
    
    def _evaluate_unary_op(self, op: ast.unaryop, operand: Any) -> Any:
        """Evaluate unary operations."""
        try:
            if isinstance(op, ast.UAdd):
                # Unary plus (+x)
                return self._convert_to_decimal(operand)
            elif isinstance(op, ast.USub):
                # Unary minus (-x)
                return -self._convert_to_decimal(operand)
            elif isinstance(op, ast.Not):
                # Logical not (not x)
                return not bool(operand)
            elif isinstance(op, ast.Invert):
                # Bitwise invert (~x) - not commonly used in financial calculations
                operand_decimal = self._convert_to_decimal(operand)
                return Decimal(~int(operand_decimal))
            else:
                raise ExpressionEvaluationError(f"Unsupported unary operation: {type(op).__name__}")
                
        except Exception as e:
            if isinstance(e, ExpressionEvaluationError):
                raise
            raise ExpressionEvaluationError(f"Unary operation failed: {e}")
    
    def _evaluate_comparison(self, node: ast.Compare, variables: Dict[str, Any]) -> bool:
        """Evaluate comparison operations."""
        try:
            # Evaluate the left operand
            left = self._evaluate_ast_node(node.left, variables)
            
            # Handle multiple comparisons (a < b < c)
            result = True
            current = left
            
            for op, comparator in zip(node.ops, node.comparators):
                right = self._evaluate_ast_node(comparator, variables)
                
                # Convert to comparable types
                if isinstance(op, (ast.Lt, ast.LtE, ast.Gt, ast.GtE)):
                    # Numeric comparisons - convert to Decimal
                    current_decimal = self._convert_to_decimal(current)
                    right_decimal = self._convert_to_decimal(right)
                    
                    if isinstance(op, ast.Lt):
                        comparison_result = current_decimal < right_decimal
                    elif isinstance(op, ast.LtE):
                        comparison_result = current_decimal <= right_decimal
                    elif isinstance(op, ast.Gt):
                        comparison_result = current_decimal > right_decimal
                    elif isinstance(op, ast.GtE):
                        comparison_result = current_decimal >= right_decimal
                        
                elif isinstance(op, ast.Eq):
                    comparison_result = current == right
                elif isinstance(op, ast.NotEq):
                    comparison_result = current != right
                elif isinstance(op, ast.Is):
                    comparison_result = current is right
                elif isinstance(op, ast.IsNot):
                    comparison_result = current is not right
                elif isinstance(op, ast.In):
                    comparison_result = current in right
                elif isinstance(op, ast.NotIn):
                    comparison_result = current not in right
                else:
                    raise ExpressionEvaluationError(f"Unsupported comparison: {type(op).__name__}")
                
                result = result and comparison_result
                if not result:
                    break  # Short-circuit evaluation
                    
                current = right  # For chained comparisons
                
            return result
            
        except Exception as e:
            if isinstance(e, ExpressionEvaluationError):
                raise
            raise ExpressionEvaluationError(f"Comparison failed: {e}")
    
    def _evaluate_bool_op(self, node: ast.BoolOp, variables: Dict[str, Any]) -> bool:
        """Evaluate boolean operations (and, or)."""
        try:
            if isinstance(node.op, ast.And):
                # Short-circuit AND evaluation
                for value_node in node.values:
                    result = self._evaluate_ast_node(value_node, variables)
                    if not result:
                        return False
                return True
                
            elif isinstance(node.op, ast.Or):
                # Short-circuit OR evaluation
                for value_node in node.values:
                    result = self._evaluate_ast_node(value_node, variables)
                    if result:
                        return True
                return False
                
            else:
                raise ExpressionEvaluationError(f"Unsupported boolean operation: {type(node.op).__name__}")
                
        except Exception as e:
            if isinstance(e, ExpressionEvaluationError):
                raise
            raise ExpressionEvaluationError(f"Boolean operation failed: {e}")
    
    def _evaluate_function_call(self, node: ast.Call, variables: Dict[str, Any]) -> Any:
        """Evaluate function calls using whitelisted functions."""
        try:
            if not isinstance(node.func, ast.Name):
                raise ExpressionEvaluationError("Only simple function calls are supported")
                
            func_name = node.func.id
            if func_name not in self.ALLOWED_FUNCTIONS:
                raise ExpressionEvaluationError(f"Function '{func_name}' is not allowed")
                
            # Evaluate function arguments
            args = [self._evaluate_ast_node(arg, variables) for arg in node.args]
            
            # Get the actual function
            func = self.ALLOWED_FUNCTIONS[func_name]
            
            # Handle special functions that need Decimal precision
            if func_name in ['abs', 'round']:
                # Convert arguments to Decimal and call function
                decimal_args = [self._convert_to_decimal(arg) for arg in args]
                result = func(*decimal_args)
                return self._convert_to_decimal(result)
                
            elif func_name in ['max', 'min']:
                # Convert arguments to Decimal for numeric comparison
                if all(isinstance(arg, (int, float, Decimal, str)) or 
                       (isinstance(arg, str) and arg.replace('.', '').replace('-', '').isdigit()) 
                       for arg in args):
                    decimal_args = [self._convert_to_decimal(arg) for arg in args]
                    result = func(*decimal_args)
                    return self._convert_to_decimal(result)
                else:
                    # Non-numeric max/min
                    return func(*args)
                    
            elif func_name == 'sum':
                # Convert list elements to Decimal
                if len(args) != 1:
                    raise ExpressionEvaluationError("sum() takes exactly one argument (iterable)")
                iterable = args[0]
                if not hasattr(iterable, '__iter__'):
                    raise ExpressionEvaluationError("sum() argument must be iterable")
                decimal_values = [self._convert_to_decimal(item) for item in iterable]
                return sum(decimal_values, Decimal('0'))
                
            elif func_name in ['int', 'float', 'str', 'bool']:
                # Type conversion functions
                if len(args) != 1:
                    raise ExpressionEvaluationError(f"{func_name}() takes exactly one argument")
                if func_name in ['int', 'float']:
                    # For numeric types, ensure we return Decimal for consistency
                    result = func(args[0])
                    return self._convert_to_decimal(result)
                else:
                    return func(args[0])
                    
            elif func_name == 'Decimal':
                # Decimal constructor
                if len(args) != 1:
                    raise ExpressionEvaluationError("Decimal() takes exactly one argument")
                return self._convert_to_decimal(args[0])
                
            elif func_name == 'pow':
                # Power function
                if len(args) != 2:
                    raise ExpressionEvaluationError("pow() takes exactly two arguments")
                base = self._convert_to_decimal(args[0])
                exponent = self._convert_to_decimal(args[1])
                return base ** exponent
                
            elif func_name == 'len':
                # Length function
                if len(args) != 1:
                    raise ExpressionEvaluationError("len() takes exactly one argument")
                return Decimal(str(len(args[0])))
                
            else:
                # Generic function call
                return func(*args)
                
        except Exception as e:
            if isinstance(e, ExpressionEvaluationError):
                raise
            raise ExpressionEvaluationError(f"Function '{func_name}' evaluation failed: {e}")


# Convenience functions
def validate_expression(expression: str, available_variables: Set[str] = None) -> Dict[str, Any]:
    """Convenience function to validate an expression."""
    parser = SafeDSLParser()
    return parser.validate_expression(expression, available_variables)

def get_expression_info(expression: str) -> Dict[str, Any]:
    """Convenience function to get expression information."""
    parser = SafeDSLParser()
    return parser.get_expression_info(expression)

def is_expression_safe(expression: str) -> bool:
    """Check if an expression is safe to parse and evaluate."""
    result = validate_expression(expression, set())
    return result.get('valid', False)

def evaluate_expression(expression: str, variables: Dict[str, Any]) -> Decimal:
    """Convenience function to evaluate an expression."""
    parser = SafeDSLParser()
    return parser.evaluate(expression, variables)