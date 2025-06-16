from fastapi.testclient import TestClient
from .main import app

# Initialize the test client
client = TestClient(app)

def test_successful_integration():
    """Tests a standard, valid integration request."""
    response = client.post("/integrate", json={
        "expression": "x**2",
        "lower_limit": 0,
        "upper_limit": 3
    })
    assert response.status_code == 200
    data = response.json()
    assert data["error"] is None
    assert "area" in data
    assert abs(data["area"] - 9.0) < 1e-6 # The integral of x^2 from 0 to 3 is 9

def test_invalid_expression():
    """Tests the API's response to a malformed mathematical expression."""
    response = client.post("/integrate", json={
        "expression": "x**2 +++ sin(x", # Invalid syntax
        "lower_limit": 0,
        "upper_limit": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert data["area"] is None
    assert "error" in data
    assert "Invalid or unsupported expression" in data["error"]

def test_unsupported_function():
    """Tests that the API rejects expressions with unsafe or unknown functions."""
    response = client.post("/integrate", json={
        "expression": "import_os(x)", # Malicious-like input
        "lower_limit": 0,
        "upper_limit": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert data["area"] is None
    assert "error" in data
    assert "Invalid or unsupported expression" in data["error"]

def test_limits_are_inverted():
    """Tests the case where the lower limit is greater than the upper limit."""
    response = client.post("/integrate", json={
        "expression": "x",
        "lower_limit": 5,
        "upper_limit": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert data["area"] is None
    assert data["error"] == "The lower limit must be less than the upper limit."
