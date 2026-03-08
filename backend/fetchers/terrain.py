import os
import requests
from dotenv import load_dotenv

load_dotenv()

def fetch_elevation_data(lat, lon):
    """
    Fetch elevation data using USGS 3DEP Point Query Service.
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
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        elevation = data.get('value')
        if elevation is not None:
            return float(elevation)
        return None
    except Exception as e:
        print(f"Error fetching elevation: {e}")
        return None

if __name__ == "__main__":
    # Test for a location in SoCal (e.g., Mount Wilson)
    lat, lon = 34.2238, -118.0601
    elevation = fetch_elevation_data(lat, lon)
    print(f"Elevation at ({lat}, {lon}): {elevation} meters")
