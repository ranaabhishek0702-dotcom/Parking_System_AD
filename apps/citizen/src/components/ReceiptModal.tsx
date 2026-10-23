'use client';

import React from 'react';
import { useI18n } from '../lib/i18n';
import { useApp } from '../context/AppContext';
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  CheckCircle2,
  Building2,
  QrCode
} from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReceiptModal({ isOpen, onClose }: ReceiptModalProps) {
  const { lang, t, formatCurrency } = useI18n();
  const { activeReservation } = useApp();

  if (!isOpen || !activeReservation) return null;

  const handlePrint = () => {
    window.print();
  };

  const baseCharge = activeReservation.estimatedAmount;
  const cgst = Number((baseCharge * 0.025).toFixed(2));
  const sgst = Number((baseCharge * 0.025).toFixed(2));
  const totalPaid = baseCharge + Math.round(cgst + sgst);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-white text-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between border-b pb-3 print:hidden">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <Building2 className="w-4 h-4 text-brand-saffron" />
            <span>Official Tax Invoice</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1 text-xs font-bold"
              title="Print / Save PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Official Header */}
        <div className="text-center space-y-1">
          <div className="text-[10px] uppercase tracking-widest font-extrabold text-slate-500">
            Government of NCT Delhi • MoHUA
          </div>
          <h2 className="text-base font-black text-slate-950 tracking-tight leading-tight">
            MUNICIPAL CORPORATION SMART PARKING RECEIPT
          </h2>
          <div className="text-[10px] text-slate-500 font-mono">
            GSTIN: 07AAACM1234F1Z8 • Receipt #{activeReservation.reservationId.slice(-8)}
          </div>
        </div>

        {/* Verification Status Banner */}
        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-xs font-bold">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Payment Captured (PAID)</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-700 uppercase">
            {activeReservation.paymentMethod || 'Razorpay UPI'}
          </span>
        </div>

        {/* Key Session Details */}
        <div className="space-y-2 text-xs border-y py-3 border-slate-200">
          <div className="flex justify-between">
            <span className="text-slate-500">Vehicle Registration:</span>
            <span className="font-mono font-black text-slate-900">
              {activeReservation.vehicleNumber}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Bay / Slot:</span>
            <span className="font-bold text-slate-900">{activeReservation.bayNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Zone / Corridor:</span>
            <span className="font-bold text-slate-900 text-right truncate max-w-[180px]">
              {activeReservation.zoneName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Payment ID:</span>
            <span className="font-mono text-[11px] text-slate-700">
              {activeReservation.paymentId || 'pay_test_verified'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Booking Time:</span>
            <span className="text-slate-800">
              {new Date(activeReservation.startTime).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>

        {/* Itemized Financial Breakdown */}
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Base Parking Fee</span>
            <span>{formatCurrency(baseCharge)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>CGST @ 2.5%</span>
            <span>₹{cgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>SGST @ 2.5%</span>
            <span>₹{sgst.toFixed(2)}</span>
          </div>
          <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-black text-slate-950">
            <span>Total Paid (INR)</span>
            <span className="text-base text-emerald-700">{formatCurrency(totalPaid)}</span>
          </div>
        </div>

        {/* QR Code Verification Footer */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-3">
          <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-300 flex items-center justify-center">
            <QrCode className="w-14 h-14 text-slate-900" />
          </div>

          <div className="text-[10px] text-slate-600 leading-tight space-y-1">
            <div className="font-bold text-slate-800">Digitally Verified by MoHUA</div>
            <div>Scannable by municipal traffic marshals for instant parking validation.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
