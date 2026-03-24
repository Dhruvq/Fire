import math
import asyncio
import httpx
import logging
import os
from dotenv import load_dotenv

from fetchers.hrrr import fetch_hrrr_forecast
from fetchers.terrain import fetch_elevation_data

load_dotenv()

logger = logging.getLogger(__name__)

# Constants
CELL_SIZE_M = float(os.getenv("FIRE_CELL_SIZE_M", "100.0"))  # meters
BASE_SPREAD_AMOUNT = float(os.getenv("FIRE_BASE_SPREAD_AMOUNT", "30.0"))
SLOPE_FACTOR_MULTIPLIER = float(os.getenv("FIRE_SLOPE_FACTOR_MULTIPLIER", "5.0"))
DEG_LAT_PER_M = 1.0 / 111000.0

def _get_deg_lon_per_m(lat):
    """Approximate longitude degrees per meter at a given latitude."""
    # Prevent division by zero at poles, though we only care about SoCal ~34 deg
    cos_lat = math.cos(math.radians(lat))
    if cos_lat == 0:
        return DEG_LAT_PER_M
    return 1.0 / (111000.0 * cos_lat)

def get_wind_factor(wind_speed_mph, wind_direction_deg, spread_direction_deg):
    """
    Calculate how much wind enhances spread in a given direction.
    wind_direction_deg is the direction the wind is COMING FROM.
    """
    wind_heading = (wind_direction_deg + 180) % 360
    
    angle_diff = abs(wind_heading - spread_direction_deg)
    if angle_diff > 180:
        angle_diff = 360 - angle_diff
        
    cos_factor = math.cos(math.radians(angle_diff))
    # Base multiplier + wind_speed effect
    factor = 1.0 + (wind_speed_mph * 0.1 * cos_factor)
    return max(0.1, factor)

def get_slope_factor(elev_from, elev_to, distance_m):
    if elev_from is None or elev_to is None:
        return 1.0
    slope = (elev_to - elev_from) / distance_m
    # Fire spreads faster uphill.
    factor = 1.0 + (slope * SLOPE_FACTOR_MULTIPLIER)
    return max(0.1, factor)

class ElevationCache:
    def __init__(self, client):
        self.cache = {}
        self.client = client
        self.locks = {}
        self._semaphore = asyncio.Semaphore(20)  # Max 20 concurrent USGS requests

    async def get(self, lat, lon):
        key = (round(lat, 4), round(lon, 4))
        if key in self.cache:
            return self.cache[key]

        if key not in self.locks:
            self.locks[key] = asyncio.Lock()

        async with self.locks[key]:
            if key in self.cache:
                return self.cache[key]

            async with self._semaphore:
                elev = await fetch_elevation_data(lat, lon, self.client)
            self.cache[key] = elev
            return elev

    async def prefetch_grid(self, center_lat, center_lon, radius, deg_lat, deg_lon):
        """Pre-fetch a square grid of elevations around the fire origin."""
        tasks = []
        for di in range(-radius, radius + 1):
            for dj in range(-radius, radius + 1):
                tasks.append(self.get(
                    center_lat + di * deg_lat,
                    center_lon + dj * deg_lon
                ))
        await asyncio.gather(*tasks)

async def predict_spread(start_lat, start_lon, hours=6):
    """
    Simulate fire spread over N hours using a Cellular Automata approach.
    Returns a GeoJSON-like list of coordinate dictionaries.
    """
    # Use a custom connection pool limit so we don't overwhelm the USGS API
    limits = httpx.Limits(max_keepalive_connections=20, max_connections=50)
    async with httpx.AsyncClient(timeout=3.0, limits=limits) as client:
        elevation_cache = ElevationCache(client)
        forecast = await fetch_hrrr_forecast(start_lat, start_lon)
        
        wind_speed = 5.0
        wind_direction = 270 # West
        
        if forecast:
            periods = forecast.get('properties', {}).get('periods', [])
            if periods:
                current_weather = periods[0]
                ws_str = current_weather.get('windSpeed', '5 mph').split()[0]
                try: wind_speed = float(ws_str)
                except ValueError: pass
                
                wd_str = current_weather.get('windDirection', 'W')
                dir_map = {
                    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
                    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
                    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
                    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5
                }
                wind_direction = dir_map.get(wd_str, 270)
                
        deg_lat = CELL_SIZE_M * DEG_LAT_PER_M
        deg_lon = CELL_SIZE_M * _get_deg_lon_per_m(start_lat)

        burning_cells = set([(0, 0)])
        heat_grid = {(0, 0): 100.0} # 100 = burning
        
        # 8 neighbors: (d_lat, d_lon, direction_deg_from_north)
        neighbors = [
            (1, 0, 0), (1, 1, 45), (0, 1, 90), (-1, 1, 135),
            (-1, 0, 180), (-1, -1, 225), (0, -1, 270), (1, -1, 315)
        ]
        
        for hour in range(hours):
            current_burning = list(burning_cells)
            
            # 1. Gather all needed elevations for this hour simulation
            elevation_tasks = []
            for b_lat_idx, b_lon_idx in current_burning:
                cell_lat = start_lat + b_lat_idx * deg_lat
                cell_lon = start_lon + b_lon_idx * deg_lon
                elevation_tasks.append(elevation_cache.get(cell_lat, cell_lon))
                
                for d_lat, d_lon, _ in neighbors:
                    n_lat = start_lat + (b_lat_idx + d_lat) * deg_lat
                    n_lon = start_lon + (b_lon_idx + d_lon) * deg_lon
                    elevation_tasks.append(elevation_cache.get(n_lat, n_lon))
                    
            if elevation_tasks:
                # Use gather to run them concurrently (the cache logic prevents duplicate requests)
                await asyncio.gather(*elevation_tasks)
            
            # 2. Compute spread
            for b_lat_idx, b_lon_idx in current_burning:
                cell_lat = start_lat + b_lat_idx * deg_lat
                cell_lon = start_lon + b_lon_idx * deg_lon
                elev_from = await elevation_cache.get(cell_lat, cell_lon)
                
                for d_lat, d_lon, direction_deg in neighbors:
                    n_lat_idx = b_lat_idx + d_lat
                    n_lon_idx = b_lon_idx + d_lon
                    
                    if (n_lat_idx, n_lon_idx) in burning_cells:
                        continue
                        
                    n_lat = start_lat + n_lat_idx * deg_lat
                    n_lon = start_lon + n_lon_idx * deg_lon
                    
                    elev_to = await elevation_cache.get(n_lat, n_lon)
                    dist_m = CELL_SIZE_M if d_lat == 0 or d_lon == 0 else CELL_SIZE_M * 1.414
                    
                    w_factor = get_wind_factor(wind_speed, wind_direction, direction_deg)
                    s_factor = get_slope_factor(elev_from, elev_to, dist_m)
                    
                    # Base spread per hour = 30 heat points
                    spread_amount = BASE_SPREAD_AMOUNT * w_factor * s_factor
                    
                    current_heat = heat_grid.get((n_lat_idx, n_lon_idx), 0.0)
                    new_heat = current_heat + spread_amount
                    heat_grid[(n_lat_idx, n_lon_idx)] = new_heat
                    
                    if new_heat >= 100.0:
                        burning_cells.add((n_lat_idx, n_lon_idx))
                        
        result = []
        for b_lat_idx, b_lon_idx in burning_cells:
            result.append({
                "lat": start_lat + b_lat_idx * deg_lat,
                "lon": start_lon + b_lon_idx * deg_lon
            })
            
        return result