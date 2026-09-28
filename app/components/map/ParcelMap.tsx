'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import Map, { Source, Layer, Popup, Marker, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as maplibregl from 'maplibre-gl';
import * as turf from '@turf/turf';

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl('/maplibre-gl-worker.mjs');
}


interface Parcel {
  id: string;
  parcel_uid: string;
  village: string;
  survey_number: string;
  land_type: string;
  area_declared_sqm: number;
  geometry: string;
  owner_name?: string;
  owner_uid?: string;
  current_owner_id?: string;
}

interface ParcelMapProps {
  parcels: Parcel[];
  selectedParcel: Parcel | null;
  onParcelClick: (parcel: Parcel) => void;
  colorMap: Record<string, string>;
  currentUserId?: string;
}

export default function ParcelMap({ parcels, selectedParcel, onParcelClick, colorMap, currentUserId }: ParcelMapProps) {
  const mapRef = useRef<MapRef>(null);

  // Auto-fit bounds
  useEffect(() => {
    if (!mapRef.current) return;
    
    if (parcels.length > 0 && !selectedParcel) {
      let combinedBounds: [number, number, number, number] | null = null;
      
      parcels.forEach(p => {
        if (!p.geometry) return;
        try {
          const geojson = typeof p.geometry === 'string' ? JSON.parse(p.geometry) : p.geometry;
          const bbox = turf.bbox(geojson);
          if (!combinedBounds) {
            combinedBounds = [bbox[0], bbox[1], bbox[2], bbox[3]];
          } else {
            combinedBounds = [
              Math.min(combinedBounds[0], bbox[0]),
              Math.min(combinedBounds[1], bbox[1]),
              Math.max(combinedBounds[2], bbox[2]),
              Math.max(combinedBounds[3], bbox[3])
            ];
          }
        } catch (e) {}
      });
      
      if (combinedBounds) {
        const map = mapRef.current.getMap();
        map.fitBounds([[combinedBounds[0], combinedBounds[1]], [combinedBounds[2], combinedBounds[3]]], { padding: 40 });
      }
    }
  }, [parcels, selectedParcel]);

  // Fly to selected
  useEffect(() => {
    if (!mapRef.current || !selectedParcel?.geometry) return;
    try {
      const geojson = typeof selectedParcel.geometry === 'string' ? JSON.parse(selectedParcel.geometry) : selectedParcel.geometry;
      const bbox = turf.bbox(geojson);
      const map = mapRef.current.getMap();
      map.fitBounds([[bbox[0], bbox[1]], [bbox[2], bbox[3]]], { padding: 80, duration: 800 });
    } catch {}
  }, [selectedParcel]);

  const geoJsonData = useMemo(() => {
    return {
      type: 'FeatureCollection',
      features: parcels.filter(p => p.geometry).map(p => {
        try {
          return {
            type: 'Feature',
            properties: { ...p, isSelected: selectedParcel?.id === p.id, color: colorMap[p.land_type] || '#666666' },
            geometry: typeof p.geometry === 'string' ? JSON.parse(p.geometry) : p.geometry,
          };
        } catch { return null; }
      }).filter(Boolean)
    };
  }, [parcels, selectedParcel, colorMap]);

  return (
    <div className="w-full h-full relative" id="parcel-map">
      <Map
        ref={mapRef}
        mapLib={maplibregl}
        initialViewState={{
          longitude: 92.80,
          latitude: 26.63,
          zoom: 13
        }}
        mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
        interactiveLayerIds={['parcels-fill']}
        onClick={(e) => {
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            const parcel = parcels.find(p => p.id === feature.properties?.id);
            if (parcel) onParcelClick(parcel);
          }
        }}
      >
        <Source id="parcels" type="geojson" data={geoJsonData as any}>
          <Layer
            id="parcels-fill"
            type="fill"
            paint={{
              'fill-color': ['get', 'color'],
              'fill-opacity': ['case', ['boolean', ['get', 'isSelected'], false], 0.4, 0.25]
            }}
          />
          <Layer
            id="parcels-line"
            type="line"
            paint={{
              'line-color': ['case', ['boolean', ['get', 'isSelected'], false], '#E69E26', ['get', 'color']],
              'line-width': ['case', ['boolean', ['get', 'isSelected'], false], 3, 2]
            }}
          />
        </Source>
        
        {/* Markers for survey numbers */}
        {parcels.map(parcel => {
          if (!parcel.geometry) return null;
          try {
            const geojson = typeof parcel.geometry === 'string' ? JSON.parse(parcel.geometry) : parcel.geometry;
            const center = turf.center(geojson);
            const color = colorMap[parcel.land_type] || '#666666';
            return (
              <Marker key={parcel.id} longitude={center.geometry.coordinates[0]} latitude={center.geometry.coordinates[1]} anchor="center">
                <div style={{
                  background: color,
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  fontFamily: 'monospace'
                }}>#{parcel.survey_number}</div>
              </Marker>
            );
          } catch { return null; }
        })}

        {/* Selected Popup */}
        {selectedParcel && selectedParcel.geometry && (() => {
          try {
            const geojson = typeof selectedParcel.geometry === 'string' ? JSON.parse(selectedParcel.geometry) : selectedParcel.geometry;
            const center = turf.center(geojson);
            const color = colorMap[selectedParcel.land_type] || '#666666';
            return (
              <Popup
                longitude={center.geometry.coordinates[0]}
                latitude={center.geometry.coordinates[1]}
                closeButton={false}
                closeOnClick={false}
                anchor="bottom"
                offset={10}
              >
                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: '200px' }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>{selectedParcel.parcel_uid}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{selectedParcel.village} • Survey #{selectedParcel.survey_number}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span>Type:</span>
                    <span style={{ fontWeight: 500, color }}>{selectedParcel.land_type}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span>Area:</span>
                    <span style={{ fontWeight: 500 }}>{selectedParcel.area_declared_sqm.toLocaleString()} sq m</span>
                  </div>
                  {selectedParcel.owner_name && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px' }}>
                      <span>Owner:</span>
                      <span style={{ fontWeight: 500 }}>{selectedParcel.owner_name}</span>
                    </div>
                  )}
                </div>
              </Popup>
            );
          } catch { return null; }
        })()}
      </Map>
    </div>
  );
}
