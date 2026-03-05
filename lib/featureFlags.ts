// ═══════════════════════════════════════════════════════════════
// lib/featureFlags.ts
// Feature Flags — Runtime toggles for demo vs live behavior
//
// These flags control which code paths execute at runtime.
// Set to appropriate values before device testing or investor demos.
// Future: wire to hidden dev menu (triple-tap avatar on ProfileTab).
//
// Flags:
//   USE_MOCK_DATA     — true: all hooks return mock data (demo mode)
//                       false: hooks query live Supabase
//                       @demo: controls mock fallback in hooks/useData.ts
//
//   LIVE_ONBOARDING   — true: OnboardingComplete calls rpc_complete_onboarding
//                       false: console.log only (safe for demos)
//                       @backend: gates rpc_complete_onboarding in OnboardingComplete.tsx
//
//   LIVE_CONTRACTOR_HOOKS — true: contractor hooks call live Supabase RPCs
//                           false: hooks use mock fallback (safe for demos)
//                           @backend: gates 7 contractor RPCs in hooks/useData.ts
// ═══════════════════════════════════════════════════════════════

export const FEATURE_FLAGS = {
  USE_MOCK_DATA: false,  // true = mock data (demo), false = live Supabase
  LIVE_ONBOARDING: false, // true = call rpc_complete_onboarding, false = console.log only
  LIVE_CONTRACTOR_HOOKS: false, // true = contractor hooks call live RPCs, false = mock fallback
} as const;
