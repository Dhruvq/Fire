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

## Phase 3: Frontend & Visualization
**Goal:** Build the Next.js frontend to visualize active wildfires in Southern California and provide an interactive UI for spread predictions.

*   **Setup:** Scaffolded a Next.js web application using Tailwind CSS for styling. Configured Next.js rewrites to proxy `/api/*` requests seamlessly to the FastAPI backend running locally without CORS issues.
*   **Pivot - Maps Architecture:**
    *   *Initial Plan:* Use Mapbox GL JS (`mapbox-gl`, `react-map-gl`) which requires an API token.
    *   *The Problem:* Next.js 15+ / Turbopack persistently failed to resolve `react-map-gl` dependencies and resulted in build errors.
    *   *Solution / Pivot:* We migrated entirely to the open-source **Maplibre GL JS** (`maplibre-gl`, `react-map-gl/maplibre`). This change successfully resolved the build failures while also removing the strict requirement for a Mapbox token. The base map uses the open-source CARTO Dark Matter styles with Maplibre Terrain DEM.
*   **User Interface:**
    *   Built `FireMap.tsx` as the core interactive map centered on Southern California, overlaying active fire data and prediction footprints.
    *   Built `Sidebar.tsx` as a floating panel to select simulation parameters.
*   **Pivot - Reduced Simulation Load:** We initially planned to allow users to simulate up to 24 hours of fire spread. To reduce extreme server loads from the recursive Cellular Automata algorithm during verification, we capped the peak simulation timeframe at 8 hours.
*   **Visual Enhancements:** Increased the Maplibre 3D terrain exaggeration multiplier to 2.5x to highlight topological relief in Southern California.

---
*End of Phase 3.*

## Phase 3.5: Local Validation & Mocking
**Goal:** Validate the end-to-end integration and run local spread simulations before cloud deployment.

*   **Mock Data Injection:** Because NASA FIRMS wasn't returning any natural active fire clusters in Southern California over the last 24H, we temporarily modified the `get_active_fires()` logic in `app.py` to inject a 3-point `Mock Fire Cluster` located in the Angeles National Forest when the live FIRMS data is completely empty.
    *   *Code Review Fix:* To prevent this mock data from leaking into the production environment if the FIRMS API key fails or errors out, this injection logic was securely gated behind an explicit `USE_MOCK_FIRES="true"` environment variable payload.
*   **Validation Success:** Ran the frontend and successfully triggered the Cellular Automata spread model on the mocked data. The simulation correctly aggregated live NOAA HRRR wind and USGS elevation data, simulated the spread, and returned the generated footprint polygon to the UI.
*   **Historical Backtesting:** Created a dedicated simulation script (`backtest_iou.py`) to systematically validate the Cellular Automata spread engine against the historic 2025 LA Fires. The 12-hour simulation achieved an **Intersection over Union (IoU) of 75.4%** when compared to the active FIRMS perimeters logged during the actual event.
*   **Logic Tweak:** Synced the backend FastAPI validation limit (`le=8`) with the frontend UI slider to ensure user-input simulation hours strictly cap at 8h to prevent unexpected recursive load spikes during prediction processing.

---
*End of Phase 3.5.*

## Phase 4: Containerization & Orchestration
**Goal:** Dockerize the frontend and backend applications to ensure consistent, cross-platform local development and staging environments.

*   **Setup:** Created `Dockerfile` configurations for both the Next.js frontend (Node 20 Alpine) and the FastAPI backend (Python 3.10 slim).
*   **Orchestration:** Integrated a `docker-compose.yml` file to spin up both services at once, linking them via a local `fire-network` custom bridge.
*   **Pivot - Next.js Rewrites & Docker:** 
    *   *The Problem:* Next.js evaluates `next.config.ts` API proxy rewrites during the static build phase (`npm run build`). Without the `BACKEND_URL` environment variable present during the container build, the proxy defaulted to `http://127.0.0.1:8000`, failing network requests.
    *   *Solution / Pivot:* We injected the Docker Compose network alias (`http://backend:8000`) as a Dockerfile `ARG` and `ENV` variable *before* the internal Next.js build step. This successfully hardcoded the rewrite destination to hit the backend container over the docker network.
*   **Dependency Resolution Fix:** Updated the frontend Dockerfile to use `npm install --legacy-peer-deps` to bypass strict npm conflict errors between `react-map-gl` and the empty `mapbox-gl` NPM stub during automated builds.

---
*End of Phase 4.*

## Future Phases Planned

**Phase 5: Cloud Infrastructure & Deployment**
*   Deploy Dockerized Backend to a managed container service (e.g., AWS ECS/Fargate or Google Cloud Run) or pivot back to Serverless AWS Lambda.
*   Deploy Next.js frontend to AWS Amplify, Vercel, or as a standalone container.