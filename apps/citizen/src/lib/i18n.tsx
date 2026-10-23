'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'hi';

export interface Translations {
  appName: string;
  smartCityBadge: string;
  explore: string;
  reservations: string;
  wallet: string;
  history: string;
  report: string;
  twoWheeler: string;
  car: string;
  ev: string;
  disabledAccess: string;
  allVehicles: string;
  searchPlaceholder: string;
  sortNearest: string;
  sortCheapest: string;
  sortWalking: string;
  available: string;
  occupied: string;
  reserved: string;
  perHour: string;
  baysAvailable: string;
  holdSpot: string;
  holdExpiresIn: string;
  priceLockedAt: string;
  whyThisPrice: string;
  bestTimeToArrive: string;
  vehicleNumber: string;
  duration: string;
  payAndConfirm: string;
  payWithUPI: string;
  payWithWallet: string;
  walletBalance: string;
  addMoney: string;
  activeSession: string;
  checkInQR: string;
  tapToCheckIn: string;
  checkedIn: string;
  extendTime: string;
  cancelRelease: string;
  viewReceipt: string;
  receiptTitle: string;
  bookingHistory: string;
  reportViolationTitle: string;
  photoUpload: string;
  submitReport: string;
  lowBandwidthMode: string;
  offlineNotice: string;
  equityProtectionNotice: string;
  simulatedNotificationHold: string;
  simulatedNotificationExpiry: string;
  simulatedNotificationPriceDrop: string;
  minsRemaining: string;
  hours: string;
  mins: string;
}

const translations: Record<Language, Translations> = {
  en: {
    appName: 'ParkSense',
    smartCityBadge: 'MoHUA Smart Cities | Delhi NCR',
    explore: 'Find Parking',
    reservations: 'My Spot',
    wallet: 'Wallet',
    history: 'History',
    report: 'Report',
    twoWheeler: 'Two-Wheeler',
    car: 'Car',
    ev: 'EV Charging',
    disabledAccess: 'Accessible',
    allVehicles: 'All Bays',
    searchPlaceholder: 'Search destinations (CP, AIIMS, Cyber City...)',
    sortNearest: 'Nearest Available',
    sortCheapest: 'Cheapest Rate',
    sortWalking: 'Least Walking',
    available: 'Available',
    occupied: 'Occupied',
    reserved: 'Reserved',
    perHour: '/hr',
    baysAvailable: 'bays free',
    holdSpot: 'Hold Spot (10 Mins)',
    holdExpiresIn: 'Hold expires in',
    priceLockedAt: 'Price locked at',
    whyThisPrice: 'Why this price?',
    bestTimeToArrive: 'Best time to arrive',
    vehicleNumber: 'Vehicle Number',
    duration: 'Duration',
    payAndConfirm: 'Pay & Confirm Spot',
    payWithUPI: 'Pay via UPI (GPay/PhonePe/Paytm)',
    payWithWallet: 'Pay with Citizen Wallet',
    walletBalance: 'Wallet Balance',
    addMoney: '+ Add Money',
    activeSession: 'Active Parking Session',
    checkInQR: 'Check-In QR Code',
    tapToCheckIn: 'Scan / Tap to Check-In',
    checkedIn: 'Checked In & Active',
    extendTime: 'Extend Time (+30m)',
    cancelRelease: 'Cancel & Free Bay',
    viewReceipt: 'Tax Invoice & Receipt',
    receiptTitle: 'Municipal Parking Receipt',
    bookingHistory: 'Past Bookings',
    reportViolationTitle: 'Report Illegal Parking',
    photoUpload: 'Upload / Capture Photo',
    submitReport: 'Submit Violation to Municipal Squad',
    lowBandwidthMode: 'Low Data',
    offlineNotice: 'Offline Mode: Showing cached bay map',
    equityProtectionNotice: 'Civic Equity Cap: Emergency hospital zone capped at base civic tariff.',
    simulatedNotificationHold: '⚠️ Hold expiring in 2 minutes! Complete payment to avoid release.',
    simulatedNotificationExpiry: '⏳ Parking session expires in 10 minutes. Tap to extend.',
    simulatedNotificationPriceDrop: '📉 Price Drop Alert: Connaught Place rate reduced to ₹20/hr!',
    minsRemaining: 'mins remaining',
    hours: 'hours',
    mins: 'mins'
  },
  hi: {
    appName: 'पार्कसेंस',
    smartCityBadge: 'आवासन और शहरी कार्य मंत्रालय | दिल्ली एनसीआर',
    explore: 'पार्किंग खोजें',
    reservations: 'मेरी जगह',
    wallet: 'वॉलेट',
    history: 'इतिहास',
    report: 'शिकायत',
    twoWheeler: 'दोपहिया (स्कूटर/बाइक)',
    car: 'कार',
    ev: 'ई-वाहन चार्जिंग',
    disabledAccess: 'दिव्यांग जन',
    allVehicles: 'सभी स्थान',
    searchPlaceholder: 'गंतव्य खोजें (कनॉट प्लेस, एम्स, साइबर सिटी...)',
    sortNearest: 'सबसे पास उपलब्ध',
    sortCheapest: 'सबसे किफायती शुल्क',
    sortWalking: 'कम से कम पैदल दूरी',
    available: 'उपलब्ध',
    occupied: 'भरा हुआ',
    reserved: 'आरक्षित',
    perHour: '/घंटा',
    baysAvailable: 'स्थान खाली',
    holdSpot: 'स्थान रोकें (10 मिनट होल्ड)',
    holdExpiresIn: 'होल्ड समाप्त होने में समय',
    priceLockedAt: 'शुल्क सुरक्षित किया गया',
    whyThisPrice: 'यह शुल्क क्यों है?',
    bestTimeToArrive: 'पहुंचने का सबसे सही समय',
    vehicleNumber: 'वाहन संख्या',
    duration: 'अवधि',
    payAndConfirm: 'भुगतान करें और स्थान सुरक्षित करें',
    payWithUPI: 'यूपीआई से भुगतान (GPay/PhonePe/Paytm)',
    payWithWallet: 'नागरिक वॉलेट से भुगतान',
    walletBalance: 'वॉलेट शेष राशि',
    addMoney: '+ पैसे जोड़ें',
    activeSession: 'सक्रिय पार्किंग सत्र',
    checkInQR: 'चेक-इन क्यूआर कोड',
    tapToCheckIn: 'चेक-इन के लिए टैप करें',
    checkedIn: 'चेक-इन सफल (सक्रिय)',
    extendTime: 'समय बढ़ाएं (+30 मिनट)',
    cancelRelease: 'रद्द करें और जगह खाली करें',
    viewReceipt: 'नगर निगम रसीद और चालान',
    receiptTitle: 'नगर निगम पार्किंग टैक्स रसीद',
    bookingHistory: 'पिछली बुकिंग',
    reportViolationTitle: 'अवैध पार्किंग की रिपोर्ट करें',
    photoUpload: 'फोटो खींचे या अपलोड करें',
    submitReport: 'प्रवर्तन दल को रिपोर्ट भेजें',
    lowBandwidthMode: 'कम डेटा मोड',
    offlineNotice: 'ऑफ़लाइन मोड: सहेजा गया नक्शा प्रदर्शित है',
    equityProtectionNotice: 'नागरिक सुरक्षा: अस्पताल क्षेत्र में आपातकालीन आधार शुल्क लागू है।',
    simulatedNotificationHold: '⚠️ 10 मिनट का होल्ड 2 मिनट में समाप्त हो रहा है! तुरंत भुगतान करें।',
    simulatedNotificationExpiry: '⏳ आपका पार्किंग समय 10 मिनट में समाप्त हो रहा है। आगे बढ़ाएं।',
    simulatedNotificationPriceDrop: '📉 शुल्क में गिरावट: कनॉट प्लेस में दर घटकर ₹20/घंटा हुई!',
    minsRemaining: 'मिनट शेष',
    hours: 'घंटे',
    mins: 'मिनट'
  }
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  formatCurrency: (amount: number) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('parksense_lang') as Language;
    if (saved === 'en' || saved === 'hi') {
      setLangState(saved);
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('parksense_lang', newLang);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <I18nContext.Provider
      value={{
        lang,
        setLang,
        t: translations[lang],
        formatCurrency
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
