// types/neighborhood.ts
// ─────────────────────────────────────────────────────────────────────────────
// Neighborhood Intelligence — TypeScript types
// Scoped to this feature only. Do NOT add to types/index.ts.
// Phase 2: clientLabel becomes foreign key for save-to-client profile.
// ─────────────────────────────────────────────────────────────────────────────

export type PriorityLevel = 'must_have' | 'nice_to_have';

// S61: search radius options — affects Places API radius and cache key
export type RadiusMi = 0.5 | 1 | 2;

export type LifestyleCategory =
  | 'walkability' | 'transit' | 'bike'
  | 'coffee' | 'yoga' | 'gym' | 'parks' | 'grocery' | 'air_quality'
  | 'dining' | 'schools' | 'healthcare' | 'pet_friendly' | 'nightlife' | 'other';

export interface LifestylePriority {
  category: LifestyleCategory;
  priority: PriorityLevel;
  customLabel?: string;  // S61: only populated when category === 'other'
}

export interface CategoryScore {
  category: LifestyleCategory;
  score: number;          // 0-100
  priority: PriorityLevel;
  poiCount?: number;      // place-based categories only
  label: string;
  emoji: string;
}

export interface POIResult {
  name: string;
  distanceMi: number;
  rating?: number;
  category: LifestyleCategory;
  lat: number;            // for CategoryMapScreen pins
  lng: number;
}

export interface NeighborhoodAnalysis {
  clientLabel: string;    // e.g. 'Sarah & Mike' — Phase 2: persisted to client profile
  address: string;
  lat: number;
  lng: number;
  compositeScore: number;
  scoreDescriptor: 'Excellent Match' | 'Good Match' | 'Fair Match';
  categoryScores: CategoryScore[];
  pois: POIResult[];
  analyzedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AddressComparison — used by AddressComparisonScreen (S56)
// Holds the results of analyzing multiple addresses against the same priorities.
// Phase 2: persist comparison to client profile alongside NeighborhoodAnalysis.
// ─────────────────────────────────────────────────────────────────────────────

export interface ComparisonEntry {
  address: string;           // display label
  lat: number;
  lng: number;
  analysis: NeighborhoodAnalysis;
}

export interface AddressComparison {
  clientLabel: string;
  priorities: LifestylePriority[];
  entries: ComparisonEntry[];  // 2–3 entries, sorted by compositeScore desc
  createdAt: string;           // ISO timestamp
}
