'use client';

import React, { useState, useMemo } from 'react';
import { useI18n } from '../lib/i18n';
import { useApp, ZoneData, BayData, ReservationState } from '../context/AppContext';
import { Header } from '../components/Header';
import { VehicleFilterBar } from '../components/VehicleFilterBar';
import { SearchAndSortBar } from '../components/SearchAndSortBar';
import { LiveMap } from '../components/LiveMap';
import { ZoneCard } from '../components/ZoneCard';
import { BaySelectorSheet } from '../components/BaySelectorSheet';
import { HoldCountdownModal } from '../components/HoldCountdownModal';
import { PaymentModal } from '../components/PaymentModal';
import { ActiveSessionDrawer } from '../components/ActiveSessionDrawer';
import { ReceiptModal } from '../components/ReceiptModal';
import { PriceExplanationSheet } from '../components/PriceExplanationSheet';
import { ReportViolationModal } from '../components/ReportViolationModal';
import { NotificationDrawer } from '../components/NotificationDrawer';
import { WalletModal } from '../components/WalletModal';
import { HistoryModal } from '../components/HistoryModal';
import { ShieldAlert, AlertTriangle, Layers, Navigation, Sparkles, MapPin } from 'lucide-react';

export default function CitizenAppPage() {
  const { lang, t, formatCurrency } = useI18n();
  const {
    zones,
    selectedZone,
    setSelectedZone,
    selectedVehicle,
    searchQuery,
    sortMode,
    activeReservation,
    isOnline
  } = useApp();

  // Modals state
  const [baySelectorOpen, setBaySelectorOpen] = useState(false);
  const [selectedBay, setSelectedBay] = useState<BayData | null>(null);
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [priceExplainerOpen, setPriceExplainerOpen] = useState(false);
  const [explainingZone, setExplainingZone] = useState<ZoneData | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Compute effective price by vehicle
  const getVehicleRate = (baseRate: number) => {
    if (selectedVehicle === 'two_wheeler') return Math.max(10, Math.round(baseRate * 0.5));
    if (selectedVehicle === 'ev') return Math.round(baseRate * 0.75);
    if (selectedVehicle === 'handicapped') return 0;
    return baseRate;
  };

  // Filter and sort zones
  const filteredAndSortedZones = useMemo(() => {
    let list = [...zones];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (z) =>
          z.name.toLowerCase().includes(q) ||
          z.hindiName.includes(q) ||
          z.id.toLowerCase().includes(q) ||
          z.type.toLowerCase().includes(q)
      );
    }

    // Sort mode
    if (sortMode === 'cheapest') {
      list.sort((a, b) => getVehicleRate(a.currentRatePerHour) - getVehicleRate(b.currentRatePerHour));
    } else if (sortMode === 'walking') {
      // Prioritize zones with higher available bays & lowest congestion
      list.sort((a, b) => b.availableBays - a.availableBays);
    } else {
      // Nearest default: CP inner circle first, then others
      list.sort((a, b) => {
        if (a.id === 'delhi-cp-inner') return -1;
        if (b.id === 'delhi-cp-inner') return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return list;
  }, [zones, searchQuery, sortMode, selectedVehicle]);

  return (
    <div className="min-h-screen bg-[#0B111E] text-slate-100 flex flex-col max-w-md mx-auto relative shadow-2xl pb-24 border-x border-surface-border/50">
      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 px-3 py-1.5 text-center text-xs font-bold text-black flex items-center justify-center gap-1.5 animate-pulse">
          <AlertTriangle className="w-4 h-4" />
          <span>Offline mode active. Showing cached map and bays.</span>
        </div>
      )}

      {/* Header */}
      <Header
        onOpenWallet={() => setWalletModalOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenReport={() => setReportModalOpen(true)}
        onOpenHistory={() => setHistoryModalOpen(true)}
      />

      {/* Vehicle Type Selector Bar (2W is default) */}
      <VehicleFilterBar />

      {/* Search and Sort Toolbar */}
      <SearchAndSortBar />

      {/* Live Map Display */}
      <div className="relative">
        <LiveMap
          onSelectZone={(zone) => {
            setSelectedZone(zone);
            setBaySelectorOpen(true);
          }}
          onOpenPriceExplainer={(zone) => {
            setExplainingZone(zone);
            setPriceExplainerOpen(true);
          }}
        />

        {/* Live Map Overlay Label */}
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded-full bg-[#0B111E]/80 backdrop-blur-md border border-surface-border text-[10px] font-bold text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            RTDB Live
          </span>
        </div>
      </div>

      {/* Street Parking Zones List */}
      <main className="p-3 space-y-3 flex-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-brand-saffron" />
            <span>
              {lang === 'hi' ? 'सक्रिय स्ट्रीट-पार्किंग ज़ोन' : 'Active Street Parking Zones'}
            </span>
            <span className="px-1.5 py-0.2 rounded bg-surface-card text-white text-[10px]">
              {filteredAndSortedZones.length}
            </span>
          </h2>

          <button
            onClick={() => setReportModalOpen(true)}
            className="text-[11px] font-bold text-brand-saffron hover:underline flex items-center gap-1"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-brand-saffron" />
            <span>{t.report}</span>
          </button>
        </div>

        {filteredAndSortedZones.length === 0 ? (
          <div className="p-8 text-center bg-surface-card rounded-2xl border border-surface-border text-slate-400 text-xs font-medium space-y-2">
            <MapPin className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No zones found matching "{searchQuery}".</p>
            <p className="text-[11px] text-slate-500">Try searching for Connaught Place, Karol Bagh, or Khan Market.</p>
          </div>
        ) : (
          filteredAndSortedZones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              onOpenBaySelector={() => {
                setSelectedZone(zone);
                setBaySelectorOpen(true);
              }}
              onOpenPriceExplainer={() => {
                setExplainingZone(zone);
                setPriceExplainerOpen(true);
              }}
            />
          ))
        )}
      </main>

      {/* Floating Action Bar / Violation Quick Report */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-3 bg-gradient-to-t from-[#0B111E] via-[#0B111E]/95 to-transparent z-30 pointer-events-none flex flex-col gap-2">
        <div className="pointer-events-auto flex items-center justify-between gap-2">
          <button
            onClick={() => setReportModalOpen(true)}
            className="flex-1 min-h-[46px] px-3 py-2 rounded-2xl bg-surface-card/90 hover:bg-surface-card border border-surface-border shadow-lg backdrop-blur-md flex items-center justify-center gap-2 text-xs font-bold text-slate-200 transition-all hover:border-brand-saffron/40 active:scale-95"
          >
            <ShieldAlert className="w-4 h-4 text-brand-saffron" />
            <span>{lang === 'hi' ? 'अवैध पार्किंग रिपोर्ट करें' : 'Report Illegal Parking'}</span>
          </button>

          {activeReservation && (
            <button
              onClick={() => {
                if (activeReservation.status === 'hold') {
                  setPaymentModalOpen(true);
                }
              }}
              className="min-h-[46px] px-4 py-2 rounded-2xl bg-brand-saffron hover:bg-orange-600 text-black font-extrabold text-xs shadow-glow-saffron flex items-center gap-1.5 transition-all active:scale-95 animate-pulse"
            >
              <span>{activeReservation.status === 'hold' ? 'Pay Now' : 'Active Session'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Session Sticky Drawer */}
      <ActiveSessionDrawer onOpenReceipt={() => setReceiptModalOpen(true)} />

      {/* Sheets & Modals */}
      <BaySelectorSheet
        isOpen={baySelectorOpen}
        onClose={() => setBaySelectorOpen(false)}
        onSelectBay={(bay) => {
          setSelectedBay(bay);
          setBaySelectorOpen(false);
          setHoldModalOpen(true);
        }}
      />

      <HoldCountdownModal
        isOpen={holdModalOpen}
        bay={selectedBay}
        onClose={() => setHoldModalOpen(false)}
        onProceedToPayment={() => {
          setHoldModalOpen(false);
          setPaymentModalOpen(true);
        }}
      />

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSuccess={() => {
          setPaymentModalOpen(false);
          setReceiptModalOpen(true);
        }}
      />

      <ReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
      />

      <PriceExplanationSheet
        isOpen={priceExplainerOpen}
        zone={explainingZone || selectedZone}
        onClose={() => setPriceExplainerOpen(false)}
      />

      <ReportViolationModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
      />

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      <NotificationDrawer
        isOpen={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        onPayNow={() => {
          setNotificationsOpen(false);
          setPaymentModalOpen(true);
        }}
      />

      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        onViewReceipt={(res) => {
          setHistoryModalOpen(false);
          setReceiptModalOpen(true);
        }}
      />
    </div>
  );
}
