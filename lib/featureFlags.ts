// ═══════════════════════════════════════════════════════════════
// lib/featureFlags.ts
// Feature Flags — Runtime toggles for demo vs live behavior
//
// Usage: import { FEATURE_FLAGS } from '../lib/featureFlags';
// Change a flag value, save the file — app hot-reloads instantly.
// No rebuild required.
//
// Before ANY investor demo: verify USE_MOCK_DATA = true,
// LIVE_ONBOARDING = false, all LIVE_* hooks = false.
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
  USE_MOCK_DATA:            false,   // @demo — set false when Supabase is populated
  LIVE_ONBOARDING:          false,  // true = call rpc_complete_onboarding
  LIVE_CONTRACTOR_HOOKS:    false,  // true = contractor hooks call live RPCs
  LIVE_VERIFICATION_HOOKS:  true,  // true = VerificationScreen calls live RPC (S47)
  LIVE_INSURANCE_HOOKS:     true,  // true = InsuranceUploadScreen uses real picker + storage (S47)
  DEV_BYPASS_AUTH:          false,   // @demo — set true for demo mode, false for device testing with real auth
  DEV_SHOW_PASSWORD_LOGIN:  true,  // @demo — set true for device testing, ALWAYS false before demos/commits
  LIVE_SQUAD_SHARE:         true,  // @demo — false for investor demos. Flip to true when Edge Functions deployed (S51)
} as const;
