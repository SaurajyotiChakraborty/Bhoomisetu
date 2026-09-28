'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Step = 'personal' | 'identity' | 'address' | 'verify' | 'success';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [citizenUid, setCitizenUid] = useState('');
  const [initialPassword, setInitialPassword] = useState('');

  const [form, setForm] = useState({
    fullName: '', email: '', mobile: '', aadhaar: '', aadhaarLinkedMobile: '',
    pan: '', dateOfBirth: '', addressLine1: '', addressLine2: '',
    villageTown: '', district: '', state: 'Assam', pin: '',
  });

  function updateForm(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/register/citizen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message || 'Registration failed');
        return;
      }

      setCitizenUid(data.citizenUid);
      if (data.initialPassword) {
        setInitialPassword(data.initialPassword);
      }
      setStep('success');
    } catch {
      setError('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const steps: { key: Step; label: string; icon: string }[] = [
    { key: 'personal', label: 'Personal', icon: 'person' },
    { key: 'identity', label: 'Identity', icon: 'fingerprint' },
    { key: 'address', label: 'Address', icon: 'home' },
    { key: 'verify', label: 'Review', icon: 'check_circle' },
  ];

  const currentStepIdx = steps.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="header-bar sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">
              भू
            </div>
            <span className="font-bold text-[var(--color-text)]">Bhoomisetu</span>
          </Link>
          <span className="text-[var(--color-border)]">|</span>
          <span className="text-sm text-[var(--color-text-secondary)]">Citizen Registration</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10 w-full flex-1">
        {/* Back to Home link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-indigo-400 mb-6 transition-colors group"
          id="register-back-to-home-link"
        >
          <span className="material-symbols-outlined text-base group-hover:-translate-x-1 transition-transform">arrow_back</span>
          Back to Home
        </Link>

        {step !== 'success' && (
          <>
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-8">
              {steps.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    i < currentStepIdx ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' :
                    i === currentStepIdx ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10' :
                    'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                  }`}>
                    {i < currentStepIdx ? (
                      <span className="material-symbols-outlined text-lg">check</span>
                    ) : (
                      <span className="material-symbols-outlined text-lg">{s.icon}</span>
                    )}
                  </div>
                  <span className={`text-sm hidden sm:block ${i === currentStepIdx ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                    {s.label}
                  </span>
                  {i < steps.length - 1 && <div className={`w-8 h-0.5 rounded-full ${i < currentStepIdx ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />}
                </div>
              ))}
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              if (step === 'verify') {
                handleSubmit(e);
              } else {
                const nextIdx = currentStepIdx + 1;
                if (nextIdx < steps.length) setStep(steps[nextIdx].key);
              }
            }}>
              {/* Step 1: Personal */}
              {step === 'personal' && (
                <div className="card animate-fade-in space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                      <span className="material-symbols-outlined text-indigo-400">person</span>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--color-text-heading)]">Personal Information</h2>
                  </div>
                  <div>
                    <label className="label">Full Name *</label>
                    <input className="input" placeholder="Enter your full name (3–100 characters)" value={form.fullName} onChange={e => updateForm('fullName', e.target.value)} required minLength={3} maxLength={100} pattern="[a-zA-Z\s.]+" />
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input className="input" type="email" placeholder="your.email@example.com" value={form.email} onChange={e => updateForm('email', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Mobile Number *</label>
                    <input className="input" placeholder="10-digit Indian mobile (6-9 start)" value={form.mobile} onChange={e => updateForm('mobile', e.target.value)} required pattern="[6-9]\d{9}" maxLength={10} />
                  </div>
                  <div>
                    <label className="label">Date of Birth *</label>
                    <input className="input" type="date" value={form.dateOfBirth} onChange={e => updateForm('dateOfBirth', e.target.value)} required />
                    <span className="text-xs text-[var(--color-text-muted)] mt-1 block">Must be 18 years or older</span>
                  </div>
                </div>
              )}

              {/* Step 2: Identity */}
              {step === 'identity' && (
                <div className="card animate-fade-in space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                      <span className="material-symbols-outlined text-purple-400">fingerprint</span>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text-heading)]">Identity Verification</h2>
                      <p className="text-xs text-[var(--color-text-muted)]">Format validation only — no government API verification</p>
                    </div>
                  </div>
                  <div>
                    <label className="label">Aadhaar Number *</label>
                    <input className="input" placeholder="12-digit Aadhaar number" value={form.aadhaar} onChange={e => updateForm('aadhaar', e.target.value)} required pattern="\d{12}" maxLength={12} />
                    <span className="text-xs text-[var(--color-text-muted)] mt-1 block">Demo field — format validated, not verified with UIDAI</span>
                  </div>
                  <div>
                    <label className="label">Aadhaar-linked Mobile *</label>
                    <input className="input" placeholder="Mobile linked to Aadhaar" value={form.aadhaarLinkedMobile} onChange={e => updateForm('aadhaarLinkedMobile', e.target.value)} required pattern="[6-9]\d{9}" maxLength={10} />
                  </div>
                  <div>
                    <label className="label">PAN Number *</label>
                    <input className="input font-mono uppercase" placeholder="ABCPD1234E" value={form.pan} onChange={e => updateForm('pan', e.target.value.toUpperCase())} required pattern="[A-Z]{5}[0-9]{4}[A-Z]" maxLength={10} />
                    <span className="text-xs text-[var(--color-text-muted)] mt-1 block">Demo field — format validated, not verified with NSDL</span>
                  </div>
                </div>
              )}

              {/* Step 3: Address */}
              {step === 'address' && (
                <div className="card animate-fade-in space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <span className="material-symbols-outlined text-emerald-400">home</span>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--color-text-heading)]">Address</h2>
                  </div>
                  <div>
                    <label className="label">Address Line 1 *</label>
                    <input className="input" placeholder="House/flat, street" value={form.addressLine1} onChange={e => updateForm('addressLine1', e.target.value)} required />
                  </div>
                  <div>
                    <label className="label">Address Line 2</label>
                    <input className="input" placeholder="Landmark, locality (optional)" value={form.addressLine2} onChange={e => updateForm('addressLine2', e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Village / Town *</label>
                      <input className="input" value={form.villageTown} onChange={e => updateForm('villageTown', e.target.value)} required />
                    </div>
                    <div>
                      <label className="label">District *</label>
                      <input className="input" value={form.district} onChange={e => updateForm('district', e.target.value)} required />
                    </div>
                    <div>
                      <label className="label">State *</label>
                      <input className="input" value={form.state} onChange={e => updateForm('state', e.target.value)} required />
                    </div>
                    <div>
                      <label className="label">PIN Code *</label>
                      <input className="input" placeholder="6 digits" value={form.pin} onChange={e => updateForm('pin', e.target.value)} required pattern="\d{6}" maxLength={6} />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 'verify' && (
                <div className="card animate-fade-in space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <span className="material-symbols-outlined text-amber-400">checklist</span>
                    </div>
                    <h2 className="text-xl font-bold text-[var(--color-text-heading)]">Review Your Information</h2>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries({
                      'Full Name': form.fullName,
                      'Email': form.email,
                      'Mobile': form.mobile,
                      'Date of Birth': form.dateOfBirth,
                      'Aadhaar': `XXXX XXXX ${form.aadhaar.slice(-4)}`,
                      'PAN': `${form.pan.slice(0, 5)}****${form.pan.slice(-1)}`,
                      'Address': `${form.addressLine1}, ${form.villageTown}`,
                      'District': `${form.district}, ${form.state} - ${form.pin}`,
                    }).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                        <span className="label">{key}</span>
                        <span className="block font-medium text-[var(--color-text)]">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">error</span>
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between mt-6">
                {currentStepIdx > 0 ? (
                  <button type="button" onClick={() => setStep(steps[currentStepIdx - 1].key)} className="btn btn-secondary">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Back
                  </button>
                ) : (
                  <Link href="/login" className="btn btn-ghost">
                    <span className="material-symbols-outlined text-lg">arrow_back</span>
                    Back to Login
                  </Link>
                )}

                <button type="submit" disabled={loading} className="btn btn-primary btn-lg">
                  {loading ? 'Processing...' : step === 'verify' ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">how_to_reg</span>
                      Register
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Continue
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </span>
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="card text-center py-12 animate-scale-in">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-emerald-400 text-4xl">check_circle</span>
            </div>
            <h2 className="text-2xl font-bold mb-3 text-[var(--color-text-heading)]">Registration Successful!</h2>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Your Bhoomisetu Citizen ID has been created. Your initial password has been sent to your email and mobile.
            </p>
            <div className="inline-block p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] mb-4">
              <div className="label">Your Citizen ID (permanent, immutable)</div>
              <div className="text-2xl font-bold font-mono text-indigo-400">{citizenUid}</div>
            </div>

            {initialPassword && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 max-w-sm mx-auto mb-6 text-center">
                <div className="text-xs uppercase tracking-wider font-semibold text-amber-400 mb-1">Generated Password (Demo Mode)</div>
                <div className="text-xl font-bold font-mono text-white select-all">{initialPassword}</div>
                <div className="text-xs text-slate-400 mt-1">Copy this password to sign in now</div>
              </div>
            )}
            <p className="text-sm text-[var(--color-text-muted)] mb-8 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-lg">warning</span>
              Save this ID — it can never be changed. Check your email for the initial password.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/login" className="btn btn-primary btn-lg">
                <span className="material-symbols-outlined text-lg">login</span>
                Sign In Now
              </Link>
              <Link href="/dev/outbox" className="btn btn-ghost">View Dev Outbox</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
