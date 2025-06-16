from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from typing import Callable
from utils import parse_expression
from scipy.integrate import quad

app = FastAPI()

# Allow all origins for development. This is the key change.
# The ["*"] wildcard allows your frontend, regardless of its URL
# in the cloud IDE, to communicate with the backend.
origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class IntegrationRequest(BaseModel):
    expression: str
    lower_limit: float
    upper_limit: float

class IntegrationResponse(BaseModel):
    area: float
    success: bool
    error: str | None = None

@app.post("/integrate", response_model=IntegrationResponse)
def integrate(req: IntegrationRequest):
    try:
        func = parse_expression(req.expression)
        area, _ = quad(func, req.lower_limit, req.upper_limit)
        return IntegrationResponse(area=area, success=True)
    except Exception as e:
        return IntegrationResponse(area=0.0, success=False, error=str(e))
