'use client';

import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';
import { useApp } from '../context/AppContext';
import {
  QrCode,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCw,
  XCircle,
  ChevronUp,
  ChevronDown,
  Navigation,
  ShieldCheck
} from 'lucide-react';

interface ActiveSessionDrawerProps {
  onOpenReceipt: () => void;
}

export function ActiveSessionDrawer({ onOpenReceipt }: ActiveSessionDrawerProps) {
  const { lang, t, formatCurrency } = useI18n();
  const {
    activeReservation,
    checkInSpot,
    extendSpotTime,
    cancelSpot
  } = useApp();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [timeRemainingStr, setTimeRemainingStr] = useState('');

  useEffect(() => {
    if (!activeReservation) return;

    const updateRemaining = () => {
      const now = Date.now();
      const end = activeReservation.endTime;
      const diffMs = end - now;

      if (diffMs <= 0) {
        setTimeRemainingStr('Time Expired');
        return;
      }

      const totalMins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      setTimeRemainingStr(`${hours}h ${mins}m`);
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [activeReservation]);

  if (!activeReservation) return null;

  const isHold = activeReservation.status === 'hold';
  const isConfirmed = activeReservation.status === 'confirmed';
  const isActive = activeReservation.status === 'active';

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await checkInSpot();
      setIsCheckingIn(false);
    } catch (err: any) {
      setIsCheckingIn(false);
      alert(err.message || 'Check-in failed');
    }
  };

  const handleExtend = async () => {
    setIsExtending(true);
    try {
      await extendSpotTime(30);
      setIsExtending(false);
    } catch (err: any) {
      setIsExtending(false);
      alert(err.message || 'Extension failed');
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel and free this parking bay?')) return;
    setIsCancelling(true);
    try {
      await cancelSpot();
      setIsCancelling(false);
    } catch (err: any) {
      setIsCancelling(false);
      alert(err.message || 'Cancel failed');
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0E1626] border-t-2 border-brand-saffron rounded-t-3xl shadow-2xl transition-all">
      <div className="max-w-md mx-auto p-4 space-y-3">
        {/* Minimized Header Pill */}
        <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
          <div className="flex items-center gap-2.5">
            <span
              className={`p-2 rounded-xl border flex items-center justify-center ${
                isActive
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : isConfirmed
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
              }`}
            >
              <Clock className="w-4 h-4 animate-pulse" />
            </span>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-white text-sm">
                  {activeReservation.bayNumber}
                </span>
                <span
                  className={`text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                    isActive
                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                      : isConfirmed
                      ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500/50'
                      : 'bg-amber-500/30 text-amber-300 border-amber-500/50'
                  }`}
                >
                  {activeReservation.status}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                {activeReservation.zoneName} • {timeRemainingStr}
              </div>
            </div>
          </div>

          <button className="p-1 text-slate-400 hover:text-white">
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
          </button>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="pt-2 border-t border-surface-border space-y-3 animate-fadeIn">
            {/* QR Code Container for Check-in */}
            <div className="p-4 rounded-2xl bg-white text-black flex flex-col items-center justify-center text-center space-y-2 shadow-inner">
              <div className="text-xs font-black tracking-wider text-slate-800">
                {t.checkInQR}
              </div>

              {/* High Contrast Rendered QR Code Pattern */}
              <div className="w-36 h-36 bg-slate-100 rounded-xl border-2 border-slate-900 p-2 flex flex-col items-center justify-center shadow-md">
                <QrCode className="w-28 h-28 text-slate-950" />
              </div>

              <div className="font-mono text-xs font-black tracking-widest text-slate-900 bg-slate-200 px-3 py-1 rounded-md">
                {activeReservation.qrToken || 'PS-DELHI-QR'}
              </div>

              <div className="text-[10px] font-bold text-slate-600">
                Vehicle: {activeReservation.vehicleNumber}
              </div>
            </div>

            {/* Check-In Action Button (if confirmed or hold) */}
            {!isActive && (
              <button
                onClick={handleCheckIn}
                disabled={isCheckingIn}
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-black font-black text-xs flex items-center justify-center gap-2 shadow-glow-emerald hover:opacity-95 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isCheckingIn ? 'Verifying Spot...' : t.tapToCheckIn}</span>
              </button>
            )}

            {/* Session Action Controls */}
            <div className="grid grid-cols-3 gap-2">
              {/* Extend */}
              <button
                onClick={handleExtend}
                disabled={isExtending}
                className="min-h-[44px] p-2 rounded-xl bg-surface-card border border-surface-border hover:border-brand-saffron/50 text-slate-200 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
              >
                <RotateCw className={`w-3.5 h-3.5 text-brand-saffron ${isExtending ? 'animate-spin' : ''}`} />
                <span>{t.extendTime}</span>
              </button>

              {/* View Receipt */}
              <button
                onClick={onOpenReceipt}
                className="min-h-[44px] p-2 rounded-xl bg-surface-card border border-surface-border hover:border-emerald-400/50 text-slate-200 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.viewReceipt}</span>
              </button>

              {/* Cancel */}
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                className="min-h-[44px] p-2 rounded-xl bg-surface-card border border-red-500/30 hover:border-red-500/60 text-red-300 text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all"
              >
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span>{t.cancelRelease}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
