# Atlasio — Project Context Document
# Last updated: Feb 27, 2026
# Paste this into each new Claude conversation for full context.

## What Is Atlasio
Real estate professional networking app (React Native + Expo). Connects agents with service pros (lenders, title, inspectors, contractors, etc.). Trust-based marketplace where reputation is earned through vouches, not ads. Primary revenue driver: agent ↔ contractor repair job bidding. Expanding to photography and staging job bidding.

## Tech Stack
- React Native 0.81.5 + Expo SDK 54
- React Navigation 7 (native-stack + bottom-tabs)
- TanStack Query (configured, not yet wired to screens)
- Supabase (client configured, schema written, not yet deployed)
- TypeScript 5.9
- react-native-gesture-handler (added Feb 24 for swipe-to-delete in Inbox)

## Launch Market
Denver, Colorado. Location hardcoded in mock data. Spanish-Speaking tags reflect demographics.

## Folder Structure
```
/app
  /components     — all screen .tsx files + shared components
  /types          — types/index.ts (single source of truth)
  /hooks          — useData.ts, useDebounce.ts
  /lib            — supabase.ts, queryClient.ts, tokens.ts
  /sql            — schema.sql (Supabase blueprint, not bundled)
```

## Navigation Architecture
BottomTabNavigator (5 tabs — role-conditional):

**Agent tabs:**
- HomeStack: HomeMain → RepairJobDetails → EditRepairJob → Notifications → ProProfile → PostJobWizard → PostPhotoJobScreen → PostStagingJobScreen → SendSquad → JobCompletion
- FindStack: FindMain (accepts preset params) → ProProfile
- NetworkStack: NetworkMain → ProProfile
- InboxStack: InboxList → NewMessage → ChatScreen → CreateDealChat → DealChatScreen
- ProfileStack (ProfileTab → EditProfile)

**Contractor tabs (swapped via demo role toggle):**
- ContractorHomeStack: ContractorHomeMain (→ future: JobDetails, BidSubmission)
- FindStack: shared with agent
- NetworkStack: shared with agent
- ContractorInboxStack: ContractorInboxMain (→ future: RepairChat)
- ProfileStack: shared with agent

**@demo Role Toggle:** Long-press (1s) on Inbox tab icon toggles Agent↔Contractor. DemoRoleContext + useDemoRole hook. RoleBadge indicator (blue "A" / green "C"). Production: replace with auth context role from Supabase profiles.

## Screens Built (all in /components)

### Agent Screens
1. **Onboarding** — multi-step flow (role selection, profile setup, etc.)
2. **HomeTabAgent** — dashboard: closing squad (interactive), quick actions row (4 cards), active repairs, vouch feed (75% contractor bias), demo toggle (Empty/Filled states)
3. **FindTab** — search/discover pros, role pills, expandable filter panel, sort, two states (browse/search), accepts preset params from cross-stack navigation
4. **NetworkTab** — partners + contractors tabs, grouped by role/trade, Add to Squad toggle. Connection requests via header icon → spring-animated bottom sheet (hug-content, auto-close)
5. **ProProfile** — full profile: stats, tags, vouches, conditional CTAs, share, Portfolio Gallery (role-gated)
6. **InboxList** — messaging hub, pinned/recent, search, swipe-to-delete
7. **ChatScreen** — 1:1 messaging with bubbles
8. **NewMessageScreen** — contact picker
9. **CreateDealChat** — deal chat setup with calendar picker
10. **DealChatScreen** — deal-specific group chat
11. **RepairJobDetails** — job detail with bid cards, sort, 3-dot menu
12. **EditRepairJob** — edit form with trade picker, calendar, validation, delete
13. **InviteContractorsModal** — trade-filtered multi-select (max 5), optional note
14. **NotificationsTab** — grouped (today/yesterday/earlier), type-specific icons, deep linking
15. **ProfileTab** — own profile with stats, bio, visibility toggle
16. **RequestConnectModal** — connection request overlay
17. **AttachSheet** — bottom sheet for attachments
18. **BottomTabNavigator** — 5-tab navigator with @demo role toggle
19. **SquadSlotPicker** — bottom sheet modal for filling squad slots from connected pros
20. **QuickActionsRow** — 4-card horizontal scrollable row (Get Photo Bids, Stage to Sell, Get Repair Bids, Fast-Close Lender)
21. **PostPhotoJobScreen** — single-screen photography job posting (fullScreenModal)
22. **PostStagingJobScreen** — single-screen staging job posting (fullScreenModal)
23. **SendSquadScreen** — send squad to client flow (fullScreenModal)
24. **JobCompletionScreen** — job completion handshake flow (fullScreenModal)

### Contractor Screens
25. **ContractorHomeTab** — unified job feed with filter pills (All/Active/Invitations/Matching with count badges). Priority sort: invitations first → urgent → in-progress → awarded → non-urgent. 3-layer card IA. Earnings + Market Pulse sections. Demo toggle.
26. **ContractorInboxList** — job-scoped chat threads (Active/Past grouping). Address-first thread rows. No compose button. Read-only archives with lock icon.

## Shared Components
- **SearchField** — 44px, reused on Home/Find/Network/Inbox/SquadSlotPicker
- **RepairCard** — extracted data-driven repair job card
- **AvatarPlaceholder** — colored circle with initials
- **MessageBubble** — chat message component
- **PortfolioGallery** — reusable photo gallery (swipeable large viewer + thumbnail strip, role-gated, max 8 photos)
- **SquadSlotPicker** — bottom sheet with pro list filtered by role, search, remove/change support, "Find new pro" CTA
- **QuickActionsRow** — horizontal scroll of intent-driven action cards, imported into HomeTabAgent
- **VouchFeedSection** — extracted vouch feed component (text-only cards, no avatars, 75% contractor bias, filter tabs by recipient role, memoized VouchCard, hybrid comment display)
- **CardButton** — shared button component (filled/outlined variants) used across contractor cards
- **DisplayTag** — reusable tag pill component used on contractor cards and agent screens

## Data Files
- **tagEnums.ts** — standardized tags by role (self + derived), Supabase enum
- **repairJobsData.ts** — mock repair jobs (shared HomeTab + RepairJobDetails)
- **proProfileHelpers.ts** — mapFindProToProfile(), mapNetworkContactToProfile() — includes role + portfolio_photos mapping
- **types/index.ts** — all entity interfaces mapped 1:1 to Supabase tables
- **hooks/useData.ts** — 20+ TanStack Query hooks (Supabase queries commented out, mock fallback)
- **hooks/useDebounce.ts** — search input optimization
- **lib/supabase.ts** — client config with AsyncStorage
- **lib/queryClient.ts** — TanStack Query config
- **lib/tokens.ts** — centralized COLORS object (single source of truth for design tokens)
- **sql/schema.sql** — 11 tables, RLS policies, indexes, triggers, RPCs

## Design Standards
- Headers: 48px height, 0px paddingTop (for pushed screens with SafeAreaView)
- Header borders: #E5E7EB (COLORS.border) — NEVER black
- Header centering: equal-width bookend pattern (80px left/right containers)
- Star ratings: #FFB900 gold
- Primary blue: #003DC3
- Section headers: 16px/600/COLORS.darkText/lineHeight 24
- Cards: 14px border-radius, 0.68px border #F3F4F6 (agent), 1px border #E5E7EB (contractor)
- Pills/avatars: borderRadius 9999
- Shadows: shadowOpacity 0.1, shadowRadius 3, elevation 2
- Brand-tinted borders: rgba(0, 61, 195, 0.15) — use primary at low opacity, not black/gray
- Bottom sheet animation: `animationType="none"` + custom Animated (backdrop fades 300ms, sheet springs up damping:24/stiffness:220). Never use `animationType="slide"` on bottom sheets (slides overlay with content).
- Sequential modal opening: queue pending action in useRef, execute in close animation callback with 100ms setTimeout buffer
- Minimum font size: 12pt across all screens (enforced in contractor cards Session 20)

## Safe Area Pattern (CRITICAL)
**For screens presented as `fullScreenModal` or `modal`:**
- Do NOT use `SafeAreaView edges={['top']}` — it fails on Dynamic Island devices
- Use `useSafeAreaInsets()` + manual padding instead:
  - Header: `paddingTop: 8 + insets.top`
  - Bottom bar: `paddingBottom: Math.max(insets.bottom, 16)`
  - Outer wrapper: plain `<View>`, not `<SafeAreaView>`
- **Affected screens:** SendSquadScreen, PostPhotoJobScreen, PostStagingJobScreen, PostJobWizard, JobCompletionScreen, RepairChatScreen

**For default push screens and tab screens:**
- `SafeAreaView edges={['top']}` works reliably — no change needed

## Quick Actions Architecture
- **4 cards** in horizontal scrollable row on HomeTabAgent (between squad and active repairs)
- Cards are intent-driven shortcuts for high-frequency, time-sensitive agent decisions
- Cards 1–3 lead to job posting flows (bidding revenue): Get Photo Bids → PostPhotoJobScreen, Stage to Sell → PostStagingJobScreen, Get Repair Bids → PostJobWizard
- Card 4 leads to FindTab with pre-set filters: Fast-Close Lender → FindTab (Mortgage Pro + close_21 + Fastest Closing)
- Cross-stack navigation uses `CommonActions.navigate({ name: 'Find', params: { screen: 'FindMain', params: { ... } } })`
- Starting prices on cards are hardcoded Denver market averages for MVP (wire to MIN(profiles.base_price) per role)

## Job Type Architecture (Unified Backend)
All job types share the same infrastructure:
- **One `jobs` table** with `job_type` enum: 'repair', 'photography', 'staging'
- **One `bids` table** — same RPCs for submit/accept/counter/reject regardless of job_type
- **One `useCreateJob()` mutation hook** — shared across all posting flows
- **One `rpc_create_job` RPC** — conditional field validation based on job_type
- **3% platform fee** across all job types, same Stripe edge function
- Photography/staging-specific fields are nullable columns on jobs table
- RepairJobDetails screen conditionally renders based on job_type

## Closing Squad Architecture
- **Default 4 slots:** Mortgage Pro, Title/Escrow, Home Inspector, Transaction Coordinator — always visible, cannot be removed
- **Additional roles:** Appraiser, Contractor, Warranty, Attorney — added via "Add Another Role" modal, removable (clears pro AND removes slot)
- **SquadSlot interface:** `{ id, label, role, isAddNew? }` — `role` field maps to SquadSlotPicker filter
- **State:** `squadMembers: { [slotId]: SquadProCandidate }`, `additionalSlots: SquadSlot[]`
- **Interactions:** tap empty slot → picker opens filtered by role → tap pro → slot fills. Tap filled slot → picker in "Change" mode with "Remove from squad" option. Filled slots auto-sort left, empty right, "Add Another Role" pinned last.
- **Send to Client CTA:** appears in squad header when any slot is filled
- **Progress text:** "X of Y roles filled — keep building!" shown when partially filled
- **Mock data:** SquadSlotPicker has CONNECTED_PROS with entries for all 8 roles (22 total pros)

## Contractor Card IA (3-Layer Pattern)
All contractor feed cards follow a consistent 3-layer information architecture:
1. **Scan layer** (top): Trade pill (DisplayTag) + status indicator (JobStatusChip, URGENT badge, or time ago). Instantly tells the contractor "is this my trade?" and "what's the state?"
2. **Decision layer** (blue inset): `COLORS.statBg` background, 8px margin from card edge, 10px border-radius. Contains primary decision info — job title + amount (active) or address + budget range (invites/matching). 16px/600 weight for emphasis.
3. **Detail layer** (bottom): Supporting context — agent avatar+name, address, due date, distance. CTA row with optional chat icon.

**Chat icon on cards:**
- **ActiveJobCard:** Chat always visible (36×36 outlined icon, left of CTA)
- **JobInviteCard:** Chat appears when `hasBid: true` (bid already submitted)
- **MatchingJobCard:** Chat appears when `hasBid: true`
- CTA text adapts: "Accept & Bid" → "View Bid", "View & Bid" → "View Bid" when bid exists

## Contractor Messaging Architecture
**Business rule:** Contractors can ONLY chat in the context of a job. No proactive outreach, no standalone DMs. Every thread is tied to a jobId. This protects the 3%→5%→10% commission structure by preventing backdoor agent↔contractor networking.

**Thread creation triggers:**
1. Agent sends job invitation → thread auto-creates
2. Contractor submits bid → thread opens with posting agent
3. Bid accepted → thread continues (awarded → in_progress)

**Thread lifecycle:**
- **Active:** invited / bid_submitted / awarded / in_progress / pending_confirmation → read/write
- **Past:** completed / cancelled → read-only archive, swipe-to-delete

**ContractorInboxList (separate component from agent InboxList):**
- Two sections: Active Jobs + Past Jobs
- Address-first thread rows (contractors remember jobs by location)
- No compose button (cannot initiate messages)
- ThreadStatusBadge (7 statuses)

## Role Architecture
- **ProProfileData** has both `role` (broad category) and `trade` (specialty)
  - `role`: 'Contractor', 'Mortgage Pro', 'Title/Escrow', 'Home Stager', 'Real Estate Photographer', etc.
  - `trade`: 'Electrician', 'Plumber', 'Roofer' (sub-category under role)
- **Job-eligible roles** (show "Invite to Job" CTA): Contractor, Home Stager, Real Estate Photographer
- **Partner roles** (show "Message" / "Request to Connect"): Mortgage Pro, Title/Escrow, Home Inspector, Appraiser, TC, Warranty, Attorney
- **Gallery-eligible roles** (show Portfolio section): Contractor, Home Stager, Real Estate Photographer

## Nav Params (Production Pattern)
Navigation uses IDs not full objects: { profileId: string }, { jobId: string }, { conversationId: string }
Screens fetch fresh data on mount via TanStack Query hooks.
**Exception:** FindTab accepts preset filter params for cross-stack Quick Actions navigation: { presetRole?, presetFilters?, presetSort? }

## Filter Tabs Order
- Home vouch feed: All, Contractors, Mortgage, Title, Inspectors
- Find tab roles: All, Mortgage Pro, Title/Escrow, Home Inspector, Appraiser, TC, Contractor, Warranty, Attorney
- Contractor home feed: All, Active, Invitations, Matching (with count badges)

## Animation Patterns
- **Bottom sheets (SquadSlotPicker, Add Another Role, Connection Requests):** `animationType="none"` on Modal, separate `Animated.View` for backdrop (opacity fade) and sheet (translateY spring). Modal `visible` tied to `modalMounted` state that flips false only after close animation `.start()` callback fires. Hug-content pattern: `maxHeight` on inner content View (not outer Animated.View) so sheet sizes to content and only scrolls on overflow.
- **Sequential modal opening:** When modal A must close before modal B opens (e.g., role picker → pro picker), queue the pending open in a `useRef`, execute in the close animation callback with `setTimeout(100)` to let React flush the unmount.
- **Filter panel:** `LayoutAnimation.Presets.easeInEaseOut`
- **Chat screens:** `presentation: 'fullScreenModal'`, `animation: 'slide_from_bottom'`
- **Role toggle:** LongPressTabButton with scale animation (0.85 on press-in, spring back) + haptic Vibration(50)

## State-Adaptive Card Pattern (RepairCard)
Cards show different information hierarchy based on job lifecycle state:
- **Open jobs:** Title → Due date (14pt) → Budget + bid count (12pt). Decision-stage signals: urgency + scope + demand.
- **Active jobs (awarded/in_progress):** Title → Contractor name + amount (14pt/500 weight) → Due date (12pt). Execution-stage signals: who's doing it + committed price.
- **Rule:** Remove data points that become irrelevant after a decision (budget range, bid count on active jobs). Each card shows exactly the info the agent needs for their current decision context.

## Revenue Model
- **3% platform fee** on all accepted bids (repair, photography, staging)
- Fee captured via Stripe edge function `process-stripe-fee` on bid accept
- Counter mechanic allows price/terms negotiation before accept
- Photography example: $229 shoot = $6.87 fee
- Staging example: $2,500 job = $75 fee

## What's Pending

### Agent Side ✅ COMPLETE
All agent screens, modals, and flows are built. Full investor demo path functional: post job → get bids → accept → complete → vouch.

### Contractor Side (active development)
1. ~~**ContractorHomeTab**~~ ✅ — unified feed, 6 card types, filter pills, earnings, market pulse, chat icons
2. ~~**ContractorInboxList**~~ ✅ — job-scoped chat threads, Active/Past grouping, address-first rows
3. ~~**Role-Based Tab Config**~~ ✅ — @demo toggle in BottomTabNavigator (long-press Inbox tab)
4. **BidSubmissionScreen** — view job details, submit bid with price/timeline/notes
5. **CounterOfferScreen** — original bid vs agent counter, Accept/Revise/Decline CTAs
6. **JobTrackerTab** — pipeline view: Invited → Bid Submitted → Active → Completed
7. **ContractorOnboarding** — trade selection, license/insurance, portfolio, service area
8. **EditProfileScreen (Contractor)** — trade picker, portfolio management, availability
9. **Contractor Nav Stack** — full routes beyond demo wrappers (BidSubmission, RepairChat, etc.)

### Partner Side (future phase)
- **PartnerHomeTab** — dashboard for mortgage pros, title, inspectors
- **EditProfileScreen (Partner)** — specialties, languages, service area

### Cross-Cutting (backend + infra)
- Wire hooks/useData.ts to screens (replace mock data)
- Loading/error/empty states
- Real-time messaging (Supabase Realtime)
- Push notifications
- Photo/document upload to Supabase Storage (wire PortfolioGallery onAddPhoto)
- Auth flow (sign-up, login, session) — replaces @demo role toggle
- Deploy Supabase schema + schema extensions (job_type enum, photography/staging columns, lender close speed)
- Payment / Fee Collection (Stripe Connect)
- Settings / Account Management
- Edit Profile Screen (Agent)

## Recent Updates (Feb 27, 2026 — Sessions 19–21)
- **ContractorHomeTab full build** — 5 sections, 6 card components (ActiveJobCard, JobInviteCard, MatchingJobCard, EarningsSummaryCard, MarketPulseSection, EmptyState). Unified feed with filter pills (All/Active/Invitations/Matching with count badges). Priority sort: invitations first → urgent matching → in-progress → pending → awarded → non-urgent. 3-layer card IA (scan→decide→detail). Blue inset header (8px margin, r10, COLORS.statBg). 12pt minimum font scale. Header centered with equal-width bookend pattern (80px). Demo toggle.
- **Card IA redesign** — 6 iterations refining information hierarchy. Card borders strengthened #F3F4F6 → #E5E7EB. Detail layer paddingTop 16→8px.
- **Chat icons on contractor cards** — ChatBubbleSmallIcon (16px) on all 3 card types. ActiveJobCard: always visible. JobInviteCard/MatchingJobCard: when hasBid=true. CTA text adapts. hasBid boolean added to JobInvite + MatchingJob interfaces.
- **ContractorInboxList** — Job-scoped chat threads (separate component, not conditional in agent InboxList). Active/Past grouping. Address-first thread rows. ThreadStatusBadge (7 statuses). No compose button. Read-only archives with lock icon. Business rule enforcement: contractors can only chat within job context.
- **Demo role toggle** — Long-press (1s) on Inbox tab toggles Agent↔Contractor. DemoRoleContext + useDemoRole hook. Swaps Home + Inbox stacks. RoleBadge (blue A / green C). LongPressTabButton with haptic + scale animation.

## Previous Updates (Feb 26, 2026 — Sessions 16–18)
- **Connection Requests bottom sheet** — Moved from inline horizontal scroll to spring-animated bottom sheet behind NetworkTab header person icon (red dot). Hug-content layout (no unnecessary scroll), auto-close on last request handled. Vertical list: avatar, name, role/company, mutual connections, note, Accept/Decline.
- **RepairCard state-adaptive layout** — Open jobs: Title→Due date (14pt)→Budget+bid count (12pt). Active jobs: Title→Contractor+amount (14pt/500)→Due date (12pt). Removed budget range and bid count from active cards (dead information post-decision). Card sizing: 325px + 12px gap.
- **In Progress filter chip** — Added to HomeTabAgent repair section alongside Urgent and New Bids.
- **FindTab pill overflow fix** — 2 pill cap + "+N more" indicator, nowrap layout.
- **Bug fixes** — senderName→name property mismatch in bottom sheet. ProProfile route param shape fix. Vouch feed profile navigation crash fix.

## Previous Updates (Feb 26, 2026 — Sessions 14–15)
- **VouchFeedSection** — Extracted vouch feed component (784 lines). Text-only card layout — no avatars. 75% contractor content bias. Filter tabs filter by recipient role. 16 mock entries (12 contractor + 4 partner).
- **HomeTabAgent cleanup** — Replaced ~150 lines of old inline vouch feed with single `<VouchFeedSection />` drop-in.
- **Quick Actions row** — 4-card horizontal scrollable row on HomeTabAgent: Get Photo Bids, Stage to Sell, Get Repair Bids, Fast-Close Lender. Each card navigates to appropriate flow.
- **PostPhotoJobScreen** — single-screen photography job posting with service package multi-select, turnaround preference pills, address/sqft/date fields. Submits to shared jobs table with job_type = 'photography'.
- **PostStagingJobScreen** — single-screen staging job posting with occupied/vacant toggle, room count stepper, staging scope checkboxes. Submits to shared jobs table with job_type = 'staging'.
- **Cross-stack navigation** — Lender Quick Action card navigates from HomeStack to FindTab with preset filters (Mortgage Pro + ≤21 days + Fastest Closing). FindStack param types updated. FindTab useEffect applies and clears params on mount.
- **Safe area fix** — Replaced SafeAreaView with useSafeAreaInsets() + manual padding on all fullScreenModal screens (SendSquadScreen, PostPhotoJobScreen, PostStagingJobScreen). Documented as standard pattern.
- **HomeStack updated** — PostPhotoJobScreen and PostStagingJobScreen registered as fullScreenModal screens.
- **Backend Integration Guide updated** — Sections 10–13 added (Quick Actions, Photography flow, Staging flow, Lender onboarding). Schema extensions documented. Safe Area Pattern documented with decision table and PR checklist.

## Previous Updates (Feb 25, 2026)
- **Job Completion flow** — JobCompletionScreen with contractor marks complete, agent confirms/requests revision, mutual vouch prompt. Full state machine with proof photos, revision notes, completion timeline.
- **Backend Integration Guide** — Living document created mapping every frontend flow to backend wiring requirements. 9 flow sections + global wiring checklist.
- **SendSquadScreen** — Full-screen send squad to client flow with swap members, add roles, intro message, native share sheet.
- **Build tracker multi-track system** — HTML dashboard + Notion Build Log for parallel progress tracking.

## Previous Updates (Feb 24, 2026)
- Added **PortfolioGallery** reusable component — swipeable large photo viewer + thumbnail carousel, role-gated for Contractor/Stager/Photographer, max 8 photos, empty state with upload prompt for own profile
- Added `role` field to **ProProfileData** (separate from `trade`) for clean role-gating
- Updated **ProProfile CTAs** — "Invite to Job" now shows for Contractors, Home Stagers, and Real Estate Photographers; all other partner roles get "Message" + "Request to Connect"
- Added **swipe-to-delete** on InboxList (react-native-gesture-handler)
- **Trade specialty system** — primary_trade + secondary_trades (max 2) on ProCard, ProProfile, and proProfileHelpers
- **CTA modal wiring** — Request to Connect and Invite to Job modals wired on ProProfile with trade matching
- **Messaging policy enforcement** — Removed Message button from FindTab. Connection required for messaging.
