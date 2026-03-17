// hooks/useNeighborhoodAnalysis.ts
// ─────────────────────────────────────────────────────────────────────────────
// Neighborhood Intelligence — Data hook
// LIVE_NEIGHBORHOOD_HOOKS = false  →  mock data (demo safe, default)
// LIVE_NEIGHBORHOOD_HOOKS = true   →  live APIs (Google Places + AirNow)
//
// @backend APIs (S57):
//   Places Nearby (New):  POST https://places.googleapis.com/v1/places:searchNearby (radius: 800m circle)
//   EPA AirNow:           GET https://www.airnowapi.org/aq/observation/latLong/current/?format=json&latitude={}&longitude={}&distance=25&API_KEY={KEY}
//   Walk Score (deferred): proxy from POI density until S60+ real API integration
//   AQI→score map:  Good(0-50)=95, Moderate(51-100)=80, USG(101-150)=60, Unhealthy(151-200)=35, Hazardous=15
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { LifestylePriority, LifestyleCategory, NeighborhoodAnalysis, POIResult, AddressComparison, ComparisonEntry, RadiusMi } from '../types/neighborhood';
import { computeAnalysis, CATEGORY_META, hashPriorities } from '../lib/neighborhoodScoring';
import { GOOGLE_MAPS_API_KEY, AIRNOW_API_KEY } from '../lib/config';
import { supabase } from '../lib/supabase';

// @demo: false = mock data for investor demos. Flip true only for live testing, reset before commit.
export const LIVE_NEIGHBORHOOD_HOOKS = false;

// @demo: 1700 Lincoln St, Denver CO 80203 — demo address coordinates
const DEMO_LAT = 39.7404;
const DEMO_LNG = -104.9880;

// @demo: Replace with real Walk Score API + AirNow responses when LIVE = true
const MOCK_SCORES: Record<string, number> = {
  walkability: 88, transit: 72, bike: 80,
  coffee: 91, yoga: 78, gym: 82, parks: 85, grocery: 79, air_quality: 74,
  // @demo S61: mock scores for new categories
  dining: 88,        // high — Denver has strong restaurant density
  schools: 75,       // moderate — typical suburban mix
  healthcare: 82,    // high — major hospitals + pharmacy chains
  pet_friendly: 70,  // moderate — dog parks less dense than coffee
  nightlife: 65,     // moderate — suburb signal, not downtown
  other: 60,         // neutral — represents custom category
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

// ─────────────────────────────────────────────────────────────────────────────
// haversineDistanceMi — great-circle distance between two lat/lng points in miles
// Used to populate POIResult.distanceMi from Places Nearby lat/lng responses.
// ─────────────────────────────────────────────────────────────────────────────
function haversineDistanceMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────
// Score lookup tables
// ─────────────────────────────────────────────────────────────────────────────

// @demo: Walk Score API deferred — POI density used as proxy per category
// @backend S60+: replace POI_COUNT_SCORES with real Walk Score API for walkability/transit/bike
const POI_COUNT_SCORES = [20, 35, 50, 62, 72, 80, 87, 92, 95, 98];

// @demo: walkability proxy — derived from breadth of categories with POIs
// @backend S60+: replace with real Walk Score API response
const WALKABILITY_PROXY_SCORES = [20, 40, 55, 68, 78, 88, 93, 95];

// AQI ranges → score (AirNow "Good/Moderate/USG/Unhealthy" scale)
function aqiToScore(aqi: number): number {
  if (aqi <= 50)  return 95;  // Good
  if (aqi <= 100) return 80;  // Moderate
  if (aqi <= 150) return 60;  // Unhealthy for Sensitive Groups
  if (aqi <= 200) return 35;  // Unhealthy
  return 15;                  // Very Unhealthy / Hazardous
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchPlacesForCategory — Google Places Nearby per category
// @backend S57: POST https://places.googleapis.com/v1/places:searchNearby
// Runs one request per type string, merges and deduplicates by displayName.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchPlacesForCategory(
  category: LifestyleCategory,
  lat: number,
  lng: number,
  radiusMeters: number = 1609,  // S61: default 1mi, converted from radiusMi upstream
): Promise<{ pois: POIResult[]; count: number }> {
  const types = CATEGORY_META[category].googlePlacesTypes;
  if (types.length === 0) return { pois: [], count: 0 };

  const results = await Promise.all(
    types.map(async (placeType) => {
      try {
        const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'places.displayName,places.location,places.rating',
          },
          body: JSON.stringify({
            includedTypes: [placeType],
            locationRestriction: {
              circle: {
                center: { latitude: lat, longitude: lng },
                radius: radiusMeters,  // S61: was hardcoded 800, now dynamic
              },
            },
            maxResultCount: 10,
          }),
        });
        const data = await response.json();
        return (data.places ?? []) as Array<{
          displayName: { text: string };
          location: { latitude: number; longitude: number };
          rating?: number;
        }>;
      } catch (e) {
        console.warn(`[fetchPlacesForCategory] ${placeType} threw:`, e);
        return [];
      }
    })
  );

  // Merge and deduplicate by name
  const seen = new Set<string>();
  const pois: POIResult[] = [];
  for (const places of results) {
    for (const place of places) {
      const name = place.displayName?.text ?? '';
      if (!name || seen.has(name)) continue;
      seen.add(name);
      pois.push({
        name,
        distanceMi: haversineDistanceMi(lat, lng, place.location.latitude, place.location.longitude),
        rating: place.rating,
        category,
        lat: place.location.latitude,
        lng: place.location.longitude,
      });
    }
  }

  return { pois, count: pois.length };
}

// ─────────────────────────────────────────────────────────────────────────────
// fetchAirQuality — EPA AirNow current observation
// @backend S57: GET https://www.airnowapi.org/aq/observation/latLong/current/
// Returns aqiToScore(maxAqi) — falls back to 50 (neutral) on failure.
// ─────────────────────────────────────────────────────────────────────────────
async function fetchAirQuality(lat: number, lng: number): Promise<number> {
  try {
    const url = `https://www.airnowapi.org/aq/observation/latLong/current/?format=application/json&latitude=${lat}&longitude=${lng}&distance=25&API_KEY=${AIRNOW_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return 50;
    const maxAqi = Math.max(...data.map((d: { AQI: number }) => d.AQI));
    return aqiToScore(maxAqi);
  } catch {
    console.warn('[useNeighborhoodAnalysis] AirNow unavailable, using neutral score 50');
    return 50;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// runLiveAnalysis — full pipeline for a single address
// @backend S57: Places Nearby + AirNow + walkability proxy → computeAnalysis
// ─────────────────────────────────────────────────────────────────────────────
async function runLiveAnalysis(
  priorities: LifestylePriority[],
  clientLabel: string,
  address: string,
  lat: number,
  lng: number,
  radiusMi: RadiusMi = 1,
  onProgress?: (msg: string) => void,
): Promise<NeighborhoodAnalysis> {
  // @backend S61: convert miles to meters for Google Places Nearby API
  // 0.5mi=805m, 1mi=1609m, 2mi=3219m
  const radiusMeters = Math.round(radiusMi * 1609.344);

  const rawScores: Record<string, number> = {};
  const allPois: POIResult[] = [];
  const categoryPoiCounts: Record<string, number> = {};

  // Step 1 — Places Nearby per category (parallel)
  const placesCategories = priorities
    .map(p => p.category)
    .filter(cat => CATEGORY_META[cat].googlePlacesTypes.length > 0);

  if (placesCategories.length > 0) {
    onProgress?.(`Checking ${CATEGORY_META[placesCategories[0]].label}...`);
    const placesResults = await Promise.all(
      placesCategories.map(cat => fetchPlacesForCategory(cat, lat, lng, radiusMeters))
    );
    placesCategories.forEach((cat, i) => {
      const { pois, count } = placesResults[i];
      allPois.push(...pois);
      categoryPoiCounts[cat] = count;
      rawScores[cat] = POI_COUNT_SCORES[Math.min(count, 9)];
    });
  }

  // Step 2 — AirNow (only if air_quality is in priorities)
  const hasAirQuality = priorities.some(p => p.category === 'air_quality');
  if (hasAirQuality) {
    onProgress?.('Checking air quality...');
    rawScores['air_quality'] = await fetchAirQuality(lat, lng);
  }

  // Step 3 — Walkability proxy (no API call)
  // @demo: Walk Score API deferred — category breadth used as proxy
  // @backend S60+: replace with Walk Score API call using lat/lng
  const hasWalkability = priorities.some(p => p.category === 'walkability');
  if (hasWalkability) {
    onProgress?.('Calculating your score...');
    const categoriesWithPOIs = Object.values(categoryPoiCounts).filter(c => c > 0).length;
    rawScores['walkability'] = WALKABILITY_PROXY_SCORES[Math.min(categoriesWithPOIs, 7)];
  }

  // Step 4 — Assemble and compute
  onProgress?.('Calculating your score...');
  return computeAnalysis(rawScores, allPois, priorities, clientLabel, address, lat, lng);
}

// ─────────────────────────────────────────────────────────────────────────────
// @backend S60: fire-and-forget cache save
// Never awaited — failure never blocks UI or affects analysis result
// ─────────────────────────────────────────────────────────────────────────────
function saveToCacheSilently(
  address: string,
  lat: number,
  lng: number,
  analysis: NeighborhoodAnalysis,
  priorities: LifestylePriority[],
  prioritiesHash: string,
  clientLabel: string = '',
  radiusMi: RadiusMi = 1,
): void {
  supabase.rpc('rpc_save_neighborhood_analysis', {
    p_client_label:     clientLabel,
    p_address:          address,
    p_lat:              lat,
    p_lng:              lng,
    p_composite_score:  analysis.compositeScore,
    p_score_descriptor: analysis.scoreDescriptor,
    p_category_scores:  analysis.categoryScores,
    p_pois:             analysis.pois,
    p_priorities:       { hash: prioritiesHash, data: priorities },
    p_radius_mi:        radiusMi,  // S61: radius-aware cache key
  }).then(({ error }) => {
    if (error) console.warn('[Cache save failed] useNeighborhoodAnalysis:', error.message);
    else console.log('[Cache saved] useNeighborhoodAnalysis:', address);
  });
}

// ═══════════════════════════════════════════════════════════════
// useNeighborhoodAnalysis
// ═══════════════════════════════════════════════════════════════

export function useNeighborhoodAnalysis() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis,  setAnalysis]  = useState<NeighborhoodAnalysis | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const analyze = async (
    priorities: LifestylePriority[],
    clientLabel: string,
    address: string,
    lat?: number,      // required in live path — geocoded from autocomplete selection
    lng?: number,      // required in live path — geocoded from autocomplete selection
    radiusMi: RadiusMi = 1,  // S61: search radius
  ) => {
    setIsLoading(true);
    setError(null);
    setLoadingMessage(null);
    try {
      if (!LIVE_NEIGHBORHOOD_HOOKS) {
        await new Promise(r => setTimeout(r, 1200)); // @demo: realistic delay
        setAnalysis(computeAnalysis(MOCK_SCORES, MOCK_POIS, priorities, clientLabel, address, DEMO_LAT, DEMO_LNG));
      } else {
        // @backend S57: live pipeline — Places Nearby + AirNow + walkability proxy
        if (lat === undefined || lng === undefined) {
          setError('Address coordinates are required. Please select an address from the suggestions.');
          setIsLoading(false);
          return;
        }

        // @backend S60: cache lookup — check before live API pipeline
        const prioritiesHash = hashPriorities(priorities);
        const { data: cachedResult, error: cacheError } = await supabase
          .rpc('rpc_get_cached_analysis', {
            p_address: address,
            p_priorities_hash: prioritiesHash,
            p_radius_mi: radiusMi,  // S61: radius-aware cache key
            p_max_age_days: 7,
          });

        if (cachedResult && !cacheError) {
          // @backend S60: cache hit — return saved analysis, skip all API calls
          console.log('[Cache HIT] useNeighborhoodAnalysis:', address);
          setAnalysis({
            clientLabel,
            address,
            lat,
            lng,
            compositeScore: cachedResult.composite_score,
            scoreDescriptor: cachedResult.score_descriptor,
            categoryScores: cachedResult.category_scores,
            pois: cachedResult.pois,
            analyzedAt: cachedResult.cached_at,
          });
        } else {
          // @backend S60: cache miss — run full pipeline, then auto-save
          console.log('[Cache MISS] useNeighborhoodAnalysis:', address);
          const result = await runLiveAnalysis(
            priorities, clientLabel, address, lat, lng, radiusMi,
            (msg) => setLoadingMessage(msg),
          );
          setAnalysis(result);
          saveToCacheSilently(address, lat, lng, result, priorities, prioritiesHash, clientLabel, radiusMi);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsLoading(false);
      setLoadingMessage(null);
    }
  };

  const reset = () => { setAnalysis(null); setError(null); };
  return { analyze, analysis, isLoading, loadingMessage, error, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// useAddressComparison — runs analysis on multiple addresses, returns ranked
// comparison. Reuses the same mock scores and POIs as useNeighborhoodAnalysis
// with small offsets per address to make comparison meaningful in demo mode.
//
// @demo: Each address gets slightly different scores to show comparison value.
// @backend S57: Live path runs full pipeline per address (Places Nearby + AirNow).
//   Each address geocoded via autocomplete selection — lat/lng passed as AddressInput.
// ─────────────────────────────────────────────────────────────────────────────

// AddressInput — live path only. Mock path uses plain string[].
// @backend S57: geocoded coordinates required for live Places + AirNow calls
interface AddressInput {
  address: string;
  lat: number;
  lng: number;
}

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
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const compare = async (
    addresses: string[] | AddressInput[],
    priorities: LifestylePriority[],
    clientLabel: string,
    radiusMi: RadiusMi = 1,  // S61: search radius
  ) => {
    // Type guard — live path sends AddressInput[], mock path sends string[]
    const isLivePath = LIVE_NEIGHBORHOOD_HOOKS &&
      addresses.length > 0 &&
      typeof addresses[0] === 'object';

    const addressCount = addresses.length;
    if (addressCount < 2) {
      setError('At least 2 addresses required for comparison');
      return;
    }
    setIsLoading(true);
    setError(null);
    setLoadingMessage(null);

    try {
      if (!isLivePath) {
        // @demo: mock path — plain string[] addresses
        const stringAddresses = addresses as string[];
        await new Promise(r => setTimeout(r, 1400)); // @demo: realistic delay

        const entries: ComparisonEntry[] = stringAddresses.map((address, i) => {
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
        // @backend S57: live path — run full pipeline per address in parallel
        const liveAddresses = addresses as AddressInput[];

        // @backend S60: cache lookup — check before running parallel analysis
        const sortedAddresses = [...liveAddresses].map(a => a.address).sort();
        const prioritiesHash = hashPriorities(priorities);

        const { data: cachedComparison, error: cacheError } = await supabase
          .rpc('rpc_get_cached_comparison', {
            p_addresses: sortedAddresses,
            p_priorities_hash: prioritiesHash,
            p_radius_mi: radiusMi,  // S61: radius-aware cache key
            p_max_age_days: 7,
          });

        if (cachedComparison && !cacheError) {
          // @backend S60: cache hit — return saved comparison, skip all API calls
          console.log('[Cache HIT] useAddressComparison');
          setComparison({
            clientLabel,
            priorities,
            entries: cachedComparison,
            createdAt: new Date().toISOString(),
          });
        } else {
          // @backend S60: cache miss — run full pipeline, then auto-save
          console.log('[Cache MISS] useAddressComparison');

          const entries: ComparisonEntry[] = await Promise.all(
            liveAddresses.map(async (addr) => {
              try {
                setLoadingMessage(`Analyzing ${addr.address.split(',')[0]}...`);
                const analysis = await runLiveAnalysis(
                  priorities, clientLabel, addr.address, addr.lat, addr.lng, radiusMi,
                );
                return { address: addr.address, lat: addr.lat, lng: addr.lng, analysis };
              } catch (err) {
                // Per-address failure falls back gracefully — never kills the comparison
                console.warn(`[useAddressComparison] Failed for ${addr.address}:`, err);
                const fallbackAnalysis = computeAnalysis(
                  {}, [], priorities, clientLabel, addr.address, addr.lat, addr.lng,
                );
                return { address: addr.address, lat: addr.lat, lng: addr.lng, analysis: fallbackAnalysis };
              }
            })
          );

          // Sort highest score first
          entries.sort((a, b) => b.analysis.compositeScore - a.analysis.compositeScore);

          setComparison({
            clientLabel,
            priorities,
            entries,
            createdAt: new Date().toISOString(),
          });

          // @backend S60: fire-and-forget cache save for comparison
          supabase.rpc('rpc_save_address_comparison', {
            p_client_label: clientLabel,
            p_priorities: { hash: prioritiesHash, data: priorities },
            p_entries: entries,
          }).then(({ error: saveErr }) => {
            if (saveErr) console.warn('[Cache save failed] useAddressComparison:', saveErr.message);
            else console.log('[Cache saved] useAddressComparison');
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setIsLoading(false);
      setLoadingMessage(null);
    }
  };

  const reset = () => { setComparison(null); setError(null); };
  return { compare, comparison, isLoading, loadingMessage, error, reset };
}
