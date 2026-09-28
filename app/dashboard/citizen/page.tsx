'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDashboardStore } from '@/lib/store/dashboard-store';

// Dynamically import map component (no SSR for Leaflet)
const ParcelMap = dynamic(() => import('@/app/components/map/ParcelMap'), { ssr: false });

interface UserProfile {
  citizen_uid: string;
  full_name: string;
  email: string;
  parcelsOwned: number;
  totalAreaSqm: number;
  role: string;
  permissions: string[];
}

interface Parcel {
  id: string;
  parcel_uid: string;
  village: string;
  survey_number: string;
  patta_number: string;
  khatian_number: string;
  land_type: string;
  area_declared_sqm: number;
  area_computed_sqm: number;
  geometry: string;
  boundary_north: string;
  boundary_south: string;
  boundary_east: string;
  boundary_west: string;
  ownership_type: string;
  encumbrance_status: string;
  owner_name: string;
}

interface Transfer {
  id: string;
  application_uid: string;
  transfer_type: string;
  consideration_amount: number;
  status: string;
  created_at: string;
  parcel_uid: string;
  village: string;
  seller_name: string;
  buyer_name: string;
  seller_uid: string;
  buyer_uid: string;
}

const LAND_TYPE_COLORS: Record<string, string> = {
  AGRICULTURAL: '#10B981',
  RESIDENTIAL: '#3B82F6',
  COMMERCIAL: '#F59E0B',
  INDUSTRIAL: '#8B5CF6',
  GOVT: '#64748B',
  FOREST: '#059669',
  WATER_BODY: '#06B6D4',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BUYER_REQUEST_PENDING: { label: 'New Request', color: 'badge-amber' },
  MUTUAL_TOC_PENDING_SIGNATURES: { label: 'Contract Signing', color: 'badge-amber' },
  MUTUAL_TOC_SIGNED: { label: 'Contract Complete', color: 'badge-green' },
  PENDING_DOCUMENT_UPLOAD: { label: 'Upload Required', color: 'badge-blue' },
  AT_CIRCLE_OFFICER_VERIFICATION: { label: 'Circle Verification', color: 'badge-blue' },
  FORWARDED_TO_TEHSILDAR: { label: 'At Tehsildar', color: 'badge-blue' },
  AT_TEHSILDAR_VERIFICATION: { label: 'Tehsildar Review', color: 'badge-blue' },
  TOC_PENDING_SIGNATURES: { label: 'TOC Signing', color: 'badge-amber' },
  TOC_VERIFICATION_BY_TEHSILDAR: { label: 'TOC Upload Review', color: 'badge-blue' },
  FORWARDED_TO_SDO: { label: 'At SDO', color: 'badge-blue' },
  AT_SDO_REVIEW: { label: 'SDO Review', color: 'badge-blue' },
  APPROVED_PENDING_DECLARATION: { label: 'Approved', color: 'badge-green' },
  PENDING_DIGITAL_SIGNATURES: { label: 'Signing', color: 'badge-amber' },
  SIGNATURES_COMPLETE: { label: 'Signed', color: 'badge-green' },
  TRANSFER_COMPLETED: { label: 'Completed', color: 'badge-green' },
  ON_HOLD: { label: 'On Hold', color: 'badge-amber' },
  RETURNED_FOR_CORRECTION: { label: 'Returned', color: 'badge-amber' },
  REJECTED: { label: 'Rejected', color: 'badge-red' },
  CANCELLED_BY_APPLICANT: { label: 'Cancelled', color: 'badge-red' },
};

// Area conversion units
const UNITS = [
  { name: 'sq m', factor: 1 },
  { name: 'sq ft', factor: 10.7639 },
  { name: 'Bigha', factor: 1 / 1337.80 },
  { name: 'Katha', factor: 1 / 267.56 },
  { name: 'Lessa', factor: 1 / 13.378 },
  { name: 'Hectare', factor: 1 / 10000 },
  { name: 'Acre', factor: 1 / 4046.86 },
];

const TRANSFER_STAGES = [
  { id: 'SUBMITTED', label: 'Submitted' },
  { id: 'CIRCLE_OFFICER', label: 'Circle Officer' },
  { id: 'TEHSILDAR', label: 'Tehsildar' },
  { id: 'SDO', label: 'SDO Approval' },
  { id: 'COMPLETED', label: 'Completed' }
];

function getProgressInfo(status: string) {
  if (['REJECTED', 'CANCELLED_BY_APPLICANT'].includes(status)) {
    return { currentStageId: '', isRejected: true };
  }
  if (['BUYER_REQUEST_PENDING', 'MUTUAL_TOC_PENDING_SIGNATURES', 'MUTUAL_TOC_SIGNED'].includes(status)) {
    return { currentStageId: 'SUBMITTED', isRejected: false };
  }
  if (['PENDING_DOCUMENT_UPLOAD', 'AT_CIRCLE_OFFICER_VERIFICATION', 'FORWARDED_TO_TEHSILDAR'].includes(status)) {
    return { currentStageId: 'CIRCLE_OFFICER', isRejected: false };
  }
  if (['AT_TEHSILDAR_VERIFICATION', 'TOC_PENDING_SIGNATURES', 'TOC_VERIFICATION_BY_TEHSILDAR', 'FORWARDED_TO_SDO'].includes(status)) {
    return { currentStageId: 'TEHSILDAR', isRejected: false };
  }
  if (['AT_SDO_REVIEW', 'APPROVED_PENDING_DECLARATION', 'PENDING_DIGITAL_SIGNATURES', 'SIGNATURES_COMPLETE'].includes(status)) {
    return { currentStageId: 'SDO', isRejected: false };
  }
  if (status === 'TRANSFER_COMPLETED') {
    return { currentStageId: 'COMPLETED', isRejected: false };
  }
  return { currentStageId: '', isRejected: false };
}

export default function CitizenDashboard() {
  const router = useRouter();
  const { user, parcels, transfers, taxes, disputes, loading, fetchCitizenData } = useDashboardStore();
  
  const [selectedParcel, setSelectedParcel] = useState<any | null>(null);
  const [areaUnit, setAreaUnit] = useState(UNITS[0]);
  const [activeTab, setActiveTab] = useState<'map' | 'list' | 'transfers' | 'taxes' | 'disputes' | 'search'>('list');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  const [disputeForm, setDisputeForm] = useState({ parcelId: '', category: 'BOUNDARY', description: '' });
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

  const [searchUid, setSearchUid] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [buyRequestLoading, setBuyRequestLoading] = useState(false);

  const [transferActionLoading, setTransferActionLoading] = useState('');
  const [nocModal, setNocModal] = useState<any>(null);
  const [nocLoading, setNocLoading] = useState(false);
  const [nocSignLoading, setNocSignLoading] = useState(false);
  
  const [tocModal, setTocModal] = useState<any>(null);
  const [tocLoading, setTocLoading] = useState(false);
  const [tocSignLoading, setTocSignLoading] = useState(false);
  const [tocUploadData, setTocUploadData] = useState<string>('');
  const [digitalConsent, setDigitalConsent] = useState<boolean>(false);

  const [documentUploadModal, setDocumentUploadModal] = useState<any>(null);
  const [docUploadLoading, setDocUploadLoading] = useState(false);

  useEffect(() => {
    fetchCitizenData().catch(() => router.push('/login'));
  }, [fetchCitizenData, router]);

  function convertArea(sqm: number): string {
    return (sqm * areaUnit.factor).toFixed(2);
  }

  function getVariance(declared: number, computed: number): { percent: number; severity: 'green' | 'amber' | 'red' } {
    if (!declared || !computed) return { percent: 0, severity: 'green' };
    const percent = Math.abs(declared - computed) / declared * 100;
    return {
      percent,
      severity: percent < 2 ? 'green' : percent <= 5 ? 'amber' : 'red',
    };
  }

  async function submitDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!disputeForm.parcelId || !disputeForm.description) return;
    setDisputeSubmitting(true);
    try {
      const res = await fetch('/api/v1/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(disputeForm)
      });
      if (res.ok) {
        setDisputeForm({ parcelId: '', category: 'BOUNDARY', description: '' });
        fetchCitizenData();
      }
    } finally {
      setDisputeSubmitting(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchUid) return;
    setSearchLoading(true);
    setSearchError('');
    setSearchResult(null);
    try {
      const res = await fetch(`/api/v1/parcels/search?uid=${searchUid}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Search failed');
      setSearchResult(data);
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleRequestToBuy() {
    if (!searchResult?.parcel || !user) return;
    setBuyRequestLoading(true);
    try {
      const res = await fetch('/api/v1/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcelId: searchResult.parcel.id,
          buyerCitizenUid: user.citizen_uid,
          transferType: 'SALE'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to initiate buy request');
      alert('Buy request successfully sent! Check your Applications tab.');
      fetchCitizenData();
      setActiveTab('transfers');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setBuyRequestLoading(false);
    }
  }

  async function handleTransferAction(transferId: string, action: string, reason?: string) {
    setTransferActionLoading(transferId);
    try {
      const res = await fetch(`/api/v1/transfers/${transferId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: reason || 'Accepted by counterparty' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Action failed');
      fetchCitizenData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTransferActionLoading('');
    }
  }

  async function openNocModal(transferId: string) {
    setNocLoading(true);
    try {
      const res = await fetch(`/api/v1/transfers/${transferId}/noc`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to load NOC');
      setNocModal(data);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setNocLoading(false);
    }
  }

  async function handleSignNoc() {
    if (!nocModal?.transfer?.id) return;
    setNocSignLoading(true);
    try {
      const res = await fetch(`/api/v1/transfers/${nocModal.transfer.id}/noc`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to sign NOC');
      if (data.allSigned) {
        alert('All signatures collected! Application forwarded to Circle Officer.');
        setNocModal(null);
        fetchCitizenData();
      } else {
        // Refresh the NOC modal
        openNocModal(nocModal.transfer.id);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setNocSignLoading(false);
    }
  }

  async function openTocModal(transferId: string) {
    setTocLoading(true);
    try {
      const res = await fetch(`/api/v1/transfers/${transferId}/toc`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to load TOC');
      setTocModal({ transferId, ...data });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTocLoading(false);
    }
  }

  async function handleSignToc() {
    if (!tocModal?.transferId || !tocUploadData) {
      alert('Please upload your physically signed image first.');
      return;
    }
    setTocSignLoading(true);
    try {
      const res = await fetch(`/api/v1/transfers/${tocModal.transferId}/toc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          digitalSignature: `sig_toc_${user?.citizen_uid}_${Date.now()}`,
          physicalUploadData: tocUploadData
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to submit TOC signature');
      alert('TOC Signature & Upload submitted successfully!');
      setTocModal(null);
      setTocUploadData('');
      fetchCitizenData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setTocSignLoading(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Quick size check to avoid unnecessary compression if already small (e.g. < 500KB)
    if (file.size < 500 * 1024) {
      const reader = new FileReader();
      reader.onload = (event) => setTocUploadData(event.target?.result as string);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => {
        // Fallback if not an image or processing fails
        setTocUploadData(event.target?.result as string);
      };
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
          setTocUploadData(compressedDataUrl);
        } catch (err) {
          // Fallback if canvas fails
          setTocUploadData(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleLogout() {
    await fetch('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
    document.cookie = 'access_token=; Max-Age=0; path=/';
    document.cookie = 'refresh_token=; Max-Age=0; path=/';
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--color-text-secondary)]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const totalArea = parcels.reduce((sum, p) => sum + (p.area_declared_sqm || 0), 0);
  const notifications = transfers.filter((t: any) => 
    (t.status === 'BUYER_REQUEST_PENDING' && t.seller_uid === user?.citizen_uid) ||
    (t.status === 'PENDING_DOCUMENT_UPLOAD')
  );

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-bg)]">
      {/* Top Navigation — Glassmorphic Header */}
      <header className="header-bar sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-[var(--color-bg-hover)] rounded-lg text-[var(--color-text-secondary)] -ml-2" title="Toggle Sidebar">
              <span className="material-symbols-outlined text-xl">menu</span>
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-600 to-emerald-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">
                भू
              </div>
              <span className="font-bold hidden sm:block text-[var(--color-text)]">Bhoomisetu</span>
            </Link>
            <span className="text-[var(--color-border)]">|</span>
            <span className="text-sm text-[var(--color-text-secondary)]">Citizen Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)} 
                className="relative p-2 text-[var(--color-text-secondary)] hover:text-indigo-400 transition-colors rounded-lg hover:bg-[var(--color-bg-hover)]"
                title="Notifications"
              >
                <span className="material-symbols-outlined">notifications</span>
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
                )}
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--color-bg)]"></span>
                )}
              </button>
              
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-[var(--color-bg-card)] rounded-xl shadow-xl border border-[var(--color-border)] z-50 overflow-hidden animate-slide-in">
                  <div className="p-3 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg text-indigo-400">notifications</span>
                      Notifications ({notifications.length})
                    </h4>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-[var(--color-text-muted)]">No new notifications.</div>
                    ) : (
                      notifications.map((notif: any) => (
                        <div key={notif.id} className="p-3 border-b border-[var(--color-border)] hover:bg-[var(--color-bg-hover)] transition-colors cursor-pointer" 
                          onClick={() => {
                            setShowNotifications(false);
                            setActiveTab('transfers');
                            setSelectedParcel(notif);
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-lg text-indigo-400">{notif.status === 'BUYER_REQUEST_PENDING' ? 'handshake' : 'upload_file'}</span>
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-indigo-400">
                                {notif.status === 'BUYER_REQUEST_PENDING' ? 'New Buy Request!' : 'Document Upload Required'}
                              </div>
                              <div className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                {notif.status === 'BUYER_REQUEST_PENDING' 
                                  ? `${notif.buyer_name} wants to buy your land (${notif.parcel_uid}).`
                                  : `Circle Officer requested documents for ${notif.parcel_uid}.`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3 pl-3 border-l border-[var(--color-border)]">
              <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center ring-2 ring-indigo-500/20 ring-offset-2 ring-offset-[var(--color-bg)]">
                <span className="text-xs font-bold text-indigo-400">{user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0,2)}</span>
              </div>
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-[var(--color-text)]">{user.full_name}</div>
                <div className="text-xs text-[var(--color-text-muted)] font-mono">{user.citizen_uid}</div>
              </div>
              <button onClick={handleLogout} className="btn btn-ghost btn-sm !text-red-400 hover:!bg-red-500/10" id="logout-btn">
                <span className="material-symbols-outlined text-lg">logout</span>
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar — Indigo Gradient */}
      <div className="bg-gradient-to-r from-[#1E1B4B] via-[#312E81] to-[#1E1B4B] text-white border-b border-indigo-500/20">
        <div className="max-w-[1400px] mx-auto px-6 py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <div className="stat-card !bg-white/5 !border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-indigo-300">landscape</span>
                </div>
                <div>
                  <div className="text-2xl font-bold">{parcels.length}</div>
                  <div className="text-white/50 text-xs">Parcels Owned</div>
                </div>
              </div>
            </div>
            <div className="stat-card !bg-white/5 !border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-300">straighten</span>
                </div>
                <div>
                  <div className="text-2xl font-bold">{convertArea(totalArea)}</div>
                  <div className="text-white/50 text-xs flex items-center gap-2">
                    Total Area
                    <select
                      value={areaUnit.name}
                      onChange={(e) => setAreaUnit(UNITS.find(u => u.name === e.target.value) || UNITS[0])}
                      className="bg-white/10 border border-white/20 rounded px-1 py-0.5 text-[10px] text-white"
                      id="area-unit-selector"
                    >
                      {UNITS.map(u => <option key={u.name} value={u.name}>{u.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="stat-card !bg-white/5 !border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-amber-300">pending_actions</span>
                </div>
                <div>
                  <div className="text-2xl font-bold">{transfers.filter(t => !['TRANSFER_COMPLETED', 'REJECTED', 'CANCELLED_BY_APPLICANT', 'COUNTERPARTY_DECLINED'].includes(t.status)).length}</div>
                  <div className="text-white/50 text-xs">Active Applications</div>
                </div>
              </div>
            </div>
            <div className="stat-card !bg-white/5 !border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-300">check_circle</span>
                </div>
                <div>
                  <div className="text-2xl font-bold">{transfers.filter(t => t.status === 'TRANSFER_COMPLETED').length}</div>
                  <div className="text-white/50 text-xs">Completed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1400px] mx-auto px-6 py-6 flex-1 w-full flex flex-col md:flex-row gap-6">
        
        {/* Sidebar Navigation */}
        <div className={`md:w-64 shrink-0 nav-sidebar rounded-xl p-3 flex-col gap-1 h-fit ${isSidebarOpen ? 'flex' : 'hidden'}`}>
          <div className="font-bold px-3 py-2 text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest">Modules</div>
          {[
            { key: 'list', label: 'Parcel List', icon: 'list_alt', id: 'tab-list' },
            { key: 'map', label: 'Map View', icon: 'map', id: 'tab-map' },
            { key: 'search', label: 'Search Land', icon: 'search', id: 'tab-search' },
            { key: 'transfers', label: 'My Applications', icon: 'swap_horiz', id: 'tab-transfers' },
            { key: 'taxes', label: 'Land Taxes', icon: 'payments', id: 'tab-taxes' },
            { key: 'disputes', label: 'Disputes', icon: 'gavel', id: 'tab-disputes' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key as any); setSelectedParcel(null); }}
              className={`nav-item ${
                activeTab === tab.key ? 'active' : ''
              }`}
              id={tab.id}
            >
              <span className={`material-symbols-outlined text-xl nav-icon ${activeTab === tab.key ? 'text-indigo-400' : ''}`}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 flex gap-6 flex-col xl:flex-row min-w-0">
          {/* Main Display Area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'map' && (
              <div className="animate-fade-in space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-500/5 border border-indigo-500/20 p-3.5 rounded-xl">
                  <div className="text-xs">
                    <div className="font-semibold text-indigo-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">satellite_alt</span>
                      Need full cadastral layers & satellite imagery?
                    </div>
                    <p className="text-[var(--color-text-secondary)] mt-1">Explore village boundaries, tax heatmaps, and survey/record land on the interactive GIS GeoPortal.</p>
                  </div>
                  <Link href="/geoportal" className="btn btn-sm !bg-indigo-600 !text-white hover:!bg-indigo-500 shrink-0 self-start sm:self-center !border-none">
                    <span className="material-symbols-outlined text-sm">public</span>
                    Launch GeoPortal
                  </Link>
                </div>
                <div className="h-[500px] rounded-xl overflow-hidden border border-[var(--color-border-light)]">
                  <ParcelMap
                    parcels={parcels}
                    selectedParcel={selectedParcel}
                    onParcelClick={(parcel: any) => setSelectedParcel(parcel)}
                    colorMap={LAND_TYPE_COLORS}
                    currentUserId={user?.citizen_uid}
                  />
                </div>
              </div>
            )}

            {activeTab === 'list' && (
              <div className="animate-fade-in space-y-3">
                {parcels.map((parcel) => {
                  const variance = getVariance(parcel.area_declared_sqm, parcel.area_computed_sqm);
                  return (
                    <div
                      key={parcel.id}
                      className="card cursor-pointer hover:border-[var(--color-primary)]/30"
                      onClick={() => { setSelectedParcel(parcel); setActiveTab('map'); }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold">{parcel.parcel_uid}</span>
                            <span className={`badge badge-${parcel.land_type === 'AGRICULTURAL' ? 'green' : parcel.land_type === 'RESIDENTIAL' ? 'blue' : 'amber'}`}>
                              {parcel.land_type}
                            </span>
                            {parcel.encumbrance_status !== 'CLEAR' && (
                              <span className="badge badge-red">{parcel.encumbrance_status}</span>
                            )}
                          </div>
                          <div className="text-sm text-[var(--color-text-secondary)]">
                            {parcel.village} • Survey #{parcel.survey_number} • Patta: {parcel.patta_number}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-semibold">{convertArea(parcel.area_declared_sqm)} {areaUnit.name}</div>
                          <div className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]">
                            <span>Computed: {convertArea(parcel.area_computed_sqm || parcel.area_declared_sqm)}</span>
                            <span className={`badge badge-${variance.severity} !text-[10px] !py-0`}>
                              {variance.percent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {parcels.length === 0 && (
                  <div className="text-center py-16 text-[var(--color-text-muted)]">
                    No parcels registered in your name.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'transfers' && (
              <div className="animate-fade-in space-y-3">
                {transfers.map((transfer: any) => {
                  const statusInfo = STATUS_LABELS[transfer.status] || { label: transfer.status, color: 'badge-gray' };
                  const isSeller = transfer.seller_uid === user.citizen_uid;
                  const isBuyer = transfer.buyer_uid === user.citizen_uid;
                  const isActionLoading = transferActionLoading === transfer.id;

                  return (
                    <div 
                      key={transfer.id} 
                      className={`card cursor-pointer hover:border-[var(--color-primary)] ${selectedParcel?.id === transfer.id ? 'border-[var(--color-primary)] ring-1 ring-[var(--color-primary)]' : ''}`}
                      onClick={() => setSelectedParcel(transfer)}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-semibold">{transfer.application_uid}</span>
                            <span className={`badge ${statusInfo.color}`}>{statusInfo.label}</span>
                          </div>
                          <div className="text-sm text-[var(--color-text-secondary)]">
                            {transfer.parcel_uid} • {transfer.village}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-[var(--color-text-muted)]">{transfer.transfer_type}</div>
                          {transfer.consideration_amount > 0 && (
                            <div className="font-semibold">₹{transfer.consideration_amount.toLocaleString('en-IN')}</div>
                          )}
                        </div>
                      </div>

                      {/* Full Progress Bar */}
                      {(() => {
                        const progress = getProgressInfo(transfer.status);
                        return (
                          <div className="mb-4 mt-2">
                            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-text-muted)] mb-1 uppercase tracking-wider">
                              {TRANSFER_STAGES.map((stage, idx) => (
                                <span key={stage.id} className={
                                  progress.isRejected ? 'text-red-500' :
                                  TRANSFER_STAGES.findIndex(s => s.id === progress.currentStageId) >= idx 
                                    ? 'text-[var(--color-primary)]' 
                                    : ''
                                }>
                                  {stage.label}
                                </span>
                              ))}
                            </div>
                            <div className="flex h-1.5 w-full bg-[var(--color-border-light)] rounded-full overflow-hidden">
                              {TRANSFER_STAGES.map((stage, idx) => {
                                const isActive = TRANSFER_STAGES.findIndex(s => s.id === progress.currentStageId) >= idx;
                                const isCurrent = progress.currentStageId === stage.id;
                                return (
                                  <div 
                                    key={stage.id} 
                                    className={`h-full flex-1 border-r border-white/50 last:border-0 ${
                                      progress.isRejected 
                                        ? 'bg-red-500' 
                                        : isActive 
                                          ? isCurrent ? 'bg-[var(--color-primary)] animate-pulse' : 'bg-[var(--color-primary)] opacity-70' 
                                          : 'bg-transparent'
                                    }`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Counterparty Info with Contact Details */}
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm mb-3 p-3 bg-[var(--color-bg-sidebar)] rounded-lg">
                        <span className={`font-semibold ${isSeller ? 'text-red-500' : 'text-green-600'}`}>
                          {isSeller ? '📤 Selling' : '📥 Buying'}
                        </span>
                        <span className="text-[var(--color-text-muted)] hidden sm:inline">•</span>
                        <div className="flex-1">
                          <div className="font-semibold text-[var(--color-text)]">
                            {isSeller ? transfer.buyer_name : transfer.seller_name}
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)] flex items-center gap-3 mt-0.5">
                            <span>📱 {isSeller ? transfer.buyer_mobile : transfer.seller_mobile}</span>
                            <span>✉️ {isSeller ? transfer.buyer_email : transfer.seller_email}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons based on Status */}
                      {/* Seller sees incoming buy request — Accept or Decline */}
                      {transfer.status === 'BUYER_REQUEST_PENDING' && isSeller && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
                          <button
                            onClick={() => handleTransferAction(transfer.id, 'MUTUAL_TOC_PENDING_SIGNATURES')}
                            disabled={isActionLoading}
                            className="btn btn-accent btn-sm flex-1"
                          >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            {isActionLoading ? 'Processing...' : 'Accept Deal & Generate Contract'}
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Reason for declining:');
                              if (reason) handleTransferAction(transfer.id, 'REJECTED', reason);
                            }}
                            disabled={isActionLoading}
                            className="btn btn-ghost btn-sm !border !border-red-500/30 !text-red-400 hover:!bg-red-500/10"
                          >
                            <span className="material-symbols-outlined text-lg">cancel</span>
                            Reject
                          </button>
                        </div>
                      )}

                      {/* Mutual TOC Signing phase */}
                      {transfer.status === 'MUTUAL_TOC_PENDING_SIGNATURES' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border-light)]">
                          <button
                            onClick={() => openNocModal(transfer.id)}
                            disabled={nocLoading}
                            className="btn btn-primary btn-sm flex-1 bg-gradient-to-r from-amber-500 to-orange-500 border-none text-white shadow-lg hover:shadow-orange-500/30 transition-all"
                          >
                            {nocLoading ? 'Loading Contract...' : '✍️ Open & Sign Mutual Contract (TOC)'}
                          </button>
                        </div>
                      )}

                      {/* Mutual TOC Complete notification */}
                      {transfer.status === 'MUTUAL_TOC_SIGNED' && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border-light)] text-center">
                          <span className="text-green-600 text-sm font-semibold flex justify-center items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            Contract Signed! Waiting for Circle Officer to proceed...
                          </span>
                        </div>
                      )}
                      
                      {/* Document Upload Phase */}
                      {transfer.status === 'PENDING_DOCUMENT_UPLOAD' && (
                         <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border-light)]">
                           <button
                             onClick={() => setDocumentUploadModal(transfer)}
                             className="btn btn-primary btn-sm flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 border-none text-white shadow-lg hover:shadow-blue-500/30 transition-all"
                           >
                             📤 Open Digital Document Upload Form
                           </button>
                         </div>
                      )}

                      {/* Circle Officer Verification */}
                      {transfer.status === 'AT_CIRCLE_OFFICER_VERIFICATION' && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border-light)] text-center">
                          <span className="text-blue-600 text-sm font-semibold">🔍 Under Verification at Circle Office</span>
                        </div>
                      )}

                      {/* TOC Signing phase */}
                      {transfer.status === 'TOC_PENDING_SIGNATURES' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border-light)]">
                          <button
                            onClick={() => openTocModal(transfer.id)}
                            disabled={tocLoading}
                            className="btn btn-primary btn-sm flex-1 bg-amber-600 hover:bg-amber-700 text-white border-none"
                          >
                            {tocLoading ? 'Loading TOC...' : '📄 View & Sign TOC (Tehsildar)'}
                          </button>
                        </div>
                      )}

                      {/* TOC Complete notification */}
                      {transfer.status === 'TOC_VERIFICATION_BY_TEHSILDAR' && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border-light)] text-center">
                          <span className="text-green-600 text-sm font-semibold">✅ TOC Uploaded — Pending Tehsildar Verification...</span>
                        </div>
                      )}
                    </div>
                  );
                })}
                {transfers.length === 0 && (
                  <div className="text-center py-16 text-[var(--color-text-muted)]">
                    No transfer applications yet.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'taxes' && (
              <div className="animate-fade-in space-y-4">
                <h2 className="text-xl font-bold mb-4">Land Tax Details</h2>
                {taxes.map(tax => (
                  <div key={tax.id} className={`card border-l-4 ${tax.status === 'PAID' ? 'border-l-green-500' : 'border-l-amber-500'}`}>
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      
                      {/* Left: Property Details */}
                      <div className="space-y-2 flex-1">
                        <div className="font-mono font-bold text-lg text-[var(--color-primary)] mb-2">
                          {tax.parcel_uid}
                        </div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm bg-[var(--color-bg-sidebar)] p-3 rounded-lg border border-[var(--color-border-light)]">
                          <div><span className="text-[var(--color-text-muted)] block text-xs uppercase tracking-wider">Owner</span> {tax.owner_name}</div>
                          <div><span className="text-[var(--color-text-muted)] block text-xs uppercase tracking-wider">Land Type</span> {tax.land_type}</div>
                          <div><span className="text-[var(--color-text-muted)] block text-xs uppercase tracking-wider">Village</span> {tax.village}</div>
                          <div><span className="text-[var(--color-text-muted)] block text-xs uppercase tracking-wider">Survey No</span> {tax.survey_number}</div>
                        </div>

                        <div className="mt-4 p-3 bg-white/5 border border-[var(--color-border-light)] rounded-lg">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Ledger Breakdown</h4>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span>Base Liability (Current Year)</span>
                              <span>₹{tax.base_liability?.toLocaleString('en-IN') || 0}</span>
                            </div>
                            <div className="flex justify-between text-amber-500">
                              <span>Accumulated Arrears</span>
                              <span>+ ₹{tax.accumulated_arrears?.toLocaleString('en-IN') || 0}</span>
                            </div>
                            <div className="flex justify-between text-red-500">
                              <span>Late Surcharges & Penalties</span>
                              <span>+ ₹{tax.late_surcharges?.toLocaleString('en-IN') || 0}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right: Tax Status & Action */}
                      <div className="md:text-right border-t md:border-t-0 md:border-l border-[var(--color-border-light)] pt-4 md:pt-0 md:pl-6 flex flex-col justify-center">
                        <div className="text-xs font-semibold text-[var(--color-text-secondary)] mb-1">
                          FY: {tax.financial_year} &nbsp;|&nbsp; Due: {new Date(tax.due_date).toLocaleDateString()}
                        </div>
                        <div className="text-3xl font-bold text-[var(--color-text)] mb-2">
                          ₹{tax.total_outstanding?.toLocaleString('en-IN') || 0}
                        </div>
                        
                        <div className="flex items-center md:justify-end gap-3 mt-2">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`badge badge-${tax.status === 'PAID' ? 'green' : tax.status === 'PENDING' ? 'amber' : 'red'}`}>
                              {tax.status}
                            </span>
                            {tax.payment_mode && (
                              <span className="text-[10px] uppercase font-mono text-[var(--color-text-muted)] bg-black/20 px-1.5 py-0.5 rounded border border-white/10">
                                {tax.payment_mode}
                              </span>
                            )}
                          </div>
                          
                          {tax.status === 'PAID' ? (
                            <button className="btn btn-outline btn-sm text-green-600 border-green-600 hover:bg-green-600 hover:text-white" onClick={() => alert('Downloading Receipt: ' + tax.receipt_number)}>
                              📄 Download Receipt
                            </button>
                          ) : (
                            <button 
                              onClick={async () => {
                                if (confirm(`Proceed to secure payment gateway to pay ₹${tax.total_outstanding.toLocaleString('en-IN')}?`)) {
                                  try {
                                    const res = await fetch('/api/v1/khajana/pay', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ taxId: tax.id, paymentMode: 'ONLINE' })
                                    });
                                    if (res.ok) {
                                      alert('Payment Successful!');
                                      window.location.reload();
                                    } else alert('Payment failed.');
                                  } catch (err) {
                                    alert('Network error.');
                                  }
                                }
                              }}
                              className="btn btn-primary btn-sm px-6"
                            >
                              Pay Now (Online)
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                ))}
                {taxes.length === 0 && <div className="text-center text-[var(--color-text-muted)] py-8">No tax records found.</div>}
              </div>
            )}

            {activeTab === 'disputes' && (
              <div className="animate-fade-in space-y-6">
                <h2 className="text-xl font-bold">Land Disputes & Complaints</h2>

                <div className="card bg-[var(--color-bg-sidebar)] border border-[var(--color-border-light)]">
                  <h3 className="font-semibold mb-4 text-[var(--color-primary)]">File a New Complaint</h3>
                  <form onSubmit={submitDispute} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Select Parcel</label>
                        <select className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" value={disputeForm.parcelId} onChange={e => setDisputeForm({...disputeForm, parcelId: e.target.value})} required>
                          <option value="">-- Select Parcel --</option>
                          {parcels.map(p => <option key={p.id} value={p.id}>{p.parcel_uid} ({p.village})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Category</label>
                        <select className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" value={disputeForm.category} onChange={e => setDisputeForm({...disputeForm, category: e.target.value})} required>
                          <option value="BOUNDARY">Boundary Issue</option>
                          <option value="OWNERSHIP">Ownership Dispute</option>
                          <option value="ENCROACHMENT">Encroachment</option>
                          <option value="OTHER">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm" rows={3} value={disputeForm.description} onChange={e => setDisputeForm({...disputeForm, description: e.target.value})} required placeholder="Describe the issue in detail..."></textarea>
                    </div>
                    <div className="text-right">
                      <button type="submit" className="btn btn-primary" disabled={disputeSubmitting}>
                        {disputeSubmitting ? 'Filing...' : 'Submit Complaint'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="space-y-3">
                  <h3 className="font-semibold mt-6 mb-2 border-b border-[var(--color-border-light)] pb-2">My Complaints</h3>
                  {disputes.map(d => (
                    <div key={d.id} className="card">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-mono font-bold text-lg">{d.dispute_uid}</div>
                          <div className="text-sm text-[var(--color-text-secondary)] mt-1">{d.parcel_uid} • {d.category}</div>
                        </div>
                        <span className={`badge badge-${d.status === 'RESOLVED' ? 'green' : d.status === 'OPEN' ? 'blue' : d.status === 'DISMISSED' ? 'red' : 'amber'}`}>
                          {d.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm my-3 p-3 bg-[var(--color-bg-sidebar)] rounded text-[var(--color-text)]">{d.description}</p>
                      {d.resolution_notes && (
                        <div className="bg-amber-500/10 p-3 rounded mt-2 border-l-4 border-amber-500">
                          <strong className="text-xs uppercase text-amber-600 block mb-1">Resolution / Updates:</strong>
                          <span className="text-sm">{d.resolution_notes}</span>
                        </div>
                      )}
                      <div className="text-xs text-[var(--color-text-muted)] mt-3">Filed on: {new Date(d.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                  {disputes.length === 0 && <div className="text-center text-[var(--color-text-muted)] py-8 bg-[var(--color-bg-sidebar)] rounded-lg border border-dashed border-[var(--color-border)]">No complaints filed yet.</div>}
                </div>
              </div>
            )}

            {activeTab === 'search' && (
              <div className="animate-fade-in space-y-6 max-w-4xl mx-auto xl:mx-0">
                <h2 className="text-xl font-bold">Land Search & Due Diligence</h2>
                
                <div className="card">
                  <form onSubmit={handleSearch} className="flex gap-4">
                    <input 
                      type="text" 
                      placeholder="Enter Unique Land ID (e.g. AS-SONITPUR-...)" 
                      className="flex-1 input bg-[var(--color-bg-sidebar)] border-[var(--color-border)]"
                      value={searchUid}
                      onChange={e => setSearchUid(e.target.value)}
                      required
                    />
                    <button type="submit" className="btn btn-primary" disabled={searchLoading}>
                      {searchLoading ? 'Searching...' : 'Search'}
                    </button>
                  </form>
                  {searchError && <p className="text-red-500 text-sm mt-3">{searchError}</p>}
                </div>

                {searchResult && searchResult.parcel && (
                  <div className="space-y-6 animate-slide-in">
                    {/* Action Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-green-900/10 p-4 rounded-xl border border-green-500/30">
                      <div>
                        <h3 className="font-bold text-green-600 dark:text-green-500">Land Available for Purchase</h3>
                        <p className="text-sm text-[var(--color-text-secondary)]">You can initiate a direct buy request to the current owner.</p>
                      </div>
                      <button 
                        onClick={handleRequestToBuy} 
                        disabled={buyRequestLoading || searchResult.parcel.owner_uid === user.citizen_uid}
                        className="btn btn-primary bg-green-600 hover:bg-green-700 border-none text-white shrink-0"
                      >
                        {searchResult.parcel.owner_uid === user.citizen_uid ? 'You Own This' : (buyRequestLoading ? 'Requesting...' : 'Request to Buy')}
                      </button>
                    </div>

                    {/* Overview & Owner */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="card space-y-4">
                        <h3 className="font-semibold border-b border-[var(--color-border-light)] pb-2 text-[var(--color-primary)]">Parcel Overview</h3>
                        <div className="grid grid-cols-2 gap-y-3 text-sm">
                          <span className="text-[var(--color-text-muted)]">UID</span>
                          <span className="font-mono font-semibold">{searchResult.parcel.parcel_uid}</span>
                          <span className="text-[var(--color-text-muted)]">Village</span>
                          <span>{searchResult.parcel.village}</span>
                          <span className="text-[var(--color-text-muted)]">Area</span>
                          <span>{convertArea(searchResult.parcel.area_declared_sqm)} {areaUnit.name}</span>
                          <span className="text-[var(--color-text-muted)]">Land Type</span>
                          <span>{searchResult.parcel.land_type}</span>
                        </div>
                        <h4 className="text-xs font-bold uppercase mt-4 mb-2 text-[var(--color-text-muted)]">Axis Points / Boundaries</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs bg-[var(--color-bg-sidebar)] p-3 rounded-lg border border-[var(--color-border-light)]">
                          <div><span className="text-[var(--color-text-muted)] font-semibold">N:</span> {searchResult.parcel.boundary_north}</div>
                          <div><span className="text-[var(--color-text-muted)] font-semibold">S:</span> {searchResult.parcel.boundary_south}</div>
                          <div><span className="text-[var(--color-text-muted)] font-semibold">E:</span> {searchResult.parcel.boundary_east}</div>
                          <div><span className="text-[var(--color-text-muted)] font-semibold">W:</span> {searchResult.parcel.boundary_west}</div>
                        </div>
                      </div>

                      <div className="card space-y-4">
                        <h3 className="font-semibold border-b border-[var(--color-border-light)] pb-2 text-[var(--color-primary)]">Ownership & Encumbrance</h3>
                        <div className="grid grid-cols-1 gap-y-3 text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--color-text-muted)]">Owner Name</span>
                            <span className="font-semibold text-[var(--color-text)]">{searchResult.parcel.owner_name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--color-text-muted)]">Contact Info</span>
                            <span className="text-right text-xs">
                              <div className="font-mono">{searchResult.parcel.owner_mobile}</div>
                              <div className="text-[var(--color-text-secondary)]">{searchResult.parcel.owner_email}</div>
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[var(--color-text-muted)]">Ownership Type</span>
                            <span className="badge badge-gray">{searchResult.parcel.ownership_type}</span>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-3 border-t border-[var(--color-border-light)]">
                            <span className="text-[var(--color-text-muted)]">Encumbrance / Loans</span>
                            <span className={`badge badge-${searchResult.parcel.encumbrance_status === 'CLEAR' ? 'green' : searchResult.parcel.encumbrance_status === 'MORTGAGED' ? 'red' : 'amber'} !px-3 !py-1`}>
                              {searchResult.parcel.encumbrance_status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Disputes */}
                    <div className="card">
                      <h3 className="font-semibold border-b border-[var(--color-border-light)] pb-2 mb-4 text-[var(--color-primary)]">Active & Past Disputes</h3>
                      {searchResult.disputes.length > 0 ? (
                        <div className="space-y-3">
                          {searchResult.disputes.map((d: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center bg-[var(--color-bg-sidebar)] p-4 rounded-lg border border-[var(--color-border-light)]">
                              <div>
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-semibold text-sm">{d.category}</span>
                                  <span className="text-xs text-[var(--color-text-muted)]">{new Date(d.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-[var(--color-text-secondary)]">{d.description}</p>
                              </div>
                              <span className={`badge badge-${d.status === 'RESOLVED' ? 'green' : d.status === 'OPEN' ? 'blue' : d.status === 'DISMISSED' ? 'red' : 'amber'}`}>
                                {d.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-[var(--color-bg-sidebar)] rounded-lg border border-dashed border-[var(--color-border)]">
                          <p className="text-sm text-[var(--color-text-muted)] flex items-center justify-center gap-2">
                            <span>✅</span> No disputes found for this parcel. The title is clear.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* History */}
                    <div className="card">
                      <h3 className="font-semibold border-b border-[var(--color-border-light)] pb-2 mb-4 text-[var(--color-primary)]">Chain of Title (Passed Down History)</h3>
                      {searchResult.history.length > 0 ? (
                        <div className="space-y-6 p-2">
                          {searchResult.history.map((h: any, idx: number) => (
                            <div key={idx} className="relative pl-8 border-l-2 border-[var(--color-border)]">
                              <div className="absolute w-4 h-4 bg-[var(--color-bg-card)] border-2 border-[var(--color-primary)] rounded-full -left-[9px] top-0"></div>
                              <div className="text-sm font-semibold text-[var(--color-primary)] -mt-1">{new Date(h.transfer_date).toLocaleDateString()}</div>
                              <div className="text-sm mt-1 text-[var(--color-text)]">
                                Transferred via <span className="font-semibold badge badge-gray !px-1">{h.transfer_type}</span> from <span className="font-semibold">{h.from_owner_name || 'Government Allotment'}</span> to <span className="font-semibold">{h.to_owner_name}</span>
                              </div>
                              {h.document_reference && (
                                <div className="text-xs text-[var(--color-text-muted)] mt-2 font-mono">Ref: {h.document_reference}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-[var(--color-bg-sidebar)] rounded-lg border border-dashed border-[var(--color-border)]">
                          <p className="text-sm text-[var(--color-text-muted)] flex items-center justify-center gap-2">
                            <span>📜</span> No previous transfer history found. This is original allotted land.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Panel — Parcel Details */}
          {selectedParcel && (
            <div className="lg:w-[380px] shrink-0 animate-slide-in">
              <div className="card sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Parcel Details</h3>
                  <button onClick={() => setSelectedParcel(null)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg">✕</button>
                </div>

                <div className="space-y-4 text-sm">
                  <div>
                    <span className="label">Parcel UID</span>
                    <span className="font-mono font-semibold block">{selectedParcel.parcel_uid}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="label">Survey No.</span>
                      <span className="block">{selectedParcel.survey_number}</span>
                    </div>
                    <div>
                      <span className="label">Patta No.</span>
                      <span className="block">{selectedParcel.patta_number || '—'}</span>
                    </div>
                    <div>
                      <span className="label">Land Type</span>
                      <span className={`badge badge-${selectedParcel.land_type === 'AGRICULTURAL' ? 'green' : 'blue'}`}>
                        {selectedParcel.land_type}
                      </span>
                    </div>
                    <div>
                      <span className="label">Ownership</span>
                      <span className="block">{selectedParcel.ownership_type}</span>
                    </div>
                  </div>

                  {/* Area with both values */}
                  <div className="p-3 rounded-lg bg-[var(--color-bg-sidebar)]">
                    <div className="label mb-2">Area</div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[var(--color-text-secondary)]">As per record:</span>
                      <span className="font-semibold">{convertArea(selectedParcel.area_declared_sqm)} {areaUnit.name}</span>
                    </div>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-[var(--color-text-secondary)]">Computed:</span>
                      <span className="font-semibold">{convertArea(selectedParcel.area_computed_sqm || selectedParcel.area_declared_sqm)} {areaUnit.name}</span>
                    </div>
                    {(() => {
                      const v = getVariance(selectedParcel.area_declared_sqm, selectedParcel.area_computed_sqm);
                      return (
                        <div className={`badge badge-${v.severity} w-full justify-center`}>
                          Variance: {v.percent.toFixed(2)}%
                          {v.severity === 'red' && ' ⚠️ Consider raising a correction request'}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Boundaries */}
                  <div>
                    <span className="label">Boundaries</span>
                    <div className="grid grid-cols-2 gap-1 text-xs text-[var(--color-text-secondary)]">
                      <span>N: {selectedParcel.boundary_north || '—'}</span>
                      <span>S: {selectedParcel.boundary_south || '—'}</span>
                      <span>E: {selectedParcel.boundary_east || '—'}</span>
                      <span>W: {selectedParcel.boundary_west || '—'}</span>
                    </div>
                  </div>

                  {/* Encumbrance */}
                  <div>
                    <span className="label">Encumbrance Status</span>
                    <span className={`badge badge-${selectedParcel.encumbrance_status === 'CLEAR' ? 'green' : 'red'}`}>
                      {selectedParcel.encumbrance_status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NOC Signing Modal */}
      {nocModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--color-border-light)] flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">📜 No Objection Certificate (NOC)</h3>
              <button onClick={() => setNocModal(null)} className="text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Transaction & Parcel Info */}
              <div className="bg-[var(--color-bg-sidebar)] p-4 rounded-lg border border-[var(--color-border-light)] grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-[var(--color-primary)]">Property Details</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-[var(--color-text-muted)] inline-block w-24">Parcel UID:</span> <span className="font-mono font-semibold text-[var(--color-text)]">{nocModal.transfer.parcel_uid}</span></div>
                    <div><span className="text-[var(--color-text-muted)] inline-block w-24">Village:</span> <span className="text-[var(--color-text)]">{nocModal.transfer.village} (Survey: {nocModal.transfer.survey_number})</span></div>
                    <div><span className="text-[var(--color-text-muted)] inline-block w-24">Area:</span> <span className="text-[var(--color-text)]">{nocModal.transfer.area_declared_sqm} sq m</span></div>
                    <div><span className="text-[var(--color-text-muted)] inline-block w-24">Land Type:</span> <span className="text-[var(--color-text)]">{nocModal.transfer.land_type}</span></div>
                    <div><span className="text-[var(--color-text-muted)] inline-block w-24">Ownership:</span> <span className={`badge badge-${nocModal.transfer.ownership_type === 'JOINT' ? 'amber' : 'green'}`}>{nocModal.transfer.ownership_type}</span></div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2 text-[var(--color-primary)]">Transaction Details</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-[var(--color-text-muted)] inline-block w-24">Type:</span> <span className="text-[var(--color-text)]">{nocModal.transfer.transfer_type}</span></div>
                    <div><span className="text-[var(--color-text-muted)] inline-block w-24">Amount:</span> <span className="text-[var(--color-text)] font-semibold text-green-600">₹{nocModal.transfer.consideration_amount.toLocaleString('en-IN')}</span></div>
                    <div><span className="text-[var(--color-text-muted)] inline-block w-24">Seller:</span> <span className="text-[var(--color-text)]">{nocModal.transfer.seller_name} ({nocModal.transfer.seller_mobile})</span></div>
                    <div><span className="text-[var(--color-text-muted)] inline-block w-24">Buyer:</span> <span className="text-[var(--color-text)]">{nocModal.transfer.buyer_name} ({nocModal.transfer.buyer_mobile})</span></div>
                  </div>
                </div>
              </div>

              {/* Seller Declaration */}
              <div className="border-l-4 border-red-400 pl-4 py-2">
                <h4 className="font-semibold text-sm text-red-600 mb-1">Seller Declaration</h4>
                <p className="text-sm text-[var(--color-text-secondary)] italic">
                  &quot;I, <strong>{nocModal.transfer.seller_name}</strong>, hereby declare that I am the {nocModal.transfer.ownership_type === 'JOINT' ? 'joint' : 'sole'} owner of the property identified as <strong>{nocModal.transfer.parcel_uid}</strong>. I have no objection to the sale of this property and confirm that the land is free from all encumbrances, disputes, and liabilities to the best of my knowledge.&quot;
                </p>
              </div>

              {/* Buyer Declaration */}
              <div className="border-l-4 border-green-400 pl-4 py-2">
                <h4 className="font-semibold text-sm text-green-600 mb-1">Buyer Declaration</h4>
                <p className="text-sm text-[var(--color-text-secondary)] italic">
                  &quot;I, <strong>{nocModal.transfer.buyer_name}</strong>, hereby declare that I have inspected the property identified as <strong>{nocModal.transfer.parcel_uid}</strong> and have no objection to the purchase. I understand and accept the terms of this transaction.&quot;
                </p>
              </div>

              {nocModal.transfer.ownership_type === 'JOINT' && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                  ⚠️ This is a <strong>Joint Ownership</strong> property. ALL co-owners must sign this NOC before proceeding.
                </div>
              )}

              {/* Signature Status */}
              <div>
                <h4 className="font-semibold text-sm mb-3">Signature Progress ({nocModal.totalSigned}/{nocModal.totalRequired})</h4>
                <div className="space-y-2">
                  {nocModal.signatureStatus.map((sig: any) => (
                    <div key={sig.signerId} className="flex items-center justify-between p-3 bg-[var(--color-bg-sidebar)] rounded-lg border border-[var(--color-border-light)]">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${sig.signed ? 'bg-green-500' : 'bg-gray-400'}`}>
                          {sig.signed ? '✓' : '?'}
                        </div>
                        <div>
                          <div className="font-semibold text-sm">{sig.signerName}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">{sig.role} • {sig.signerUid}</div>
                        </div>
                      </div>
                      {sig.signed ? (
                        <span className="badge badge-green text-xs">Signed {new Date(sig.signedAt).toLocaleString()}</span>
                      ) : (
                        <span className="badge badge-gray text-xs">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 border-t border-[var(--color-border-light)] shrink-0 flex gap-3">
              {!nocModal.signatureStatus.find((s: any) => s.signerUid === user.citizen_uid && s.signed) ? (
                <button
                  onClick={handleSignNoc}
                  disabled={nocSignLoading}
                  className="btn btn-primary flex-1"
                >
                  {nocSignLoading ? 'Signing...' : '✍️ Sign this NOC'}
                </button>
              ) : (
                <div className="flex-1 text-center text-green-600 font-semibold py-2">
                  ✅ You have already signed this NOC
                </div>
              )}
              <button onClick={() => setNocModal(null)} className="btn btn-ghost">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* TOC Signing Modal */}
      {tocModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl max-w-3xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--color-border-light)] flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">📄 Title Ownership Certificate (TOC)</h3>
              <button onClick={() => { setTocModal(null); setTocUploadData(''); }} className="text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-amber-50 dark:bg-amber-900/20 p-4 border border-amber-200 dark:border-amber-700 rounded-lg">
                <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-2">Instructions</h4>
                <ol className="list-decimal ml-5 text-sm space-y-1 text-amber-700 dark:text-amber-300">
                  <li>Review the system-generated TOC below.</li>
                  <li><strong>Download</strong> the physical format and sign it by hand.</li>
                  <li><strong>Upload</strong> a clear picture of the signed physical copy.</li>
                  <li><strong>Digitally Sign & Submit</strong> to send it back to the Tehsildar.</li>
                </ol>
              </div>

              {tocModal.prefilledData && (
                <div className="border border-[var(--color-border)] p-6 rounded-lg bg-white text-black print:text-black shadow-inner relative" id="printable-toc-format">
                  <div className="text-center mb-6 border-b pb-4">
                    <h2 className="font-bold text-2xl uppercase tracking-wider">Title Ownership Certificate</h2>
                    <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Government of Assam - Revenue Department</p>
                  </div>
                  
                  <div className="space-y-6 text-sm leading-relaxed text-justify">
                    <p>
                      This is to certify that I, <strong>{tocModal.prefilledData.fullName}</strong>, bearing Aadhaar Number <strong>{tocModal.prefilledData.aadhar}</strong>, am officially participating in the transfer of the land parcel identified by UID <strong>{tocModal.prefilledData.parcelUid}</strong>.
                    </p>
                    <p>
                      The said property, measuring <strong>{tocModal.prefilledData.area} sq.m.</strong> and situated in the zone/village of <strong>{tocModal.prefilledData.zone}</strong>, is being processed for transfer wherein my official designated role is <strong>{tocModal.prefilledData.role}</strong>.
                    </p>
                    <p>
                      I hereby affix my physical signature below to authenticate my identity, verify the details stated above, and provide my final irreversible consent for the mutation and registration of this land transfer in the official government records.
                    </p>
                  </div>

                  <div className="mt-16 flex justify-between items-end">
                    <div>
                      <p>Date: _________________</p>
                      <p className="mt-2 text-xs text-gray-500">System Trace ID: {tocModal.transferId}</p>
                    </div>
                    <div className="text-center">
                      <p>___________________________________</p>
                      <p className="mt-1 font-bold">Signature of {tocModal.prefilledData.role}</p>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      const printContent = document.getElementById('printable-toc-format')?.innerHTML;
                      const originalContent = document.body.innerHTML;
                      if(printContent) {
                        document.body.innerHTML = `<div style="padding: 40px; font-family: sans-serif;">${printContent}</div>`;
                        window.print();
                        document.body.innerHTML = originalContent;
                        window.location.reload();
                      }
                    }} 
                    className="btn btn-outline btn-sm mt-8 w-full print:hidden"
                  >
                    🖨️ Print this format for physical signature
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Step 1: Digital Signature */}
                <div>
                  <h4 className="font-semibold mb-2">Step 1: Digital Signature</h4>
                  {!digitalConsent ? (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-700 rounded-lg text-center h-[160px] flex flex-col justify-center items-center">
                      <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">Authenticate using your registered Aadhaar to digitally sign this document.</p>
                      <button 
                        onClick={() => setDigitalConsent(true)}
                        className="btn btn-primary btn-sm"
                      >
                        ✍️ Add Digital Signature
                      </button>
                    </div>
                  ) : (
                    <div className="bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-700 rounded-lg text-center h-[160px] flex flex-col justify-center items-center">
                      <div className="text-green-600 text-3xl mb-2">✅</div>
                      <p className="text-sm font-bold text-green-800 dark:text-green-300">Digitally Signed</p>
                      <p className="text-xs text-green-700 dark:text-green-400 mt-1">Verified via Aadhaar Auth</p>
                    </div>
                  )}
                </div>

                {/* Step 2: Physical Upload */}
                <div>
                  <h4 className="font-semibold mb-2">Step 2: Physical Upload</h4>
                  <div className="border border-dashed border-gray-400 p-4 rounded-lg text-center bg-[var(--color-bg-sidebar)] hover:bg-[var(--color-border-light)] transition-colors cursor-pointer relative h-[160px] flex flex-col justify-center items-center">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    {tocUploadData ? (
                      <div>
                        <p className="text-green-600 font-bold mb-2">✅ Image Selected</p>
                        <img src={tocUploadData} alt="TOC Upload Preview" className="max-h-16 mx-auto rounded border border-[var(--color-border)]" />
                      </div>
                    ) : (
                      <div>
                        <div className="text-2xl mb-2">📸</div>
                        <p className="text-sm text-[var(--color-text-muted)]">Click or Drag to Upload Picture</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--color-border-light)] shrink-0 flex gap-3">
              {!tocModal.signatures.find((s: any) => s.role === tocModal.prefilledData?.role) ? (
                <>
                  {tocUploadData && digitalConsent ? (
                    <button
                      onClick={handleSignToc}
                      disabled={tocSignLoading}
                      className="btn btn-success text-white flex-1 animate-pulse"
                    >
                      {tocSignLoading ? 'Submitting...' : '📤 Final Submit to Tehsildar'}
                    </button>
                  ) : (
                    <div className="flex-1 text-center text-[var(--color-text-muted)] text-sm py-2 bg-[var(--color-bg-sidebar)] rounded-lg">
                      Please complete both Step 1 and Step 2 to submit.
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 text-center text-green-600 font-semibold py-2">
                  ✅ You have successfully submitted the TOC.
                </div>
              )}
              <button onClick={() => { setTocModal(null); setTocUploadData(''); setDigitalConsent(false); }} className="btn btn-ghost">Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Document Upload Modal */}
      {documentUploadModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--color-border-light)] flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold">📤 Upload Required Documents</h3>
              <button onClick={() => setDocumentUploadModal(null)} className="text-2xl leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-700 rounded-lg">
                <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-2">Digital Form Submission</h4>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  The Circle Officer has requested the following documents for the transfer of <strong>{documentUploadModal.parcel_uid}</strong>.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label font-semibold">1. ID Proof (Aadhaar/PAN)</label>
                  <div className="border border-dashed border-gray-400 p-4 rounded-lg text-center bg-[var(--color-bg-sidebar)] hover:bg-[var(--color-border-light)] transition-colors cursor-pointer relative h-32 flex flex-col justify-center items-center">
                    <input type="file" accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="text-2xl mb-2">📸</div>
                    <p className="text-sm text-[var(--color-text-muted)]">Click or Drag to Upload ID Proof</p>
                  </div>
                </div>
                <div>
                  <label className="label font-semibold">2. Sale Deed / Previous TOC</label>
                  <div className="border border-dashed border-gray-400 p-4 rounded-lg text-center bg-[var(--color-bg-sidebar)] hover:bg-[var(--color-border-light)] transition-colors cursor-pointer relative h-32 flex flex-col justify-center items-center">
                    <input type="file" accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="text-2xl mb-2">📄</div>
                    <p className="text-sm text-[var(--color-text-muted)]">Click or Drag to Upload Sale Deed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[var(--color-border-light)] shrink-0 flex gap-3">
              <button
                onClick={() => {
                  handleTransferAction(documentUploadModal.id, 'AT_CIRCLE_OFFICER_VERIFICATION', 'Documents uploaded via digital form');
                  setDocumentUploadModal(null);
                }}
                disabled={docUploadLoading || transferActionLoading === documentUploadModal.id}
                className="btn btn-primary flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 border-none text-white shadow-lg hover:shadow-blue-500/30"
              >
                {transferActionLoading === documentUploadModal.id ? 'Submitting...' : '✅ Submit Documents'}
              </button>
              <button onClick={() => setDocumentUploadModal(null)} className="btn btn-ghost">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
