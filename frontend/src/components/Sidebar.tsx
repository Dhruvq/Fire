'use client';

import { useState } from 'react';
import { Play, Loader2, Info } from 'lucide-react';
import type { FirePoint, PredictionResult } from './FireMap';

interface SidebarProps {
  selectedFire: FirePoint | null;
  prediction: PredictionResult | null;
  isPredicting: boolean;
  onPredict: (hours: number) => void;
  predictionError: string | null; // Added for displaying backend errors
}

export default function Sidebar({ selectedFire, prediction, isPredicting, onPredict, predictionError }: SidebarProps) {
  const [hours, setHours] = useState<number>(6);

  return (
    <div className="absolute top-4 left-4 w-80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto border border-zinc-200 dark:border-zinc-800 transition-all duration-300">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-600 p-4 text-white">
        <h1 className="text-xl font-bold tracking-tight">Wildfire Forecaster</h1>
        <p className="text-sm opacity-90 mt-1">Southern California</p>
      </div>

      <div className="p-5 flex flex-col gap-4">
        
        {/* Instructions / Selection State */}
        {!selectedFire ? (
          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-3 rounded-lg text-sm flex gap-2 items-start">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p>Select an active fire cluster on the map to begin.</p>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 p-3 rounded-lg text-sm flex gap-2 items-start border border-green-200 dark:border-green-800/30">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Fire Origin Selected</p>
              <p className="text-xs opacity-80 mt-1 font-mono">Lat: {selectedFire.lat.toFixed(4)}</p>
              <p className="text-xs opacity-80 font-mono">Lon: {selectedFire.lon.toFixed(4)}</p>
              {selectedFire.frp && (
                 <p className="text-xs opacity-80 font-mono mt-1 pt-1 border-t border-green-200/50">Intensity FRP: {selectedFire.frp.toFixed(1)}</p>
              )}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className={`transition-opacity duration-300 ${selectedFire ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2 block">
            Simulation Hours (1-8)
          </label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="1" 
              max="8" 
              value={hours} 
              onChange={(e) => setHours(parseInt(e.target.value))}
              className="flex-1 accent-orange-500"
            />
            <span className="font-mono bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-md text-sm border border-zinc-200 dark:border-zinc-700 w-12 text-center">
              {hours}h
            </span>
          </div>

          <button
            onClick={() => onPredict(hours)}
            disabled={!selectedFire || isPredicting}
            className="mt-6 w-full bg-gradient-to-r from-orange-500 hover:from-orange-600 to-red-600 hover:to-red-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-[0.98]"
          >
            {isPredicting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Simulating Spread...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" fill="currentColor" />
                Run Prediction Model
              </>
          )}
        </button>
        {predictionError && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm flex gap-2 items-start">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="font-semibold">Error: {predictionError}</p>
          </div>
        )}

      </div>

      {/* Output Stats */}
        {prediction && !isPredicting && (
          <div className="mt-2 text-sm border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">Simulation Complete</p>
            <div className="flex justify-between mt-2 text-zinc-600 dark:text-zinc-400">
              <span>Timeframe:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{prediction.hours_simulated} hours</span>
            </div>
            <div className="flex justify-between mt-1 text-zinc-600 dark:text-zinc-400">
              <span>Impacted Cells:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{(prediction.predicted_footprint?.length || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between mt-1 text-zinc-600 dark:text-zinc-400">
              <span>Impact Area:</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-100">{((prediction.predicted_footprint?.length || 0) * 0.01).toFixed(1)} km²</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
