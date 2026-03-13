import pytest
from backend.models.cellular_automata import predict_spread

@pytest.mark.asyncio
async def test_predict_spread():
    lat, lon = 34.2238, -118.0601
    # Test simple spread for 1 hour to see if logic holds and doesn't crash
    # Using 1 hour limits the number of HTTP requests needed for testing.
    result = await predict_spread(lat, lon, hours=1)
    
    assert result is not None
    assert type(result) is list
    assert len(result) >= 1  # Should contain at least the origin point or more if spread occurred
