'use client';

import Link from 'next/link';
import WorkflowFlowchart from './components/WorkflowFlowchart';
import { DemoDataShowcase } from './components/DemoDataShowcase';

const FEATURES = [
  {
    icon: 'map',
    title: 'Interactive GIS Map',
    desc: 'Click on any plot in India to see its exact borders, owner name, survey number, and acquisition status.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: 'approval',
    title: 'Fast Online Approvals',
    desc: 'Replaces physical paper files with an automated digital approval pipeline between Central, State, and District levels.',
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    icon: 'account_balance',
    title: 'Direct Bank Transfer (DBT)',
    desc: 'Compensation goes straight to the farmer\'s bank account with Aadhaar verification — zero middlemen.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: 'family_home',
    title: 'Family Care (R&R)',
    desc: 'Tracks new houses, schools, and job training for families displaced by projects.',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    icon: 'smart_toy',
    title: 'Smart AI Alerts',
    desc: 'Automatically flags delayed approvals, budget overruns, and potential litigation risks before they happen.',
    gradient: 'from-rose-500 to-pink-600',
  },
];

const HIERARCHY = [
  { level: 'L1', role: 'Division Commissioner', scope: 'Division Level — Broadest Read Scope', color: '#6366F1' },
  { level: 'L2', role: 'District Collector', scope: 'District Level — Executive Administration', color: '#818CF8' },
  { level: 'L3', role: 'Sub-Collector / SDO', scope: 'Sub-Division — ★ Final Transfer Approval', color: '#3B82F6' },
  { level: 'L4', role: 'Tehsildar', scope: 'Tehsil — ★ Detailed & Fee Verification', color: '#EC4899' },
  { level: 'L5', role: 'Circle / Revenue Officer', scope: 'Circle — ★ Hex Handshake & Cadastre', color: '#10B981' },
  { level: 'L6', role: 'Village / Gram Panchayat', scope: 'Village — Ground Boundary Demarcation', color: '#14B8A6' },
  { level: 'L7', role: 'Citizen / Landowner', scope: 'Self Cadastral Parcels Only', color: '#F59E0B' },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-bg)]">
      {/* ========== HERO ========== */}
      <header className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A]" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 30% 20%, rgba(99, 102, 241, 0.15), transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(16, 185, 129, 0.1), transparent 60%)',
        }} />
        {/* Ambient Expansive Background Waves */}
        <div className="hero-ambient-waves">
          <svg viewBox="0 0 1440 600" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            {/* Back ambient wave - Indigo glow */}
            <path
              className="ambient-wave-3"
              d="M0 320C240 220 480 380 720 280C960 180 1200 340 1440 260V600H0V320Z"
              fill="url(#ambient-grad-1)"
              opacity="0.35"
            />
            {/* Middle ambient wave - Emerald & Cyan subtle tone */}
            <path
              className="ambient-wave-2"
              d="M0 380C280 440 560 290 840 370C1120 450 1320 330 1440 360V600H0V380Z"
              fill="url(#ambient-grad-2)"
              opacity="0.25"
            />
            {/* Front ambient wave - Deep indigo surge */}
            <path
              className="ambient-wave-1"
              d="M0 430C320 360 640 460 960 400C1280 340 1380 420 1440 440V600H0V430Z"
              fill="url(#ambient-grad-3)"
              opacity="0.4"
            />
            <defs>
              <linearGradient id="ambient-grad-1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="ambient-grad-2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.05" />
              </linearGradient>
              <linearGradient id="ambient-grad-3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#312E81" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#1E1B4B" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#0F172A" stopOpacity="0.8" />
              </linearGradient>
            </defs>
          </svg>
        </div>


        {/* Nav */}
        <nav className="relative z-10 flex items-center justify-between max-w-7xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">
              भू
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Bhoomisetu</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#demo-data" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-medium text-sm border border-amber-500/20 transition-all">
              <span className="material-symbols-outlined text-lg">badge</span>
              <span className="hidden sm:inline">Demo Personas</span>
            </a>
            <a href="#workflow-flowchart" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 font-medium text-sm border border-indigo-500/20 transition-all">
              <span className="material-symbols-outlined text-lg">schema</span>
              <span className="hidden sm:inline">Workflow Chart</span>
            </a>
            <Link href="/geoportal" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-medium text-sm border border-emerald-500/20 transition-all">
              <span className="material-symbols-outlined text-lg">public</span>
              <span className="hidden sm:inline">GIS GeoPortal</span>
            </Link>
            <Link href="/login" className="btn btn-ghost text-white/70 hover:text-white">
              Sign In
            </Link>
            <Link href="/register" className="btn btn-primary">
              Register
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col lg:flex-row items-center justify-between gap-10">
          <div className="max-w-3xl flex-1">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-6 animate-fade-in">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              Ministry of Rural Development (DoLR)
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              National Land Acquisition
              <br />
              <span className="text-gradient">& Management System</span>
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              One Unified National Web Portal where every single land acquisition across India is managed and tracked digitally in real time. Ensuring direct bank transfers and caring for displaced families.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Link href="/geoportal" className="btn btn-lg !bg-gradient-to-r !from-indigo-600 !to-purple-600 !text-white hover:!shadow-lg hover:!shadow-indigo-500/25 !border-none">
                <span className="material-symbols-outlined">public</span>
                Launch GIS GeoPortal
              </Link>
              <Link href="/register" className="btn btn-lg !bg-gradient-to-r !from-emerald-500 !to-teal-600 !text-white hover:!shadow-lg hover:!shadow-emerald-500/20 !border-none">
                <span className="material-symbols-outlined">person_add</span>
                Register as Citizen
              </Link>
              <Link href="/login" className="btn btn-lg !bg-white/5 !text-white !border !border-white/10 hover:!bg-white/10">
                <span className="material-symbols-outlined">login</span>
                Sign In
              </Link>
            </div>
          </div>

          {/* Floating stats */}
          <div className="hidden lg:flex flex-col gap-4">
            {[
              { value: '4', label: 'Admin Roles', icon: 'account_tree' },
              { value: '7', label: 'Acquisition Steps', icon: 'swap_horiz' },
              { value: 'AI', label: 'Risk Alerts', icon: 'smart_toy' },
            ].map((stat, i) => (
              <div key={i} className="card-glass !p-4 text-center min-w-[120px] animate-fade-in" style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                <span className="material-symbols-outlined text-indigo-400 text-2xl mb-1 block">{stat.icon}</span>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Animated Wave divider */}
        <div className="hero-waves-container">
          <svg
            className="hero-waves"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            viewBox="0 20 150 32"
            preserveAspectRatio="none"
            shapeRendering="auto"
          >
            <defs>
              <path
                id="gentle-wave"
                d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
              />
            </defs>
            <g className="parallax-wave">
              <use xlinkHref="#gentle-wave" x="48" y="-4" fill="rgba(99, 102, 241, 0.16)" />
              <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(16, 185, 129, 0.12)" />
              <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(79, 70, 229, 0.2)" />
              <use xlinkHref="#gentle-wave" x="48" y="6" fill="rgba(30, 41, 59, 0.8)" />
              <use xlinkHref="#gentle-wave" x="48" y="8" fill="var(--color-bg)" />
            </g>
          </svg>
        </div>
      </header>

      {/* ========== FEATURES ========== */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-sm">widgets</span>
            Platform Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-heading)] mb-4">How Bhoomisetu Works</h2>
          <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            A transparent, audited land acquisition process that moves through a statutory chain of approvals — every step verified, every action recorded under RFCTLARR Act 2013.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <div key={i} className="card group hover:border-indigo-500/30 hover:shadow-glow animate-fade-in relative overflow-hidden" style={{ animationDelay: `${0.1 * i}s` }}>
              {/* Subtle gradient glow on hover */}
              <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                <span className="material-symbols-outlined text-white text-xl">{feature.icon}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-[var(--color-text-heading)] group-hover:text-indigo-300 transition-colors">{feature.title}</h3>
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ========== ANIMATED TRANSFER WORKFLOW FLOWCHART ========== */}
      <section id="workflow-flowchart" className="bg-[var(--color-bg-card)] border-y border-[var(--color-border)] py-20 relative scroll-mt-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <span className="material-symbols-outlined text-sm">swap_horiz</span>
              Statutory Transfer Pipeline
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-heading)] mb-4">
              Interactive Workflow & Verification Pipeline
            </h2>
            <p className="text-[var(--color-text-secondary)] max-w-3xl mx-auto text-sm sm:text-base leading-relaxed">
              Explore how land transfers progress through Assam revenue administration — from citizen initiation and dual out-of-band hex handshakes to Tehsildar fee scrutiny, SDO digital sanction, and atomic database title transfer.
            </p>
          </div>

          {/* Interactive Animated Flowchart Component */}
          <WorkflowFlowchart />
        </div>
      </section>

      {/* ========== LIVE DEMO ACCOUNTS & ROLES ========== */}
      <section id="demo-data" className="max-w-7xl mx-auto px-6 py-20 relative scroll-mt-6">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-sm">badge</span>
            Live Database Personas
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-heading)] mb-4">
            Explore with Pre-Loaded Demo Accounts
          </h2>
          <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
            Every revenue officer and citizen landowner is active in the local database. Click any persona below for <strong>instant 1-click login</strong> into their authentic, role-scoped portal.
          </p>
        </div>

        {/* Demo data interactive showcase */}
        <DemoDataShowcase />
      </section>


      {/* ========== HIERARCHY ========== */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <span className="material-symbols-outlined text-sm">account_tree</span>
            Organizational Chart
          </span>
          <h2 className="text-3xl font-bold text-[var(--color-text-heading)]">Administrative Hierarchy</h2>
        </div>
        <div className="max-w-2xl mx-auto space-y-3">
          {HIERARCHY.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-border)] hover:border-indigo-500/30 hover:shadow-glow transition-all animate-fade-in group cursor-default"
              style={{ animationDelay: `${0.05 * i}s`, marginLeft: `${i * 24}px` }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${item.color}, ${item.color}dd)` }}
              >
                {item.level}
              </div>
              <div>
                <div className="font-semibold text-sm text-[var(--color-text-heading)] group-hover:text-indigo-300 transition-colors">{item.role}</div>
                <div className="text-xs text-[var(--color-text-muted)]">{item.scope}</div>
              </div>
              <span className="material-symbols-outlined text-sm text-[var(--color-text-muted)] ml-auto group-hover:text-indigo-400 transition-colors">chevron_right</span>
            </div>
          ))}
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="border-t border-[var(--color-border)] mt-auto bg-[var(--color-bg-card)]">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm text-[var(--color-text-muted)]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-base">apartment</span>
            </div>
            <span>SIH26016 — National Land Acquisition System</span>
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            Ministry of Rural Development (DoLR)
          </div>
        </div>
      </footer>
    </div>
  );
}
