'use client';

import Link from 'next/link';
import WorkflowFlowchart from './components/WorkflowFlowchart';

const FEATURES = [
  {
    icon: 'map',
    title: 'Interactive Land Maps',
    desc: 'View your exact land borders, survey numbers, and plot area clearly on a live digital map.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: 'approval',
    title: 'Officer Approvals',
    desc: 'Land transfers move through Village Officer, Circle Officer, Tehsildar, and SDO with real-time tracking.',
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    icon: 'lock_person',
    title: 'Secret Hex Code Verification',
    desc: 'Buyer and seller get secret codes on their phone and verify them together in person before the officer to stop fraud.',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    icon: 'verified',
    title: 'Digital Ownership Certificate (TOC)',
    desc: 'Get a legally valid digital ownership deed signed online by buyer, seller, and revenue officer.',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    icon: 'receipt_long',
    title: 'Online Land Tax (Khajana)',
    desc: 'Check your annual land tax automatically and pay online to download instant government receipts.',
    gradient: 'from-rose-500 to-pink-600',
  },
  {
    icon: 'history_edu',
    title: 'Permanent History Record',
    desc: 'Every transfer and approval is safely locked in history so land records can never be faked or tampered with.',
    gradient: 'from-purple-500 to-indigo-600',
  },
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
        <div className="relative z-10 max-w-4xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm mb-6 animate-fade-in">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Department of Revenue & Land Records
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-white leading-tight tracking-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Digital Land Records &
            <br />
            <span className="text-gradient">Title Transfer Platform</span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            A secure online portal where citizens can view their land on digital maps, transfer property safely through verified officers, and pay land taxes easily.
          </p>
          <div className="flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
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
            Platform Features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-[var(--color-text-heading)] mb-4">How Bhoomisetu Works</h2>
          <p className="text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            A simple, safe, and transparent digital platform to view land on maps, transfer ownership smoothly, and pay land taxes online.
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


      {/* ========== FOOTER ========== */}
      <footer className="border-t border-[var(--color-border)] mt-auto bg-[var(--color-bg-card)]">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--color-text-muted)]">
          <div>
            © {new Date().getFullYear()} Bhoomisetu. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/geoportal" className="hover:text-white transition-colors">
              GIS GeoPortal
            </Link>
            <Link href="/login" className="hover:text-white transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Citizen Registration
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
