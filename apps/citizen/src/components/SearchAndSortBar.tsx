'use client';

import React from 'react';
import { useI18n } from '../lib/i18n';
import { useApp } from '../context/AppContext';
import { Search, Compass, IndianRupee, Footprints, X } from 'lucide-react';

export function SearchAndSortBar() {
  const { t } = useI18n();
  const { searchQuery, setSearchQuery, sortMode, setSortMode, setSelectedZone, zones } = useApp();

  const presets = [
    { label: 'Connaught Place', id: 'delhi-cp-inner' },
    { label: 'AIIMS Hospital', id: 'delhi-aiims-emergency' },
    { label: 'Khan Market', id: 'delhi-khan-market' },
    { label: 'Cyber City', id: 'gurugram-cyber-city' },
    { label: 'Chandni Chowk', id: 'delhi-chandni-chowk' },
    { label: 'Lajpat Nagar', id: 'delhi-lajpat-nagar' }
  ];

  const handleSelectPreset = (zoneId: string) => {
    const found = zones.find((z) => z.id === zoneId);
    if (found) {
      setSelectedZone(found);
      setSearchQuery('');
    }
  };

  return (
    <div className="px-3 pt-2.5 pb-2 bg-[#0B111E] border-b border-surface-border space-y-2">
      <div className="max-w-md mx-auto space-y-2">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full min-h-[44px] pl-9 pr-9 py-2 rounded-xl bg-surface-card border border-surface-border text-white text-xs font-medium placeholder:text-slate-400 focus:outline-none focus:border-brand-saffron transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Modes */}
        <div className="flex items-center justify-between gap-1.5">
          <button
            onClick={() => setSortMode('nearest')}
            className={`flex-1 min-h-[40px] px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
              sortMode === 'nearest'
                ? 'bg-brand-saffron/20 border-brand-saffron text-brand-saffron shadow-sm'
                : 'bg-surface-card border-surface-border text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{t.sortNearest}</span>
          </button>

          <button
            onClick={() => setSortMode('cheapest')}
            className={`flex-1 min-h-[40px] px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
              sortMode === 'cheapest'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400 shadow-sm'
                : 'bg-surface-card border-surface-border text-slate-400 hover:text-slate-200'
            }`}
          >
            <IndianRupee className="w-3.5 h-3.5" />
            <span>{t.sortCheapest}</span>
          </button>

          <button
            onClick={() => setSortMode('walking')}
            className={`flex-1 min-h-[40px] px-2 py-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
              sortMode === 'walking'
                ? 'bg-amber-500/20 border-amber-400 text-amber-400 shadow-sm'
                : 'bg-surface-card border-surface-border text-slate-400 hover:text-slate-200'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>{t.sortWalking}</span>
          </button>
        </div>

        {/* Quick Landmarks */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-0.5">
          {presets.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className="flex-shrink-0 text-[10px] font-bold px-2 py-1 rounded-md bg-surface-card border border-surface-border text-slate-400 hover:text-white hover:border-slate-500 transition-all"
            >
              📍 {p.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
