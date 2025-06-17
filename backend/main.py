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

# --- CORS Middleware (The FastAPI Way) ---
# This is the correct implementation for your project. It tells the browser
# that it is safe for your frontend URL to access this backend.
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
    allow_methods=["*"], # Allows all methods, including POST and the preflight OPTIONS
    allow_headers=["*"], # Allows all headers
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
