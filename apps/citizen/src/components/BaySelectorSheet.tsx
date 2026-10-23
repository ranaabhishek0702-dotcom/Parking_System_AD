'use client';

import React from 'react';
import { useI18n } from '../lib/i18n';
import { useApp, BayData } from '../context/AppContext';
import { X, Bike, Car, Zap, Accessibility, CheckCircle2, ShieldCheck } from 'lucide-react';

interface BaySelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBay: (bay: BayData) => void;
}

export function BaySelectorSheet({ isOpen, onClose, onSelectBay }: BaySelectorSheetProps) {
  const { lang, t, formatCurrency } = useI18n();
  const { selectedZone, bays, selectedVehicle } = useApp();

  if (!isOpen || !selectedZone) return null;

  // Filter bays by vehicle class
  const filteredBays = bays.filter((b) => {
    if (selectedVehicle === 'two_wheeler') return b.vehicleType === 'two_wheeler';
    if (selectedVehicle === 'car') return b.vehicleType === 'car';
    if (selectedVehicle === 'ev') return b.vehicleType === 'ev';
    if (selectedVehicle === 'handicapped') return b.vehicleType === 'handicapped';
    return true;
  });

  const availableCount = filteredBays.filter((b) => b.status === 'available').length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm transition-all animate-fadeIn">
      <div className="w-full max-w-md bg-[#0D1526] rounded-t-3xl border-t border-surface-border max-h-[85vh] flex flex-col shadow-2xl">
        {/* Grab Handle & Header */}
        <div className="p-4 border-b border-surface-border flex items-center justify-between">
          <div>
            <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-2" />
            <h2 className="text-base font-black text-white">
              {lang === 'hi' ? selectedZone.hindiName : selectedZone.name}
            </h2>
            <div className="text-xs font-semibold text-emerald-400">
              {availableCount} {t.available} {selectedVehicle === 'two_wheeler' ? t.twoWheeler : ''}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-surface-card text-slate-400 hover:text-white border border-surface-border"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Legend */}
        <div className="px-4 py-2 bg-surface-card/50 border-b border-surface-border flex items-center justify-around text-[10px] font-bold text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>{t.available} (Tap to lock)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>{t.reserved}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span>{t.occupied}</span>
          </div>
        </div>

        {/* Bay Grid */}
        <div className="p-4 overflow-y-auto grid grid-cols-3 xs:grid-cols-4 gap-2.5 flex-1">
          {filteredBays.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs font-medium">
              No {selectedVehicle.replace('_', ' ')} bays configured in this zone.
            </div>
          ) : (
            filteredBays.map((bay) => {
              const isAvail = bay.status === 'available';
              const isRes = bay.status === 'reserved';
              const isOcc = bay.status === 'occupied';

              return (
                <button
                  key={bay.id}
                  disabled={!isAvail}
                  onClick={() => onSelectBay(bay)}
                  className={`min-h-[58px] p-2 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${
                    isAvail
                      ? 'bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-400 hover:scale-105 active:scale-95 shadow-sm'
                      : isRes
                      ? 'bg-amber-950/20 border-amber-500/30 text-amber-400/60 cursor-not-allowed opacity-80'
                      : 'bg-red-950/20 border-red-500/30 text-red-400/60 cursor-not-allowed opacity-70'
                  }`}
                >
                  <span
                    className={`text-xs font-black tracking-tight ${
                      isAvail ? 'text-white' : 'text-slate-400'
                    }`}
                  >
                    {bay.bayNumber}
                  </span>

                  <span
                    className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                      isAvail
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : isRes
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-red-500/20 text-red-300'
                    }`}
                  >
                    {isAvail ? 'FREE' : isRes ? 'HOLD' : 'BUSY'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
