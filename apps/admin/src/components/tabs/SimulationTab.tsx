'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  Activity,
  CheckCircle2,
  Clock,
  Radio,
  Sliders,
  ShieldAlert
} from 'lucide-react';
import { rtdb } from '../../lib/firebase';
import { ref, onValue, set, update } from 'firebase/database';

interface SimulationTabProps {
  // Optional callbacks
}

export const SimulationTab: React.FC<SimulationTabProps> = () => {
  const [currentSpeed, setCurrentSpeed] = useState<'1x' | '10x' | '60x'>('10x');
  const [currentScenario, setCurrentScenario] = useState<string>('normal-weekday');
  const [currentSeed, setCurrentSeed] = useState<string>('parksense-2026-delhi');
  const [liveState, setLiveState] = useState<any>({
    active: true,
    speed: '10x',
    scenario: 'normal-weekday',
    updatedAt: Date.now()
  });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Listen to RTDB simulation_state
  useEffect(() => {
    const stateRef = ref(rtdb, 'simulation_state');
    const unsubscribe = onValue(stateRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setLiveState(val);
        if (val.speed) setCurrentSpeed(val.speed);
        if (val.scenario) setCurrentScenario(val.scenario);
        if (val.seed) setCurrentSeed(val.seed);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateSpeed = async (speed: '1x' | '10x' | '60x') => {
    setCurrentSpeed(speed);
    try {
      await update(ref(rtdb, 'simulation_control'), {
        speed,
        updatedAt: Date.now()
      });
      setStatusMessage(`Speed set to ${speed}. The background engine reacted in real time.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to update speed:', err);
    }
  };

  const handleUpdateScenario = async (scenario: string) => {
    setCurrentScenario(scenario);
    try {
      await update(ref(rtdb, 'simulation_control'), {
        scenario,
        updatedAt: Date.now()
      });
      setStatusMessage(`Scenario shifted to "${scenario}". Urban surge parameters re-weighted.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to update scenario:', err);
    }
  };

  const handleApplySeed = async () => {
    try {
      await update(ref(rtdb, 'simulation_control'), {
        seed: currentSeed,
        updatedAt: Date.now()
      });
      setStatusMessage(`PRNG seed "${currentSeed}" broadcast. All events are 100% reproducible.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to update seed:', err);
    }
  };

  const scenariosList = [
    {
      id: 'ipl-match-night',
      name: 'IPL Match Night (T20)',
      emoji: '🏏',
      multiplier: '1.35x Surge',
      description: 'Delhi Capitals vs Mumbai Indians. Rapid surge around Arun Jaitley Stadium & Connaught Place transit lines.',
      tagColor: 'text-amber-400 border-amber-500/40 bg-amber-500/10'
    },
    {
      id: 'diwali-shopping-rush',
      name: 'Diwali Festive Rush',
      emoji: '🪔',
      multiplier: '1.28x Surge',
      description: 'Heavy market influx across Chandni Chowk, Karol Bagh & Lajpat Nagar retail rings.',
      tagColor: 'text-purple-400 border-purple-500/40 bg-purple-500/10'
    },
    {
      id: 'normal-weekday',
      name: 'Standard Urban Weekday',
      emoji: '🏢',
      multiplier: '1.0x Baseline',
      description: 'Bimodal diurnal commute: Morning 9-11 AM office rush and evening 6-9 PM market rush.',
      tagColor: 'text-blue-400 border-blue-500/40 bg-blue-500/10'
    },
    {
      id: 'monsoon-deluge',
      name: 'Monsoon Deluge / Waterlogging',
      emoji: '🌧️',
      multiplier: '0.78x Slowdown',
      description: 'Surface flooding curbs travel. Drivers seek covered or elevated metro hubs.',
      tagColor: 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10'
    },
    {
      id: 'illegal-parking-surge',
      name: 'Illegal Parking Stress Test',
      emoji: '⚠️',
      multiplier: '0.18 Violation Rate',
      description: 'Elevated rate of unauthorized and overstay parking to test automated e-Challan enforcement dispatch.',
      tagColor: 'text-rose-400 border-rose-500/40 bg-rose-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
            Simulator Mission Control
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            Real-Time Urban Sensor Telemetry Controller
          </h2>
          <p className="text-xs text-slate-400">
            Control telemetry tick velocity, inject synthetic urban surge scenarios, and govern PRNG reproducibility
          </p>
        </div>

        {/* Live Simulator Status Badge */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2 rounded-full border border-emerald-500/40 bg-emerald-950/30 px-3.5 py-1.5 text-xs text-emerald-300">
            <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            <span>Simulator Connected via RTDB</span>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-blue-500/40 bg-blue-950/30 p-3 text-xs text-blue-300 flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="h-4 w-4 text-blue-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 2. Simulation Speed & Velocity Controls */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center space-x-2 mb-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <span>Telemetry Velocity (Speed Multiplier)</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Adjust the event dispatch rate across 358 smart bays and 9 municipal zones in real time
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1x */}
          <button
            onClick={() => handleUpdateSpeed('1x')}
            className={`rounded-xl p-4 border text-left transition-all ${
              currentSpeed === '1x'
                ? 'border-blue-500 bg-blue-600/20 shadow-lg shadow-blue-500/20'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-black text-white">1x Speed</span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">2.5s / event</span>
            </div>
            <div className="text-xs text-slate-300 font-medium">Real-Time Reality</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Exact real-world sensor cadence for physical field demonstrations.
            </p>
          </button>

          {/* 10x */}
          <button
            onClick={() => handleUpdateSpeed('10x')}
            className={`rounded-xl p-4 border text-left transition-all ${
              currentSpeed === '10x'
                ? 'border-blue-500 bg-blue-600/20 shadow-lg shadow-blue-500/20'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-black text-blue-400">10x Speed</span>
              <span className="text-[10px] font-bold text-blue-300 font-mono">350ms / event</span>
            </div>
            <div className="text-xs text-white font-medium">Urban Rush (Recommended)</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Dynamic live action where turnover and occupancy shifts are clearly visible.
            </p>
          </button>

          {/* 60x */}
          <button
            onClick={() => handleUpdateSpeed('60x')}
            className={`rounded-xl p-4 border text-left transition-all ${
              currentSpeed === '60x'
                ? 'border-purple-500 bg-purple-600/20 shadow-lg shadow-purple-500/20'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-black text-purple-400">60x Speed</span>
              <span className="text-[10px] font-bold text-purple-300 font-mono">60ms / event</span>
            </div>
            <div className="text-xs text-white font-medium">High-Velocity Stress Test</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulates hours of city life in minutes; stress-tests pricing algorithms.
            </p>
          </button>
        </div>
      </div>

      {/* 3. Scenario Preset Selector */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center space-x-2 mb-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span>Urban Surge & Disaster Scenarios</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Inject real Indian city stress events to watch the pricing engine, citizen app, and enforcement squad react
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {scenariosList.map((sc) => {
            const isSelected = currentScenario === sc.id;
            return (
              <button
                key={sc.id}
                onClick={() => handleUpdateScenario(sc.id)}
                className={`rounded-xl p-3.5 border text-left transition-all ${
                  isSelected
                    ? 'border-purple-500 bg-purple-950/30 ring-2 ring-purple-500/30 shadow-lg'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{sc.emoji}</span>
                    <span className="font-bold text-white text-xs">{sc.name}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${sc.tagColor}`}>
                    {sc.multiplier}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{sc.description}</p>
                {isSelected && (
                  <div className="mt-2 text-[10px] font-bold text-purple-300 uppercase tracking-wider flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Active Scenario</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Seed Control & PRNG Reproducibility */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <RotateCcw className="h-4 w-4 text-blue-400" />
              <span>Reproducible PRNG Seed</span>
            </h3>
            <p className="text-xs text-slate-400">
              Mulberry32 PRNG seed ensures identical telemetry streams across repeated test runs
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={currentSeed}
              onChange={(e) => setCurrentSeed(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-56"
            />
            <button
              onClick={handleApplySeed}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white transition-colors"
            >
              Apply Seed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
