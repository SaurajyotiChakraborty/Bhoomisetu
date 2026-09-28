'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface WorkflowStage {
  id: string;
  stepNum: string;
  title: string;
  shortTitle: string;
  actor: string;
  actorLevel: string;
  roleColor: string;
  status: string;
  icon: string;
  summary: string;
  securityInvariant: string;
  details: {
    label: string;
    value: string;
    isBadge?: boolean;
    badgeVariant?: 'success' | 'warning' | 'info' | 'purple';
  }[];
  branchActions: {
    type: 'forward' | 'return' | 'hold' | 'reject';
    label: string;
    description: string;
  }[];
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 'citizen-submit',
    stepNum: '01',
    title: 'Citizen Seller Initiates & Buyer Consent',
    shortTitle: 'Citizen Initiation',
    actor: 'Citizen (Seller & Buyer)',
    actorLevel: 'L7 Citizen',
    roleColor: '#F59E0B',
    status: 'SUBMITTED_AWAITING_COUNTERPARTY',
    icon: 'edit_document',
    summary: 'The seller selects their verified cadastral parcel on the GIS map and initiates transfer. The counterparty buyer receives notification to inspect the terms and give digital consent.',
    securityInvariant: 'Counterparty PII protected: Public parcel lookups never leak Aadhaar, PAN, phone, or address.',
    details: [
      { label: 'Parcel Selected', value: 'Plot #Sonitpur-TZP-104 (Bhoomi Cadastre)' },
      { label: 'Declared Area', value: '1,420 m² (Patta #4892)' },
      { label: 'Buyer Acceptance', value: 'Confirmed via OTP', isBadge: true, badgeVariant: 'success' },
      { label: 'Next Transition', value: 'Cryptographic Handshake Generation' }
    ],
    branchActions: [
      { type: 'forward', label: 'Buyer Accepts', description: 'Triggers issuance of separate hex handshake codes.' },
      { type: 'reject', label: 'Buyer Declines', description: 'Transaction immediately cancelled without officer intervention.' }
    ]
  },
  {
    id: 'hex-dispatch',
    stepNum: '02',
    title: 'Dual Out-of-Band Hex Handshake',
    shortTitle: 'Dual Hex Handshake',
    actor: 'Cryptographic Core Engine',
    actorLevel: 'Zero-Trust Protocol',
    roleColor: '#8B5CF6',
    status: 'AT_CIRCLE_OFFICER_HANDSHAKE',
    icon: 'lock_clock',
    summary: 'The system generates two independent 6-digit hex tokens delivered strictly out-of-band via encrypted SMS & Email directly to the respective parties. Prevents unilateral officer fraud.',
    securityInvariant: 'Hex handshake codes are NEVER rendered in the web UI. 72-hour hard expiration with max 3 attempts.',
    details: [
      { label: 'Seller Secret Token', value: 'Delivered via Encrypted SMS (+91 98*** 12345)' },
      { label: 'Buyer Secret Token', value: 'Delivered via Email (b****@domain.in)' },
      { label: 'Web UI Exposure', value: '0% (Hidden at DB & API Layer)', isBadge: true, badgeVariant: 'purple' },
      { label: 'Handshake TTL', value: '71h 59m remaining' }
    ],
    branchActions: [
      { type: 'forward', label: 'Codes Received', description: 'Parties attend Circle Office or submit to Circle Officer.' },
      { type: 'hold', label: '72h Expiry Timeout', description: 'Application lapses automatically if not completed in time.' }
    ]
  },
  {
    id: 'circle-handshake',
    stepNum: '03',
    title: 'Circle Officer Dual-Code Clearance',
    shortTitle: 'CO Handshake Check',
    actor: 'Circle Officer (Tezpur Circle)',
    actorLevel: 'L5 Circle Officer',
    roleColor: '#3B82F6',
    status: 'AT_CIRCLE_OFFICER_HANDSHAKE',
    icon: 'security',
    summary: 'The Circle Officer inputs BOTH the Seller Code and Buyer Code in a single atomic API submission. The server verifies argon2id salted hashes to prove mutual physical or verified intent.',
    securityInvariant: 'Atomic handshake verification: Both codes validated together. 3 failed attempts permanently lock the application.',
    details: [
      { label: 'Presiding Officer', value: 'BSO-CRO-AS090501-000001 (Tezpur)' },
      { label: 'Submission Method', value: 'Simultaneous Dual-Code Token Match' },
      { label: 'Anti-Tamper Lock', value: 'Attempt 1 of 3 (Verified)', isBadge: true, badgeVariant: 'success' },
      { label: 'Jurisdiction Check', value: 'Sonitpur / Tezpur / Borghat (Authorized)' }
    ],
    branchActions: [
      { type: 'forward', label: 'Handshake Verified', description: 'Unlocks the application for statutory revenue verification.' },
      { type: 'reject', label: 'Failed 3 Times', description: 'Application permanently rejected due to suspected coercion or spoofing.' }
    ]
  },
  {
    id: 'circle-verification',
    stepNum: '04',
    title: 'Circle Revenue & Cadastral Scrutiny',
    shortTitle: 'Revenue Verification',
    actor: 'Circle / Revenue Officer',
    actorLevel: 'L5 Circle Officer',
    roleColor: '#3B82F6',
    status: 'AT_CIRCLE_OFFICER_VERIFICATION',
    icon: 'travel_explore',
    summary: 'The Circle Officer inspects the cadastral boundaries, mutation history, local encumbrances, and runs GeoEngine spatial verification to detect any encroachment or area discrepancy.',
    securityInvariant: 'Government source data is read-only: Parcel geometry and survey numbers can never be mutated by users.',
    details: [
      { label: 'GeoEngine Check', value: 'Turf.js / PostGIS Polygon Validated' },
      { label: 'Area Variance', value: '0.4% (Threshold: < 5%)', isBadge: true, badgeVariant: 'success' },
      { label: 'Dispute Register', value: 'Clean Title (No active civil suits)' },
      { label: 'Officer Remark', value: 'Boundary flags confirmed on field inspection' }
    ],
    branchActions: [
      { type: 'forward', label: 'Forward to Tehsildar', description: 'Endorses application and escalates to Tehsil office.' },
      { type: 'return', label: 'Return for Clarification', description: 'Requires additional evidence from landowner.' },
      { type: 'hold', label: 'Place on Hold', description: 'Suspends processing pending field demarcation.' },
      { type: 'reject', label: 'Reject with Reason', description: 'Declines transfer with mandatory >= 20 char justification.' }
    ]
  },
  {
    id: 'tehsildar-review',
    stepNum: '05',
    title: 'Tehsildar Detailed & Fee Assessment',
    shortTitle: 'Tehsil & Fee Scrutiny',
    actor: 'Tehsildar',
    actorLevel: 'L4 Tehsildar',
    roleColor: '#EC4899',
    status: 'AT_TEHSILDAR_VERIFICATION',
    icon: 'receipt_long',
    summary: 'Detailed statutory verification under state land revenue regulations. Calculates stamp duty, registration fee, mutation cess, and verifies Khajana (land revenue tax) clearance.',
    securityInvariant: 'Audit row written at every step: Actor, jurisdiction, previous status, reason (>= 20 chars), and timestamp.',
    details: [
      { label: 'Statutory Stamp Duty', value: '₹ 42,600 (Assam Stamp Regs)' },
      { label: 'Khajana (Land Tax)', value: 'Paid Up to Date (FY 2025-26)', isBadge: true, badgeVariant: 'success' },
      { label: 'Mutation Cess', value: '₹ 1,500 (E-Treasury Verified)' },
      { label: 'Officer Jurisdiction', value: 'Tezpur Tehsil Administrative Unit' }
    ],
    branchActions: [
      { type: 'forward', label: 'Escalate to SDO', description: 'Submits certified file to Sub-Collector for final sanction.' },
      { type: 'return', label: 'Return to Circle Officer', description: 'Requests re-verification of boundary markers.' },
      { type: 'hold', label: 'Hold for Tax Clearance', description: 'Awaits payment of arrears or inheritance affidavit.' },
      { type: 'reject', label: 'Statutory Rejection', description: 'Formal rejection under RFCTLARR / Revenue codes.' }
    ]
  },
  {
    id: 'sdo-approval',
    stepNum: '06',
    title: 'SDO Final Review & Step-up MFA',
    shortTitle: 'SDO Sanction',
    actor: 'Sub-Collector / SDO',
    actorLevel: 'L3 Sub-Divisional Officer',
    roleColor: '#6366F1',
    status: 'AT_SDO_APPROVAL',
    icon: 'verified_user',
    summary: 'The Sub-Divisional Officer holds the statutory authority to approve the transfer. Requires step-up biometric/OTP re-authentication to prevent session hijacking before signing.',
    securityInvariant: 'Enforce twice: UI and API independently verify SDO jurisdiction hierarchy and step-up auth credentials.',
    details: [
      { label: 'Sanctioning Officer', value: 'BSO-SDO-AS0905-000001 (SDO Tezpur)' },
      { label: 'Step-up Authentication', value: 'Hardware MFA Authenticated', isBadge: true, badgeVariant: 'info' },
      { label: 'Hierarchy Check', value: 'L3 SDO (Valid approval authority)' },
      { label: 'Approval Status', value: 'Final Sanction Granted' }
    ],
    branchActions: [
      { type: 'forward', label: 'Grant Approval', description: 'Triggers generation of the official Deed of Declaration.' },
      { type: 'return', label: 'Return to Tehsildar', description: 'Orders re-audit of fee or ownership hierarchy.' },
      { type: 'reject', label: 'Veto & Reject', description: 'Dismisses transfer application with formal gazetted reason.' }
    ]
  },
  {
    id: 'digital-signature',
    stepNum: '07',
    title: 'Tripartite Declaration & e-Sign',
    shortTitle: 'Tripartite e-Sign',
    actor: 'Seller, Buyer & SDO',
    actorLevel: 'Cryptographic Attestation',
    roleColor: '#14B8A6',
    status: 'AWAITING_DIGITAL_SIGNATURES',
    icon: 'draw',
    summary: 'The official Government Deed of Land Transfer is compiled as a signed PDF artifact. Seller, Buyer, and SDO countersign with timestamped cryptographic hashes.',
    securityInvariant: 'Cryptographic document seal: SHA-256 hash of final PDF locked with digital signature manifests.',
    details: [
      { label: 'Deed Document', value: 'Deed-LTA-2026-00000001.pdf (A4 Official)' },
      { label: 'Document SHA-256', value: '0x8f2d...3a9c (Tamper-evident)' },
      { label: 'Seller Signature', value: 'Cryptographically Verified', isBadge: true, badgeVariant: 'success' },
      { label: 'Buyer Signature', value: 'Cryptographically Verified', isBadge: true, badgeVariant: 'success' },
      { label: 'SDO Official Seal', value: 'Signed with DSC Token', isBadge: true, badgeVariant: 'success' }
    ],
    branchActions: [
      { type: 'forward', label: 'All Signatures Complete', description: 'Invokes the final atomic completion transaction.' },
      { type: 'hold', label: 'Awaiting Counterparty', description: 'Pending digital sign-off from either party.' }
    ]
  },
  {
    id: 'atomic-completion',
    stepNum: '08',
    title: 'Atomic DB Mutex & Title Transfer',
    shortTitle: 'Atomic Completion',
    actor: 'Database Ledger Engine',
    actorLevel: 'Immutable Storage',
    roleColor: '#10B981',
    status: 'TRANSFER_COMPLETED',
    icon: 'task_alt',
    summary: 'applyVerifiedTransfer() executes inside an isolated database transaction with the app.transfer_completion mutex flag: updates parcel owner, appends ownership history, writes immutable audit log.',
    securityInvariant: 'Strict Invariant: The ONLY permitted parcel mutation is current_owner_id + ownership_type inside applyVerifiedTransfer(). Audit log is append-only.',
    details: [
      { label: 'Execution Mode', value: 'Single Atomic SQLite/Postgres Transaction' },
      { label: 'Parcel Mutation', value: 'Owner updated to Buyer UID' },
      { label: 'Ownership History', value: 'Immutable record appended (#HIST-2026-009)' },
      { label: 'Audit Trail', value: 'Tamper-proof row written with cryptographic hash', isBadge: true, badgeVariant: 'success' },
      { label: 'Application State', value: 'TRANSFER_COMPLETED (Final)', isBadge: true, badgeVariant: 'success' }
    ],
    branchActions: [
      { type: 'forward', label: 'Transfer Finalized', description: 'New Digital Land Certificate issued to Citizen Buyer.' }
    ]
  }
];

export default function WorkflowFlowchart() {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<'normal' | 'fast'>('normal');
  const [activeTab, setActiveTab] = useState<'interactive' | 'hierarchy' | 'invariants'>('interactive');
  const [simulatedAction, setSimulatedAction] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeStage = WORKFLOW_STAGES[currentStepIndex];

  // Auto-play interval effect
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const intervalTime = playbackSpeed === 'normal' ? 3800 : 2000;
    timerRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % WORKFLOW_STAGES.length);
      setSimulatedAction(null);
    }, intervalTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  const handleNext = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => (prev + 1) % WORKFLOW_STAGES.length);
    setSimulatedAction(null);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => (prev - 1 + WORKFLOW_STAGES.length) % WORKFLOW_STAGES.length);
    setSimulatedAction(null);
  };

  const handleSelectStep = (idx: number) => {
    setIsPlaying(false);
    setCurrentStepIndex(idx);
    setSimulatedAction(null);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="w-full relative">
      {/* Background Ambience */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-emerald-500/20 blur-xl opacity-50 -z-10 pointer-events-none" />

      {/* Main Glass Container */}
      <div className="rounded-3xl border border-slate-700/60 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <span className="material-symbols-outlined text-xl">account_tree</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-white font-bold text-sm tracking-tight">Interactive Transfer Workflow Engine</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live Animated
                </span>
              </div>
              <p className="text-xs text-slate-400">Canonical 8-Stage Revenue Approval Pipeline</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="hidden md:flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60 mr-2 text-xs">
              <button
                onClick={() => setActiveTab('interactive')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'interactive'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Simulation
              </button>
              <button
                onClick={() => setActiveTab('hierarchy')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'hierarchy'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Revenue Chain
              </button>
              <button
                onClick={() => setActiveTab('invariants')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  activeTab === 'invariants'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Invariants
              </button>
            </div>

            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isPlaying
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              }`}
              title={isPlaying ? 'Pause Auto-Play' : 'Start Auto-Play'}
            >
              <span className="material-symbols-outlined text-base">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            {/* Speed Toggle */}
            <button
              onClick={() => setPlaybackSpeed(playbackSpeed === 'normal' ? 'fast' : 'normal')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition-all"
              title="Toggle animation playback speed"
            >
              {playbackSpeed === 'normal' ? '1.0x' : '2.0x'}
            </button>

            {/* Prev / Next Buttons */}
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all"
              title="Previous Step"
            >
              <span className="material-symbols-outlined text-lg leading-none">chevron_left</span>
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white transition-all"
              title="Next Step"
            >
              <span className="material-symbols-outlined text-lg leading-none">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Interactive Workflow Canvas */}
        {activeTab === 'interactive' && (
          <div className="p-6 lg:p-8 space-y-8">
            
            {/* Top Step Progress Strip */}
            <div className="relative">
              {/* Horizontal Connecting Guide Line */}
              <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-800 -z-0" />
              
              {/* Dynamic Animated Laser Beam Line showing progress */}
              <div
                className="absolute top-6 left-6 h-0.5 bg-gradient-to-r from-amber-400 via-indigo-500 to-emerald-400 transition-all duration-500 -z-0 shadow-lg shadow-indigo-500/50"
                style={{
                  width: `${(currentStepIndex / (WORKFLOW_STAGES.length - 1)) * 96}%`,
                }}
              />

              {/* Step Bubbles Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 relative z-10">
                {WORKFLOW_STAGES.map((stage, idx) => {
                  const isActive = idx === currentStepIndex;
                  const isCompleted = idx < currentStepIndex;

                  return (
                    <button
                      key={stage.id}
                      onClick={() => handleSelectStep(idx)}
                      className="group flex flex-col items-center text-center focus:outline-none"
                    >
                      {/* Step Circle Node */}
                      <div className="relative flex items-center justify-center">
                        {/* Outer Glow Ring if Active */}
                        {isActive && (
                          <div
                            className="absolute -inset-2 rounded-2xl animate-pulse-ring opacity-60"
                            style={{ backgroundColor: stage.roleColor }}
                          />
                        )}

                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm transition-all duration-300 border ${
                            isActive
                              ? 'scale-110 shadow-xl border-white text-white'
                              : isCompleted
                              ? 'bg-slate-800 text-emerald-400 border-emerald-500/40'
                              : 'bg-slate-900 text-slate-500 border-slate-800 hover:border-slate-700'
                          }`}
                          style={{
                            background: isActive
                              ? `linear-gradient(135deg, ${stage.roleColor}, #1E1B4B)`
                              : undefined,
                            boxShadow: isActive ? `0 0 20px ${stage.roleColor}60` : undefined,
                          }}
                        >
                          <span className="material-symbols-outlined text-xl">
                            {isCompleted ? 'check' : stage.icon}
                          </span>
                        </div>
                      </div>

                      {/* Step Subtext */}
                      <div className="mt-2 hidden sm:block">
                        <span
                          className={`text-[11px] font-semibold tracking-wider block transition-colors ${
                            isActive
                              ? 'text-white'
                              : isCompleted
                              ? 'text-slate-300'
                              : 'text-slate-500 group-hover:text-slate-400'
                          }`}
                        >
                          {stage.stepNum}
                        </span>
                        <span
                          className={`text-[10px] leading-tight block truncate max-w-[85px] ${
                            isActive ? 'text-indigo-300 font-medium' : 'text-slate-400'
                          }`}
                        >
                          {stage.shortTitle}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Center Stage Presentation Canvas */}
            <div className="grid lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: Visual Actor Flowchart Node (7 Cols) */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 flex flex-col justify-between relative overflow-hidden">
                {/* Background Ambient SVG Animated Flow */}
                <div className="absolute inset-0 pointer-events-none opacity-20">
                  <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="50%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#10B981" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 20 120 C 150 40, 250 200, 400 100 S 550 50, 700 140"
                      fill="none"
                      stroke="url(#flowGrad)"
                      strokeWidth="3"
                      strokeDasharray="8 6"
                      className="animate-flow-dash"
                    />
                  </svg>
                </div>

                <div>
                  {/* Stage Badges Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="px-3 py-1 rounded-lg text-xs font-bold font-mono tracking-wider text-white shadow-sm"
                        style={{ backgroundColor: activeStage.roleColor }}
                      >
                        STAGE {activeStage.stepNum}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        {activeStage.actorLevel}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>{activeStage.status}</span>
                    </div>
                  </div>

                  {/* Stage Title & Summary */}
                  <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
                    {activeStage.title}
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-6">
                    {activeStage.summary}
                  </p>

                  {/* Security Invariant Callout */}
                  <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-start gap-3 mb-6">
                    <div className="p-1 rounded-lg bg-indigo-500/20 text-indigo-400 shrink-0">
                      <span className="material-symbols-outlined text-lg leading-none">verified</span>
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                        Constitutional Platform Invariant
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 leading-snug">
                        {activeStage.securityInvariant}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Animated Actor Swimlane Preview */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                    <span>Revenue Actor Hierarchy Pipeline</span>
                    <span className="text-[10px] text-slate-500 font-normal">Active Role in Light</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { role: 'Citizen (L7)', icon: 'person', active: currentStepIndex === 0 || currentStepIndex === 1 },
                      { role: 'Circle Off (L5)', icon: 'gavel', active: currentStepIndex === 2 || currentStepIndex === 3 },
                      { role: 'Tehsildar (L4)', icon: 'account_balance', active: currentStepIndex === 4 },
                      { role: 'SDO / Ledger (L3)', icon: 'verified', active: currentStepIndex >= 5 },
                    ].map((actorItem, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-lg border text-center transition-all ${
                          actorItem.active
                            ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/20 scale-[1.02]'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-lg block mb-1 ${actorItem.active ? 'text-indigo-400' : 'text-slate-600'}`}>
                          {actorItem.icon}
                        </span>
                        <span className="text-[10px] font-medium leading-tight block">
                          {actorItem.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Live Telemetry & Simulated State Machine (5 Cols) */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-slate-950/90 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400 text-lg">terminal</span>
                      <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                        State Machine Telemetry
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      TransferStateMachine.ts
                    </span>
                  </div>

                  {/* Telemetry Rows */}
                  <div className="space-y-3 font-mono text-xs">
                    {activeStage.details.map((detail, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between gap-2"
                      >
                        <span className="text-slate-400 text-[11px]">{detail.label}</span>
                        {detail.isBadge ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              detail.badgeVariant === 'success'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : detail.badgeVariant === 'purple'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            {detail.value}
                          </span>
                        ) : (
                          <span className="text-slate-200 text-right font-medium truncate max-w-[200px]">
                            {detail.value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Simulated Action Feedback if clicked */}
                  {simulatedAction && (
                    <div className="mt-4 p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 text-xs animate-scale-in flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">check_circle</span>
                      <span>{simulatedAction}</span>
                    </div>
                  )}
                </div>

                {/* Statutory Branch Actions Simulation */}
                <div className="mt-6 pt-4 border-t border-slate-800">
                  <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">tune</span>
                    <span>Officer Statutory Options at this Stage</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {activeStage.branchActions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSimulatedAction(`Simulated action: "${action.label}" — ${action.description}`);
                        }}
                        className={`p-2 rounded-lg text-left text-[11px] font-medium transition-all border ${
                          action.type === 'forward'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                            : action.type === 'return'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                            : action.type === 'hold'
                            ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 hover:bg-blue-500/20'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">
                            {action.type === 'forward'
                              ? 'arrow_forward'
                              : action.type === 'return'
                              ? 'keyboard_return'
                              : action.type === 'hold'
                              ? 'pause_circle'
                              : 'cancel'}
                          </span>
                          <span>{action.label}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                          {action.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom 4 Governance Pillars */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {[
                {
                  title: 'Forward & Approve',
                  code: 'ACTION_FORWARD',
                  desc: 'Escalates to next higher officer in revenue tree. Requires mandatory reason (≥ 20 chars).',
                  color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
                  icon: 'upgrade',
                },
                {
                  title: 'Return with Remarks',
                  code: 'ACTION_RETURN',
                  desc: 'Sends back to citizen or lower officer for boundary or document clarification without cancellation.',
                  color: 'border-amber-500/30 bg-amber-500/5 text-amber-400',
                  icon: 'undo',
                },
                {
                  title: 'Hold for Dispute',
                  code: 'ACTION_HOLD',
                  desc: 'Suspends statutory SLA timer when civil litigation or field demarcation is requested.',
                  color: 'border-blue-500/30 bg-blue-500/5 text-blue-400',
                  icon: 'pause_circle',
                },
                {
                  title: 'Reject & Seal',
                  code: 'ACTION_REJECT',
                  desc: 'Permanently terminates application. Writes tamper-proof immutable audit record to the ledger.',
                  color: 'border-rose-500/30 bg-rose-500/5 text-rose-400',
                  icon: 'block',
                },
              ].map((pill, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border ${pill.color} backdrop-blur-sm transition-all hover:scale-[1.01]`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="material-symbols-outlined text-lg">{pill.icon}</span>
                    <span className="font-bold text-xs text-white">{pill.title}</span>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">{pill.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Revenue Chain Hierarchy View */}
        {activeTab === 'hierarchy' && (
          <div className="p-6 lg:p-8 space-y-6">
            <div className="max-w-3xl">
              <h3 className="text-xl font-bold text-white mb-2">Revenue Administration Hierarchy</h3>
              <p className="text-slate-400 text-sm">
                Bhoomisetu strictly adheres to integer-based hierarchical levels. An officer may only act on parcels inside their jurisdictional path (descendant or equal).
              </p>
            </div>

            <div className="space-y-3">
              {[
                { level: 'L1', title: 'Division Commissioner', scope: 'Division Level', badge: 'Broadest Read Scope', desc: 'Highest monitoring authority. Zero write access to source records. Oversees multi-district land policy.' },
                { level: 'L2', title: 'District Collector (DC)', scope: 'District Level', badge: 'Executive Head', desc: 'Oversees district revenue cadastre, land acquisition awards, and resolves inter-tehsil appeals.' },
                { level: 'L3', title: 'Sub-Collector / SDO', scope: 'Sub-Division', badge: '★ Final Transfer Approval', desc: 'Empowered authority to approve ownership mutations after multi-factor biometric step-up authentication.' },
                { level: 'L4', title: 'Tehsildar', scope: 'Tehsil Level', badge: '★ Fee & Scrutiny Authority', desc: 'Validates stamp duties, mutation fees, Khajana land taxes, and inspects inheritance lineage.' },
                { level: 'L5', title: 'Circle Officer (CO)', scope: 'Circle Level', badge: '★ Hex Handshake & Cadastre', desc: 'Executes out-of-band dual hex handshake verification and spatial boundary validation.' },
                { level: 'L6', title: 'Village Officer (Lot Mondal)', scope: 'Village Panchayat', badge: 'Ground Field Cadastre', desc: 'Ground verification of physical occupation, crop records, and local possession.' },
                { level: 'L7', title: 'Citizen / Landowner', scope: 'Self Parcels Only', badge: 'Constituent User', desc: 'Views own parcels on GIS map, requests digital mutations, and signs tripartite deeds.' }
              ].map((h, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-500/40 transition-all"
                  style={{ marginLeft: `${i * 12}px` }}
                >
                  <div className="flex items-center gap-4">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0">
                      {h.level}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{h.title}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-indigo-300 border border-slate-700 font-normal">
                          {h.scope}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{h.desc}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 whitespace-nowrap self-start sm:self-auto">
                    {h.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Security Invariants */}
        {activeTab === 'invariants' && (
          <div className="p-6 lg:p-8 space-y-6">
            <div className="max-w-3xl">
              <h3 className="text-xl font-bold text-white mb-2">Constitutional Security Invariants</h3>
              <p className="text-slate-400 text-sm">
                Non-negotiable architectural rules enforced across both UI and API layers in Bhoomisetu.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {[
                {
                  title: '1. Immutable User & Officer IDs',
                  desc: 'Identifiers (e.g. BSC-AS-2026-00000001) are immutable forever. No admin tool, migration, or support workflow can alter them.',
                  icon: 'fingerprint'
                },
                {
                  title: '2. Zero Database Superuser',
                  desc: 'Even the Division Commissioner has zero write access to source records. No single actor can bypass revenue checks.',
                  icon: 'shield_locked'
                },
                {
                  title: '3. Read-Only Government Source Data',
                  desc: 'Parcels, survey numbers, patta numbers, declared area, and geometry are permanently immutable by user actions. Corrections require audited requests.',
                  icon: 'menu_book'
                },
                {
                  title: '4. Atomic applyVerifiedTransfer() Mutex',
                  desc: 'The only parcel mutation permitted is current_owner_id + ownership_type, written solely by the verified completion transaction with mutex lock.',
                  icon: 'vpn_key'
                },
                {
                  title: '5. Dual Enforcement (API + UI)',
                  desc: 'Every rule the web UI renders is independently evaluated by the API backend. A hidden button is never treated as security.',
                  icon: 'lock'
                },
                {
                  title: '6. Append-Only Audit Ledger',
                  desc: 'No UPDATE or DELETE is ever permitted on the audit ledger. Enforced via database triggers and revoked database grants.',
                  icon: 'history_edu'
                }
              ].map((inv, i) => (
                <div key={i} className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <span className="material-symbols-outlined text-lg">{inv.icon}</span>
                    <h4 className="font-bold text-sm text-white">{inv.title}</h4>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{inv.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Quick Links */}
        <div className="px-6 py-4 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Fully compliant with RFCTLARR Act & Assam Land Revenue Manual</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/geoportal"
              className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Explore Parcels on GIS</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
            <Link
              href="/login"
              className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 transition-colors"
            >
              <span>Test with Demo Credentials</span>
              <span className="material-symbols-outlined text-sm">key</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
