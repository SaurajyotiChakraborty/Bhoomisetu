// Bhoomisetu — Land Area Unit Configuration (§7.2)
// Configurable per state — currently set for Assam

export interface LandUnit {
  name: string;
  abbreviation: string;
  sqMeters: number;       // 1 unit = this many sq meters
  isLocal: boolean;       // true for state-specific units
  state?: string;         // which state this unit belongs to
}

export const LAND_UNITS: LandUnit[] = [
  // Standard units
  { name: 'Square Metre', abbreviation: 'sq m', sqMeters: 1, isLocal: false },
  { name: 'Square Feet', abbreviation: 'sq ft', sqMeters: 1 / 10.7639, isLocal: false },
  { name: 'Hectare', abbreviation: 'ha', sqMeters: 10_000, isLocal: false },
  { name: 'Acre', abbreviation: 'ac', sqMeters: 4046.86, isLocal: false },

  // Assam local units
  { name: 'Bigha', abbreviation: 'bigha', sqMeters: 1337.80, isLocal: true, state: 'Assam' },
  { name: 'Katha', abbreviation: 'katha', sqMeters: 267.56, isLocal: true, state: 'Assam' },
  { name: 'Lessa', abbreviation: 'lessa', sqMeters: 13.378, isLocal: true, state: 'Assam' },
];

// Conversion relations for display:
// 1 Bigha = 5 Katha = 100 Lessa = 1337.80 sq m
// 1 Katha = 20 Lessa = 267.56 sq m
// 1 Lessa = 13.378 sq m
// 1 sq m = 10.7639 sq ft
// 1 hectare = 10,000 sq m
// 1 acre = 4046.86 sq m

export function convertArea(valueSqM: number, toUnit: LandUnit): number {
  return valueSqM / toUnit.sqMeters;
}

export function formatArea(valueSqM: number, unit: LandUnit, decimals: number = 2): string {
  const converted = convertArea(valueSqM, unit);
  return `${converted.toFixed(decimals)} ${unit.abbreviation}`;
}

export function getVariancePercent(declared: number, computed: number): number {
  if (declared === 0) return 0;
  return Math.abs(declared - computed) / declared * 100;
}

export type VarianceSeverity = 'green' | 'amber' | 'red';

export function getVarianceSeverity(variancePercent: number): VarianceSeverity {
  if (variancePercent < 2) return 'green';
  if (variancePercent <= 5) return 'amber';
  return 'red';
}
