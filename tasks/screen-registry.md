# Atlasio — Screen Registry
**Generated:** April 4, 2026 (S129 session)
**Source:** Notion (User Flows + Component Inventory + Live Build State) + ATLASIO_CONTEXT.md
**Purpose:** Ground truth for all screens — what exists, who sees it, where it lives in nav, what it links to, and what's still wired to mock data. Use this before building any new screen or adding any new navigation link.

---

## How to Read This Registry

| Column | Meaning |
|---|---|
| Screen | File name in `/app/components/` unless noted |
| Role(s) | Which users see this screen |
| Nav Type | How it's presented (`push`, `fullScreenModal`, `tab`, `bottom sheet`) |
| Entry Points | What triggers navigation TO this screen |
| Exit Points | Where this screen navigates TO |
| Wiring Status | `✅ Live` = real Supabase data · `🟡 Partial` = some live, some mock · `🔴 Mock` = all demo data |
| Feature Flag | Flag required to show this screen (if gated) |

---

## 1. Bottom Tab Navigation

### Agent Tab Bar
| Tab | Icon | Screen | Status |
|---|---|---|---|
| Home | House | HomeTabAgent | ✅ Partial live |
| Find | Search | FindTab | ✅ Live (contractor search) |
| Network | People | NetworkTab | ✅ Live |
| Inbox | Chat | InboxList | ✅ Live |
| Profile | Person | ProfileTab | 🟡 Partial |

### Contractor Tab Bar
| Tab | Icon | Screen | Status |
|---|---|---|---|
| Home | House | ContractorHomeTab | 🟡 Partial |
| Jobs | Clipboard | JobTrackerTab | 🔴 Mock |
| Inbox | Chat | ContractorInboxList | ✅ Live |

### Partner Tab Bar (feature-flagged — PARTNER_TRACK_ENABLED: true)
| Tab | Icon | Screen | Status |
|---|---|---|---|
| Home | House | HomeTabPartner | ✅ Live |
| Deals | Briefcase | PartnerDealsScreen | ✅ Live |
| Network | People | NetworkTab (partner branch) | ✅ Live |
| Inbox | Chat | InboxList | ✅ Live |
| Profile | Person | ProfileTab (partner branch) | 🔴 Mock |

---

## 2. Screen-by-Screen Registry

---

### 🏠 AGENT HOME STACK

---

#### HomeTabAgent
**File:** `components/HomeTabAgent.tsx`
**Role:** Agent only
**Nav Type:** Tab root (Home tab)
**Feature Flag:** None
**Wiring:** 🟡 Partial

**What's on this screen:**
- Personalized greeting (Good morning/afternoon/evening + first name)
- Subtitle: "Y jobs posted" (Phase 1 — @demo, will add active deals count)
- Active Deals horizontal scroll (deal cards → AgentDealDetailScreen)
- "New Deal +" CardButton outlined (→ DealCreation, gated DEAL_CREATION_ENABLED)
- "View all deals →" link (→ AgentDealsScreen)
- Closing Squad section (squad slot row → SquadSlotPicker)
- "Send to Client" button (→ SendSquadScreen, appears when any slot filled)
- QuickActionsRow (4 cards: Photo Bids, Stage to Sell, Repair Bids, Fast-Close Lender)
- Active Jobs horizontal scroll (job cards → RepairJobDetails) — live via rpc_get_agent_active_jobs (S135b), nav restored from AgentJobDetailScreen in S140a
- VouchFeedSection (feed of recent vouches)

**Entry Points:**
- App launch (default tab)
- CommonActions.navigate from any other tab

**Exit Points:**
- → AgentDealDetailScreen (tap active deal card) — `navigation.push`
- → AgentDealsScreen ("View all deals →") — `navigation.push`
- → DealCreation ("New Deal +", DEAL_CREATION_ENABLED) — `navigation.push`
- → SquadSlotPicker (tap squad slot) — bottom sheet
- → SendSquadScreen ("Send to Client") — `navigation.push` fullScreenModal
- → PostPhotoJobScreen ("Get Photo Bids") — `navigation.navigate`
- → PostStagingJobScreen ("Stage to Sell") — `navigation.navigate`
- → PostJobWizard ("Get Repair Bids") — `navigation.navigate`
- → FindTab with presetRole/Filters ("Fast-Close Lender") — `CommonActions.navigate`
- → RepairJobDetails (tap repair card) — `navigation.push`

**Live hooks:** useAgentActiveDeals (wired S100), useMyProfile (greeting), useAgentActiveJobs (wired S135b)
**Mock:** VouchFeedSection, QuickActionsRow
**@demo:** Subtitle "Y jobs posted" only (active deals count deferred)

---

#### AgentDealsScreen
**File:** `components/AgentDealsScreen.tsx`
**Role:** Agent only
**Nav Type:** Pushed screen (HomeStack)
**Feature Flag:** None
**Wiring:** 🔴 Mock (useAgentDeals hook stub — rpc_get_agent_deals not yet deployed)

**What's on this screen:**
- ScreenHeader "Your Deals" + deal count
- Filter chips: All / Needs attention / Closing soon
- "Closed" filter chip (4th) → pushes to ClosedDealsScreen
- Full-width deal cards with left accent bar (red/amber/green/default)
- Per-deal: address, closing date, partner avatar row + status dots, alert pill
- Per-filter empty states

**Entry Points:**
- HomeTabAgent → "View all deals →" link

**Exit Points:**
- → AgentDealDetailScreen (tap deal card) — `navigation.push`
- → ClosedDealsScreen ("Closed" chip or initialFilter:'closed' param) — `navigation.push`
- ← Back chevron → HomeTabAgent

**@backend:** rpc_get_agent_deals() — NOT YET DEPLOYED. Wire when DEAL_CREATION_ENABLED: true.

---

#### AgentJobDetailScreen
**File:** `components/AgentJobDetailScreen.tsx`
**Role:** Agent only
**Nav Type:** Pushed screen (HomeStack, headerShown: false)
**Feature Flag:** None
**Status:** @cleanup — entry point restored to RepairJobDetails in S140a. Route remains registered but has no active navigation path. Remove in a future cleanup session if confirmed unused.

**What's on this screen:**
- Status card with pulsing dot (in_progress), amber review block (pending_completion)
- Contractor card (avatar, name, company)
- Job details card (address, type, due date, budget)
- "Confirm Job Complete" CTA (pending_completion only — @demo Alert for now)

**Entry Points:**
- ~~HomeTabAgent → Active Jobs card tap → `navigation.push('AgentJobDetail', { jobId })`~~ (removed S140a, now routes to RepairJobDetails)

**Exit Points:**
- ← Back chevron → goBack()

**Wiring:** Reads from `useAgentActiveJobs` cache by jobId. CTA is @demo — wire `rpc_confirm_job_complete` when ready.

---

#### AgentDealDetailScreen
**File:** `components/AgentDealDetailScreen.tsx`
**Role:** Agent only
**Nav Type:** Pushed screen (HomeStack, headerShown: false)
**Feature Flag:** None (Mark Deal Closed CTA gated by DEAL_CREATION_ENABLED)
**Wiring:** 🟡 Partial

**What's on this screen:**
- Custom header: address + closing date + Share button (rightElement)
- Per-partner sections: header row, alert banners ("Got it" dismiss), progress bar, milestone list (read-only)
- Closing day details section (3 states: empty → editing → populated)
- "Mark Deal Closed 🏆" PrimaryButton at bottom (gated DEAL_CREATION_ENABLED)

**Entry Points:**
- HomeTabAgent → tap active deal card
- AgentDealsScreen → tap deal card
- DealCreationSheet → "View Deal" on success state

**Exit Points:**
- → DealClosedCelebrationScreen ("Mark Deal Closed", DEAL_CREATION_ENABLED) — `navigation.push`
- Share button → native Share.share() with closing tracker URL
- ← Back chevron → previous screen

**Live hooks:** useAgentActiveDeals, useRealtimeDealBoard, useGenerateClientToken, useUpdateClosingDetails, useDismissDealAlert
**Mock:** routeDealData fallback (@demo safety net)
**@backend:** rpc_get_deal_board_for_agent(p_transaction_id)

---

#### DealCreation (DealCreationSheet)
**File:** `features/partners/components/DealCreationSheet.tsx`
**Role:** Agent only
**Nav Type:** fullScreenModal (slide_from_bottom)
**Feature Flag:** DEAL_CREATION_ENABLED: true
**Wiring:** 🟡 Partial (rpc_create_transaction live, partner list live via useAgentPartnerConnections)

**What's on this screen:**
- fullScreenModal header (X dismiss)
- 4 fields: property address (Google Places autocomplete), closing date (MM/DD/YYYY), assign partners (multi-select from connections), contract price (optional)
- "Create Deal" PrimaryButton (disabled until address filled)
- In-place success state: "Deal Created" + "View Deal" + "Done"

**Entry Points:**
- HomeTabAgent → "New Deal +" button

**Exit Points:**
- → AgentDealDetailScreen ("View Deal" on success) — `navigation.push` after modal dismiss
- ← X button → goBack()

**Live hooks:** rpc_create_transaction, useAgentPartnerConnections
**@backend:** rpc_create_transaction(p_property_address, p_closing_date, p_contract_price, p_buyer_name, p_mls_number, p_partner_assignments)

---

#### DealClosedCelebrationScreen
**File:** `components/DealClosedCelebrationScreen.tsx`
**Role:** Agent only
**Nav Type:** fullScreenModal (slide_from_bottom)
**Feature Flag:** DEAL_CREATION_ENABLED: true (parent screen CTA is gated)
**Wiring:** 🔴 Mock (useMarkDealClosed mock 800ms)

**What's on this screen:**
- Confetti burst (12 animated dots, core RN Animated — restored S139b, replaces react-native-confetti-cannon removed S126)
- Trophy emoji + "Congratulations!" + "You closed the deal."
- ShareableClosedDealCard (address, buyer, price, date)
- "Share Your Win" CTA (view-shot capture → Share.share())
- "Done" CTA → ClosedDealsScreen

**Entry Points:**
- AgentDealDetailScreen → "Mark Deal Closed 🏆"

**Exit Points:**
- → ClosedDealsScreen ("Done") — `navigation.push`
- Share → native Share sheet (PNG of deal card)

**@backend:** useMarkDealClosed → rpc_mark_deal_closed (NOT YET DEPLOYED — S-PHASE2-01)
**⚠️ Note:** Animations removed S126 (RN 0.83 Bridgeless incompatibility). Currently fully static layout. Restore in S140 using core RN Animated API only.

---

#### ClosedDealsScreen
**File:** `components/ClosedDealsScreen.tsx`
**Role:** Agent only
**Nav Type:** Pushed screen (HomeStack)
**Feature Flag:** None
**Wiring:** 🔴 Mock (useClosedDeals — rpc_get_closed_deals not deployed)

**What's on this screen:**
- ScreenHeader "Closed Deals" + back
- Stats row: deal count + total volume
- FlatList of closed deal cards (blue left accent, address/buyer/price/date, 🏆)
- Empty state: trophy + "No closed deals yet"

**Entry Points:**
- DealClosedCelebrationScreen → "Done"
- AgentDealsScreen → "Closed" filter chip

**Exit Points:**
- ← Back chevron → previous screen

**@backend:** rpc_get_closed_deals() — NOT YET DEPLOYED (S-PHASE2-01)

---

#### RepairJobDetails
**File:** `components/RepairJobDetails.tsx`
**Role:** Agent only
**Nav Type:** Pushed screen (HomeStack)
**Feature Flag:** None
**Wiring:** 🟡 Partial

**What's on this screen:**
- Custom 3-column header (back, title, more menu)
- Job status, address, budget range
- Bid cards from contractors
- Edit button → EditRepairJob
- Invite button → InviteContractorsModal
- Status timeline

**Entry Points:**
- HomeTabAgent → tap repair card
- PostJobWizard → success

**Exit Points:**
- → EditRepairJob (Edit button) — `navigation.push`
- → InviteContractorsModal (Invite button) — modal
- ← Back

---

#### EditRepairJob
**File:** `components/EditRepairJob.tsx`
**Role:** Agent only
**Nav Type:** Pushed screen
**Feature Flag:** None
**Wiring:** 🔴 Mock

**What's on this screen:**
- FormField inputs for job details
- Save CTA

**Entry Points:**
- RepairJobDetails → Edit button

**Exit Points:**
- ← Back / Save → RepairJobDetails

---

#### PostJobWizard
**File:** `components/PostJobWizard.tsx`
**Role:** Agent only
**Nav Type:** fullScreenModal (slide_from_bottom)
**Feature Flag:** None
**Wiring:** ✅ Live (rpc_create_job + rpc_invite_contractors wired S86)

**What's on this screen:**
- 3-step wizard: basics (address, trade, budget, notes) → details → review
- Step 2: "Invite Specific Pros" toggle → InviteContractorsModal
- In-place success state (CheckCircleIcon, "Job Posted", View Job + Done)
- Google Places autocomplete on address field

**Entry Points:**
- HomeTabAgent → QuickActionsRow → "Get Repair Bids" card

**Exit Points:**
- → RepairJobDetails ("View Job") — navigate
- ← X → goBack()

**@backend:** rpc_create_job + rpc_invite_contractors

---

#### PostPhotoJobScreen
**File:** `components/PostPhotoJobScreen.tsx`
**Role:** Agent only
**Nav Type:** fullScreenModal (slide_from_bottom)
**Feature Flag:** None
**Wiring:** ✅ Live (rpc_create_job wired S89)

**What's on this screen:**
- Single-screen form: address, sqft, date, service packages (chips), turnaround (pills), notes
- Submit CTA

**Entry Points:**
- HomeTabAgent → QuickActionsRow → "Get Photo Bids"

**Exit Points:**
- → RepairJobDetails on success
- ← X → goBack()

**@demo:** p_title auto-generated as 'Photography Job' — add TextInput before launch. sqft not sent (no RPC param).

---

#### PostStagingJobScreen
**File:** `components/PostStagingJobScreen.tsx`
**Role:** Agent only
**Nav Type:** fullScreenModal (slide_from_bottom)
**Feature Flag:** None
**Wiring:** ✅ Live (rpc_create_job wired S89)

**What's on this screen:**
- Single-screen form: address, sqft, occupied/vacant toggle, room count stepper, staging scope, timeline pills, notes
- Submit CTA

**Entry Points:**
- HomeTabAgent → QuickActionsRow → "Stage to Sell"

**Exit Points:**
- → RepairJobDetails on success
- ← X → goBack()

**@demo:** p_title auto-generated as 'Staging Job'. p_due_date receives timeline key not ISO date.

---

#### SendSquadScreen
**File:** `components/SendSquadScreen.tsx`
**Role:** Agent only
**Nav Type:** fullScreenModal (slide_from_bottom)
**Feature Flag:** LIVE_SQUAD_SHARE: false (controls real delivery; UI always visible)
**Wiring:** 🔴 Mock (1500ms mock delay → success state. No real sends until LIVE_SQUAD_SHARE: true)

**What's on this screen:**
- Medium selector: Email / Text Message toggle cards
- Client email or phone number input (conditional on medium)
- Optional personal message (max 300 chars)
- "Include closing tracker link" Switch toggle (state tracked, send wiring deferred)
- Send CTA → Loading → Success/Error state

**Entry Points:**
- HomeTabAgent → "Send to Client" button in squad header

**Exit Points:**
- ← X → goBack()

**@backend:** send-squad-email Edge Function (email path) + send-squad-sms Edge Function (SMS path)

---

### 🔍 FIND TAB STACK

---

#### FindTab
**File:** `components/FindTab.tsx`
**Role:** Agent only (contractors/partners don't see Find tab)
**Nav Type:** Tab root (Find tab)
**Feature Flag:** None
**Wiring:** ✅ Live (contractor search via Supabase, avatar_url flowing through adaptProfileToProCard S133)

**What's on this screen:**
- Role toggle: Contractors / Mortgage Pro / Title & Escrow / Inspector
- SearchField
- Filter chips (FilterChip — NOT shared SelectableChip)
- ProCard list results (tap → ProProfile)
- "accepting_clients" DisplayTag ghost badge on partner ProCards

**Entry Points:**
- Bottom tab
- HomeTabAgent → QuickActionsRow "Fast-Close Lender" (with presetRole/presetFilters/presetSort params via CommonActions)

**Exit Points:**
- → ProProfile (tap ProCard) — `navigation.push`
- → RequestConnectModal (Connect button on ProCard) — modal
- → InviteToJobModal (Invite to Job on ProCard) — modal
- → ChatScreen (Message button on ProCard) — cross-stack via CommonActions to InboxStack

---

#### ProProfile
**File:** `components/ProProfile.tsx`
**Role:** All roles (viewing another user's profile)
**Nav Type:** Pushed screen (FindStack, NetworkStack, HomeStack)
**Feature Flag:** LIVE_PROFILE_HOOKS (stats) — flipped true S133
**Wiring:** ✅ Live (LIVE_PROFILE_HOOKS: true, rpc_get_profile_stats deployed S133, avatar from live profile)

**What's on this screen:**
- Z1 Hero: Avatar component (photo or initials), name, role/trade pill, company, city
- Z2 Trust Bar: rating + vouch pill (NOT tappable — public view)
- Z3 Credentials: read-only credential rows (no chevron on public view)
- Z4 Specialties: DisplayTag chips
- Z5 Portfolio: PortfolioGallery (role-gated: Contractor, Stager, Photographer)
- Z6 Stats: 3 performance tiles
- Z7 Vouches: 2 preview VouchCards + "See all N" link
- CTAs in Hero card: [Message] outlined + [Invite to Job]/[Request to Connect] primary

**Entry Points:**
- FindTab → tap ProCard
- NetworkTab → tap contact card
- HomeTabAgent → tap squad member (via VouchFeedSection onNavigateToProfile)

**Exit Points:**
- → RequestConnectModal ("Request to Connect") — modal
- → InviteToJobModal ("Invite to Job") — modal
- → ChatScreen ("Message") — cross-stack to InboxStack
- ← Back

---

### 🌐 NETWORK TAB STACK

---

#### NetworkTab
**File:** `components/NetworkTab.tsx`
**Role:** Agent (AgentNetworkView) + Partner (PartnerNetworkView)
**Nav Type:** Tab root (Network tab)
**Feature Flag:** None (partner branch requires PARTNER_TRACK_ENABLED)
**Wiring:** ✅ Live

**What's on this screen (Agent view):**
- SearchField
- Role toggle: Contractors / Partners
- Connection request badge on header icon → ConnectionRequestSheet
- Contact cards with Message + Invite to Job CTAs
- "Existing thread detection" — Message button routes to existing ChatScreen if thread exists

**What's on this screen (Partner view):**
- PartnerNetworkView: accepted connections list
- Message button on each contact

**Entry Points:**
- Bottom tab

**Exit Points:**
- → ProProfile (tap contact card) — `navigation.push`
- → ChatScreen (Message button) — cross-stack to InboxStack (existing thread detection: routes to ChatScreen with threadId if exists, else NewMessageScreen)
- → InviteToJobModal (Invite to Job) — modal
- → ConnectionRequestSheet (header person icon) — bottom sheet

---

### 💬 INBOX STACK

---

#### InboxList
**File:** `components/InboxList.tsx`
**Role:** Agent + Partner (shared)
**Nav Type:** Tab root (Inbox tab)
**Feature Flag:** None
**Wiring:** ✅ Live (useInboxThreads → rpc_get_inbox_threads, avatar_url wired S133 via shared Avatar, @cleanup resolved S134)

**What's on this screen:**
- VerificationBanner (amber, role/level-aware)
- SearchField
- PINNED section (pinned threads)
- RECENT section (all other threads)
- Thread rows: avatar, name, role + address (if deal chat), last message, unread count
- Swipe right: Pin/Unpin (UI complete, backend pending)
- Swipe left: Mute (placeholder), Delete/Archive (live — rpc_archive_thread S115e)
- FAB (+) → NewMessageScreen

**Entry Points:**
- Bottom tab

**Exit Points:**
- → ChatScreen (tap thread row) — `navigation.push` (swipe-back enabled)
- → NewMessageScreen (FAB +) — `navigation.push`

---

#### ChatScreen
**File:** `components/ChatScreen.tsx`
**Role:** All roles
**Nav Type:** Pushed screen (InboxStack — NOT fullScreenModal, swipe-back enabled)
**Feature Flag:** None
**Wiring:** ✅ Live (useThreadMessages + useSendMessage, Avatar wired S134 — shared component, 3 instances: size 40+36+64, initials fallback)

**What's on this screen:**
- Header: contact name + role + address (2-line header)
- Message bubbles FlatList
- Text input + Send button
- Dual-path send: creates thread on first message (useCreateThread), then sends (useSendMessage)

**Entry Points:**
- InboxList → tap thread row (with threadId)
- NetworkTab → Message button (with recipientId, creates thread on first send)
- ContractorJobDetails → Message button on Agent Card (with recipientId)
- NewMessageScreen → (creates thread, routes back here)

**Exit Points:**
- ← Back / swipe-back → InboxList

**@backend:** rpc_get_thread_messages, rpc_send_message, rpc_create_thread

---

#### NewMessageScreen
**File:** `components/NewMessageScreen.tsx`
**Role:** All roles
**Nav Type:** Pushed screen (InboxStack)
**Feature Flag:** None
**Wiring:** ✅ Live (useChatRecipients → real connections, Avatar wired S134 — shared component, size 48, initials fallback)

**What's on this screen:**
- Recipient search from connections
- Compose first message

**Entry Points:**
- InboxList → FAB (+)

**Exit Points:**
- → ChatScreen (on select recipient + send) — navigate
- ← Back → InboxList

---

#### ContractorInboxList
**File:** `components/ContractorInboxList.tsx`
**Role:** Contractor only
**Nav Type:** Tab root (Inbox tab for contractor)
**Feature Flag:** None
**Wiring:** 🟡 Partial

**What's on this screen:**
- Header: "Job Chats"
- ACTIVE JOBS section (threads with count inline)
- PAST JOBS section (threads with count inline)
- Swipe-to-delete (UI via Swipeable, @demo console.log, @backend rpc_delete_chat_thread)
- Thread rows → ChatScreen

**Entry Points:**
- Bottom tab (contractor)

**Exit Points:**
- → ChatScreen (tap thread) — push

---

### 👤 PROFILE STACK

---

#### ProfileTab
**File:** `components/ProfileTab.tsx`
**Role:** Agent + Contractor + Partner (role-conditional zones)
**Nav Type:** Tab root (Profile tab)
**Feature Flag:** Partner branch requires PARTNER_TRACK_ENABLED
**Wiring:** 🟡 Partial — avatar upload wired live (S132), "Add photo" nudge S135a (conditional on avatar_url null)

**What's on this screen:**
- Gear icon top-right → SettingsScreen
- Z1 Hero: Avatar component (120px, photo upload + camera overlay), name, role/trade pill, company, service area
- Z2 Trust Bar: rating + vouch count (tappable own profile → VouchesBottomSheet)
- Z3 Credentials: iOS Settings-style tappable rows
  - Agent: License row → VerificationScreen
  - Contractor: License row + Insurance row → InsuranceUploadScreen
- Z4 Specialties: DisplayTag chips (role-specific)
- Z4b Languages card (hidden if ≤1 language)
- Z5 Portfolio: PortfolioGallery (Contractor, Stager, Photographer only)
- Z6 Stats: 3 tiles (agent: Jobs/Earnings/Rating; contractor: same; partner: Deals Closed/Avg Close Days/Vouches)
- Z7 Controls: Edit Profile button, availability toggle (partner), toggles

**Entry Points:**
- Bottom tab

**Exit Points:**
- → SettingsScreen (gear icon) — `navigation.navigate`
- → EditProfileScreen ("Edit Profile" button) — `navigation.navigate`
- → VerificationScreen (license row) — `navigation.navigate` (fullScreenModal)
- → InsuranceUploadScreen (insurance row, contractor) — `navigation.navigate` (fullScreenModal)
- → VouchesBottomSheet (Trust Bar, own profile) — bottom sheet

**Live hooks:** useMyProfile
**Mock:** Stats, portfolio, partner branch mock profile (Sarah Chen)

---

#### SettingsScreen
**File:** `components/SettingsScreen.tsx`
**Role:** All roles (role-conditional sections)
**Nav Type:** Pushed screen (ProfileStack)
**Feature Flag:** None
**Wiring:** 🟡 Partial (email live via supabase.auth.getUser, rest mock)

**What's on this screen:**
- Account: email (live), phone, password
- Notifications: push preference toggles
- Privacy: profile visibility, blocked users
- Support: help center, report bug, contact
- Danger zone: deactivate, delete account (with confirmation modal)
- **🆕 S129 target:** Payment / Payout Settings row (Stripe Connect)

**Entry Points:**
- ProfileTab → gear icon

**Exit Points:**
- → PaymentSettingsScreen (NEW — S129 target) — `navigation.push`
- ← Back → ProfileTab

---

#### EditProfileScreen
**File:** `components/EditProfileScreen.tsx`
**Role:** All roles (role-conditional fields)
**Nav Type:** Pushed screen (ProfileStack)
**Feature Flag:** None
**Wiring:** ✅ Live (headline, service area, languages — wired S119b/c, role-aware avatar helper text S135a)

**What's on this screen:**
- Role-conditional fields: agent (agency, headline, service area, languages, license read-only); contractor (trades, insurance, service area); partner (company, specialties)
- Headline max 45 chars, company max 25 chars
- Service area: Google Places autocomplete
- Languages: multi-select
- Bio: hidden (deferred)
- License: read-only row + "Update →" link to VerificationScreen

**Entry Points:**
- ProfileTab → "Edit Profile" button

**Exit Points:**
- → VerificationScreen ("Update →" on license row) — navigate
- ← Back / Save → ProfileTab

---

#### VerificationScreen
**File:** `components/VerificationScreen.tsx`
**Role:** Agent + Contractor (license verification)
**Nav Type:** fullScreenModal (slide_from_bottom) via ProfileStack
**Feature Flag:** None
**Wiring:** 🟡 Partial

**What's on this screen:**
- fullScreenModal header (centered title, X dismiss)
- License number input
- State/license type selection
- Submit CTA
- Status states: pending / approved / failed

**Entry Points:**
- ProfileTab → Z3 License row
- EditProfileScreen → "Update →" license link

**Exit Points:**
- ← X → getParent()?.goBack() (fullScreenModal dismiss)

---

#### InsuranceUploadScreen
**File:** `components/InsuranceUploadScreen.tsx`
**Role:** Contractor only
**Nav Type:** fullScreenModal (slide_from_bottom) via ProfileStack
**Feature Flag:** None
**Wiring:** ✅ Live (rpc_upload_insurance_document wired S49)

**What's on this screen:**
- fullScreenModal header (centered title, X dismiss)
- Info card (blue left border)
- Upload zone (dashed border, Pressable)
- Expiry date inputs (MM/YYYY, number-pad)
- "What happens next" card
- Submit CTA (disabled until doc selected)
- 4 states: idle → documentSelected → submitting → success

**Entry Points:**
- ProfileTab → Z3 Insurance row (contractor)

**Exit Points:**
- ← X → getParent()?.goBack()

---

### 🔨 CONTRACTOR STACKS

---

#### ContractorHomeTab
**File:** `components/ContractorHomeTab.tsx`
**Role:** Contractor only
**Nav Type:** Tab root (Home tab for contractor)
**Feature Flag:** None
**Wiring:** 🟡 Partial

**What's on this screen:**
- Personalized greeting + first name
- **🆕 S129 target:** Stripe Connect banner (amber, persistent until stripe_connected: true)
- Job Invites horizontal scroll (JobInviteCard × N → ContractorJobDetails)
  - Agent message (1-line truncated, blue left border)
  - Budget + due date + agent info
  - "See All" → Jobs tab
- New Jobs horizontal scroll (NewJobCard × N → ContractorJobDetails)
  - Marketplace opportunities matching contractor's trade
  - "See All" → Find tab
- Active Work vertical stack (ActiveJobCard × N → ContractorJobDetails)
  - Progress bars
  - "See All" → Jobs tab
- Earnings summary row + market pulse
- "View Insights" → EarningsInsightsBottomSheet
- EmptyStateCallouts when each section is empty

**Entry Points:**
- App launch (contractor role)
- Bottom tab

**Exit Points:**
- → ContractorJobDetails (any job card tap) — `navigation.push`
- → JobTrackerTab ("See All" on invites/active) — tab navigate
- → FindTab ("See All" on new jobs) — tab navigate
- → EarningsInsightsBottomSheet ("View Insights") — bottom sheet
- → PaymentSetupScreen (NEW S129 banner CTA) — `navigation.push`

---

#### JobTrackerTab
**File:** `components/JobTrackerTab.tsx`
**Role:** Contractor only
**Nav Type:** Tab root (Jobs tab for contractor)
**Feature Flag:** None
**Wiring:** 🔴 Mock (rpc_get_contractor_jobs not yet deployed — S130)

**What's on this screen:**
- 9 mock jobs across 4 stages (invited, bid_sent, active, completed)
- 5 filter chips (All, Invited, Bid Sent, Active, Completed) with live counts
- Job cards: status chip, trade pill, address, budget, agent avatar + name, due date, time label
- Left border on invited cards (attention signal)
- 5 filter-aware empty states

**Entry Points:**
- Bottom tab (contractor)
- ContractorHomeTab "See All" links

**Exit Points:**
- → ContractorJobDetails (tap card) — `navigation.push`

**@backend:** rpc_get_contractor_jobs (S130)

---

#### ContractorJobDetails
**File:** `components/ContractorJobDetails.tsx`
**Role:** Contractor only
**Nav Type:** Pushed screen (ContractorHomeStack + ContractorJobsStack)
**Feature Flag:** None
**Wiring:** ✅ Live (rpc_get_job_details)

**What's on this screen:**
- Custom 3-column header (back, address, more)
- AgentMessageBanner (blue left border, when job_type: 'invite')
- Budget card (accentBlue fill, white displayM amounts)
- Your Bid card (3 bid states):
  - State 1 (open/invite): submit bid CTA row
  - State 2 (bid_sent): pending/countered bid display
  - State 3 (accepted): green badge, accepted amount, read-only
- State 4 (awarded/accepted): amber banner + "Start Work" CTA → rpc_start_job
- State 5 (in_progress): blue info card + proof photo strip (88×88 tiles, lightbox) + notes + "Mark Complete" CTA → JobCompletionScreen
- State 6 (pending_completion): amber waiting banner + read-only proof + disabled CTA
- Photos strip: horizontal scroll, 112×88 tiles, lightbox modal
- Agent Card: avatar, name, rating, message button (40×40, red notification dot)
- CTA bar: [Decline (invited only)] [Submit Bid] or state-based CTA

**Entry Points:**
- ContractorHomeTab (any job card)
- JobTrackerTab (tap job)

**Exit Points:**
- → BidSubmissionScreen ("Submit Bid") — fullScreenModal
- → ChatScreen (Agent Card message button) — fullScreenModal to InboxStack
- → JobCompletionScreen (State 5 "Mark Complete") — fullScreenModal
- ← Back

**Live hooks:** useJobDetails (rpc_get_job_details), useStartJob

---

#### BidSubmissionScreen
**File:** `components/BidSubmissionScreen.tsx`
**Role:** Contractor only
**Nav Type:** fullScreenModal (slide_from_bottom)
**Feature Flag:** None
**Wiring:** ✅ Live (rpc_submit_bid)

**What's on this screen:**
- fullScreenModal header (X dismiss)
- Custom dollar input (intentionally different from FormField — @design custom comment)
- Timeline input
- Fee-transparent receipt (Atlasio commission shown)
- Submit CTA

**Entry Points:**
- ContractorJobDetails → "Submit Bid"

**Exit Points:**
- ← X → goBack() back to ContractorJobDetails

---

#### JobCompletionScreen
**File:** `components/JobCompletionScreen.tsx`
**Role:** Contractor + Agent (role-conditional content, role from param)
**Nav Type:** fullScreenModal (slide_from_bottom)
**Feature Flag:** None
**Wiring:** ✅ Live (rpc_mark_job_complete + rpc_confirm_job_complete wired S85b)

**What's on this screen:**
- fullScreenModal header (X dismiss)
- Contractor view: proof photo upload (standard upload tile), completion notes, "Mark Complete" CTA
- Agent view: review proof photos, "Confirm Complete" CTA → triggers VouchPromptModal
- VouchPromptModal: mutual vouch after confirmation (5-star rating, vouch at 4+, anonymity toggle)

**Entry Points:**
- ContractorJobDetails State 5 → "Mark Complete"

**Exit Points:**
- ← X → goBack()
- On completion → VouchPromptModal

---

### 🤝 PARTNER TRACK (PARTNER_TRACK_ENABLED: false in demo)

---

#### HomeTabPartner
**File:** `features/partners/components/HomeTabPartner.tsx`
**Role:** Partner (Title/Escrow, Mortgage Pro)
**Nav Type:** Tab root (Home tab for partner)
**Feature Flag:** PARTNER_TRACK_ENABLED: true
**Wiring:** ✅ Live (S90–S92 — 9 partner hooks live)

**What's on this screen:**
- Personalized greeting + first name
- Availability toggle (Accepting New Clients / At Capacity) → rpc_toggle_accepting_clients
- Invitations section: connection request cards + deal invitation cards (horizontal scroll)
- Needs Attention deal board (action-required deals only)
- "All deals on track ✓" empty state when nothing needs attention
- Visibility Stats (3-tile: profile views, searches, vouches)
- Recent Vouches
- Share Profile CTA
- My Network summary row (above Share Profile)

**Entry Points:**
- App launch (partner role, flag on)
- Bottom tab

**Exit Points:**
- → ActiveDealCard expanded (inline — milestone tapping, alert composer)
- → PartnerDealsScreen ("View all N deals →") — tab navigate
- → ChatScreen (Message) — cross-stack to InboxStack
- → ProfileTab ("Share Profile") — tab navigate

---

#### PartnerDealsScreen
**File:** `features/partners/components/PartnerDealsScreen.tsx`
**Role:** Partner only
**Nav Type:** Tab root (Deals tab for partner, replaces Find tab)
**Feature Flag:** PARTNER_TRACK_ENABLED: true
**Wiring:** ✅ Live (usePartnerActiveDeals → rpc_get_partner_active_deals)

**What's on this screen:**
- All active deals expanded by default, sorted by closing date
- Filter chips: All · Needs attention · Closing soon (≤14 days)
- Grouped sections: Closing within 14 days + Active
- ActiveDealCard per deal

**Entry Points:**
- Bottom tab (partner)
- HomeTabPartner → "View all N deals →"

**Exit Points:**
- ← Back / bottom tab navigation

---

### 🎓 ONBOARDING STACK

---

#### OnboardingScreen1 (Splash)
**Role:** New users (all roles)
**Nav Type:** Stack screen (replaces main stack until onboarded_at set)
**Wiring:** ✅ Live

**Exit Points:**
- → OnboardingRoleSelect

---

#### OnboardingRoleSelect
**File:** `OnboardingRoleSelect.tsx`
**Role:** New users (step 2/5 agent, 2/6 contractor)
**Nav Type:** Stack screen
**Wiring:** ✅ Live

**What's on this screen:**
- 3 large tappable cards: Agent / Contractor / Partner
- GradientIconBox icons, haptic feedback, pressed state (blue border + scale)

**Exit Points:**
- → Onboarding3 (Agent/Partner path)
- → ContractorProfileBasics (Contractor path)

---

#### ContractorProfileBasics
**File:** `ContractorProfileBasics.tsx`
**Role:** Contractor only (step 3/6)
**Nav Type:** Stack screen
**Wiring:** ✅ Live

---

#### ContractorTradeStep
**File:** `ContractorTradeStep.tsx`
**Role:** Contractor only (step 4/6)
**Nav Type:** Stack screen
**Wiring:** ✅ Live

**What's on this screen:**
- 25-trade chip grid (General Contractor at top)
- Primary trade required, 2 secondary optional
- Dynamic helper text

---

#### ContractorDetailsStep
**File:** `ContractorDetailsStep.tsx`
**Role:** Contractor only (step 5/6)
**Nav Type:** Stack screen
**Wiring:** ✅ Live

**What's on this screen:**
- Denver Metro preset + radius pills (10/25/50mi)
- License & Insurance toggle rows

---

#### OnboardingComplete
**Role:** All roles (step 5/5 or 6/6)
**Nav Type:** Stack screen → transitions to main tab navigator
**Wiring:** ✅ Live (rpc_complete_onboarding)

---

### 🗺️ NEIGHBORHOOD INTELLIGENCE STACK

---

#### ClientLifestyleScreen
**File:** `components/ClientLifestyleScreen.tsx`
**Role:** Agent only
**Nav Type:** Pushed screen (HomeStack)
**Feature Flag:** LIVE_NEIGHBORHOOD_HOOKS (false in demo)
**Wiring:** 🔴 Mock (LIVE_NEIGHBORHOOD_HOOKS: false)

**What's on this screen:**
- 16-tile category grid (lifestyle priorities)
- MAX_SELECTIONS = 6 cap
- Live counter "X of 6 selected" → warningAmber at cap
- Radius selector: 3 pills (0.5mi / 1mi / 2mi, default 1mi)
- Accepts initialPriorities param (from AddressComparisonScreen back-nav)

**Exit Points:**
- → NeighborhoodMatchScreen (submit)

---

#### NeighborhoodMatchScreen
**File:** `components/NeighborhoodMatchScreen.tsx`
**Role:** Agent only
**Nav Type:** Pushed screen (HomeStack)
**Feature Flag:** LIVE_NEIGHBORHOOD_HOOKS
**Wiring:** 🔴 Mock

**What's on this screen:**
- Composite score ring
- Score bars per category (animated)
- YOUR PRIORITIES section
- "Compare Addresses" CTA card → AddressComparisonScreen
- NEARBY section (POIs)

**Exit Points:**
- → AddressComparisonScreen ("Compare Addresses") — fullScreenModal
- → CategoryMapScreen (map chip per POI category)
- ← Back

---

#### AddressComparisonScreen
**File:** `components/AddressComparisonScreen.tsx`
**Role:** Agent only
**Nav Type:** fullScreenModal (slide_from_bottom)
**Feature Flag:** LIVE_NEIGHBORHOOD_HOOKS
**Wiring:** 🔴 Mock

**What's on this screen:**
- Phase 1: first address (read-only) + up to 2 additional address inputs + "Compare" CTA
- Phase 2: winner callout banner + ranked comparison cards
- Comparison card: rank badge, address, composite score, 2-col score grid, map chip row
- "← Edit priorities" link → ClientLifestyleScreen (passes initialPriorities)

**Exit Points:**
- → ClientLifestyleScreen ("← Edit priorities") — navigate with initialPriorities param
- → CategoryMapScreen (map chip)
- ← X → goBack()

---

### 🆕 S129 NEW SCREENS (TO BUILD)

---

#### PaymentSettingsScreen *(NEW — S129)*
**File:** `components/PaymentSettingsScreen.tsx` (to be created)
**Role:** Contractor only
**Nav Type:** Pushed screen (ProfileStack via SettingsScreen)
**Feature Flag:** None
**Wiring:** 🟡 Live (Stripe Connect onboarding URL call to Edge Function)

**What will be on this screen:**
- Status card: "Not connected" (amber) / "Connected ✓" (green) based on stripe_connected column
- Explanation of what Stripe is and why it's needed (plain language)
- "Set up payments" PrimaryButton → launches Stripe-hosted onboarding in browser
- After return: refresh stripe_connected status
- Connected state: bank/card last 4, "Update payment method" secondary link

**Entry Points:**
- SettingsScreen → Payment row (NEW row to add)
- ContractorHomeTab → Stripe banner CTA (deep link to this screen)

**Exit Points:**
- Stripe onboarding URL → external browser (closing.atlasioapp.com/stripe-return page)
- ← Back → SettingsScreen

---

## 3. Navigation Stack Summary

```
RootNavigator
├── OnboardingStack (if !profile.onboarded_at)
│   ├── Onboarding1
│   ├── OnboardingRoleSelect
│   ├── Onboarding3 (agent/partner path)
│   ├── Onboarding4
│   ├── OnboardingComplete
│   ├── ContractorProfileBasics (contractor path)
│   ├── ContractorTradeStep
│   ├── ContractorDetailsStep
│   └── OnboardingComplete
│
└── MainTabNavigator (if onboarded_at set)
    │
    ├── HomeTab (HomeStack)
    │   ├── HomeTabAgent / ContractorHomeTab / HomeTabPartner [root]
    │   ├── AgentJobDetailScreen [push]
    │   ├── AgentDealDetailScreen [push]
    │   ├── AgentDealsScreen [push]
    │   ├── DealCreation (DealCreationSheet) [fullScreenModal]
    │   ├── DealClosedCelebrationScreen [fullScreenModal]
    │   ├── ClosedDealsScreen [push]
    │   ├── RepairJobDetails [push]
    │   ├── EditRepairJob [push]
    │   ├── PostJobWizard [fullScreenModal]
    │   ├── PostPhotoJobScreen [fullScreenModal]
    │   ├── PostStagingJobScreen [fullScreenModal]
    │   ├── SendSquadScreen [fullScreenModal]
    │   ├── ClientLifestyleScreen [push]
    │   ├── NeighborhoodMatchScreen [push]
    │   ├── AddressComparisonScreen [fullScreenModal]
    │   ├── ContractorJobDetails [push — also in JobsStack]
    │   ├── BidSubmissionScreen [fullScreenModal]
    │   └── JobCompletionScreen [fullScreenModal]
    │
    ├── FindTab (FindStack) — Agent only
    │   ├── FindMain [root]
    │   └── ProProfile [push]
    │
    ├── JobsTab (ContractorJobsStack) — Contractor only
    │   ├── JobTrackerTab [root]
    │   ├── ContractorJobDetails [push]
    │   ├── BidSubmissionScreen [fullScreenModal]
    │   └── JobCompletionScreen [fullScreenModal]
    │
    ├── DealsTab (PartnerDealsStack) — Partner only [PARTNER_TRACK_ENABLED]
    │   └── PartnerDealsScreen [root]
    │
    ├── NetworkTab (NetworkStack)
    │   ├── NetworkMain [root]
    │   └── ProProfile [push]
    │
    ├── InboxTab (InboxStack)
    │   ├── InboxList / ContractorInboxList [root]
    │   ├── ChatScreen [push]
    │   └── NewMessageScreen [push]
    │
    └── ProfileTab (ProfileStack)
        ├── ProfileMain [root]
        ├── EditProfileScreen [push]
        ├── SettingsScreen [push]
        ├── PaymentSettingsScreen [push — S129 NEW]
        ├── VerificationScreen [fullScreenModal]
        └── InsuranceUploadScreen [fullScreenModal]
```

---

## 4. S129 Dependency Checklist

Before building PaymentSettingsScreen, confirm:

| Item | Status | Action |
|---|---|---|
| `stripe-connect-onboarding` Edge Function | ❓ Unconfirmed | Check Supabase Dashboard → Edge Functions |
| `profiles.stripe_connected` column | ❓ Unconfirmed | Run SQL audit query |
| Return URL page (`closing.atlasioapp.com/stripe-return`) | 🔴 Not built | Build simple static page in atlasio-closing |
| `useStripeConnect` hook | 🔴 Not built | Build this session |
| SettingsScreen — Payment row added | 🔴 Not built | Build this session |
| ContractorHomeTab — Stripe banner | 🔴 Not built | Build this session |

---

## 5. Screens with Open @demo Markers (Pre-Launch)

| Screen | @demo Item | @backend Target |
|---|---|---|
| HomeTabAgent | Subtitle "Y jobs posted" only — active deals count deferred | rpc_get_agent_dashboard_stats |
| DealClosedCelebrationScreen | Animations restored S139b — core RN Animated (trophy bounce, confetti burst, card fade-in) | rpc_mark_deal_closed (DEAL_CREATION_ENABLED) |
| ClosedDealsScreen | 3 mock deals | rpc_get_closed_deals (S-PHASE2-01) |
| JobTrackerTab | 9 mock jobs | rpc_get_contractor_jobs (S130) |
| ContractorHomeTab | Earnings/market stats, progress bars | rpc_get_contractor_earnings, rpc_get_market_data |
| ProfileTab | Stats tiles (all roles), partner profile (Sarah Chen mock) | rpc_get_profile_stats |
| SendSquadScreen | 1500ms mock send | send-squad-email + send-squad-sms Edge Functions |
| AgentDealsScreen | All deals mock | rpc_get_agent_deals (S130) |
| ClientLifestyleScreen | All scores mock | LIVE_NEIGHBORHOOD_HOOKS (places API) |
| PostPhotoJobScreen | p_title auto-generated, sqft not sent | Add title TextInput, add sqft param |
| PostStagingJobScreen | p_due_date is timeline key not ISO | Replace with DatePicker |
| InboxList | Pin/Mute backend | rpc_pin_thread, rpc_mute_thread |
| ContractorInboxList | Thread delete | rpc_delete_chat_thread |

---

*Generated S129 — April 4, 2026*
*Next update: after S129 build complete (add PaymentSettingsScreen entry)*
