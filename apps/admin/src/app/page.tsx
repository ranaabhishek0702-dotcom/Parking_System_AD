'use client';

import React, { useState, useEffect } from 'react';
import { Navbar, AdminRole } from '../components/Navbar';
import { TabsNav, TabKey, TABS } from '../components/TabsNav';
import { LiveOverviewTab, ZoneStatus } from '../components/tabs/LiveOverviewTab';
import { PredictTab } from '../components/tabs/PredictTab';
import { ManageTab } from '../components/tabs/ManageTab';
import { FinanceTab } from '../components/tabs/FinanceTab';
import { EnforcementTab } from '../components/tabs/EnforcementTab';
import { ImpactTab } from '../components/tabs/ImpactTab';
import { SimulationTab } from '../components/tabs/SimulationTab';
import { CopilotTab } from '../components/tabs/CopilotTab';
import { rtdb } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';

// Initial baseline zones map for Delhi NCR
const INITIAL_ZONES: Record<string, ZoneStatus> = {
  'delhi-cp-inner': {
    id: 'delhi-cp-inner',
    name: 'Connaught Place Inner Circle (Blocks A-C)',
    type: 'market',
    coordinates: { lat: 28.6315, lng: 77.2167, x: 50, y: 50 },
    totalBays: 45,
    occupiedBays: 32,
    availableBays: 13,
    reservedBays: 0,
    occupancyRate: 0.71,
    currentRatePerHour: 40,
    baseHourlyRate: 40
  },
  'delhi-khan-market': {
    id: 'delhi-khan-market',
    name: 'Khan Market Commercial Outer Ring',
    type: 'market',
    coordinates: { lat: 28.5999, lng: 77.2272, x: 54, y: 64 },
    totalBays: 30,
    occupiedBays: 24,
    availableBays: 6,
    reservedBays: 0,
    occupancyRate: 0.80,
    currentRatePerHour: 50,
    baseHourlyRate: 50
  },
  'delhi-karol-bagh': {
    id: 'delhi-karol-bagh',
    name: 'Karol Bagh (Arya Samaj Rd & Ajmal Khan)',
    type: 'market',
    coordinates: { lat: 28.6517, lng: 77.1906, x: 38, y: 40 },
    totalBays: 40,
    occupiedBays: 29,
    availableBays: 11,
    reservedBays: 0,
    occupancyRate: 0.725,
    currentRatePerHour: 30,
    baseHourlyRate: 30
  },
  'delhi-lajpat-nagar': {
    id: 'delhi-lajpat-nagar',
    name: 'Lajpat Nagar Central Market Ring',
    type: 'market',
    coordinates: { lat: 28.5701, lng: 77.2384, x: 58, y: 72 },
    totalBays: 38,
    occupiedBays: 28,
    availableBays: 10,
    reservedBays: 0,
    occupancyRate: 0.736,
    currentRatePerHour: 35,
    baseHourlyRate: 35
  },
  'gurugram-cyber-city': {
    id: 'gurugram-cyber-city',
    name: 'DLF Cyber City Building 10 & Epicode',
    type: 'office',
    coordinates: { lat: 28.4952, lng: 77.0895, x: 22, y: 88 },
    totalBays: 60,
    occupiedBays: 46,
    availableBays: 14,
    reservedBays: 0,
    occupancyRate: 0.766,
    currentRatePerHour: 60,
    baseHourlyRate: 60
  },
  'delhi-aiims-emergency': {
    id: 'delhi-aiims-emergency',
    name: 'AIIMS New Delhi Emergency & OPD Perimeter',
    type: 'hospital',
    coordinates: { lat: 28.5672, lng: 77.2100, x: 48, y: 74 },
    totalBays: 35,
    occupiedBays: 28,
    availableBays: 7,
    reservedBays: 0,
    occupancyRate: 0.80,
    currentRatePerHour: 20,
    baseHourlyRate: 20
  },
  'delhi-chandni-chowk': {
    id: 'delhi-chandni-chowk',
    name: 'Chandni Chowk Heritage Corridor',
    type: 'market',
    coordinates: { lat: 28.6562, lng: 77.2307, x: 55, y: 32 },
    totalBays: 30,
    occupiedBays: 18,
    availableBays: 12,
    reservedBays: 0,
    occupancyRate: 0.60,
    currentRatePerHour: 25,
    baseHourlyRate: 25
  },
  'gurugram-huda-metro': {
    id: 'gurugram-huda-metro',
    name: 'HUDA City Centre / Millennium City Metro Hub',
    type: 'transit',
    coordinates: { lat: 28.4595, lng: 77.0725, x: 18, y: 94 },
    totalBays: 45,
    occupiedBays: 36,
    availableBays: 9,
    reservedBays: 0,
    occupancyRate: 0.80,
    currentRatePerHour: 30,
    baseHourlyRate: 30
  },
  'delhi-nehru-place': {
    id: 'delhi-nehru-place',
    name: 'Nehru Place Commercial Center (Main Plaza)',
    type: 'office',
    coordinates: { lat: 28.5494, lng: 77.2528, x: 64, y: 80 },
    totalBays: 35,
    occupiedBays: 22,
    availableBays: 13,
    reservedBays: 0,
    occupancyRate: 0.628,
    currentRatePerHour: 40,
    baseHourlyRate: 40
  }
};

export default function AdminDashboardPage() {
  const [currentRole, setCurrentRole] = useState<AdminRole>('super_admin');
  const [currentTab, setCurrentTab] = useState<TabKey>('overview');
  const [zones, setZones] = useState<Record<string, ZoneStatus>>(INITIAL_ZONES);
  const [activeViolationsCount, setActiveViolationsCount] = useState<number>(4);
  const [isLiveTelemetry, setIsLiveTelemetry] = useState<boolean>(false);
  const [selectedZoneTarget, setSelectedZoneTarget] = useState<string>('delhi-cp-inner');

  // Parse URL search params for direct tab/role deep-linking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as TabKey;
      if (tabParam && TABS.some((t) => t.key === tabParam)) {
        setCurrentTab(tabParam);
      }
      const roleParam = params.get('role') as AdminRole;
      if (
        roleParam &&
        ['super_admin', 'zone_manager', 'enforcement_officer', 'finance_auditor'].includes(
          roleParam
        )
      ) {
        setCurrentRole(roleParam);
      }
    }
  }, []);

  // Listen for Electron Desktop menu navigation, role switching and badge synchronization
  useEffect(() => {
    if (typeof window !== 'undefined' && window.parksenseDesktop) {
      const unsubTab = window.parksenseDesktop.onNavigateTab((tabKey) => {
        if (TABS.some((t) => t.key === tabKey)) {
          setCurrentTab(tabKey as TabKey);
        }
      });

      const unsubRole = window.parksenseDesktop.onSwitchRole((newRole) => {
        if (
          ['super_admin', 'zone_manager', 'enforcement_officer', 'finance_auditor'].includes(newRole)
        ) {
          setCurrentRole(newRole as AdminRole);
        }
      });

      const unsubScenario = window.parksenseDesktop.onTriggerScenario(() => {
        setCurrentTab('simulation');
      });

      window.parksenseDesktop.setDockBadge(activeViolationsCount > 0 ? String(activeViolationsCount) : '');

      return () => {
        unsubTab?.();
        unsubRole?.();
        unsubScenario?.();
      };
    }
  }, [activeViolationsCount]);

  // Listen to RTDB live_zones for real-time telemetry updates
  useEffect(() => {
    const liveZonesRef = ref(rtdb, 'live_zones');
    const unsubscribe = onValue(
      liveZonesRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setIsLiveTelemetry(true);
          setZones((prev) => {
            const updated = { ...prev };
            for (const [zoneId, zoneLive] of Object.entries<any>(data)) {
              if (updated[zoneId]) {
                updated[zoneId] = {
                  ...updated[zoneId],
                  occupiedBays: zoneLive.occupiedBays ?? updated[zoneId].occupiedBays,
                  availableBays: zoneLive.availableBays ?? updated[zoneId].availableBays,
                  totalBays: zoneLive.totalBays ?? updated[zoneId].totalBays,
                  occupancyRate: zoneLive.occupancyRate ?? updated[zoneId].occupancyRate,
                  currentRatePerHour:
                    zoneLive.currentRatePerHour ?? updated[zoneId].currentRatePerHour
                };
              }
            }
            return updated;
          });
        }
      },
      (err) => {
        console.warn('RTDB live_zones subscription:', err.message);
      }
    );

    // Also listen to active violations count
    const statsRef = ref(rtdb, 'live_stats/activeViolationsCount');
    const unsubStats = onValue(statsRef, (snap) => {
      const count = snap.val();
      if (typeof count === 'number') {
        setActiveViolationsCount(count);
      }
    });

    return () => {
      unsubscribe();
      unsubStats();
    };
  }, []);

  // When role changes, if currentTab is not allowed, switch to 'overview'
  useEffect(() => {
    const tabObj = TABS.find((t) => t.key === currentTab);
    if (tabObj && !tabObj.allowedRoles.includes(currentRole)) {
      setCurrentTab('overview');
    }
  }, [currentRole, currentTab]);

  // Keyboard navigation shortcuts (1-8 to switch tabs)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't intercept when typing in form inputs
      }

      const num = parseInt(e.key, 10);
      if (!isNaN(num) && num >= 1 && num <= TABS.length) {
        const targetTab = TABS[num - 1];
        if (targetTab && targetTab.allowedRoles.includes(currentRole)) {
          setCurrentTab(targetTab.key);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRole]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. Global Command Navbar */}
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        isLive={isLiveTelemetry}
        activeViolationsCount={activeViolationsCount}
      />

      {/* 2. Primary Tabs Navigation Bar with Role Access Control */}
      <TabsNav
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        userRole={currentRole}
      />

      {/* 3. Main Dashboard Workspace */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl w-full mx-auto">
        {currentTab === 'overview' && (
          <LiveOverviewTab
            zones={zones}
            activeViolationsCount={activeViolationsCount}
            onSelectZoneForPricing={(zId) => {
              setSelectedZoneTarget(zId);
              setCurrentTab('manage');
            }}
            onSelectZoneForForecast={(zId) => {
              setSelectedZoneTarget(zId);
              setCurrentTab('predict');
            }}
          />
        )}

        {currentTab === 'predict' && (
          <PredictTab zones={zones} initialZoneId={selectedZoneTarget} />
        )}

        {currentTab === 'manage' && (
          <ManageTab zones={zones} initialZoneId={selectedZoneTarget} />
        )}

        {currentTab === 'finance' && <FinanceTab zones={zones} />}

        {currentTab === 'enforcement' && <EnforcementTab zones={zones} />}

        {currentTab === 'impact' && <ImpactTab zones={zones} />}

        {currentTab === 'simulation' && <SimulationTab />}

        {currentTab === 'copilot' && <CopilotTab currentRole={currentRole} />}
      </main>

      {/* 4. Municipal Footer */}
      <footer className="border-t border-slate-800/80 bg-[#060a12] py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-400">ParkSense India</span>
            <span>•</span>
            <span>Ministry of Housing and Urban Affairs (MoHUA) Smart Automation</span>
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Keyboard: Press [1–8] to switch tabs</span>
            <span>•</span>
            <span className="text-emerald-400 font-mono">Sensors: 358 Bays Synced</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
