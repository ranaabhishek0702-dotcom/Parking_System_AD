'use client';

import React from 'react';
import { useI18n } from '../lib/i18n';
import { useApp, ZoneData } from '../context/AppContext';
import {
  X,
  HelpCircle,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Clock,
  Info
} from 'lucide-react';

interface PriceExplanationSheetProps {
  isOpen: boolean;
  zone: ZoneData | null;
  onClose: () => void;
}

export function PriceExplanationSheet({ isOpen, zone, onClose }: PriceExplanationSheetProps) {
  const { lang, t, formatCurrency } = useI18n();
  const { selectedVehicle } = useApp();

  if (!isOpen || !zone) return null;

  const isHospital = zone.type === 'hospital';
  const is2W = selectedVehicle === 'two_wheeler';
  const baseRate = is2W ? 20 : 40;
  const currentPrice = is2W
    ? Math.max(10, Math.round(zone.currentRatePerHour * 0.5))
    : zone.currentRatePerHour;

  const occupancyFactor = Math.round(zone.occupancyRate * 100);
  const demandDelta = Math.max(0, currentPrice - baseRate);

  // Generate 6 upcoming hourly forecast slices
  const currentHour = new Date().getHours();
  const forecastHours = Array.from({ length: 6 }, (_, i) => {
    const h = (currentHour + i + 1) % 24;
    // Diurnal variation curve: lower in mid-afternoon (2-4 PM) and night (9 PM-7 AM)
    const isPeak = (h >= 9 && h <= 11) || (h >= 17 && h <= 20);
    const isOffPeak = (h >= 14 && h <= 16) || h >= 22 || h <= 7;
    const predictedRate = isHospital
      ? baseRate
      : isPeak
      ? Math.round(baseRate * 1.5)
      : isOffPeak
      ? Math.round(baseRate * 0.75)
      : baseRate;

    return {
      hour: h,
      label: `${h % 12 || 12} ${h >= 12 ? 'PM' : 'AM'}`,
      rate: predictedRate,
      occupancy: isPeak ? '85%' : isOffPeak ? '42%' : '65%',
      isCheapest: isOffPeak && i === 1
    };
  });

  const cheapestSlot = forecastHours.find((f) => f.isCheapest) || forecastHours[1];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-[#0D1526] rounded-t-3xl border-t border-surface-border p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-saffron/20 text-brand-saffron border border-brand-saffron/30">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-white">{t.whyThisPrice}</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {lang === 'hi' ? zone.hindiName : zone.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-surface-card text-slate-400 hover:text-white border border-surface-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Dynamic Breakdown */}
        <div className="p-4 rounded-2xl bg-surface-card border border-surface-border space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span>Base Civic Tariff ({selectedVehicle.replace('_', ' ')})</span>
            <span className="font-bold text-white">{formatCurrency(baseRate)}</span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span className="flex items-center gap-1">
              Demand & Occupancy ({occupancyFactor}%)
              {demandDelta > 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-brand-saffron inline" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-emerald-400 inline" />
              )}
            </span>
            <span className="font-bold text-brand-saffron">
              {demandDelta > 0 ? `+${formatCurrency(demandDelta)}` : '₹0'}
            </span>
          </div>

          <div className="flex justify-between items-center text-slate-300">
            <span>Weather & Event Uplift</span>
            <span className="font-bold text-slate-400">+₹0</span>
          </div>

          {isHospital && (
            <div className="flex justify-between items-center text-purple-300 font-bold bg-purple-950/30 p-2 rounded-lg border border-purple-500/30">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Hospital Emergency Equity Cap
              </span>
              <span>Rate Capped</span>
            </div>
          )}

          <div className="pt-2 border-t border-slate-700 flex justify-between items-center text-sm font-black text-white">
            <span>Effective Rate Now</span>
            <span className="text-base text-brand-saffron">{formatCurrency(currentPrice)}/hr</span>
          </div>
        </div>

        {/* "Best Time to Arrive" Forecast Uplift */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-900 border border-emerald-500/40 space-y-3">
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-black">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>{t.bestTimeToArrive}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-emerald-500/30 text-[11px] text-slate-200 leading-relaxed">
            💡 <strong className="text-emerald-400">Arrive around {cheapestSlot.label}:</strong> Rate drops to{' '}
            <strong className="text-white">{formatCurrency(cheapestSlot.rate)}/hr</strong> ({cheapestSlot.occupancy} occupancy). Save up to{' '}
            <strong className="text-emerald-400">35%</strong> compared to peak hours!
          </div>

          {/* Hour-by-hour forecast bar preview */}
          <div className="grid grid-cols-6 gap-1 pt-1">
            {forecastHours.map((f, idx) => (
              <div
                key={idx}
                className={`p-1.5 rounded-lg flex flex-col items-center justify-between text-center border transition-all ${
                  f.isCheapest
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-black'
                    : 'bg-surface-card border-surface-border text-slate-400 font-semibold'
                }`}
              >
                <span className="text-[9px] truncate">{f.label}</span>
                <span className="text-[11px] font-bold text-white mt-1">
                  {formatCurrency(f.rate)}
                </span>
                <span className="text-[8px] text-slate-400 mt-0.5">{f.occupancy}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
