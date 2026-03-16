// lib/neighborhoodScoring.ts
// ─────────────────────────────────────────────────────────────────────────────
// Neighborhood Intelligence — Weighted score computation
// @backend: rawScores populated by Walk Score API + Google Places Nearby + AirNow
// ─────────────────────────────────────────────────────────────────────────────

import type { LifestylePriority, CategoryScore, NeighborhoodAnalysis, POIResult, LifestyleCategory } from '../types/neighborhood';

const WEIGHTS: Record<string, number> = { must_have: 1.0, nice_to_have: 0.5 };

export const CATEGORY_META: Record<LifestyleCategory, { label: string; emoji: string }> = {
  walkability: { label: 'Walkability',    emoji: '🚶' },
  transit:     { label: 'Transit',        emoji: '🚌' },
  bike:        { label: 'Bike-Friendly',  emoji: '🚲' },
  coffee:      { label: 'Coffee Shops',   emoji: '☕' },
  yoga:        { label: 'Yoga & Pilates', emoji: '🧘' },
  gym:         { label: 'Fitness & Gyms', emoji: '💪' },
  parks:       { label: 'Parks & Nature', emoji: '🌳' },
  grocery:     { label: 'Grocery',        emoji: '🛒' },
  air_quality: { label: 'Air Quality',    emoji: '🌿' },
};

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
