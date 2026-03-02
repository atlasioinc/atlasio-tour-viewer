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
Cumulative Progress (Sessions 1-12)

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

Backend B-E Sessions 1-12 complete. Supabase: 18 tables, 18 RPCs. 47 hooks (45 active + 2 deleted), 10/10 screens connected. ~75% progress.

tsc status: 0 errors

---
Recommended Next Session Priorities

1. Implement edge function logic (process-stripe-fee, create-job-thread, filter-phone-numbers, send-push-notification)
2. Wire ProProfile portfolio_photos from portfolio_photos table (replace MOCK_PORTFOLIO_PHOTOS)
3. Wire ProProfile "Message" CTA to navigate to ChatScreen (find or create thread)
4. Wire NewMessage screen to use useChatRecipients + useCreateThread
5. Add trending vouch window (7-day filter) via RPC or view for useTrendingPros
6. Wire notification deep links (replace console.log with navigation.navigate)
7. Wire notification mark-as-read mutation to Supabase
8. Performance: add staleTime/gcTime to high-frequency hooks
