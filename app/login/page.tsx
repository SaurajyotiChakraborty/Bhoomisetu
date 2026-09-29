'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Building2,
  Contact,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  KeyRound,
} from 'lucide-react';

type LoginMode = 'CITIZEN' | 'EMPLOYEE';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('CITIZEN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('identifier');
      const pw = params.get('password');
      if (id) {
        setIdentifier(id);
        setMode('CITIZEN');
      }
      if (pw) {
        setPassword(pw);
      }
    }
  }, []);

  const executeLogin = async (id: string, pass: string, m: LoginMode) => {
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: id, password: pass, mode: m }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Login failed');
        return;
      }

      if (data.mustChangePassword) {
        router.push('/first-login/change-password');
        return;
      }

      // Redirect directly to role dashboard
      router.push(data.user.dashboardRoute);
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeLogin(identifier, password, mode);
  };

  const handleQuickLogin = (id: string, m: LoginMode) => {
    setIdentifier(id);
    setPassword('Demo@12345');
    setMode(m);
    setError('');
  };

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

      {/* Centralized Login Container */}
      <div className="w-full max-w-[460px] mx-auto my-auto relative z-10 animate-fade-in">
        {/* Top bar with Back to Home and Logo */}
        <div className="flex items-center justify-between mb-4 px-1">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-indigo-400 transition-colors group"
            id="back-to-home-link"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-600 to-emerald-700 flex items-center justify-center text-white font-bold text-xs shadow-md">
              भू
            </div>
            <span className="font-bold text-sm text-white tracking-tight">Bhoomisetu</span>
          </Link>
        </div>

        {/* Central Card */}
        <div className="card-glass !p-8 sm:!p-9 rounded-2xl border border-[var(--color-border)] shadow-2xl relative overflow-hidden">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome back</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Sign in to your account to continue
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] p-1 mb-6" id="login-mode-tabs">
            {(['CITIZEN', 'EMPLOYEE'] as LoginMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  mode === m
                    ? 'bg-indigo-500/15 text-indigo-400 shadow-sm border border-indigo-500/20'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent'
                }`}
                id={`login-tab-${m.toLowerCase()}`}
              >
                {m === 'CITIZEN' ? (
                  <User className="w-4 h-4 shrink-0" />
                ) : (
                  <Building2 className="w-4 h-4 shrink-0" />
                )}
                <span>{m === 'CITIZEN' ? 'Citizen' : 'Government'}</span>
              </button>
            ))}
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-identifier" className="label text-xs uppercase tracking-wider font-semibold text-slate-300">
                {mode === 'CITIZEN' ? 'Citizen ID or Email' : 'Officer ID'}
              </label>
              <div className="relative mt-1">
                <Contact className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-identifier"
                  type="text"
                  className="input !pl-10 w-full"
                  placeholder={mode === 'CITIZEN' ? 'Enter Citizen ID or email' : 'Enter Officer ID'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="login-password" className="label text-xs uppercase tracking-wider font-semibold text-slate-300 !mb-0">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input !pl-10 !pr-10 w-full"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-white transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in flex items-center gap-2" id="login-error">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full btn-lg !mt-6"
              id="login-submit"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4" />
                  Sign In
                </span>
              )}
            </button>
          </form>

          {mode === 'CITIZEN' && (
            <p className="text-center text-sm text-[var(--color-text-secondary)] mt-6">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-indigo-400 font-medium hover:text-indigo-300 hover:underline">
                Register here
              </Link>
            </p>
          )}

          {mode === 'EMPLOYEE' && (
            <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
              Officer accounts are issued by your appointing authority.
              <br />Contact your superior if you need access.
            </p>
          )}

          {/* Examiner & Demo Quick Login — Populate Credentials */}
          <div className="mt-6 pt-5 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] text-center mb-3 flex items-center justify-center gap-1.5 font-medium">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Examiner Test Accounts (Password: <code className="text-amber-300 font-mono">Demo@12345</code>)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Citizen', id: 'BSC-AS-2026-00000001', mode: 'CITIZEN' as LoginMode },
                { label: 'Village Officer', id: 'BSO-VLO-AS09050101-000001', mode: 'EMPLOYEE' as LoginMode },
                { label: 'Circle Officer', id: 'BSO-CRO-AS090501-000001', mode: 'EMPLOYEE' as LoginMode },
                { label: 'Tehsildar', id: 'BSO-TEH-AS0905-000001', mode: 'EMPLOYEE' as LoginMode },
                { label: 'SDO', id: 'BSO-SDO-AS0905-000001', mode: 'EMPLOYEE' as LoginMode },
                { label: 'District Collector', id: 'BSO-DCL-AS0901-000001', mode: 'EMPLOYEE' as LoginMode },
                { label: 'Division Comm', id: 'BSO-DVC-AS-000001', mode: 'EMPLOYEE' as LoginMode },
              ]
                .filter((quick) => quick.mode === mode)
                .map((quick, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickLogin(quick.id, quick.mode)}
                    className="btn btn-ghost btn-sm text-xs !border !border-[var(--color-border)] hover:!border-indigo-500/50 hover:!bg-indigo-500/10 flex-1 min-w-[45%] text-slate-300"
                    id={`dev-login-${quick.label.toLowerCase().replace(/[\s()]/g, '-')}`}
                  >
                    {quick.label}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Simple footer note */}
      <div className="relative z-10 text-center text-xs text-[var(--color-text-muted)] mt-6">
        © {new Date().getFullYear()} Bhoomisetu • Department of Revenue & Land Records
      </div>
    </div>
  );
}

