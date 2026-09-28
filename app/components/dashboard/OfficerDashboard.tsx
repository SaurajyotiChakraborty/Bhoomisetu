'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDashboardStore } from '@/lib/store/dashboard-store';

interface UserProfile {
  officer_uid: string;
  full_name: string;
  role_code: string;
  jurisdiction_name: string;
  jurisdiction_type: string;
  activeCases: number;
  permissions: string[];
}

interface Transfer {
  id: string;
  application_uid: string;
  transfer_type: string;
  consideration_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  parcel_uid: string;
  village: string;
  survey_number: string;
  land_type: string;
  area_declared_sqm: number;
  seller_name: string;
  buyer_name: string;
  zone_name?: string;
}

const ROLE_NAMES: Record<string, string> = {
  DIV_COMM: 'Division Commissioner',
  DIST_COLL: 'District Collector',
  SDO: 'Sub-Collector / SDO',
  TEHSILDAR: 'Tehsildar',
  CIRCLE_OFF: 'Circle Officer',
  VILLAGE_OFF: 'Village Officer',
};

const ROLE_ICONS: Record<string, string> = {
  DIV_COMM: '🏛️',
  DIST_COLL: '⚖️',
  SDO: '📋',
  TEHSILDAR: '📝',
  CIRCLE_OFF: '🔍',
  VILLAGE_OFF: '🏘️',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; actionLabel?: string }> = {
  MUTUAL_TOC_SIGNED: { label: 'TOC Queue', color: 'badge-amber', actionLabel: 'Verify Mutual TOC' },
  PENDING_DOCUMENT_UPLOAD: { label: 'Pending Uploads', color: 'badge-amber' },
  AT_CIRCLE_OFFICER_VERIFICATION: { label: 'Basic Verification', color: 'badge-blue', actionLabel: 'Review Uploads' },
  FORWARDED_TO_TEHSILDAR: { label: 'Forwarded', color: 'badge-blue' },
  AT_TEHSILDAR_VERIFICATION: { label: 'Detailed Review', color: 'badge-blue', actionLabel: 'Verify Documents' },
  TOC_VERIFICATION_BY_TEHSILDAR: { label: 'TOC Upload Review', color: 'badge-amber', actionLabel: 'Verify TOC Uploads' },
  FORWARDED_TO_SDO: { label: 'Forwarded to SDO', color: 'badge-blue' },
  AT_SDO_REVIEW: { label: 'SDO Review', color: 'badge-blue', actionLabel: 'Review & Approve' },
  APPROVED_PENDING_DECLARATION: { label: 'Approved', color: 'badge-green' },
  ON_HOLD: { label: 'On Hold', color: 'badge-amber' },
  RETURNED_FOR_CORRECTION: { label: 'Returned', color: 'badge-amber' },
  REJECTED: { label: 'Rejected', color: 'badge-red' },
  TRANSFER_COMPLETED: { label: 'Completed', color: 'badge-green' },
};

export default function OfficerDashboard({ roleFilter }: { roleFilter?: string }) {
  const router = useRouter();
  
  const { user, transfers, disputes, khajanaZones, loading, fetchOfficerData } = useDashboardStore();
  
  const [queueTimeline, setQueueTimeline] = useState<'PENDING' | 'SUCCESS' | 'FAILED'>('PENDING');
  const [activeTab, setActiveTab] = useState<'transfers' | 'disputes' | 'khajana'>('transfers');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [tocSignatures, setTocSignatures] = useState<any[]>([]);

  // Khajana Specific States
  const [khajanaFilterStanding, setKhajanaFilterStanding] = useState('ALL');
  const [khajanaSearchQuery, setKhajanaSearchQuery] = useState('');
  const [khajanaSelectedZone, setKhajanaSelectedZone] = useState('');
  const [isTaxDrawerOpen, setIsTaxDrawerOpen] = useState(false);
  const [khajanaParcels, setKhajanaParcels] = useState<any[]>([]);
  const [isKhajanaLoading, setIsKhajanaLoading] = useState(false);
  const [selectedLedgerParcel, setSelectedLedgerParcel] = useState<any>(null);

  useEffect(() => {
    fetchOfficerData().catch(() => router.push('/login'));
  }, [fetchOfficerData, router]);

  // Set initial khajana zone if zones exist
  useEffect(() => {
    if (khajanaZones.length > 0 && !khajanaSelectedZone) {
      setKhajanaSelectedZone(khajanaZones[0].id);
      fetchKhajanaForZone(khajanaZones[0].id);
    }
  }, [khajanaZones, khajanaSelectedZone]);

  useEffect(() => {
    if (selectedTransfer && selectedTransfer.status === 'TOC_VERIFICATION_BY_TEHSILDAR') {
      fetch(`/api/v1/transfers/${selectedTransfer.id}/toc`)
        .then(res => res.json())
        .then(data => {
          if (data.signatures) setTocSignatures(data.signatures);
        })
        .catch(console.error);
    } else {
      setTocSignatures([]);
    }
  }, [selectedTransfer]);

  function fetchKhajanaForZone(zone: string) {
    setIsKhajanaLoading(true);
    fetch(`/api/v1/khajana/parcels?zone=${zone}`)
      .then(r => r.json())
      .then(d => { setKhajanaParcels(d.parcels || []); setIsKhajanaLoading(false); })
      .catch(() => setIsKhajanaLoading(false));
  }

  async function handleLogout() {
    document.cookie = 'access_token=; Max-Age=0; path=/';
    document.cookie = 'refresh_token=; Max-Age=0; path=/';
    router.push('/login');
  }

  async function executeAction(actionStr: string) {
    if (!selectedTransfer) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/v1/transfers/${selectedTransfer.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionStr, reason: actionReason })
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error?.message || 'Action failed');
        return;
      }
      setSelectedTransfer(null);
      setActionReason('');
      fetchOfficerData(); // refresh queue
    } catch (e) {
      setActionError('Network error');
    } finally {
      setActionLoading(false);
    }
  }

  async function executeDisputeAction(actionStr: string) {
    if (!selectedDispute) return;
    setActionLoading(true);
    setActionError('');
    try {
      const res = await fetch(`/api/v1/disputes/${selectedDispute.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: actionStr, resolutionNotes })
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error?.message || 'Action failed');
        return;
      }
      setSelectedDispute(null);
      setResolutionNotes('');
      fetchOfficerData(); // refresh queue
    } catch (e) {
      setActionError('Network error');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const roleName = ROLE_NAMES[user.role_code!] || user.role_code;
  const roleIcon = ROLE_ICONS[user.role_code!] || '👤';

  // Queue Classification Logic
  const getTransferTimeline = (status: string) => {
    if (['TRANSFER_COMPLETED', 'APPROVED_PENDING_DECLARATION'].includes(status)) return 'SUCCESS';
    if (['REJECTED', 'CANCELLED_BY_APPLICANT', 'COUNTERPARTY_DECLINED', 'RETURNED_FOR_CORRECTION'].includes(status)) return 'FAILED';
    return 'PENDING';
  };

  const getDisputeTimeline = (status: string) => {
    if (status === 'RESOLVED') return 'SUCCESS';
    if (status === 'DISMISSED') return 'FAILED';
    return 'PENDING';
  };

  // Enforce FIFO Sorting (Oldest first)
  const sortedTransfers = [...transfers].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const sortedDisputes = [...disputes].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const filteredTransfers = sortedTransfers.filter(t => getTransferTimeline(t.status) === queueTimeline);
  const filteredDisputes = sortedDisputes.filter(d => getDisputeTimeline(d.status) === queueTimeline);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header className="bg-[var(--color-bg-card)] border-b border-[var(--color-border-light)] sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[var(--color-bg-sidebar)] rounded-lg text-[var(--color-text)] -ml-2" title="Toggle Sidebar">
              ☰
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">भू</div>
              <span className="font-semibold hidden sm:block">Bhoomisetu</span>
            </Link>
            <span className="text-[var(--color-border)]">|</span>
            <div className="flex items-center gap-2">
              <span className="text-lg">{roleIcon}</span>
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">{roleName}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium">{user.full_name}</div>
              <div className="text-xs text-[var(--color-text-muted)]">
                {user.jurisdiction_name} ({user.jurisdiction_type})
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-ghost btn-sm">Sign Out</button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-gradient-to-r from-[#1B4332] to-[#2D6A4F] text-white">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div>
              <div className="text-3xl font-bold">{transfers.length}</div>
              <div className="text-white/60 text-sm">Total Cases</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-amber-300">
                {transfers.filter(t => !['TRANSFER_COMPLETED', 'REJECTED', 'CANCELLED_BY_APPLICANT'].includes(t.status)).length}
              </div>
              <div className="text-white/60 text-sm">Active</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-300">
                {transfers.filter(t => t.status === 'ON_HOLD').length}
              </div>
              <div className="text-white/60 text-sm">On Hold</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-300">
                {transfers.filter(t => t.status === 'TRANSFER_COMPLETED').length}
              </div>
              <div className="text-white/60 text-sm">Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 flex-1 w-full flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Navigation */}
        <div className={`md:w-64 shrink-0 bg-[var(--color-bg-sidebar)] rounded-xl p-3 flex-col gap-2 h-fit ${isSidebarOpen ? 'flex' : 'hidden'}`}>
          <div className="font-bold px-3 py-2 text-[var(--color-text-secondary)] text-xs uppercase tracking-wider">Queue</div>
          {[
            { key: 'transfers', label: '📝 Land Transfers', roles: ['ALL'] },
            { key: 'disputes', label: '⚖️ Disputes & Complaints', roles: ['ALL'] },
            { key: 'khajana', label: user.role_code === 'VILLAGE_OFF' ? '💰 Village Tax Collection' : '💰 Khajana (Revenue)', roles: ['CIRCLE_OFF', 'VILLAGE_OFF'] },
          ].filter(t => t.roles.includes('ALL') || (user.role_code && t.roles.includes(user.role_code))).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`w-full text-left py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-[var(--color-bg-card)] text-[var(--color-primary)] shadow-sm font-bold border-l-4 border-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-card)]/50 border-l-4 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {activeTab === 'transfers' && 'Transfer Applications Queue'}
              {activeTab === 'disputes' && 'Disputes & Complaints Queue'}
              {activeTab === 'khajana' && (user.role_code === 'VILLAGE_OFF' ? 'Village Tax Collection' : 'Khajana Master Management')}
            </h2>
          </div>

          {activeTab === 'transfers' && (
            <>
              {/* Timeline Filters */}
              <div className="flex flex-wrap gap-3 mb-6">
                {(['PENDING', 'SUCCESS', 'FAILED'] as const).map(timeline => {
                  const count = sortedTransfers.filter(t => getTransferTimeline(t.status) === timeline).length;
                  return (
                    <button
                      key={timeline}
                      onClick={() => setQueueTimeline(timeline)}
                      className={`btn btn-sm ${queueTimeline === timeline ? 'btn-primary' : 'btn-ghost border border-[var(--color-border)]'}`}
                    >
                      {timeline} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Case List */}
              <div className="space-y-6">
                {(Object.entries(
                  filteredTransfers.reduce((acc, t) => {
                    const zone = t.zone_name || t.village || 'Unknown Zone';
                    if (!acc[zone]) acc[zone] = [];
                    acc[zone].push(t);
                    return acc;
                  }, {} as Record<string, Transfer[]>)
                ) as [string, Transfer[]][]).map(([zone, zoneTransfers]) => (
                  <div key={zone} className="bg-[var(--color-bg-sidebar)]/30 rounded-xl p-4 border border-[var(--color-border-light)]">
                    <h3 className="text-lg font-bold text-[var(--color-primary)] mb-4 flex items-center gap-2 border-b border-[var(--color-border)] pb-2">
                      📍 Zone: {zone} <span className="badge badge-gray text-xs">{zoneTransfers.length} cases</span>
                    </h3>
                    <div className="space-y-3">
                      {zoneTransfers.map((transfer) => {
                        const config = STATUS_CONFIG[transfer.status] || { label: transfer.status, color: 'badge-gray' };
                        return (
                          <div key={transfer.id} className="card bg-[var(--color-bg-card)] hover:border-[var(--color-primary)]/20 animate-fade-in">
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-sm font-semibold">{transfer.application_uid}</span>
                                  <span className={`badge ${config.color}`}>{config.label}</span>
                                </div>
                                <div className="text-sm text-[var(--color-text-secondary)]">
                                  {transfer.parcel_uid} • {transfer.village} • Survey #{transfer.survey_number}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-xs text-[var(--color-text-muted)]">{transfer.transfer_type}</div>
                                {transfer.consideration_amount > 0 && (
                                  <div className="font-semibold text-sm">₹{transfer.consideration_amount.toLocaleString('en-IN')}</div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                                <span>📤 {transfer.seller_name}</span>
                                <span className="text-[var(--color-text-muted)]">→</span>
                                <span>📥 {transfer.buyer_name}</span>
                              </div>
                              {config.actionLabel && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTransfer(transfer);
                                  }}
                                  className="btn btn-primary btn-sm"
                                >
                                  {config.actionLabel}
                                </button>
                              )}
                            </div>

                            <div className="mt-2 text-xs text-[var(--color-text-muted)]">
                              Updated: {new Date(transfer.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {filteredTransfers.length === 0 && (
                  <div className="text-center py-16 text-[var(--color-text-muted)] bg-[var(--color-bg-sidebar)] rounded-xl border border-dashed border-[var(--color-border)]">
                    <div className="text-4xl mb-4">📭</div>
                    <p>No transfer cases in your queue</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'disputes' && (
            <div className="space-y-6 animate-fade-in">
              {/* Timeline Filters */}
              <div className="flex flex-wrap gap-3 mb-2">
                {(['PENDING', 'SUCCESS', 'FAILED'] as const).map(timeline => {
                  const count = sortedDisputes.filter(d => getDisputeTimeline(d.status) === timeline).length;
                  return (
                    <button
                      key={timeline}
                      onClick={() => setQueueTimeline(timeline)}
                      className={`btn btn-sm ${queueTimeline === timeline ? 'btn-primary' : 'btn-ghost border border-[var(--color-border)]'}`}
                    >
                      {timeline} ({count})
                    </button>
                  );
                })}
              </div>

              <div className="space-y-3">
                {filteredDisputes.map((dispute) => (
                  <div key={dispute.id} className="card hover:border-[var(--color-primary)]/20">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold">{dispute.dispute_uid}</span>
                        <span className={`badge badge-${dispute.status === 'RESOLVED' ? 'green' : dispute.status === 'OPEN' ? 'blue' : dispute.status === 'DISMISSED' ? 'red' : 'amber'}`}>
                          {dispute.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--color-text-secondary)]">
                        Parcel: {dispute.parcel_uid} • {dispute.village} • {dispute.category}
                      </div>
                    </div>
                    <button 
                      onClick={() => setSelectedDispute(dispute)}
                      className="btn btn-primary btn-sm"
                    >
                      Review Dispute
                    </button>
                  </div>
                  <div className="text-sm">
                    <strong>Complainant:</strong> {dispute.complainant_name}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-2">
                    Filed on: {new Date(dispute.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {filteredDisputes.length === 0 && (
                <div className="text-center py-16 text-[var(--color-text-muted)] bg-[var(--color-bg-sidebar)] rounded-xl border border-dashed border-[var(--color-border)]">
                  <div className="text-4xl mb-4">⚖️</div>
                  <p>No {queueTimeline.toLowerCase()} disputes or complaints in your queue.</p>
                </div>
              )}
            </div>
            </div>
          )}

          {activeTab === 'khajana' && (
            <div className="animate-fade-in flex flex-col h-full">
              {/* Khajana Global Filter Panel */}
              <div className="bg-[var(--color-bg-card)] p-4 rounded-xl shadow-sm border border-[var(--color-border-light)] mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div className="font-mono text-sm text-[var(--color-text-secondary)]">
                    🏛️ Circle: {user.jurisdiction_name} ({user.jurisdiction_type})
                  </div>
                  <div className="flex gap-4 items-center">
                    <div className="text-xs bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] px-3 py-1 rounded">
                      💵 Cash Held: <strong className="text-amber-500">
                        ₹{khajanaParcels.filter(p => p.standing_status === 'PAID' && p.payment_mode === 'CASH').reduce((sum, p) => sum + (p.tax_ledger?.total_outstanding || p.base_liability || 0), 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    <div className="text-xs bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] px-3 py-1 rounded">
                      🌐 Online: <strong className="text-green-500">
                        ₹{khajanaParcels.filter(p => p.standing_status === 'PAID' && p.payment_mode === 'ONLINE').reduce((sum, p) => sum + (p.tax_ledger?.total_outstanding || p.base_liability || 0), 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                    {user.role_code === 'CIRCLE_OFF' && (
                      <button onClick={() => setIsTaxDrawerOpen(true)} className="btn btn-outline btn-sm border-[var(--color-primary)] text-[var(--color-primary)] ml-2">
                        ⚙️ Tax Rates
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="md:col-span-1">
                    <select 
                      className="input bg-[var(--color-bg-sidebar)] w-full border-[var(--color-border)]"
                      value={khajanaSelectedZone}
                      onChange={(e) => {
                        setKhajanaSelectedZone(e.target.value);
                        if (e.target.value) {
                          fetchKhajanaForZone(e.target.value);
                        }
                      }}
                    >
                      <option value="" disabled>Select Zone/Village...</option>
                      {khajanaZones.map((z: any) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="md:col-span-3 flex gap-2">
                    <input 
                      type="text" 
                      placeholder="🔍 Search UID, Dag, Patta..." 
                      className="input flex-1 bg-[var(--color-bg-sidebar)] border-[var(--color-border)] w-full"
                      value={khajanaSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setKhajanaSearchQuery(val);
                        // If they clear the search, reload the active zone immediately
                        if (val.trim() === '' && khajanaSelectedZone) {
                          fetchKhajanaForZone(khajanaSelectedZone);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && khajanaSearchQuery.trim()) {
                          setIsKhajanaLoading(true);
                          const url = khajanaSelectedZone 
                            ? `/api/v1/khajana/parcels?zone=${khajanaSelectedZone}&search=${encodeURIComponent(khajanaSearchQuery.trim())}`
                            : `/api/v1/khajana/parcels?search=${encodeURIComponent(khajanaSearchQuery.trim())}`;
                          fetch(url)
                            .then(r => r.json())
                            .then(d => { setKhajanaParcels(d.parcels || []); setIsKhajanaLoading(false); })
                            .catch(() => setIsKhajanaLoading(false));
                        }
                      }}
                    />
                    <button 
                      className="btn btn-primary px-6"
                      onClick={() => {
                        if (khajanaSearchQuery.trim()) {
                          setIsKhajanaLoading(true);
                          const url = khajanaSelectedZone 
                            ? `/api/v1/khajana/parcels?zone=${khajanaSelectedZone}&search=${encodeURIComponent(khajanaSearchQuery.trim())}`
                            : `/api/v1/khajana/parcels?search=${encodeURIComponent(khajanaSearchQuery.trim())}`;
                          fetch(url)
                            .then(r => r.json())
                            .then(d => { setKhajanaParcels(d.parcels || []); setIsKhajanaLoading(false); })
                            .catch(() => setIsKhajanaLoading(false));
                        }
                      }}
                    >
                      Find
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  {['ALL', 'DEFAULTERS', 'PAID', 'DISPUTED'].map(standing => (
                    <button 
                      key={standing}
                      onClick={() => setKhajanaFilterStanding(standing)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        khajanaFilterStanding === standing 
                          ? 'bg-[var(--color-primary)] text-white' 
                          : 'bg-[var(--color-bg-sidebar)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-light)]'
                      }`}
                    >
                      {standing.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Khajana Tax Registry Grid */}
              <div className="bg-[var(--color-bg-card)] rounded-xl shadow-sm border border-[var(--color-border-light)] flex-1 min-h-[400px] overflow-hidden flex flex-col">
                {!khajanaSelectedZone && !khajanaSearchQuery && khajanaParcels.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] py-16 m-auto">
                    <p className="font-semibold text-lg mb-2">No Zone Selected</p>
                    <p>Please select a Zone or Village from the dropdown</p>
                    <p className="text-sm">to view the tax registry and land parameters.</p>
                  </div>
                ) : isKhajanaLoading ? (
                  <div className="flex items-center justify-center h-full py-16 m-auto">
                    <div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[var(--color-bg-sidebar)] text-[var(--color-text-muted)] border-b border-[var(--color-border-light)]">
                        <tr>
                          <th className="p-4 font-semibold">Tracking Code</th>
                          <th className="p-4 font-semibold">Asset Identity</th>
                          <th className="p-4 font-semibold">Primary Titleholder</th>
                          <th className="p-4 font-semibold">Land Parameters</th>
                          <th className="p-4 font-semibold">Financial Standing</th>
                          <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-border-light)]">
                        {khajanaParcels
                          .filter(p => {
                            if (khajanaFilterStanding === 'DEFAULTERS') return p.tax_ledger?.total_outstanding > 0;
                            if (khajanaFilterStanding === 'PAID') return p.tax_ledger?.total_outstanding === 0;
                            if (khajanaFilterStanding === 'DISPUTED') return p.standing_status === 'DISPUTED';
                            return true;
                          })
                          .map((p, idx) => (
                            <tr key={p.parcel_uid || idx}>
                              <td className="p-4">
                              <button
                                type="button"
                                onClick={() => setSelectedLedgerParcel(p)}
                                className="font-mono text-[var(--color-primary)] hover:underline text-left font-semibold flex items-center gap-1.5"
                                title="Click to view full Parcel Ledger & Status"
                              >
                                <span>{p.parcel_uid}</span>
                                <span className="material-symbols-outlined text-xs opacity-70">open_in_new</span>
                              </button>
                            </td>
                            <td className="p-4">Dag: {p.dag_number || p.survey_number}<br/><span className="text-[var(--color-text-muted)]">Patta: {p.patta_number || '-'}</span></td>
                            <td className="p-4">{p.owner_name}<br/><span className="font-mono text-xs text-[var(--color-text-muted)]">{p.owner_uid_masked || p.owner_uid}</span></td>
                            <td className="p-4">{p.area_sqm || p.area_declared_sqm} sqm<br/><span className="badge badge-gray !text-xs mt-1">{p.land_type}</span></td>
                            <td className="p-4">
                              {p.tax_ledger?.total_outstanding > 0 ? (
                                <span className="badge badge-red flex flex-col items-start gap-1 p-2 w-fit">
                                  <span className="font-bold">PENDING: ₹{p.tax_ledger.total_outstanding.toLocaleString('en-IN')}</span>
                                  {p.tax_ledger.late_surcharges > 0 && <span className="text-[10px] text-red-700/80">Inc. ₹{p.tax_ledger.late_surcharges} Surcharge</span>}
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="badge badge-green p-2 font-bold w-fit">PAID</span>
                                  {p.payment_mode && (
                                    <span className="text-xs text-[var(--color-text-muted)] font-mono bg-[var(--color-bg-sidebar)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                                      {p.payment_mode}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              {p.standing_status === 'PENDING' && user.role_code === 'VILLAGE_OFF' && (
                                <button 
                                  onClick={async () => {
                                    if (confirm(`Confirm cash collection of ₹${p.tax_ledger.total_outstanding.toLocaleString('en-IN')}?`)) {
                                      try {
                                        const res = await fetch('/api/v1/khajana/pay', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ taxId: p.tax_id, paymentMode: 'CASH' })
                                        });
                                        if (res.ok) fetchKhajanaForZone(khajanaSelectedZone);
                                        else alert('Failed to process cash payment.');
                                      } catch (err) {
                                        alert('Network error.');
                                      }
                                    }
                                  }}
                                  className="btn btn-outline btn-sm btn-green mt-2 w-full text-[10px]"
                                >
                                  Mark Paid (Cash)
                                </button>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              <button 
                                onClick={() => setSelectedLedgerParcel(p)}
                                className="btn btn-ghost btn-sm"
                              >
                                View Ledger
                              </button>
                            </td>
                          </tr>
                        ))}
                        {khajanaParcels.length === 0 && !isKhajanaLoading && (
                          <tr>
                            <td colSpan={6} className="text-center py-8 text-[var(--color-text-muted)]">No parcels found matching your criteria.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Slide-out Drawer for Tax Configuration */}
              {isTaxDrawerOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
                  <div className="bg-[var(--color-bg-card)] w-full max-w-md h-full flex flex-col animate-slide-in-right shadow-2xl border-l border-[var(--color-border-light)]">
                    <div className="p-6 border-b border-[var(--color-border-light)] flex justify-between items-center">
                      <h3 className="font-bold text-lg">⚙️ Area Tax Configurations</h3>
                      <button onClick={() => setIsTaxDrawerOpen(false)} className="text-2xl hover:text-red-500">&times;</button>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto space-y-6">
                      <div>
                        <label className="label">Select Zone / Village</label>
                        <select className="input bg-[var(--color-bg-sidebar)] border-[var(--color-border)]">
                          <option>All Zones (Global Override)</option>
                          {khajanaZones.map((z: any) => (
                            <option key={z.id} value={z.id}>{z.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-semibold text-[var(--color-primary)]">Rate Classifiers (Per Sq. Meter)</h4>
                        {/* Rate Rows */}
                        {Object.entries({
                          'Category A (Comm/Ind)': '₹50.00',
                          'Category B (Residential)': '₹20.00',
                          'Category C (Dry Agri)': '₹5.00',
                          'Category D (Monsoon Agri)': '₹3.00'
                        }).map(([cat, rate]) => (
                          <div key={cat} className="flex justify-between items-center p-3 bg-[var(--color-bg-sidebar)] border border-[var(--color-border-light)] rounded-lg">
                            <span className="font-medium text-sm">{cat}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-bold text-[var(--color-text-secondary)]">{rate}</span>
                              <button 
                                onClick={() => alert('Rate configuration is currently locked for this financial year.')}
                                className="text-[var(--color-primary)] text-sm hover:underline"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="p-6 border-t border-[var(--color-border-light)] bg-[var(--color-bg-sidebar)]">
                      <button 
                        onClick={() => alert('Batch recalculation initiated. Changes will reflect across all ledgers within 24 hours.')}
                        className="btn btn-primary bg-amber-600 hover:bg-amber-700 text-white w-full border-none shadow-md"
                      >
                        ⚠️ Modify Rates & Batch Recalculate
                      </button>
                      <p className="text-xs text-center text-[var(--color-text-muted)] mt-3">
                        This will recalculate the ledger for all properties in the selected zone for the upcoming financial year.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transfer Action Modal */}
      {selectedTransfer && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--color-border-light)] flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">Case Review: {selectedTransfer.application_uid}</h3>
              <button onClick={() => { setSelectedTransfer(null); setActionReason(''); setActionError(''); }} className="text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong className="block text-[var(--color-text-muted)]">Parcel UID</strong>{selectedTransfer.parcel_uid}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Village</strong>{selectedTransfer.village}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Survey Number</strong>{selectedTransfer.survey_number}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Land Type</strong>{selectedTransfer.land_type}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Seller</strong>{selectedTransfer.seller_name}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Buyer</strong>{selectedTransfer.buyer_name}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Consideration</strong>₹{selectedTransfer.consideration_amount.toLocaleString('en-IN')}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Status</strong>{STATUS_CONFIG[selectedTransfer.status]?.label}</div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold">Action Remarks / Reason</label>
                <textarea 
                  className="w-full border border-[var(--color-border)] rounded-md p-2 text-sm bg-[var(--color-bg)]"
                  rows={3} 
                  placeholder="Enter remarks for approval or reasons for rejection/correction..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>

              {tocSignatures.length > 0 && (
                <div className="space-y-2 mt-4 p-4 border border-[var(--color-border-light)] rounded-lg bg-[var(--color-bg-sidebar)]">
                  <label className="block text-sm font-bold text-[var(--color-primary)]">TOC Signatures & Uploads</label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {tocSignatures.map((sig, i) => (
                      <div key={i} className="border border-[var(--color-border)] p-3 rounded bg-[var(--color-bg-card)]">
                        <div className="font-semibold text-sm mb-1">{sig.role}</div>
                        <div className="text-xs text-green-600 font-mono mb-2">Digital Signature: {sig.digital_signature.slice(0, 16)}...</div>
                        {sig.physical_upload_data ? (
                          <div className="mt-2 text-center">
                            <span className="text-xs block mb-1">Physical Upload:</span>
                            <img src={sig.physical_upload_data} alt={`${sig.role} TOC`} className="max-h-32 mx-auto rounded border border-dashed border-gray-400 p-1" />
                          </div>
                        ) : (
                          <div className="text-xs text-red-500">No physical upload</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {user.role_code === 'VILLAGE_OFF' && (
                <div className="space-y-2 mt-4 p-4 border border-[var(--color-border-light)] rounded-lg bg-[var(--color-bg-sidebar)]">
                  <label className="block text-sm font-semibold">Verification Mode</label>
                  <select className="input w-full bg-[var(--color-bg)] border-[var(--color-border)] text-sm">
                    <option value="PHYSICAL">Physical Ground Verification Completed</option>
                    <option value="ONLINE">Online Record Verification Only</option>
                  </select>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Select the method used to verify this property before forwarding to the Circle Office.
                  </p>
                </div>
              )}

              {actionError && (
                <div className="p-3 rounded bg-red-100 text-red-700 text-sm">{actionError}</div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--color-border-light)] flex flex-wrap gap-3 justify-end shrink-0 bg-[var(--color-bg-card)] rounded-b-xl">
              {/* Dynamic Action Buttons based on Role & Status */}
              
              {/* CIRCLE OFFICER ACTIONS */}
              {user.role_code === 'CIRCLE_OFF' && ['MUTUAL_TOC_SIGNED', 'AT_CIRCLE_OFFICER_VERIFICATION'].includes(selectedTransfer.status) && (
                <>
                  <button onClick={() => executeAction('RETURNED_FOR_CORRECTION')} disabled={actionLoading || !actionReason} className="btn btn-outline btn-amber">Request Correction</button>
                  <button onClick={() => executeAction('REJECTED')} disabled={actionLoading || !actionReason} className="btn btn-outline btn-red">Reject</button>
                  {selectedTransfer.status === 'MUTUAL_TOC_SIGNED' && (
                    <button onClick={() => executeAction('PENDING_DOCUMENT_UPLOAD')} disabled={actionLoading} className="btn btn-primary bg-gradient-to-r from-blue-500 to-indigo-600 border-none text-white shadow-lg hover:shadow-blue-500/30">PROCEED (Request Documents)</button>
                  )}
                  {selectedTransfer.status === 'AT_CIRCLE_OFFICER_VERIFICATION' && (
                    <button onClick={() => executeAction('FORWARDED_TO_TEHSILDAR')} disabled={actionLoading} className="btn btn-primary bg-gradient-to-r from-green-500 to-green-600 border-none text-white shadow-lg">Proceed to Tehsildar</button>
                  )}
                </>
              )}

              {/* TEHSILDAR ACTIONS */}
              {user.role_code === 'TEHSILDAR' && ['AT_TEHSILDAR_VERIFICATION'].includes(selectedTransfer.status) && (
                <>
                  <button onClick={() => executeAction('REJECTED')} disabled={actionLoading || !actionReason} className="btn btn-outline btn-red">Reject</button>
                  <button onClick={() => executeAction('TOC_PENDING_SIGNATURES')} disabled={actionLoading} className="btn btn-primary bg-amber-600 hover:bg-amber-700 text-white border-none">Accept & Generate TOC</button>
                </>
              )}

              {user.role_code === 'TEHSILDAR' && ['TOC_VERIFICATION_BY_TEHSILDAR'].includes(selectedTransfer.status) && (
                <>
                  <button onClick={() => executeAction('REJECTED')} disabled={actionLoading || !actionReason} className="btn btn-outline btn-red">Reject Uploads</button>
                  <button onClick={() => executeAction('FORWARDED_TO_SDO')} disabled={actionLoading} className="btn btn-primary bg-green-600 hover:bg-green-700 text-white border-none">Verify Uploads & Forward to SDO</button>
                </>
              )}

              {/* SDO ACTIONS */}
              {user.role_code === 'SDO' && ['AT_SDO_REVIEW'].includes(selectedTransfer.status) && (
                <>
                  <button onClick={() => executeAction('REJECTED')} disabled={actionLoading || !actionReason} className="btn btn-outline btn-red">Reject Transfer</button>
                  <button onClick={() => executeAction('TRANSFER_COMPLETED')} disabled={actionLoading} className="btn btn-primary bg-green-600 hover:bg-green-700 border-none text-white">Approve & Finalize Transfer</button>
                </>
              )}

              {/* VILLAGE OFFICER ACTIONS */}
              {user.role_code === 'VILLAGE_OFF' && ['MUTUAL_TOC_SIGNED'].includes(selectedTransfer.status) && (
                <>
                  <button onClick={() => executeAction('RETURNED_FOR_CORRECTION')} disabled={actionLoading || !actionReason} className="btn btn-outline btn-amber">Request Correction</button>
                  <button onClick={() => executeAction('AT_CIRCLE_OFFICER_VERIFICATION')} disabled={actionLoading} className="btn btn-primary">Forward to Circle Office</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dispute Action Modal */}
      {selectedDispute && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[var(--color-bg-card)] rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--color-border-light)] flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">Review Dispute: {selectedDispute.dispute_uid}</h3>
              <button onClick={() => { setSelectedDispute(null); setResolutionNotes(''); setActionError(''); }} className="text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm bg-[var(--color-bg-sidebar)] p-4 rounded-xl">
                <div><strong className="block text-[var(--color-text-muted)]">Parcel UID</strong>{selectedDispute.parcel_uid}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Village</strong>{selectedDispute.village}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Complainant</strong>{selectedDispute.complainant_name}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Category</strong>{selectedDispute.category}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Status</strong>{selectedDispute.status.replace('_', ' ')}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Filed on</strong>{new Date(selectedDispute.created_at).toLocaleDateString()}</div>
              </div>

              <div>
                <strong className="block text-sm font-semibold mb-2">Complaint Description</strong>
                <p className="text-sm p-4 bg-white/5 rounded-lg text-[var(--color-text)] border border-[var(--color-border-light)]">{selectedDispute.description}</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold">Resolution Notes / Official Remarks</label>
                <textarea 
                  className="w-full border border-[var(--color-border)] rounded-md p-3 text-sm bg-[var(--color-bg)]"
                  rows={4} 
                  placeholder="Enter official remarks or resolution details here..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                />
              </div>

              {actionError && (
                <div className="p-3 rounded bg-red-100 text-red-700 text-sm">{actionError}</div>
              )}
            </div>

            <div className="p-6 border-t border-[var(--color-border-light)] flex flex-wrap gap-3 justify-end shrink-0 bg-[var(--color-bg-card)] rounded-b-xl">
              <button onClick={() => executeDisputeAction('DISMISSED')} disabled={actionLoading || !resolutionNotes} className="btn btn-outline btn-red">Dismiss Complaint</button>
              <button onClick={() => executeDisputeAction('UNDER_INVESTIGATION')} disabled={actionLoading || selectedDispute.status === 'UNDER_INVESTIGATION'} className="btn btn-outline btn-amber">Mark as Under Investigation</button>
              <button onClick={() => executeDisputeAction('RESOLVED')} disabled={actionLoading || !resolutionNotes} className="btn btn-primary bg-green-600 hover:bg-green-700 border-none text-white">Mark as Resolved</button>
            </div>
          </div>
        </div>
      )}

      {/* Khajana Ledger Modal */}
      {selectedLedgerParcel && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
          <div className="bg-[var(--color-bg-card)] rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-scale-in">
            <div className="p-4 border-b border-[var(--color-border-light)] flex justify-between items-center bg-[var(--color-bg-sidebar)] rounded-t-xl">
              <h3 className="font-bold text-lg">Khajana Tax Ledger</h3>
              <button onClick={() => setSelectedLedgerParcel(null)} className="btn btn-ghost btn-sm btn-circle text-xl leading-none">&times;</button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong className="block text-[var(--color-text-muted)]">Parcel UID</strong>{selectedLedgerParcel.parcel_uid}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Primary Owner</strong>{selectedLedgerParcel.owner_name}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Area (sqm)</strong>{selectedLedgerParcel.area_sqm || selectedLedgerParcel.area_declared_sqm}</div>
                <div><strong className="block text-[var(--color-text-muted)]">Land Classification</strong>{selectedLedgerParcel.land_type}</div>
              </div>

              <div className="bg-[var(--color-bg-sidebar)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                <div className="p-3 bg-[var(--color-primary)] text-white font-bold flex justify-between">
                  <span>Total Outstanding</span>
                  <span>₹{selectedLedgerParcel.tax_ledger?.total_outstanding?.toLocaleString('en-IN') || 0}</span>
                </div>
                <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between border-b border-[var(--color-border-light)] pb-2">
                    <span className="text-[var(--color-text-muted)]">Current Year Base Liability</span>
                    <span className="font-medium">₹{selectedLedgerParcel.tax_ledger?.current_year_liability?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  <div className="flex justify-between border-b border-[var(--color-border-light)] pb-2">
                    <span className="text-[var(--color-text-muted)]">Accumulated Arrears</span>
                    <span className="font-medium text-amber-600">₹{selectedLedgerParcel.tax_ledger?.accumulated_arrears?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-[var(--color-text-muted)]">Late Surcharges / Penalties</span>
                    <span className="font-medium text-red-600">₹{selectedLedgerParcel.tax_ledger?.late_surcharges?.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>
              </div>
              
              {selectedLedgerParcel.tax_ledger?.total_outstanding > 0 ? (
                <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm border border-red-200">
                  <strong>Notice:</strong> This property is currently in default. Further property transactions may be restricted until arrears are cleared.
                </div>
              ) : (
                <div className="p-3 bg-green-100 text-green-800 rounded-lg text-sm border border-green-200">
                  <strong>Clearance:</strong> Khajana dues for this property are fully paid up to date.
                </div>
              )}

            </div>
            <div className="p-4 border-t border-[var(--color-border-light)] flex justify-end bg-[var(--color-bg-sidebar)] rounded-b-xl gap-2">
              <button onClick={() => setSelectedLedgerParcel(null)} className="btn btn-outline">Close</button>
              {selectedLedgerParcel.tax_ledger?.total_outstanding > 0 && (
                 <button className="btn btn-primary" onClick={() => alert('Payment reminder sent to citizen via SMS.')}>Send Reminder</button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
