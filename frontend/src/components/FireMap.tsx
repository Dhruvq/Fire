'use client';

import { useState, useCallback, useMemo } from 'react';
import Map, { Source, Layer, NavigationControl, Marker, Popup, MapMouseEvent } from 'react-map-gl/maplibre';
import type { HeatmapLayerSpecification, CircleLayerSpecification, FillLayerSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

// Type definitions matching our backend responses
export interface FirePoint {
  lat: number;
  lon: number;
  frp?: number; // Fire Radiative Power (intensity roughly)
  is_mock?: boolean; // Flag to indicate if the fire is a mock/test fire
}

export interface PredictionResult {
  status: string;
  hours_simulated: number;
  origin: { lat: number; lon: number };
  predicted_footprint: { lat: number; lon: number }[];
}

interface FireMapProps {
  activeFires: FirePoint[];
  prediction: PredictionResult | null;
  onFireSelect: (fire: FirePoint | null) => void;
  selectedFire: FirePoint | null;
}

export default function FireMap({ activeFires, prediction, onFireSelect, selectedFire }: FireMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -118.2437, // Centered roughly on Los Angeles/SoCal
    latitude: 34.0522,
    zoom: 8,
    pitch: 45, // Angled for 3D terrain
    bearing: 0
  });

  // Convert raw fire points into GeoJSON for Mapbox
  const firesGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: activeFires.map((fire, i) => ({
        type: 'Feature' as const,
        properties: { id: i, frp: fire.frp || 10, is_mock: fire.is_mock || false },
        geometry: { type: 'Point' as const, coordinates: [fire.lon, fire.lat] }
      }))
    };
  }, [activeFires]);

  // Convert prediction footprint into a GeoJSON multipoint/polygon representation
  const predictionGeoJSON = useMemo(() => {
    if (!prediction || !prediction.predicted_footprint.length) return null;
    
    return {
      type: 'FeatureCollection' as const,
      features: prediction.predicted_footprint.map((p, i) => ({
        type: 'Feature' as const,
        properties: { id: `pred-${i}` },
        geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] }
      }))
    };
  }, [prediction]);

  // Styling for the active fires (Heatmap)
  const heatmapLayer: HeatmapLayerSpecification = {
    id: 'fires-heat',
    type: 'heatmap',
    source: 'fires',
    maxzoom: 15,
    paint: {
      'heatmap-weight': ['interpolate', ['linear'], ['get', 'frp'], 0, 0, 100, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 15, 3],
      'heatmap-color': [
        'interpolate',
        ['linear'],
        ['heatmap-density'],
        0, 'rgba(33,102,172,0)',
        0.2, 'rgba(253,219,199,0.5)',
        0.4, 'rgba(239,138,98,0.8)',
        0.8, 'rgba(178,24,43,0.9)',
        1, 'rgba(255,0,0,1)'
      ],
      'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 15, 20],
      'heatmap-opacity': 0.8
    }
  };

  // Styling for individual fire points when zoomed in closer
  const circleLayer: CircleLayerSpecification = {
    id: 'fires-point',
    type: 'circle',
    source: 'fires',
    minzoom: 8,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 3, 15, 8],
      'circle-color': '#ff4444',
      'circle-stroke-color': '#ffffff',
      'circle-stroke-width': 1,
      'circle-opacity': 0.8
    }
  };

  // Styling for the predicted cellular automata spread cells
  const predictionLayer: CircleLayerSpecification = {
    id: 'prediction-cells',
    type: 'circle',
    source: 'prediction',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 8, 4, 15, 12],
      'circle-color': '#ff9900', // Orange for predicted spread
      'circle-opacity': 0.6,
      'circle-stroke-width': 0
    }
  };

  // Labeling for Test Fires
  const testFireLabelLayer: any = { // Using any as SymbolLayerSpecification can be tricky with types
    id: 'test-fire-label',
    type: 'symbol',
    source: 'fires',
    filter: ['==', ['get', 'is_mock'], true],
    layout: {
      'text-field': 'TEST FIRE',
      'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 8, 12, 15, 20],
      'text-anchor': 'bottom',
      'text-offset': [0, -1.5],
      'text-allow-overlap': true,
      'text-ignore-placement': true,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#ff0000',
      'text-halo-width': 2,
    }
  };

  const onMapClick = useCallback(
    (event: MapMouseEvent) => {
      // Find features that were clicked
      const features = event.features;
      if (features && features.length > 0) {
        // Did we click a fire point?
        const fireFeature = features.find((f: any) => f.layer.id === 'fires-point');
        if (fireFeature && fireFeature.geometry.type === 'Point') {
          const coords = fireFeature.geometry.coordinates;
          onFireSelect({ lon: coords[0], lat: coords[1], frp: fireFeature.properties?.frp });
          return;
        }
      }
      // If we clicked empty space, deselect
      onFireSelect(null);
    },
    [onFireSelect]
  );

  return (
    <div className="w-full h-full relative">
      <Map
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        terrain={{ source: 'terrain-dem', exaggeration: 2.5 }}
        onClick={onMapClick}
        interactiveLayerIds={['fires-point']}
        cursor={selectedFire ? 'crosshair' : 'pointer'}
      >
        <Source
          id="terrain-dem"
          type="raster-dem"
          url="https://demotiles.maplibre.org/terrain-tiles/tiles.json"
          tileSize={256}
          maxzoom={14}
        />
        
        {/* Render Active Fires */}
        <Source id="fires" type="geojson" data={firesGeoJSON}>
           <Layer {...heatmapLayer} />
           <Layer {...circleLayer} />
           <Layer {...testFireLabelLayer} />
        </Source>

        {/* Render Predicting Spread Footprint */}
        {predictionGeoJSON && (
          <Source id="prediction" type="geojson" data={predictionGeoJSON}>
            <Layer {...predictionLayer} />
          </Source>
        )}

        {/* Highlight the currently selected fire origin */}
        {selectedFire && (
          <Marker longitude={selectedFire.lon} latitude={selectedFire.lat} color="#ffffff" />
        )}

        <NavigationControl position="top-right" />
      </Map>
    </div>
  );
}
