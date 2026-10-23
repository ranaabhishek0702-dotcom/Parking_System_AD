'use client';

import React, { useState, useMemo } from 'react';
import {
  calculateDynamicPrice,
  simulateWhatIf,
  type ZoneType
} from '@parksense/shared';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceArea
} from 'recharts';
import {
  TrendingUp,
  ShieldCheck,
  Zap,
  Activity,
  Sliders,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';

interface ZoneOption {
  id: string;
  name: string;
  type: ZoneType;
  baseRate: number;
}

const ZONES: ZoneOption[] = [
  { id: 'delhi-cp-inner', name: 'Connaught Place Inner Circle', type: 'market', baseRate: 40 },
  { id: 'gurugram-cyber-city', name: 'DLF Cyber City Building 10', type: 'office', baseRate: 60 },
  { id: 'delhi-aiims-emergency', name: 'AIIMS Emergency & OPD (Equity Capped)', type: 'hospital', baseRate: 20 },
  { id: 'gurugram-huda-metro', name: 'HUDA City Centre Metro Hub', type: 'transit', baseRate: 30 },
  { id: 'delhi-karol-bagh', name: 'Karol Bagh (Arya Samaj Rd)', type: 'market', baseRate: 30 }
];

type ScenarioKey = 'ipl-match-night' | 'normal-weekday' | 'diwali-rush' | 'monsoon-deluge';

const SCENARIOS: Record<ScenarioKey, { name: string; description: string; eventName?: string; uplift: number }> = {
  'ipl-match-night': {
    name: 'IPL Match Night (7:30 PM)',
    description: 'Arun Jaitley Stadium transit rush. Surge begins building at 5:00 PM; occupancy peaks at 7:15 PM.',
    eventName: 'IPL Match: Delhi Capitals vs Mumbai Indians',
    uplift: 0.35
  },
  'normal-weekday': {
    name: 'Standard Urban Weekday',
    description: 'Baseline bimodal diurnal curve with morning (9 AM) and evening (6 PM) commuter peaks.',
    uplift: 0.0
  },
  'diwali-rush': {
    name: 'Diwali Festive Shopping Rush',
    description: 'Sustained 90%+ retail capacity crunch from 11:30 AM to 9:30 PM across all commercial zones.',
    eventName: 'Diwali Festival Market Crunch',
    uplift: 0.50
  },
  'monsoon-deluge': {
    name: 'Monsoon Waterlogging Deluge',
    description: 'Waterlogged arterial roads causing traffic slowdown, reduced turnover, and parking dips.',
    eventName: 'Monsoon Street Drainage Alert',
    uplift: -0.25
  }
};

export default function PricingLabPage() {
  const [selectedZoneId, setSelectedZoneId] = useState<string>('delhi-cp-inner');
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>('ipl-match-night');
  const [enableProactive, setEnableProactive] = useState<boolean>(true);
  const [whatIfDeltaPercent, setWhatIfDeltaPercent] = useState<number>(20);
  const [activeHourIndex, setActiveHourIndex] = useState<number>(17); // 5 PM default focus

  const zone = ZONES.find((z) => z.id === selectedZoneId) || ZONES[0];
  const scenario = SCENARIOS[scenarioKey];

  // 1. Generate 24-hour simulation curve
  const simulatedDay = useMemo(() => {
    const data = [];
    let previousRate = zone.baseRate;

    for (let h = 0; h < 24; h++) {
      let baselineOcc = 0.15;

      if (scenarioKey === 'ipl-match-night') {
        if (h >= 17 && h <= 23) {
          baselineOcc = 0.65 + Math.sin((h - 17) * 0.45) * 0.32;
        } else if (h >= 9 && h <= 16) {
          baselineOcc = 0.55;
        } else {
          baselineOcc = 0.15;
        }
      } else if (scenarioKey === 'diwali-rush') {
        baselineOcc = h >= 11 && h <= 22 ? 0.88 + (Math.sin(h) * 0.08) : 0.20;
      } else if (scenarioKey === 'monsoon-deluge') {
        baselineOcc = h >= 8 && h <= 20 ? 0.42 + (Math.sin(h) * 0.06) : 0.12;
      } else {
        // Normal weekday bimodal
        if (h >= 8 && h <= 11) baselineOcc = 0.76;
        else if (h >= 17 && h <= 20) baselineOcc = 0.84;
        else if (h >= 12 && h <= 16) baselineOcc = 0.62;
        else baselineOcc = 0.15;
      }

      const currentOccupancy = Math.max(0.08, Math.min(0.98, baselineOcc));

      // 45-min lookahead: for next hour step
      let nextStepOcc = currentOccupancy;
      if (h + 1 < 24) {
        if (scenarioKey === 'ipl-match-night' && h === 16) nextStepOcc = 0.82;
        else if (scenarioKey === 'ipl-match-night' && h === 17) nextStepOcc = 0.92;
        else if (scenarioKey === 'ipl-match-night' && h === 18) nextStepOcc = 0.97;
        else nextStepOcc = Math.min(0.98, currentOccupancy + 0.05);
      }

      const forecastOccupancy = enableProactive ? nextStepOcc : currentOccupancy;

      const evalResult = calculateDynamicPrice({
        zoneId: zone.id,
        zoneType: zone.type,
        baseHourlyRate: zone.baseRate,
        currentOccupancyRate: currentOccupancy,
        forecastOccupancy45Min: forecastOccupancy,
        previousEffectiveRate: previousRate,
        timestamp: new Date(2026, 9, 23, h, 0).getTime(),
        activeEventName: scenario.eventName,
        eventUpliftPercent: scenario.uplift
      });

      previousRate = evalResult.effectiveRate;

      // Confidence bands
      const bandWidth = 0.07;
      const lower80 = Math.max(0.02, Number((forecastOccupancy - bandWidth).toFixed(3)));
      const upper80 = Math.min(1.0, Number((forecastOccupancy + bandWidth).toFixed(3)));

      data.push({
        hour: `${String(h).padStart(2, '0')}:00`,
        hourNum: h,
        currentOccupancy: Number((currentOccupancy * 100).toFixed(1)),
        forecastOccupancy: Number((forecastOccupancy * 100).toFixed(1)),
        lower80: Number((lower80 * 100).toFixed(1)),
        upper80: Number((upper80 * 100).toFixed(1)),
        effectiveRate: evalResult.effectiveRate,
        baseRate: zone.baseRate,
        demandFactor: evalResult.breakdown.demandFactor,
        proactive: evalResult.proactiveAdjustmentApplied,
        guardrailsFired: evalResult.guardrailsFired,
        humanReason: evalResult.humanReason
      });
    }

    return data;
  }, [zone, scenarioKey, scenario, enableProactive]);

  const activeDataPoint = simulatedDay[activeHourIndex] || simulatedDay[17];

  // 2. What-If Elasticity Simulation
  const whatIfResult = useMemo(() => {
    return simulateWhatIf({
      zoneId: zone.id,
      zoneType: zone.type,
      baseRate: zone.baseRate,
      currentOccupancy: activeDataPoint.currentOccupancy / 100,
      totalBays: 48,
      priceChangePercent: whatIfDeltaPercent / 100,
      horizonHours: 4
    });
  }, [zone, activeDataPoint, whatIfDeltaPercent]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 p-6 md:p-10">
      {/* Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                MoHUA Smart Automation
              </span>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Pricing Engine Live
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
              ParkSense Dynamic Pricing & Forecast Lab
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Interactive municipal visual testbench for proactive demand-shaping, Holt-Winters forecasting, and equity guardrails.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setEnableProactive(!enableProactive)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                enableProactive
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Zap className={`w-3.5 h-3.5 ${enableProactive ? 'text-blue-400' : ''}`} />
              Proactive 45m Lookahead: {enableProactive ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Control Panels: Scenario & Zone Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Scenario Selector */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Urban Traffic Scenario Preset
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(SCENARIOS) as ScenarioKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setScenarioKey(key)}
                  className={`p-2.5 rounded-lg text-left text-xs font-medium border transition ${
                    scenarioKey === key
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold">{SCENARIOS[key].name}</div>
                  <div className="text-[11px] text-slate-500 truncate mt-0.5">
                    {SCENARIOS[key].description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Zone Selector */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800/80">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              Municipal Street Zone (Delhi NCR)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ZONES.map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZoneId(z.id)}
                  className={`p-2.5 rounded-lg text-left text-xs font-medium border transition ${
                    selectedZoneId === z.id
                      ? 'bg-blue-500/10 border-blue-500/50 text-blue-200'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-semibold truncate">{z.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex justify-between">
                    <span className="capitalize">{z.type}</span>
                    <span>Base: ₹{z.baseRate}/hr</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Chart Section: Occupancy vs Forecast vs Dynamic Price */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                24-Hour Real-Time Occupancy & Dynamic Tariff Trajectory
              </h2>
              <p className="text-xs text-slate-400">
                Notice how the tariff (Amber line) begins rising at 17:00 proactively before occupancy peaks at 19:15. Green band highlights target 70–85% occupancy.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-blue-400 inline-block" />
                <span className="text-slate-300">Actual Occupancy (%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-purple-400 inline-block stroke-dasharray" />
                <span className="text-slate-300">45m Forecast (%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-400 inline-block" />
                <span className="text-amber-300 font-semibold">Price (₹/hr)</span>
              </div>
            </div>
          </div>

          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={simulatedDay}
                margin={{ top: 10, right: 20, bottom: 0, left: -10 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    setActiveHourIndex(e.activePayload[0].payload.hourNum);
                  }
                }}
              >
                {/* 70-85% Target Occupancy Band Reference Area */}
                <ReferenceArea
                  y1={70}
                  y2={85}
                  yAxisId="left"
                  fill="#10b981"
                  fillOpacity={0.08}
                  label={{ value: 'Target Band (70-85%)', fill: '#10b981', fontSize: 11, position: 'insideTopLeft' }}
                />

                <XAxis dataKey="hour" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  stroke="#475569"
                  fontSize={11}
                  domain={[0, 100]}
                  unit="%"
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#fbbf24"
                  fontSize={11}
                  domain={[0, Math.max(80, zone.baseRate * 2.5)]}
                  unit="₹"
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const d = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl text-xs space-y-1">
                          <div className="font-bold text-white border-b border-slate-800 pb-1">
                            Time: {label}
                          </div>
                          <div className="text-blue-400">Current Occupancy: {d.currentOccupancy}%</div>
                          <div className="text-purple-400">45m Forecast: {d.forecastOccupancy}%</div>
                          <div className="text-amber-400 font-bold">Dynamic Tariff: ₹{d.effectiveRate}/hr</div>
                          {d.proactive && (
                            <div className="text-emerald-400 font-semibold flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Proactive Surge Active
                            </div>
                          )}
                          {d.guardrailsFired.length > 0 && (
                            <div className="text-red-400 font-semibold">
                              Guardrails: {d.guardrailsFired.join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="upper80"
                  stroke="none"
                  fill="#8b5cf6"
                  fillOpacity={0.12}
                />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="lower80"
                  stroke="none"
                  fill="#090d16"
                  fillOpacity={1.0}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="currentOccupancy"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="forecastOccupancy"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="stepAfter"
                  dataKey="effectiveRate"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-Time Hour Inspector & What-If Elasticity Simulator */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Explainability Audit Record */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                Explainability Audit at {activeDataPoint.hour}
              </h3>
              <span className="text-xs text-slate-400">Click any hour above to inspect</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-white">Dynamic Tariff Calculation:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300">
                <div className="bg-slate-800/40 p-2 rounded">
                  <span className="text-slate-500 block">Base Rate</span>
                  <span className="font-bold text-white">₹{activeDataPoint.baseRate}/hr</span>
                </div>
                <div className="bg-slate-800/40 p-2 rounded">
                  <span className="text-slate-500 block">Demand Mult</span>
                  <span className="font-bold text-amber-400">{activeDataPoint.demandFactor}x</span>
                </div>
                <div className="bg-slate-800/40 p-2 rounded">
                  <span className="text-slate-500 block">Current Occ</span>
                  <span className="font-bold text-blue-400">{activeDataPoint.currentOccupancy}%</span>
                </div>
                <div className="bg-slate-800/40 p-2 rounded">
                  <span className="text-slate-500 block">45m Forecast</span>
                  <span className="font-bold text-purple-400">{activeDataPoint.forecastOccupancy}%</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80">
                <div className="text-[11px] text-slate-400 font-medium">Algorithmic Reason:</div>
                <div className="text-xs text-slate-200 mt-1 italic bg-black/30 p-2 rounded border border-slate-800">
                  &ldquo;{activeDataPoint.humanReason}&rdquo;
                </div>
              </div>

              {activeDataPoint.guardrailsFired.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Guardrail Fired: <strong>{activeDataPoint.guardrailsFired.join(', ')}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* What-If Policy Simulator */}
          <div className="glass-panel p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                What-If Policy Simulator (Econometric Elasticity)
              </h3>
              <span className="text-xs text-emerald-400 font-mono">
                ε = {whatIfResult.elasticityUsed}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>Proposed Tariff Change:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {whatIfDeltaPercent > 0 ? `+${whatIfDeltaPercent}` : whatIfDeltaPercent}% (₹{whatIfResult.originalRate} → ₹{whatIfResult.newRate}/hr)
                  </span>
                </div>
                <input
                  type="range"
                  min="-50"
                  max="100"
                  step="5"
                  value={whatIfDeltaPercent}
                  onChange={(e) => setWhatIfDeltaPercent(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Projected Occupancy</div>
                  <div className="text-base font-bold text-white mt-0.5">
                    {Math.round(whatIfResult.projectedOccupancy.projected * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-500">
                    CI: {Math.round(whatIfResult.projectedOccupancy.p10 * 100)}% - {Math.round(whatIfResult.projectedOccupancy.p90 * 100)}%
                  </div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Hourly Revenue</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">
                    ₹{whatIfResult.projectedHourlyRevenue.projected}
                  </div>
                  <div className="text-[10px] text-emerald-500/80">
                    {whatIfResult.projectedHourlyRevenue.deltaPercent > 0 ? '+' : ''}{whatIfResult.projectedHourlyRevenue.deltaPercent}%
                  </div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">Slot Turnover Delta</div>
                  <div className="text-base font-bold text-blue-400 mt-0.5">
                    {whatIfResult.projectedTurnoverDeltaPercent > 0 ? '+' : ''}{whatIfResult.projectedTurnoverDeltaPercent}%
                  </div>
                  <div className="text-[10px] text-slate-500">Circulation Rate</div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 bg-slate-900/30 p-2 rounded">
                * Calibrated using Donald Shoup demand elasticity model. Assumes stable public transit alternatives.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
