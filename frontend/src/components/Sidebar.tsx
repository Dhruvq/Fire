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
    <div className="absolute bottom-0 left-0 w-full md:bottom-auto md:w-80 md:top-4 md:left-4 bg-[#1e1e1e]/85 backdrop-blur-md rounded-t-2xl md:rounded-xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-lg overflow-hidden flex flex-col pointer-events-auto border-t md:border border-white/10 transition-all duration-300 z-50">
      
      {/* Header */}
      <div className="bg-black/40 p-5 border-b border-white/5">
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">Wildfire Predictor</h1>
        <p className="text-sm text-zinc-400 mt-1">Southern California</p>
      </div>

      <div className="p-5 flex flex-col gap-4 overflow-y-auto max-h-[45vh] md:max-h-[calc(100vh-8rem)] custom-scrollbar">
        
        {/* Instructions / Selection State */}
        {!selectedFire ? (
          <div className="bg-zinc-800/50 text-zinc-300 border border-zinc-700/50 p-3 rounded-lg text-sm flex gap-3 items-start backdrop-blur-sm">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-zinc-400" />
            <p className="leading-relaxed">Select an active fire cluster on the map to begin.</p>
          </div>
        ) : (
          <div className="bg-zinc-800/50 p-4 rounded-lg text-sm flex gap-3 items-start border border-zinc-700/50">
            <div className="w-2 h-2 rounded-full bg-[#2CFF05] shadow-[0_0_8px_rgba(44,255,5,0.6)] mt-1.5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-[#2CFF05] tracking-wide text-xs mb-2">SYSTEM ACTIVE</p>
              <div className="space-y-1">
                <p className="text-xs text-zinc-400 flex justify-between"><span>Lat:</span> <span className="text-white font-mono">{selectedFire.lat.toFixed(4)}</span></p>
                <p className="text-xs text-zinc-400 flex justify-between"><span>Lon:</span> <span className="text-white font-mono">{selectedFire.lon.toFixed(4)}</span></p>
                {selectedFire.frp && (
                   <p className="text-xs text-zinc-400 flex justify-between mt-2 pt-2 border-t border-white/5"><span>Intensity (FRP):</span> <span className="text-white font-mono">{selectedFire.frp.toFixed(1)}</span></p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className={`transition-opacity duration-300 ${selectedFire ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
          <label className="text-xs font-medium text-zinc-400 mb-3 block uppercase tracking-wider">
            Simulation Hours
          </label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="1" 
              max="8" 
              value={hours} 
              onChange={(e) => setHours(parseInt(e.target.value))}
              className="flex-1 accent-[#BF00FF]"
            />
            <span className="font-mono bg-zinc-900 text-white px-3 py-1 rounded-md text-sm border border-zinc-700 w-12 text-center">
              {hours}h
            </span>
          </div>

          <button
            onClick={() => onPredict(hours)}
            disabled={!selectedFire || isPredicting}
            className="mt-6 w-full bg-[#BF00FF] hover:bg-[#a600e6] text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(191,0,255,0.2)] hover:shadow-[0_0_20px_rgba(191,0,255,0.4)] active:scale-[0.98]"
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
          <div className="mt-4 p-3 bg-red-500/10 text-red-200 border border-red-500/20 rounded-lg text-sm flex gap-3 items-start">
            <Info className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />
            <p className="leading-relaxed">Error: {predictionError}</p>
          </div>
        )}

      </div>

      {/* Output Stats */}
        {prediction && !isPredicting && (
          <div className="mt-2 text-sm border-t border-white/10 pt-5">
            <p className="font-medium text-xs text-zinc-400 uppercase tracking-wider mb-3">Simulation Complete</p>
            <div className="flex justify-between mt-2 text-zinc-400">
              <span>Timeframe</span>
              <span className="font-mono text-white">{prediction.hours_simulated} hrs</span>
            </div>
            <div className="flex justify-between mt-2 text-zinc-400">
              <span>Impacted Cells</span>
              <span className="font-mono text-white">{(prediction.predicted_footprint?.length || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between mt-2 text-zinc-400">
              <span>Impact Area</span>
              <span className="font-mono text-white">{((prediction.predicted_footprint?.length || 0) * 0.01).toFixed(1)} km²</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
