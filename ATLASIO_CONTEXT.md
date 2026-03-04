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
Cumulative Progress (Sessions 1-24)

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

48 hooks total (45 wired + 3 mock stubs). 7 edge functions. 3 realtime subscriptions. 0 type casts. 0 tsc errors.

Contractor screens: 5 (ContractorHomeTab, ContractorJobDetails, ContractorInboxList, BidSubmissionScreen, JobTrackerTab) + 3 shared (ChatScreen, ProProfile, JobCompletionScreen)

tsc status: 0 errors

---
Recommended Next Session Priorities

1. Wire contractor hooks to Supabase (useContractorJobDetails, useSubmitBid, useRespondToCounter)
2. Create remaining T4 hook stubs (useContractorActiveJobs, useJobInvitations, useMatchingJobs, useContractorEarnings)
3. Wire ProProfile portfolio_photos from portfolio_photos table
4. Wire notification deep links (replace console.log with navigation.navigate)
5. Contractor Profile tab (currently hidden — agent-only Profile tab)
6. Polish pass: ContractorHomeTab RepairChat nav → ChatScreen alignment
8. Performance: add staleTime/gcTime to high-frequency hooks
