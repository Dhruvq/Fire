import os
import logging
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from models.cellular_automata import predict_spread

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Wildfire Spread Forecaster API")

class PredictRequest(BaseModel):
    lat: float = Field(..., description="Latitude of the fire origin", json_schema_extra={"example": 34.2238})
    lon: float = Field(..., description="Longitude of the fire origin", json_schema_extra={"example": -118.0601})
    hours: int = Field(6, description="Hours to simulate", ge=1, le=48)


@app.get("/")
async def read_root():
    return {"message": "Welcome to the Wildfire Spread Forecaster API"}

@app.get("/health")
async def health_check():
    return {"status": "ok"}

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

