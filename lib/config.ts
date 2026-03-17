// lib/config.ts
// ─────────────────────────────────────────────────────────────────────────────
// API key management — reads from Expo Constants (injected via app.config.js extra block)
// Never hardcode keys in source files.
// @backend S57: Google Places (New) + AirNow API keys
// ─────────────────────────────────────────────────────────────────────────────

import Constants from 'expo-constants';

export const GOOGLE_MAPS_API_KEY: string =
  (Constants.expoConfig?.extra?.googleMapsApiKey as string) ?? '';

export const AIRNOW_API_KEY: string =
  (Constants.expoConfig?.extra?.airnowApiKey as string) ?? '';

// Partner Track — feature-flagged until partner onboarding is activated
// Flip to true when first Title/Escrow or Mortgage Pro partner onboards
// @demo default: false — partner track is pre-launch, not visible in agent/contractor demo
export const PARTNER_TRACK_ENABLED = false;
