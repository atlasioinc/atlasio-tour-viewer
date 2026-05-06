# Next Session Context
# Generated: S178 end-of-session — May 6, 2026
# Read by: Claude Chat at S179 session start for state reconcile

---

## Build state
- RPCs: 77 (unchanged S178)
- Hooks: 72 (unchanged S178)
- Edge Functions: 11
- tsc: 0 | Lint: 0 new (8 pre-existing warnings in unrelated files — same baseline as S177)
- Last build: Build 56 (in TestFlight — awaiting device QA before merge)
- S178 changes will appear in Build 57 (next EAS queue)

## Active branches
- `feat/atl-location-03-s175` @ af7c5c4 — S175 base + S177 modal fixes committed
- `feat/atl-bid-actions-01-s176` @ [S178 BidSubmission final commit] — S176 base + S177 invite/bid wiring + S177 notification mock cleanup + S178 BidSubmissionScreen audit fixes
- `feat/atl-auth-02-s178` @ [S178 ATL-AUTH-02 final commit] — branched from `feat/atl-bid-actions-01-s176` HEAD. Adds AuthStack + LoginScreen rebuild + SignUpScreen + ForgotPasswordScreen + Apple/Google native deps + app.json entitlements & plugins.

## QA items pending (Build 57 — device required)

### S177 carryover (still pending)
- [ ] InviteContractorsModal — Your Network shows contractor roles only (no partners)
- [ ] InviteContractorsModal — Near This Job rows show trade pill + distance
- [ ] Job Invites section on ContractorHomeTab — invite appears under Job Invites not New Jobs
- [ ] JobInviteCard visual treatment — 3px left bar, Invited badge, note block
- [ ] ContractorJobDetails — all 6 bid states render from live data (no mock)
- [x] Send invite → SuccessToast + job_invitations row — PASSED S177
- [x] Invite write — correct invited_by UUID + note — PASSED S177
- [ ] Accept bid → bids.status = accepted + jobs.status = in_progress
- [ ] Counter bid → bids table updated
- [ ] Reject bid → bids table updated
- [ ] BidSubmissionScreen onError — surface RPC error message (force a duplicate-bid attempt, confirm alert text reflects real error)

### S178 new (testable for the first time after Build 57)
- [ ] BidSubmissionScreen Edit Bid → tap "Edit Bid" on a job with an existing bid → timeline pill matching `bids.timeline` text is now pre-selected (was silently empty before S178)
- [ ] BidSubmissionScreen notes input → type past 500 characters → input hard-stops at 500 (counter no longer overflows)
- [ ] BidSubmissionScreen close (X) icon → tap dead-center, top, bottom, edges of the icon area → all 44×44 pixels of the touch target dispatch goBack (was 12px hitSlop before)
- [ ] Visual: header title centering — Fix 4 expanded the close Pressable to 44px wide while the right-side spacer at L229 stayed 20px. Confirm the title shift is acceptable on device; if not, raise the chore ticket sooner.

### S178 ATL-AUTH-02 new (testable on Build 57 — Apple/Google require native build to function)
- [ ] LoginScreen — ATLASIO wordmark renders with letterSpacing 7.2 + tagline "The network that gets the job done."
- [ ] LoginScreen — "Sign in with Apple" button visible on iOS (hidden on Android), launches Apple sheet, completes auth roundtrip → onAuthStateChange routes to onboarding/MainApp
- [ ] LoginScreen — "Continue with Google" custom button (white, hairline border, 4-color G logo) launches Google sheet, completes auth roundtrip
- [ ] LoginScreen — Email + password sign-in works against existing `tony@atlasioapp.com` / `contractor@atlasioapp.com` test accounts
- [ ] LoginScreen — "Forgot password?" link navigates to ForgotPasswordScreen
- [ ] LoginScreen — "Sign up" footer link navigates to SignUpScreen
- [ ] LoginScreen — "Sign in with email link instead" tertiary link still triggers the magic link flow (atlasio://login-callback deep link unchanged)
- [ ] SignUpScreen — submit disabled until all 5 fields valid; passwords-mismatch error shows inline; "Check your email" confirmation state appears on success; Supabase confirmation email arrives
- [ ] ForgotPasswordScreen — "Send Reset Link" sends email; sent state appears; reset email arrives at the entered address
- [ ] AuthStack — back chevrons on SignUp + ForgotPassword return to LoginScreen
- [ ] No crash on cold start when no session is cached — AuthStack mounts and shows LoginScreen
- [ ] Cosmetic: Apple + Google buttons feel like a matched pair (50pt height, 12pt radius, vertical rhythm)

## If QA passes — merge sequence
```
git checkout main
git merge feat/atl-location-03-s175
git merge feat/atl-bid-actions-01-s176
git push origin main
```

## S179 priorities (in order)
1. **Build 57** — queue new EAS build to pick up S177 cleanup + S178 fixes
2. **Device QA** — Build 57 — full QA checklist above (S177 carryover + S178 new)
3. **Merge to main** — after QA passes both branches
4. **`rpc_get_job_details` signed `photo_urls`** — verify on device; remove `DEMO_PHOTOS` fallback in `ContractorJobDetails` after
5. **S-INFRA-03 — Expo Push Notifications E2E** (critical launch blocker)
6. **ATL-LOCATION-04** — PhotoJobDetails + StagingJobDetails + InviteContractorsModal parity for photo/staging jobs
7. **REFACTOR-REPAIRJOBDETAILS-LOCAL-JOB-STATE** — S176 carryover
8. **`MOCK_FEE_TIER` / `FIRST_BID_SHOWN_KEY` schema work** — deferred from S178 (needs `profile.fee_tier` + `profile.bids_count` schema columns before swap)
9. **BidSubmissionScreen header centering polish** — chore from S178 (44px close button vs 20px spacer at L229; cosmetic)

## Open flags / known gaps
- `DEMO_PHOTOS` retained in ContractorJobDetails as photoSources fallback — `@demo TODO` to remove after `photo_urls` verified on device
- `useNotifications` / `useMarkNotificationsRead` / `useUnreadNotificationCount` — fully live as of S177 cleanup commit (no more mock fallback). Test for graceful error handling on device when Supabase unreachable.
- `BidSubmissionScreen` `onError` now surfaces real RPC errors (S177 cleanup)
- `BidSubmissionScreen` Edit Bid timeline prefill now actually works (S178 fix — was a silent bug)
- `useSubmitBid` now returns the new `bid_id` UUID — currently unused; available for future "navigate to bid" flows
- `component-inventory.md` created S177 — needs backfill for pre-S177 components in S179
- CHORE-CLAUDE-MD-SDK-AUDIT — CLAUDE.md says SDK 54/RN 0.81.5; actual SDK 55/RN 0.83.4

## SQL deployed S178
- None — S178 was code-only (no schema changes, no Edge Function deploys)

## Native module changes S178 (require Build 57 to test on device)
- `expo-apple-authentication` ~55.0.13 — installed
- `@react-native-google-signin/google-signin` ^16.1.2 — installed (v16 discriminated-union API)
- `app.json` plugins: added `expo-apple-authentication` + `@react-native-google-signin/google-signin` (with iOS reverse client ID `com.googleusercontent.apps.1083228224051-evac6li6a938mh2demlimmnb302e7slt`)
- `app.json` ios: added `usesAppleSignIn: true` + `entitlements.com.apple.developer.applesignin: ["Default"]`

## ATL-AUTH-02 follow-up (S179+)
- ResetPasswordScreen + `atlasio://reset-password` deep link handler in App.tsx (final password-set step after email link tap — out of scope ATL-AUTH-02)
- Move `GOOGLE_IOS_CLIENT_ID` from hardcoded constant in LoginScreen to EAS env var pre-launch
- Apple JWT secret in Supabase Apple provider expires ~November 6 2026 — calendar reminder needed
- `FEATURE_FLAGS.DEV_SHOW_PASSWORD_LOGIN` flag is now unreferenced — safe to delete from `lib/featureFlags.ts` (left in place per S178 plan agreement; sweep in a future cleanup session)

## Metrics to reconcile
RPCs: 77 | Hooks: 72 | Edge Functions: 11
(Claude Chat: cross-check these against Notion Live Build State v2 at S179 start)

## Notion pages to fetch at session start
- Start New Session: 328e6d90-cf26-8157-aa05-ead5f497d4ab
- Live Build State v2: 357e6d90-cf26-814c-ac6d-c6baa911fc2a
- Phase 1 Launch Readiness: 358e6d90-cf26-818b-a435-d1d9defe5ab0
- Backend Deployment Tracker — S177–S190: 358e6d90-cf26-810c-af25-ffd86aa2c4c1 (created S177; parent header link still pending)

## S178 change summary (for Notion sync)
- **Sprint board:** close `BidSubmissionScreen audit` (S178 priority #4)
- **Live Build State v2:** no metric changes (RPCs/Hooks/Edge Functions all unchanged)
- **Backend Deployment Tracker:** no SQL deployments this session
- **Phase 1 Launch Readiness:** BidSubmission Edit Bid path unblocked for QA
