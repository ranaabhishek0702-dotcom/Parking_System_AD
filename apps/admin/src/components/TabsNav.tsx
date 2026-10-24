'use client';

import React from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Sliders,
  DollarSign,
  ShieldAlert,
  Leaf,
  Cpu,
  Bot
} from 'lucide-react';
import { AdminRole } from './Navbar';

export type TabKey =
  | 'overview'
  | 'predict'
  | 'manage'
  | 'finance'
  | 'enforcement'
  | 'impact'
  | 'simulation'
  | 'copilot';

export interface TabItem {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles: AdminRole[];
  badge?: string;
}

export const TABS: TabItem[] = [
  {
    key: 'overview',
    label: 'Live Overview',
    icon: LayoutDashboard,
    allowedRoles: ['super_admin', 'zone_manager', 'enforcement_officer', 'finance_auditor']
  },
  {
    key: 'predict',
    label: 'Predict',
    icon: TrendingUp,
    allowedRoles: ['super_admin', 'zone_manager'],
    badge: 'Holt-Winters'
  },
  {
    key: 'manage',
    label: 'Manage & Pricing',
    icon: Sliders,
    allowedRoles: ['super_admin', 'zone_manager']
  },
  {
    key: 'finance',
    label: 'Finance & Ledger',
    icon: DollarSign,
    allowedRoles: ['super_admin', 'finance_auditor']
  },
  {
    key: 'enforcement',
    label: 'Enforcement',
    icon: ShieldAlert,
    allowedRoles: ['super_admin', 'enforcement_officer'],
    badge: 'Live Feed'
  },
  {
    key: 'impact',
    label: 'Impact & ESG',
    icon: Leaf,
    allowedRoles: ['super_admin', 'zone_manager', 'enforcement_officer', 'finance_auditor']
  },
  {
    key: 'simulation',
    label: 'Simulation Control',
    icon: Cpu,
    allowedRoles: ['super_admin', 'zone_manager'],
    badge: '10x Active'
  },
  {
    key: 'copilot',
    label: 'AI Copilot',
    icon: Bot,
    allowedRoles: ['super_admin', 'zone_manager', 'enforcement_officer', 'finance_auditor'],
    badge: 'Grounded'
  }
];

interface TabsNavProps {
  currentTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  userRole: AdminRole;
}

export const TabsNav: React.FC<TabsNavProps> = ({ currentTab, onTabChange, userRole }) => {
  const visibleTabs = TABS.filter((tab) => tab.allowedRoles.includes(userRole));

  return (
    <nav
      aria-label="Admin Navigation Tabs"
      className="border-b border-slate-800 bg-[#090d16]/70 px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-none"
    >
      <div className="flex space-x-1 sm:space-x-2 py-2">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className={`flex items-center space-x-2 rounded-lg px-3.5 py-2 text-xs font-medium transition-all duration-150 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                    isActive
                      ? 'bg-blue-500/30 text-blue-200'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
