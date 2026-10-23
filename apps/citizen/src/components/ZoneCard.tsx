'use client';

import React from 'react';
import { useI18n } from '../lib/i18n';
import { useApp, ZoneData } from '../context/AppContext';
import {
  MapPin,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  Zap,
  Accessibility,
  ArrowRight,
  TrendingUp,
  Clock
} from 'lucide-react';

interface ZoneCardProps {
  zone: ZoneData;
  onOpenBaySelector: () => void;
  onOpenPriceExplainer: () => void;
}

export function ZoneCard({ zone, onOpenBaySelector, onOpenPriceExplainer }: ZoneCardProps) {
  const { lang, t, formatCurrency } = useI18n();
  const { selectedVehicle } = useApp();

  const getVehicleRate = (baseRate: number) => {
    if (selectedVehicle === 'two_wheeler') return Math.max(10, Math.round(baseRate * 0.5));
    if (selectedVehicle === 'ev') return Math.round(baseRate * 0.75);
    if (selectedVehicle === 'handicapped') return 0;
    return baseRate;
  };

  const effectiveRate = getVehicleRate(zone.currentRatePerHour);
  const isHospital = zone.type === 'hospital';
  const freeBays = zone.availableBays;
  const isFull = freeBays === 0;

  return (
    <div className="p-3.5 bg-surface-card rounded-2xl border border-surface-border shadow-glow-card space-y-3 transition-all hover:border-slate-600">
      {/* Top Title & Tag */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h2 className="font-bold text-white text-base tracking-tight leading-snug">
              {lang === 'hi' ? zone.hindiName : zone.name}
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {lang === 'hi' ? zone.name : zone.hindiName}
          </p>
        </div>

        {/* Dynamic Hourly Price Badge */}
        <div className="flex flex-col items-end">
          <div className="flex items-baseline gap-0.5 text-lg font-black text-white">
            <span className="text-brand-saffron">{formatCurrency(effectiveRate)}</span>
            <span className="text-[11px] font-semibold text-slate-400">{t.perHour}</span>
          </div>

          <button
            onClick={onOpenPriceExplainer}
            className="flex items-center gap-1 text-[10px] font-bold text-brand-saffron hover:underline"
          >
            <HelpCircle className="w-3 h-3 text-brand-saffron" />
            <span>{t.whyThisPrice}</span>
          </button>
        </div>
      </div>

      {/* Hospital Equity Protection Alert */}
      {isHospital && (
        <div className="p-2 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-[11px] font-medium flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400 flex-shrink-0" />
          <span>{t.equityProtectionNotice}</span>
        </div>
      )}

      {/* Live Availability Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">
            {freeBays} {t.baysAvailable}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {Math.round(zone.occupancyRate * 100)}% {t.occupied}
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isFull
                ? 'bg-red-500'
                : zone.occupancyRate > 0.75
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${Math.min(100, zone.occupancyRate * 100)}%` }}
          />
        </div>
      </div>

      {/* Amenities & Select Button */}
      <div className="pt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
          <span className="px-2 py-0.5 rounded bg-surface-hover border border-slate-700 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" /> EV Ready
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-hover border border-slate-700 flex items-center gap-1">
            <Accessibility className="w-3 h-3 text-purple-400" /> Ramp Access
          </span>
        </div>

        <button
          onClick={onOpenBaySelector}
          disabled={isFull}
          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition-all ${
            isFull
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-saffron via-amber-500 to-amber-600 text-black hover:opacity-95 shadow-glow-saffron'
          }`}
        >
          <span>{t.holdSpot}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
