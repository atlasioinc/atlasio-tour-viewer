// hooks/useNeighborhoodAnalysis.ts
// ─────────────────────────────────────────────────────────────────────────────
// Neighborhood Intelligence — Data hook
// LIVE_NEIGHBORHOOD_HOOKS = false  →  mock data (demo safe, default)
// LIVE_NEIGHBORHOOD_HOOKS = true   →  live APIs (implement in S50)
//
// @backend APIs for S50:
//   Walk Score:     GET https://api.walkscore.com/score?format=json&lat={}&lon={}&transit=1&bike=1&wsapikey={KEY}
//   Places Autocomplete (New): POST https://places.googleapis.com/v1/places:autocomplete
//   Places Nearby (New):       POST https://places.googleapis.com/v1/places:searchNearby (radius: 800m circle)
//   EPA AirNow:     GET https://www.airnowapi.org/aq/observation/latLong/current/?format=json&latitude={}&longitude={}&distance=25&API_KEY={KEY}
//   AQI→score map:  Good(0-50)=90-100, Moderate(51-100)=65-89, USG(101-150)=40-64, Unhealthy+=<40
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { LifestylePriority, NeighborhoodAnalysis, POIResult, AddressComparison, ComparisonEntry } from '../types/neighborhood';
import { computeAnalysis } from '../lib/neighborhoodScoring';

// @demo: false = mock data for investor demos. Never flip true before S50.
const LIVE_NEIGHBORHOOD_HOOKS = false;

// @demo: 1700 Lincoln St, Denver CO 80203 — demo address coordinates
const DEMO_LAT = 39.7404;
const DEMO_LNG = -104.9880;

// @demo: Replace with real Walk Score API + AirNow responses when LIVE = true
const MOCK_SCORES: Record<string, number> = {
  walkability: 88, transit: 72, bike: 80,
  coffee: 91, yoga: 78, gym: 82, parks: 85, grocery: 79, air_quality: 74,
};

// @demo: Replace with real Google Places Nearby Search results when LIVE = true
const MOCK_POIS: POIResult[] = [
  { name: 'Onyx Coffee Lab',        distanceMi: 0.2, rating: 4.8, category: 'coffee',  lat: 39.7420, lng: -104.9870 },
  { name: 'Corvus Coffee Roasters', distanceMi: 0.4, rating: 4.7, category: 'coffee',  lat: 39.7390, lng: -104.9900 },
  { name: 'Huckleberry Roasters',   distanceMi: 0.6, rating: 4.6, category: 'coffee',  lat: 39.7380, lng: -104.9860 },
  { name: 'CorePower Yoga',         distanceMi: 0.3, rating: 4.5, category: 'yoga',    lat: 39.7415, lng: -104.9890 },
  { name: 'Vital Yoga',             distanceMi: 0.5, rating: 4.9, category: 'yoga',    lat: 39.7395, lng: -104.9910 },
  { name: 'Washington Park',        distanceMi: 0.4, rating: 4.9, category: 'parks',   lat: 39.7350, lng: -104.9850 },
  { name: 'City Park',              distanceMi: 0.8, rating: 4.8, category: 'parks',   lat: 39.7460, lng: -104.9820 },
  { name: 'King Soopers',           distanceMi: 0.3, rating: 4.2, category: 'grocery', lat: 39.7410, lng: -104.9895 },
  { name: 'Elevate Fitness',        distanceMi: 0.4, rating: 4.6, category: 'gym',     lat: 39.7405, lng: -104.9870 },
];

export function useNeighborhoodAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis,  setAnalysis]  = useState<NeighborhoodAnalysis | null>(null);
  const [error,     setError]     = useState<string | null>(null);

  const analyze = async (priorities: LifestylePriority[], clientLabel: string, address: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!LIVE_NEIGHBORHOOD_HOOKS) {
        await new Promise(r => setTimeout(r, 1200)); // @demo: realistic delay
        setAnalysis(computeAnalysis(MOCK_SCORES, MOCK_POIS, priorities, clientLabel, address, DEMO_LAT, DEMO_LNG));
      } else {
        // @backend S50: geocode → Walk Score → Places Nearby per category → AirNow → computeAnalysis
        throw new Error('Live hooks not yet implemented — scheduled for S50');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => { setAnalysis(null); setError(null); };
  return { analyze, analysis, isLoading, error, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAddressComparison — runs analysis on multiple addresses, returns ranked
// comparison. Reuses the same mock scores and POIs as useNeighborhoodAnalysis
// with small offsets per address to make comparison meaningful in demo mode.
//
// @demo: Each address gets slightly different scores to show comparison value.
// @backend S56+: Geocode each address independently, then run full API pipeline
//   per address (Walk Score + Places Nearby + AirNow). Same as useNeighborhoodAnalysis
//   but called N times and results sorted by compositeScore desc.
// ─────────────────────────────────────────────────────────────────────────────

// @demo: offsets tuned for green/amber score contrast in demo
// @demo: base scores kept in sync between useNeighborhoodAnalysis and useAddressComparison
// Entry 0: no offset — matches useNeighborhoodAnalysis single-address composite exactly
// Entry 1: moderate drops → compositeScore ~78-83 → amber
// Entry 2: larger drops → compositeScore ~74-78 → amber
const MOCK_SCORE_OFFSETS: Record<number, Record<string, number>> = {
  0: {},
  1: { walkability: -8, coffee: -10, yoga: -6, parks: -7, gym: -5 },
  2: { walkability: -14, coffee: -16, yoga: -10, parks: -12, air_quality: -8, gym: -10 },
};

// @demo: Coordinate offsets for mock map pins (so pins don't overlap)
const MOCK_LAT_OFFSETS = [0, 0.008, -0.006];
const MOCK_LNG_OFFSETS = [0, 0.005, 0.010];

export function useAddressComparison() {
  const [isLoading, setIsLoading] = useState(false);
  const [comparison, setComparison] = useState<AddressComparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compare = async (
    addresses: string[],            // 2–3 address strings
    priorities: LifestylePriority[],
    clientLabel: string,
  ) => {
    if (addresses.length < 2) {
      setError('At least 2 addresses required for comparison');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      if (!LIVE_NEIGHBORHOOD_HOOKS) {
        await new Promise(r => setTimeout(r, 1400)); // @demo: realistic delay

        const entries: ComparisonEntry[] = addresses.map((address, i) => {
          // @demo: Apply score offsets to make each address distinct
          const offsetScores = Object.fromEntries(
            Object.entries(MOCK_SCORES).map(([k, v]) => [
              k,
              Math.min(100, Math.max(0, v + (MOCK_SCORE_OFFSETS[i]?.[k] ?? 0))),
            ])
          );
          const lat = DEMO_LAT + MOCK_LAT_OFFSETS[i];
          const lng = DEMO_LNG + MOCK_LNG_OFFSETS[i];
          const analysis = computeAnalysis(
            offsetScores, MOCK_POIS, priorities, clientLabel, address, lat, lng
          );
          return { address, lat, lng, analysis };
        });

        // Sort highest score first
        entries.sort((a, b) => b.analysis.compositeScore - a.analysis.compositeScore);

        setComparison({
          clientLabel,
          priorities,
          entries,
          createdAt: new Date().toISOString(),
        });
      } else {
        // @backend S56+: For each address:
        //   1. Geocode via Google Places Autocomplete result (lat/lng already available from input)
        //   2. Walk Score API call
        //   3. Google Places Nearby per category in priorities
        //   4. AirNow API call
        //   5. computeAnalysis() with real data
        //   Sort entries by compositeScore desc before setting state.
        throw new Error('Live comparison not yet implemented — scheduled for S57+');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => { setComparison(null); setError(null); };
  return { compare, comparison, isLoading, error, reset };
}
