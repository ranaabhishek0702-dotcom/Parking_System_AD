'use client';

import React from 'react';
import {
  Shield,
  Activity,
  UserCheck,
  Moon,
  Sun,
  Radio,
  Building2,
  Car,
  BadgeAlert
} from 'lucide-react';

export type AdminRole = 'super_admin' | 'zone_manager' | 'enforcement_officer' | 'finance_auditor';

export interface UserPersona {
  role: AdminRole;
  name: string;
  title: string;
  department: string;
  badge: string;
  avatarBg: string;
}

export const USER_PERSONAS: Record<AdminRole, UserPersona> = {
  super_admin: {
    role: 'super_admin',
    name: 'Dr. Rajesh Sen',
    title: 'Mission Director',
    department: 'Ministry of Housing & Urban Affairs (MoHUA)',
    badge: 'MOHUA-DIR-01',
    avatarBg: 'bg-emerald-600'
  },
  zone_manager: {
    role: 'zone_manager',
    name: 'Amit Verma',
    title: 'Chief Zone Officer',
    department: 'NDMC Connaught Place Commercial Ring',
    badge: 'NDMC-ZM-04',
    avatarBg: 'bg-blue-600'
  },
  enforcement_officer: {
    role: 'enforcement_officer',
    name: 'Insp. Meena Sharma',
    title: 'Traffic Squad Commander',
    department: 'Delhi Traffic Police & Municipal Enforcement',
    badge: 'DTP-7219',
    avatarBg: 'bg-rose-600'
  },
  finance_auditor: {
    role: 'finance_auditor',
    name: 'Sunita Rao',
    title: 'Senior Municipal Auditor',
    department: 'Comptroller & Auditor General (CAG) Division',
    badge: 'CAG-AUD-19',
    avatarBg: 'bg-amber-600'
  }
};

interface NavbarProps {
  currentRole: AdminRole;
  onRoleChange: (role: AdminRole) => void;
  isLive: boolean;
  activeViolationsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  onRoleChange,
  isLive,
  activeViolationsCount
}) => {
  const persona = USER_PERSONAS[currentRole];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#090d16]/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & MoHUA Emblem */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/20">
            <Car className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold tracking-tight text-white">ParkSense</span>
              <span className="rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-400 border border-blue-500/20">
                MoHUA Command
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Smart Street Parking Automation • Delhi NCR Fleet
            </p>
          </div>
        </div>

        {/* Center: Live Telemetry Pulse & Status */}
        <div className="hidden md:flex items-center space-x-4">
          <div className="flex items-center space-x-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${isLive ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`} />
              <span className={`relative inline-flex h-2 w-2 rounded-full ${isLive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            </span>
            <span className="text-slate-300 font-medium">
              {isLive ? 'RTDB Stream: 358 Bays Active' : 'Connecting to Telemetry...'}
            </span>
          </div>

          {activeViolationsCount > 0 && (
            <div className="flex items-center space-x-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-400 animate-pulse">
              <BadgeAlert className="h-3.5 w-3.5" />
              <span>{activeViolationsCount} Violations Pending</span>
            </div>
          )}
        </div>

        {/* Right: Role Switcher & Persona Badge */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <label htmlFor="role-select" className="sr-only">Switch Role</label>
            <div className="flex items-center space-x-2 bg-slate-900/90 border border-slate-700/80 rounded-lg p-1.5 shadow-sm">
              <div className={`h-7 w-7 rounded-md ${persona.avatarBg} flex items-center justify-center text-white text-xs font-bold`}>
                {persona.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left pr-2">
                <div className="text-xs font-semibold text-white leading-tight">{persona.name}</div>
                <div className="text-[10px] text-slate-400 leading-tight">{persona.title}</div>
              </div>
              <select
                id="role-select"
                aria-label="Select Role Persona"
                value={currentRole}
                onChange={(e) => onRoleChange(e.target.value as AdminRole)}
                className="bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="super_admin">Super Admin (MoHUA)</option>
                <option value="zone_manager">Zone Manager (NDMC)</option>
                <option value="enforcement_officer">Enforcement (Delhi Police)</option>
                <option value="finance_auditor">Finance Auditor (CAG)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
