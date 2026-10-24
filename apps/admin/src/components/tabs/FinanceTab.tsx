'use client';

import React, { useState } from 'react';
import {
  IndianRupee,
  Download,
  FileText,
  TrendingUp,
  PieChart,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle,
  Building,
  CreditCard,
  Layers,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { ZoneStatus } from './LiveOverviewTab';

interface FinanceTabProps {
  zones: Record<string, ZoneStatus>;
}

export const FinanceTab: React.FC<FinanceTabProps> = ({ zones }) => {
  const [selectedLedgerFilter, setSelectedLedgerFilter] = useState<string>('all');

  const hourlyRevenueData = [
    { hour: '06:00', actual: 480, projected: 450 },
    { hour: '08:00', actual: 1650, projected: 1400 },
    { hour: '10:00', actual: 3820, projected: 3200 },
    { hour: '12:00', actual: 4450, projected: 3900 },
    { hour: '14:00', actual: 3980, projected: 3600 },
    { hour: '16:00', actual: 4920, projected: 4100 },
    { hour: '18:00', actual: 6150, projected: 5200 },
    { hour: '20:00', actual: 5400, projected: 4800 },
    { hour: '22:00', actual: 2100, projected: 2000 }
  ];

  const zoneRevenueData = Object.values(zones).map((z) => {
    const hourlyRate = z.currentRatePerHour || 30;
    const occupied = z.occupiedBays || 15;
    const todayEst = Math.round(occupied * hourlyRate * 9.5 + 1200);
    return {
      name: z.name.split(' (')[0],
      revenue: todayEst
    };
  });

  const transactions = [
    {
      id: 'TXN-UPI-99214',
      time: '14 mins ago',
      zone: 'Connaught Place',
      plate: 'DL01AB1234',
      type: 'car',
      method: 'UPI (PhonePe)',
      amount: 80,
      muniShare: 68,
      techShare: 12,
      status: 'settled'
    },
    {
      id: 'TXN-FAST-44120',
      time: '22 mins ago',
      zone: 'Cyber City DLF',
      plate: 'HR26DK9002',
      type: 'car',
      method: 'FASTag RFID',
      amount: 120,
      muniShare: 102,
      techShare: 18,
      status: 'settled'
    },
    {
      id: 'TXN-UPI-99209',
      time: '31 mins ago',
      zone: 'Karol Bagh',
      plate: 'DL04MC4412',
      type: 'two_wheeler',
      method: 'UPI (GooglePay)',
      amount: 30,
      muniShare: 25.5,
      techShare: 4.5,
      status: 'settled'
    },
    {
      id: 'TXN-CARD-11029',
      time: '45 mins ago',
      zone: 'Lajpat Nagar',
      plate: 'UP16BW8921',
      type: 'car',
      method: 'Credit Card',
      amount: 70,
      muniShare: 59.5,
      techShare: 10.5,
      status: 'settled'
    },
    {
      id: 'TXN-FAST-44118',
      time: '1 hr ago',
      zone: 'HUDA City Centre',
      plate: 'HR10AS5519',
      type: 'car',
      method: 'FASTag RFID',
      amount: 60,
      muniShare: 51,
      techShare: 9,
      status: 'settled'
    }
  ];

  // CSV Export Trigger
  const handleExportCSV = () => {
    const headers = [
      'Transaction ID',
      'Timestamp',
      'Zone',
      'Vehicle Plate',
      'Vehicle Type',
      'Payment Gateway',
      'Gross Tariff (INR)',
      'MoHUA Municipal Fund (85%)',
      'Platform Operations (15%)',
      'Settlement Status'
    ];

    const rows = transactions.map((t) => [
      t.id,
      t.time,
      `"${t.zone}"`,
      t.plate,
      t.type,
      `"${t.method}"`,
      t.amount,
      t.muniShare,
      t.techShare,
      t.status
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ParkSense_MoHUA_Settlement_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Export Actions */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            Municipal Finance Division
          </span>
          <h2 className="text-xl font-bold text-white mt-0.5">
            Revenue Analytics, Settlement Ledger & Leakage Control
          </h2>
          <p className="text-xs text-slate-400">
            Real-time digital payment reconciliation across UPI, FASTag RFID, and e-Challan recoveries
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/30 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV Ledger</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center space-x-1.5 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Export PDF Report</span>
          </button>
        </div>
      </div>

      {/* 2. Key Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel rounded-xl p-4 border border-slate-800">
          <span className="text-xs text-slate-400">Gross Collection (Today)</span>
          <div className="text-2xl font-black text-white mt-1">₹32,950</div>
          <span className="text-[11px] text-emerald-400 flex items-center mt-1">
            <ArrowUpRight className="h-3 w-3 mr-0.5" />
            +18.4% vs Fixed Tariff Baseline
          </span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800">
          <span className="text-xs text-slate-400">MoHUA Municipal Fund (85%)</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">₹28,007</div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Direct treasury settlement via RBI PFMS
          </span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800">
          <span className="text-xs text-slate-400">Channel Split</span>
          <div className="text-base font-bold text-white mt-1">UPI: 74% • FASTag: 22%</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Cards/Netbanking: 4%</span>
        </div>

        <div className="glass-panel rounded-xl p-4 border border-slate-800">
          <span className="text-xs text-slate-400">Revenue Leakage Rate</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">1.2%</div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Reduced from 35% manual leakages
          </span>
        </div>
      </div>

      {/* 3. Revenue Breakdown Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hourly Revenue Curve: Projected vs Actual (7 cols) */}
        <div className="lg:col-span-7 glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>Projected vs. Actual Revenue (Today)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Shows dynamic pricing surplus over fixed-rate static pricing
              </p>
            </div>
            <div className="flex items-center space-x-3 text-xs">
              <span className="flex items-center space-x-1">
                <span className="h-2 w-4 bg-emerald-500 rounded" />
                <span className="text-slate-300">Actual (Dynamic)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="h-2 w-4 bg-slate-500 rounded" />
                <span className="text-slate-400">Baseline (Static)</span>
              </span>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyRevenueData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualRevGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Area type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={2.5} fill="url(#actualRevGrad)" />
                <Area type="monotone" dataKey="projected" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Zone Bar Ranking (5 cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Building className="h-4 w-4 text-blue-400" />
                <span>Revenue by Zone (Today)</span>
              </h3>
              <p className="text-xs text-slate-400">Top commercial municipal yields</p>
            </div>
          </div>

          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={zoneRevenueData.slice(0, 5)}
                layout="vertical"
                margin={{ top: 5, right: 15, left: 35, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} tickFormatter={(v) => `₹${v}`} />
                <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Municipal Settlement Ledger Table */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-emerald-400" />
              <span>Real-Time Settlement Ledger</span>
            </h3>
            <p className="text-xs text-slate-400">
              Transaction-level audit trail synced with Razorpay / Bharat BillPay / FASTag NPCI
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Status: Automated T+0 Escrow</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-2.5 px-3">Transaction ID</th>
                <th className="py-2.5 px-3">Time</th>
                <th className="py-2.5 px-3">Zone</th>
                <th className="py-2.5 px-3">Plate & Class</th>
                <th className="py-2.5 px-3">Payment Gateway</th>
                <th className="py-2.5 px-3">Total Paid</th>
                <th className="py-2.5 px-3">Municipal (85%)</th>
                <th className="py-2.5 px-3 text-right">Settlement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="py-2.5 px-3 font-bold text-white">{t.id}</td>
                  <td className="py-2.5 px-3 text-slate-400">{t.time}</td>
                  <td className="py-2.5 px-3 text-slate-200 font-sans">{t.zone}</td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {t.plate} <span className="text-[10px] text-slate-500 uppercase">({t.type})</span>
                  </td>
                  <td className="py-2.5 px-3 text-blue-300 font-sans">{t.method}</td>
                  <td className="py-2.5 px-3 font-bold text-white">₹{t.amount}</td>
                  <td className="py-2.5 px-3 font-bold text-emerald-400">₹{t.muniShare}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Revenue Leakage Report Card */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <h3 className="text-base font-bold text-white flex items-center space-x-2 mb-3">
          <ShieldAlert className="h-4 w-4 text-amber-400" />
          <span>Revenue Leakage & Curb Recovery Report</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400">Unpaid Sensor Telemetry Occupancies:</span>
            <div className="text-lg font-bold text-rose-400 mt-1">₹1,850 lost today</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Vehicles parked over 5 mins without valid digital permit. Automatically routed to
              enforcement squad.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400">Overstay Minutes Beyond Hold:</span>
            <div className="text-lg font-bold text-amber-400 mt-1">340 minutes logged</div>
            <p className="text-[11px] text-slate-500 mt-1">
              Automated grace period (5 mins) expired. Overstay penalty rate (+₹15/15m) billed upon
              checkout.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
            <span className="text-slate-400">e-Challan Net Recovery:</span>
            <div className="text-lg font-bold text-emerald-400 mt-1">₹3,500 recovered today</div>
            <p className="text-[11px] text-slate-500 mt-1">
              7 legal challans issued via Vahan / MoHUA gateway, transforming unauthorized curbs into
              net civic revenue.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
