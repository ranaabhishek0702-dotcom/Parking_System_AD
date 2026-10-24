'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  Clock,
  RotateCcw,
  AlertTriangle,
  IndianRupee,
  MapPin,
  Car,
  Zap,
  Info,
  ChevronRight,
  ShieldCheck,
  Search
} from 'lucide-react';

export interface ZoneStatus {
  id: string;
  name: string;
  type: 'market' | 'office' | 'transit' | 'hospital';
  coordinates: { lat: number; lng: number; x: number; y: number }; // x,y for stylized map
  totalBays: number;
  occupiedBays: number;
  availableBays: number;
  reservedBays: number;
  occupancyRate: number;
  currentRatePerHour: number;
  baseHourlyRate: number;
  turnoverRate?: number;
  averageDwellMinutes?: number;
}

interface LiveOverviewTabProps {
  zones: Record<string, ZoneStatus>;
  activeViolationsCount: number;
  onSelectZoneForPricing?: (zoneId: string) => void;
  onSelectZoneForForecast?: (zoneId: string) => void;
}

export const LiveOverviewTab: React.FC<LiveOverviewTabProps> = ({
  zones,
  activeViolationsCount,
  onSelectZoneForPricing,
  onSelectZoneForForecast
}) => {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('delhi-cp-inner');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectingBays, setInspectingBays] = useState(false);

  const zonesList = Object.values(zones);

  // Compute Citywide Aggregate KPIs
  let totalBaysCity = 0;
  let totalOccupiedCity = 0;
  let totalHourlyRunRate = 0;

  for (const z of zonesList) {
    totalBaysCity += z.totalBays || 0;
    totalOccupiedCity += z.occupiedBays || 0;
    totalHourlyRunRate += (z.occupiedBays || 0) * (z.currentRatePerHour || 30);
  }

  const cityOccupancyRate =
    totalBaysCity > 0 ? Math.round((totalOccupiedCity / totalBaysCity) * 100) : 0;
  const hoursElapsed = Math.max(1, new Date().getHours() + new Date().getMinutes() / 60);
  const estimatedRevenueToday = Math.round(totalHourlyRunRate * 0.72 * hoursElapsed + 5240);

  const selectedZone = zones[selectedZoneId] || zonesList[0];

  const filteredZones = zonesList.filter(
    (z) =>
      z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      z.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Real-time Animated KPI Tickers */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1: Citywide Occupancy */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">City Occupancy</span>
            <div
              className={`h-2.5 w-2.5 rounded-full animate-ping ${
                cityOccupancyRate > 80
                  ? 'bg-rose-500'
                  : cityOccupancyRate > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
            />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {cityOccupancyRate}%
            </span>
            <span className="text-xs text-slate-400">
              ({totalOccupiedCity}/{totalBaysCity})
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                cityOccupancyRate > 80
                  ? 'bg-rose-500'
                  : cityOccupancyRate > 60
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${cityOccupancyRate}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-400 mt-1.5 block">
            Sweet-spot target: 70–85%
          </span>
        </div>

        {/* KPI 2: Revenue Today */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Revenue Today</span>
            <IndianRupee className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              ₹{estimatedRevenueToday.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="mt-1 flex items-center space-x-1 text-[11px] text-emerald-400 font-medium">
            <TrendingUp className="h-3 w-3" />
            <span>₹{Math.round(totalHourlyRunRate).toLocaleString('en-IN')}/hr run rate</span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Projected today: ₹48,000</span>
        </div>

        {/* KPI 3: Average Dwell Time */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Avg Dwell Time</span>
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              47
            </span>
            <span className="text-sm font-semibold text-slate-400">mins</span>
          </div>
          <div className="mt-1 text-[11px] text-blue-400 font-medium">
            Target: &lt;60m for commercial turnover
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Shortest: 28m (Metro Hub)</span>
        </div>

        {/* KPI 4: Daily Bay Turnover */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Daily Turnover</span>
            <RotateCcw className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              4.6x
            </span>
            <span className="text-xs text-slate-400">vehicles/bay</span>
          </div>
          <div className="mt-1 text-[11px] text-purple-400 font-medium">
            +32% vs unmanaged curb
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Curb productivity peak</span>
        </div>

        {/* KPI 5: Active Violations */}
        <div className="glass-panel rounded-xl p-4 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Violations</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-400 tracking-tight">
              {activeViolationsCount}
            </span>
            <span className="text-xs text-slate-400">unresolved</span>
          </div>
          <div className="mt-1 text-[11px] text-rose-400 font-medium">
            Overstays & Unauthorized
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Enforcement squad alerted</span>
        </div>
      </div>

      {/* 2. Interactive Mission Control Map & Zone Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Vector Heatmap (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-blue-400" />
                <span>Delhi NCR Municipal Sensor Heatmap</span>
              </h2>
              <p className="text-xs text-slate-400">
                Click any zone hub to inspect real-time bay telemetry & tariffs
              </p>
            </div>
            {/* Map Legend */}
            <div className="flex items-center space-x-3 text-[11px]">
              <div className="flex items-center space-x-1">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-400">&lt;60% Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-400">60-80% Optimal</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                <span className="text-slate-400">&gt;80% High Demand</span>
              </div>
            </div>
          </div>

          {/* SVG Map Canvas */}
          <div className="relative flex-1 min-h-[380px] rounded-xl bg-gradient-to-b from-[#060a12] to-[#0c1424] border border-slate-800/80 p-4 overflow-hidden flex items-center justify-center">
            {/* Subtle Grid Background */}
            <div
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  'radial-gradient(circle, #3b82f6 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* Stylized Delhi Metro Ring Roads */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              {/* Outer Ring Road */}
              <ellipse cx="50%" cy="50%" rx="44%" ry="40%" fill="none" stroke="#1e293b" strokeWidth="1.5" strokeDasharray="4 4" />
              {/* Inner Ring Road */}
              <ellipse cx="50%" cy="50%" rx="28%" ry="25%" fill="none" stroke="#334155" strokeWidth="1.5" />
              {/* Connaught Place Radial Roads */}
              <line x1="50%" y1="50%" x2="20%" y2="20%" stroke="#1e293b" strokeWidth="1" />
              <line x1="50%" y1="50%" x2="80%" y2="20%" stroke="#1e293b" strokeWidth="1" />
              <line x1="50%" y1="50%" x2="20%" y2="80%" stroke="#1e293b" strokeWidth="1" />
              <line x1="50%" y1="50%" x2="80%" y2="80%" stroke="#1e293b" strokeWidth="1" />
              <line x1="50%" y1="50%" x2="50%" y2="92%" stroke="#1e293b" strokeWidth="1" />
            </svg>

            {/* Zone Markers on Map */}
            <div className="relative w-full h-[340px]">
              {zonesList.map((z) => {
                const isSelected = selectedZoneId === z.id;
                const occ = Math.round((z.occupancyRate || 0) * 100);
                const colorClass =
                  occ > 80
                    ? 'border-rose-500 bg-rose-500/20 text-rose-400'
                    : occ > 60
                    ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                    : 'border-emerald-500 bg-emerald-500/20 text-emerald-400';

                const glowClass =
                  occ > 80
                    ? 'shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                    : occ > 60
                    ? 'shadow-[0_0_20px_rgba(245,158,11,0.5)]'
                    : 'shadow-[0_0_20px_rgba(16,185,129,0.5)]';

                // Map coordinates percentage (relative to container)
                const left = `${z.coordinates.x}%`;
                const top = `${z.coordinates.y}%`;

                return (
                  <button
                    key={z.id}
                    onClick={() => setSelectedZoneId(z.id)}
                    style={{ left, top, transform: 'translate(-50%, -50%)' }}
                    className={`absolute z-10 flex flex-col items-center group transition-transform duration-200 hover:scale-110 focus:outline-none`}
                  >
                    <div
                      className={`h-11 w-11 rounded-2xl border-2 flex items-center justify-center font-bold text-xs backdrop-blur-md transition-all ${colorClass} ${glowClass} ${
                        isSelected ? 'ring-4 ring-blue-500 scale-110' : ''
                      }`}
                    >
                      <span>{occ}%</span>
                    </div>

                    {/* Zone Mini-Tag */}
                    <div className="mt-1.5 px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-700 text-[10px] font-semibold text-slate-200 whitespace-nowrap shadow-md group-hover:border-blue-400 transition-colors">
                      {z.name.split(' (')[0]}
                      <span className="ml-1 text-blue-400">₹{z.currentRatePerHour}/h</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-3">
            <span className="flex items-center space-x-1.5">
              <Zap className="h-3.5 w-3.5 text-blue-400" />
              <span>Real-time magnetic magnetometers & LoRaWAN gateway ingestion active</span>
            </span>
            <span className="text-[11px] text-slate-500">Latency: 280ms • ISO-15118 ready</span>
          </div>
        </div>

        {/* Right Column: Zone Inspector Drill-Down (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                  Zone Drill-Down
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{selectedZone?.name}</h3>
                <span className="text-xs text-slate-400 capitalize">
                  {selectedZone?.type} Zone • ID: <code>{selectedZone?.id}</code>
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-white">
                  ₹{selectedZone?.currentRatePerHour}
                  <span className="text-xs font-normal text-slate-400">/hr</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  Base: ₹{selectedZone?.baseHourlyRate}/hr
                </div>
              </div>
            </div>

            {/* Occupancy Progress & Bay Numbers */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Live Occupancy</span>
                  <span className="text-white">
                    {Math.round((selectedZone?.occupancyRate || 0) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      (selectedZone?.occupancyRate || 0) > 0.8
                        ? 'bg-rose-500'
                        : (selectedZone?.occupancyRate || 0) > 0.6
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round((selectedZone?.occupancyRate || 0) * 100)
                      )}%`
                    }}
                  />
                </div>
              </div>

              {/* Bay Allocation Breakdown */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-lg font-bold text-emerald-400">
                    {selectedZone?.availableBays}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Available
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-lg font-bold text-rose-400">
                    {selectedZone?.occupiedBays}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Occupied
                  </div>
                </div>
                <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-2.5">
                  <div className="text-lg font-bold text-blue-400">
                    {selectedZone?.totalBays}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">
                    Total Bays
                  </div>
                </div>
              </div>

              {/* Bay Inspector Preview Grid */}
              <div className="mt-4 border border-slate-800/80 rounded-xl p-3 bg-slate-950/40">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-semibold text-slate-300">Individual Bay Network</span>
                  <span className="text-[11px] text-slate-400">
                    Showing 30 bays (C, 2W, EV, HA)
                  </span>
                </div>
                {/* Mini Bays Matrix */}
                <div className="grid grid-cols-6 sm:grid-cols-10 gap-1 max-h-36 overflow-y-auto p-1">
                  {Array.from({ length: selectedZone?.totalBays || 30 }).map((_, idx) => {
                    const isOccupied = idx < (selectedZone?.occupiedBays || 0);
                    const bayNum = idx < 9 ? `0${idx + 1}` : `${idx + 1}`;
                    return (
                      <div
                        key={idx}
                        title={`Bay #${bayNum} - ${isOccupied ? 'Occupied' : 'Available'}`}
                        className={`h-6 rounded text-[9px] font-mono font-bold flex items-center justify-center border transition-all ${
                          isOccupied
                            ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:scale-105'
                        }`}
                      >
                        {bayNum}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="pt-4 border-t border-slate-800 flex space-x-2 mt-4">
            {onSelectZoneForPricing && (
              <button
                onClick={() => onSelectZoneForPricing(selectedZoneId)}
                className="flex-1 rounded-lg bg-blue-600/20 border border-blue-500/40 px-3 py-2 text-xs font-semibold text-blue-300 hover:bg-blue-600/30 transition-colors flex items-center justify-center space-x-1"
              >
                <span>Pricing Rules</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
            {onSelectZoneForForecast && (
              <button
                onClick={() => onSelectZoneForForecast(selectedZoneId)}
                className="flex-1 rounded-lg bg-purple-600/20 border border-purple-500/40 px-3 py-2 text-xs font-semibold text-purple-300 hover:bg-purple-600/30 transition-colors flex items-center justify-center space-x-1"
              >
                <span>View 7d Forecast</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Zone Roster Summary Table */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-white">All Municipal Parking Zones (Delhi NCR)</h3>
            <p className="text-xs text-slate-400">Live operational status across all 9 monitored rings</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter zones by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3">Zone Name</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Occupancy</th>
                <th className="py-3 px-3">Bays (Avail/Total)</th>
                <th className="py-3 px-3">Active Tariff</th>
                <th className="py-3 px-3">Hourly Revenue</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredZones.map((z) => {
                const occ = Math.round((z.occupancyRate || 0) * 100);
                const hourlyRev = (z.occupiedBays || 0) * (z.currentRatePerHour || 30);
                return (
                  <tr
                    key={z.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      selectedZoneId === z.id ? 'bg-blue-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-white">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            occ > 80 ? 'bg-rose-500' : occ > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span>{z.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-400">{z.type}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-bold ${
                            occ > 80 ? 'text-rose-400' : occ > 60 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {occ}%
                        </span>
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              occ > 80 ? 'bg-rose-500' : occ > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${occ}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300 font-mono">
                      <span className="text-emerald-400 font-bold">{z.availableBays}</span> / {z.totalBays}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      ₹{z.currentRatePerHour}/hr
                    </td>
                    <td className="py-3 px-3 font-semibold text-emerald-400">
                      ₹{hourlyRev.toLocaleString('en-IN')}/hr
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => setSelectedZoneId(z.id)}
                        className="rounded bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-200 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
