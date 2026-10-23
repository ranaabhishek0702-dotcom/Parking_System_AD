'use client';

import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { useApp } from '../context/AppContext';
import { Wallet, X, PlusCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { t, formatCurrency } = useI18n();
  const { walletBalance, topUpWallet } = useApp();

  const [topUpAmount, setTopUpAmount] = useState(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const handleTopUp = async () => {
    setIsProcessing(true);
    setTimeout(async () => {
      await topUpWallet(topUpAmount);
      setIsProcessing(false);
      setSuccessNotice(true);
      setTimeout(() => {
        setSuccessNotice(false);
      }, 2000);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-[#0E1626] rounded-3xl border border-surface-border p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Wallet className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-white">{t.wallet}</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                ParkSense Fast-Pay Citizen Balance
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

        {/* Balance Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-surface-card border border-emerald-500/30 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 font-medium">{t.walletBalance}</div>
            <div className="text-2xl font-black text-emerald-400">
              {formatCurrency(walletBalance)}
            </div>
          </div>
          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Active
          </span>
        </div>

        {/* Quick Top-Up Presets */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
            Select Top-Up Amount
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[100, 200, 500, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => setTopUpAmount(amt)}
                className={`min-h-[44px] py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  topUpAmount === amt
                    ? 'bg-emerald-500 text-black border-emerald-400 font-black shadow-md'
                    : 'bg-surface-card text-slate-300 border-surface-border hover:border-slate-500'
                }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>
        </div>

        {successNotice && (
          <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>₹{topUpAmount} added to wallet successfully!</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleTopUp}
          disabled={isProcessing}
          className="w-full min-h-[48px] py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-glow-emerald transition-all"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Adding Funds...
            </span>
          ) : (
            <>
              <span>Top-Up {formatCurrency(topUpAmount)} via UPI</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
