from fastapi import FastAPI, HTTPException
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
# This is the updated, more secure configuration.
# We are now explicitly listing the frontend URLs that are allowed to make requests.
# This prevents other websites from calling your backend API.
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
    allow_methods=["POST"],  # Only allow the POST method that is being used
    allow_headers=["*"],
)

# --- Pydantic Models ---
# These models define the expected structure for API requests and responses.
# They provide automatic validation and clear documentation.

class IntegrationRequest(BaseModel):
    expression: str
    lower_limit: float
    upper_limit: float

class IntegrationResponse(BaseModel):
    area: float | None = None
    error: str | None = None

# --- API Endpoint ---
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
        # quad returns the result and an estimated error, we only need the result
        area, _ = quad(func_to_integrate, req.lower_limit, req.upper_limit)
        
        # Check for non-finite results which can occur with some integrals
        if not abs(area) < float('inf'):
            return IntegrationResponse(error="The integral resulted in an infinite value.")

        return IntegrationResponse(area=area)

    except ValueError as e:
        # Catches parsing errors from utils.py
        return IntegrationResponse(error=str(e))
    except Exception as e:
        # A general catch-all for any other unexpected errors during integration
        return IntegrationResponse(error=f"An unexpected error occurred during calculation: {e}")
