import sympy as sp
import numpy as np
from typing import Callable

def parse_expression(expr: str) -> Callable[[float], float]:
    """
    Parses a string expression like 'sin(x)' or 'x**2' into a callable function.
    """
    x = sp.Symbol('x')
    try:
        parsed_expr = sp.sympify(expr, evaluate=True)
        func = sp.lambdify(x, parsed_expr, modules=['numpy'])
        return func
    except Exception as e:
        raise ValueError(f"Invalid expression: {e}")
