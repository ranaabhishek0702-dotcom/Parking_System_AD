'use client';

import React from 'react';
import { useI18n } from '../lib/i18n';
import { useApp, ReservationState } from '../context/AppContext';
import { FileText, X, Clock, MapPin, CheckCircle2, ShieldCheck, ChevronRight } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewReceipt: (res: ReservationState) => void;
}

export function HistoryModal({ isOpen, onClose, onViewReceipt }: HistoryModalProps) {
  const { lang, t, formatCurrency } = useI18n();
  const { bookingHistory } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-[#0E1626] rounded-3xl border border-surface-border p-5 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <FileText className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-black text-white">{t.history}</h2>
              <p className="text-[11px] text-slate-400 font-medium">
                Past Reservations & Invoices
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

        {/* History List */}
        <div className="overflow-y-auto space-y-2.5 flex-1 pr-1">
          {bookingHistory.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs font-medium space-y-1">
              <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p>No past parking sessions yet.</p>
              <p className="text-[11px] text-slate-500">Your completed parking receipts will appear here.</p>
            </div>
          ) : (
            bookingHistory.map((item) => {
              const dateStr = new Date(item.startTime).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <div
                  key={item.reservationId}
                  className="p-3 bg-surface-card rounded-2xl border border-surface-border hover:border-slate-600 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white block">{item.zoneName}</span>
                      <span className="text-[10px] text-slate-400">Bay {item.bayNumber} • {item.vehicleNumber}</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        item.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : item.status === 'active'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-slate-700/40 text-slate-400 border border-slate-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-surface-border/60 text-xs">
                    <span className="text-slate-400 text-[11px]">{dateStr}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white">{formatCurrency(item.estimatedAmount)}</span>
                      <button
                        onClick={() => onViewReceipt(item)}
                        className="px-2 py-1 rounded-lg bg-surface-hover text-brand-saffron text-[10px] font-bold hover:bg-brand-saffron hover:text-black transition-all"
                      >
                        Receipt
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
