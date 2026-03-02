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
Cumulative Progress (Sessions 1-9)

- Session 1: Type alignment (types/index.ts ↔ schema.sql)
- Session 2: 11 T1 revenue-critical hooks wired
- Session 3: 16 T2 core-experience hooks wired
- Session 4: 9 remaining hooks wired — all 36 hooks now wired
- Session 5: 14 tsc errors fixed, feature flag system, all 10 screens connected to hooks
- Session 6: Type adapters (lib/typeAdapters.ts), ChatScreen threadId, FindTab sections wired
- Session 7/7B: Feature flag flipped to live, pre-backend polish audit (6 fixes identified)
- Session 9: Fixes 2-6 complete (empty states, ProProfile by ID, tags below bio, headline)

tsc status: 0 errors

---
Recommended Next Session Priorities

1. Wire EditProfileScreen save handler to Supabase update_profile mutation
2. Wire ProProfile recent_vouches from vouches table join
3. Wire ProProfile is_connected / is_own_profile checks against current user
4. Wire ProfileTab to use live data for name, company, bio, stats (currently hardcoded)
5. Wire ProProfile portfolio_photos from portfolio_photos table (replace MOCK_PORTFOLIO_PHOTOS)
