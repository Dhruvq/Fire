import pytest
from fastapi.testclient import TestClient
import sys
import os

# Add backend directory to sys.path so we can import app and models
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import app
from models.cellular_automata import predict_spread

client = TestClient(app)

@pytest.mark.asyncio
async def test_predict_spread_direct():
    # Test the core model directly
    # Mount Wilson coordinates
    lat = 34.2238
    lon = -118.0601
    hours = 3
    
    result = await predict_spread(lat, lon, hours)
    
    # We started with 1 cell, over 3 hours it should spread to >1 cells
    assert isinstance(result, list)
    assert len(result) > 1
    assert "lat" in result[0]
    assert "lon" in result[0]

def test_predict_api_endpoint():
    # Test the API wrapper
    payload = {
        "lat": 34.2238,
        "lon": -118.0601,
        "hours": 2
    }
    response = client.post("/predict", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["hours_simulated"] == 2
    assert "predicted_footprint" in data
    assert len(data["predicted_footprint"]) > 1

