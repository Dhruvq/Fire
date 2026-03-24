import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# NASA FIRMS API Base URL
# Read documentation at https://firms.modaps.eosdis.nasa.gov/api/
FIRMS_API_KEY = os.getenv("FIRMS_API_KEY")
if not FIRMS_API_KEY:
    raise ValueError("FIRMS_API_KEY environment variable not set.")
MAP_KEY = FIRMS_API_KEY

# Southern California bounding box
# [West, South, East, North]
# Approximation for SoCal: Longitude -121 to -114, Latitude 32 to 35.5
SOCAL_BBOX = "-121,32,-114,35.5"

async def fetch_active_fires(source="VIIRS_SNPP_NRT", days=1):
    """
    Fetch active fires from NASA FIRMS API for the Southern California region.
    source: e.g., 'VIIRS_SNPP_NRT', 'MODIS_NRT'
    days: number of past days (1-10)
    """
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{source}/{SOCAL_BBOX}/{days}"
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
            return response.text
        except httpx.HTTPError as e:
            logger.error(f"Error fetching FIRMS data: {e}")
            return None

if __name__ == "__main__":
    import asyncio
    async def main():
        logging.basicConfig(level=logging.INFO)
        fires_csv = await fetch_active_fires()
        if fires_csv:
            print("Fetched FIRMS data length:", len(fires_csv))
            print(fires_csv[:500])  # Print preview
    asyncio.run(main())
