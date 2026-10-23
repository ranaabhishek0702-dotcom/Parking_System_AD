'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { rtdb, FUNCTIONS_BASE_URL, auth } from '../lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { RazorpayUPIProvider, CitizenWalletProvider, PaymentResponse } from '../lib/payment';

export type VehicleFilter = 'two_wheeler' | 'car' | 'ev' | 'handicapped';

export interface ZoneData {
  id: string;
  name: string;
  hindiName: string;
  type: string;
  totalBays: number;
  availableBays: number;
  occupiedBays: number;
  reservedBays: number;
  occupancyRate: number;
  currentRatePerHour: number;
  location: { lat: number; lng: number };
  amenities: { hasEV: boolean; hasDisabled: boolean; covered: boolean };
}

export interface BayData {
  id: string;
  zoneId: string;
  bayNumber: string;
  vehicleType: string;
  status: 'available' | 'occupied' | 'reserved' | 'violation' | 'maintenance';
  isReserved?: boolean;
}

export interface ReservationState {
  reservationId: string;
  zoneId: string;
  zoneName: string;
  bayId: string;
  bayNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  status: 'hold' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired';
  holdExpiresAt?: number;
  startTime: number;
  endTime: number;
  lockedHourlyRate: number;
  estimatedAmount: number;
  qrToken?: string;
  paymentId?: string;
  paymentMethod?: string;
  receiptData?: PaymentResponse;
}

export interface NotificationItem {
  id: string;
  type: 'hold_expiry' | 'session_expiry' | 'price_drop' | 'violation_filed';
  title: string;
  hindiTitle: string;
  message: string;
  hindiMessage: string;
  timestamp: number;
  read: boolean;
}

interface AppContextType {
  selectedVehicle: VehicleFilter;
  setSelectedVehicle: (v: VehicleFilter) => void;
  zones: ZoneData[];
  selectedZone: ZoneData | null;
  setSelectedZone: (z: ZoneData | null) => void;
  bays: BayData[];
  activeReservation: ReservationState | null;
  walletBalance: number;
  topUpWallet: (amount: number) => Promise<void>;
  createHold: (zoneId: string, bayId: string, vehicleNumber: string, durationMinutes: number) => Promise<any>;
  confirmPayment: (subMethod?: 'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'upi_qr') => Promise<PaymentResponse>;
  confirmWithWallet: () => Promise<PaymentResponse>;
  checkInSpot: () => Promise<void>;
  extendSpotTime: (minutes: number) => Promise<void>;
  cancelSpot: () => Promise<void>;
  bookingHistory: ReservationState[];
  notifications: NotificationItem[];
  dismissNotification: (id: string) => void;
  lowBandwidth: boolean;
  toggleLowBandwidth: () => void;
  isOnline: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  sortMode: 'nearest' | 'cheapest' | 'walking';
  setSortMode: (s: 'nearest' | 'cheapest' | 'walking') => void;
}

const ZONES_METADATA: Record<string, { name: string; hindiName: string; lat: number; lng: number; type: string }> = {
  'delhi-cp-inner': {
    name: 'Connaught Place Inner Circle',
    hindiName: 'कनॉट प्लेस इनर सर्कल',
    lat: 28.6328,
    lng: 77.2197,
    type: 'market'
  },
  'delhi-khan-market': {
    name: 'Khan Market Premium Hub',
    hindiName: 'खान मार्केट प्रीमियम हब',
    lat: 28.6003,
    lng: 77.2269,
    type: 'market'
  },
  'delhi-karol-bagh': {
    name: 'Karol Bagh Market',
    hindiName: 'करोल बाग मार्केट',
    lat: 28.6517,
    lng: 77.1906,
    type: 'market'
  },
  'delhi-lajpat-nagar': {
    name: 'Lajpat Nagar Central Market',
    hindiName: 'लाजपत नगर सेंट्रल मार्केट',
    lat: 28.5700,
    lng: 77.2435,
    type: 'market'
  },
  'gurugram-cyber-city': {
    name: 'DLF Cyber City Tech District',
    hindiName: 'डीएलएफ साइबर सिटी',
    lat: 28.4950,
    lng: 77.0895,
    type: 'office'
  },
  'delhi-aiims-emergency': {
    name: 'AIIMS Emergency & Trauma Care',
    hindiName: 'एम्स आपातकालीन और ट्रॉमा केयर',
    lat: 28.5672,
    lng: 77.2100,
    type: 'hospital'
  },
  'delhi-chandni-chowk': {
    name: 'Chandni Chowk Heritage Corridor',
    hindiName: 'चांदनी चौक हेरिटेज कॉरिडोर',
    lat: 28.6562,
    lng: 77.2300,
    type: 'market'
  },
  'gurugram-huda-metro': {
    name: 'Millennium City Metro Terminal',
    hindiName: 'मिलेनियम सिटी मेट्रो टर्मिनल',
    lat: 28.4595,
    lng: 77.0725,
    type: 'transit'
  },
  'delhi-nehru-place': {
    name: 'Nehru Place Commercial Square',
    hindiName: 'नेहरू प्लेस कमर्शियल स्क्वायर',
    lat: 28.5494,
    lng: 77.2528,
    type: 'market'
  }
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  // Two-Wheeler is the default filter option as required
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleFilter>('two_wheeler');
  const [zones, setZones] = useState<ZoneData[]>([]);
  const [selectedZone, setSelectedZone] = useState<ZoneData | null>(null);
  const [bays, setBays] = useState<BayData[]>([]);
  const [activeReservation, setActiveReservation] = useState<ReservationState | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(350);
  const [bookingHistory, setBookingHistory] = useState<ReservationState[]>([]);
  const [lowBandwidth, setLowBandwidth] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortMode, setSortMode] = useState<'nearest' | 'cheapest' | 'walking'>('nearest');
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'notif-1',
      type: 'price_drop',
      title: 'Price Drop in Connaught Place',
      hindiTitle: 'कनॉट प्लेस में शुल्क घटा',
      message: 'Rate reduced to ₹20/hr. 18 two-wheeler slots available now.',
      hindiMessage: 'शुल्क घटकर ₹20/घंटा हुआ। अभी 18 दोपहिया स्थान उपलब्ध हैं।',
      timestamp: Date.now() - 1000 * 60 * 12,
      read: false
    }
  ]);

  // Load persisted state
  useEffect(() => {
    try {
      const savedWallet = localStorage.getItem('parksense_wallet');
      if (savedWallet) setWalletBalance(Number(savedWallet));

      const savedReservation = localStorage.getItem('parksense_active_res');
      if (savedReservation) setActiveReservation(JSON.parse(savedReservation));

      const savedHistory = localStorage.getItem('parksense_history');
      if (savedHistory) setBookingHistory(JSON.parse(savedHistory));

      const savedLowBand = localStorage.getItem('parksense_low_bw');
      if (savedLowBand) setLowBandwidth(savedLowBand === 'true');
    } catch (e) {}

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to RTDB live_zones
  useEffect(() => {
    const liveZonesRef = ref(rtdb, 'live_zones');
    const unsubscribe = onValue(liveZonesRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const zonesList: ZoneData[] = Object.keys(val).map((id) => {
          const zData = val[id];
          const meta = ZONES_METADATA[id] || {
            name: id.replace(/-/g, ' ').toUpperCase(),
            hindiName: id,
            lat: 28.6139,
            lng: 77.2090,
            type: 'market'
          };

          return {
            id,
            name: meta.name,
            hindiName: meta.hindiName,
            type: meta.type,
            totalBays: zData.totalBays || 40,
            availableBays: zData.availableBays || 0,
            occupiedBays: zData.occupiedBays || 0,
            reservedBays: zData.reservedBays || 0,
            occupancyRate: zData.occupancyRate || 0,
            currentRatePerHour: zData.currentRatePerHour || 20,
            location: { lat: meta.lat, lng: meta.lng },
            amenities: {
              hasEV: true,
              hasDisabled: true,
              covered: meta.type === 'hospital' || meta.type === 'transit'
            }
          };
        });
        setZones(zonesList);
        if (!selectedZone && zonesList.length > 0) {
          setSelectedZone(zonesList[0]);
        }
      }
    });

    return () => off(liveZonesRef);
  }, [selectedZone]);

  // Listen to RTDB live_bays for selectedZone
  useEffect(() => {
    if (!selectedZone) return;
    const baysRef = ref(rtdb, `live_bays/${selectedZone.id}`);
    const unsubscribe = onValue(baysRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const baysList: BayData[] = Object.keys(val).map((bayId) => {
          const b = val[bayId];
          const numMatch = bayId.match(/(2w|c|ev|ha)-(\d+)/i);
          const bayNum = numMatch ? `${numMatch[1].toUpperCase()}-${numMatch[2]}` : bayId.slice(-5);

          return {
            id: bayId,
            zoneId: selectedZone.id,
            bayNumber: bayNum,
            vehicleType: b.vehicleType || 'two_wheeler',
            status: b.isReserved ? 'reserved' : b.status || 'available',
            isReserved: b.isReserved || false
          };
        });
        setBays(baysList);
      }
    });

    return () => off(baysRef);
  }, [selectedZone]);

  // Auto-check hold expiration
  useEffect(() => {
    if (!activeReservation || activeReservation.status !== 'hold') return;

    const interval = setInterval(() => {
      if (activeReservation.holdExpiresAt && Date.now() > activeReservation.holdExpiresAt) {
        // Expired!
        const expired = { ...activeReservation, status: 'expired' as const };
        setActiveReservation(null);
        localStorage.removeItem('parksense_active_res');
        alert('Hold expired! The 10-minute lock on your spot has timed out.');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeReservation]);

  const toggleLowBandwidth = () => {
    setLowBandwidth((prev) => {
      const next = !prev;
      localStorage.setItem('parksense_low_bw', String(next));
      return next;
    });
  };

  const topUpWallet = async (amount: number) => {
    const newBal = walletBalance + amount;
    setWalletBalance(newBal);
    localStorage.setItem('parksense_wallet', String(newBal));
  };

  const createHold = async (
    zoneId: string,
    bayId: string,
    vehicleNumber: string,
    durationMinutes: number
  ) => {
    const res = await fetch(`${FUNCTIONS_BASE_URL}/createHold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        zoneId,
        bayId,
        vehicleNumber,
        vehicleType: selectedVehicle,
        durationMinutes,
        userId: auth.currentUser?.uid || 'citizen-demo'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to lock spot');
    }

    const zone = zones.find((z) => z.id === zoneId);
    const bay = bays.find((b) => b.id === bayId);

    const newRes: ReservationState = {
      reservationId: data.reservationId,
      zoneId,
      zoneName: zone ? zone.name : zoneId,
      bayId,
      bayNumber: bay ? bay.bayNumber : bayId,
      vehicleNumber,
      vehicleType: selectedVehicle,
      status: 'hold',
      holdExpiresAt: data.holdExpiresAt,
      startTime: Date.now(),
      endTime: Date.now() + durationMinutes * 60 * 1000,
      lockedHourlyRate: data.lockedHourlyRate,
      estimatedAmount: data.estimatedAmount,
      qrToken: data.qrToken
    };

    setActiveReservation(newRes);
    localStorage.setItem('parksense_active_res', JSON.stringify(newRes));

    // Simulated FCM notification for hold expiring in 2 mins
    setTimeout(() => {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          type: 'hold_expiry',
          title: '⚠️ 10-Minute Hold Expiring Soon',
          hindiTitle: '⚠️ 10 मिनट का होल्ड समाप्त होने वाला है',
          message: 'Only 2 minutes remaining to confirm your spot at ' + (zone?.name || 'zone'),
          hindiMessage: 'स्थान सुरक्षित करने के लिए केवल 2 मिनट शेष हैं।',
          timestamp: Date.now(),
          read: false
        },
        ...prev
      ]);
    }, 4000);

    return newRes;
  };

  const confirmPayment = async (
    subMethod: 'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'upi_qr' = 'upi_qr'
  ): Promise<PaymentResponse> => {
    if (!activeReservation) throw new Error('No active reservation to pay for');

    const provider = new RazorpayUPIProvider();
    const result = await provider.processPayment(
      {
        reservationId: activeReservation.reservationId,
        amount: activeReservation.estimatedAmount,
        userId: auth.currentUser?.uid || 'citizen-demo',
        vehicleNumber: activeReservation.vehicleNumber,
        zoneName: activeReservation.zoneName
      },
      subMethod
    );

    const confirmedState: ReservationState = {
      ...activeReservation,
      status: 'confirmed',
      paymentId: result.paymentId,
      paymentMethod: subMethod,
      receiptData: result
    };

    setActiveReservation(confirmedState);
    localStorage.setItem('parksense_active_res', JSON.stringify(confirmedState));

    const updatedHistory = [confirmedState, ...bookingHistory];
    setBookingHistory(updatedHistory);
    localStorage.setItem('parksense_history', JSON.stringify(updatedHistory));

    return result;
  };

  const confirmWithWallet = async (): Promise<PaymentResponse> => {
    if (!activeReservation) throw new Error('No active reservation');

    const provider = new CitizenWalletProvider(walletBalance, (amount) => {
      const newBal = walletBalance - amount;
      setWalletBalance(newBal);
      localStorage.setItem('parksense_wallet', String(newBal));
    });

    const result = await provider.processPayment({
      reservationId: activeReservation.reservationId,
      amount: activeReservation.estimatedAmount,
      userId: auth.currentUser?.uid || 'citizen-demo',
      vehicleNumber: activeReservation.vehicleNumber,
      zoneName: activeReservation.zoneName
    });

    const confirmedState: ReservationState = {
      ...activeReservation,
      status: 'confirmed',
      paymentId: result.paymentId,
      paymentMethod: 'wallet',
      receiptData: result
    };

    setActiveReservation(confirmedState);
    localStorage.setItem('parksense_active_res', JSON.stringify(confirmedState));

    const updatedHistory = [confirmedState, ...bookingHistory];
    setBookingHistory(updatedHistory);
    localStorage.setItem('parksense_history', JSON.stringify(updatedHistory));

    return result;
  };

  const checkInSpot = async () => {
    if (!activeReservation) return;

    const res = await fetch(`${FUNCTIONS_BASE_URL}/checkIn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: activeReservation.reservationId,
        qrToken: activeReservation.qrToken,
        vehicleNumber: activeReservation.vehicleNumber
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Check-in failed');
    }

    const updated: ReservationState = {
      ...activeReservation,
      status: 'active'
    };
    setActiveReservation(updated);
    localStorage.setItem('parksense_active_res', JSON.stringify(updated));

    // Simulated notification for parking expiring in 10 mins
    setTimeout(() => {
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}`,
          type: 'session_expiry',
          title: '⏳ Parking Session Expiring Soon',
          hindiTitle: '⏳ पार्किंग समय समाप्त होने वाला है',
          message: 'Your parking session expires in 10 minutes. Tap to extend.',
          hindiMessage: 'आपका पार्किंग समय 10 मिनट में समाप्त हो रहा है।',
          timestamp: Date.now(),
          read: false
        },
        ...prev
      ]);
    }, 8000);
  };

  const extendSpotTime = async (minutes: number = 30) => {
    if (!activeReservation) return;

    const res = await fetch(`${FUNCTIONS_BASE_URL}/extendReservation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: activeReservation.reservationId,
        additionalMinutes: minutes
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Extend failed');
    }

    const data = await res.json();
    const updated: ReservationState = {
      ...activeReservation,
      endTime: data.newEndTime,
      estimatedAmount: data.totalAmount
    };

    setActiveReservation(updated);
    localStorage.setItem('parksense_active_res', JSON.stringify(updated));
  };

  const cancelSpot = async () => {
    if (!activeReservation) return;

    const res = await fetch(`${FUNCTIONS_BASE_URL}/cancelReservation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: activeReservation.reservationId,
        reason: 'citizen_cancelled'
      })
    });

    const updated: ReservationState = {
      ...activeReservation,
      status: 'cancelled'
    };

    setActiveReservation(null);
    localStorage.removeItem('parksense_active_res');

    const updatedHistory = [updated, ...bookingHistory];
    setBookingHistory(updatedHistory);
    localStorage.setItem('parksense_history', JSON.stringify(updatedHistory));
  };

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <AppContext.Provider
      value={{
        selectedVehicle,
        setSelectedVehicle,
        zones,
        selectedZone,
        setSelectedZone,
        bays,
        activeReservation,
        walletBalance,
        topUpWallet,
        createHold,
        confirmPayment,
        confirmWithWallet,
        checkInSpot,
        extendSpotTime,
        cancelSpot,
        bookingHistory,
        notifications,
        dismissNotification,
        lowBandwidth,
        toggleLowBandwidth,
        isOnline,
        searchQuery,
        setSearchQuery,
        sortMode,
        setSortMode
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
