# How This Was Built: Wildfire Spread Forecaster

This document serves as a historical record of the development process for the Wildfire Spread Forecaster project. It documents the decisions made, features implemented, and any pivots or alternative approaches taken along the way.

## Phase 1: Foundation & Data Pipelines
**Goal:** Set up the initial project structure and build the data fetchers necessary for the spread model.

*   **Setup:** Initialized a Python FastAPI backend and a Next.js frontend structure.
*   **Data Ingestion:**
    *   **Active Fires:** Integrated the NASA FIRMS (MODIS/VIIRS) API to fetch active fire data for the Southern California bounded region.
    *   **Weather:** Integrated the NOAA HRRR API (via National Weather Service API) to fetch hourly wind speed and direction forecasts based on coordinates.
    *   **Terrain:** Implemented a fetcher using the USGS 3DEP Point Query Service to get elevation data in meters.
    *   *Note on Fuel:* While LANDFIRE was planned, it was deferred to keep the initial iteration simple.
*   **Decision Log:** We decided to focus exclusively on Southern California to optimize data processing and fit within AWS Free Tier constraints.

## Phase 2: Modeling & Core Logic
**Goal:** Develop the Cellular Automata (CA) spread prediction algorithm and expose it via a REST API.

*   **Algorithm Design:** Implemented a grid-based Cellular Automata model (`models/cellular_automata.py`) with a set cell size of 100m. The model uses rules inspired by the Rothermel fire spread equation, calculating spread probability based on base spread, a wind factor (angle and speed), and a slope factor (elevation change).
*   **Pivot - Terrain Fetching Performance & Async Architecture:** 
    *   *Initial Plan:* We considered downloading or querying elevation for a massive grid around the fire origin upfront.
    *   *The Problem:* Using the USGS Point Query Service for thousands of individual cells sequentially via HTTP requests would take minutes, which is too slow for a snappy Next.js API response.
    *   *Solution / Pivot:* For the MVP, we implemented an **on-demand async fetching approach with in-memory caching**. The data fetchers (`firms.py`, `hrrr.py`, `terrain.py`) and the `app.py` FastAPI backend were refactored to fully utilize Python's `asyncio` and the `httpx` async HTTP client. As the fire expands, the Cellular Automata model (`cellular_automata.py`) pre-fetches all required neighbor cell elevations *concurrently* per simulation hour using `asyncio.gather`. The cache prevents querying the same coordinate twice. This drastically reduced the prediction latency without needing complex raster caching upfront. If this proves too slow at scale, we documented the potential to transition to a bounding-box raster download system (e.g., GeoTIFF) in the future.
*   **Pivot - Fuel Data:** Because LANDFIRE was deferred in Phase 1, we implemented the MVP assuming a uniform fuel model across all of Southern California.
*   **API Endpoint:** Created a `POST /predict` endpoint in FastAPI that accepts `lat`, `lon`, and `hours`. It returns a successful JSON payload with the `predicted_footprint` array of newly burning coordinates.
*   **Testing:** We successfully validated the algorithm with local `pytest` scripts (via in-venv `pytest-asyncio`) and interactive `curl` testing, showing the simulated fire correctly moving downwind to the East over a 2-hour period based on default parameters.

---
*End of Phase 2.*

## Project Context from Original Spec

**Project Overview:**
The Wildfire Spread Forecaster predicts where an active wildfire will spread in the next 6-24 hours based on near real-time satellite data, weather forecasts, and terrain/vegetation conditions.
*Geographic Scope:* The application focuses exclusively on Southern California to optimize data processing and infrastructure constraints (AWS Free Tier).

**Architecture & Tech Stack:**
*   **Backend / Data Processing Pipeline:** Python (FastAPI). Integrates NASA FIRMS, NOAA HRRR, USGS 3DEP, and LANDFIRE.
*   **The Modeling Engine:** Empirically-Driven Cellular Automata based on the Rothermel spread equation.
*   **Frontend / User Interface:** Next.js / React with Mapbox GL JS for 3D terrain rendering.
*   **Host / Deployment:** AWS Free Tier (AWS Lambda Serverless + API Gateway + S3 for Raster Data).

## Future Phases Planned

**Phase 3: Frontend & Visualization**
*   Scaffold the Next.js web application.
*   Integrate Mapbox GL JS to plot active fires.
*   Build interactive UI to trigger and display the spread prediction.

**Phase 4: Cloud Infrastructure & Deployment**
*   Deploy Backend to AWS Lambda.
*   Deploy Next.js frontend to AWS (e.g., AWS Amplify or S3/CloudFront).
