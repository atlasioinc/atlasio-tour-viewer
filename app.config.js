// app.config.js
// ─────────────────────────────────────────────────────────────────────────────
// Extends app.json with dynamic environment variable injection.
// API keys are read from .env (never committed) and bundled via Constants.expoConfig.extra.
// Usage in app: import { GOOGLE_MAPS_API_KEY, AIRNOW_API_KEY } from 'lib/config'
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-require-imports
const appJson = require('./app.json');

module.exports = {
  ...appJson.expo,
  extra: {
    ...appJson.expo?.extra,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    airnowApiKey: process.env.AIRNOW_API_KEY ?? '',
  },
};
