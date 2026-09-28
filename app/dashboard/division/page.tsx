'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DivisionDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'officers' | 'land' | 'stats'>('officers');

  const [officers, setOfficers] = useState<any[]>([]);
  const [jurisdictionFilter, setJurisdictionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedOfficer, setSelectedOfficer] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    officer_uid: '',
    full_name: '',
    email: '',
    phone: '',
    new_role: 'CIRCLE_OFF',
    new_jurisdiction: 'jur-as090501', // Example default
    password: ''
  });

  // Land State
  const [landData, setLandData] = useState<any[]>([]);
  const [landType, setLandType] = useState<'districts' | 'circles' | 'villages' | 'parcels'>('districts');
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]); // [{ type: 'district', name: 'Sonitpur' }]

  // Stats State
  const [stats, setStats] = useState<any[]>([]);

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (user) {
      if (activeTab === 'officers') fetchOfficers();
      else if (activeTab === 'land') fetchLand(breadcrumbs);
      else if (activeTab === 'stats') fetchStats();
    }
  }, [activeTab, user]);

  async function fetchMe() {
    try {
      const res = await fetch('/api/v1/me');
      if (!res.ok) throw new Error();
      const meData = await res.json();
      if (meData.role_code !== 'DIV_COMM') throw new Error();
      setUser(meData);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  async function fetchOfficers() {
    const res = await fetch('/api/v1/division/officers');
    const data = await res.json();
    if (res.ok) setOfficers(data.officers || []);
  }

  async function fetchLand(currentBreadcrumbs: any[]) {
    let url = '/api/v1/division/land?';
    currentBreadcrumbs.forEach(b => {
      url += `${b.type}=${encodeURIComponent(b.name)}&`;
    });
    const res = await fetch(url);
    const data = await res.json();
    if (res.ok) {
      setLandData(data.data || []);
      setLandType(data.type);
    }
  }

  async function fetchStats() {
    const res = await fetch('/api/v1/division/stats');
    const data = await res.json();
    if (res.ok) setStats(data.stats || []);
  }

  async function handleLogout() {
    document.cookie = 'access_token=; Max-Age=0; path=/';
    document.cookie = 'refresh_token=; Max-Age=0; path=/';
    router.push('/login');
  }

  async function resetPassword() {
    if (!selectedOfficer) return;
    try {
      const res = await fetch('/api/v1/division/officers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'RESET_PASSWORD',
          officer_uid: selectedOfficer.officer_uid,
          password: 'Demo@12345'
        })
      });
      if (res.ok) {
        alert('Password reset to Demo@12345');
        setIsResetModalOpen(false);
        setSelectedOfficer(null);
      } else {
        alert('Failed to reset password');
      }
    } catch {
      alert('Network error');
    }
  }

  async function onboardOfficer(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/division/officers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, action: 'CREATE_OFFICER' })
      });
      if (res.ok) {
        alert('Officer created successfully');
        setIsOnboardModalOpen(false);
        fetchOfficers();
      } else {
        alert('Failed to onboard officer');
      }
    } catch {
      alert('Network error');
    }
  }

  async function transferOfficer(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOfficer) return;
    try {
      const res = await fetch('/api/v1/division/officers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'TRANSFER_OFFICER',
          officer_uid: selectedOfficer.officer_uid,
          new_role: formData.new_role,
          new_jurisdiction: formData.new_jurisdiction
        })
      });
      if (res.ok) {
        alert('Officer transferred successfully');
        setIsTransferModalOpen(false);
        setSelectedOfficer(null);
        fetchOfficers();
      } else {
        alert('Failed to transfer officer');
      }
    } catch {
      alert('Network error');
    }
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      <header className="bg-[var(--color-bg-card)] border-b border-[var(--color-border-light)] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏛️</span>
            <div>
              <h1 className="font-bold text-lg leading-tight">Division Commissioner Panel</h1>
              <p className="text-xs text-[var(--color-text-secondary)]">{user.full_name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-400">Sign Out</button>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-6 flex-1 w-full flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Navigation */}
        <div className="md:w-64 shrink-0 bg-[var(--color-bg-sidebar)] rounded-xl p-3 flex flex-col gap-2 h-fit">
          <div className="font-bold px-3 py-2 text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">Control Panel</div>
          <button
            onClick={() => setActiveTab('officers')}
            className={`w-full text-left py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'officers'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm font-bold border-l-4 border-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)]/50 border-l-4 border-transparent'
            }`}
          >
            👥 Officer Management
          </button>
          <button
            onClick={() => setActiveTab('land')}
            className={`w-full text-left py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'land'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm font-bold border-l-4 border-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)]/50 border-l-4 border-transparent'
            }`}
          >
            🗺️ Global Land Registry
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`w-full text-left py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'stats'
                ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm font-bold border-l-4 border-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-card)]/50 border-l-4 border-transparent'
            }`}
          >
            📊 Revenue Statistics
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 bg-[var(--color-bg-card)] rounded-xl p-6 shadow-sm border border-[var(--color-border-light)]">
          {activeTab === 'officers' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Government Employee Accounts</h2>
                <div className="flex items-center gap-4">
                  <select 
                    className="input text-sm py-2 bg-[var(--color-bg-sidebar)] border-[var(--color-border)] min-w-[150px]" 
                    value={roleFilter} 
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="ALL">All Roles</option>
                    {Array.from(new Set(officers.map(o => o.role_code).filter(Boolean))).sort().map(role => (
                      <option key={role as string} value={role as string}>{role as string}</option>
                    ))}
                  </select>
                  <select 
                    className="input text-sm py-2 bg-[var(--color-bg-sidebar)] border-[var(--color-border)] min-w-[180px]" 
                    value={jurisdictionFilter} 
                    onChange={(e) => setJurisdictionFilter(e.target.value)}
                  >
                    <option value="ALL">All Areas</option>
                    {Array.from(new Set(officers.map(o => o.jurisdiction_name).filter(Boolean))).sort().map(area => (
                      <option key={area as string} value={area as string}>{area as string}</option>
                    ))}
                  </select>
                  <button 
                    onClick={() => {
                      setFormData({ ...formData, officer_uid: `BSO-NEW-${Date.now().toString().slice(-6)}`, password: 'Demo@12345' });
                      setIsOnboardModalOpen(true);
                    }}
                    className="btn btn-primary btn-sm"
                  >
                    ➕ Onboard New Officer
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[var(--color-bg-sidebar)] text-[var(--color-text-secondary)] uppercase text-xs">
                    <tr>
                      <th className="p-4 rounded-tl-lg">Officer UID</th>
                      <th className="p-4">Name</th>
                      <th className="p-4">Role</th>
                      <th className="p-4">Jurisdiction</th>
                      <th className="p-4 rounded-tr-lg text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-border-light)]">
                    {officers
                      .filter(o => jurisdictionFilter === 'ALL' || o.jurisdiction_name === jurisdictionFilter)
                      .filter(o => roleFilter === 'ALL' || o.role_code === roleFilter)
                      .map((officer) => (
                      <tr key={officer.id} className="hover:bg-[var(--color-bg-sidebar)]/50">
                        <td className="p-4 font-mono font-bold text-[var(--color-primary)]">{officer.officer_uid}</td>
                        <td className="p-4">{officer.full_name}</td>
                        <td className="p-4"><span className="badge badge-gray">{officer.role_code}</span></td>
                        <td className="p-4">{officer.jurisdiction_name || 'N/A'}</td>
                        <td className="p-4 text-right flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setSelectedOfficer(officer);
                              setFormData({ ...formData, new_role: officer.role_code, new_jurisdiction: officer.jurisdiction_id });
                              setIsTransferModalOpen(true);
                            }}
                            className="btn btn-outline btn-sm"
                          >
                            Transfer
                          </button>
                          <button 
                            onClick={() => {
                              setSelectedOfficer(officer);
                              setIsResetModalOpen(true);
                            }}
                            className="btn btn-outline btn-sm btn-amber"
                          >
                            Reset Temp Password
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'land' && (
            <div className="animate-fade-in">
              <h2 className="text-xl font-bold mb-4">Read-Only Land Registry Viewer</h2>
              <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
                <button 
                  onClick={() => { setBreadcrumbs([]); fetchLand([]); }}
                  className="px-3 py-1 bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] rounded hover:border-[var(--color-primary)]"
                >
                  All Districts
                </button>
                {breadcrumbs.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[var(--color-text-muted)]">/</span>
                    <button 
                      onClick={() => {
                        const newBc = breadcrumbs.slice(0, i + 1);
                        setBreadcrumbs(newBc);
                        fetchLand(newBc);
                      }}
                      className="px-3 py-1 bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] rounded hover:border-[var(--color-primary)]"
                    >
                      {b.name}
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {landType !== 'parcels' && landData.map((item, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      const newBc = [...breadcrumbs, { type: landType === 'districts' ? 'district' : landType === 'circles' ? 'circle' : 'village', name: item }];
                      setBreadcrumbs(newBc);
                      fetchLand(newBc);
                    }}
                    className="p-4 bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-bg-sidebar)]/80 transition-all flex items-center justify-between group"
                  >
                    <span className="font-semibold">{item}</span>
                    <span className="text-[var(--color-text-muted)] group-hover:text-[var(--color-primary)]">➡️</span>
                  </div>
                ))}
              </div>

              {landType === 'parcels' && (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[var(--color-bg-sidebar)] text-[var(--color-text-secondary)] uppercase text-xs">
                      <tr>
                        <th className="p-4 rounded-tl-lg">Parcel UID</th>
                        <th className="p-4">Owner Name</th>
                        <th className="p-4">Dag / Patta</th>
                        <th className="p-4 rounded-tr-lg">Land Type</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-light)]">
                      {landData.map((p, idx) => (
                        <tr key={idx} className="hover:bg-[var(--color-bg-sidebar)]/50">
                          <td className="p-4 font-mono font-bold text-[var(--color-primary)]">{p.parcel_uid}</td>
                          <td className="p-4">{p.owner_name}</td>
                          <td className="p-4">Dag: {p.dag_number || p.survey_number} <br/><span className="text-[var(--color-text-muted)]">Patta: {p.patta_number || '-'}</span></td>
                          <td className="p-4"><span className="badge badge-gray">{p.land_type}</span></td>
                        </tr>
                      ))}
                      {landData.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-[var(--color-text-muted)]">No parcels found in this village.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="animate-fade-in flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Revenue Analytics</h2>
                  <p className="text-sm text-[var(--color-text-secondary)]">Division-wide tax collection metrics</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold bg-amber-500/10 text-amber-500 py-1.5 px-3 rounded-full border border-amber-500/20">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Live Sync
                </div>
              </div>

              {stats.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-[var(--color-bg-sidebar)] to-[var(--color-bg)] border border-[var(--color-border-light)] rounded-2xl p-6 shadow-sm">
                      <div className="text-sm font-medium text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Total Liability</div>
                      <div className="text-3xl font-black tracking-tight mb-1">
                        ₹{stats.reduce((acc, s) => acc + s.total_liability, 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-[var(--color-text-secondary)]">Across {stats.length} districts</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-green-500/20 rounded-2xl p-6 shadow-sm">
                      <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-2 uppercase tracking-wider">Revenue Collected</div>
                      <div className="text-3xl font-black text-green-700 dark:text-green-400 tracking-tight mb-1">
                        ₹{stats.reduce((acc, s) => acc + s.collected, 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-green-600/70 dark:text-green-400/70">
                        {Math.round((stats.reduce((acc, s) => acc + s.collected, 0) / stats.reduce((acc, s) => acc + s.total_outstanding + s.collected, 0)) * 100) || 0}% completion rate
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-red-500/10 to-rose-500/5 border border-red-500/20 rounded-2xl p-6 shadow-sm">
                      <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-2 uppercase tracking-wider">Outstanding Arrears</div>
                      <div className="text-3xl font-black text-red-700 dark:text-red-400 tracking-tight mb-1">
                        ₹{stats.reduce((acc, s) => acc + s.total_outstanding, 0).toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs text-red-600/70 dark:text-red-400/70">Pending clearance</div>
                    </div>
                  </div>

                  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-2xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-6">Collection by District</h3>
                    <div className="w-full h-[300px] flex items-end gap-6 pb-6 relative">
                      {/* Grid Lines */}
                      <div className="absolute inset-0 flex flex-col justify-between border-b border-[var(--color-border-light)] pointer-events-none pb-6">
                        <div className="border-t border-[var(--color-border-light)]/30 w-full h-0"></div>
                        <div className="border-t border-[var(--color-border-light)]/30 w-full h-0"></div>
                        <div className="border-t border-[var(--color-border-light)]/30 w-full h-0"></div>
                        <div className="border-t border-[var(--color-border-light)]/30 w-full h-0"></div>
                      </div>

                      {/* Bars */}
                      {stats.map((s, idx) => {
                        const maxVal = Math.max(...stats.map(st => Math.max(st.collected, st.total_outstanding)));
                        const collectedHeight = maxVal > 0 ? (s.collected / maxVal) * 100 : 0;
                        const outstandingHeight = maxVal > 0 ? (s.total_outstanding / maxVal) * 100 : 0;
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full z-10 group relative">
                            {/* Tooltip */}
                            <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-[var(--color-bg-sidebar)] border border-[var(--color-border-light)] text-xs p-2 rounded shadow-lg pointer-events-none z-20 whitespace-nowrap">
                              <div className="font-bold mb-1">{s.district}</div>
                              <div className="text-green-500">Collected: ₹{s.collected.toLocaleString('en-IN')}</div>
                              <div className="text-red-500">Outstanding: ₹{s.total_outstanding.toLocaleString('en-IN')}</div>
                            </div>

                            <div className="flex items-end gap-1 w-full max-w-[40px] justify-center h-full">
                              <div 
                                className="w-full bg-emerald-500 rounded-t transition-all duration-1000 ease-out"
                                style={{ height: `${collectedHeight}%` }}
                              ></div>
                              <div 
                                className="w-full bg-red-500 rounded-t transition-all duration-1000 ease-out"
                                style={{ height: `${outstandingHeight}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] font-medium text-[var(--color-text-secondary)] mt-3 truncate w-full text-center">{s.district}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-center gap-6 mt-4 pt-4 border-t border-[var(--color-border-light)] text-xs text-[var(--color-text-secondary)]">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-emerald-500"></span>
                        Revenue Collected
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm bg-red-500"></span>
                        Outstanding Arrears
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.map((s, idx) => {
                      const percentage = Math.round((s.collected / (s.collected + s.total_outstanding)) * 100) || 0;
                      return (
                        <div key={idx} className="bg-[var(--color-bg-sidebar)]/50 border border-[var(--color-border-light)] rounded-xl p-5 hover:border-[var(--color-primary)] transition-all">
                          <h3 className="font-bold text-lg mb-4 flex items-center justify-between">
                            {s.district}
                            <span className={`text-xs px-2 py-1 rounded-full ${percentage >= 50 ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                              {percentage}% Done
                            </span>
                          </h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-[var(--color-text-muted)]">Collected</span>
                              <span className="font-bold text-green-500">₹{s.collected.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-[var(--color-text-muted)]">Outstanding</span>
                              <span className="font-bold text-red-500">₹{s.total_outstanding.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="w-full bg-[var(--color-border)] rounded-full h-1.5 mt-2 overflow-hidden">
                              <div className="bg-green-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-2xl">
                  No revenue data available for this division.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isResetModalOpen && selectedOfficer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Reset Password</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-6">
              Are you sure you want to reset the password for <strong>{selectedOfficer.full_name}</strong> to the temporary password <code className="bg-[var(--color-bg-sidebar)] px-1 py-0.5 rounded">Demo@12345</code>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setIsResetModalOpen(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={resetPassword} className="btn btn-primary btn-amber">Confirm Reset</button>
            </div>
          </div>
        </div>
      )}

      {isOnboardModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Onboard New Officer</h3>
            <form onSubmit={onboardOfficer} className="space-y-4">
              <div>
                <label className="label">Full Name</label>
                <input required type="text" className="input" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Email</label>
                  <input required type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="label">Phone / Mobile</label>
                  <input required type="text" className="input" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Role</label>
                  <select required className="input" value={formData.new_role} onChange={e => setFormData({...formData, new_role: e.target.value})}>
                    <option value="DIST_COLL">District Collector</option>
                    <option value="SDO">SDO</option>
                    <option value="TEHSILDAR">Tehsildar</option>
                    <option value="CIRCLE_OFF">Circle Officer</option>
                    <option value="VILLAGE_OFF">Village Officer</option>
                  </select>
                </div>
                <div>
                  <label className="label">Jurisdiction ID</label>
                  <input required type="text" className="input" value={formData.new_jurisdiction} onChange={e => setFormData({...formData, new_jurisdiction: e.target.value})} placeholder="e.g. jur-as090501" />
                </div>
              </div>
              <div>
                <label className="label">Auto-Generated Officer UID</label>
                <input readOnly type="text" className="input bg-[var(--color-bg-sidebar)] cursor-not-allowed text-[var(--color-text-muted)] font-mono" value={formData.officer_uid} />
              </div>
              <div>
                <label className="label">Temporary Password</label>
                <input readOnly type="text" className="input bg-[var(--color-bg-sidebar)] cursor-not-allowed text-[var(--color-text-muted)] font-mono" value={formData.password} />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setIsOnboardModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Officer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTransferModalOpen && selectedOfficer && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">Transfer Officer</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Transfer <strong>{selectedOfficer.full_name}</strong> to a new role and/or jurisdiction.
            </p>
            <form onSubmit={transferOfficer} className="space-y-4">
              <div>
                <label className="label">New Role</label>
                <select required className="input" value={formData.new_role} onChange={e => setFormData({...formData, new_role: e.target.value})}>
                  <option value="DIST_COLL">District Collector</option>
                  <option value="SDO">SDO</option>
                  <option value="TEHSILDAR">Tehsildar</option>
                  <option value="CIRCLE_OFF">Circle Officer</option>
                  <option value="VILLAGE_OFF">Village Officer</option>
                </select>
              </div>
              <div>
                <label className="label">New Jurisdiction ID</label>
                <input required type="text" className="input" value={formData.new_jurisdiction} onChange={e => setFormData({...formData, new_jurisdiction: e.target.value})} placeholder="e.g. jur-as090501" />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setIsTransferModalOpen(false)} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary">Process Transfer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
