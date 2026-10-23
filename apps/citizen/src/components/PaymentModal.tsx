'use client';

import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { useApp } from '../context/AppContext';
import {
  CreditCard,
  Wallet,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const { t, formatCurrency } = useI18n();
  const {
    activeReservation,
    walletBalance,
    confirmPayment,
    confirmWithWallet,
    topUpWallet
  } = useApp();

  const [activeTab, setActiveTab] = useState<'upi' | 'wallet'>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<
    'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'upi_qr'
  >('upi_gpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !activeReservation) return null;

  const baseAmount = activeReservation.estimatedAmount;
  const gstTax = Math.round(baseAmount * 0.05); // 5% Municipal GST
  const grandTotal = baseAmount + gstTax;

  const handlePayUPI = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      await confirmPayment(selectedUpiApp);
      setIsProcessing(false);
      onSuccess();
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment failed');
    }
  };

  const handlePayWallet = async () => {
    if (walletBalance < grandTotal) {
      setErrorMessage(`Insufficient balance in wallet (₹${walletBalance}). Please top up.`);
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      await confirmWithWallet();
      setIsProcessing(false);
      onSuccess();
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Wallet transaction failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-[#0E1626] rounded-3xl border border-surface-border p-5 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-white">Razorpay Secure Checkout</h2>
            <p className="text-[11px] text-slate-400 font-medium">
              MoHUA Municipal Gateway • Test Mode
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-surface-card text-slate-400 hover:text-white border border-surface-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-2xl bg-surface-card border border-surface-border">
          <button
            onClick={() => setActiveTab('upi')}
            className={`flex-1 min-h-[40px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'upi'
                ? 'bg-gradient-to-r from-brand-saffron to-amber-500 text-black font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>UPI Instant</span>
          </button>

          <button
            onClick={() => setActiveTab('wallet')}
            className={`flex-1 min-h-[40px] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'wallet'
                ? 'bg-emerald-500 text-black font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Citizen Wallet</span>
          </button>
        </div>

        {/* Tab 1: UPI Options */}
        {activeTab === 'upi' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'upi_gpay' as const, name: 'Google Pay', icon: '🟢 GPay' },
                { id: 'upi_phonepe' as const, name: 'PhonePe', icon: '🟣 PhonePe' },
                { id: 'upi_paytm' as const, name: 'Paytm UPI', icon: '🔵 Paytm' },
                { id: 'upi_qr' as const, name: 'Dynamic QR', icon: '🔳 Scan QR' }
              ].map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedUpiApp(app.id)}
                  className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold text-left transition-all flex items-center gap-2 ${
                    selectedUpiApp === app.id
                      ? 'bg-brand-saffron/20 border-brand-saffron text-white shadow-sm'
                      : 'bg-surface-card border-surface-border text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-sm">{app.icon}</span>
                  <span className="truncate">{app.name}</span>
                </button>
              ))}
            </div>

            {/* QR Simulation if selected */}
            {selectedUpiApp === 'upi_qr' && (
              <div className="p-3 rounded-2xl bg-white text-black flex flex-col items-center justify-center text-center space-y-1">
                <div className="w-32 h-32 bg-slate-100 rounded-xl border border-slate-300 flex items-center justify-center p-2">
                  <div className="w-full h-full border-4 border-dashed border-slate-400 rounded-lg flex flex-col items-center justify-center">
                    <QrCode className="w-16 h-16 text-slate-800" />
                    <span className="text-[9px] font-bold text-slate-600 mt-1">UPI://PARKSENSE</span>
                  </div>
                </div>
                <div className="text-[10px] font-bold text-slate-700">
                  Scan with any UPI app on your phone
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Tab 2: Citizen Wallet */
          <div className="p-3.5 rounded-2xl bg-surface-card border border-surface-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-medium">{t.walletBalance}</div>
                <div className="text-xl font-black text-emerald-400">
                  {formatCurrency(walletBalance)}
                </div>
              </div>

              <button
                onClick={() => topUpWallet(200)}
                className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/30 transition-all"
              >
                + Add ₹200
              </button>
            </div>

            <div className="text-[11px] text-slate-300 bg-surface-hover/60 p-2 rounded-xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Instant 1-tap municipal deduction. Auto-refunded if cancelled.</span>
            </div>
          </div>
        )}

        {/* Amount Breakdown */}
        <div className="p-3 rounded-xl bg-surface-card/60 border border-surface-border space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Parking Tariff ({activeReservation.bayNumber})</span>
            <span>{formatCurrency(baseAmount)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Municipal Service Tax (5% GST)</span>
            <span>{formatCurrency(gstTax)}</span>
          </div>
          <div className="pt-1.5 border-t border-slate-700 flex justify-between font-black text-white text-sm">
            <span>Grand Total</span>
            <span className="text-brand-saffron">{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div className="p-2 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Pay Button */}
        <button
          onClick={activeTab === 'upi' ? handlePayUPI : handlePayWallet}
          disabled={isProcessing}
          className="w-full min-h-[48px] py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-black text-sm flex items-center justify-center gap-2 shadow-glow-emerald transition-all"
        >
          {isProcessing ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Confirming with Gateway...
            </span>
          ) : (
            <>
              <span>Pay {formatCurrency(grandTotal)} & Secure Spot</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
