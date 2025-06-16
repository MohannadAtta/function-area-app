from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_basic_integration():
    response = client.post("/integrate", json={
        "expression": "x",
        "lower_limit": 0,
        "upper_limit": 1
    })
    data = response.json()
    assert response.status_code == 200
    assert data["success"] is True
    assert abs(data["area"] - 0.5) < 1e-6

def test_invalid_expression():
    response = client.post("/integrate", json={
        "expression": "x + +",
        "lower_limit": 0,
        "upper_limit": 1
    })
    data = response.json()
    assert response.status_code == 200
    assert data["success"] is False
    assert data["error"] is not None
