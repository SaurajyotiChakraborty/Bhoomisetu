'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type LoginMode = 'CITIZEN' | 'EMPLOYEE';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('CITIZEN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password, mode }),
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

      // Redirect to role dashboard
      router.push(data.user.dashboardRoute);
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Dark branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#0F172A]" />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at 20% 50%, rgba(99, 102, 241, 0.15), transparent 60%)',
        }} />
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='0.5'%3E%3Crect x='0' y='0' width='40' height='40'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />

        <div className="relative z-10 p-10">
          <Link href="/" className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">
              भू
            </div>
            <span className="text-white font-bold text-xl">Bhoomisetu</span>
          </Link>

          <div>
            <h2 className="text-3xl font-bold text-white leading-snug mb-6">
              Secure Access to<br />Your Land Records
            </h2>
            <p className="text-slate-400 leading-relaxed">
              Sign in to view your parcels on interactive maps, track transfer applications, and manage your land records through the digital revenue administration system.
            </p>
          </div>
        </div>

        <div className="relative z-10 p-10">
          <div>
            {[
              { icon: 'lock', text: 'End-to-end encrypted' },
              { icon: 'history', text: 'Every action audited' },
              { icon: 'satellite_alt', text: 'GIS-enabled land view' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-slate-500 text-sm mb-4">
                <span className="material-symbols-outlined text-lg text-indigo-400">{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 bg-[var(--color-bg)]">
        <div className="w-full max-w-[420px] animate-fade-in">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-600 to-emerald-700 flex items-center justify-center text-white font-bold shadow-lg">
                भू
              </div>
              <span className="font-bold text-lg text-[var(--color-text)]">Bhoomisetu</span>
            </Link>
          </div>

          <h1 className="text-2xl font-bold mb-2 text-[var(--color-text-heading)]">Welcome back</h1>
          <p className="text-[var(--color-text-secondary)] text-sm mb-8">
            Sign in to your account to continue
          </p>

          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-1 mb-8" id="login-mode-tabs">
            {(['CITIZEN', 'EMPLOYEE'] as LoginMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  mode === m
                    ? 'bg-indigo-500/15 text-indigo-400 shadow-sm border border-indigo-500/20'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] border border-transparent'
                }`}
                id={`login-tab-${m.toLowerCase()}`}
              >
                <span className="material-symbols-outlined text-lg">{m === 'CITIZEN' ? 'person' : 'assured_workload'}</span>
                {m === 'CITIZEN' ? 'Citizen' : 'Government'}
              </button>
            ))}
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <div className="mb-5">
              <label htmlFor="login-identifier" className="label">
                {mode === 'CITIZEN' ? 'Citizen ID or Email' : 'Officer ID'}
              </label>
              <div className="relative">
                <span className="material-symbols-outlined text-lg text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2">badge</span>
                <input
                  id="login-identifier"
                  type="text"
                  className="input !pl-10"
                  placeholder={mode === 'CITIZEN' ? 'BSC-AS-2026-00000001 or email' : 'BSO-DVC-AS-000001'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="label !mb-0">Password</label>
                <Link href="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="material-symbols-outlined text-lg text-[var(--color-text-muted)] absolute left-3 top-1/2 -translate-y-1/2">lock</span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input !pl-10 !pr-10"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                >
                  <span className="material-symbols-outlined text-lg">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in flex items-center gap-2" id="login-error">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full btn-lg"
              id="login-submit"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">login</span>
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
            <p className="text-center text-sm text-[var(--color-text-muted)] mt-6">
              Officer accounts are issued by your appointing authority.
              <br />Contact your superior if you need access.
            </p>
          )}

          {/* Dev Quick Login */}
          <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
            <p className="text-xs text-[var(--color-text-muted)] text-center mb-3 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">build</span>
              Dev Quick Login
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: 'Citizen', id: 'BSC-AS-2026-00000001', mode: 'CITIZEN' as LoginMode },
                { label: 'Village Officer', id: 'BSO-VLO-AS09050101-000001', mode: 'EMPLOYEE' as LoginMode },
                { label: 'Circle Officer', id: 'BSO-CRO-AS090501-000001', mode: 'EMPLOYEE' as LoginMode },
                { label: 'Tehsildar', id: 'BSO-TEH-AS0905-000001', mode: 'EMPLOYEE' as LoginMode },
                { label: 'SDO', id: 'BSO-SDO-AS0905-000001', mode: 'EMPLOYEE' as LoginMode },
                { label: 'Division Comm', id: 'BSO-DVC-AS-000001', mode: 'EMPLOYEE' as LoginMode },
              ].filter(quick => quick.mode === mode).map((quick, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setIdentifier(quick.id);
                    setPassword('Demo@12345');
                  }}
                  className="btn btn-ghost btn-sm text-xs !border !border-[var(--color-border)] hover:!border-indigo-500/30 flex-1 min-w-[45%]"
                  id={`dev-login-${quick.label.toLowerCase().replace(/\s/g, '-')}`}
                >
                  {quick.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
