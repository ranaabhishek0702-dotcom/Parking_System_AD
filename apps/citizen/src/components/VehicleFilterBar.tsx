'use client';

import React from 'react';
import { useI18n } from '../lib/i18n';
import { useApp, VehicleFilter } from '../context/AppContext';
import { Bike, Car, Zap, Accessibility } from 'lucide-react';

export function VehicleFilterBar() {
  const { t } = useI18n();
  const { selectedVehicle, setSelectedVehicle } = useApp();

  const options: { id: VehicleFilter; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'two_wheeler',
      label: t.twoWheeler,
      icon: <Bike className="w-4 h-4" />,
      badge: '50% Tariff'
    },
    {
      id: 'car',
      label: t.car,
      icon: <Car className="w-4 h-4" />
    },
    {
      id: 'ev',
      label: t.ev,
      icon: <Zap className="w-4 h-4 text-cyan-400" />,
      badge: 'Green Pass'
    },
    {
      id: 'handicapped',
      label: t.disabledAccess,
      icon: <Accessibility className="w-4 h-4 text-purple-400" />,
      badge: '₹0 Free'
    }
  ];

  return (
    <div className="px-3 py-2 bg-[#0B111E]/80 backdrop-blur-md border-b border-surface-border">
      <div className="max-w-md mx-auto">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {options.map((opt) => {
            const isSelected = selectedVehicle === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedVehicle(opt.id)}
                className={`flex-shrink-0 min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border ${
                  isSelected
                    ? 'bg-gradient-to-r from-brand-saffron/20 to-amber-500/10 text-white border-brand-saffron shadow-glow-saffron'
                    : 'bg-surface-card text-slate-300 border-surface-border hover:bg-surface-hover hover:text-white'
                }`}
              >
                <div
                  className={`p-1 rounded-lg ${
                    isSelected ? 'bg-brand-saffron text-black' : 'bg-surface-hover text-slate-400'
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="text-left">
                  <div className="leading-tight">{opt.label}</div>
                  {opt.badge && (
                    <div
                      className={`text-[9px] font-extrabold uppercase ${
                        isSelected ? 'text-brand-saffron' : 'text-slate-400'
                      }`}
                    >
                      {opt.badge}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
