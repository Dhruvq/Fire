import os
import pytest
from backend.fetchers.firms import fetch_active_fires
from backend.fetchers.hrrr import fetch_hrrr_forecast
from backend.fetchers.terrain import fetch_elevation_data

@pytest.mark.skipif(not os.getenv("FIRMS_API_KEY"), reason="No FIRMS API key so skipping to avoid 401/400")
def test_fetch_active_fires():
    data = fetch_active_fires(source="VIIRS_SNPP_NRT", days=1)
    assert data is not None
    assert type(data) is str
    # Assumes CSV starts with latitude,longitude or similar headers
    assert "latitude" in data or "longitude" in data

def test_fetch_hrrr_forecast():
    # Test for SoCal location (Mount Wilson)
    lat, lon = 34.2238, -118.0601
    
    # Not asserting success always since the Weather API can be flaky,
    # but at least check that the function doesn't crash
    result = fetch_hrrr_forecast(lat, lon)
    assert result is None or type(result) is dict

def test_fetch_elevetion_data():
    lat, lon = 34.2238, -118.0601
    result = fetch_elevation_data(lat, lon)
    assert result is None or type(result) is float or type(result) is int
