'use client';

import React from 'react';
import { useI18n } from '../lib/i18n';
import { useApp } from '../context/AppContext';
import {
  Bell,
  X,
  AlertTriangle,
  Clock,
  TrendingDown,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onPayNow?: () => void;
  onExtend?: () => void;
}

export function NotificationDrawer({
  isOpen,
  onClose,
  onPayNow,
  onExtend
}: NotificationDrawerProps) {
  const { lang, t } = useI18n();
  const { notifications, dismissNotification } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-sm bg-[#0E1626] rounded-3xl border border-surface-border p-4 shadow-2xl space-y-3 mt-12 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-brand-saffron/20 text-brand-saffron border border-brand-saffron/30">
              <Bell className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-black text-white">Notifications & Alerts</h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-surface-card text-slate-400 hover:text-white border border-surface-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto space-y-2 flex-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              No new alerts. You will be notified when your hold or parking is expiring.
            </div>
          ) : (
            notifications.map((n) => {
              const isHold = n.type === 'hold_expiry';
              const isExpiry = n.type === 'session_expiry';
              const isPrice = n.type === 'price_drop';

              return (
                <div
                  key={n.id}
                  className={`p-3 rounded-2xl border transition-all space-y-2 ${
                    isHold
                      ? 'bg-amber-950/30 border-amber-500/40'
                      : isExpiry
                      ? 'bg-red-950/30 border-red-500/40'
                      : 'bg-emerald-950/30 border-emerald-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isHold ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      ) : isExpiry ? (
                        <Clock className="w-4 h-4 text-red-400 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      )}
                      <h4 className="text-xs font-bold text-white">
                        {lang === 'hi' ? n.hindiTitle : n.title}
                      </h4>
                    </div>

                    <button
                      onClick={() => dismissNotification(n.id)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug">
                    {lang === 'hi' ? n.hindiMessage : n.message}
                  </p>

                  {/* Context Action */}
                  <div className="flex justify-end gap-1.5 pt-1">
                    {isHold && onPayNow && (
                      <button
                        onClick={() => {
                          onClose();
                          onPayNow();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-black text-[10px]"
                      >
                        Complete Payment
                      </button>
                    )}
                    {isExpiry && onExtend && (
                      <button
                        onClick={() => {
                          onClose();
                          onExtend();
                        }}
                        className="px-2.5 py-1 rounded-lg bg-red-500 text-white font-black text-[10px]"
                      >
                        Extend +30m
                      </button>
                    )}
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
