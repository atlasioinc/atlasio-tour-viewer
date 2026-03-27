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
  scheme: 'atlasio',
  ios: {
    ...appJson.expo?.ios,
    bundleIdentifier: 'com.atlasioapp.atlasio',
    buildNumber: '3',
    supportsTablet: false,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Atlasio uses your location to show neighborhood data near properties.',
      NSCameraUsageDescription:
        'Atlasio uses your camera to upload profile and job photos.',
      NSPhotoLibraryUsageDescription:
        'Atlasio accesses your photo library to upload profile and job photos.',
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  splash: {
    ...appJson.expo?.splash,
    backgroundColor: '#003DC3',
  },
  extra: {
    ...appJson.expo?.extra,
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    airnowApiKey: process.env.AIRNOW_API_KEY ?? '',
    eas: {
      projectId: '8ff45b8b-74dc-4f5d-af9d-3bf9c44c5db2',
    },
  },
};
