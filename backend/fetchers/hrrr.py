import os
import httpx
import logging
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

async def fetch_hrrr_forecast(lat, lon):
    """
    Fetch NOAA HRRR weather forecast for a specific location.
    """
    points_url = f"https://api.weather.gov/points/{lat},{lon}"
    headers = {
        "User-Agent": "WildfireSpreadForecaster/1.0 (contact: info@example.com)",
        "Accept": "application/geo+json"
    }
    
    async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
        try:
            response = await client.get(points_url, headers=headers)
            response.raise_for_status()
            data = response.json()
            forecast_url = data['properties']['forecastHourly']
            
            # Get hourly forecast
            forecast_response = await client.get(forecast_url, headers=headers)
            forecast_response.raise_for_status()
            return forecast_response.json()
        except httpx.HTTPError as e:
            logger.error(f"Error fetching HRRR forecast: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error parsing HRRR forecast: {e}")
            return None


if __name__ == "__main__":
    import asyncio
    async def main():
        logging.basicConfig(level=logging.INFO)
        lat, lon = 34.2238, -118.0601
        forecast = await fetch_hrrr_forecast(lat, lon)
        if forecast:
            periods = forecast.get('properties', {}).get('periods', [])
            print(f"Found {len(periods)} hourly forecast periods.")
            if periods:
                print("Next hour forecast:", periods[0])
    asyncio.run(main())
