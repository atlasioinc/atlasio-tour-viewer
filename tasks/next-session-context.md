# Next Session Context
# Generated: S179 end-of-session — May 9, 2026
# Read by: Claude Chat at S180 session start for state reconcile

---

## Build state
- RPCs: 77 (unchanged S179)
- Hooks: 72 (unchanged S179)
- Edge Functions: 11
- tsc: 0 | Lint: 0 new (8 pre-existing warnings in unrelated files — same baseline as S178)
- Last build: Build 58 (in TestFlight — surfaced BUG-1/BUG-2/BUG-3 during onboarding QA)
- S179 fixes will appear in Build 59 (next EAS queue, after `fix/onboarding-s179` is merged to `main`)

## Active branch (S179)
- `fix/onboarding-s179` @ [S179 final commit] — three onboarding bug fixes:
  - BUG-1 + BUG-2 (read side): `components/ContractorProfileBasics.tsx` — `isPrefilling` loading gate
  - BUG-2 (write side): `components/LoginScreen.tsx` — 300ms propagation delay after Apple `updateUser`
  - BUG-3: `components/OnboardingScreen1.tsx` — removed leftover "Sign in" escape hatch

## Carryover branches (still open, deferred)
- `feat/atl-location-03-s175` @ af7c5c4 — S175 base + S177 modal fixes committed
- `feat/atl-bid-actions-01-s176` @ [S178 BidSubmission final commit] — S176 base + S177 invite/bid wiring + S177 notification mock cleanup + S178 BidSubmissionScreen audit fixes
- `feat/atl-auth-02-s178` @ [S178 ATL-AUTH-02 final commit] — AuthStack + LoginScreen rebuild + SignUpScreen + ForgotPasswordScreen

## S180 priorities (in order)

### 1. Device QA on `fix/onboarding-s179` (Tony, before merge)
Test all four auth → onboarding paths to confirm `rpc_complete_onboarding` lands cleanly:
- [ ] Apple SSO **first sign-in** (clean keychain) → contractor onboarding completes, name lands in `profiles.name`
- [ ] Apple SSO **repeat sign-in** (`credential.fullName === null`) → contractor onboarding completes, name lands from `user_metadata.full_name`
- [ ] Google SSO → contractor onboarding completes, name lands from Google profile
- [ ] Email + password sign-up → contractor onboarding completes, name lands from `SignUpScreen` form data
- [ ] Verify "Find Jobs Now" CTA never throws "Something went wrong" again
- [ ] Verify `OnboardingScreen1` no longer renders the "Sign in" link

### 2. Merge `fix/onboarding-s179` → `main` (after QA passes)

### 3. Resume ATL-AUTH-02 follow-up (carried from S178)
- Implement `ResetPasswordScreen` + `atlasio://reset-password` deep link handler in `App.tsx`
- Wire to `supabase.auth.updateUser({ password })` flow after `verifyOtp({ type: 'recovery' })`
- Test the password reset email end-to-end on device

### 4. Carryover audit items (still pending from S178)
- ATL-AUTH-02 device QA on Build 57: Apple sign-in roundtrip, Google sign-in roundtrip, email+password sign-in, sign up + email confirmation, password reset email roundtrip
- Swipe-to-go-back gesture on SignUp + ForgotPassword screens (cosmetic — separate ticket)

## What is explicitly OUT of scope for S180 follow-ups
- `useCompleteOnboarding` hook refactor — unchanged
- `rpc_complete_onboarding` SQL — unchanged
- ContractorTradeStep, ContractorDetailsStep, OnboardingScreen2/3/4, OnboardingRoleSelect — unchanged

## New permanent rule (added S179 to `tasks/lessons.md`)
Any onboarding screen that async-prefills from `user_metadata` MUST gate its primary CTA behind an `isPrefilling` boolean. Companion rule: every auth handler that writes to `user_metadata` must `await` ~300ms before allowing the auth state to propagate downstream. Only delay when there is data to write.
