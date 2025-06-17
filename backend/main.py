from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from scipy.integrate import quad
from utils import parse_expression

# Initialize the FastAPI application
app = FastAPI(
    title="Integration API",
    description="An API to calculate the definite integral of a mathematical function.",
    version="1.0.0"
)

# --- CORS Middleware ---
# This middleware is still good practice for general CORS handling.
allowed_origins = [
    # The public URL for your Angular app in the cloud IDE
    "https://cautious-space-enigma-v9r47wpvg6whpprj-4200.app.github.dev",
    # Kept for local development and testing if needed
    "http://localhost:4200",
    "http://127.0.0.1:4200"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class IntegrationRequest(BaseModel):
    expression: str
    lower_limit: float
    upper_limit: float

class IntegrationResponse(BaseModel):
    area: float | None = None
    error: str | None = None

# --- API Endpoints ---
@app.post("/integrate", response_model=IntegrationResponse)
def integrate(req: IntegrationRequest):
    """
    Calculates the definite integral of a given function f(x) from a to b.
    """
    if req.lower_limit >= req.upper_limit:
        return IntegrationResponse(error="The lower limit must be less than the upper limit.")
    
    try:
        # Safely parse the user's expression into a callable function
        func_to_integrate = parse_expression(req.expression)
        
        # Perform the numerical integration using SciPy's quad function
        area, _ = quad(func_to_integrate, req.lower_limit, req.upper_limit)
        
        # Check for non-finite results
        if not abs(area) < float('inf'):
            return IntegrationResponse(error="The integral resulted in an infinite value.")

        return IntegrationResponse(area=area)

    except ValueError as e:
        # Catches parsing errors from utils.py
        return IntegrationResponse(error=str(e))
    except Exception as e:
        # A general catch-all for any other unexpected errors
        return IntegrationResponse(error=f"An unexpected error occurred during calculation: {e}")

# ** THE FIX: Manually handle OPTIONS preflight requests **
# This route intercepts the browser's security check and explicitly sends back
# the necessary CORS headers, which resolves the issue if the middleware fails to do so.
@app.options("/integrate")
def options_integrate():
    return Response(status_code=200, headers={
        "Access-Control-Allow-Origin": "https://cautious-space-enigma-v9r47wpvg6whpprj-4200.app.github.dev",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    })
