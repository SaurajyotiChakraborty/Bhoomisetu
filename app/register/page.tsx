'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Wand2,
  User,
  Fingerprint,
  Home,
  ClipboardCheck,
  CheckCircle2,
  Check,
  AlertCircle,
  UserCheck,
  Copy,
  LogIn,
  Loader2,
} from 'lucide-react';

type Step = 'personal' | 'identity' | 'address' | 'verify' | 'success';

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPw, setCopiedPw] = useState(false);
  const [citizenUid, setCitizenUid] = useState('');
  const [initialPassword, setInitialPassword] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    mobile: '',
    aadhaar: '',
    aadhaarLinkedMobile: '',
    pan: '',
    dateOfBirth: '',
    addressLine1: '',
    addressLine2: '',
    villageTown: 'Borghat',
    district: 'Sonitpur',
    state: 'Assam',
    pin: '784001',
  });

  function updateForm(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  function handleQuickFill() {
    const rand = Date.now().toString().slice(-5);
    const randDigits = Math.floor(1000 + Math.random() * 9000);
    const names = ['Rameshwar Borah', 'Dipali Saikia', 'Ananta Hazarika', 'Nirupama Das', 'Pranab Kalita'];
    const selectedName = names[Math.floor(Math.random() * names.length)];

    setForm({
      fullName: selectedName,
      email: `citizen.${rand}@assam.demo`,
      mobile: `98765${rand}`,
      aadhaar: `234567${rand}${rand.slice(0, 1)}`,
      aadhaarLinkedMobile: `98765${rand}`,
      pan: `ABCPE${randDigits}F`,
      dateOfBirth: '1992-06-15',
      addressLine1: 'House No. 42, Tezpur Road',
      addressLine2: 'Near Borghat Namghar',
      villageTown: 'Borghat',
      district: 'Sonitpur',
      state: 'Assam',
      pin: '784001',
    });
    setError('');
  }

  function validateCurrentStep(): boolean {
    setError('');

    if (step === 'personal') {
      if (!form.fullName.trim() || form.fullName.trim().length < 3) {
        setError('Full Name must be at least 3 characters long.');
        return false;
      }
      if (!/^[a-zA-Z\s.]+$/.test(form.fullName)) {
        setError('Full Name can only contain letters, spaces, and dots.');
        return false;
      }
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError('Please enter a valid email address.');
        return false;
      }
      if (!form.mobile || !/^[6-9]\d{9}$/.test(form.mobile)) {
        setError('Mobile number must be a valid 10-digit Indian number starting with 6, 7, 8, or 9.');
        return false;
      }
      if (!form.dateOfBirth) {
        setError('Date of birth is required.');
        return false;
      }
      const dob = new Date(form.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
      }
      if (age < 18) {
        setError('Applicant must be at least 18 years old to register.');
        return false;
      }
    } else if (step === 'identity') {
      if (!form.aadhaar || !/^\d{12}$/.test(form.aadhaar)) {
        setError('Aadhaar must be exactly 12 digits.');
        return false;
      }
      if (form.aadhaar.startsWith('0') || form.aadhaar.startsWith('1')) {
        setError('Aadhaar number cannot start with 0 or 1.');
        return false;
      }
      if (!form.aadhaarLinkedMobile || !/^[6-9]\d{9}$/.test(form.aadhaarLinkedMobile)) {
        setError('Aadhaar-linked mobile must be a valid 10-digit Indian number.');
        return false;
      }
      if (!form.pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(form.pan)) {
        setError('Invalid PAN format (e.g., ABCPE1234F).');
        return false;
      }
      if (!'PCHFATBLJG'.includes(form.pan[3])) {
        setError('4th character of PAN must be one of P, C, H, F, A, T, B, L, J, or G.');
        return false;
      }
    } else if (step === 'address') {
      if (!form.addressLine1.trim()) {
        setError('Address Line 1 is required.');
        return false;
      }
      if (!form.villageTown.trim()) {
        setError('Village / Town is required.');
        return false;
      }
      if (!form.district.trim()) {
        setError('District is required.');
        return false;
      }
      if (!form.state.trim()) {
        setError('State is required.');
        return false;
      }
      if (!form.pin || !/^\d{6}$/.test(form.pin)) {
        setError('PIN code must be exactly 6 digits.');
        return false;
      }
    }

    return true;
  }

  function handleContinue() {
    if (!validateCurrentStep()) return;
    const nextIdx = currentStepIdx + 1;
    if (nextIdx < steps.length) {
      setStep(steps[nextIdx].key);
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!validateCurrentStep()) return;

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
      setError('Connection failed. Please verify the server is running and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDirectSignIn() {
    if (!citizenUid || !initialPassword) {
      router.push('/login');
      return;
    }

    setSigningIn(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: citizenUid,
          password: initialPassword,
          mode: 'CITIZEN',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Fallback to manual login page
        router.push(`/login?identifier=${encodeURIComponent(citizenUid)}`);
        return;
      }

      // Successful auto-login, navigate directly to dashboard
      window.location.href = data.user?.dashboardRoute || '/dashboard/citizen';
    } catch {
      router.push(`/login?identifier=${encodeURIComponent(citizenUid)}`);
    } finally {
      setSigningIn(false);
    }
  }

  function copyToClipboard(text: string, type: 'id' | 'pw') {
    navigator.clipboard.writeText(text);
    if (type === 'id') {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedPw(true);
      setTimeout(() => setCopiedPw(false), 2000);
    }
  }

  const steps: { key: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'personal', label: 'Personal', icon: User },
    { key: 'identity', label: 'Identity', icon: Fingerprint },
    { key: 'address', label: 'Address', icon: Home },
    { key: 'verify', label: 'Review', icon: ClipboardCheck },
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
        {/* Navigation & Quick Actions */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-indigo-400 transition-colors group"
            id="register-back-to-home-link"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          {step !== 'success' && (
            <button
              type="button"
              onClick={handleQuickFill}
              className="text-xs px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 font-medium shadow-sm"
              id="quick-fill-demo-citizen"
            >
              <Wand2 className="w-3.5 h-3.5" />
              Quick Fill Demo Citizen
            </button>
          )}
        </div>

        {step !== 'success' && (
          <>
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-8">
              {steps.map((s, i) => {
                const StepIcon = s.icon;
                return (
                  <div key={s.key} className="flex items-center gap-2">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                        i < currentStepIdx
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : i === currentStepIdx
                          ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-lg shadow-indigo-500/10'
                          : 'bg-[var(--color-bg-card)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                      }`}
                      onClick={() => {
                        if (i < currentStepIdx) setStep(s.key);
                      }}
                    >
                      {i < currentStepIdx ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <StepIcon className="w-5 h-5" />
                      )}
                    </div>
                    <span className={`text-sm hidden sm:block ${i === currentStepIdx ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}>
                      {s.label}
                    </span>
                    {i < steps.length - 1 && <div className={`w-8 h-0.5 rounded-full ${i < currentStepIdx ? 'bg-emerald-500' : 'bg-[var(--color-border)]'}`} />}
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (step === 'verify') {
                  handleSubmit();
                } else {
                  handleContinue();
                }
              }}
            >
              {/* Step 1: Personal */}
              {step === 'personal' && (
                <div className="card animate-fade-in space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                      <User className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text-heading)]">Personal Information</h2>
                      <p className="text-xs text-[var(--color-text-muted)]">Official details matching your identity documents</p>
                    </div>
                  </div>
                  <div>
                    <label className="label">Full Name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Rameshwar Borah (letters only)"
                      value={form.fullName}
                      onChange={e => updateForm('fullName', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Email Address *</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="e.g. rameshwar.borah@example.com"
                      value={form.email}
                      onChange={e => updateForm('email', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Mobile Number (10 digits) *</label>
                    <input
                      className="input"
                      placeholder="e.g. 9876543210 (starts with 6-9)"
                      value={form.mobile}
                      onChange={e => updateForm('mobile', e.target.value)}
                      maxLength={10}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Date of Birth *</label>
                    <input
                      className="input"
                      type="date"
                      value={form.dateOfBirth}
                      onChange={e => updateForm('dateOfBirth', e.target.value)}
                      required
                    />
                    <span className="text-xs text-[var(--color-text-muted)] mt-1 block">Applicant must be at least 18 years old</span>
                  </div>
                </div>
              )}

              {/* Step 2: Identity */}
              {step === 'identity' && (
                <div className="card animate-fade-in space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
                      <Fingerprint className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text-heading)]">Identity Verification</h2>
                      <p className="text-xs text-[var(--color-text-muted)]">Encrypted at rest with field-level format validation</p>
                    </div>
                  </div>
                  <div>
                    <label className="label">Aadhaar Number (12 digits) *</label>
                    <input
                      className="input"
                      placeholder="e.g. 234567890123 (cannot start with 0 or 1)"
                      value={form.aadhaar}
                      onChange={e => updateForm('aadhaar', e.target.value)}
                      maxLength={12}
                      required
                    />
                    <span className="text-xs text-[var(--color-text-muted)] mt-1 block">Format validated & encrypted at rest</span>
                  </div>
                  <div>
                    <label className="label">Aadhaar-linked Mobile *</label>
                    <input
                      className="input"
                      placeholder="e.g. 9876543210"
                      value={form.aadhaarLinkedMobile}
                      onChange={e => updateForm('aadhaarLinkedMobile', e.target.value)}
                      maxLength={10}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">PAN Number (10 alphanumeric) *</label>
                    <input
                      className="input font-mono uppercase"
                      placeholder="e.g. ABCPE1234F (4th char must be P, C, H, F, A, T, B, L, J, G)"
                      value={form.pan}
                      onChange={e => updateForm('pan', e.target.value.toUpperCase())}
                      maxLength={10}
                      required
                    />
                    <span className="text-xs text-[var(--color-text-muted)] mt-1 block">Format checked against statutory pattern</span>
                  </div>
                </div>
              )}

              {/* Step 3: Address */}
              {step === 'address' && (
                <div className="card animate-fade-in space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <Home className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text-heading)]">Residential Address</h2>
                      <p className="text-xs text-[var(--color-text-muted)]">Permanent revenue residency records</p>
                    </div>
                  </div>
                  <div>
                    <label className="label">Address Line 1 *</label>
                    <input
                      className="input"
                      placeholder="House / Flat No., Road / Lane"
                      value={form.addressLine1}
                      onChange={e => updateForm('addressLine1', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Address Line 2 (Optional)</label>
                    <input
                      className="input"
                      placeholder="Landmark, locality"
                      value={form.addressLine2}
                      onChange={e => updateForm('addressLine2', e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Village / Town *</label>
                      <input
                        className="input"
                        value={form.villageTown}
                        onChange={e => updateForm('villageTown', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">District *</label>
                      <input
                        className="input"
                        value={form.district}
                        onChange={e => updateForm('district', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">State *</label>
                      <input
                        className="input"
                        value={form.state}
                        onChange={e => updateForm('state', e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="label">PIN Code (6 digits) *</label>
                      <input
                        className="input"
                        placeholder="784001"
                        value={form.pin}
                        onChange={e => updateForm('pin', e.target.value)}
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 'verify' && (
                <div className="card animate-fade-in space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <ClipboardCheck className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-[var(--color-text-heading)]">Review Your Information</h2>
                      <p className="text-xs text-[var(--color-text-muted)]">Please verify all information before finalizing registration</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    {Object.entries({
                      'Full Name': form.fullName,
                      'Email': form.email,
                      'Mobile': form.mobile,
                      'Date of Birth': form.dateOfBirth,
                      'Aadhaar': form.aadhaar ? `XXXX XXXX ${form.aadhaar.slice(-4)}` : '—',
                      'PAN': form.pan ? `${form.pan.slice(0, 5)}****${form.pan.slice(-1)}` : '—',
                      'Address': `${form.addressLine1}, ${form.villageTown}`,
                      'District': `${form.district}, ${form.state} - ${form.pin}`,
                    }).map(([key, value]) => (
                      <div key={key} className="p-3 rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)]">
                        <span className="label text-xs">{key}</span>
                        <span className="block font-medium text-[var(--color-text)] mt-0.5">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-scale-in flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Registration Issue</div>
                    <div>{error}</div>
                  </div>
                </div>
              )}

              {/* Stepper Buttons */}
              <div className="flex items-center justify-between mt-6">
                {currentStepIdx > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setStep(steps[currentStepIdx - 1].key);
                    }}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                ) : (
                  <Link href="/login" className="btn btn-ghost flex items-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                  </Link>
                )}

                {step === 'verify' ? (
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="btn btn-primary btn-lg flex items-center gap-2"
                    id="submit-register-btn"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Registering Citizen...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4" />
                        Complete Registration
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="btn btn-primary btn-lg flex items-center gap-2"
                    id="continue-step-btn"
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="card text-center py-12 animate-scale-in max-w-xl mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3 text-[var(--color-text-heading)]">Registration Successful!</h2>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm">
              Your official Bhoomisetu Citizen ID has been provisioned. Keep this permanent identifier and generated password safe.
            </p>

            <div className="p-4 rounded-xl bg-[var(--color-bg)] border border-[var(--color-border)] mb-4 text-left">
              <div className="flex items-center justify-between mb-1">
                <span className="label text-xs">Citizen UID (Permanent & Immutable)</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(citizenUid, 'id')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedId ? 'Copied!' : 'Copy UID'}
                </button>
              </div>
              <div className="text-xl font-bold font-mono text-indigo-400 select-all">{citizenUid}</div>
            </div>

            {initialPassword && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-6 text-left">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs uppercase tracking-wider font-semibold text-amber-400">Generated Initial Password</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(initialPassword, 'pw')}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedPw ? 'Copied!' : 'Copy Password'}
                  </button>
                </div>
                <div className="text-lg font-bold font-mono text-white select-all">{initialPassword}</div>
                <div className="text-xs text-slate-400 mt-1">Use this password together with your Citizen UID to authenticate</div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleDirectSignIn}
                disabled={signingIn}
                className="btn btn-primary btn-lg w-full flex items-center justify-center gap-2"
                id="direct-sign-in-btn"
              >
                {signingIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing into Dashboard...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Sign In Directly to Citizen Dashboard
                  </>
                )}
              </button>

              <Link
                href={`/login?identifier=${encodeURIComponent(citizenUid)}&password=${encodeURIComponent(initialPassword)}`}
                className="btn btn-secondary w-full flex items-center justify-center gap-2"
              >
                Proceed to Sign In Screen
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
