'use client';

import { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  GISFeature,
  ThematicColorMode,
  MapInteractionMode,
} from '@/app/components/map/GeoPortalMap';

// Dynamically import map without SSR to support Leaflet
const GeoPortalMap = dynamic(() => import('@/app/components/map/GeoPortalMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 gap-3">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm font-medium tracking-wide">Loading GIS Cadastral Engine & Satellite Tiles...</span>
    </div>
  ),
});

interface CitizenOption {
  id: string;
  citizen_uid: string;
  full_name: string;
  village_town: string;
}

export default function GeoPortalPage() {
  const [features, setFeatures] = useState<GISFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeature, setSelectedFeature] = useState<GISFeature | null>(null);

  // Filters & Controls
  const [villageFilter, setVillageFilter] = useState<string>('ALL');
  const [landTypeFilter, setLandTypeFilter] = useState<string>('ALL');
  const [encumbranceFilter, setEncumbranceFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [colorMode, setColorMode] = useState<ThematicColorMode>('LAND_USE');
  const [interactionMode, setInteractionMode] = useState<MapInteractionMode>('VIEW');
  const [showCentroidLabels, setShowCentroidLabels] = useState(true);

  // User state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string>('GUEST');

  // Survey Recording Modal state
  const [isSurveyModalOpen, setIsSurveyModalOpen] = useState(false);
  const [drawnGeometry, setDrawnGeometry] = useState<[number, number][] | null>(null);
  const [surveyComputedArea, setSurveyComputedArea] = useState<number>(500);
  const [citizensList, setCitizensList] = useState<CitizenOption[]>([]);

  // Survey Form fields
  const [surveyVillage, setSurveyVillage] = useState('Borghat');
  const [surveyNumber, setSurveyNumber] = useState('');
  const [surveySubdivision, setSurveySubdivision] = useState('A');
  const [surveyPatta, setSurveyPatta] = useState('');
  const [surveyLandType, setSurveyLandType] = useState('AGRICULTURAL');
  const [surveyOwnershipType, setSurveyOwnershipType] = useState('SOLE');
  const [surveyOwnerId, setSurveyOwnerId] = useState('');
  const [boundaryNorth, setBoundaryNorth] = useState('');
  const [boundarySouth, setBoundarySouth] = useState('');
  const [boundaryEast, setBoundaryEast] = useState('');
  const [boundaryWest, setBoundaryWest] = useState('');
  const [surveySubmitting, setSurveySubmitting] = useState(false);
  const [surveyError, setSurveyError] = useState<string | null>(null);

  // Dispute Modal state
  const [isDisputeModalOpen, setIsDisputeModalOpen] = useState(false);
  const [disputeCategory, setDisputeCategory] = useState('BOUNDARY');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }

  // Fetch GIS Features
  async function fetchParcels() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (villageFilter !== 'ALL') params.set('village', villageFilter);
      if (landTypeFilter !== 'ALL') params.set('land_type', landTypeFilter);
      if (encumbranceFilter !== 'ALL') params.set('encumbrance', encumbranceFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await fetch(`/api/v1/gis/parcels?${params.toString()}`);
      const data = await res.json();
      if (data.features) {
        setFeatures(data.features);
        setIsAuthenticated(!!data.isAuthenticated);
        setUserRole(data.userRole || 'GUEST');
      }
    } catch (err) {
      console.error('Failed to load GIS parcels:', err);
    } finally {
      setLoading(false);
    }
  }

  // Fetch Citizens for Owner Assignment
  async function fetchCitizens() {
    try {
      const res = await fetch('/api/v1/gis/citizens');
      const data = await res.json();
      if (data.citizens) {
        setCitizensList(data.citizens);
        if (data.citizens.length > 0 && !surveyOwnerId) {
          setSurveyOwnerId(data.citizens[0].id);
        }
      }
    } catch (e) {
      console.error('Failed to fetch citizens:', e);
    }
  }

  useEffect(() => {
    fetchParcels();
  }, [villageFilter, landTypeFilter, encumbranceFilter]);

  useEffect(() => {
    fetchCitizens();
  }, []);

  // Handle Search on Enter or debounced
  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchParcels();
  }

  // Handle Drawing Complete from Map
  function handleDrawingComplete(coords: [number, number][], computedAreaSqm: number) {
    setDrawnGeometry(coords);
    setSurveyComputedArea(computedAreaSqm);
    setInteractionMode('VIEW');
    setIsSurveyModalOpen(true);
  }

  // Submit Surveyed Parcel to DB
  async function handleSaveSurveyParcel(e: React.FormEvent) {
    e.preventDefault();
    if (!surveyNumber.trim()) {
      setSurveyError('Survey Number is required.');
      return;
    }
    if (!drawnGeometry) {
      setSurveyError('No geometry boundary found. Please survey the plot on the map.');
      return;
    }

    setSurveySubmitting(true);
    setSurveyError(null);

    try {
      const geojsonPolygon = {
        type: 'Polygon',
        coordinates: [drawnGeometry],
      };

      const res = await fetch('/api/v1/gis/parcels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          village: surveyVillage,
          survey_number: surveyNumber.trim(),
          subdivision_number: surveySubdivision.trim() || 'A',
          patta_number: surveyPatta.trim() || `PATTA-${surveyNumber}001`,
          land_type: surveyLandType,
          ownership_type: surveyOwnershipType,
          owner_id: surveyOwnerId,
          declared_area: surveyComputedArea,
          geometry: geojsonPolygon,
          boundary_north: boundaryNorth || 'Surveyed North Cadastral Boundary',
          boundary_south: boundarySouth || 'Surveyed South Cadastral Boundary',
          boundary_east: boundaryEast || 'Surveyed East Cadastral Boundary',
          boundary_west: boundaryWest || 'Surveyed West Cadastral Boundary',
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error?.message || 'Failed to record parcel');
      }

      showToast(`🎉 Parcel #${surveyNumber} successfully recorded into Bhoomisetu database!`);
      setIsSurveyModalOpen(false);
      setDrawnGeometry(null);
      setSurveyNumber('');
      // Refresh parcels
      await fetchParcels();
    } catch (err: any) {
      setSurveyError(err.message);
    } finally {
      setSurveySubmitting(false);
    }
  }

  // Submit Dispute on Parcel
  async function handleSaveDispute(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFeature) return;
    if (disputeDescription.trim().length < 10) {
      setDisputeError('Please provide a detailed dispute description (at least 10 characters).');
      return;
    }

    setDisputeSubmitting(true);
    setDisputeError(null);

    try {
      const res = await fetch('/api/v1/gis/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parcel_id: selectedFeature.id,
          category: disputeCategory,
          description: disputeDescription.trim(),
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.error?.message || 'Failed to submit dispute');
      }

      showToast(`⚠️ Dispute registered on Parcel #${selectedFeature.properties.survey_number}! Encumbrance updated.`);
      setIsDisputeModalOpen(false);
      setDisputeDescription('');
      // Update selected feature local state and refetch
      setSelectedFeature((prev) =>
        prev
          ? {
              ...prev,
              properties: {
                ...prev.properties,
                encumbrance_status: 'DISPUTED',
                active_disputes_count: prev.properties.active_disputes_count + 1,
              },
            }
          : null
      );
      await fetchParcels();
    } catch (err: any) {
      setDisputeError(err.message);
    } finally {
      setDisputeSubmitting(false);
    }
  }

  // Area conversions for inspector
  const areaBreakdown = useMemo(() => {
    if (!selectedFeature) return null;
    const sqm = selectedFeature.properties.area_declared_sqm;
    // Assam Units: 1 Bigha = 1337.80 sqm, 1 Katha = 267.56 sqm, 1 Lessa = 13.378 sqm
    const bighas = Math.floor(sqm / 1337.80);
    const remAfterBigha = sqm % 1337.80;
    const kathas = Math.floor(remAfterBigha / 267.56);
    const remAfterKatha = remAfterBigha % 267.56;
    const lessas = (remAfterKatha / 13.378).toFixed(1);
    const acres = (sqm / 4046.86).toFixed(3);
    const hectares = (sqm / 10000).toFixed(4);

    return {
      sqm: sqm.toLocaleString(),
      bighas,
      kathas,
      lessas,
      acres,
      hectares,
    };
  }, [selectedFeature]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* 1. Top Application Bar */}
      <header className="h-16 px-4 shrink-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between z-20">
        {/* Brand & Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5 select-none">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-600 to-emerald-700 flex items-center justify-center text-white font-bold text-lg shadow-md">
              भू
            </div>
            <div>
              <div className="font-bold text-white text-base tracking-tight leading-none flex items-center gap-1.5">
                Bhoomisetu <span className="text-emerald-400 font-mono text-xs px-1.5 py-0.5 rounded bg-emerald-950/80 border border-emerald-800">GIS GeoPortal</span>
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">Sonitpur Revenue Cadastre & GIS Map</div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 ml-4 border-l border-slate-800 pl-4">
            <span className="text-xs text-slate-400 font-medium mr-1">Village:</span>
            {['ALL', 'Borghat', 'Nikashi', 'Bhomoraguri'].map((v) => (
              <button
                key={v}
                onClick={() => setVillageFilter(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  villageFilter === v
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {v === 'ALL' ? 'All (Tezpur)' : v}
              </button>
            ))}
          </div>
        </div>

        {/* Center: Search Cadastre */}
        <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Survey #, UID, or Owner..."
            className="w-full bg-slate-800/90 text-xs text-slate-100 placeholder-slate-400 rounded-lg pl-8 pr-3 py-1.5 border border-slate-700 focus:outline-none focus:border-emerald-500 transition-colors"
          />
          <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </form>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2.5">
          {/* Color Mode Selector */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <span className="px-2 text-slate-400 font-medium text-[11px] hidden sm:inline">Theme:</span>
            <button
              onClick={() => setColorMode('LAND_USE')}
              title="Color by Land Use"
              className={`px-2 py-1 rounded text-xs transition-colors ${
                colorMode === 'LAND_USE' ? 'bg-emerald-600 text-white font-medium' : 'text-slate-300 hover:text-white'
              }`}
            >
              Land Use
            </button>
            <button
              onClick={() => setColorMode('TAX_STATUS')}
              title="Color by Khajana Tax Rates/Status"
              className={`px-2 py-1 rounded text-xs transition-colors ${
                colorMode === 'TAX_STATUS' ? 'bg-amber-600 text-white font-medium' : 'text-slate-300 hover:text-white'
              }`}
            >
              Taxes (Khajana)
            </button>
            <button
              onClick={() => setColorMode('ENCUMBRANCE')}
              title="Color by Disputes/Encumbrances"
              className={`px-2 py-1 rounded text-xs transition-colors ${
                colorMode === 'ENCUMBRANCE' ? 'bg-rose-600 text-white font-medium' : 'text-slate-300 hover:text-white'
              }`}
            >
              Disputes
            </button>
          </div>

          {/* Action Modes: Measure & Survey */}
          <button
            onClick={() => setInteractionMode(interactionMode === 'MEASURE' ? 'VIEW' : 'MEASURE')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border ${
              interactionMode === 'MEASURE'
                ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-900/40'
                : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <span>📏</span>
            <span className="hidden sm:inline">Measure</span>
          </button>

          <button
            onClick={() => setInteractionMode(interactionMode === 'SURVEY_DRAW' ? 'VIEW' : 'SURVEY_DRAW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border ${
              interactionMode === 'SURVEY_DRAW'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-lg shadow-emerald-900/50 animate-pulse'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 hover:brightness-110'
            }`}
          >
            <span>✏️</span>
            <span>Survey Land</span>
          </button>

          {/* User Nav */}
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => {
                const roleMap: Record<string, string> = {
                  CITIZEN: '/dashboard/citizen',
                  VILLAGE_OFF: '/dashboard/village',
                  CIRCLE_OFF: '/dashboard/circle',
                  TEHSILDAR: '/dashboard/tehsildar',
                  SDO: '/dashboard/sdo',
                  DIST_COLL: '/dashboard/district',
                  DIV_COMM: '/dashboard/division',
                };
                window.location.href = roleMap[userRole] || '/dashboard/citizen';
              }}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-semibold text-emerald-300 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
              id="geoportal-dashboard-nav-btn"
              title="Return to your dashboard"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span>← Return to {userRole === 'CITIZEN' ? 'Citizen' : userRole} Dashboard</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => { window.location.href = '/login'; }}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Work Area: Interactive Map + Cadastral Inspector Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map View Area */}
        <div className="flex-1 h-full relative">
          <GeoPortalMap
            features={features}
            selectedFeature={selectedFeature}
            onSelectFeature={(feat) => setSelectedFeature(feat)}
            colorMode={colorMode}
            interactionMode={interactionMode}
            onDrawingComplete={handleDrawingComplete}
            showCentroidLabels={showCentroidLabels}
          />

          {/* Quick Map Overlay Tools (Top-Left of map) */}
          <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
            <button
              onClick={() => setShowCentroidLabels(!showCentroidLabels)}
              title="Toggle Survey Number Badges on Map"
              className={`p-2 rounded-lg backdrop-blur-md border text-xs font-medium flex items-center gap-1.5 shadow-md transition-colors ${
                showCentroidLabels
                  ? 'bg-slate-900/90 text-emerald-400 border-emerald-500/50'
                  : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <span>🏷️</span>
              <span className="hidden sm:inline">Survey # Labels</span>
            </button>

            <button
              onClick={() => fetchParcels()}
              title="Refresh Cadastral Data from Database"
              className="p-2 rounded-lg bg-slate-900/80 backdrop-blur-md text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 shadow-md transition-colors"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">Reload Map</span>
            </button>
          </div>

          {/* Notification Toast */}
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] bg-emerald-950/95 border border-emerald-500 text-emerald-200 px-5 py-2.5 rounded-xl shadow-2xl text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
              <span>✅</span>
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Right Cadastral Inspector Panel (like GeoPortal's selected-item sidebar) */}
        <div
          className={`w-96 shrink-0 h-full bg-slate-900 border-l border-slate-800 flex flex-col z-10 transition-all ${
            selectedFeature ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
          }`}
        >
          {selectedFeature ? (
            <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
              {/* Header with Title & Close button */}
              <div className="flex items-start justify-between pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold text-white tracking-tight">
                      Survey #{selectedFeature.properties.survey_number}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        selectedFeature.properties.encumbrance_status === 'CLEAR'
                          ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/50'
                          : 'bg-rose-900/80 text-rose-300 border border-rose-700/50'
                      }`}
                    >
                      {selectedFeature.properties.encumbrance_status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">
                    UID: {selectedFeature.properties.parcel_uid}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedFeature(null)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  ✕
                </button>
              </div>

              {/* Cadastral Location Badge */}
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Village:</span>
                  <span className="font-semibold text-slate-200">{selectedFeature.properties.village}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tehsil / Circle:</span>
                  <span className="font-semibold text-slate-200">
                    {selectedFeature.properties.tehsil} ({selectedFeature.properties.circle})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Patta Number:</span>
                  <span className="font-mono text-amber-400 font-semibold">{selectedFeature.properties.patta_number || 'PATTA-N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Land Type:</span>
                  <span className="font-semibold text-emerald-400">{selectedFeature.properties.land_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tenure / Ownership:</span>
                  <span className="font-semibold text-slate-200">{selectedFeature.properties.ownership_type}</span>
                </div>
              </div>

              {/* Area & Unit Conversions */}
              {areaBreakdown && (
                <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800/80 space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                    <span>📐 Cadastral Land Area</span>
                    <span className="text-emerald-400 font-mono text-xs">{areaBreakdown.sqm} m²</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-1">
                    <div className="bg-slate-800 p-2 rounded-lg">
                      <div className="text-sm font-bold text-amber-300">{areaBreakdown.bighas}</div>
                      <div className="text-[10px] text-slate-400">Bigha</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-lg">
                      <div className="text-sm font-bold text-amber-300">{areaBreakdown.kathas}</div>
                      <div className="text-[10px] text-slate-400">Katha</div>
                    </div>
                    <div className="bg-slate-800 p-2 rounded-lg">
                      <div className="text-sm font-bold text-amber-300">{areaBreakdown.lessas}</div>
                      <div className="text-[10px] text-slate-400">Lessa</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-400 text-center pt-1">
                    Equivalent to <strong>{areaBreakdown.acres} Acres</strong> ({areaBreakdown.hectares} Ha)
                  </div>
                </div>
              )}

              {/* Owner Identity (Privacy-Aware) */}
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Registered Landowner</span>
                  {selectedFeature.properties.can_view_pii ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Officer / Owner View
                    </span>
                  ) : (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                      🔒 Public Privacy Masked
                    </span>
                  )}
                </div>
                <div className="text-sm font-semibold text-white pt-1">
                  {selectedFeature.properties.owner_name}
                </div>
                {selectedFeature.properties.can_view_pii && selectedFeature.properties.owner_uid && (
                  <div className="text-[11px] text-slate-400 font-mono">
                    Citizen UID: {selectedFeature.properties.owner_uid}
                  </div>
                )}
                {!selectedFeature.properties.can_view_pii && (
                  <p className="text-[10px] text-slate-400">
                    Full owner particulars are hidden under Section 43 of Digital Land Records Act.
                  </p>
                )}
              </div>

              {/* Khajana / Land Revenue Tax Status */}
              <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Khajana (Land Tax) 2025-26</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      selectedFeature.properties.tax_status === 'PAID'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {selectedFeature.properties.tax_status}
                  </span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Base Annual Liability:</span>
                  <span className="font-mono">₹{selectedFeature.properties.tax_base || 150}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Total Outstanding Due:</span>
                  <span className="font-mono font-bold text-amber-400">
                    ₹{selectedFeature.properties.tax_outstanding || 0}
                  </span>
                </div>
              </div>

              {/* Boundaries (Chouhaddi) */}
              <div className="bg-slate-800/30 rounded-xl p-3 border border-slate-800/60 text-xs space-y-1">
                <div className="font-bold text-slate-300 mb-1">Cadastral Boundaries (Chouhaddi)</div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">North:</strong> {selectedFeature.properties.boundary_north || 'Surveyed plot'}
                </div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">South:</strong> {selectedFeature.properties.boundary_south || 'Surveyed plot'}
                </div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">East:</strong> {selectedFeature.properties.boundary_east || 'Surveyed plot'}
                </div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">West:</strong> {selectedFeature.properties.boundary_west || 'Access Road'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={() => setIsDisputeModalOpen(true)}
                  className="w-full py-2 px-3 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>⚠️</span>
                  <span>Raise Cadastral Dispute / Issue</span>
                </button>

                <button
                  onClick={() => {
                    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedFeature, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute('href', dataStr);
                    downloadAnchor.setAttribute('download', `${selectedFeature.properties.parcel_uid}.geojson`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    showToast('📥 GeoJSON exported successfully!');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>💾</span>
                  <span>Export Cadastral GeoJSON</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-2xl border border-slate-700 shadow-inner">
                🗺️
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200 mb-1">Cadastral Inspector</h3>
                <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                  Click on any land parcel polygon on the map to inspect survey boundaries, local area conversions, ownership particulars, and tax status.
                </p>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1.5 w-full">
                <div className="font-semibold text-slate-300">Quick Tips:</div>
                <div>• Click <strong>✏️ Survey Land</strong> to plot new cadastral boundaries on the map and save them to the database.</div>
                <div>• Switch <strong>Theme</strong> to visualize Tax Rates, Land Use, or Disputes.</div>
                <div>• Click <strong>📏 Measure</strong> to calculate distances between boundary stones.</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Modal: Survey & Record Cadastral Plot */}
      {isSurveyModalOpen && (
        <div className="fixed inset-0 z-[3000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-100 max-h-[90vh] overflow-y-auto space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>✏️</span> Record Surveyed Cadastral Parcel
                </h3>
                <p className="text-xs text-slate-400">Save newly surveyed boundary polygon into Bhoomisetu database.</p>
              </div>
              <button
                onClick={() => setIsSurveyModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {surveyError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {surveyError}
              </div>
            )}

            <form onSubmit={handleSaveSurveyParcel} className="space-y-4 text-xs">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-slate-400 block text-[11px]">Computed Boundary Area:</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {surveyComputedArea.toLocaleString()} m²
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[11px]">Assam Units:</span>
                  <span className="text-sm font-semibold text-amber-300">
                    {(surveyComputedArea / 1337.8).toFixed(2)} Bigha
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Village *</label>
                  <select
                    value={surveyVillage}
                    onChange={(e) => setSurveyVillage(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Borghat">Borghat</option>
                    <option value="Nikashi">Nikashi</option>
                    <option value="Bhomoraguri">Bhomoraguri</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Survey Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 201"
                    value={surveyNumber}
                    onChange={(e) => setSurveyNumber(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Subdivision / Dag</label>
                  <input
                    type="text"
                    placeholder="A"
                    value={surveySubdivision}
                    onChange={(e) => setSurveySubdivision(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Patta Number</label>
                  <input
                    type="text"
                    placeholder="PATTA-XXXX"
                    value={surveyPatta}
                    onChange={(e) => setSurveyPatta(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Land Classification</label>
                  <select
                    value={surveyLandType}
                    onChange={(e) => setSurveyLandType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="AGRICULTURAL">Agricultural</option>
                    <option value="RESIDENTIAL">Residential</option>
                    <option value="COMMERCIAL">Commercial</option>
                    <option value="INDUSTRIAL">Industrial</option>
                    <option value="GOVT">Government Reserve</option>
                    <option value="FOREST">Forest</option>
                    <option value="WATER_BODY">Water Body / Fishery</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ownership Type</label>
                  <select
                    value={surveyOwnershipType}
                    onChange={(e) => setSurveyOwnershipType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="SOLE">Sole Proprietorship</option>
                    <option value="JOINT">Joint Ownership</option>
                    <option value="INHERITED">Inherited</option>
                    <option value="LEASE">Leasehold</option>
                  </select>
                </div>
              </div>

              {/* Assign Citizen Owner */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Assign Registered Owner *</label>
                <select
                  value={surveyOwnerId}
                  onChange={(e) => setSurveyOwnerId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-emerald-500 focus:outline-none"
                >
                  {citizensList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.citizen_uid}) — {c.village_town}
                    </option>
                  ))}
                </select>
              </div>

              {/* Boundary Descriptions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-0.5">North Boundary</label>
                  <input
                    type="text"
                    value={boundaryNorth}
                    onChange={(e) => setBoundaryNorth(e.target.value)}
                    placeholder="e.g. Survey 101 plot"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-0.5">South Boundary</label>
                  <input
                    type="text"
                    value={boundarySouth}
                    onChange={(e) => setBoundarySouth(e.target.value)}
                    placeholder="e.g. Village drain"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-0.5">East Boundary</label>
                  <input
                    type="text"
                    value={boundaryEast}
                    onChange={(e) => setBoundaryEast(e.target.value)}
                    placeholder="e.g. Canal"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 text-[11px] mb-0.5">West Boundary</label>
                  <input
                    type="text"
                    value={boundaryWest}
                    onChange={(e) => setBoundaryWest(e.target.value)}
                    placeholder="e.g. Main road"
                    className="w-full bg-slate-800 border border-slate-700 rounded p-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSurveyModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={surveySubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-900/50 disabled:opacity-50 flex items-center gap-2"
                >
                  {surveySubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving to DB...</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Save Parcel to Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal: Record Cadastral Dispute */}
      {isDisputeModalOpen && selectedFeature && (
        <div className="fixed inset-0 z-[3000] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>⚠️</span> Record Land Dispute on Survey #{selectedFeature.properties.survey_number}
                </h3>
                <p className="text-xs text-slate-400">Registers an official cadastral issue in the revenue records.</p>
              </div>
              <button
                onClick={() => setIsDisputeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {disputeError && (
              <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs">
                {disputeError}
              </div>
            )}

            <form onSubmit={handleSaveDispute} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Dispute Category</label>
                <select
                  value={disputeCategory}
                  onChange={(e) => setDisputeCategory(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2 text-white focus:border-rose-500 focus:outline-none"
                >
                  <option value="BOUNDARY">Boundary Demarcation / Overlap Conflict</option>
                  <option value="ENCROACHMENT">Unauthorized Encroachment on Cadastral Plot</option>
                  <option value="OWNERSHIP">Title / Succession Ownership Claim</option>
                  <option value="OTHER">Other Revenue / Right of Way Grievance</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Dispute Grievance Description *</label>
                <textarea
                  required
                  rows={4}
                  value={disputeDescription}
                  onChange={(e) => setDisputeDescription(e.target.value)}
                  placeholder="Detail the boundary dispute, surveyed variance, or encroachment particulars..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsDisputeModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={disputeSubmitting}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-lg shadow-rose-900/50 disabled:opacity-50 flex items-center gap-2"
                >
                  {disputeSubmitting ? 'Registering...' : 'Confirm & Record Dispute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
