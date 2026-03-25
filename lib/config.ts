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

// Deal Creation — gates the "New Deal +" CTA and DealCreationSheet
// Default: false — hidden at MVP launch (agent + contractor only)
// Flip true when deal creation is ready for partner pilot launch.
// Independent from PARTNER_TRACK_ENABLED — these are separate capabilities:
//   PARTNER_TRACK_ENABLED: controls whether the partner role is accessible
//   DEAL_CREATION_ENABLED: controls whether agents can create deals
// Demo: flip both true to show the full partner deal flow to investors.
export const DEAL_CREATION_ENABLED = false;
