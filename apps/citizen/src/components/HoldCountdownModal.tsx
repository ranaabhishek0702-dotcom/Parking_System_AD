'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { useApp, BayData } from '../context/AppContext';
import {
  Clock,
  Lock,
  ShieldCheck,
  X,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Bike,
  Car
} from 'lucide-react';

interface HoldCountdownModalProps {
  isOpen: boolean;
  bay: BayData | null;
  onClose: () => void;
  onProceedToPayment: () => void;
}

export function HoldCountdownModal({
  isOpen,
  bay,
  onClose,
  onProceedToPayment
}: HoldCountdownModalProps) {
  const { lang, t, formatCurrency } = useI18n();
  const { selectedZone, selectedVehicle, createHold, activeReservation } = useApp();

  const [vehicleNumber, setVehicleNumber] = useState('DL01AB9482');
  const [durationHours, setDurationHours] = useState(1);
  const [secondsRemaining, setSecondsRemaining] = useState(600); // 10 minutes
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 10-minute countdown timer
  useEffect(() => {
    if (!isOpen) return;
    setSecondsRemaining(600);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          alert('10-Minute Hold Expired! Bay has been auto-released.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  if (!isOpen || !bay || !selectedZone) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Vehicle rate computation
  let baseRate = selectedZone.currentRatePerHour;
  if (selectedVehicle === 'two_wheeler') baseRate = Math.max(10, Math.round(baseRate * 0.5));
  else if (selectedVehicle === 'ev') baseRate = Math.round(baseRate * 0.75);
  else if (selectedVehicle === 'handicapped') baseRate = 0;

  const totalAmount = baseRate * durationHours;

  const handleHoldAndProceed = async () => {
    if (!vehicleNumber.trim()) {
      setErrorMsg('Please enter a valid vehicle plate number');
      return;
    }
    setErrorMsg('');
    setIsLoading(true);

    try {
      await createHold(selectedZone.id, bay.id, vehicleNumber.toUpperCase().trim(), durationHours * 60);
      setIsLoading(false);
      onProceedToPayment();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Conflict: Bay is no longer available. Please choose another spot.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-[#0E1626] rounded-3xl border border-surface-border p-5 shadow-2xl space-y-4">
        {/* Header & Close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-saffron/20 text-brand-saffron border border-brand-saffron/30">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-white">{t.holdSpot}</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                {bay.bayNumber} • {lang === 'hi' ? selectedZone.hindiName : selectedZone.name}
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

        {/* 10-Minute Hold Countdown Banner */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-brand-saffron/15 to-amber-500/10 border border-brand-saffron/40 flex items-center justify-between shadow-glow-saffron">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-brand-saffron animate-pulse" />
            <div>
              <div className="text-[11px] font-bold text-white leading-tight">
                {t.holdExpiresIn}
              </div>
              <div className="text-[10px] text-brand-saffron/80 font-medium">
                Reserved exclusively for you
              </div>
            </div>
          </div>

          <div className="text-xl font-black text-brand-saffron font-mono tracking-wider bg-black/40 px-2.5 py-1 rounded-xl border border-brand-saffron/30">
            {formattedTime}
          </div>
        </div>

        {/* Price Lock Banner */}
        <div className="px-3 py-2 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-emerald-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            {t.priceLockedAt} {formatCurrency(baseRate)}
            {t.perHour}
          </span>
        </div>

        {/* Vehicle Number Input */}
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            {t.vehicleNumber}
          </label>
          <div className="relative">
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
              placeholder="DL 01 AB 1234"
              className="w-full min-h-[44px] px-3 py-2 rounded-xl bg-surface-card border border-surface-border text-white font-mono font-bold text-sm tracking-wider uppercase focus:border-brand-saffron focus:outline-none"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              IND
            </span>
          </div>
        </div>

        {/* Duration Selector */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            {t.duration}
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[1, 2, 3, 4].map((hrs) => (
              <button
                key={hrs}
                type="button"
                onClick={() => setDurationHours(hrs)}
                className={`min-h-[44px] py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  durationHours === hrs
                    ? 'bg-brand-saffron text-black border-brand-saffron font-black shadow-md'
                    : 'bg-surface-card text-slate-300 border-surface-border hover:border-slate-500'
                }`}
              >
                {hrs} hr{hrs > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Estimated Amount Breakdown */}
        <div className="pt-2 border-t border-surface-border flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">
            Total ({durationHours} hr{durationHours > 1 ? 's' : ''} @ {formatCurrency(baseRate)}/hr)
          </span>
          <span className="text-lg font-black text-white">{formatCurrency(totalAmount)}</span>
        </div>

        {/* Error message if conflict */}
        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-950/50 border border-red-500/50 text-red-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleHoldAndProceed}
          disabled={isLoading}
          className="w-full min-h-[48px] py-2.5 rounded-xl bg-gradient-to-r from-brand-saffron via-amber-500 to-amber-600 text-black font-black text-sm flex items-center justify-center gap-2 shadow-glow-saffron hover:opacity-95 transition-all"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Securing Spot...
            </span>
          ) : (
            <>
              <span>{t.payAndConfirm}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
