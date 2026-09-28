'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface DemoAccount {
  category: 'OFFICER' | 'CITIZEN';
  roleName: string;
  levelBadge: string;
  name: string;
  uid: string;
  email: string;
  jurisdiction: string;
  mode: 'CITIZEN' | 'EMPLOYEE';
  dashboardRoute: string;
  color: string;
  icon: string;
  features: string[];
  notes?: string;
}

// Complete list of ALL 9 Revenue Officers across the full statutory chain
export const ALL_OFFICERS: DemoAccount[] = [
  {
    category: 'OFFICER',
    roleName: 'Division Commissioner',
    levelBadge: 'L1 Division',
    name: 'Dr. Rajesh Kumar Sharma',
    uid: 'BSO-DVC-AS-000001',
    email: 'divcomm@bhoomisetu.gov.in',
    jurisdiction: 'Upper Assam Division',
    mode: 'EMPLOYEE',
    dashboardRoute: '/dashboard/division',
    color: '#F59E0B',
    icon: 'shield',
    features: ['Division-wide GIS analytics', 'Officer performance tracking', 'Revenue collection metrics'],
    notes: 'Highest administrative authority; monitor & review all revenue districts.',
  },
  {
    category: 'OFFICER',
    roleName: 'District Collector',
    levelBadge: 'L2 District',
    name: 'Priya Borthakur',
    uid: 'BSO-DCL-AS0901-000001',
    email: 'dc.sonitpur@bhoomisetu.gov.in',
    jurisdiction: 'Sonitpur District',
    mode: 'EMPLOYEE',
    dashboardRoute: '/dashboard/citizen',
    color: '#8B5CF6',
    icon: 'location_city',
    features: ['District land administration', 'Appeals & grievance escalations', 'Inter-subdivision coordination'],
    notes: 'Oversees all sub-divisions in Sonitpur.',
  },
  {
    category: 'OFFICER',
    roleName: 'Sub-Collector / SDO',
    levelBadge: 'L3 Sub-Div',
    name: 'Anupam Hazarika',
    uid: 'BSO-SDO-AS0905-000001',
    email: 'sdo.tezpur@bhoomisetu.gov.in',
    jurisdiction: 'Tezpur Sub-Division',
    mode: 'EMPLOYEE',
    dashboardRoute: '/dashboard/citizen',
    color: '#EC4899',
    icon: 'gavel',
    features: ['Final statutory sanction', 'Mutation order issuance', 'Atomic ownership completion'],
    notes: 'Mandatory statutory step-up approval for title transfer.',
  },
  {
    category: 'OFFICER',
    roleName: 'Tehsildar',
    levelBadge: 'L4 Tehsil',
    name: 'Mrinmoy Deka',
    uid: 'BSO-TEH-AS0905-000001',
    email: 'teh.tezpur@bhoomisetu.gov.in',
    jurisdiction: 'Tezpur Tehsil',
    mode: 'EMPLOYEE',
    dashboardRoute: '/dashboard/citizen',
    color: '#6366F1',
    icon: 'verified_user',
    features: ['Detailed title & encumbrance audit', 'Stamp duty & cess verification', 'Dual TOC digital signature'],
    notes: 'Conducts fee audit and signs TOC with citizen parties.',
  },
  {
    category: 'OFFICER',
    roleName: 'Circle / Revenue Officer',
    levelBadge: 'L5 Circle (Tezpur)',
    name: 'Kabita Barman',
    uid: 'BSO-CRO-AS090501-000001',
    email: 'co.tezpur@bhoomisetu.gov.in',
    jurisdiction: 'Tezpur Circle',
    mode: 'EMPLOYEE',
    dashboardRoute: '/dashboard/citizen',
    color: '#3B82F6',
    icon: 'pin_drop',
    features: ['Dual Hex Handshake verification', 'Preliminary scrutiny & survey check', 'Forward / Return / Hold transfer'],
    notes: 'Verifies simultaneous out-of-band codes from Buyer & Seller.',
  },
  {
    category: 'OFFICER',
    roleName: 'Circle / Revenue Officer',
    levelBadge: 'L5 Circle (Dhekiajuli)',
    name: 'Deepak Kalita',
    uid: 'BSO-CRO-AS090502-000001',
    email: 'co.dhekiajuli@bhoomisetu.gov.in',
    jurisdiction: 'Dhekiajuli Circle',
    mode: 'EMPLOYEE',
    dashboardRoute: '/dashboard/citizen',
    color: '#0EA5E9',
    icon: 'explore',
    features: ['Boundary scrutiny for Dhekiajuli', 'Prevents cross-jurisdiction transfer violations', 'Independent Circle workflow'],
    notes: 'Demonstrates multi-circle jurisdiction scoping isolation.',
  },
  {
    category: 'OFFICER',
    roleName: 'Village Officer (Borghat)',
    levelBadge: 'L6 Village',
    name: 'Ranjit Bora',
    uid: 'BSO-VLO-AS09050101-000001',
    email: 'vo.borghat@bhoomisetu.gov.in',
    jurisdiction: 'Borghat Village',
    mode: 'EMPLOYEE',
    dashboardRoute: '/dashboard/citizen',
    color: '#10B981',
    icon: 'home_work',
    features: ['Field boundary verification', 'Physical inspection reports', 'Local grievance triage'],
    notes: 'Covers parcels in Borghat village.',
  },
  {
    category: 'OFFICER',
    roleName: 'Village Officer (Nikashi)',
    levelBadge: 'L6 Village',
    name: 'Junali Das',
    uid: 'BSO-VLO-AS09050102-000001',
    email: 'vo.nikashi@bhoomisetu.gov.in',
    jurisdiction: 'Nikashi Village',
    mode: 'EMPLOYEE',
    dashboardRoute: '/dashboard/citizen',
    color: '#14B8A6',
    icon: 'nature_people',
    features: ['Field inspection for Nikashi plots', 'Physical demarcation check', 'Grievance intake'],
    notes: 'Covers parcels in Nikashi village.',
  },
  {
    category: 'OFFICER',
    roleName: 'Village Officer (Bhomoraguri)',
    levelBadge: 'L6 Village',
    name: 'Bijoy Gogoi',
    uid: 'BSO-VLO-AS09050201-000001',
    email: 'vo.bhomoraguri@bhoomisetu.gov.in',
    jurisdiction: 'Bhomoraguri Village',
    mode: 'EMPLOYEE',
    dashboardRoute: '/dashboard/citizen',
    color: '#84CC16',
    icon: 'cottage',
    features: ['Dhekiajuli circle village verification', 'Floodplain boundary checking', 'Local field notes'],
    notes: 'Covers parcels in Bhomoraguri village.',
  },
];

// Curated list of all 30 citizen landowners in the database
export const ALL_CITIZENS: DemoAccount[] = [
  'Anjan Borah', 'Bina Kalita', 'Chiranjib Das', 'Dipika Hazarika', 'Eshan Goswami',
  'Farida Begum', 'Gautam Nath', 'Himadri Sharma', 'Indrani Phukan', 'Jagadish Saikia',
  'Kaveri Bhuyan', 'Lakshmi Devi', 'Manoj Chetia', 'Nandita Baruah', 'Om Prakash Agarwal',
  'Pallabi Mahanta', 'Quamrul Islam', 'Rupjyoti Bora', 'Sunita Tamuli', 'Tapan Medhi',
  'Uma Sharma', 'Vikram Singh', 'Wahida Ahmed', 'Xorai Pegu', 'Yogesh Rajbongshi',
  'Zubeen Dutta', 'Arjun Neog', 'Bharati Konwar', 'Chandan Sut', 'Dhruba Rajkhowa',
].map((name, i) => {
  const idx = i + 1;
  const village = idx <= 10 ? 'Borghat, Tezpur' : idx <= 20 ? 'Nikashi, Tezpur' : 'Bhomoraguri, Dhekiajuli';
  return {
    category: 'CITIZEN',
    roleName: 'Citizen / Landowner',
    levelBadge: `L7 Citizen #${idx}`,
    name,
    uid: `BSC-AS-2026-${String(idx).padStart(8, '0')}`,
    email: `citizen${idx}@bhoomisetu.demo`,
    jurisdiction: village,
    mode: 'CITIZEN',
    dashboardRoute: '/dashboard/citizen',
    color: '#10B981',
    icon: 'person',
    features: ['View owned plots on GIS GeoPortal', 'Submit transfer applications', 'Pay Khajana (Land Tax)', 'Sign NOC & TOC with step-up auth'],
    notes: `Registered landowner in ${village}.`,
  };
});

export function DemoDataShowcase() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'OFFICERS' | 'CITIZENS'>('OFFICERS');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const displayedAccounts = (activeTab === 'OFFICERS' ? ALL_OFFICERS : ALL_CITIZENS).filter(acc => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      acc.name.toLowerCase().includes(q) ||
      acc.roleName.toLowerCase().includes(q) ||
      acc.uid.toLowerCase().includes(q) ||
      acc.jurisdiction.toLowerCase().includes(q)
    );
  });

  const handleInstantLogin = async (acc: DemoAccount) => {
    setLoadingId(acc.uid);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: acc.uid,
          password: 'Demo@12345',
          mode: acc.mode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.user) {
        const route = data.user.dashboardRoute || acc.dashboardRoute;
        router.push(route);
      } else {
        alert(data.error?.message || 'Login failed');
        setLoadingId(null);
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting to authentication server.');
      setLoadingId(null);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="w-full">
      {/* Top Header & Search Control */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8 pb-4 border-b border-[var(--color-border)]">
        {/* Category Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveTab('OFFICERS'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'OFFICERS'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/30'
                : 'bg-[var(--color-bg)] text-slate-400 hover:text-white border border-[var(--color-border)]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">assured_workload</span>
            <span>All Government Officers ({ALL_OFFICERS.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('CITIZENS'); setSearchQuery(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              activeTab === 'CITIZENS'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 ring-1 ring-emerald-400/30'
                : 'bg-[var(--color-bg)] text-slate-400 hover:text-white border border-[var(--color-border)]'
            }`}
          >
            <span className="material-symbols-outlined text-sm">groups</span>
            <span>All Citizens ({ALL_CITIZENS.length})</span>
          </button>
        </div>

        {/* Search input + Master credentials badge */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab.toLowerCase()} by name, UID, area...`}
              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="inline-flex items-center gap-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 rounded-xl shrink-0">
            <span className="material-symbols-outlined text-sm">key</span>
            <span>Master Password: <strong className="font-mono text-white">Demo@12345</strong></span>
          </div>
        </div>
      </div>

      {/* Grid of interactive demo role cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedAccounts.map((acc) => (
          <div
            key={acc.uid}
            className="card group hover:border-indigo-500/40 hover:shadow-glow transition-all duration-300 flex flex-col justify-between relative overflow-hidden bg-[var(--color-bg-card)]/90 backdrop-blur-md"
          >
            {/* Top accent line matching role color */}
            <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: acc.color }} />

            <div>
              {/* Header with avatar & role badge */}
              <div className="flex items-start justify-between gap-3 mb-4 pt-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0"
                    style={{ background: `linear-gradient(135deg, ${acc.color}, ${acc.color}99)` }}
                  >
                    <span className="material-symbols-outlined text-xl">{acc.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-tight group-hover:text-indigo-300 transition-colors">
                      {acc.name}
                    </h3>
                    <p className="text-xs text-slate-400">{acc.roleName}</p>
                  </div>
                </div>

                <span
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold tracking-tight border shrink-0"
                  style={{
                    backgroundColor: `${acc.color}15`,
                    color: acc.color,
                    borderColor: `${acc.color}35`,
                  }}
                >
                  {acc.levelBadge}
                </span>
              </div>

              {/* UID and Jurisdiction details */}
              <div className="space-y-2 bg-[var(--color-bg)]/60 rounded-xl p-3 border border-[var(--color-border)]/60 mb-4 text-xs font-mono">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">UID:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-200 select-all">{acc.uid}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(acc.uid, acc.uid)}
                      className="text-slate-400 hover:text-white p-0.5"
                      title="Copy UID"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {copiedId === acc.uid ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-500">Jurisdiction:</span>
                  <span className="text-slate-200 truncate max-w-[170px]" title={acc.jurisdiction}>
                    {acc.jurisdiction}
                  </span>
                </div>
              </div>

              {/* Authority / Capability bullet points */}
              <div className="mb-5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Role Capabilities:
                </div>
                <ul className="space-y-1.5">
                  {acc.features.map((feat, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-slate-300">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                      <span className="line-clamp-1">{feat}</span>
                    </li>
                  ))}
                </ul>
                {acc.notes && (
                  <p className="mt-3 text-[11px] text-slate-400 italic border-l-2 border-slate-700 pl-2">
                    {acc.notes}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="pt-3 border-t border-[var(--color-border)]/60">
              <button
                type="button"
                onClick={() => handleInstantLogin(acc)}
                disabled={loadingId !== null}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${acc.color}dd, ${acc.color}aa)`,
                }}
              >
                {loadingId === acc.uid ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">login</span>
                    <span>1-Click Sign In as {acc.name.split(' ')[0]}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {displayedAccounts.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No personas found matching &quot;{searchQuery}&quot;.
        </div>
      )}
    </div>
  );
}
