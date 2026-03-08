import os
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Wildfire Spread Forecaster API")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Wildfire Spread Forecaster API"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
