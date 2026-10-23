'use client';

import React, { useState } from 'react';
import { useI18n } from '../lib/i18n';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  Wallet,
  Bell,
  Wifi,
  WifiOff,
  Globe,
  Sparkles,
  FileText
} from 'lucide-react';

interface HeaderProps {
  onOpenWallet: () => void;
  onOpenNotifications: () => void;
  onOpenReport: () => void;
  onOpenHistory: () => void;
}

export function Header({
  onOpenWallet,
  onOpenNotifications,
  onOpenReport,
  onOpenHistory
}: HeaderProps) {
  const { lang, setLang, t, formatCurrency } = useI18n();
  const { walletBalance, lowBandwidth, toggleLowBandwidth, isOnline, notifications } = useApp();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-[#0B111E]/95 backdrop-blur-md border-b border-surface-border px-3 py-2.5 transition-all">
      <div className="max-w-md mx-auto flex items-center justify-between gap-2">
        {/* Brand & MoHUA Emblem */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-saffron via-amber-500 to-emerald-400 p-0.5 shadow-glow-saffron flex items-center justify-center">
            <div className="w-full h-full bg-[#0B111E] rounded-[10px] flex items-center justify-center font-black text-brand-saffron text-base tracking-tighter">
              P<span className="text-emerald-400">S</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-base tracking-tight leading-none">
                {t.appName}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-brand-saffron/20 text-brand-saffron border border-brand-saffron/30">
                MoHUA
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
              {t.smartCityBadge}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Low Bandwidth Toggle */}
          <button
            onClick={toggleLowBandwidth}
            title={t.lowBandwidthMode}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              lowBandwidth
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-surface-card text-slate-400 border border-surface-border hover:text-slate-200'
            }`}
          >
            {lowBandwidth ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span className="hidden xs:inline text-[11px]">{t.lowBandwidthMode}</span>
          </button>

          {/* Wallet Balance Pill */}
          <button
            onClick={onOpenWallet}
            className="px-2 py-1 rounded-lg bg-surface-card border border-surface-border hover:border-brand-saffron/50 flex items-center gap-1 text-xs font-bold text-emerald-400 transition-all"
          >
            <Wallet className="w-3.5 h-3.5 text-brand-saffron" />
            <span>{formatCurrency(walletBalance)}</span>
          </button>

          {/* History Icon */}
          <button
            onClick={onOpenHistory}
            className="p-1.5 rounded-lg bg-surface-card border border-surface-border text-slate-300 hover:text-white transition-all"
            title={t.history}
          >
            <FileText className="w-4 h-4 text-slate-300" />
          </button>

          {/* Notification Bell with Badge */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-lg bg-surface-card border border-surface-border text-slate-300 hover:text-white transition-all"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-saffron text-[#0B111E] font-extrabold text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Language Toggle (EN / हिंदी) */}
          <button
            onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
            className="px-2 py-1 rounded-lg bg-gradient-to-r from-surface-card to-surface-hover border border-surface-border text-xs font-bold text-brand-saffron hover:border-brand-saffron transition-all flex items-center gap-1"
          >
            <Globe className="w-3 h-3 text-slate-400" />
            <span>{lang === 'en' ? 'हिंदी' : 'EN'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
