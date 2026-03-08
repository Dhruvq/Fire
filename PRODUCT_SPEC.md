# Wildfire Spread Forecaster - Product Spec

## 1. Project Overview
The Wildfire Spread Forecaster predicts where an active wildfire will spread in the next 6-24 hours based on near real-time satellite data, weather forecasts, and terrain/vegetation conditions.
**Geographic Scope:** The application focuses exclusively on Southern California to optimize data processing and infrastructure constraints (AWS Free Tier).

## 2. Architecture & Tech Stack

### 2.1. Backend / Data Processing Pipeline
- **Language**: Python
- **Data Ingestion Modules**:
  - **Active Fires**: NASA FIRMS (MODIS/VIIRS) API for the Southern California bounded region.
  - **Weather Forecast**: NOAA HRRR (Wind speed, Wind direction, Humidity, Temperature)
  - **Terrain & Vegetation**: USGS 3DEP (Elevation, Slope, Aspect) & LANDFIRE (Fuel Type)
- **Host / Deployment**: AWS Free Tier (AWS Lambda Serverless + API Gateway + S3 for Raster Data)

### 2.2. The Modeling Engine
- **Approach**: *Empirically-Driven Cellular Automata*. Uses rules based on the Rothermel spread equation to iteratively map fire spread based on neighboring topography, wind, and fuel.

### 2.3. Frontend / User Interface
- **Framework**: Next.js / React
- **Mapping Library**: Mapbox GL JS for 3D terrain rendering.
- **UX Flow**: 
  1. User lands on an interactive Mapbox light-mode interface showing active wildfires in Southern California.
  2. User selects a specific fire to view details.
  3. The app fetches and displays the predicted 6-24 hour spread as a heat map or polygon layer on top of the terrain.

## 3. Implementation Phases

**Phase 1: Foundation & Data Pipelines**
- Set up project structure.
- Build data fetchers for NASA FIRMS (Active fires in SoCal).
- Build data fetchers for NOAA HRRR (weather).
- Build data fetchers for USGS 3DEP and LANDFIRE (Terrain/Vegetation) customized for SoCal.

**Phase 2: Modeling & Core Logic**
- Develop the spread prediction algorithm (Cellular Automata).
- Test prediction logic locally for a single known fire incident in SoCal.
- Expose a REST API endpoint that takes a fire's coordinates and returns the predicted spread.

**Phase 3: Frontend & Visualization**
- Scaffold the Next.js web application.
- Integrate Mapbox GL JS to plot active fires.
- Build interactive UI to trigger and display the spread prediction.

**Phase 4: Cloud Infrastructure & Deployment**
- Deploy Backend to AWS Lambda.
- Deploy Next.js frontend to AWS (e.g., AWS Amplify or S3/CloudFront).