// lib/featureFlags.ts
// Demo mode toggle — controls whether screens use mock data or live Supabase queries.
// Set to true for investor demos, false for production/development.
// Future: wire to hidden dev menu (triple-tap avatar on ProfileTab).

export const FEATURE_FLAGS = {
  USE_MOCK_DATA: false,  // true = mock data (demo), false = live Supabase
} as const;
