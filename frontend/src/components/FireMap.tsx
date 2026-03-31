'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Map, { Source, Layer, NavigationControl, Marker, MapMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type { HeatmapLayerSpecification, CircleLayerSpecification } from 'maplibre-gl';
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
  isPredicting: boolean;
}

export default function FireMap({ activeFires, prediction, onFireSelect, selectedFire, isPredicting }: FireMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -118.2437, // Centered roughly on Los Angeles/SoCal
    latitude: 34.0522,
    zoom: 7.25,
    pitch: 45, // Angled for 3D terrain
    bearing: 0
  });

  const mapRef = useRef<MapRef>(null);

  // Auto-zoom to the predicted footprint when the prediction returns
  useEffect(() => {
    if (prediction && prediction.predicted_footprint.length > 0 && mapRef.current) {
      const lats = prediction.predicted_footprint.map(p => p.lat);
      const lons = prediction.predicted_footprint.map(p => p.lon);

      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);

      // fitBounds automatically calculates the best zoom level to fit the box
      // We add dynamic padding to ensure the fire isn't hidden behind our Sidebar (left on desktop, bottom on mobile)
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

      mapRef.current.fitBounds(
        [[minLon, minLat], [maxLon, maxLat]],
        {
          padding: {
            top: 50,
            bottom: isMobile ? 400 : 50,
            right: 50,
            left: isMobile ? 50 : 100
          },
          maxZoom: 14,
          duration: 1500
        }
      );
    }
  }, [prediction]);

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
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 8, 3, 15, 8],
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
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2, 8, 4, 15, 12],
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
      'text-size': ['interpolate', ['linear'], ['zoom'], 0, 8, 8, 12, 15, 20],
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
        ref={mapRef}
        {...viewState}
        onMove={(evt: any) => setViewState(evt.viewState)}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        terrain={{ source: 'terrain-dem', exaggeration: 2.5 }}
        onClick={onMapClick}
        interactiveLayerIds={['fires-point']}
        cursor={selectedFire ? 'crosshair' : 'pointer'}
        maxZoom={14}
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
        {selectedFire && !isPredicting && (
          <Marker longitude={selectedFire.lon} latitude={selectedFire.lat} color="#ffffff" />
        )}

        {/* Scanning Animation loader while evaluating spread */}
        {isPredicting && selectedFire && (
          <Marker longitude={selectedFire.lon} latitude={selectedFire.lat}>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-20 h-20 bg-[#BF00FF]/25 rounded-full animate-ping" />
              <div className="absolute w-8 h-8 border border-[#BF00FF]/60 rounded-full animate-pulse" />
              <div className="w-3 h-3 bg-[#BF00FF] rounded-full shadow-[0_0_12px_#BF00FF]" />
            </div>
          </Marker>
        )}

        <NavigationControl position="top-right" />
      </Map>

      {/* Map Legend */}
      <div className="absolute bottom-12 right-6 bg-[#1e1e1e]/85 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-lg pointer-events-none z-10 flex flex-col gap-3 hidden md:flex">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none">Legend</p>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff4444] shadow-[0_0_6px_rgba(255,68,68,0.6)]" />
          <span className="text-xs text-zinc-300 font-medium">Active Fire Origin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff9900]/80" />
          <span className="text-xs text-zinc-300 font-medium">Predicted Spread (1-8 hrs)</span>
        </div>
      </div>

    </div>
  );
}
