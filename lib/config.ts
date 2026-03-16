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
