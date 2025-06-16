import sympy as sp
from typing import Callable
import numpy as np

# A list of allowed functions and objects from numpy for safety
# This prevents the execution of arbitrary code.
ALLOWED_FUNCTIONS = {
    'sin': np.sin,
    'cos': np.cos,
    'tan': np.tan,
    'sqrt': np.sqrt,
    'exp': np.exp,
    'log': np.log,
    'abs': np.abs,
    'pi': np.pi,
    'e': np.e
}

def parse_expression(expr: str) -> Callable[[float], float]:
    """
    Safely parses a mathematical string expression into a callable Python function.

    This function uses SymPy to parse the expression, which provides a layer of
    safety against arbitrary code execution. It then converts the SymPy expression
    into a numerical function using NumPy for performance.

    Args:
        expr (str): The mathematical expression to parse, e.g., 'x**2 * sin(x)'.

    Returns:
        A callable function that takes a float (x) and returns a float.

    Raises:
        ValueError: If the expression is invalid or contains unsupported elements.
    """
    x = sp.Symbol('x')
    try:
        # Use SymPy's parse_expr for safer evaluation
        parsed_expr = sp.parse_expr(expr, local_dict={"x": x}, transformations='all')

        # Lambdify the expression to a NumPy-callable function
        # The 'modules' argument provides the context for functions like sin, cos, etc.
        func = sp.lambdify(x, parsed_expr, modules=[ALLOWED_FUNCTIONS])
        
        # Test the function to ensure it's valid
        func(0) 

        return func
    except (sp.SympifyError, SyntaxError, TypeError, NameError) as e:
        raise ValueError(f"Invalid or unsupported expression: {e}")

