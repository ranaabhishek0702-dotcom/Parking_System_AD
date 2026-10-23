'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { useApp, ZoneData } from '../context/AppContext';
import { MapPin, Navigation, Eye, AlertCircle, Layers } from 'lucide-react';

interface LiveMapProps {
  onSelectZone: (zone: ZoneData) => void;
  onOpenPriceExplainer: (zone: ZoneData) => void;
}

export function LiveMap({ onSelectZone, onOpenPriceExplainer }: LiveMapProps) {
  const { lang, t, formatCurrency } = useI18n();
  const { zones, selectedZone, selectedVehicle, lowBandwidth } = useApp();
  const [mapCenter, setMapCenter] = useState({ lat: 28.6139, lng: 77.2090 }); // Delhi center

  useEffect(() => {
    if (selectedZone) {
      setMapCenter(selectedZone.location);
    }
  }, [selectedZone]);

  // Map coordinate transformation to SVG viewport [0, 1000] x [0, 800]
  // Lat: 28.45 (South) to 28.70 (North) -> Y inverted
  // Lng: 77.05 (West) to 77.30 (East) -> X
  const toSvgCoords = (lat: number, lng: number) => {
    const minLat = 28.44;
    const maxLat = 28.69;
    const minLng = 77.05;
    const maxLng = 77.30;

    const x = ((lng - minLng) / (maxLng - minLng)) * 800 + 100;
    const y = 800 - ((lat - minLat) / (maxLat - minLat)) * 700 - 50;
    return { x, y };
  };

  const getVehicleRate = (baseRate: number) => {
    if (selectedVehicle === 'two_wheeler') return Math.max(10, Math.round(baseRate * 0.5));
    if (selectedVehicle === 'ev') return Math.round(baseRate * 0.75);
    if (selectedVehicle === 'handicapped') return 0;
    return baseRate;
  };

  return (
    <div className="relative w-full h-[280px] xs:h-[320px] bg-[#090D17] overflow-hidden select-none border-b border-surface-border">
      {/* Decorative Grid Lines / Road Network */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 800" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1E293B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#090D17" stopOpacity="0.9" />
          </radialGradient>
          <linearGradient id="ringRoadGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#334155" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#1E293B" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Backdrop Ambient Light */}
        <rect width="1000" height="800" fill="url(#mapGlow)" />

        {/* Delhi Ring Road & Arterial Highways */}
        <path
          d="M 150,700 Q 300,550 500,450 T 850,250"
          fill="none"
          stroke="#1E293B"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M 150,700 Q 300,550 500,450 T 850,250"
          fill="none"
          stroke="#334155"
          strokeWidth="3"
          strokeDasharray="6 4"
        />

        {/* Inner Ring Road Loop */}
        <ellipse
          cx="520"
          cy="420"
          rx="220"
          ry="180"
          fill="none"
          stroke="#1E293B"
          strokeWidth="10"
        />
        <ellipse
          cx="520"
          cy="420"
          rx="220"
          ry="180"
          fill="none"
          stroke="#334155"
          strokeWidth="2"
        />

        {/* Yamuna River Curve */}
        <path
          d="M 680,50 Q 640,250 670,450 T 720,780"
          fill="none"
          stroke="#0284C7"
          strokeOpacity="0.3"
          strokeWidth="18"
          strokeLinecap="round"
        />

        {/* Landmark Accents */}
        <text x="540" y="380" fill="#475569" fontSize="14" fontWeight="bold">
          🏛️ Central Secretariat
        </text>
        <text x="700" y="240" fill="#475569" fontSize="14" fontWeight="bold">
          🚩 Red Fort (लाल किला)
        </text>
        <text x="500" y="580" fill="#475569" fontSize="14" fontWeight="bold">
          🏥 AIIMS Trauma
        </text>
      </svg>

      {/* Dynamic Zone Pins */}
      <div className="absolute inset-0 pointer-events-none">
        {zones.map((zone) => {
          const { x, y } = toSvgCoords(zone.location.lat, zone.location.lng);
          const isSelected = selectedZone?.id === zone.id;
          const effectiveRate = getVehicleRate(zone.currentRatePerHour);
          const freeBays = zone.availableBays;
          const isFull = freeBays === 0;
          const isSurging = zone.currentRatePerHour > 30;

          // Color classification
          let statusColor = '#10B981'; // Green
          if (isFull) statusColor = '#EF4444'; // Red
          else if (zone.occupancyRate > 0.75) statusColor = '#F59E0B'; // Amber

          return (
            <div
              key={zone.id}
              style={{
                left: `${(x / 1000) * 100}%`,
                top: `${(y / 800) * 100}%`
              }}
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-auto transition-transform duration-300"
            >
              <button
                onClick={() => onSelectZone(zone)}
                className={`group flex flex-col items-center transition-all ${
                  isSelected ? 'scale-110 z-30' : 'hover:scale-105 z-20'
                }`}
              >
                {/* Dynamic Price Pin Pill */}
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black shadow-lg border transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-brand-saffron to-amber-500 text-black border-white shadow-glow-saffron'
                      : isSurging
                      ? 'bg-surface-card text-brand-saffron border-brand-saffron/60'
                      : 'bg-surface-card text-emerald-400 border-surface-border group-hover:border-slate-400'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: statusColor }}
                  />
                  <span>{formatCurrency(effectiveRate)}</span>
                  <span className="text-[9px] font-medium opacity-80">{t.perHour}</span>
                </div>

                {/* Subtitle / Availability Badge */}
                <div
                  className={`mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded shadow-sm text-center truncate max-w-[100px] ${
                    isSelected
                      ? 'bg-brand-saffron text-black'
                      : 'bg-[#0B111E]/90 text-slate-300 border border-slate-700'
                  }`}
                >
                  {lang === 'hi' ? zone.hindiName.split(' ')[0] : zone.name.split(' ')[0]} (
                  {freeBays})
                </div>

                {/* Pin Tip */}
                <div
                  className={`w-1.5 h-1.5 rotate-45 -mt-0.5 ${
                    isSelected ? 'bg-brand-saffron' : 'bg-surface-card border-r border-b border-slate-700'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>

      {/* Floating GPS Reticle & Mode Indicator */}
      <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5">
        <div className="px-2 py-1 rounded-md bg-[#0B111E]/80 backdrop-blur border border-surface-border text-[10px] font-bold text-slate-300 flex items-center gap-1">
          <Navigation className="w-3 h-3 text-brand-saffron animate-pulse" />
          <span>Delhi NCR Live Vector Feed</span>
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-2 right-2 z-30 flex items-center gap-2 bg-[#0B111E]/90 backdrop-blur px-2.5 py-1 rounded-lg border border-surface-border text-[10px] font-semibold text-slate-300">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          &gt;25% Free
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          Filling Fast
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          Full
        </span>
      </div>
    </div>
  );
}
