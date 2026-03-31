# Wildfire Spread Forecaster

The **Wildfire Spread Forecaster** predicts where an active wildfire will spread over the next 1-8 hours based on its current location, size, shape, near real-time satellite data, weather forecasts, and terrain/vegetation conditions. Focused initially on Southern California, this application combines real-time data ingestion with an empirically-driven modeling engine to provide vital predictive insights on an interactive 3D map.

## App Screenshots

#### Initial view of the Wildfire Spread Forecaster landing page centered on Southern California:
<img src="https://github.com/user-attachments/assets/f4f44639-e158-4dac-9e90-c98e772c66a8" alt="Wildfire Spread Forecaster - Landing Pa
ge" width="70%" />  

#### Example simulation predicting a fire's spread footprint over a 6-hour period:
<img src="https://github.com/user-attachments/assets/2a408c53-32ff-4e61-b18e-78e5d0480c77" alt="Wildfire Spread Forecaster - 6 Hour Simulation" width="70%" />


## Key Features

*   **Predictive Modeling Engine:** Utilizes an empirically-driven Cellular Automata algorithm inspired by the Rothermel fire spread equation, seamlessly integrating variables like base spread, wind speed/direction, and topological elevation changes across a 100m grid.
*   **Live Data Integration:**
    *   **NASA FIRMS (MODIS/VIIRS):** Fetches real-time active fire clusters.
    *   **NOAA HRRR / NWS:** Retrieves hourly wind speed and direction forecasts.
    *   **USGS 3DEP:** Incorporates precise on-demand elevation data for slope calculations.
*   **Interactive 3D Visualization:** A Next.js frontend built with open-source **Maplibre GL JS** offering high-performance, 3D terrain visualization out-of-the-box (with a 2.5x exaggeration to highlight topology).
*   **Control Panel:** Integrated UI sidebar allowing users to select prediction parameters and simulate up to 8 hours of anticipated fire spread.
*   **Asynchronous Processing:** Powered by Python `asyncio`, ensuring high prediction speeds via concurrent data fetching and smart caching mechanisms without overwhelming upstream APIs.

## Tech Stack & Architecture

### Backend / Data Processing
*   **Framework:** Python (FastAPI)
*   **External APIs:** NASA FIRMS, NOAA HRRR (NWS), USGS 3DEP Server

### Frontend / User Interface
*   **Framework:** Next.js / React
*   **Styling:** Tailwind CSS
*   **Mapping:** Maplibre GL JS (with CARTO Dark Matter styles and open terrain DEM)

### Infrastructure (Target)
*   **Deployment Strategy:** AWS Serverless Architecture (AWS Lambda, API Gateway) to optimize for the AWS Free Tier.

## Getting Started

The easiest way to run the Wildfire Spread Forecaster locally is using Docker Compose, which will automatically orchestrate both the Next.js frontend and FastAPI backend.

### Prerequisites
- Docker and Docker Compose installed on your system.
- (Optional) Node.js 20+ and Python 3.10+ if you wish to run the services natively.

### 1. Running with Docker (Recommended)

To start the entire application stack:

```bash
# From the root of the project, build and start the containers in the background:
docker compose up --build -d
```

The application will now be accessible in your web browser at **http://localhost:3000**. The backend API documentation is available at **http://localhost:8000/docs**.

To stop the application:
```bash
docker compose down
```

### 2. Manual Setup (Alternative)

If you prefer to run the services natively without Docker:

**Backend:**
```bash
cd backend
python -m venv ../venv
source ../venv/bin/activate  # On Windows, use `..\venv\Scripts\activate`
pip install -r requirements.txt
python -m uvicorn app:app --reload
```
*Note: The backend defaults to port 8000. It supports an environment variable `USE_MOCK_FIRES="true"` to forcefully inject a mock fire cluster.*

**Frontend:**
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev
```
The frontend proxy will automatically route `/api/*` requests to the local backend.
