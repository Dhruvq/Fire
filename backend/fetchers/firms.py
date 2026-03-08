import os
import requests
from dotenv import load_dotenv

load_dotenv()

# NASA FIRMS API Base URL
# Read documentation at https://firms.modaps.eosdis.nasa.gov/api/
FIRMS_API_KEY = os.getenv("FIRMS_API_KEY", "")
MAP_KEY = FIRMS_API_KEY if FIRMS_API_KEY else "DEMO_KEY"

# Southern California bounding box
# [West, South, East, North]
# Approximation for SoCal: Longitude -121 to -114, Latitude 32 to 35.5
SOCAL_BBOX = "-121,32,-114,35.5"

def fetch_active_fires(source="VIIRS_SNPP_NRT", days=1):
    """
    Fetch active fires from NASA FIRMS API for the Southern California region.
    source: e.g., 'VIIRS_SNPP_NRT', 'MODIS_NRT'
    days: number of past days (1-10)
    """
    # URL Format: https://firms.modaps.eosdis.nasa.gov/api/area/csv/[MAP_KEY]/[SOURCE]/[AREA]/[DAY_RANGE]
    url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/{source}/{SOCAL_BBOX}/{days}"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        return response.text
    else:
        response.raise_for_status()

if __name__ == "__main__":
    fires_csv = fetch_active_fires()
    print("Fetched FIRMS data length:", len(fires_csv))
    print(fires_csv[:500])  # Print preview
