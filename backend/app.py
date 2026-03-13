import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from models.cellular_automata import predict_spread
from fetchers.firms import fetch_active_fires

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wildfire Spread Forecaster API")

class PredictRequest(BaseModel):
    lat: float = Field(..., description="Latitude of the fire origin", json_schema_extra={"example": 34.2238})
    lon: float = Field(..., description="Longitude of the fire origin", json_schema_extra={"example": -118.0601})
    hours: int = Field(6, description="Hours to simulate", ge=1, le=8)


@app.get("/")
async def read_root():
    return {"message": "Welcome to the Wildfire Spread Forecaster API"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

@app.get("/fires")
async def get_active_fires():
    try:
        csv_data = await fetch_active_fires(source="VIIRS_SNPP_NRT", days=1)
        if not csv_data:
            raise HTTPException(status_code=500, detail="Failed to fetch active fires from FIRMS")
        
        # Simple CSV parsing to return a list of lat/lon objects for the frontend
        # Assuming the CSV format is standard FIRMS output: latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight
        lines = csv_data.strip().split('\n')
        if len(lines) <= 1:
            fires = []
        else:
            header = lines[0].split(',')
            try:
                lat_idx = header.index("latitude")
                lon_idx = header.index("longitude")
                frp_idx = header.index("frp") # Fire Radiative Power (intensity roughly)
            except ValueError:
                # Fallback if headers change
                lat_idx, lon_idx, frp_idx = 0, 1, 12
                
            fires = []
            for line in lines[1:]:
                parts = line.split(',')
                if len(parts) > max(lat_idx, lon_idx, frp_idx):
                    fires.append({
                        "lat": float(parts[lat_idx]),
                        "lon": float(parts[lon_idx]),
                        "frp": float(parts[frp_idx])
                    })
                    
        # --- MOCK DATA INJECTION FOR LOCAL VALIDATION ---
        # If FIRMS returns no active fires, we inject a mock cluster in the Angeles National Forest
        # so the Cellular Automata spread prediction can be locally tested.
        # This is strictly gated behind an environment variable to prevent polluting production.
        use_mock = os.getenv("USE_MOCK_FIRES", "false").lower() == "true"
        if len(fires) == 0 and use_mock:
            logger.info("FIRMS returned 0 active fires. Injecting Mock Fire Cluster as USE_MOCK_FIRES is true.")
            fires = [
                {"lat": 34.2238, "lon": -118.0601, "frp": 150.0},
                {"lat": 34.2250, "lon": -118.0610, "frp": 120.0},
                {"lat": 34.2220, "lon": -118.0580, "frp": 90.0}
            ]
        # ------------------------------------------------

        return {"status": "success", "count": len(fires), "fires": fires}
    except Exception as e:
        logger.error(f"Error in get_active_fires: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
async def predict_fire_spread(request: PredictRequest):
    try:
        # returns list of {"lat": ..., "lon": ...}
        simulated_cells = await predict_spread(request.lat, request.lon, request.hours)
        
        # Convert to GeoJSON FeatureCollection of points (or simple list for MVP)
        return {
            "status": "success",
            "hours_simulated": request.hours,
            "origin": {"lat": request.lat, "lon": request.lon},
            "predicted_footprint": simulated_cells
        }
    except Exception as e:
        logger.error(f"Error in predict_fire_spread: {e}")
        raise HTTPException(status_code=500, detail=str(e))

