// ═══════════════════════════════════════════════════════════════
// lib/featureFlags.ts
// Feature Flags — Runtime toggles for demo vs live behavior
//
// Usage: import { FEATURE_FLAGS } from '../lib/featureFlags';
// Change a flag value, save the file — app hot-reloads instantly.
// No rebuild required.
//
// Before ANY investor demo: verify USE_MOCK_DATA = true,
// all LIVE_* hooks = false (except LIVE_ONBOARDING + LIVE_CONTRACTOR_HOOKS which are permanent).
//
// Flags:
//   USE_MOCK_DATA           — true: hooks return mock data (demo mode)
//                             false: hooks query live Supabase
//
//   LIVE_ONBOARDING         — true: OnboardingComplete calls rpc_complete_onboarding
//                             false: console.log only (safe for demos)
//
//   LIVE_CONTRACTOR_HOOKS   — true: contractor hooks call live Supabase RPCs
//                             false: mock fallback
//
//   LIVE_VERIFICATION_HOOKS — true: VerificationScreen calls rpc_submit_license_verification
//                             false: console.log + mock success (safe for demos)
//                             @backend: gates useSubmitLicenseVerification mutation
//
//   LIVE_INSURANCE_HOOKS    — true: InsuranceUploadScreen calls real document picker +
//                                   Supabase credentials bucket + rpc_upload_insurance_document
//                             false: mock toggle + setTimeout success (safe for demos)
//                             @backend: gates useUploadInsuranceDocument mutation
//
//   DEV_BYPASS_AUTH           — true: skips auth check, uses mock user (demo mode)
//                               false: requires real Supabase auth session
//
//   DEV_SHOW_PASSWORD_LOGIN   — true: shows email+password sign-in on LoginScreen (dev only)
//                               false: magic link only (production default)
//                               ⚠️  Always set false before demos or commits
// ═══════════════════════════════════════════════════════════════

export const FEATURE_FLAGS = {
  USE_MOCK_DATA:            true,           // @demo — true = demo mode, false = live Supabase
  LIVE_ONBOARDING:          true,   // permanent since S140d — rpc_complete_onboarding deployed + verified
  LIVE_CONTRACTOR_HOOKS:    true,   // true = contractor hooks call live RPCs (permanent since S36)
  LIVE_VERIFICATION_HOOKS:  false,  // true = VerificationScreen calls live RPC (S47)
  LIVE_INSURANCE_HOOKS:     false,  // true = InsuranceUploadScreen uses real picker + storage (S47)
  // Controls live neighborhood analysis API calls (EPA AirNow, Google Places)
  // Set true for TestFlight builds — false resets to mock data
  LIVE_NEIGHBORHOOD_HOOKS:  false,  // true = live APIs (Google Places + AirNow), false = mock data (S57)
  // ⚠️ TESTFLIGHT OVERRIDES — these two differ from standard demo defaults
  // DEV_BYPASS_AUTH: false — real devices have no hardcoded session; bypass causes crash
  // DEV_SHOW_PASSWORD_LOGIN: true — magic link deep links deferred to S110 (Associated Domains)
  // To restore demo mode: set DEV_BYPASS_AUTH: true, DEV_SHOW_PASSWORD_LOGIN: false,
  //   and LIVE_NEIGHBORHOOD_HOOKS: false
  // DEV_BYPASS_AUTH and DEV_SHOW_PASSWORD_LOGIN must always be toggled as a pair — never individually.
  DEV_BYPASS_AUTH:          false,      // @demo — true = loads agent demo user, bypasses login
  DEV_SHOW_PASSWORD_LOGIN:  false,   // @testflight — magic link deep links not configured yet
  LIVE_SQUAD_SHARE:         false,  // @demo — false for investor demos

  // DEAL_CREATION_ENABLED flag matrix:
  // MVP launch (agent + contractor only):  PARTNER_TRACK_ENABLED: false, DEAL_CREATION_ENABLED: false
  // Partner pilot (view only):             PARTNER_TRACK_ENABLED: true,  DEAL_CREATION_ENABLED: false
  // Full partner launch:                   PARTNER_TRACK_ENABLED: true,  DEAL_CREATION_ENABLED: true
  // Investor demo (show everything):       PARTNER_TRACK_ENABLED: true,  DEAL_CREATION_ENABLED: true
  DEAL_CREATION_ENABLED:    false,  // @demo — false until deal creation ready for partner pilot
  LIVE_PROFILE_HOOKS:       true,   // rpc_get_profile_stats deployed S133 — permanently true
} as const;
