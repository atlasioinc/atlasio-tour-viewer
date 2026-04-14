// lib/neighborhoodScoring.ts
// ─────────────────────────────────────────────────────────────────────────────
// Neighborhood Intelligence — Weighted score computation (S61: 15 standard + 1 custom category)
// @backend: rawScores populated by Walk Score API + Google Places Nearby + AirNow
// ─────────────────────────────────────────────────────────────────────────────

import type { LifestylePriority, CategoryScore, NeighborhoodAnalysis, POIResult, LifestyleCategory } from '../types/neighborhood';
import { COLORS } from './tokens';

const WEIGHTS: Record<string, number> = { must_have: 1.0, nice_to_have: 0.5 };

// @backend S57: googlePlacesTypes maps each category to Google Places (New) includedTypes
// Categories with empty arrays use non-Places APIs (AirNow) or derived proxies (walkability)
export const CATEGORY_META: Record<LifestyleCategory, { label: string; emoji: string; googlePlacesTypes: string[] }> = {
  walkability: { label: 'Walkability',    emoji: '🚶', googlePlacesTypes: [] },           // derived proxy — no API call
  transit:     { label: 'Transit',        emoji: '🚌', googlePlacesTypes: ['transit_station', 'subway_station', 'bus_station'] },
  bike:        { label: 'Bike-Friendly',  emoji: '🚲', googlePlacesTypes: ['bicycle_store'] },
  coffee:      { label: 'Coffee Shops',   emoji: '☕', googlePlacesTypes: ['coffee_shop', 'cafe'] },
  yoga:        { label: 'Yoga & Pilates', emoji: '🧘', googlePlacesTypes: ['yoga_studio'] },
  gym:         { label: 'Fitness & Gyms', emoji: '💪', googlePlacesTypes: ['gym', 'fitness_center'] },
  parks:       { label: 'Parks & Nature', emoji: '🌳', googlePlacesTypes: ['park', 'national_park'] },
  grocery:     { label: 'Grocery',        emoji: '🛒', googlePlacesTypes: ['grocery_store', 'supermarket'] },
  air_quality: { label: 'Air Quality',    emoji: '🌿', googlePlacesTypes: [] },           // AirNow API — not Places
  // @backend S61: 5 new standard categories + 1 custom
  dining:      { label: 'Dining',        emoji: '🍽️', googlePlacesTypes: ['restaurant'] },                           // #1 millennial neighborhood priority (NAR/NewHomeSource 2024)
  schools:     { label: 'Schools',       emoji: '🏫', googlePlacesTypes: ['school'] },                               // drives resale value across all buyer types
  healthcare:  { label: 'Healthcare',    emoji: '🏥', googlePlacesTypes: ['hospital', 'pharmacy', 'doctor'] },       // AARP 2024 top community factor
  pet_friendly:{ label: 'Pet-Friendly',  emoji: '🐾', googlePlacesTypes: ['dog_park', 'veterinary_care', 'pet_store'] }, // 70% US pet ownership
  nightlife:   { label: 'Nightlife',     emoji: '🎉', googlePlacesTypes: ['bar', 'night_club', 'movie_theater'] },   // younger buyers + "18-hour city" signal
  other:       { label: 'Other',         emoji: '✏️', googlePlacesTypes: ['point_of_interest'] },                    // broad fallback — customLabel travels in LifestylePriority
};

// @demo S148b — chip/map visual layer for CategoryMapScreen
// Short labels + distinct colors tuned for chip-row width and marker readability.
// Extends (does not replace) CATEGORY_META, which remains the source of truth
// for the score-list UI on NeighborhoodMatchScreen.
// @design — colors chosen for contrast on white chip backgrounds and map readability
export const CATEGORY_DISPLAY: Record<LifestyleCategory | 'all', { color: string; emoji: string; label: string }> = {
  all:          { color: COLORS.categoryAll,          emoji: '🗺️', label: 'All' },
  coffee:       { color: COLORS.categoryCoffee,       emoji: '☕', label: 'Coffee' },
  yoga:         { color: COLORS.categoryYoga,         emoji: '🧘', label: 'Yoga' },
  parks:        { color: COLORS.categoryParks,        emoji: '🌳', label: 'Parks' },
  walkability:  { color: COLORS.categoryWalkability,  emoji: '🚶', label: 'Walkability' },
  gym:          { color: COLORS.categoryGym,          emoji: '🏋️', label: 'Gym' },
  grocery:      { color: COLORS.categoryGrocery,      emoji: '🛒', label: 'Grocery' },
  transit:      { color: COLORS.categoryTransit,      emoji: '🚇', label: 'Transit' },
  bike:         { color: COLORS.categoryBike,         emoji: '🚴', label: 'Bike' },
  air_quality:  { color: COLORS.categoryAirQuality,   emoji: '🌬️', label: 'Air Quality' },
  dining:       { color: COLORS.categoryDining,       emoji: '🍽️', label: 'Dining' },
  schools:      { color: COLORS.categorySchools,      emoji: '🎓', label: 'Schools' },
  healthcare:   { color: COLORS.categoryHealthcare,   emoji: '🏥', label: 'Healthcare' },
  pet_friendly: { color: COLORS.categoryPetFriendly,  emoji: '🐾', label: 'Pet Friendly' },
  nightlife:    { color: COLORS.categoryNightlife,    emoji: '🌙', label: 'Nightlife' },
  other:        { color: COLORS.categoryOther,        emoji: '📍', label: 'Other' },
};

// @backend S60: deterministic hash for LifestylePriority[] cache key
// Sorted by category (alphabetical) before joining — order-independent
// Example output: 'coffee:must_have|gym:nice_to_have|parks:must_have'
export function hashPriorities(priorities: LifestylePriority[]): string {
  return [...priorities]
    .sort((a, b) => a.category.localeCompare(b.category))
    .map(p => {
      const base = `${p.category}:${p.priority}`;
      // @backend S61: include customLabel for 'other' — different labels = different cache entries
      // Standard categories always have undefined customLabel — unaffected
      return p.customLabel ? `${base}:${p.customLabel.toLowerCase().trim()}` : base;
    })
    .join('|');
}

function getDescriptor(score: number): NeighborhoodAnalysis['scoreDescriptor'] {
  if (score >= 75) return 'Excellent Match';
  if (score >= 50) return 'Good Match';
  return 'Fair Match';
}

export function computeAnalysis(
  rawScores: Record<string, number>,
  pois: POIResult[],
  priorities: LifestylePriority[],
  clientLabel: string,
  address: string,
  lat: number,
  lng: number,
): NeighborhoodAnalysis {
  let weightedSum = 0;
  let totalWeight = 0;

  // must_have first, then nice_to_have, each group sorted by score desc
  const sorted = [...priorities].sort((a, b) => {
    if (a.priority === b.priority) return (rawScores[b.category] ?? 50) - (rawScores[a.category] ?? 50);
    return a.priority === 'must_have' ? -1 : 1;
  });

  const categoryScores: CategoryScore[] = sorted.map(({ category, priority }) => {
    const score = rawScores[category] ?? 50;
    const weight = WEIGHTS[priority] ?? 0;
    weightedSum += score * weight;
    totalWeight += weight;
    return {
      category, priority, score,
      label: CATEGORY_META[category].label,
      emoji: CATEGORY_META[category].emoji,
      poiCount: pois.filter(p => p.category === category).length,
    };
  });

  const compositeScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return {
    clientLabel, address, lat, lng, compositeScore,
    scoreDescriptor: getDescriptor(compositeScore),
    categoryScores, pois,
    analyzedAt: new Date().toISOString(),
  };
}
