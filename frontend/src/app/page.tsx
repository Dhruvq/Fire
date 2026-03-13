'use client';

import { useState, useEffect } from 'react';
import FireMap, { FirePoint, PredictionResult } from '@/components/FireMap';
import Sidebar from '@/components/Sidebar';

export default function Home() {
  const [activeFires, setActiveFires] = useState<FirePoint[]>([]);
  const [selectedFire, setSelectedFire] = useState<FirePoint | null>(null);
  
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);

  // Initial load of active fires
  useEffect(() => {
    async function loadFires() {
      try {
        const res = await fetch('/api/fires');
        if (!res.ok) throw new Error('Failed to fetch fires');
        const data = await res.json();
        if (data.status === 'success') {
          setActiveFires(data.fires);
        }
      } catch (err) {
        console.error("Error loading active fires:", err);
      }
    }
    loadFires();
  }, []);

  const handlePredictSpread = async (hours: number) => {
    if (!selectedFire) return;
    
    setIsPredicting(true);
    setPrediction(null); // Clear previous
    
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedFire.lat,
          lon: selectedFire.lon,
          hours: hours
        })
      });
      
      if (!res.ok) {
        throw new Error('Prediction API failed');
      }
      
      const data = await res.json();
      setPrediction(data);
    } catch (err) {
      console.error("Error running prediction:", err);
      alert("Failed to run simulation. Check console for details.");
    } finally {
      setIsPredicting(false);
    }
  };

  const handleFireSelect = (fire: FirePoint | null) => {
    setSelectedFire(fire);
    if (!fire) {
      setPrediction(null);
    }
  };

  return (
    <main className="w-screen h-screen overflow-hidden bg-zinc-950 font-sans">
      {/* 
        The Mapbox container needs bounded height and relative positioning to work correctly.
        Sidebar is absolutely positioned on top.
      */}
      <FireMap 
        activeFires={activeFires} 
        prediction={prediction} 
        onFireSelect={handleFireSelect}
        selectedFire={selectedFire}
      />
      
      <Sidebar 
        selectedFire={selectedFire}
        prediction={prediction}
        isPredicting={isPredicting}
        onPredict={handlePredictSpread}
      />
    </main>
  );
}
