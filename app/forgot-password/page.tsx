'use client';

import Link from 'next/link';
import { ArrowLeft, Wrench, KeyRound, Headphones } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-[var(--color-bg)] relative overflow-hidden py-10 px-4 sm:px-6">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A]" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.15), transparent 70%)',
        }}
      />

      {/* Centralized Container */}
      <div className="w-full max-w-[460px] mx-auto my-auto relative z-10 animate-fade-in">
        {/* Top bar with Back to Login and Logo */}
        <div className="flex items-center justify-between mb-4 px-1">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-indigo-400 transition-colors group"
            id="back-to-login-link"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Sign In
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-emerald-700 flex items-center justify-center text-white font-bold text-xs shadow-md">
              भू
            </div>
            <span className="font-bold text-sm text-white tracking-tight">Bhoomisetu</span>
          </Link>
        </div>

        {/* Central Card */}
        <div className="card-glass !p-8 sm:!p-9 rounded-2xl border border-[var(--color-border)] shadow-2xl relative overflow-hidden text-center">
          {/* Construction / In Development Icon */}
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-amber-500/10">
            <Wrench className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold uppercase tracking-wider mb-4">
            Feature Under Development
          </span>

          <h1 className="text-2xl font-bold text-white mb-3">Password Recovery</h1>

          <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed mb-6">
            Self-service digital password reset with Aadhaar OTP verification is currently under development for the national portal rollout.
          </p>

          {/* Guidance Box */}
          <div className="bg-[var(--color-bg)] rounded-xl border border-[var(--color-border)] p-4 text-left space-y-3 mb-6">
            <div className="flex items-start gap-3">
              <KeyRound className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-slate-200">Demo Environment Access:</span>
                <p className="text-[var(--color-text-muted)] mt-0.5">
                  All demo accounts are configured with the shared password: <code className="text-indigo-300 font-mono font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Demo@12345</code>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 pt-2 border-t border-[var(--color-border)]">
              <Headphones className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-semibold text-slate-200">Official Assistance:</span>
                <p className="text-[var(--color-text-muted)] mt-0.5">
                  Revenue officers should contact their SDO administrator. Citizens can use 1-Click quick login or register a new account.
                </p>
              </div>
            </div>
          </div>

          <Link
            href="/login"
            className="btn btn-primary w-full btn-lg flex items-center justify-center gap-2"
            id="return-to-login-btn"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Sign In
          </Link>
        </div>
      </div>

      {/* Simple footer note */}
      <div className="relative z-10 text-center text-xs text-[var(--color-text-muted)] mt-6">
        © {new Date().getFullYear()} Bhoomisetu • Department of Revenue & Land Records
      </div>
    </div>
  );
}
