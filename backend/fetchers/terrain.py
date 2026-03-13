import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

async def fetch_elevation_data(lat, lon, client=None):
    """
    Fetch elevation data using USGS 3DEP Point Query Service.
    Accepts an optional httpx.AsyncClient to share connection pools when doing bulk requests.
    """
    url = "https://epqs.nationalmap.gov/v1/json"
    params = {
        "x": lon,
        "y": lat,
        "units": "Meters",
        "wkid": 4326,
        "includeDate": False
    }
    
    try:
        if client:
            response = await client.get(url, params=params)
        else:
            async with httpx.AsyncClient(timeout=10.0) as fallback_client:
                response = await fallback_client.get(url, params=params)
                
        response.raise_for_status()
        data = response.json()
        elevation = data.get('value')
        if elevation is not None:
            return float(elevation)
        return None
    except httpx.HTTPError as e:
        logger.error(f"HTTP error fetching elevation at ({lat}, {lon}): {e}")
        return None
    except Exception as e:
        logger.error(f"Error fetching elevation at ({lat}, {lon}): {e}")
        return None

if __name__ == "__main__":
    import asyncio
    async def main():
        logging.basicConfig(level=logging.INFO)
        lat, lon = 34.2238, -118.0601
        elevation = await fetch_elevation_data(lat, lon)
        print(f"Elevation at ({lat}, {lon}): {elevation} meters")
    asyncio.run(main())
