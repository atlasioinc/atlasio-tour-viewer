Session 5 Summary — Fix Pre-existing Errors + Feature Flags + Hook-to-Screen Wiring

Branch: backend/session-5-fix-feature-flags-wiring
Commit: 44c278a
Prior commits: 3e28d51 (S4) → de6b1d0 (S3) → e0d3c8a (S2) → 37ff706 (S1)

---
Part 1: Fix Pre-existing tsc Errors (14 → 0)

| Error | File | Fix |
|-------|------|-----|
| Missing @tanstack/react-query types | package.json | npm install --save-dev @tanstack/react-query @supabase/supabase-js @react-native-async-storage/async-storage |
| lib/Supabase.ts casing mismatch | lib/supabase.ts | Two-step rename on macOS case-insensitive FS |
| COLORS.notifBadge not in COLORS type | ContractorHomeTab.tsx:1352 | Changed to COLORS.notificationRed |
| contactId not in ChatScreen params | InboxList.tsx:494 | Restored correct params matching InboxStack.tsx's local InboxStackParamList |

---
Part 2: Feature Flag System

New file: lib/featureFlags.ts
export const FEATURE_FLAGS = {
  USE_MOCK_DATA: true,  // true = mock data (demo), false = live Supabase
} as const;

---
Part 3: Hook-to-Screen Wiring (10 screens)

| Screen | Hook(s) Connected | Wiring Pattern | Mock Data Source |
|--------|-------------------|----------------|------------------|
| HomeTabAgent.tsx | useAgentJobs | Direct swap: activeJobs replaces ACTIVE_REPAIR_JOBS | RepairJobsData.ts |
| HomeTabAgentFilled.tsx | useAgentJobs | Direct swap: activeJobs replaces MOCK_REPAIR_JOBS | RepairJobsData.ts |
| NotificationsTab.tsx | useNotifications (aliased) | useEffect sync into local setNotifications state | Inline MOCK_NOTIFICATIONS |
| ProfileTab.tsx | useMyProfile | Ternary on specialties and languages arrays | Inline hardcoded arrays |
| VouchFeedSection.tsx | useVouchFeed(activeFilter) | Ternary in allVouches expression | Inline MOCK_VOUCH_FEED |
| FindTab.tsx | useFindPros(searchText, activeRole, selectedSort) | prosPool gated variable feeds into filter pipeline | Inline ALL_PROS |
| NetworkTab.tsx | useConnections, useConnectionRequests | Two useEffect syncs into setContacts and setConnectionRequests | Inline PARTNERS+CONTRACTORS |
| ChatScreen.tsx | None (no threadId in nav params yet) | Feature flag gates initial messages useState | Inline MOCK_MESSAGES |
| InboxList.tsx | useChatThreads | React.useEffect sync into setThreads | Inline INITIAL_THREADS |
| RepairJobDetails.tsx | useJob(jobId), useJobBids(jobId) | useEffect sync merges liveJob + liveBids into setJob state | route.params.job |
| SquadSlotPicker.tsx | useConnectedPros(role) | prosSource gated variable feeds into useMemo filter | Inline CONNECTED_PROS |

Pattern used across all screens:
- Hooks always run (keep TanStack cache warm for instant switch)
- FEATURE_FLAGS.USE_MOCK_DATA controls which data screens display
- Mock data preserved — never deleted
- Type assertions use as unknown as LocalType[] where hook return types differ from local component types

---
Schema Findings & Blockers (Session 5)

| Finding | Impact |
|---------|--------|
| InboxStack.tsx has its own InboxStackParamList (different from types/index.ts) | ChatScreen params are {contactName, contactCompany, contactRole, contactAvatarColor}, NOT {conversationId} |
| ChatScreen has no threadId in nav params | Cannot wire useMessages(threadId) yet — needs nav param refactor |
| Job.bids is Bid[] but RepairJobDetails expects BidWithProfile[] | Used as any cast for nav params |
| All screens use local interfaces (camelCase) vs types/index.ts (snake_case) | Used as unknown as LocalType[] for all hook-to-screen type bridges |

---
Session 6 — Diagnostic Audit + Type Adapters + ChatScreen threadId

Branch: backend/session-5-fix-feature-flags-wiring
Commits: 18fc665, 0fd6fb0

Key changes:
- Created lib/typeAdapters.ts — pure mapping functions (snake_case DB → camelCase UI)
  - adaptProfileToProCard, adaptProfileToNetworkContact, adaptJobToRepairJob,
    adaptBidToLocalBid, adaptNotification, adaptChatThread, adaptMessage
- Wired ChatScreen threadId: InboxStack nav params now pass threadId, ChatScreen
  consumes useMessages(threadId) with feature flag
- Wired FindTab sections: RECOMMENDED (top 5 by rating) and TRENDING (top 5 by vouches)
  now use adapted live data when USE_MOCK_DATA=false
- Fixed 4 diagnostic audit issues (session 7 commit backported)

---
Session 7/7B — Feature Flag Flip + Pre-Backend Polish Audit

Branch: backend/session-5-fix-feature-flags-wiring
Commits: 44c278a (flag flip)

Key changes:
- Flipped USE_MOCK_DATA from true → false (live Supabase data)
- Identified 6 pre-backend polish fixes needed:
  - Fix 1: Tags — self-selected vs derived tag system (done in Claude Chat)
  - Fix 2: Empty states — NetworkTab + InboxList need true empty states
  - Fix 3: Specialties pills on ProfileTab (already implemented)
  - Fix 4: ProProfile fetch by profileId from vouch feed
  - Fix 5: Move self-selected tags below bio in ProProfile
  - Fix 6: Replace stat badge with editable headline on pro cards

---
Session 9 — Fixes 2-6 (Pre-Backend Polish)

Branch: backend/session-5-fix-feature-flags-wiring
Commits: d024610, cf8868f, 2b7f46c

Fix 2 — Empty States (2b7f46c):
- NetworkTab.tsx: True empty state ("Your network is where deals happen" + Find Pros CTA)
  when contacts.length === 0 && searchText === ''; search empty state kept separate
- InboxList.tsx: True empty state ("Start a conversation" + New Message CTA) when
  threads.length === 0 && searchText === ''; search empty state ("No messages found") separate

Fix 3 — Specialties on ProfileTab: Already implemented, no work needed

Fix 4 — ProProfile fetches by profileId (d024610):
- HomeStack.tsx, FindStack.tsx, NetworkStack.tsx: ProProfile params changed to
  { profileId?: string; profile?: ProProfileData }
- proProfileHelpers.ts: Added mapProfileToProProfileData() — maps Profile & { performance_stats }
  to ProProfileData, handles avg_response_time → avg_response
- ProProfile.tsx: Dual-param extraction, useProfile() hook fetch on mount, loading spinner,
  falls back to passed profile or MOCK_PRO_PROFILE
- HomeTabAgent.tsx: Simplified vouch nav from ~20-line skeleton mapper to { profileId }

Fix 5 — Tags below bio (d024610):
- ProProfile.tsx: Moved self-selected tags from vouches section to below bio (centered),
  simplified vouches section to render only when recent_vouches.length > 0

Fix 6 — Headline replaces stat badge (cf8868f):
- FindTab.tsx: ProCard.stat → ProCard.headline (string | null), renamed all 16 mock entries,
  replaced lightning-icon stat badge with conditional italic headline text
- proProfileHelpers.ts: FindTabProCard.stat → headline, bio construction uses conditional
- useData.ts: Added headline: null to mock Profile (fixed pre-existing tsc error)
- EditProfileScreen.tsx: Added headline to FormData, mock data, form UI (60 char max)

Types changed in Session 9:
- ProCard.stat → ProCard.headline: string | null (FindTab local)
- FindTabProCard.stat → FindTabProCard.headline: string | null (proProfileHelpers)
- FormData gained headline: string (EditProfileScreen)
- ProProfile route params: { profile } → { profileId?; profile? } (3 stacks)

---
Session 10 — Live Data Flip + Hook Wiring

Branch: backend/session-10-live-data-flip
Commits: 6373667, 1ba3334, b9a91cb

## Recent Updates (Mar 2, 2026 — B-E Session 10)
- **sender_name fix** — useMessages now joins profiles via `.select('*, sender:profiles!sender_id(name, avatar_color)')` so chat messages display real sender names. useSendMessage reads sender_name from cached myProfile instead of hardcoding empty string.
- **useUpdateProfile created** — New mutation hook (hook #39) with Supabase `.update()` + cache set + invalidateQueries. Supports `Partial<Profile>` input for any profile field.
- **EditProfileScreen wired** — Pre-fills form from useMyProfile() via useEffect. Save handler calls useUpdateProfile.mutateAsync(). Save button shows loading state. Removed console.log.
- **ProfileTab live data** — Replaced hardcoded "John Doe", company, bio, stats with useMyProfile() data. Removed unused useState and local state variables.
- **All 8 type casts resolved** — 4 `as unknown as` fully eliminated (mock fallbacks fixed to full shapes, join results mapped through adapters). 4 reduced to single documented `as` (Supabase join alias limitation). Zero double casts remaining in useData.ts.
- **tsc: 0 errors** across all 3 rounds.

---
Session 11 — ProProfile CTAs + Data Quality Polish + Remaining Hooks

Branch: backend/session-11-proprofile-ctas-polish
Commits: cebce1d, e0d2d62, f66ad48, 7ad2fc9, 2c6072d

- **ProProfile conditional CTAs** — Created useConnectionStatus(profileId) returning 'self' | 'connected' | 'pending' | 'none'. ProProfile now shows Edit Profile (own), Message (connected), Request Pending (pending), Request to Connect (none). Edit Profile navigates to EditProfileScreen. Request to Connect wired to useSendConnectionRequest mutation.
- **ProProfile recent_vouches** — Created useProfileVouches(profileId) fetching vouches with author profile join. Replaces hardcoded [] in the Supabase path.
- **Recommended vs Trending differentiated** — useRecommendedPros sorts by rating desc; useTrendingPros sorts by vouch_count desc. Previously identical.
- **NotificationsTab mock flash fixed** — Init with [] instead of MOCK_NOTIFICATIONS. Added isLoading + ActivityIndicator.
- **InboxList avatar_colors wired** — useChatThreads now fetches thread_members → profiles for avatar_color per thread. is_unread kept as false (schema lacks last_read_at).
- **useChatRecipients created** — Queries both directions of accepted connections, maps to Recipient[] for NewMessage contact picker.
- **useCreateThread created** — Mutation creates thread + members + first message via 3 sequential inserts (no RPC available).
- **useProProfile deleted** — Dead code (threw "Not implemented", zero consumers). Superseded by useProfile + useConnectionStatus + useProfileVouches.

---
Cumulative Progress (Sessions 1-11)

- Session 1: Type alignment (types/index.ts ↔ schema.sql)
- Session 2: 11 T1 revenue-critical hooks wired
- Session 3: 16 T2 core-experience hooks wired
- Session 4: 9 remaining hooks wired — all 36 hooks now wired
- Session 5: 14 tsc errors fixed, feature flag system, all 10 screens connected to hooks
- Session 6: Type adapters (lib/typeAdapters.ts), ChatScreen threadId, FindTab sections wired
- Session 7/7B: Feature flag flipped to live, pre-backend polish audit (6 fixes identified)
- Session 9: Fixes 2-6 complete (empty states, ProProfile by ID, tags below bio, headline)
- Session 10: sender_name fix, useUpdateProfile created, EditProfileScreen wired, ProfileTab live data, all type casts resolved
- Session 11: ProProfile CTAs wired, Recommended/Trending differentiated, NotificationsTab flash fixed, InboxList avatar_colors, useChatRecipients + useCreateThread created, useProProfile deleted

---
Session 12 — Realtime Subscriptions + Phase 4 Prep

Branch: backend/session-12-realtime-phase4-prep
Commits: 1f79184, 2dda63c, 761d6dc, d6f9cc2, 9acc569

- **Schema additions** — Added `last_read_at TIMESTAMPTZ` to thread_members. Created `rpc_create_thread(p_recipient_id, p_first_message)` RPC — atomic thread creation (checks for existing thread, creates thread + members + first message in one call).
- **useCreateThread rewritten** — From 3 sequential inserts to single `rpc_create_thread` RPC call. Returns `{ success, thread_id, existing }`.
- **is_unread wired on InboxList** — useChatThreads now fetches last_read_at from thread_members join, computes `is_unread = last_message_at > last_read_at`.
- **useMarkThreadRead created** — Mutation updates thread_members.last_read_at to now(). ChatScreen calls on mount. Invalidates chat-threads cache.
- **hooks/useRealtime.ts created** — NEW FILE with 3 Supabase realtime subscription hooks:
  - `useRealtimeMessages(threadId)` — messages INSERT → invalidates messages + chat-threads
  - `useRealtimeNotifications(userId)` — notifications INSERT → invalidates notifications + unread-count
  - `useRealtimeBids(jobId)` — bids INSERT/UPDATE → invalidates bids for job
- **Realtime wired into 4 screens** — ChatScreen (messages), NotificationsTab (notifications), RepairJobDetails (bids), BottomTabNavigator (app-wide notifications)
- **4 Edge Function stubs scaffolded** — process-stripe-fee, create-job-thread, filter-phone-numbers, send-push-notification. All return 501. Logic for Session 13.
- **tsconfig.json** — Excluded supabase/functions/ (Deno runtime, not RN TypeScript)

---
Session 13 — Edge Function Logic + Infrastructure

Branch: backend/session-13-edge-functions-infra
Commits: f44b95c, bdfbdab, ebd6b78, 291d57b

- **4 edge functions implemented** (previously 501 stubs):
  - `process-stripe-fee` — Stripe PaymentIntent via fetch(), marks bid.fee_paid
  - `create-job-thread` — Webhook-triggered, creates thread + 2 members + system message on bid insert
  - `filter-phone-numbers` — Regex scrubs phone numbers from messages, replaces with `[phone number removed]`
  - `send-push-notification` — Expo push via fetch() to exp.host, reads push_tokens table
- **3 new edge functions scaffolded** (full logic):
  - `stripe-connect-onboarding` — Creates Stripe Connect Express account + returns onboarding URL
  - `send-vouch-prompts` — Cron: finds completed jobs >1hr ago with no vouch → inserts notification
  - `expire-bidding-windows` — Cron: jobs WHERE status='open' AND bid_deadline < now() → expires + notifies
- **Auth state management in App.tsx** — Added `authState: 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated'`. Uses `supabase.auth.onAuthStateChange` to route to LoginScreen, Onboarding, or MainApp.
- **LoginScreen.tsx created** — Email + magic link via `supabase.auth.signInWithOtp({ email })`
- **Storage bucket policies** — 5 buckets (avatars, job-photos, portfolio-photos, message-attachments, credentials) with 18 RLS policies in schema.sql

---
Session 14-15 — Edge Function Deployment + E2E Verification

Branch: backend/session-13-edge-functions-infra
Commits: ea238a9, 9b5e2d8, 2ec9966

- **DEPLOY_CHECKLIST.md** — Manual deployment steps for all 7 edge functions
- **Demo scaffolding cleanup** — Stripped from 3 screens, fixed file casing
- **E2E verification pass** — All 7 edge functions verified deployable

---
Session 16 — Phase 6 Trust & Verification (Part 1: Schema + Components)

Branch: backend/session-16-phase6-trust-verification
Commits: f9ddb9a, f8f09a0

- **Shared verification components** (components/shared/):
  - `DisplayTag` — Reusable pill with variants: primary, ghost, success, warning, danger
  - `VerificationBadge` — Shield icon with 4 levels (none/basic/verified/fully_verified)
  - `VerificationBanner` — Dismissable CTA banner ("Complete verification to unlock features")
- **VerificationScreen.tsx** — 3-section form: phone verification, license upload, insurance upload. Each section has its own completion state. Progress tracked via VerificationLevel type.
- **PhoneVerificationScreen.tsx** — OTP flow with 6-digit code input, auto-advance, resend timer
- **VerificationLevel type** — `'none' | 'basic' | 'verified' | 'fully_verified'` added to types/index.ts

---
Session 17 — Phase 6 Part 2 (Verification Badge + Banner Wiring)

Branch: backend/session-17-phase6-verification-wiring
Commits: 5ac7200

- **VerificationBadge wired to ProProfile** — Shows shield next to name, level from profile data
- **VerificationBadge wired to ProCard** — Small badge on FindTab/NetworkTab cards
- **VerificationBanner wired to HomeTabAgent** — Between header and ScrollView, navigates to Verification
- **VerificationBanner wired to ProfileTab** — Between header and ScrollView

---
Session 18 — Phase 6 Part 3 (Progressive Gating + Licensed & Insured)

Branch: backend/session-18-phase6-progressive-gating
Commits: f32628f

- **useVerificationGate hook** — Centralized gating: `{ level, isVerified, isFullyVerified, canPostJob, showBanner, isLoading }`
- **Hard gate on job posting** — Alert.alert blocks unverified users on all 3 paths (QuickActionsRow 3 handlers, HomeTabAgent, HomeTabAgentFilled). CTA navigates cross-stack via CommonActions.
- **Soft gates (VerificationBanner)** on 4 screens: NetworkTab, InboxList, RepairJobDetails, ProProfile (other's profile only)
- **Licensed & Insured chips on ProProfile** — Own profile: ghost tags for missing ("+ Add License"), success for present. Other profiles: combined "Licensed & Insured" or individual tags.
- **Connect nudge** — Info banner in RequestConnectModal when verifyLevel === 'none': "Verified profiles get 3x more connection accepts"

---
Session 22 — ContractorJobDetails + BidSubmissionScreen

Branch: backend/session-22-contractor-job-details
Commits: 326e262, 0f69150

- **ContractorJobDetails.tsx** (NEW) — Full push screen, 10 sections:
  - Trade/urgency row, budget card (COLORS.statBg), job description, details grid (address/distance/date/bids)
  - Agent card (tappable → ProProfile via CommonActions), your bid section (conditional), counter-offer comparison card (amber border, amount comparison with arrow)
  - 3 demo states (no bid, bid pending, countered) with pull-down toggle
  - Counter-offer inline actions: Accept/Counter/Decline with Alert confirmations
  - Sticky bottom CTA bar with conditional rendering per job/bid state
- **BidSubmissionScreen.tsx** (NEW) — fullScreenModal (slide_from_bottom):
  - Amount input with $ prefix, currency formatting, decimal-pad keyboard
  - 5 timeline pills (1 day, 2-3 days, 1 week, 2 weeks, flexible)
  - Notes textarea with 500 char count
  - Fee transparency receipt (bid amount, platform fee %, fee deduction, take-home)
  - Mock fee tier: launch_promo (0%)
  - Sticky submit bar with SafeAreaView edges={['bottom']}
  - Supports prefill params for edit/counter flows
- **ContractorJobDetail type** — Added to types/index.ts with nested `agent` + optional `myBid`
- **3 hook stubs** (all STATUS: mock):
  - `useContractorJobDetails(jobId)` — queryKey ['contractorJob', jobId]
  - `useSubmitBid()` — mutation { jobId, amount, timeline, notes }
  - `useRespondToCounter()` — mutation { bidId, action, newAmount? }
- **BottomTabNavigator expanded** — ContractorHomeStack: +ContractorJobDetails (push), +BidSubmission (fullScreenModal), +ProProfile (push)
- **ContractorInboxList token cleanup** — Removed 18 inline COLORS + 4 DIMENSIONS, imported from tokens.ts. Fixed pending_confirmation → pending_completion. THREAD_STATUS_MAP hex → token refs.

Session 23 — Complete Contractor Demo Loop
Branch: frontend/session-23-contractor-demo-loop
Commit: 97cd26d

- **ContractorHomeTab token cleanup** — Added SHADOWS to import, replaced 5 inline shadow objects → SHADOWS.card, STATUS_CHIP_MAP hex → token refs (COLORS.primary, COLORS.feeText, COLORS.counterAmber), urgent badge → COLORS.urgentBg/urgentText, fixed pending_confirmation → pending_completion (5 occurrences)
- **Card nav wiring** — ActiveJobCard wrapped in Pressable → ContractorJobDetails, JobInviteCard onAccept → ContractorJobDetails (view full job first), ActiveJobCard onMarkComplete → JobCompletion with userRole: 'contractor'
- **ContractorJobDetails CTA wiring** — "Mark Complete" → JobCompletion { jobId, userRole: 'contractor' }, "Start Work" → confirmation Alert with @backend annotation
- **ContractorInboxStack expansion** — ChatScreen route added to ContractorInboxStackNav, thread tap → ChatScreen (replaces RepairChat) with mapped params { threadId, contactName, contactRole: 'Agent', contactAvatarColor }
- **ATLASIO_CONTEXT.md** — Updated with Sessions 13-22

---
Session 24 — Contractor Jobs Tab (JobTracker Integration)
Branch: frontend/session-24-contractor-jobs-tab
Commit: 93b973d

- **JobTrackerTab rebuilt** — From 109-line placeholder to full pipeline list screen:
  - 9 mock jobs across 4 pipeline stages (2 invited, 2 bid_sent, 3 active, 2 completed)
  - 5 filter chips (All, Invited, Bid Sent, Active, Completed) with live counts, pill styling matching HomeTabAgent pattern
  - Job cards: trade pill, status chip (color-coded via STATUS_STYLE map), address+budget blue header (COLORS.statBg), agent avatar+name, due date, time label
  - FlatList with empty state per filter, navigation to ContractorJobDetails on card tap
  - All design tokens from lib/tokens.ts (COLORS, TYPOGRAPHY, DIMENSIONS, SHADOWS)
- **ContractorJobsStack** — New stack navigator with 4 routes: ContractorJobsMain (JobTrackerTab), ContractorJobDetails, BidSubmission (fullScreenModal), JobCompletion (fullScreenModal)
- **Conditional tab visibility** — Agent: Home|Find|Network|Inbox|Profile (5 tabs). Contractor: Home|Jobs|Inbox (3 tabs)
- **Clipboard tab icon** — Inline SVG JobsIcon matching existing tab icon style
- **JobCompletion route** — Added to ContractorHomeStack (was missing, needed by ContractorJobDetails "Mark Complete" CTA)

---
Session 25 — Contractor Onboarding Redesign + Profile Polish
Branch: frontend/session-25-onboarding-redesign
Commit: ea62a1b

- **Onboarding redesigned from linear to role-branching flow:**
  - `OnboardingRoleSelect.tsx` (NEW) — Step 2/5, 3 role cards (Agent/Contractor/Partner) with haptic feedback, replaces OnboardingScreen2 in nav stack
  - `ContractorProfileBasics.tsx` (NEW) — Step 3/6, full name (required) + business name (optional)
  - `ContractorTradeStep.tsx` (NEW) — Step 4/6, chip grid with all 22 trades from schema.sql (exact display-name values), two-phase selection (primary filled + up to 2 secondary outlined)
  - `ContractorDetailsStep.tsx` (NEW) — Step 5/6, service area radius pills (10/25/50 mi) + license/insurance toggles + social proof text
- **OnboardingFormData accumulates through route params** — All form data passes forward via `{ formData: OnboardingFormData }` params, no data loss between screens
- **OnboardingScreen3.tsx simplified** — Removed role dropdown + ROLE_OPTIONS + CONTRACTOR_OPTIONS. Sub-role dropdown now partner-only. Receives formData from OnboardingRoleSelect.
- **OnboardingScreen4.tsx updated** — Receives/passes formData instead of `{ role: string }`
- **OnboardingComplete.tsx** — Dynamic progress bar (6/6 contractor, 5/5 agent/partner), logs full `rpc_complete_onboarding` payload
- **App.tsx** — 4 new routes registered, Onboarding2 route retired (file preserved), RootStackParamList updated with OnboardingFormData
- **ProfileTab.tsx** — Role-conditional stats: contractor shows Jobs Overview (completed, rating, on-time rate, response time) + Earnings (private); agent/partner shows existing Repair Jobs + Top Partners
- **OnboardingScreen2.tsx preserved** — File kept, just not in nav stack

Onboarding paths:
- Contractor: Splash → RoleSelect → ProfileBasics → TradeStep → DetailsStep → Complete (6 steps)
- Agent/Partner: Splash → RoleSelect → Screen3 (profile form) → Screen4 (credentials) → Complete (5 steps)

---
Session 26 — Wire Onboarding to Live Backend (Single-Value Principle)
Branch: frontend/session-25-onboarding-redesign
(no commit yet — pending user approval)

**Architecture: Single-Value Principle**
`formData.role` is ALWAYS a backend `user_role` enum value from the moment of selection. No intermediate values, no translation layers (ROLE_MAP/SUB_ROLE_MAP eliminated).

- **OnboardingRoleSelect.tsx** — Role card values changed: `'real_estate_agent'` → `'Agent'`, `'contractor'` → `'Contractor'`, `'partner'` → `''` (empty — sub-role picker sets final value). Added single-value principle comment block.
- **OnboardingScreen3.tsx** — PARTNER_OPTIONS values changed from snake_case (`mortgage_lender`) to backend enum values (`Mortgage Pro`, `Title/Escrow`, `Home Inspector`, `Appraiser`, `Attorney`, `Real Estate Photographer`, `Home Stager`, `Other`). Sub-role selection writes directly to `formData.role`. `needsSubRole` check changed to `!formData.role`.
- **OnboardingComplete.tsx** — Deleted ROLE_MAP, SUB_ROLE_MAP, getBackendRole. Added `getOnboardingPath()` helper (UI routing concern: maps any backend role to `'agent'|'contractor'|'partner'` for display). ROLE_CONTENT rekeyed from `real_estate_agent`/`partner`/`contractor` to `agent`/`partner`/`contractor`. RPC call uses `formData.role` directly — no mapping.
- **hooks/useData.ts** — `useCompleteOnboarding` mutation hook created (STATUS: wired with mock fallback). Calls `rpc_complete_onboarding` with `p_display_role`, `p_full_name`, `p_company_name`, `p_primary_trade`, `p_secondary_trades`, `p_location`. Invalidates myProfile on success.
- **lib/featureFlags.ts** — Added `LIVE_ONBOARDING: false` (flip to true when RPC is deployed and ready).
- **App.tsx** — Default userRole changed from `'real_estate_agent'` to `'Agent'`.
- **subRole eliminated** — Removed from OnboardingFormData type in all 8 files (OnboardingRoleSelect, Screen3, Screen4, ContractorProfileBasics, ContractorTradeStep, ContractorDetailsStep, OnboardingComplete, App.tsx).

Auth state machine verified: App.tsx checks `profile.display_role` → `rpc_complete_onboarding` sets `display_role` → post-onboarding routing works for both immediate navigation and app restart.

Key helper:
```typescript
const getOnboardingPath = (role: string): 'agent' | 'contractor' | 'partner' => {
  if (['Contractor'].includes(role)) return 'contractor';
  if (['Mortgage Pro','Title/Escrow','Home Inspector','Appraiser',
       'Transaction Coordinator','Warranty','Attorney','Home Stager',
       'Real Estate Photographer'].includes(role)) return 'partner';
  return 'agent';
};
```

---
Cumulative Progress (Sessions 1-26)

- Session 1: Type alignment (types/index.ts ↔ schema.sql)
- Session 2: 11 T1 revenue-critical hooks wired
- Session 3: 16 T2 core-experience hooks wired
- Session 4: 9 remaining hooks wired — all 36 hooks now wired
- Session 5: 14 tsc errors fixed, feature flag system, all 10 screens connected to hooks
- Session 6: Type adapters (lib/typeAdapters.ts), ChatScreen threadId, FindTab sections wired
- Session 7/7B: Feature flag flipped to live, pre-backend polish audit (6 fixes identified)
- Session 9: Fixes 2-6 complete (empty states, ProProfile by ID, tags below bio, headline)
- Session 10: sender_name fix, useUpdateProfile created, EditProfileScreen wired, ProfileTab live data, all type casts resolved
- Session 11: ProProfile CTAs wired, Recommended/Trending differentiated, NotificationsTab flash fixed, InboxList avatar_colors, useChatRecipients + useCreateThread created, useProProfile deleted
- Session 12: Realtime subscriptions (3 hooks), is_unread + useMarkThreadRead, rpc_create_thread, 4 edge function stubs
- Session 13: 7 edge functions (4 implemented + 3 new), auth state management, LoginScreen, storage policies
- Session 14-15: Edge function deployment prep, E2E verification, demo cleanup
- Session 16: Phase 6 verification components (DisplayTag, VerificationBadge, VerificationBanner, VerificationScreen, PhoneVerificationScreen)
- Session 17: Badge wired to ProProfile/ProCard, banner wired to HomeTabAgent/ProfileTab
- Session 18: Progressive gating (hard gate on job posting, soft banners on 4 screens, Licensed & Insured chips, connect nudge)
- Session 22: ContractorJobDetails + BidSubmissionScreen (2 new screens), 3 hook stubs, ContractorInboxList token cleanup
- Session 23: Contractor demo loop closed — card nav, inbox chat, job completion CTA wiring, token cleanup
- Session 24: JobTrackerTab rebuilt (pipeline list + filter chips), ContractorJobsStack, conditional tabs (agent 5 / contractor 3)
- Session 25: Onboarding redesigned (role-branching flow, 4 new contractor screens, formData accumulation), ProfileTab contractor stats
- Session 26: Onboarding wired to backend (single-value principle, useCompleteOnboarding hook, LIVE_ONBOARDING flag, subRole eliminated, ROLE_MAP eliminated)

49 hooks total (46 wired + 3 mock stubs). 7 edge functions. 3 realtime subscriptions. 0 type casts. 0 tsc errors.

Contractor screens: 5 (ContractorHomeTab, ContractorJobDetails, ContractorInboxList, BidSubmissionScreen, JobTrackerTab) + 3 shared (ChatScreen, ProProfile, JobCompletionScreen)
Onboarding screens: 9 total (Screen1, RoleSelect, Screen3, Screen4, Complete, ContractorProfileBasics, ContractorTradeStep, ContractorDetailsStep, Screen2 retired)

tsc status: 0 errors

---
Session 27 — Codebase Documentation Pass Part 1 (Infrastructure + Revenue)
Branch: frontend/session-25-onboarding-redesign
Commit: f25f858 (combined with S28)

- **16 infrastructure + revenue files documented** with 7 handoff rules:
  1. Enhanced file headers with line counts
  2. @backend markers on every Supabase call/RPC
  3. @demo markers on mock data, setTimeout, console.log stubs, feature flag gates
  4. Section dividers (═══ major, ─── minor)
  5. Sections catalog in header
  6. Flow context (navigation paths, receives/passes)
  7. Role branching comments
- Files covered: tokens.ts, featureFlags.ts, supabase.ts, typeAdapters.ts, proProfileHelpers.ts, useData.ts (49 hooks), useDebounce.ts, useRealtime.ts, types/index.ts, schema.sql (reference only), RepairJobDetails.tsx, PostJobWizard.tsx, PostPhotoJobScreen.tsx, PostStagingJobScreen.tsx, JobCompletionScreen.tsx, EditRepairJob.tsx

---
Session 28 — Codebase Documentation Pass Part 2 (All Remaining Files)
Branch: frontend/session-25-onboarding-redesign
Commit: f25f858 (combined with S27)

- **54 remaining files documented** across 5 batches:
  - Batch 1: Contractor screens (5) — ContractorHomeTab, ContractorJobDetails, JobTrackerTab, BidSubmissionScreen, ContractorInboxList
  - Batch 2: Contractor onboarding (6) — OnboardingScreen1, OnboardingRoleSelect, OnboardingScreen3, ContractorProfileBasics, ContractorTradeStep, ContractorDetailsStep
  - Batch 3: Agent core screens (5) — HomeTabAgent, HomeTabAgentFilled, FindTab, NetworkTab, ProfileTab
  - Batch 4: Messaging + shared (6) — InboxList, ChatScreen, RepairChatScreen, DealChatScreen, NewMessageScreen, MessageBubble
  - Batch 5: Remaining 38 files — screens, data, shared components, nav stacks, shared/
- **73 files total changed** (S27+S28): 750 insertions, 251 deletions — zero logic changes
- All files now have: line counts in headers, @demo/@backend markers where applicable, section dividers, flow context
- Fixed HomeTabAgentFilled.tsx incorrect self-reference (said HomeTabAgent.tsx in its own header)

---
Cumulative Progress (Sessions 1-28)

- Session 1: Type alignment (types/index.ts ↔ schema.sql)
- Session 2: 11 T1 revenue-critical hooks wired
- Session 3: 16 T2 core-experience hooks wired
- Session 4: 9 remaining hooks wired — all 36 hooks now wired
- Session 5: 14 tsc errors fixed, feature flag system, all 10 screens connected to hooks
- Session 6: Type adapters (lib/typeAdapters.ts), ChatScreen threadId, FindTab sections wired
- Session 7/7B: Feature flag flipped to live, pre-backend polish audit (6 fixes identified)
- Session 9: Fixes 2-6 complete (empty states, ProProfile by ID, tags below bio, headline)
- Session 10: sender_name fix, useUpdateProfile created, EditProfileScreen wired, ProfileTab live data, all type casts resolved
- Session 11: ProProfile CTAs wired, Recommended/Trending differentiated, NotificationsTab flash fixed, InboxList avatar_colors, useChatRecipients + useCreateThread created, useProProfile deleted
- Session 12: Realtime subscriptions (3 hooks), is_unread + useMarkThreadRead, rpc_create_thread, 4 edge function stubs
- Session 13: 7 edge functions (4 implemented + 3 new), auth state management, LoginScreen, storage policies
- Session 14-15: Edge function deployment prep, E2E verification, demo cleanup
- Session 16: Phase 6 verification components (DisplayTag, VerificationBadge, VerificationBanner, VerificationScreen, PhoneVerificationScreen)
- Session 17: Badge wired to ProProfile/ProCard, banner wired to HomeTabAgent/ProfileTab
- Session 18: Progressive gating (hard gate on job posting, soft banners on 4 screens, Licensed & Insured chips, connect nudge)
- Session 22: ContractorJobDetails + BidSubmissionScreen (2 new screens), 3 hook stubs, ContractorInboxList token cleanup
- Session 23: Contractor demo loop closed — card nav, inbox chat, job completion CTA wiring, token cleanup
- Session 24: JobTrackerTab rebuilt (pipeline list + filter chips), ContractorJobsStack, conditional tabs (agent 5 / contractor 3)
- Session 25: Onboarding redesigned (role-branching flow, 4 new contractor screens, formData accumulation), ProfileTab contractor stats
- Session 26: Onboarding wired to backend (single-value principle, useCompleteOnboarding hook, LIVE_ONBOARDING flag, subRole eliminated, ROLE_MAP eliminated)
- Session 27: Codebase documentation pass Part 1 — 16 infrastructure + revenue files (tokens, hooks, types, job screens)
- Session 28: Codebase documentation pass Part 2 — 54 remaining files (all screens, components, nav stacks)

49 hooks total (46 wired + 3 mock stubs). 7 edge functions. 3 realtime subscriptions. 0 type casts. 0 tsc errors.
73 files documented with @demo/@backend markers, line counts, section dividers, flow context.

Contractor screens: 5 (ContractorHomeTab, ContractorJobDetails, ContractorInboxList, BidSubmissionScreen, JobTrackerTab) + 3 shared (ChatScreen, ProProfile, JobCompletionScreen)
Onboarding screens: 9 total (Screen1, RoleSelect, Screen3, Screen4, Complete, ContractorProfileBasics, ContractorTradeStep, ContractorDetailsStep, Screen2 retired)

tsc status: 0 errors

---
Session 30 — Wire 7 Contractor RPCs + Dev Auth Bypass
Branch: frontend/session-25-onboarding-redesign
Commit: 5d72db9

- **7 contractor RPC hooks wired** (all STATUS: wired with mock fallback):
  - `useContractorJobDetails(jobId)` — rpc_get_contractor_job_details
  - `useSubmitBid()` — rpc_submit_bid mutation
  - `useRespondToCounter()` — rpc_respond_to_counter mutation
  - `useContractorActiveJobs()` — rpc_get_contractor_active_jobs
  - `useJobInvitations()` — rpc_get_job_invitations
  - `useMatchingJobs()` — rpc_get_matching_jobs
  - `useContractorEarnings()` — rpc_get_contractor_earnings
- **DEV_BYPASS_AUTH** — `const DEV_BYPASS_AUTH = __DEV__ && true` in App.tsx, skips auth for device testing
- **LIVE_CONTRACTOR_HOOKS flag** — Added to featureFlags.ts (currently false)

---
Session 31 — UX Polish Batch (fullScreenModal + CTA + FindTab + ProCard)
Branch: frontend/session-25-onboarding-redesign
Commits: 6cd0366, 5ad6f07, 5dc79dd, fc70f1b, 83102e4

**fullScreenModal conversions (5 screens):**
- ContractorJobDetails, RepairJobDetails, EditRepairJob, NewMessageScreen, CreateDealChat
- Presentation: `fullScreenModal` + `slide_from_bottom` — slides over tab bar entirely
- Safe area pattern: `paddingTop: 8 + insets.top` on headers, `paddingBottom: Math.max(insets.bottom, 24)` on CTAs
- Eliminates tab bar snap/layout issues — no more `hideOnScreens` complexity

**CTA safe area fixes:**
- ContractorJobDetails: `position: 'absolute'` CTA bar, countered action buttons (Accept/Counter/Decline) moved to sticky bottom bar
- BidSubmissionScreen: X button behind Dynamic Island fixed, CTA bottom padding
- EditRepairJob: Delete Job CTA made position:absolute

**Tab bar simplification:**
- BottomTabNavigator: hideOnScreens reduced to `['SendSquad']` only (Home tab)
- Jobs tab: entire hideOnScreens conditional removed
- Remaining hideOnScreens uses instant hide: `{ display: 'none', height: 0, overflow: 'hidden' }`

**App.tsx startup fix:**
- DEV_BYPASS_AUTH check moved before loading state check — instant startup without waiting for Supabase auth

**FindTab flash fix:**
- `USE_MOCK_DATA` flipped back to `true` — eliminates frame-1 flash from async hook resolution
- `activeFilters` useEffect: early return when filters already empty, prevents unnecessary re-render on mount

**ProCard polish (FindTab.tsx):**
- Trade/role pill: `COLORS.tagBg` bg + `COLORS.primary` text, `borderRadius: 9999`
- Headline: light blue container (tagBg) with LightningIcon, moved above tags
- Tags: cap at 2 visible + "+N" overflow pill, `flexShrink` for compression, `overflow: hidden`
- Updated all 16 ALL_PROS headlines with benefit-focused taglines

**"Licensed & Insured" removed from contractor self-select tags:**
- tagEnums.ts: `LICENSED_INSURED` removed from `CONTRACTOR_TAGS`
- FindTab.tsx: removed from all 6 contractor mock data entries, replaced with behavioral tags
- Filter panel `licensed_insured` toggle kept — annotated as agent-facing search filter wired to `verification_level`

**Other fixes:**
- ChatScreen: trash icon + delete confirmation dialog in header
- Remove "Share Job" from ContractorJobDetails 3-dot menu
- ProfileTab soft nudge + AsyncStorage safe wrapper
- HomeStack/InboxStack: fullScreenModal presentation options registered

---
Session 31 (continued) — Headline Pill + Profile IA Polish
Branch: frontend/session-25-onboarding-redesign
Commit: 87afdf5

**Headline feature (cross-surface):**
- `Profile.headline: string | null` added to types/index.ts (@backend add to profiles table)
- `ProProfileData.headline: string | null` added to ProProfile.tsx interface
- All 3 mapper functions in proProfileHelpers.ts pass headline through
- Mock fallbacks in useData.ts include `headline: null`
- EditProfileScreen: headline maxLength 60→35, added helperText

**ProProfile.tsx IA overhaul:**
- Bio replaced by full-width headline pill (LightningStatIcon + COLORS.tagBg, font 14, flex: 1)
- Credential row (trade/license/distance) moved ABOVE social proof row (rating/vouches)
- "Active Since" removed from display (data retained in interface + mock)
- Self-selected tag pills → outlined style (transparent bg, 1px COLORS.border, #364153 text, font 13)

**ProfileTab.tsx IA update:**
- "Active Since" pill removed from stats row (data retained)
- Bio replaced by headline pill (inline lightning SVG 13x13, full width, COLORS.tagBg)
- Mock headline: 'Top listing agent, luxury market'
- Specialty/language tag pills → outlined style (transparent bg, 1px COLORS.border, #364153 text)

**FindTab.tsx headline polish:**
- Headline pill: removed alignSelf flex-start (full width), font 12→14, lineHeight 16→20, added flex: 1

**Design rules established (S31):**
- Outlined pill = self-described attribute (transparent bg, gray border, gray text)
- Filled pill = verified credential (system-confirmed)
- Headline pill = full width, COLORS.tagBg, lightning icon, font 14/500, COLORS.primary
- "Active Since" permanently removed from all profile surfaces
- Headline max: 35 chars

---
Session 32 — Closing Squad UX + Verification Banner + Header Fixes
Branch: frontend/session-25-onboarding-redesign
Commit: 49c9246

**Closing Squad (HomeTabAgent):**
- `isAdditionalRole` prop passed to SquadSlotPicker — "Remove role" button now shows on empty additional slots
- Filled squad cards: first name + role label (stacked View, font 12/500 name + font 11/400 role)

**Verification banner (3 screens):**
- Moved from outside ScrollView to first child inside ScrollView on HomeTabAgent, NetworkTab, InboxList
- Root cause: SafeAreaView white bg bled through wrapper — moving inside ScrollView (screenBg) eliminates it

**RepairJobDetails header:**
- Replaced absolute-positioned title View with 3-column flex row: `[back w:36] [title flex:1 center] [right w:36]`
- `paddingHorizontal: 8` (symmetric), no absolute positioning

**Header audit:** All 68 .tsx files checked — broken pattern was unique to RepairJobDetails

---
Session 33 — ContractorJobDetails Redesign
Branch: frontend/session-25-onboarding-redesign

**tokens.ts changes:**
- `TYPOGRAPHY.displayM.fontWeight`: `'700'` → `'600'`
- Added: `inRangeGreen` (#008236), `budgetLabelText` (#DBEAFE), `budgetSeparator` (#BEDBFF)

**ContractorJobDetails.tsx (major redesign):**
- Budget card: statBg → solid accentBlue fill, white displayM amounts, "Agent's Budget" eyebrow, budgetSeparator dash
- Bid cards moved directly after budget card (visual pair with matching eyebrow labels inside cards)
- Pending bid card: accentBlue border, displayM amount, "In range" indicator (CheckCircleIcon + inRangeGreen), "Pending" filled badge
- Counter-offer card: counterAmber border, displayM amount, "Countered" filled badge (no border), inline "Agent's counter: $380" row
- Job photos strip: NEW — 3 placeholder camera tiles (112x88), horizontal scroll, edge-to-edge via negative margin
- Photo lightbox: NEW — full-screen paginated viewer with "1/3" counter, ✕ close, swipe navigation
- Bid count: conditional (1–3 only, hidden at 0 and 4+), green "Only X bids so far"
- Header title: COLORS.primary → COLORS.darkText
- Notes text unified: fontSize 13, COLORS.bodyText, lineHeight 18 across both cards
- New SVG icons: CheckCircleIcon, CameraIcon
- renderStickyCTA() untouched — all Decline/Counter/Accept logic preserved

**Design rules established (S32–33):**
- Verification banner must live inside ScrollView
- Header: 3-column flex row, never absolute-position the title
- Budget/Bid card pair: matching eyebrow labels inside cards, no external section headings
- Status pills: filled background only, no border
- Bid count: 1–3 visible (urgency signal), 0 and 4+ hidden
- Notes text: fontSize 13, COLORS.bodyText, lineHeight 18 — unified across all card types

---
Session 34 — Invite Card Cleanup + Message Button on Agent Card

Branch: frontend/session-25-onboarding-redesign (continued)
Commit: ff67ca8

Files modified (3):
- components/ContractorHomeTab.tsx — JobInviteCard simplified: removed button row (Decline/Accept & Bid/Chat), entire card is now a single tappable Pressable with onPress prop (navigates to ContractorJobDetails). Removed onAccept, onDecline, onChat, hasBid props. Feed render block simplified from 5 props to 2.
- components/ContractorJobDetails.tsx — Added icon-only MessageIcon (20x20 SVG) on Agent Card, replacing ChatBubbleIcon + "Message" label. 40x40 tappable area with red unread dot support (hasUnreadAgentMessages). Navigates to ChatScreen as fullscreen modal within same stack.
- components/BottomTabNavigator.tsx — Added ChatScreen route to ContractorHomeStack and ContractorJobsStack as fullscreen modal presentation. Enables Message button navigation without cross-stack routing.

Design rules established:
- Invite cards: No inline CTAs — card tap navigates to detail screen, actions live on detail screen
- Message buttons: Icon-only pattern (no label) with red notification dot for unread state, matching agent-side BidCard pattern
- Chat navigation: ChatScreen registered as fullscreen modal in each stack (not cross-stack to Inbox)

---
Session 35 — Contractor Home Tab Horizontal Scroll Redesign

Branch: frontend/session-25-onboarding-redesign (continued)
Commit: a5fd252

Files modified (1):
- components/ContractorHomeTab.tsx — Complete redesign from unified vertical feed to sectioned triage dashboard. Replaced sticky header (location/Atlasio/bell), filter pills, and unified card feed with greeting header + 3 horizontal/vertical sections.

New layout:
- Greeting header: time-based message ("Good morning") + quick stats row (jobs in progress, pending invites, earnings)
- Section 1 — Job Invites: horizontal FlatList, 320px cards with trade pill, title, address, budget label + price, calendar icon + due date, agent info (avatar + name + star rating), optional agent comment
- Section 2 — New Jobs: horizontal FlatList, 320px cards with trade pill, title, address, budget label + price, calendar icon + due date (no agent info)
- Section 3 — Active Work: vertical stack with progress bars + agent info
- Pull-to-refresh on outer ScrollView
- Earnings Summary + Market Pulse sections preserved from previous build

Card architecture (S35):
- Cards hug content naturally (no fixed height) — padding: 16 directly on Pressable, no inner View wrapper
- Spacing rhythm: 4px for grouped pairs (trade→title, title→address, budget label→price), 12px for non-grouped elements
- Budget label above price range (both card types)
- Due date on dedicated row with CalendarIcon SVG (16px, COLORS.secondaryText)
- Star rating: StarIcon before number with 4px gap (matches iOS convention)
- JobInviteCard agent comment: quoteBg background, blue left border, single line with ellipsis, paddingVertical 6

Types added:
- JobInvite.title (string) — was missing, now matches MatchingJob pattern
- ActiveJob.agentRating (number), ActiveJob.agentCompany (string) — for agent info on progress cards
- MatchingJob.title (string), MatchingJob.postedTime (string) — for horizontal browse cards

Components changed:
- ActiveJobCard → ActiveWorkCard (progress bar + agent info row)
- MatchingJobCard → NewJobCard (320px horizontal scroll card)
- JobInviteCard restructured (trade pill, title, address, budget, due date, agent, comment)
- CalendarIcon SVG re-added (was removed then restored)
- Removed: old sticky header, filter pills, unified feed render block, CardButton/DisplayTagRow/StatPill imports

Mock data updated:
- MOCK_INVITATIONS: added title field to all 4 items
- MOCK_ACTIVE_JOBS: added agentRating, agentCompany
- MOCK_MATCHING_JOBS: added title, postedTime

Deferred:
- @backend TODO: Wire invite.note to ContractorJobDetails screen
- Jobs tab filter param support from "See All" links

---
Cumulative Progress (Sessions 1-35)

- Session 1: Type alignment (types/index.ts ↔ schema.sql)
- Session 2: 11 T1 revenue-critical hooks wired
- Session 3: 16 T2 core-experience hooks wired
- Session 4: 9 remaining hooks wired — all 36 hooks now wired
- Session 5: 14 tsc errors fixed, feature flag system, all 10 screens connected to hooks
- Session 6: Type adapters (lib/typeAdapters.ts), ChatScreen threadId, FindTab sections wired
- Session 7/7B: Feature flag flipped to live, pre-backend polish audit (6 fixes identified)
- Session 9: Fixes 2-6 complete (empty states, ProProfile by ID, tags below bio, headline)
- Session 10: sender_name fix, useUpdateProfile created, EditProfileScreen wired, ProfileTab live data, all type casts resolved
- Session 11: ProProfile CTAs wired, Recommended/Trending differentiated, NotificationsTab flash fixed, InboxList avatar_colors, useChatRecipients + useCreateThread created, useProProfile deleted
- Session 12: Realtime subscriptions (3 hooks), is_unread + useMarkThreadRead, rpc_create_thread, 4 edge function stubs
- Session 13: 7 edge functions (4 implemented + 3 new), auth state management, LoginScreen, storage policies
- Session 14-15: Edge function deployment prep, E2E verification, demo cleanup
- Session 16: Phase 6 verification components (DisplayTag, VerificationBadge, VerificationBanner, VerificationScreen, PhoneVerificationScreen)
- Session 17: Badge wired to ProProfile/ProCard, banner wired to HomeTabAgent/ProfileTab
- Session 18: Progressive gating (hard gate on job posting, soft banners on 4 screens, Licensed & Insured chips, connect nudge)
- Session 22: ContractorJobDetails + BidSubmissionScreen (2 new screens), 3 hook stubs, ContractorInboxList token cleanup
- Session 23: Contractor demo loop closed — card nav, inbox chat, job completion CTA wiring, token cleanup
- Session 24: JobTrackerTab rebuilt (pipeline list + filter chips), ContractorJobsStack, conditional tabs (agent 5 / contractor 3)
- Session 25: Onboarding redesigned (role-branching flow, 4 new contractor screens, formData accumulation), ProfileTab contractor stats
- Session 26: Onboarding wired to backend (single-value principle, useCompleteOnboarding hook, LIVE_ONBOARDING flag, subRole eliminated, ROLE_MAP eliminated)
- Session 27: Codebase documentation pass Part 1 — 16 infrastructure + revenue files (tokens, hooks, types, job screens)
- Session 28: Codebase documentation pass Part 2 — 54 remaining files (all screens, components, nav stacks)
- Session 30: 7 contractor RPC hooks wired, DEV_BYPASS_AUTH, LIVE_CONTRACTOR_HOOKS flag
- Session 31: UX polish batch — fullScreenModal conversions, CTA safe area, FindTab flash, ProCard polish, tag removal, headline pill + profile IA overhaul
- Session 32: Squad UX (isAdditionalRole + role labels), verification banner inside ScrollView (3 screens), RepairJobDetails 3-col flex header, full header audit (68 files, 0 additional fixes)
- Session 33: ContractorJobDetails redesign — accentBlue budget card, bid cards (pending/countered) with eyebrow labels, job photos strip + lightbox, conditional bid count, tokens.ts displayM 600 + 3 new colors
- Session 34: Invite card cleanup (JobInviteCard → single tappable card, no button row), Message button on Agent Card (icon-only + red unread dot), ChatScreen fullscreen modal in contractor stacks
- Session 35: Contractor Home Tab horizontal scroll redesign — 3-section triage dashboard (Job Invites horizontal, New Jobs horizontal, Active Work vertical), greeting header, pull-to-refresh, 320px cards with budget labels + calendar due dates, natural card heights

49 hooks total (46 wired + 3 mock stubs) + 7 contractor RPC hooks. 7 edge functions. 3 realtime subscriptions. 0 tsc errors.
73 files documented with @demo/@backend markers, line counts, section dividers, flow context.
Feature flags: USE_MOCK_DATA=true, LIVE_ONBOARDING=false, LIVE_CONTRACTOR_HOOKS=false, DEV_BYPASS_AUTH=true.

Contractor screens: 5 (ContractorHomeTab, ContractorJobDetails, ContractorInboxList, BidSubmissionScreen, JobTrackerTab) + 3 shared (ChatScreen, ProProfile, JobCompletionScreen)
Onboarding screens: 9 total (Screen1, RoleSelect, Screen3, Screen4, Complete, ContractorProfileBasics, ContractorTradeStep, ContractorDetailsStep, Screen2 retired)
Nav stacks: ChatScreen now registered as fullscreen modal in ContractorHomeStack + ContractorJobsStack (in addition to ContractorInboxStack)

---
Session 45 — InsuranceUploadScreen

Branch: frontend/session-25-onboarding-redesign

New screen: InsuranceUploadScreen.tsx (components/)
- Contractor COI upload flow: info card → upload zone → expiry inputs → what's next → sticky submit CTA
- Success state: center-aligned shield icon + "Submitted for Review" + Back to Profile button
- 4 sections: info card (backgroundInfo + blue left border), dashed upload zone (mock file toggle), MM/YYYY expiry inputs, what happens next card
- Reuses: ScreenHeader, PrimaryButton from shared components
- All @demo/@backend markers in place
- @backend: rpc_upload_insurance_document (params: document_url, expiry_month, expiry_year)
- @backend: expo-document-picker → Supabase credentials bucket

Route registration: ProfileStack.tsx
- Added InsuranceUpload to ProfileStackParamList
- Registered as fullScreenModal + slide_from_bottom (same pattern as Verification, PhoneVerification)

ProfileTab.tsx Z3 insurance row updates:
- MOCK_CONTRACTOR_PROFILE: added insurance_status='approved', insurance_expiry='2026-12'
- Z3 row now status-aware: approved (green "Insured"), pending_review (amber), none (gray + "+ Add Proof" CTA)
- "+ Add Proof" ghost DisplayTag navigates to InsuranceUpload (was Verification)

Files modified: 3 (ProfileStack.tsx, ProfileTab.tsx, InsuranceUploadScreen.tsx new)
tsc: 0 errors

---
Session 48 — Dev Auth, Circular Import Fix, Live Verification Confirmed

Branch: frontend/session-25-onboarding-redesign
Commit: 0544994

Part 1: Feature Flags (+2 flags, total: 7)
- DEV_BYPASS_AUTH: true (demo default) — controls auth bypass in App.tsx
- DEV_SHOW_PASSWORD_LOGIN: false (demo default) — shows password sign-in on LoginScreen

Flag management centralized: App.tsx DEV_BYPASS_AUTH now reads from FEATURE_FLAGS inside component body (was module-scope `__DEV__ && true`). Hot reload picks up flag changes immediately.

Part 2: Circular Import Fix
- Root cause: ProfileTab → BottomTabNavigator → ProfileStack → ProfileTab (cycle)
- Fix: Extracted DemoRoleContext, DemoRole type, useDemoRole hook to lib/demoRoleContext.ts
- BottomTabNavigator.tsx: removed local definitions, imports from lib/demoRoleContext
- ProfileTab.tsx: import updated from ./BottomTabNavigator to ../lib/demoRoleContext

Part 3: LoginScreen — Dev Password Sign-In
- Added handlePasswordSignIn using supabase.auth.signInWithPassword
- Password TextInput + amber outlined CTA button + disclaimer text
- All gated behind FEATURE_FLAGS.DEV_SHOW_PASSWORD_LOGIN (nothing renders when false)
- @demo and @backend markers on all new code

Part 4: App.tsx — Cold Start Auth Fix
- Problem: onAuthStateChange does not fire on cold start when no session exists
- Fix: Async IIFE in auth useEffect, calls supabase.auth.getSession() on mount
- If no session → sets authState = 'unauthenticated' immediately (shows LoginScreen)

Part 5: SettingsScreen — Log Out Wired
- handleLogOut now calls await supabase.auth.signOut()
- App.tsx onAuthStateChange handles routing back to LoginScreen automatically

Part 6: Live Verification Confirmed on Device
- Flipped flags for testing: DEV_BYPASS_AUTH=false, DEV_SHOW_PASSWORD_LOGIN=true, LIVE_VERIFICATION_HOOKS=true
- Signed in via password (tony@atlasioapp.com)
- Submitted license verification → confirmed license_status=pending in Supabase profiles table
- All flags reset to demo defaults before commit

Files modified: 7
- lib/featureFlags.ts (2 new flags)
- lib/demoRoleContext.ts (NEW — extracted from BottomTabNavigator)
- components/BottomTabNavigator.tsx (removed local DemoRole defs)
- components/ProfileTab.tsx (import path update)
- components/LoginScreen.tsx (password sign-in, flag-gated)
- components/SettingsScreen.tsx (signOut wired)
- App.tsx (FEATURE_FLAGS import, component-scoped DEV_BYPASS_AUTH, async IIFE auth)

RPCs: 27 | Hooks: 51 | Flags: 7 | tsc: 0

---
Recommended Next Session Priorities

1. Deploy rpc_complete_onboarding to Supabase, flip LIVE_ONBOARDING flag, test end-to-end
2. Add `headline TEXT CHECK(char_length(headline) <= 35)` column to profiles table in Supabase
3. RepairJobDetails: apply same budget card redesign (accentBlue + displayM) + add job photos strip + lightbox
4. Wire ProProfile portfolio_photos from portfolio_photos table
5. Wire notification deep links (replace console.log with navigation.navigate)
6. Performance: add staleTime/gcTime to high-frequency hooks
7. EditProfileScreen: add contractor-specific fields (trades, license, insurance)
8. BottomTabNavigator: investigate icon position flash (style-only fixes insufficient, may need custom tabBar)
9. Wire InsuranceUploadScreen: expo-document-picker + Supabase credentials bucket upload + rpc_upload_insurance_document
10. Add insurance_status/insurance_expiry columns to profiles table in Supabase schema
