from fastapi import FastAPI
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
# This is the final, correct, and secure configuration.
# It explicitly allows your frontend's public URL to make requests.
allowed_origins = [
    "https://cautious-space-enigma-v9r47wpvg6whpprj-4200.app.github.dev",
    "http://localhost:4200", # For local testing
    "http://127.0.0.1:4200"  # For local testing
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

# --- Pydantic Models for type safety and validation ---
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
    """Calculates the definite integral of a given function f(x) from a to b."""
    if req.lower_limit >= req.upper_limit:
        return IntegrationResponse(error="The lower limit must be less than the upper limit.")
    
    try:
        func_to_integrate = parse_expression(req.expression)
        area, _ = quad(func_to_integrate, req.lower_limit, req.upper_limit, limit=100)
        
        if not abs(area) < float('inf'):
            return IntegrationResponse(error="The integral resulted in an infinite value.")

        return IntegrationResponse(area=area)

    except ValueError as e:
        return IntegrationResponse(error=str(e))
    except Exception as e:
        return IntegrationResponse(error=f"An unexpected error occurred during calculation: {e}")
