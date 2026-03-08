import os
import requests
import datetime
from dotenv import load_dotenv

load_dotenv()

def fetch_hrrr_forecast(lat, lon):
    """
    Fetch NOAA HRRR weather forecast for a specific location.
    Using National Weather Service API (api.weather.gov) as it provides access to HRRR models.
    """
    # 1. Get grid coordinates for the given lat/lon
    points_url = f"https://api.weather.gov/points/{lat},{lon}"
    headers = {
        "User-Agent": "WildfireSpreadForecaster/1.0 (contact: info@example.com)",
        "Accept": "application/geo+json"
    }
    
    response = requests.get(points_url, headers=headers)
    
    if response.status_code != 200:
        print(f"Failed to get grid points: {response.text}")
        return None
        
    data = response.json()
    forecast_url = data['properties']['forecastHourly']
    
    # 2. Get hourly forecast
    forecast_response = requests.get(forecast_url, headers=headers)
    if forecast_response.status_code == 200:
        return forecast_response.json()
    else:
        print(f"Failed to fetch forecast: {forecast_response.text}")
        return None

if __name__ == "__main__":
    # Test for a location in SoCal (e.g., Mount Wilson)
    lat, lon = 34.2238, -118.0601
    forecast = fetch_hrrr_forecast(lat, lon)
    if forecast:
        periods = forecast.get('properties', {}).get('periods', [])
        print(f"Found {len(periods)} hourly forecast periods.")
        if periods:
            print("Next hour forecast:", periods[0])
