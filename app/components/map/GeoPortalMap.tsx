'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import Map, { Source, Layer, Popup, Marker, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
}

export interface GISFeature {
  type: string;
  id: string;
  geometry: any;
  properties: {
    id: string;
    parcel_uid: string;
    survey_number: string;
    subdivision_number?: string;
    patta_number?: string;
    khatian_number?: string;
    state: string;
    district: string;
    subdivision: string;
    tehsil: string;
    circle: string;
    village: string;
    land_type: string;
    land_class?: string;
    area_declared_sqm: number;
    area_computed_sqm?: number;
    ownership_type: string;
    encumbrance_status: string;
    boundary_north?: string;
    boundary_south?: string;
    boundary_east?: string;
    boundary_west?: string;
    owner_name: string;
    owner_uid?: string;
    owner_mobile?: string;
    is_owner: boolean;
    can_view_pii: boolean;
    tax_status: 'PAID' | 'PENDING' | 'OVERDUE' | 'EXEMPT';
    tax_outstanding: number;
    tax_base: number;
    active_disputes_count: number;
  };
}

export type ThematicColorMode = 'LAND_USE' | 'TAX_STATUS' | 'ENCUMBRANCE' | 'OWNERSHIP';
export type MapInteractionMode = 'VIEW' | 'MEASURE' | 'SURVEY_DRAW';

interface GeoPortalMapProps {
  features: GISFeature[];
  selectedFeature: GISFeature | null;
  onSelectFeature: (feature: GISFeature | null) => void;
  colorMode: ThematicColorMode;
  interactionMode: MapInteractionMode;
  onDrawingComplete?: (polygonCoords: [number, number][], computedAreaSqm: number) => void;
  showCentroidLabels?: boolean;
}

export const LAND_USE_COLORS: Record<string, string> = {
  AGRICULTURAL: '#10B981', // emerald
  RESIDENTIAL: '#F59E0B',  // amber
  COMMERCIAL: '#8B5CF6',   // purple
  INDUSTRIAL: '#64748B',   // slate
  GOVT: '#3B82F6',         // blue
  FOREST: '#059669',       // dark emerald
  WATER_BODY: '#06B6D4',   // cyan
  DEFAULT: '#94A3B8',
};

export const TAX_STATUS_COLORS: Record<string, string> = {
  PAID: '#10B981',
  PENDING: '#F97316',
  OVERDUE: '#EF4444',
  EXEMPT: '#9CA3AF',
};

export const ENCUMBRANCE_COLORS: Record<string, string> = {
  CLEAR: '#10B981',
  MORTGAGED: '#EAB308',
  DISPUTED: '#EF4444',
  ATTACHED: '#A855F7',
};

export const OWNERSHIP_COLORS: Record<string, string> = {
  SOLE: '#3B82F6',
  JOINT: '#6366F1',
  INHERITED: '#14B8A6',
  LEASE: '#F97316',
};

export function getFeatureColor(feature: GISFeature, mode: ThematicColorMode): string {
  const p = feature.properties;
  switch (mode) {
    case 'LAND_USE': return LAND_USE_COLORS[p.land_type] || LAND_USE_COLORS.DEFAULT;
    case 'TAX_STATUS': return TAX_STATUS_COLORS[p.tax_status] || TAX_STATUS_COLORS.PAID;
    case 'ENCUMBRANCE': return ENCUMBRANCE_COLORS[p.encumbrance_status] || ENCUMBRANCE_COLORS.CLEAR;
    case 'OWNERSHIP': return OWNERSHIP_COLORS[p.ownership_type] || OWNERSHIP_COLORS.SOLE;
    default: return '#10B981';
  }
}

export default function GeoPortalMap({
  features,
  selectedFeature,
  onSelectFeature,
  colorMode,
  interactionMode,
  onDrawingComplete,
  showCentroidLabels = true,
}: GeoPortalMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Drawing & measure states
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [liveAreaSqm, setLiveAreaSqm] = useState(0);
  const [livePerimeterM, setLivePerimeterM] = useState(0);

  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureDistanceM, setMeasureDistanceM] = useState(0);

  // Fit map to features
  useEffect(() => {
    if (!mapRef.current) return;
    if (features.length > 0 && !selectedFeature) {
      let bounds: [number, number, number, number] | null = null;
      features.forEach(f => {
        if (!f.geometry) return;
        try {
          const b = turf.bbox(f.geometry);
          if (!bounds) {
            bounds = [b[0], b[1], b[2], b[3]];
          } else {
            bounds[0] = Math.min(bounds[0], b[0]);
            bounds[1] = Math.min(bounds[1], b[1]);
            bounds[2] = Math.max(bounds[2], b[2]);
            bounds[3] = Math.max(bounds[3], b[3]);
          }
        } catch {}
      });
      
      if (bounds) {
        const map = mapRef.current.getMap();
        map.fitBounds([[bounds[0], bounds[1]], [bounds[2], bounds[3]]], { padding: 50 });
      }
    }
  }, [features, selectedFeature]);

  useEffect(() => {
    if (!mapRef.current || !selectedFeature?.geometry) return;
    try {
      const b = turf.bbox(selectedFeature.geometry);
      mapRef.current.getMap().fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: 100, duration: 800 });
    } catch {}
  }, [selectedFeature]);

  useEffect(() => {
    if (interactionMode !== 'SURVEY_DRAW') {
      setDrawingPoints([]); setLiveAreaSqm(0); setLivePerimeterM(0);
    }
    if (interactionMode !== 'MEASURE') {
      setMeasurePoints([]); setMeasureDistanceM(0);
    }
  }, [interactionMode]);

  // Handlers
  const handleMapClick = (e: any) => {
    if (interactionMode === 'VIEW') {
      if (e.features && e.features.length > 0) {
        const feat = e.features[0];
        const original = features.find(f => f.id === feat.properties.id);
        if (original) onSelectFeature(original);
      } else {
        onSelectFeature(null);
      }
      return;
    }

    const coord: [number, number] = [e.lngLat.lng, e.lngLat.lat];

    if (interactionMode === 'SURVEY_DRAW') {
      const newPts = [...drawingPoints, coord];
      setDrawingPoints(newPts);
      if (newPts.length >= 3) {
        const closedCoords = [...newPts, newPts[0]];
        const poly = turf.polygon([closedCoords]);
        setLiveAreaSqm(Math.round(turf.area(poly)));
        setLivePerimeterM(Math.round(turf.length(turf.lineString(closedCoords), { units: 'meters' })));
      }
    } else if (interactionMode === 'MEASURE') {
      const newPts = [...measurePoints, coord];
      setMeasurePoints(newPts);
      if (newPts.length >= 2) {
        setMeasureDistanceM(Math.round(turf.length(turf.lineString(newPts), { units: 'meters' })));
      }
    }
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3) return;
    const closed = [...drawingPoints, drawingPoints[0]];
    if (onDrawingComplete) onDrawingComplete(closed, liveAreaSqm);
  };

  const handleUndoPoint = () => {
    if (drawingPoints.length === 0) return;
    const nextPts = drawingPoints.slice(0, -1);
    setDrawingPoints(nextPts);
    if (nextPts.length >= 3) {
      const closedCoords = [...nextPts, nextPts[0]];
      const poly = turf.polygon([closedCoords]);
      setLiveAreaSqm(Math.round(turf.area(poly)));
      setLivePerimeterM(Math.round(turf.length(turf.lineString(closedCoords), { units: 'meters' })));
    } else {
      setLiveAreaSqm(0); setLivePerimeterM(0);
    }
  };

  // Memoized GeoJSON features
  const geoJsonData = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: features.map(f => {
        try {
          return {
            type: 'Feature',
            properties: {
              ...f.properties,
              isSelected: selectedFeature?.id === f.id,
              color: getFeatureColor(f, colorMode)
            },
            geometry: f.geometry,
          };
        } catch { return null; }
      }).filter(Boolean)
    };
  }, [features, selectedFeature, colorMode]);

  // Renderers for drawing mode
  const drawLineGeoJson = useMemo(() => {
    if (drawingPoints.length < 2) return null;
    return turf.lineString(drawingPoints.length > 2 ? [...drawingPoints, drawingPoints[0]] : drawingPoints);
  }, [drawingPoints]);
  
  const drawPolyGeoJson = useMemo(() => {
    if (drawingPoints.length < 3) return null;
    return turf.polygon([[...drawingPoints, drawingPoints[0]]]);
  }, [drawingPoints]);

  const measureLineGeoJson = useMemo(() => {
    if (measurePoints.length < 2) return null;
    return turf.lineString(measurePoints);
  }, [measurePoints]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{ longitude: 92.80, latitude: 26.63, zoom: 14 }}
        mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        interactiveLayerIds={interactionMode === 'VIEW' ? ['parcels-fill'] : []}
        onClick={handleMapClick}
        cursor={interactionMode === 'SURVEY_DRAW' ? 'crosshair' : interactionMode === 'MEASURE' ? 'crosshair' : 'pointer'}
      >
        <Source id="parcels" type="geojson" data={geoJsonData as any}>
          <Layer
            id="parcels-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.6, 0.3],
            }}
          />
          <Layer
            id="parcels-line"
            type="line"
            paint={{
              'line-color': ['case', ['boolean', ['get', 'isSelected'], false], '#FBBF24', ['get', 'color']],
              'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 3.5, 2]
            }}
          />
        </Source>

        {/* Labels */}
        {showCentroidLabels && features.map(f => {
          if (!f.geometry) return null;
          try {
            const center = turf.center(f.geometry);
            return (
              <Marker key={`lbl-${f.id}`} longitude={center.geometry.coordinates[0]} latitude={center.geometry.coordinates[1]} anchor="center">
                <div className="bg-slate-900/80 backdrop-blur text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shadow-sm border border-slate-700/50 pointer-events-none">
                  #{f.properties.survey_number}
                </div>
              </Marker>
            );
          } catch { return null; }
        })}

        {/* Drawing layers */}
        {drawPolyGeoJson && (
          <Source type="geojson" data={drawPolyGeoJson}>
            <Layer id="draw-poly-fill" type="fill" paint={{ 'fill-color': '#FBBF24', 'fill-opacity': 0.3 }} />
          </Source>
        )}
        {drawLineGeoJson && (
          <Source type="geojson" data={drawLineGeoJson}>
            <Layer id="draw-line" type="line" paint={{ 'line-color': '#F59E0B', 'line-width': 2.5, 'line-dasharray': [2, 2] }} />
          </Source>
        )}
        {drawingPoints.map((pt, idx) => (
          <Marker key={`d-${idx}`} longitude={pt[0]} latitude={pt[1]} anchor="center">
            <div
              className={`w-3 h-3 rounded-full border-2 cursor-pointer ${idx === 0 ? 'bg-emerald-400 border-emerald-600' : 'bg-amber-400 border-amber-600'}`}
              onClick={(e) => {
                if (idx === 0 && drawingPoints.length >= 3) {
                  e.stopPropagation();
                  finishDrawing();
                }
              }}
            />
          </Marker>
        ))}

        {/* Measuring layers */}
        {measureLineGeoJson && (
          <Source type="geojson" data={measureLineGeoJson}>
            <Layer id="measure-line" type="line" paint={{ 'line-color': '#3B82F6', 'line-width': 3 }} />
          </Source>
        )}
        {measurePoints.map((pt, idx) => (
          <Marker key={`m-${idx}`} longitude={pt[0]} latitude={pt[1]} anchor="center">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-blue-600" />
          </Marker>
        ))}

        {/* Selected Popup */}
        {selectedFeature && selectedFeature.geometry && interactionMode === 'VIEW' && (() => {
          try {
            const center = turf.center(selectedFeature.geometry);
            const p = selectedFeature.properties;
            const color = getFeatureColor(selectedFeature, colorMode);
            return (
              <Popup longitude={center.geometry.coordinates[0]} latitude={center.geometry.coordinates[1]} closeButton={false} closeOnClick={false} anchor="bottom" offset={10}>
                <div className="font-sans text-slate-800 text-xs min-w-[220px]">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5 mb-1.5">
                    <span className="font-bold text-[13px]">Survey #{p.survey_number}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold text-white" style={{ background: color }}>{p.land_type}</span>
                  </div>
                  <div><strong>UID:</strong> <span className="font-mono text-[11px]">{p.parcel_uid}</span></div>
                  <div><strong>Village:</strong> {p.village}</div>
                  <div><strong>Owner:</strong> {p.owner_name}</div>
                  <div><strong>Area:</strong> {p.area_declared_sqm.toLocaleString()} sq m</div>
                  <div className="flex gap-2 mt-1.5 pt-1 border-t border-dashed border-slate-200">
                    <span><strong>Tax:</strong> <span style={{ color: TAX_STATUS_COLORS[p.tax_status] || '#10B981', fontWeight: 600 }}>{p.tax_status}</span></span>
                    <span><strong>Status:</strong> <span style={{ color: ENCUMBRANCE_COLORS[p.encumbrance_status] || '#10B981', fontWeight: 600 }}>{p.encumbrance_status}</span></span>
                  </div>
                </div>
              </Popup>
            );
          } catch { return null; }
        })()}
      </Map>

      {/* Drawing UI HUD */}
      {interactionMode === 'SURVEY_DRAW' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10] glass-panel text-slate-800 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 text-xs font-medium animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-emerald-600">Survey Mode</span>
          </div>
          <div className="h-4 w-px bg-slate-300" />
          <div>Pts: <strong className="text-amber-600">{drawingPoints.length}</strong></div>
          <div>Perm: <strong>{livePerimeterM.toLocaleString()}m</strong></div>
          <div>Area: <strong className="text-emerald-600">{liveAreaSqm.toLocaleString()}m²</strong></div>
          <div className="h-4 w-px bg-slate-300" />
          <div className="flex gap-2">
            <button onClick={handleUndoPoint} disabled={drawingPoints.length===0} className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 border border-slate-300">Undo</button>
            <button onClick={() => setDrawingPoints([])} className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200">Clear</button>
            <button onClick={finishDrawing} disabled={drawingPoints.length<3} className="px-3.5 py-1 rounded bg-emerald-500 text-white font-semibold disabled:opacity-40 hover:bg-emerald-600 shadow-sm">Finish</button>
          </div>
        </div>
      )}

      {/* Measuring UI HUD */}
      {interactionMode === 'MEASURE' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10] glass-panel text-slate-800 px-5 py-3 rounded-2xl shadow-xl flex items-center gap-4 text-xs font-medium animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            <span className="font-semibold text-blue-600">Measure</span>
          </div>
          <div className="h-4 w-px bg-slate-300" />
          <div>Dist: <strong className="text-blue-600">{measureDistanceM >= 1000 ? `${(measureDistanceM/1000).toFixed(2)}km` : `${measureDistanceM}m`}</strong></div>
          <button onClick={() => setMeasurePoints([])} className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300">Clear</button>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-[10] glass-panel p-3.5 rounded-xl shadow-lg text-xs font-medium max-w-xs transition-all text-slate-800">
        <div className="font-bold mb-2 flex items-center justify-between gap-4">
          <span>Legend ({colorMode.replace('_', ' ')})</span>
          <span className="text-[10px] font-normal text-slate-500">{features.length} plots</span>
        </div>

        {colorMode === 'LAND_USE' && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-slate-600">
            {Object.entries(LAND_USE_COLORS).filter(([k]) => k !== 'DEFAULT').map(([name, hex]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: hex }} />
                <span className="capitalize">{name.toLowerCase().replace('_', ' ')}</span>
              </div>
            ))}
          </div>
        )}

        {colorMode === 'TAX_STATUS' && (
          <div className="space-y-1.5 text-[11px] text-slate-600">
            {Object.entries(TAX_STATUS_COLORS).map(([name, hex]) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm shrink-0 shadow-sm" style={{ backgroundColor: hex }} />
                <span>{name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
