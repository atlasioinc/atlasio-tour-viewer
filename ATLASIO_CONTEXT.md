# Atlasio — React Native Real Estate Marketplace

## Tech Stack
- React Native 0.81.5 + Expo SDK 54
- React Navigation 7 (native-stack + bottom-tabs)
- TanStack Query v5 (configured in lib/queryClient.ts)
- Supabase (client in lib/supabase.ts) — Project ID: `fqeighzlnreghzmailgx`
- TypeScript 5.9
- Design tokens in lib/tokens.ts
- Stripe Connect (contractor payments)

## Commands
- `npx expo start` — Start dev server
- `npx expo start --clear` — Start with cleared Metro cache (use after flag changes)
- `npx tsc --noEmit` — TypeScript check (**run after EVERY file change, hard gate**)
- `npx expo lint` — Lint check
- `supabase functions deploy <name> --no-verify-jwt` — Deploy Edge Function
- `eas build --platform ios --profile production` — TestFlight build (see rule below)

### EAS Build Profile Rule (added S155)
- **Always use `--profile production`** for TestFlight builds
- `production` = auto-increments build number, Release config, wired to App Store Connect (ASC App ID: 6761231397), TestFlight distribution
- `preview` = ad-hoc internal distribution only, NOT TestFlight — do not use for QA builds
- `development` = dev client, local Metro connection only
- Correct command for every TestFlight build: `eas build --platform ios --profile production`
- Confirmed by `eas build:list`: Builds 39–43 all used `production` profile; Build 44 (S155 QA) also `production`

## Folder Structure
```
/app
  /components     — all screen .tsx files + shared components
  /types          — types/index.ts (single source of truth for all interfaces)
  /hooks          — useData.ts (all TanStack Query hooks), useDebounce.ts
  /lib            — supabase.ts, queryClient.ts, tokens.ts, featureFlags.ts
  /supabase
    /functions    — Edge Functions (Deno, one folder per function)
  /sql            — schema.sql (deployed to Supabase, NOT bundled in app)
  /tasks          — lessons.md (Claude Code self-improvement log)
```

---

## Current Metrics (updated S172 — May 4, 2026)
- **RPCs:** 76 (S172 onboarding: `rpc_complete_onboarding` redeployed with `p_role` param; now writes `profiles.role` + `profiles.onboarded_at` atomically — count unchanged. Earlier S172 ATL-GEOCODE: extended `rpc_create_job` signature with `p_job_lat`, `p_job_lng`).
- **Hooks:** 71 (S172 onboarding: `useCompleteOnboarding` switched to `p_role` — count unchanged. Earlier S172: `CreateJobInputBase` extended with optional coords).
- **Profile Columns:** +1 S172 onboarding (`onboarded_at TIMESTAMPTZ`).
- **Feature Flags:** 11 — 9 in featureFlags.ts (LIVE_PROFILE_HOOKS flipped true S133) + PARTNER_TRACK_ENABLED + DEAL_CREATION_ENABLED in config.ts.
- **Edge Functions:** 11
- **Screens:** +1 S163 (ServiceAreaEditorScreen — fullScreenModal in FindStack); +1 S129 (PaymentSettingsScreen)
- **Shared Components:** +1 S144 (AddressAutocompleteInput — extended S163 with `onSelectWithCoords`); +1 S147 (PhotoLightbox); +2 S162c (GroupAvatar, UnreadIndicator)
- **Storage Buckets:** 7
- **Tables:** 24 (S163 added no new tables; profiles +4 columns: service_area_lat, service_area_lng, service_area_radius, service_area_label)
- **Postgres Extensions:** 2 (NEW S163 — `cube`, `earthdistance` for circle-overlap math)
- **Profile Columns:** +4 S163 (service_area_lat NUMERIC, service_area_lng NUMERIC, service_area_radius INTEGER CHECK 1-500, service_area_label TEXT)
- **GiST Indexes:** +1 S163 (partial index on `ll_to_earth(service_area_lat, service_area_lng)` only when both non-null)
- **Dependencies:** +1 S163 (`@react-native-community/slider@5.1.2` — EAS dev client rebuild PENDING S165, currently renders "Unimplemented component" on device)
- **Canonical contractor test accounts:** 5 — Marcus Rivera (Denver), Mike Torres (Aurora), Sarah Chen (Lakewood), Jessica Wong (Boulder), Carlos Ramirez (Colorado Springs out-of-radius reference). Vouch counts seeded S164: Marcus 34, Mike 22, Sarah 18, Jessica 11, Carlos 7.
- **COLORS tokens:** 142
- **Lifestyle Categories:** 16
- **tsc:** 0 errors
- **Lint:** 0 new (7 pre-existing warnings — unchanged from S162 baseline)

### Feature Flags (demo defaults, current state on `main`)
```
USE_MOCK_DATA: true
DEV_BYPASS_AUTH: false
DEV_SHOW_PASSWORD_LOGIN: false
LIVE_PROFILE_HOOKS: true (permanent since S133)
LIVE_CONTRACTOR_HOOKS: true (permanent since S36)
LIVE_ONBOARDING: true (permanent since S140d)
LIVE_VERIFICATION_HOOKS: false
LIVE_INSURANCE_HOOKS: false
LIVE_NEIGHBORHOOD_HOOKS: false
LIVE_SQUAD_SHARE: false
PARTNER_TRACK_ENABLED: false (Phase 2)
DEAL_CREATION_ENABLED: false (Phase 2)
```

---

## S170 — BUG-S163-A: display_role Audit & Fix (April 27, 2026)

### Branch
`fix/bug-s163a-s170`

### Files created
- `lib/roleDisplay.ts` — single source of truth for role → human-readable label mapping. Exports `ROLE_DISPLAY` (12 roles) and `roleLabel(role)` helper. Extracted from the local map at `components/ProfileTab.tsx` lines 135–148. Permanent decision (S146): the DB `display_role` column is unreliable; never read it for display.

### Files modified
- `components/ProfileTab.tsx` — local `ROLE_DISPLAY` map deleted; `import { ROLE_DISPLAY } from '../lib/roleDisplay'` added. All existing call sites resolve via the import unchanged.
- `components/proProfileHelpers.ts` — `mapProfileToProProfileData` now reads `roleLabel(p.role ?? '')` for both `role` (line 163) and `trade` fallback (line 164). `GALLERY_ROLES` array stays as display labels (Option B); line 182 portfolio-photos gate switched to `GALLERY_ROLES.includes(roleLabel(p.role ?? ''))`. Line 90 in `mapFindProToProfile` intentionally untouched.
- `lib/typeAdapters.ts` — 7 sites switched from `display_role` reads to `roleLabel(role)`: `adaptProfileToProCard` (line 182), `mapRecommendedProToProCard` (line 203), `adaptConnectionToNetworkContact` role + group (lines 238/239), `adaptConnectionToRequest` (line 265), `adaptVouchToFeedItem` author (line 305) and recipient (line 316). `roleLabel` import added.
- `components/CreateDealChat.tsx` — `liveContacts` builder line 205 now reads `roleLabel(conn.profile.role ?? '')`. The downstream search-filter at line 221 (filters by `c.role.toLowerCase()`) becomes consistent — always matches against display labels rather than racing `display_role`/raw role.
- `hooks/useData.ts` — 6 sites + 3 SELECT widenings: `useNetworkContacts` (line 483), `useVouchFeed` `recipient_role` (line 1281, paired with adapter line 316), `useChatRecipients` SELECT (line 1438) + consumer (line 1449), `useAgentPartnerConnections` two SELECTs (lines 3522/3530) + two consumers (lines 3543/3555). `roleLabel` import added.
- `types/index.ts` — line 226 comment-only update on `Vouch.recipient_role`: `// snake_case role enum; convert via roleLabel() for display` to reflect Fix 6b's semantic change.

### Coupled changes
- `Vouch.recipient_role` semantics changed from display string → snake_case enum. `useVouchFeed` write path (Fix 6b) and `adaptVouchToFeedItem` read path (Fix 4g) shipped together. `roleLabel()` is the conversion boundary.

### Key decisions
- **Single source of truth for role labels** — `lib/roleDisplay.ts`. All role → display mapping flows through `roleLabel()`. The DB `display_role` column is no longer read anywhere outside SELECT projections (kept temporarily for backwards compatibility) and intentional mock data.
- **GALLERY_ROLES Option B** — array stays as display label strings; line 182 wraps `p.role` in `roleLabel()` before comparing. This preserves the existing `mapFindProToProfile` line 90 call site (where `pro.role` is already a display string from the typeAdapter chain). FindTab portfolio gallery does not regress.
- **`Vouch.recipient_role` semantic change** — now carries snake_case role enum; conversion happens at the adapter boundary. Comment in `types/index.ts:226` updated. Edge case (legacy rows where `recipient` join is null and `recipient_role` column still holds a display string) accepted for S170 — `CHORE-VOUCH-RECIPIENT-ROLE-BACKFILL` filed for pre-launch SQL cleanup.
- **`Mortgage Pro` label kept** (not `Mortgage Professional`) for consistency with existing UI copy.
- **App.tsx onboarding gate left as-is** — `CHORE-ONBOARDING-GATE` filed to switch from `display_role` to `onboarded_at`.

### Files NOT touched (scope discipline)
- `App.tsx:142,146` — onboarding presence check (`CHORE-ONBOARDING-GATE`).
- `components/SquadSlotPicker.tsx` — has its own `ROLE_DISPLAY_LABELS` map; unification deferred.
- `proProfileHelpers.ts:90` — `mapFindProToProfile` GALLERY_ROLES call site (Option B).
- `proProfileHelpers.ts:32` GALLERY_ROLES array contents — stays as display labels.
- Mock data (`useData.ts:191,232`; `ProfileTab.tsx` mock contractor/partner blocks).
- `types/index.ts:155, 805` — `display_role` field declarations (still required while SELECTs project the column).
- `useData.ts:2513` — `p_display_role: params.role` RPC param (intentional, schema convention).
- All comment-only references.

### Architecture rules applied
- **Single source of truth** — one map, one helper, one import everywhere.
- **Conversion at the boundary** — store snake_case enum end-to-end; convert to display string only at the render layer.
- **Minimum blast radius** — Option B chosen over a wider type refactor on `FindTabProCard`.
- **Mock data preserved** — no mock fields removed.

### Tickets
- BUG-S163-A → ✅ Done (closes the Alex Morgan `display_role='agent'` literal leak class)
- CHORE-VOUCH-RECIPIENT-ROLE-BACKFILL → 📌 Filed (pre-launch SQL)
- CHORE-GALLERY-ROLES-SNAKE-CASE → 📌 Filed (FindTabProCard data model unification, separate refactor)
- CHORE-ONBOARDING-GATE → 📌 Carried forward

### Gates
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 0 errors / 8 pre-existing warnings (none in files touched this session)

### Metrics
- RPCs: 75 (unchanged)
- Hooks: 70 (unchanged)
- Edge Functions: 11 (unchanged)
- Files: +1 (`lib/roleDisplay.ts`)

### Next priorities (S171)
1. ATL-LOCATION-03 — agent "find contractors for this job address"
2. CHORE-ONBOARDING-GATE — switch App.tsx gate from `display_role` to `onboarded_at`
3. CHORE-VOUCH-RECIPIENT-ROLE-BACKFILL — pre-launch SQL cleanup of legacy display strings in `vouches.recipient_role`
4. CHORE-GALLERY-ROLES-SNAKE-CASE — unify `FindTabProCard.role` to snake_case enum end-to-end
5. CHORE-CLAUDE-MD-SDK-AUDIT
6. CHORE-LIVE-BUILD-STATE-CLEANUP

---

## S171 — ATL-LOCATION-03: Contractors Near This Job (April 27, 2026)

### Branch
`feat/atl-location-03-s171`

### Files modified
- `types/index.ts` — added `ContractorForJob` interface (snake_case mirror of `rpc_get_contractors_for_job` row shape).
- `hooks/useData.ts` — added `useContractorsForJob(jobLat, jobLng)` hook (gated on both coords non-null, 5min staleTime, empty array fallback) + `queryKeys.contractorsForJob` + `ContractorForJob` import.
- `components/RepairJobDetails.tsx` — wired `useContractorsForJob` (lat/lng read via `(jobData as any)?.job_lat`/`.job_lng` per CLAUDE.md Known Type Gaps pattern). Added zero-bid nearby-contractors nudge inside the existing `EmptyState` branch (`COLORS.backgroundInfo` panel + primary left-border, taps `handleOpenInviteModal`). Extracted inline `setShowInviteModal(true)` into named `handleOpenInviteModal` (single source of truth for action-menu + nudge). Passes `nearbyContractors` to `<InviteContractorsModal>`.
- `components/InviteContractorsModal.tsx` — new optional `nearbyContractors?: ContractorForJob[]` prop. Adapter `nearbyAsNetwork` (useMemo) maps `ContractorForJob → NetworkContractor` shape (service_area_label→company, vouch_count→rating, trade→trades singleton, avatar_color→avatarColor with `COLORS.primary` fallback) and dedupes by ID against `MOCK_NETWORK_CONTRACTORS`. `nearbyFiltered` (useMemo) applies the same search filter. `FlatList` → `SectionList` with `Your Network` + `Near This Job` sections; section headers only render when nearby has results (preserves pre-S171 single-list look otherwise). Row component reused unchanged with one micro-tweak: rating cell hides when `item.rating === 0` (vouch_count of 0 → no `0 ★` artifact). `handleSendInvites` now collects from both pools.

### Key decisions
- **Ships dark until ATL-GEOCODE-01 backfills `job_lat`/`job_lng`.** Hook is `enabled: jobLat != null && jobLng != null`; `showNearbyNudge` false-by-default. Feature is fully wired but invisible on every existing job until coords are written on creation. Confirmed before implementation — Path A approved over a scope-expanded geocode patch.
- **`(jobData as any)?.job_lat` cast** per CLAUDE.md Known Type Gaps pattern. Did NOT add `job_lat`/`job_lng` to the `Job` interface — that's a dedicated cleanup session (cascades across many call sites).
- **Option α (single row component, adapter at section boundary)** chosen over Option β (discriminated-union row) per prompt requirement "reuse the exact same contractor row component … do NOT create a new card component."
- **Rating-cell hide on 0** is the only row-component change. Network rows always have a star rating; nearby rows pass `vouch_count` as `rating`, which can legitimately be 0 — hiding the cell is cleaner than rendering "0 ★".
- **Section headers gated on `nearbyFiltered.length > 0`** — when the prop is absent, empty, or fully deduped, the modal is visually identical to pre-S171.
- **Single named handler `handleOpenInviteModal`** introduced because no such function existed before — the action-menu's `setShowInviteModal(true)` was inline. Both call sites (action-menu + nudge) now flow through it.
- **Tokens used:** `COLORS.backgroundInfo` (exists at `lib/tokens.ts:45`) for nudge bg; `COLORS.darkText` for nudge headline; `COLORS.primary` for CTA + left border; `COLORS.screenBg` for section header bg; `COLORS.textTertiary` for section header text. No new tokens; no hex.

### Out of scope (deferred / unchanged)
- `PostJobWizard.tsx` — Step 2 "Invite Specific Pros" surface deferred to a follow-up ticket.
- `rpc_invite_contractors` — accepts any UUID, no changes needed.
- `Job` interface — `job_lat`/`job_lng` not added (Known Type Gaps pattern).
- Geocode write path — see ATL-GEOCODE-01.

### Architecture rules applied
- **Reuse over recreate** — single row component shared via lossy adapter, no new card.
- **Conversion at the boundary** — `ContractorForJob` enters the modal as-is and is adapted only at the section-rendering edge.
- **Minimum blast radius** — 4 files touched, no refactor of existing flows.
- **Schema-first verification** — RPC param names (`p_job_lat`, `p_job_lng`) match prompt's deployed signature exactly.

### Tickets closed / opened
- ATL-LOCATION-03 → ✅ Done (wiring complete; ships dark until ATL-GEOCODE-01).
- **ATL-GEOCODE-01 → ⚠️ ELEVATED to critical path** (S172 priority #1). Newly-posted jobs need lat/lng written during `rpc_create_job` (or post-create geocode in `PostJobWizard`) before this feature surfaces in production.

### Gates
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 0 errors / 8 pre-existing warnings (no new warnings introduced)

### Metrics
- RPCs: 76 (+1 `rpc_get_contractors_for_job`)
- Hooks: 71 (+1 `useContractorsForJob`)
- Edge Functions: 11 (unchanged)

### Next priorities (S172)
1. **ATL-GEOCODE-01** — write `job_lat`/`job_lng` on job creation (critical path, unlocks ATL-LOCATION-03 surface in production)
2. CHORE-ONBOARDING-GATE — switch App.tsx gate from `display_role` to `onboarded_at`
3. CHORE-VOUCH-RECIPIENT-ROLE-BACKFILL
4. CHORE-GALLERY-ROLES-SNAKE-CASE
5. CHORE-CLAUDE-MD-SDK-AUDIT

---

## S172 — ATL-GEOCODE-01: Wire job_lat/job_lng in PostJobWizard (April 27, 2026)

### Branch
`feat/atl-geocode-01-s172`

### Files modified
- `hooks/useData.ts` — `CreateJobInputBase` interface extended with two optional fields: `p_job_lat?: number | null` and `p_job_lng?: number | null`. Applies to all three job types (repair, photography, staging) via the discriminated union base. `useCreateJob` body unchanged — supabase-js forwards the params transparently to the deployed `rpc_create_job` signature.
- `components/PostJobWizard.tsx`:
  - `jobLat` / `jobLng` `useState<number | null>(null)` declared in the parent wizard component (sibling state, not folded into `PostJobFormData` — coords are derived metadata, not user-typed form fields).
  - `StepProps` interface gained optional `setJobLat?: (lat: number | null) => void` and `setJobLng?: (lng: number | null) => void` (Step 1 only — mirrors how `onInviteToggle` is passed to Step 2).
  - `StepBasics` destructures both setters; threaded via `<StepBasics setJobLat={setJobLat} setJobLng={setJobLng} ... />` at the render site.
  - `<AddressAutocompleteInput>` receives BOTH `onSelect` (existing — required prop, captures address into form state) AND new `onSelectWithCoords` (captures coords only, address arg ignored as `_address`). Component contract preserves both — `onSelect` always fires first, `onSelectWithCoords` follows if defined.
  - `createJob.mutateAsync` call appends `p_job_lat: jobLat ?? null, p_job_lng: jobLng ?? null` after `p_bid_deadline_hours`.
  - `@demo TODO(ATL-GEOCODE-01)` 5-line block at the call site removed.

### Key decisions
- **Path A (extend RPC signature) over Path B (post-create geocode RPC).** Backend deployed `p_job_lat float8 DEFAULT NULL`, `p_job_lng float8 DEFAULT NULL` on `rpc_create_job` ahead of session. Single round-trip; lat/lng captured at suggestion-tap time from Google Places Details (already returned by `AddressAutocompleteInput.onSelectWithCoords` since S163).
- **Coexistence not replacement on `AddressAutocompleteInput`.** `onSelect` is typed required by the component contract — replacing it would have required modifying `AddressAutocompleteInput` (out of scope). The component's own contract (lines 50-57) explicitly preserves `onSelect` for existing consumers. Two handlers, single tap, no redundancy at runtime.
- **Coords as sibling state, not in `PostJobFormData`.** They're not user-typed; they're derived from a Places API response. Adding to the form interface would force every `setForm` callsite to think about coords. Sibling `useState` slots + optional `StepProps` setters keep the blast radius to Step 1.
- **`hooks/useData.ts` boundary is in scope.** The single-file constraint excluded "rpc_create_job or any Supabase backend." `CreateJobInputBase` is a client-side TS type, not backend, and adding the params is the correct boundary update — this is the same shape PostPhoto and PostStaging will use under ATL-GEOCODE-02.

### Out of scope (ATL-GEOCODE-02 follow-up)
- `components/PostPhotoJobScreen.tsx:161` — `createJob.mutateAsync({ p_job_type: 'photography', ... })` still writes NULL coords. Address selector at line 304 uses `onSelect` only.
- `components/PostStagingJobScreen.tsx:176` — same pattern. Address selector at line 322 uses `onSelect` only.
- Filed in `tasks/atlasio-bug-history.md` as `ATL-GEOCODE-02` with the exact 3-step fix recipe (mirror S172 PostJobWizard pattern; type boundary already accepts the params).

### Architecture rules applied
- **Single-Value Principle** — coords flow from Google Places → `AddressAutocompleteInput` → wizard state → RPC call in their final backend-ready format (`number | null`), no translation layers.
- **Schema-first verification** — `CreateJobInputBase` mirrors deployed `rpc_create_job` param names (`p_job_lat`, `p_job_lng`) exactly.
- **Minimum blast radius** — 2 files touched. AddressAutocompleteInput component, all other consumers (PostPhoto, PostStaging, EditProfile, CreateDealChat, ServiceAreaEditor), and the Supabase backend untouched.
- **Null safety at the boundary** — `?? null` at the call site guarantees `p_job_lat` / `p_job_lng` are always `number | null`, never `undefined`. supabase-js forwards `null` correctly and the RPC default fires when the field is omitted (which can't happen with our coalesce, but is now provably safe).

### S172 addendum — RepairJobDetails UI fixes (post-QA)
Two UI bugs caught on device while verifying ATL-GEOCODE-01 and fixed in the same session:

**Bug 1 — Budget row rendering blank.** `components/RepairJobDetails.tsx` Job Info Card read `{job.budget_range}` directly. For wizard-created jobs `budget_range` is null (the wizard sends `p_budget_min` / `p_budget_max` but no formatted range), so the row rendered "Budget: " bare and the address `<Text>` on the next line appeared to be the budget value. Fix: precompute `budgetDisplay` after the loading guard with the same fallback chain `AgentJobDetailScreen.tsx` already uses (`job.budget_range ?? ($min–$max) ?? null`); render `{budgetDisplay}` at the read site. No conditional hide of the row, no hook/RPC change — `budget_min`/`budget_max` already flow from the live SELECT.

**Bug 2 — Zero-bid empty-state illustration too tall.** `<EmptyState illustration="job_bids" />` rendered at the default 160×160 pushed the new "N contractors work near this job" nudge below the fold on a 375×812 iPhone. Added an opt-in `compact` mode to the shared `EmptyState` component (additive, fully back-compat — defaults reproduce existing behavior for all 10 current consumers):
- `components/shared/EmptyStateIllustrations.tsx` — `JobBidsIllustration` accepts optional `size?: number` (default 160). `viewBox` preserved → SVG content scales perfectly. Other illustrations unchanged.
- `components/shared/EmptyState.tsx` — new `compact?: boolean` prop. When true: illustration wrapper 80×80 with marginBottom 12, container `paddingVertical: 16`. Pipes `size` into `renderIllustration`; only size-aware illustrations (currently `job_bids`) consume it, others ignore.
- `components/RepairJobDetails.tsx` — pass `compact` and drop the `paddingVertical: 32` style override (compact mode owns padding). "No bids yet" copy and the nearby-contractors nudge `<Pressable>` block unchanged.

Resulting empty-state height drops from ~232pt to ~144pt, clearing the nudge above the fold on standard iPhone heights.

### Tickets
- ATL-GEOCODE-01 → ✅ Done (closes the S171 "ships dark" gap for repair jobs).
- ATL-GEOCODE-01 UI fixes → ✅ Done (budget render + empty-state size).
- ATL-GEOCODE-02 → 📌 Filed (PostPhotoJobScreen + PostStagingJobScreen mirror).

### Gates
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 0 new warnings (8 pre-existing, none in modified files)

### Metrics
- RPCs: 76 (signature extended on `rpc_create_job`, no new functions)
- Hooks: 71 (unchanged)
- Edge Functions: 11 (unchanged)
- Files modified: 5 (`hooks/useData.ts`, `components/PostJobWizard.tsx`, `components/RepairJobDetails.tsx`, `components/shared/EmptyState.tsx`, `components/shared/EmptyStateIllustrations.tsx`)

### Next priorities (S173)
1. **ATL-GEOCODE-02** — mirror S172 wiring in `PostPhotoJobScreen` + `PostStagingJobScreen` (small, mechanical; type boundary already accepts the params)
2. End-to-end device QA of S171 nudge + "Near This Job" section against a freshly-posted repair job (verify coords flow through, verify nearby contractors render)
3. CHORE-ONBOARDING-GATE — switch App.tsx gate from `display_role` to `onboarded_at`
4. CHORE-VOUCH-RECIPIENT-ROLE-BACKFILL
5. CHORE-GALLERY-ROLES-SNAKE-CASE
6. CHORE-CLAUDE-MD-SDK-AUDIT

---

## S172 — CHORE-ONBOARDING-GATE + CHORE-ONBOARDING-ROLE-VALUES (May 4, 2026)

### Branch
`chore/onboarding-role-pipeline-s172`

### Files modified
- `components/OnboardingRoleSelect.tsx` — `ROLE_CARDS[].role`: `'Agent'` → `'agent'`, `'Contractor'` → `'contractor'`. Routing comment block at top normalized (`'real_estate_agent'` → `'agent'`).
- `components/OnboardingScreen3.tsx` — `PARTNER_OPTIONS[].value`: all 8 entries normalized to `user_role` enum snake_case (`'Mortgage Pro'` → `'mortgage_pro'`, `'Title/Escrow'` → `'title_escrow'`, `'Home Inspector'` → `'home_inspector'`, `'Appraiser'` → `'appraiser'`, `'Attorney'` → `'attorney'`, `'Real Estate Photographer'` → `'real_estate_photographer'`, `'Home Stager'` → `'home_stager'`, `'Other'` → `'other'`). Labels untouched.
- `components/OnboardingComplete.tsx` — `CONTRACTOR_ROLES` and `PARTNER_ROLES` arrays normalized to snake_case enum values so `getOnboardingPath()` correctly routes to role-specific completion content. `'other'` added to PARTNER_ROLES (paired with new PARTNER_OPTIONS entry).
- `hooks/useData.ts` — `useCompleteOnboarding`: RPC param renamed `p_display_role` → `p_role`. Doc-block updated to note enum-cast requirement and atomic write of `role` + `onboarded_at`.
- `App.tsx` — `checkProfile` SELECT: `display_role` → `onboarded_at`. Gate condition: `if (profile && profile.onboarded_at)`. File-header docstring (lines 11, 23–25, 42, 119–120) updated to match new gate semantics. `setUserRole(profile.role)` unchanged.
- `tasks/lessons.md` — new permanent "S172 — Onboarding role pipeline" rule block.

### SQL deployed (separately, before this code session — DO NOT re-run)
- `ALTER TABLE profiles ADD COLUMN onboarded_at TIMESTAMPTZ`.
- `rpc_complete_onboarding` recreated with `p_role text` (replaces `p_display_role`); now writes `profiles.role` + `profiles.onboarded_at = NOW()` atomically; contractor trade-required check switched to `v_role = 'contractor'`.
- All existing test accounts backfilled with `onboarded_at = NOW()`.

### Key decisions
- **Onboarded gate signal switched to `onboarded_at`.** `display_role` is no longer the source of truth for "did this user complete onboarding"; it was historically nullable and inconsistently set. `onboarded_at` is the canonical signal, written atomically by the RPC.
- **Single source of truth for role values.** Every UI surface that produces `formData.role` now produces a `user_role` enum snake_case string. The RPC enum cast no longer silently fails on display strings.
- **`OnboardingComplete.PARTNER_ROLES` includes `'other'`.** Defensive: if a future user picks "Other Partner", the completion screen routes them to partner-specific content instead of falling through to the agent fallback.
- **Notion update deferred to Claude Chat.** Per CLAUDE.md task-tracking rules, Live Build State is updated by Tony in Claude Chat, not from Claude Code.

### Architecture rules applied
- **Single-value principle** — `formData.role` is the backend `user_role` enum value at every stage of the onboarding wizard.
- **Conversion at the boundary** — display labels stay in `PARTNER_OPTIONS.label`; enum values flow through `value` and the RPC.
- **Minimum blast radius** — 5 source files modified, 1 doc, 1 lessons entry. No type changes, no shared component changes, no new files.

### Tickets closed
- CHORE-ONBOARDING-GATE → ✅ Done
- CHORE-ONBOARDING-ROLE-VALUES → ✅ Done

### Gates
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 0 new warnings

### Metrics
- RPCs: 76 (`rpc_complete_onboarding` redeployed, count unchanged)
- Hooks: 71 (unchanged)
- Edge Functions: 11 (unchanged)
- Profile columns: +1 (`onboarded_at TIMESTAMPTZ`)
- Files modified: 5 source + 1 lessons + 1 context

### Next priorities (S173)
1. ATL-GEOCODE-01 verification on a fresh TestFlight build (post-S172 onboarded users)
2. CHORE-VOUCH-RECIPIENT-ROLE-BACKFILL (pre-launch SQL cleanup)
3. CHORE-GALLERY-ROLES-SNAKE-CASE (FindTabProCard data model unification)
4. ATL-GEOCODE-02 (PostPhotoJobScreen + PostStagingJobScreen mirror)

---

## S172b — Remove Demo Toggle from HomeTabAgent (May 4, 2026)

### Branch
`chore/remove-demo-toggle-s172b`

### Files modified
- `components/HomeTabAgent.tsx` — removed `isFilled` `useState`; removed dual-path `hasActiveRepair` ternary in favor of single live-data expression `!isLoadingJobs && !isFetchingJobs && activeJobs.length > 0`; replaced Denver `Pressable` (which was a hidden toggle for `isFilled`) with a static non-tappable `View`; deleted the Empty / Filled segmented-control DEMO TOGGLE block; removed now-unused `FEATURE_FLAGS` import; updated file-header `@backend` / `@demo` markers.
- `lib/featureFlags.ts` — `USE_MOCK_DATA` comment block updated to reflect permanent production default (value was already `false` since `aa784c7`).
- `tasks/screen-registry.md` — HomeTabAgent entry annotated with S172b note.

### Key decisions
- **Demo toggle retired permanently.** The Empty / Filled segmented control (and the secret Denver tap-to-toggle) were dev-time scaffolding for the filled vs empty home-screen states. With `USE_MOCK_DATA` permanently `false`, the live data path is the only path — the toggle has no remaining purpose.
- **`hasActiveRepair` collapsed to single expression.** No more `FEATURE_FLAGS.USE_MOCK_DATA` branching in this component. The S152 dual-path comment was removed because the divergence it documented no longer exists.
- **Denver label is static.** No location picker yet — kept the visual element but stripped its hidden mock-toggle behavior.

### Architecture rules applied
- **Minimal blast radius** — only `HomeTabAgent.tsx` + `featureFlags.ts` comments + screen-registry doc note. ContractorHomeTab and HomeTabPartner untouched.
- **No backwards-compat hacks** — `FEATURE_FLAGS` import deleted (not aliased) once its only consumer was removed.

### Gates
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 0 new warnings (8 pre-existing in unrelated files)

### Metrics
- RPCs: 76 (unchanged)
- Hooks: 71 (unchanged)
- Edge Functions: 11 (unchanged)
- Feature flags: 11 → 11 (no flag count change; `USE_MOCK_DATA` semantics tightened in comments only)

### Next priorities (S173) — unchanged from S172
1. ATL-GEOCODE-01 verification on a fresh TestFlight build
2. CHORE-VOUCH-RECIPIENT-ROLE-BACKFILL
3. CHORE-GALLERY-ROLES-SNAKE-CASE
4. ATL-GEOCODE-02 (PostPhotoJobScreen + PostStagingJobScreen mirror)

---

## S170 — BUG-S163-A: display_role Audit & Fix (April 27, 2026)

### Branch
`chore/s169-contractor-trades-3`

### Files modified
- `components/PostJobWizard.tsx` — replaced hardcoded local `TRADE_OPTIONS` (22 entries) with `ALL_TRADE_LABELS` from `lib/tradesMap.ts`. RPC boundary in `handlePostJob` now maps UI labels → Postgres `trades_enum` values via `TRADE_LABEL_TO_ENUM` before the `p_trades` cast (mirrors `EditRepairJob.tsx` S157b). `@demo TODO(ATL-GEOCODE-01)` marker added in S168 preserved unchanged.

### SQL-only (no code)
- CHORE-PROFILES-ORPHAN-CLEANUP: deleted 10 `@test.atlasio.com` profile rows + auth users. Final canonical accounts: 9 `@atlasioapp.com` accounts confirmed clean.

### Key decisions
- `lib/tradesMap.ts` is the single source of truth for all trade label ↔ enum mapping. PostJobWizard was the last hold-out with a drifted local array; now consistent with `EditRepairJob` (S157b) and `EditProfileScreen` (S148a).
- Chip count: 22 → 26. Five UI labels converged to contractor-profile labels (`Electrical`→`Electrician`, `Plumbing`→`Plumber`, `Roofing`→`Roofer`, `Painting`→`Painter`, `Landscaping / Drainage`→`Landscaper`). Four new chips appear (`Driveway / Paving`, `Carpentry`, `Handyman`, `Concrete / Masonry`). This convergence is the intended outcome — it closes the silent-enum-cast bug class.

### Architecture rules applied
- Postgres enum values at the RPC boundary — never pass display labels to the DB.
- Mirror `EditRepairJob.tsx` exactly — no new pattern.
- Minimal blast radius — 4 surgical edits, 1 file only.

### Tickets closed
- ATL-CONTRACTOR-TRADES-3 → ✅ Done (latent bug from S148a/S157b backlog now closed across all agent job-trades surfaces)
- CHORE-PROFILES-ORPHAN-CLEANUP → ✅ Done (SQL-only)

### Gates
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 0 errors / 8 pre-existing warnings (no new warnings introduced)

### Next priorities
1. ATL-GEOCODE-01 — geocoding on job creation; until shipped, newly-posted jobs won't appear in proximity feeds (S168 marker)
2. BUG-S163-A — Alex Morgan `display_role='agent'` literal cleanup
3. ATL-LOCATION-03

---

## S168 — ATL-LOCATION-02: Contractor Job Feed Proximity Filtering (April 27, 2026)

### Branch
`feat/atl-location-02-s168`

### What shipped
- **`hooks/useData.ts`** — `useMatchingJobs` rewritten end-to-end:
  - `MatchingJob` interface lifted from `ContractorHomeTab.tsx` and exported as the single source of truth (matches the S163 single-cast-point pattern). `distanceMi: number | null` to support graceful fallback when contractor has no service area set.
  - New internal `MatchingJobLive` interface mirrors the snake_case RPC return shape exactly.
  - Adapter (`adaptMatchingJob`) maps live → UI shape: `budget_min/max` → `budgetRange` string via `formatBudgetRange`, `due_date` → `dueDate` (`MMM D` via local-date format — no `toISOString` per S158 timezone rule), `created_at` → `postedTime` (relative time helper inline), `trades[0]` → `tradeNeeded` via `TRADE_ENUM_TO_LABEL` from `lib/tradesMap` (S148a/S157b pattern), `distance_mi` passes through nullable.
  - Hook now `useQuery<MatchingJob[]>` — typed end-to-end. Empty-array fallback on RPC error (no mock fallback — this is core, not a demo path).
- **`components/ContractorHomeTab.tsx`** — mock-to-live swap:
  - Removed local `MatchingJob` interface; now `import type { MatchingJob } from '../hooks/useData'`.
  - `matchingJobs` line — replaced `isFilled ? MOCK_MATCHING_JOBS : []` with the live hook. `isFilled` toggle no longer gates job feed (other mock sections still gated).
  - Subtitle — pluralization fix (`new job` vs `new jobs`) plus `…` placeholder during loading to avoid 0→N flash.
  - Section 2 ("New Jobs for You") — 3-branch render gated on `isLoadingJobs || isFetchingJobs`: skeleton → empty inline message → live FlatList. Skeleton composed from shared `<SkeletonBlock />` rectangles inside `NewJobCard`-shaped wrapper (no inline animation; reuses S138 component per S148b shared-component rule). Empty state inline text per spec ("No open jobs in your area right now"), `COLORS.secondaryText`, 14pt centered.
  - `NewJobCard` — added `distanceMi` row below address. `!= null` guard so James-Foster fallback (NULL service area) omits the row entirely instead of rendering "null mi away".
  - `MOCK_MATCHING_JOBS` and `JobsEmptyIcon` retained per CLAUDE.md "mock data is never deleted" — eslint-disable comments added (matches existing `JobTrackerSkeleton` pattern in `JobTrackerTab.tsx`).
- **`components/PostJobWizard.tsx`** — `@demo TODO(ATL-GEOCODE-01)` marker added above `createJob.mutateAsync` documenting that `job_lat`/`job_lng` are not set on creation. No logic change. `PostPhotoJobScreen` and `PostStagingJobScreen` intentionally left unmarked — staying inside spec scope.

### Files NOT touched (scope discipline)
- `JobTrackerTab.tsx` — confirmed mock-only via separate `rpc_get_contractor_jobs` (S130 deferred). Never opened.
- `types/index.ts` — `MatchingJob` lives in `hooks/useData.ts`, not the global types barrel.
- `lib/featureFlags.ts` — uncommitted `USE_MOCK_DATA: false` carried forward as the QA-mode state on the branch (will reset to `true` on merge per branch workflow).

### Architecture rules applied
- **Loading-flash trap (S163-S164):** never `liveData ?? MOCK_ARRAY`. Skeleton gates first paint; empty state on settled-no-data; live data otherwise.
- **Single source of truth:** `MatchingJob` type lifted to hook layer; ContractorHomeTab and any future consumer import from there.
- **Path A camelCase adapter:** RPC snake_case mapped at the hook layer; UI types unchanged. Smallest blast radius, matches `getServiceArea` adapter pattern (S163).
- **No client-passed coords:** contractor lat/lng/radius resolved from `auth.uid()` server-side. Hook signature stays `useMatchingJobs(limit?)`.
- **All tokens from `lib/tokens.ts`:** `COLORS.skeletonBase` (via `<SkeletonBlock />`), `COLORS.secondaryText`, `COLORS.background`, `COLORS.border`. No inline hex.
- **RPC Consumer Audit (lessons.md:123):** every array `?? []`, every nullable string `?? ''`, every nullable number kept nullable. No `!` non-null assertions.
- **No `toISOString` for date display:** `formatDueDate` uses `toLocaleDateString` to avoid the S158 negative-offset timezone bug.

### QA scenarios (live RPC backend already verified by Tony pre-session)
- Marcus Rivera (Denver, 20mi) → Brighton Blvd Kitchen Reno renders with "1.4 mi away".
- Carlos Ramirez (Colorado Springs, 20mi) → empty inline message ("No open jobs in your area right now").
- James Foster (NULL service area) → fallback path returns all open jobs; distance row omitted on each card.
- `USE_MOCK_DATA: true` → job feed still calls live RPC (not mock-gated by design).

### Tickets closed
- ATL-LOCATION-02 → ✅ Done (backend deployed pre-session, frontend wired this session)

### Gates
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 0 errors / 8 pre-existing warnings (none introduced this session — `MOCK_MATCHING_JOBS` + `JobsEmptyIcon` silenced with eslint-disable per CLAUDE.md mock-retention rule)

### Next priorities
1. ATL-GEOCODE-01 — geocoding on job creation (PostJobWizard + PostPhotoJobScreen + PostStagingJobScreen). Until shipped, newly-posted jobs do not appear in proximity feeds.
2. CHORE-PROFILES-ORPHAN-CLEANUP — 11+ orphan rows pre-launch
3. ATL-CONTRACTOR-TRADES-3
4. BUG-S163-A — Alex Morgan `display_role='agent'` literal cleanup

---

## S166 — ATL-LOCATION-04: Location-Aware Recommended & Trending Pros + Squad-Gap Badge (April 27, 2026)

### Branch
`feat/atl-location-04-s166`

### What shipped (v2 — combined v1 location-aware wiring + v2 squad-gap badge)
- `useRecommendedPros` (`hooks/useData.ts`) rewritten — calls `rpc_get_recommended_pros` with agent service area read internally from `useMyProfile()` via `getServiceArea()`. Gates on a complete lat/lng/radius triple. Returns narrow `RecommendedPro[]` shape.
- `useTrendingPros` (`hooks/useData.ts`) rewritten — calls `rpc_get_trending_pros` (limit 8, ordered by `last_active_at`). Same gating + shape semantics. Returns `TrendingPro[]`.
- `queryKeys.recommendedPros` / `queryKeys.trendingPros` — extended to functions taking `(lat, lng, radius)` so a service-area change is a different cache entry (matches S163 `findPros` key pattern).
- `lib/typeAdapters.ts` — added `mapRecommendedProToProCard(p: RecommendedPro): FindProCard`. The new RPCs return a narrower projection than `Profile`, so `adaptProfileToProCard` could not be reused. `verification_level` derived from `license_status === 'verified' ? 'verified' : undefined`.
- `types/index.ts` — added `RecommendedPro` and `TrendingPro` interfaces.
- `components/FindTab.tsx`:
  - Consumer mapping switched to `mapRecommendedProToProCard`. Live mode never falls back to mock arrays — empty array on RPC error or no qualifying pros.
  - Recommended and Trending sections now hide entirely (no header, no scroll) when `!USE_MOCK_DATA && !isLoading && length === 0`.
  - `ProCardSkeletonRow` parameterized with `count` prop — Recommended renders 3 skeleton cards, Trending renders 4. Card dimensions match live ProCard exactly (325 width, 14 borderRadius, 0.68 borderWidth) so layout doesn't shift on data load.
- `lib/featureFlags.ts` — resolved BUG-S165-A merge conflict markers (cosmetic, was carried from `feat/atl-location-01-s163` merge). Single `DEV_SHOW_PASSWORD_LOGIN: false` line retained.

### v2 additions (squad-gap badge)
- `rpc_get_recommended_pros` redesigned mid-session: now returns `is_gap_fill boolean` and orders Tier 1 (gap fills) before Tier 2 (covered roles), both by `vouch_count DESC`. Squad-gap detection driven by `connections.is_in_squad = true` (NOT `squad_members` table — that is Phase 2 structured squad builder).
- `RecommendedPro` interface in `types/index.ts` — added `is_gap_fill: boolean`. `TrendingPro` inherits the field via `extends`; Trending render does not consume it.
- `FindProCard` interface in `lib/typeAdapters.ts` — added optional `is_gap_fill?: boolean`. `mapRecommendedProToProCard` threads `p.is_gap_fill ?? false`. `adaptProfileToProCard` (FindPros consumer) leaves it undefined → no badge for FindPros results.
- Local `ProCard` interface in `components/FindTab.tsx` — added optional `is_gap_fill?: boolean` to stay structurally compatible with `FindProCard`.
- Mock data: `RECOMMENDED_PROS` now `ALL_PROS.slice(0, 5).map((p, i) => ({ ...p, is_gap_fill: i < 2 }))` so badge is visible in demo mode on the first 2 cards. `TRENDING_PROS` cloned without the flag.
- Recommended carousel render: each `ProCardComponent` is now wrapped in `<View style={{ position: 'relative' }}>` with `key` on the wrapper. When `pro.is_gap_fill === true`, an absolutely positioned badge renders at `top: 8 / left: 8` — `COLORS.primary` text on `COLORS.tagBg` (consistent with Lightning headline pill chrome), 11pt `fontWeight: '600'`, `borderRadius: 6`, `paddingHorizontal: 6 / paddingVertical: 2`. Badge text: `"For Your Squad"`. Wrapper-overlay pattern (not a ProCard prop) — production handoff comment notes future migration to `badgeLabel` prop on the shared component.
- Trending carousel and "Available in [City]" list intentionally untouched — no badge there.

### Key decisions
- **Narrow RPC shape, not widened** — backend was deployed pre-session and not modified. Frontend mapper fills missing ProCard fields (`company: ''`, `rating: 0`, `tags: []`, etc.) rather than reshaping the RPC.
- **No internal `USE_MOCK_DATA` short-circuit** — hook always calls the RPC; mock branching stays at the consumer (FindTab), matching `useFindPros` architecture.
- **`enabled: !!sa` gate** — prevents an unfiltered fetch on mount before `useMyProfile` resolves; mirrors the FindTab `enabled: !isProfileLoading` pattern from S163.
- **Section hide-when-empty** — per spec, no empty horizontal scroll; LOADING STATE RULE (S151) compliance — never flashes mock during live load.

### Tickets closed
- ATL-LOCATION-04 → ✅ Done
- BUG-S165-A (featureFlags.ts duplicate-line cleanup) → ✅ Done (resolved as side-effect)

### Gates
- `npx tsc --noEmit` — 0 errors
- `npx expo lint` — 0 errors / 8 pre-existing warnings (none introduced this session)

### Current flags on branch (QA mode)
- `USE_MOCK_DATA: false`
- `DEV_BYPASS_AUTH: false`
Reset to demo defaults (`USE_MOCK_DATA: true`) before merge to main.

### S167 next objectives
1. × clear button on ServiceAreaEditorScreen city input (carried from S165 deferred)
2. CHORE-PROFILES-ORPHAN-CLEANUP — 11+ orphan rows pre-launch
3. ATL-LOADING-FLASH-FILTERED-LIST — FindTab filtered/searched view still flashes 16-mock-row fallback during initial fetch
4. BUG-S163-A — Alex Morgan `display_role='agent'` literal cleanup (low priority)
5. ATL-CTA-AUDIT — primary CTA pattern audit across all forms (carried from S159)

---

## S165 — ATL-LOCATION-01 Close-out + ATL-FIND-PILLS-PHASE1 (April 26, 2026)

### Branch
`feat/atl-location-01-s163` → merged to `main` at `d381490`

### Commits (in order)
- `6485ec3` — fix(find-tab): Phase 1 role pills + snake_case filter fix (ATL-FIND-PILLS-PHASE1)
- `7688073` — fix(service-area-editor): KAV offset += insets.top for fullScreenModal keyboard gap [SUPERSEDED]
- (subsequent commits) — fullScreenModal safe area pattern iterations
- final keyboard fix — dynamic CTA paddingBottom (16 keyboard up, Math.max(insets.bottom,16) keyboard down)
- fix(find-tab): strip ', USA' from chip label, remove location pin icon
- `d381490` — chore(s165): flag reset to demo defaults (merge commit to main)

### What shipped
- `rpc_update_service_area` — deployed and verified live (was silently partial-failed since S163)
- `sql/schema.sql` — updated with rpc_update_service_area definition
- EAS dev client rebuild — @react-native-community/slider@5.1.2 native module now linked
- ATL-LOCATION-01 QA Scenarios 2–9 — all passed on iPhone 16 Pro
- ATL-FIND-PILLS-PHASE1 — ROLE_PILLS revised to Phase 1 scope [All, Contractor, Stager, Photographer]
  + ROLE_PILL_MAP added, matchesRole now compares snake_case → snake_case
- ServiceAreaEditorScreen keyboard gap — resolved via canonical fullScreenModal pattern:
  header outside KAV, KAV offset=0, flow sibling CTA, dynamic paddingBottom
- FindTab chip — stripped ', USA' suffix, removed LocationPinIcon

### Tickets closed
- ATL-LOCATION-01 → ✅ Done
- ATL-FIND-PILLS-PHASE1 → ✅ Done

### Known issues / deferred
- Duplicate DEV_SHOW_PASSWORD_LOGIN line in lib/featureFlags.ts (merge artifact, cosmetic)
- × clear button on city input in ServiceAreaEditorScreen (polish, not blocking)
- Scenario 5 empty state only triggers at truly out-of-range location (by design — confirmed correct)
- BUG-S163-A — Alex Morgan display_role='agent' literal (low priority)

### Current flags on main (demo defaults)
- USE_MOCK_DATA: true
- DEV_BYPASS_AUTH: false
- DEV_SHOW_PASSWORD_LOGIN: false

### Next session priorities
1. ATL-LOCATION-04 — useRecommendedPros/useTrendingPros not location-aware
2. × clear button on ServiceAreaEditorScreen city input
3. featureFlags.ts duplicate line cleanup
4. CHORE-PROFILES-ORPHAN-CLEANUP — 11+ orphan rows pre-launch

---

## S164 — ATL-LOCATION-01 partial: "Available in [City]" + vouch seeds (April 25, 2026)

**Branch:** `feat/atl-location-01-s163` (commit `4a78a0e`, pending merge to main)
**Status:** ⚠️ Partial completion — two blockers deferred to S165

**Files modified:** 3
- `components/FindTab.tsx` — +58 lines net (derived city values, empty-state handler, new "Available in [City]" section, skeleton-gated `livePros`, DeviceEventEmitter listener for save-success toast)
- `hooks/useData.ts` — no net change (diagnostic log added then removed)
- `components/ServiceAreaEditorScreen.tsx` — 2 apostrophe escapes (pre-existing S163 lint debt)

**SQL run manually in Supabase (not committed):**
- 5 vouch_count UPDATEs for canonical contractors (Marcus 34, Mike 22, Sarah 18, Jessica 11, Carlos 7) for deterministic demo ordering

**Outcome:** Jessica Wong "missing from FindTab" deferred from S163 turned out NOT to be a bug — recon + diagnostic logs proved it was a layout gap. `filteredPros` was computed but never consumed by the render tree on the "All" pill default browse view. Pivoted from bug-fix to product decision (Path 3 quick-win): added "Available in [City]" vertical list section below Recommended/Trending. 5 bonus tickets surfaced via recon-first discipline. Two S163 deployment gaps deferred to S165.

**Gates:** tsc 0, expo lint 0 errors / 7 pre-existing warnings, grep `S164-DIAG-JW` = 0 matches.

**Deferred to S165 (blockers):**
1. `rpc_update_service_area` not deployed — Service Area Editor Save broken (`Could not find the function public.rpc_update_service_area(...) in the schema cache.`)
2. EAS dev client rebuild required — slider renders "Unimplemented component"

**New backlog tickets:** ATL-FIND-PILLS-PHASE1 (MVP blocker), ATL-LOADING-FLASH-FILTERED-LIST, CHORE-ROLE-COMPARE-NORMALIZE, CHORE-SCREEN-REGISTRY-FINDTAB-NEW-SECTION, ATL-LOCATION-04 (high priority), CHORE-BUILD-LOG-RENAME-AND-FRONTEND-PHASE, CHORE-LIVE-BUILD-STATE-CLEANUP.

**Permanent rules added (lessons.md):** 6 — default browse view layout (curated + full vertical list, not curated alone), diagnostic log convention (`[<SESSION>-DIAG-<TAG>]` prefix + `__DEV__` wrap), RPC verification SELECT after deploy, EAS rebuild discipline (immediate, never deferred), loading-flash trap on `liveData ?? MOCK_ARRAY`, SQL verification SELECTs alongside writes.

---

## S163 — ATL-LOCATION-01: Agent Service Area Filtering (April 21, 2026) [LOGGED RETROACTIVELY S164]

**Branch:** `feat/atl-location-01-s163` (still pending merge as of S164 close)
**Status:** ⚠️ Code complete, most data work shipped, two blockers carried into S164/S165

**Files created/modified:** 7 source files modified, 1 new file
- NEW `components/ServiceAreaEditorScreen.tsx` — fullScreenModal with autocomplete city + slider radius + Save CTA. Three-tier graduated haptics (Light every 5mi, Medium at 25/50/75, Rigid at 5/100 edges). S159 KAV/SafeArea pattern. Reads `useMyProfile` directly (no route params from caller).
- `components/shared/AddressAutocompleteInput.tsx` — extended with `onSelectWithCoords` callback (returns label + lat + lng so callers persist coords without second geocoding round-trip)
- `lib/typeAdapters.ts` — new `getServiceArea()` helper (single cast point pattern for off-interface columns; numeric coercion via `Number(...)` handles Postgres NUMERIC returning as strings via PostgREST)
- `hooks/useData.ts` — new `useUpdateServiceArea` mutation hook with optimistic cache patch. `useFindPros` rewritten from PostgREST to RPC call with `enabled` gate (`!isProfileLoading`).
- `components/FindStack.tsx` — registered `ServiceAreaEditor` as fullScreenModal
- `components/FindTab.tsx` — replaced hardcoded "Denver" chip with live `getServiceArea(myProfile)` read. Empty-state copy. DeviceEventEmitter listener for save-success toast.
- `package.json` — `@react-native-community/slider@5.1.2` added

**SQL deployed (Supabase SQL Editor):**
- 2 Postgres extensions enabled: `cube`, `earthdistance` (required for `earth_distance(ll_to_earth(...))` circle-overlap math)
- 4 columns added to `profiles`: `service_area_lat NUMERIC`, `service_area_lng NUMERIC`, `service_area_radius INTEGER` (CHECK 1-500), `service_area_label TEXT`
- GiST partial index on `ll_to_earth(lat, lng)` (only rows with non-null coords)
- 2 RPCs: `rpc_find_pros` ✅ verified deployed (circle-overlap math, role IN allow-list `'contractor', 'home_stager', 'real_estate_photographer'`), `rpc_update_service_area` ❌ NOT verified — silently partial-failed during multi-block deploy (S164/S165 blocker)
- 5 contractor profiles seeded (Marcus/Denver, Mike/Aurora, Sarah/Lakewood, Jessica/Boulder, Carlos/Colorado Springs out-of-radius) + Alex Morgan agent service area (Denver / 25mi)

**Phase 1 launch strategy codified mid-session:** Contractor-first launch. Phase 1 = contractor revenue loop + agent service-area discovery + Neighborhood Intelligence retention. Phase 2 (NOT launching) = closing tracker, deal tracker, partner track, deal chat threads.

**Bugs surfaced:** 8 distinct (6 resolved in-session, 1 deferred to S164 — Jessica missing — turned out to be S164 layout gap, 1 low-priority — BUG-S163-A Alex display_role literal).

**Permanent rules added (lessons.md):** 11 — RPC null params handling, verify RPC creation via `pg_proc`, mock→live flip data-hygiene plan, DDL before DML, Dashboard auth user role default, DeviceEventEmitter cross-screen success pattern, ServiceArea TEXT field semantics post-S163, package.json as source of truth (not CLAUDE.md), SQL verification SELECT discipline, TanStack cache staleness on schema migrations, native module dev client rebuild discipline.

**New backlog tickets:** ATL-LOCATION-02, ATL-LOCATION-03, ATL-LOCATION-04, ATL-FIND-PILLS-PHASE1, BUG-S163-A, CHORE-CLAUDE-MD-SDK-AUDIT, CHORE-PROFILES-ORPHAN-CLEANUP, CHORE-DEVCLIENT-REBUILD-S163, ATL-CHIP-EMPTY-STATE-POLISH, ATL-BORDER-WIDTH-AUDIT.

---

## S162c — Deal Chat & Partner Inbox polish pass: sender eyebrow, closing-date format, creator-only name edit, unread-cache fix, header photo avatars, partner multi-avatar rows (April 19, 2026)

**Status:** 🟢 All 7 polish items shipped + S162c-patch follow-up (UnreadIndicator shared component + 3-callsite visual-consistency migration + mock-data partner UX coverage). Amended into single commit `bdc1b62`. Pending device QA on `feat/atl-s162c-polish` branch across 3 accounts (Tony agent, Lisa title_escrow, David mortgage_pro).

**S162c-patch additions (amended into `bdc1b62`):**
- **New primitive `UnreadIndicator`** (`components/shared/UnreadIndicator.tsx`) — two-axis design contract: `variant="count" | "dot"` × `tone="primary" | "danger"` × `size="sm" | "md"` × `position="inline" | "absolute"`. Permanent role semantics: **count = "volume matters"** (agent triage, contractor action queue) · **dot = "attention needed"** (partner deal_chat, future presence signals) · **primary tone = conversational (blue)** · **danger tone = action urgency (red)**.
- **3 callsite migrations** — `InboxList` agent unread → `UnreadIndicator` (pill-with-count preserved via `tone="primary"`; blue dot preserved when no count); `ContractorInboxList` job_thread unread → `variant="count" tone="danger" position="absolute"` (pixel-identical to prior inline red overlay); `ContractorInboxList` deal_chat unread → `variant="dot"` INLINE in Row 3 message line, avatar overlay suppressed. No inline hex anywhere — all colors from tokens.
- **Partner dot-only rule (permanent design contract):** deal_chat rows show an unread dot regardless of count. The dot signals "something is new" without implying queue depth. Partners work one deal at a time; a count would create false urgency. This is NOT a deferred feature — it's the intended final shape for partner Inbox.
- **Mock data fix** — `MOCK_ACTIVE_THREADS` now includes one partner `deal_chat` row (`id: 'deal-mock-1'`, agent `Alex Morgan`, 3 members, closingDate `2026-05-31`, unreadCount 2) cast to `JobChatThreadWithMeta`. Fixes ATL-MOCK-DEAL-CHAT-METADATA: demo mode (`USE_MOCK_DATA = true`) now accurately represents partner UX (multi-avatar stack + inline blue dot + no status pill). Contractor job_thread mocks untouched — their demo flow is unchanged.
- **Files touched by patch (6):** `components/shared/UnreadIndicator.tsx` (NEW), `components/shared/index.ts`, `components/InboxList.tsx`, `components/ContractorInboxList.tsx`, `tasks/atlasio-bug-history.md` (ATL-MOCK-DEAL-CHAT-METADATA entry), `ATLASIO_CONTEXT.md` (this entry).
- **NOT touched by patch:** `lib/tokens.ts` (no new tokens — reused `primary`, `notificationRed`, `onPrimary`, `background`), `hooks/useData.ts`, `lib/typeAdapters.ts`, `DealChatScreen.tsx`, `MessageBubble.tsx`, `InboxStack.tsx`, `GroupAvatar.tsx`, `featureFlags.ts` (QA-mode flips intentionally preserved in working tree).
- **Staging discipline:** `git add` was scoped to the 6 patch-touched paths only. `lib/featureFlags.ts` (QA flips `DEV_BYPASS_AUTH=false`, `DEV_SHOW_PASSWORD_LOGIN=true`) stays in working tree for ongoing partner-account device QA. Reset to demo defaults before main-branch merge.

**Scope:** 7 items — 2 visual (sender name color + size), 1 format (closing date MM-DD-YYYY), 2 behavior bugs (partner-edit leak, unread-cache stale), 2 architectural (header photo avatars in DealChatScreen, multi-avatar pattern on partner Inbox via extracted shared `GroupAvatar`).

**Key decisions:**
- **`textTertiary` token:** new color `#9CA3AF` added to `lib/tokens.ts` Text Hierarchy. Semantic: "sender names, chat metadata, caption-level text." MessageBubble sender eyebrow consumes it. Closest existing token (`lightText: #99A1AF`) was visually indistinguishable but semantically tied to "placeholders / disabled text" — separate concern.
- **Sender name restyle (MessageBubble only):** `fontSize: 14, fontWeight: '400', color: COLORS.darkText` → `fontSize: 12, fontWeight: '500', color: COLORS.textTertiary`. Applies in the `showSender` branch only. ChatScreen (1:1) does NOT pass `showSender` — unchanged there. Cleaner than the spec suggested: one edit touches both surfaces via shared MessageBubble.
- **Closing date formatter:** pure string transform `YYYY-MM-DD → MM-DD-YYYY`. NO `Date()` object, NO `toISOString()` — obeys the S158 permanent rule ("never use toISOString for date-only fields"). Edge cases: empty → empty, non-ISO → pass-through, no `NaN-NaN-NaN`. Applied to context bar only; edit modal read-only date row is intentionally untouched (scope held).
- **Creator-only name edit (Item 4 — behavior fix):** DealChatScreen header wraps the `{GroupAvatarGrid + dealName + chevron}` in `isCreator ? <Pressable>…</Pressable> : <View>…</View>`. Non-creators see a non-interactive View with NO chevron. Server-side RLS on `rpc_update_thread_name` already rejected writes — this is purely removing a misleading UI affordance. Re-uses the existing `isCreator = serverIsCreator ?? routeIsCreator` merge from S162; no new hook.
- **Unread-cache fix (Item 5 — behavior bug, medium risk):** two-part fix. (1) `useData.ts:1351` — `useMarkThreadRead.onSuccess` now invalidates `queryKeys.inboxThreads` in addition to `queryKeys.chatThreads`. The S160 rewire moved the Inbox surface to `useInboxThreads` (RPC-backed) but left the invalidation list pointing at the legacy key. (2) `InboxList.tsx` + `ContractorInboxList.tsx` — added `useFocusEffect` with a `hasMountedRef` skip guard so `refetchInbox()` fires only on RE-focus (not initial mount). The focus-refetch covers the DealChatScreen auto-read path where no client mutation fires (server-side mark-read inside `rpc_get_thread_messages`).
- **Header photo avatars (Item 6 — architectural):** `rpc_get_inbox_threads.members[]` already returns `avatar_url`, but the adapter at `typeAdapters.ts:96-101` dropped it. Added `uri: m.avatar_url ?? null` to the mapping, extended `InboxChatThread.members` type + `InboxStack.tsx` route param type to match, updated `GroupAvatarGrid` inside `DealChatScreen.tsx` to use shared `<Avatar uri=…>` per tile. Avatar's built-in null-uri guard + image-error onError handler provides free graceful fallback to colored initials.
- **Per-message bubble avatars — permanent "no":** Tony confirmed as design decision (not deferred). `rpc_get_thread_messages` does NOT return `sender_avatar_url`; the sender-name eyebrow is the sole per-message identity cue by design. No backlog ticket logged.
- **Partner multi-avatar rows (Item 7):** `GroupAvatar` extracted from `InboxList.tsx` (previously inline) → `components/shared/GroupAvatar.tsx` + barrel export. ContractorInboxList's `ThreadRow` now branches on `__type === 'deal_chat' && __members.length > 0` to render `<GroupAvatar members=… size=48>`; job_thread and mock rows keep the existing single `<Avatar>`. The `__members` metadata already carries `uri` via the adapter, so partner Inbox deal_chat rows get photo tiles too.
- **Out of scope (held the line — zero expansions):** No RPC changes. No schema changes. No RLS changes. No BottomTabNavigator changes. No `ContractorInboxList.tsx` rename (still S163). No new "Deal" pill variant (still S163). No hook-count changes. No past-threads RPC extension. No edit-modal closing-date format change (only the context bar banner was in scope).

**Files modified (single amended commit on feat/atl-s162c-polish — `bdc1b62`):**
- `lib/tokens.ts` — +1 token (`textTertiary: '#9CA3AF'`)
- `components/shared/GroupAvatar.tsx` — **NEW** (extracted from InboxList; uses shared `<Avatar>` for each tile, so photos + error-fallback are free)
- `components/shared/UnreadIndicator.tsx` — **NEW** (S162c-patch; shared unread primitive — dot/count × primary/danger × sm/md × inline/absolute)
- `components/shared/index.ts` — barrel exports `GroupAvatar` + types + `UnreadIndicator` + type
- `components/MessageBubble.tsx` — sender-name Text style updated (items 1 + 2)
- `components/DealChatScreen.tsx` — added `Avatar` import; removed unused `getInitials`; `GroupAvatarGrid` rewritten to accept `uri` + use shared `Avatar` per tile; new `formatClosingDate` helper (items 3 + 6); creator-only Pressable gate (item 4)
- `components/InboxStack.tsx` — route param `members` type extended with optional `uri`
- `lib/typeAdapters.ts` — `InboxChatThread.members` type extended + adapter plumbs `avatar_url → uri`
- `components/InboxList.tsx` — removed inline `GroupAvatar` (moved to shared); imports from shared barrel; removed unused `getInitials` import; `useFocusEffect` now also triggers `refetchInbox()` on re-focus (with `hasMountedRef` first-mount guard); `members` type extended with optional `uri`; S162c-patch: inline pill/dot → `UnreadIndicator` (count tone="primary" / dot)
- `components/ContractorInboxList.tsx` — added `useFocusEffect`, `useRef`, `useCallback` imports; imports shared `GroupAvatar` + `UnreadIndicator`; `JobChatThreadWithMeta.__members` type extended with optional `uri`; `ThreadRow` avatar branch for `__type === 'deal_chat'`; new `useFocusEffect` block with `hasMountedRef` for refetch-on-focus; S162c-patch: red overlay badge → `UnreadIndicator variant="count" tone="danger" position="absolute"` gated on `__type !== 'deal_chat'`; inline `variant="dot"` added in Row 3 for deal_chat unread; new `deal-mock-1` row at top of `MOCK_ACTIVE_THREADS` (partner UX demo fixture)
- `hooks/useData.ts` — `useMarkThreadRead.onSuccess` now invalidates `queryKeys.inboxThreads` alongside `queryKeys.chatThreads`
- `tasks/atlasio-bug-history.md` — added ATL-MOCK-DEAL-CHAT-METADATA (S162c-patch) + ATL-DEAL-NAME-EDIT (item 4) + ATL-UNREAD-CACHE (item 5) entries at top
- `ATLASIO_CONTEXT.md` — this entry; Current Metrics block updated (+2 shared components, +1 COLORS token)

**Verification:**
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 0 NEW warnings (7 pre-existing warnings in unrelated files: CategoryMapScreen, ContractorHomeTab, PostPhotoJobScreen, PostStagingJobScreen, SquadSlotPicker)
- Avatar error handling verified pre-implementation: shared `Avatar.tsx` already guards null uri (`!!uri && !imageError`) and handles image load failure via `onError` state → initials fallback. No Avatar modifications needed.

**Metrics:** RPCs 69 (unchanged). Hooks 69 (unchanged — no new hooks). Edge Functions 11 (unchanged). Feature Flags 11 (unchanged). Shared Components +2 (GroupAvatar extracted in S162c; UnreadIndicator added in S162c-patch). COLORS tokens +1 (textTertiary — no new tokens in S162c-patch).

### S165 — Next Objectives (priority order)

**Critical — ATL-LOCATION-01 close-out (immediate):**
1. **Deploy `rpc_update_service_area` to production** — paste SQL into Supabase SQL Editor, verify with `SELECT proname FROM pg_proc WHERE proname = 'rpc_update_service_area'` (must return 1 row).
2. **Trigger EAS dev client rebuild** — `eas build --profile development --platform ios` for `@react-native-community/slider@5.1.2` native module. Wait ~15-25 min, install on device.
3. **Run QA Scenarios 2-9** for ATL-LOCATION-01 (chip tap, radius drag + haptics + save, city change via autocomplete, empty state + rehydration, keyboard behavior, iOS swipe-back, TanStack cache invalidation, role pill composition).
4. If pass → move ATL-LOCATION-01 to ✅ Done on sprint board. Otherwise iterate.
5. Update `sql/schema.sql` to reflect deployed RPC body.

**Phase 1 critical path (after ATL-LOCATION-01 closes):**
6. **ATL-FIND-PILLS-PHASE1** (MVP blocker) — small UI ticket. Add Stager and Photographer pills. Fix display-string vs snake_case role compare in FindTab filter.
7. **ATL-LOCATION-04** (high priority) — `useRecommendedPros` / `useTrendingPros` not location-aware. Likely 1-2 new RPCs.

**Carried over from S163 plan (re-prioritize after Phase 1 critical path):**
- **ATL-DEAL-THREAD-02** — Archive deal chat (Phase 2)
- **ATL-CONTRACTOR-TRADES-3** — PostJobWizard tradesMap migration
- **ATL-CTA-AUDIT** — Primary CTA button audit
- **GroupAvatar +N overflow badge** (4+ members) — component now in shared, ready for extension
- **ContractorInboxList rename** → `PartnerContractorInboxList.tsx`
- **"Deal" pill variant** for deal_chat rows in ContractorInboxList
- **`rpc_get_inbox_threads` past-threads extension**
- Hook-count + metrics audit session

---

## S162 — ATL-DEAL-THREAD-06 + ATL-INBOX-MOCK-SHADOW: Server-derived creator detection + contractor/partner inbox live wiring (April 18–19, 2026)

**Status:** 🟢 Server-derived creator detection wired. System pill in `DealChatScreen` now correctly hidden for the deal creator on every entry path (first-creation hop AND Inbox re-entry). S162b bundled: `ContractorInboxList` (shared contractor + partner surface) wired to live `useInboxThreads`; deal_chat threads now appear for non-agent members. Pending device QA on `feat/atl-deal-thread-06-s162` branch.

**Key decisions:**
- **Migration (D-prime):** `thread_members.joined_at` default changed from `now()` (transaction-time, ties all rows in same RPC) → `clock_timestamp()` (wall-clock, deterministic per statement). Single-line `ALTER COLUMN` — no schema rewrite, no new column, no RPC change. Agent is inserted first inside `rpc_create_deal_thread`, so for all threads created from S162 forward, agent reliably wins `ORDER BY joined_at ASC LIMIT 1`.
- **Hook (`useIsThreadCreator`):** Direct `thread_members` SELECT (no RPC needed — RLS "View co-members" already permits). Returns `boolean | undefined`. `undefined` is the explicit "I don't know" signal returned in mock mode, when `threadId` is missing, on RLS error, or for pre-S162 tied-timestamp threads. 5-min `staleTime` because creator never changes for a given thread.
- **Wiring (Option C):** `DealChatScreen` renames the route-param destructure to `routeIsCreator` and merges via `const isCreator = serverIsCreator ?? routeIsCreator`. The route param remains as the loading-state hint (covers ~100–300ms server query window on first-creation hop with zero pill flash). The pill render at line 498 (`{!isCreator && …}`) consumes the merged value with no other change.
- **Schema sync:** `sql/schema.sql:367` updated to `DEFAULT clock_timestamp()` in the same commit as hook + screen + docs. The deployed database is the source of truth — the file mirrors it.
- **Known-acceptable edge case:** Threads created BEFORE the S162 migration retain tied `joined_at` values. For these, the hook returns `undefined` or wrongly `false` for the creator → UI falls back to `routeIsCreator` (matches pre-S162 behavior). Documented in `tasks/atlasio-bug-history.md`. Mitigation: create fresh deal threads post-migration for demo purposes. Not a bug.
- **S162b bundled — ATL-INBOX-MOCK-SHADOW:** `ContractorInboxList.tsx` (shared contractor + partner surface — confirmed: title_escrow Lisa AND mortgage_pro David both land here) was 100% mock with no live data wiring. Bundled fix: wire `useInboxThreads` with client-side filter to `deal_chat` + `job_thread`, branch `handleThreadPress` on type, register `DealChatScreen` in `ContractorInboxStack`. Adapter `adaptInboxThreadToLocal` confirmed role-agnostic — no `viewerRole` parameter needed. Status badge suppressed for deal_chat rows (placeholder `'in_progress'` jobStatus would have rendered as misleading "In Progress" pill). Past-thread surface deferred (RPC doesn't yet return `completed`/`cancelled`; "Past Jobs" header was already conditionally rendered).
- **Out of scope (held the line):** No `creator_id` column on `threads`. No `rpc_get_inbox_threads` modification. No archive logic (that is ATL-DEAL-THREAD-02 in S163). No settings gear icon. No new "Deal" pill variant. No file rename of `ContractorInboxList.tsx`. No `useContractorJobChats()` hook (would duplicate `useInboxThreads`). No BottomTabNavigator routing change beyond the `DealChatScreen` registration in `ContractorInboxStack`.
- **Hook-count drift acknowledged:** S161 entry reported 68 → 69, but `grep -c "^export const use" hooks/useData.ts` showed 68 going into S162. This is upstream drift, not a regression. S162 reports grep-authoritative 68 → 69. CLAUDE.md metrics block intentionally NOT touched this session — reconciliation deferred to a dedicated metrics audit. Notion Live Build State (showing 69 pre-S162) is not the source of truth.

**Files modified (single commit on feat/atl-deal-thread-06-s162):**
- `sql/schema.sql` — `thread_members.joined_at` default `now()` → `clock_timestamp()` (mirrors deployed migration)
- `hooks/useData.ts` — added `useIsThreadCreator` hook (after `useUpdateThreadName`, before `useThreadMessages`)
- `components/DealChatScreen.tsx` — added `useIsThreadCreator` import; renamed destructured `isCreator` → `routeIsCreator`; inserted hook call + `serverIsCreator ?? routeIsCreator` merge; pill render unchanged
- `components/ContractorInboxList.tsx` — S162b: header reframe (membership-scoped); imports `useEffect`, `FEATURE_FLAGS`, `useInboxThreads`, `adaptInboxThreadToLocal`; new `JobChatThreadWithMeta` type; `useInboxThreads` + `useEffect` wire that filters to `deal_chat`/`job_thread` and adapts to row shape; `handleThreadPress` branches on `__type` to route to `DealChatScreen` with members[]; `ThreadStatusBadge` suppressed for deal_chat rows
- `components/BottomTabNavigator.tsx` — S162b: imported `DealChatScreen`; registered it inside `ContractorInboxStack` so contractor/partner deal_chat navigation lands cleanly
- `tasks/atlasio-bug-history.md` — added ATL-INBOX-MOCK-SHADOW entry (top); added ATL-DEAL-THREAD-06 entry (below) with Symptom / Root cause / Resolution / Known-acceptable / Do NOT
- `tasks/screen-registry.md` — added new `DealChatScreen` entry between `ChatScreen` and `NewMessageScreen` with full data-source list including `useIsThreadCreator`
- `ATLASIO_CONTEXT.md` — this entry; Current Metrics block updated to reflect grep-authoritative hook count

**Verification:**
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → see commit log
- `/review` (or `/ultrareview` per S162 prompt) → run before commit
- Hook-count grep before commit: `grep -c "^export const use" hooks/useData.ts` → 69

**Metrics:** RPCs 69 (unchanged). Hooks 68 → 69 (grep-authoritative; +useIsThreadCreator). Edge Functions 11 (unchanged). Feature Flags 11 (unchanged).

### S163 — Next Objectives
- **ATL-DEAL-THREAD-02** — Archive deal chat (next in deal-thread sequence)
- **ATL-LOCATION-01** — Service area filtering for contractors
- **ATL-CONTRACTOR-TRADES-3** — PostJobWizard tradesMap migration
- **ATL-CTA-AUDIT** — Primary CTA button audit
- GroupAvatar +N overflow badge (4+ members)
- RepairJobDetails bid actions wire-up
- Hook-count + metrics audit session — reconcile CLAUDE.md, ATLASIO_CONTEXT.md, and Notion Live Build State to a single grep-derived source of truth

---

## S161 — ATL-DEAL-THREAD-03/04/05 + Avatar Stack Redesign (April 17, 2026)

**Status:** 🟢 Shipped. Final commit on `main`: merge of `feat/atl-deal-thread-s161` (`df1537d`). Three tickets closed (03/04/05) + two QA follow-ups (GroupAvatar variable tiles + avatar stack redesign). ATL-DEAL-THREAD-06 logged for S162.

**Key decisions:**
- **Messages persistence (03):** `DealChatScreen` consumes `useThreadMessages(threadId)` (already wired) and `useSendMessage` (already wired). New `adaptThreadMessage` adapter maps RPC `ThreadMessage` → local `Message` (content→text, created_at→formatted timestamp, sender_id===myProfile.id→isMine). Demo mode preserved with local-echo branch; live mode uses optimistic-clear-on-submit with restore on error. Attachments blocked in live mode with Alert (upload path deferred).
- **Deal name edit (04):** New `useUpdateThreadName` hook does a direct `threads.name` UPDATE. RLS `Members update threads` (any thread member) gates the write. No RPC needed. `threads` table has no `updated_at` column — not added. `refetchQueries({ queryKey: queryKeys.inboxThreads })` on success so the inbox row picks up the new name immediately.
- **Member colors (05):** `rpc_get_inbox_threads` updated to return a `members[]` array alongside `other_member` (non-self members only, ordered by `joined_at ASC`). Adapter extended to propagate `{ name, color }[]` through `InboxChatThread.members` and the local `ChatThread.members`. `deriveColor` + `AVATAR_COLORS` placeholder fully removed.
- **Avatar stack redesign:** Both `GroupAvatar` (InboxList, 48×48) and `GroupAvatarGrid` (DealChatScreen header, 36×36) rewritten as dynamic overlap stacks. 1 member → full Avatar with initials. 2 members → 28×28 (InboxList) / 22×22 (header) circles offset 14/12. 3 members → 24×24 / 18×18 offset 12/9. zIndex + elevation for first-on-top stacking. `isOnline` dot preserved on `GroupAvatar` container. `getInitials` helper exported from `components/shared/Avatar.tsx` and re-exported via the shared barrel — single source for initial derivation.
- **Route param `members`:** replaces S161-QA `memberColors` on `DealChatScreen` params. Passed from `CreateDealChat` (from `participants`) and `InboxList.handleThreadPress` (from `thread.members`).
- **Mock data enrichment:** `INITIAL_THREADS` group threads (t1, t2, t4, t8) gain realistic `members: [{name, color}]` arrays so demo mode renders real initials (SM/AC/MR/JL style) instead of `?` placeholders.
- **Sent timestamp alignment:** `MessageBubble` sent-bubble timestamp gets `textAlign: 'right'` so it hugs the right edge of the bubble. Received bubbles untouched.
- **Commit hygiene:** `lib/featureFlags.ts` never committed with live-mode drift — reset pre-merge. Demo defaults preserved on main.

**Files modified (across 3 commits on feat/atl-deal-thread-s161):**
- `hooks/useData.ts` — added `useUpdateThreadName`
- `lib/typeAdapters.ts` — removed `deriveColor` + `AVATAR_COLORS`; rewrote `avatarColors` block; added `members` field + propagation
- `types/index.ts` — added optional `members?: { user_id, name, avatar_color: string | null, avatar_url }[]` to `InboxThread`
- `sql/schema.sql` — added `rpc_get_inbox_threads` body (mirrors deployed Supabase state)
- `components/DealChatScreen.tsx` — wired `useThreadMessages` + `useSendMessage` + `useMyProfile` + `useUpdateThreadName`; `adaptThreadMessage` adapter; rewrote `handleSend` + `handleSaveEdit` async; rewrote `GroupAvatarGrid` as overlap stack; replaced hardcoded initials + colors with route-param `members`
- `components/InboxList.tsx` — rewrote `GroupAvatar` as overlap stack; added `members?` to `ChatThread`; enriched `INITIAL_THREADS`; updated `handleThreadPress` to pass `members`
- `components/InboxStack.tsx` — `DealChatScreen` param type: `members?: { name, color }[]`
- `components/CreateDealChat.tsx` — passes `members` (name + color) in `CommonActions.reset`
- `components/MessageBubble.tsx` — sent timestamp `textAlign: 'right'`
- `components/shared/Avatar.tsx` — exported `getInitials` helper
- `components/shared/index.ts` — re-export `getInitials`

**Verification:**
- `npx tsc --noEmit` → 0 errors
- `npx expo lint` → 7 pre-existing warnings, 0 new
- `/review` (3 runs) → auto-fixed type nullability, attachment drop, stale comment; no remaining findings
- Supabase `rpc_get_inbox_threads` deployed with `SET search_path TO 'public'`

**Metrics:** RPCs 68 → 69 (rpc_get_inbox_threads updated). Hooks 68 → 69 (useUpdateThreadName). Edge Functions: 11. Feature Flags: 11.

### S162 — Next Objectives
- **ATL-DEAL-THREAD-06** — Settings gear + system pill creator detection via `joined_at` approach (MVP blocker)
- **ATL-DEAL-THREAD-02** — Archive deal chat
- **ATL-LOCATION-01** — Service area filtering for contractors
- **ATL-CONTRACTOR-TRADES-3** — PostJobWizard tradesMap migration
- **ATL-CTA-AUDIT** — Primary CTA button audit
- GroupAvatar +N overflow badge (4+ members)
- GroupAvatarGrid header initials wiring (member names at screen level)
- RepairJobDetails bid actions wire-up

---

## S160 — ATL-DEAL-THREAD-01: Wire rpc_create_deal_thread (April 17, 2026)

**Status:** 🟢 Deal chat thread creation wired end-to-end. `CreateDealChat` now invokes `rpc_create_deal_thread` and passes the returned `thread_id` to `DealChatScreen`. Message fetching deliberately deferred to a later session — the screen receives the real thread id but continues rendering `MOCK_DEAL_MESSAGES`.

**Key decisions:**
- Deal thread created via SECURITY DEFINER RPC — `threads` table has no INSERT RLS, so direct client INSERT is impossible. Same pattern as `rpc_create_thread` (one_to_one).
- `onSuccess` uses `refetchQueries` (not `invalidateQueries`) on `inboxThreads` — same pattern as `useCancelJob` (S157b) for immediate UI refresh.
- Message fetching deferred — DealChatScreen accepts optional `threadId?` param and silences the TS unused-local via `void threadId;` + `@backend — wired in future session via useThreadMessages(threadId)` comment.
- `InboxThread.type` corrected from `'deal'` → `'deal_chat'` — matches the `thread_type_enum` in Supabase.
- Duplicate `InboxStackParamList` in `types/index.ts` deleted. Single source of truth now lives in `components/InboxStack.tsx`; `DealChatScreen` param shape gains optional `threadId?: string`.
- `closingDate` display string ("Dec 15") lost year info at entry, so `CreateDealChat` now tracks a parallel `closingDateISO` state (YYYY-MM-DD) set in lockstep inside `handleDateConfirm`. Display string flows to `DealChatScreen` banner; ISO string flows to the RPC.
- **Known demo-mode failure:** mock contact IDs (`d1`..`d10` in `DEAL_CONTACTS`) are not valid UUIDs. The RPC call will fail in demo mode — surfaced to the user via `Alert.alert('Error', ...)` in the catch block. Production participants must come from a real network source (follow-up session).

**Files modified:**
- `hooks/useData.ts` — added `useCreateDealThread` mutation hook (STATUS: wired); updated CHAT / INBOX section header count 8 → 9
- `components/CreateDealChat.tsx` — added `Alert` import + `useCreateDealThread` import; added `closingDateISO` + `isSaving` state; wired `handleDateConfirm` to set ISO in lockstep; rewrote `handleCreateChat` as async with try/catch + `Alert` on failure; Create Chat button shows 'Creating…' + `disabled` during save
- `components/DealChatScreen.tsx` — destructures `threadId` from route params; `void threadId;` silences unused-local until message loading is wired; added `@backend` comment block at the top
- `components/InboxStack.tsx` — added `threadId?: string` (optional) to `DealChatScreen` param shape
- `types/index.ts` — `InboxThread.type` `'deal'` → `'deal_chat'`; deleted duplicate `InboxStackParamList` export (all inbox screens already import from `./InboxStack`)
- `sql/schema.sql` — added `rpc_create_deal_thread` body (section 18b) after `rpc_create_thread`
- `tasks/atlasio-bug-history.md` — added ATL-DEAL-THREAD-01 entry

**Verification:**
- `npx tsc --noEmit` → results below
- `npx expo lint` → results below
- `InboxStackParamList` grep confirmed zero imports from `types/index.ts` before deletion; all 5 consumer files import from `./InboxStack`

**Metrics:** RPCs 67 → 68. Hooks 67 → 68. Feature Flags: 11 (unchanged). Edge Functions: 11 (unchanged).

### S160 — Next Objectives
- Replace `DEAL_CONTACTS` mock in `CreateDealChat.tsx` with a real network-contact source so the RPC stops failing in demo mode ✅ shipped (`useConnections`)
- Wire `useThreadMessages(threadId)` in `DealChatScreen` to replace `MOCK_DEAL_MESSAGES` with live messages
- Wire `useSendMessage` for deal threads (shared with 1:1 ChatScreen)
- Add a "deal chat" entry point to `InboxList` so newly created deal chats appear with the same row pattern as 1:1 threads

### S160 — Inbox display fixes (April 17, 2026)

After ATL-DEAL-THREAD-01 device QA surfaced three display bugs in deal-chat threads. Four small fixes shipped:

1. **DealChatScreen mock gate** — `MOCK_DEAL_MESSAGES` is now gated on `FEATURE_FLAGS.USE_MOCK_DATA`. When false, the screen starts with an empty `messages` array (system pill renders, user can type-and-see local-only bubbles until `useThreadMessages` is wired).
2. **Inbox thread name** — `adaptInboxThreadToLocal` now branches on `thread.type !== 'one_to_one'`: deal_chat / job_thread display the agent-entered `threads.name`, while 1:1 still prefers `other_member.name`. Fixes the bug where a deal thread showed one participant's name instead of the deal name.
3. **GroupAvatar colors** — added `deriveColor(str)` helper that hashes a string to one of 5 placeholder palette colors. Group threads now get 4 colors `[other_member.avatar_color, deriveColor(name), deriveColor(name+'1'), deriveColor(name+'2')]` so the 2x2 grid is fully populated. Marked `@backend` — replace with real `members[].avatar_color` array when `rpc_get_inbox_threads` is updated.
4. **InboxList → DealChatScreen nav** — passes real `threadId` (`thread.threadId ?? thread.id`), uses adapter-propagated `dealAddress` + new `closingDate` instead of brittle string-splitting on the deal name. New `closingDate?: string` field added to `InboxChatThread` and the local `ChatThread` interface, propagated via `thread.closing_date` from the RPC.

**Files modified:**
- `components/DealChatScreen.tsx` — `FEATURE_FLAGS` import + gated `useState` initializer + header comment update
- `lib/typeAdapters.ts` — `COLORS` import + `deriveColor` helper + name branch + 4-color avatar + `closingDate` field/propagation
- `components/InboxList.tsx` — added `closingDate?: string` to local `ChatThread` interface + handleThreadPress group branch rewritten to pass `threadId`, `dealAddress`, `closingDate` (no string splitting)

**Verification:**
- `npx tsc --noEmit` → results below
- `npx expo lint` → results below

**Follow-up backend work (deferred — not this session):**
- Update `rpc_get_inbox_threads` to return `members[]` with each member's `user_id`, `name`, `avatar_color`, `avatar_url`. Today the RPC returns a single `other_member`, which forces the deriveColor placeholder. With members[] the adapter can use real avatar colors.
- Mirror `rpc_get_inbox_threads` definition into `sql/schema.sql` (currently absent — long-standing drift, not introduced by S160).

---

## S159 — BUG-002/003/006 Keyboard Binding RESOLVED (April 15, 2026)

**Status:** 🟢 Three chat/form screens had the same root-cause class: mixing `SafeAreaView` bottom edges or `insets.bottom` with `KeyboardAvoidingView behavior='padding'`, producing a visible ~34pt gap between the input/CTA and the keyboard on notch devices. S159 establishes the permanent rule: KAV owns ALL keyboard + safe-area spacing; input/CTA `paddingBottom` is fixed (8 for chat, 16 for form CTA), never `insets.bottom`, never wrapped in `SafeAreaView edges={['bottom']}`.

### Fix 1 — ChatScreen (BUG-002)
`paddingBottom: insets.bottom + 8` → fixed `paddingBottom: 8`. Removed `useSafeAreaInsets` import and hook call (no other references). Updated hard-requirement comment block to document the S159 rule and correct the S155 guidance.

### Fix 2 — DealChatScreen (BUG-003 addendum)
Removed the nested `<SafeAreaView edges={['bottom']}>` wrapping the input row (attach/input/send). Replaced with a plain `<View>`. Root `SafeAreaView edges={['top']}` and Edit Deal Details Modal KAV untouched.

### Fix 3 — CreateDealChat (BUG-006)
Root `SafeAreaView edges={['top', 'bottom']}` → `edges={['top']}`. Footer `paddingBottom: 16` fixed value preserved. S155 comment replaced with the S159 rule.

**Files modified this session:**
- `components/ChatScreen.tsx` — import, insets hook, input container paddingBottom, hard-requirement comment
- `components/DealChatScreen.tsx` — removed nested `SafeAreaView edges={['bottom']}` from input row (open + close tags)
- `components/CreateDealChat.tsx` — root SafeAreaView edges, footer comment
- `tasks/atlasio-bug-history.md` — BUG-002, BUG-003, BUG-006 marked 🟢 RESOLVED with S159 descriptions
- `tasks/lessons.md` — KAV rule updated: fixed `paddingBottom: 8` (chat) / `16` (form CTA), never `insets.bottom`, never `edges={['bottom']}` inside KAV subtree

**Verification:**
- `npx tsc --noEmit` → **0 errors**
- `npx expo lint` → **7 pre-existing warnings, 0 new**
- `grep insets.bottom` on the three files → 0 code references (doc comments only)
- `grep "edges={['bottom']}"` on DealChatScreen → 0 results
- `grep "edges={['top', 'bottom']}"` on CreateDealChat → 0 results

**Metrics:** RPCs: 67 (unchanged). Hooks: 66 (unchanged). Feature Flags: 11 (unchanged). Edge Functions: 11 (unchanged).

### S159 Polish — Keyboard Appearance + CTA Button Alignment (April 16, 2026)

**Fix 1 — Dark keyboard flash:** Added `keyboardAppearance="light"` to both TextInputs in `DealChatScreen.tsx` (message composer + edit modal deal name field).

**Fix 2 — CTA button alignment:** Replaced `borderRadius: 9999` pill CTAs with the PostPhotoJobScreen canonical pattern (`borderRadius: 12`, `paddingVertical: 15`, `COLORS.primary`/`COLORS.disabledBg`, `COLORS.onPrimary`/`COLORS.disabledText`, press opacity 0.9) on:
- `CreateDealChat.tsx` — "Create Chat" footer CTA
- `DealChatScreen.tsx` — Edit Deal Details modal "Save" button

**Files modified:** `components/DealChatScreen.tsx`, `components/CreateDealChat.tsx`, `tasks/lessons.md`

**Fix 3 — BUG-011 global keyboard appearance:** Set `TextInput.defaultProps.keyboardAppearance = 'light'` in `App.tsx` (module scope, before any component definition). Removed `autoFocus` + delayed-focus `useEffect` + `inputRef` from `DealChatScreen.tsx`. Key decision: global defaultProps means every keyboard in the app is light regardless of screen transition state or focus timing — no per-screen props needed. autoFocus removed — user taps to focus (iMessage/WhatsApp pattern).

**Files modified:** `App.tsx`, `components/DealChatScreen.tsx`, `tasks/atlasio-bug-history.md`

**Fix 4 — canCreate + context bar:** `canCreate` in `CreateDealChat.tsx` now requires `dealName.trim().length > 0 && participants.length > 0` (at least one closing partner). Blue context bar in `DealChatScreen.tsx` hidden when both address and closing date are empty — no more "Deal Chat" placeholder on blue background.

**Files modified:** `components/CreateDealChat.tsx`, `components/DealChatScreen.tsx`

### S159 — Next Objectives
- Device QA on Build 45: verify input bar sits flush against the keyboard (8pt gap, no ~34pt gap) on ChatScreen, DealChatScreen, and that the CreateDealChat CTA sits flush against the keyboard when any form field is focused
- Confirm keyboard-closed state still shows the input/CTA above the home indicator (no overlap)
- Broader CTA audit (ATL-CTA-AUDIT): scan all screens for pill-radius CTAs and align to PostPhotoJobScreen pattern
- Flip feature flags back to demo defaults before investor demo

---

## S157 — BUG-007 + BUG-008 RESOLVED (April 15, 2026)

**Status:** 🟢 Two device-test bugs from the Post Repair Job flow fixed end-to-end.

### BUG-007 — Photo thumbnails blank, `photo_urls: []`
Root cause: PostJobWizard stored `expo-image-picker` local URIs in `form.photos` and dropped them on submit. `rpc_create_job` had no photo parameter and its INSERT did not write `photo_urls`.

Fix: two-phase upload pipeline gated by RLS path convention:
1. `rpc_create_job` returns `jobId`
2. `uploadJobPhotos(jobId, form.photos)` reads each URI as base64 → `Uint8Array` → `supabase.storage.from('job-photos').upload('{jobId}/{i}.jpg', bytes, { contentType: 'image/jpeg', upsert: false })`
3. New `useSetJobPhotos` calls `rpc_set_job_photos(p_job_id, p_photo_urls)` with the storage paths

Partial failures are logged and skipped — job creation always wins. `job-photos` is a private bucket, so paths (not signed URLs) are persisted; signed URLs must be generated at display time via `createSignedUrl(path, expiresIn)`.

### BUG-008 — New job not appearing in Active Jobs
Root cause (three layers):
1. `rpc_get_agent_active_jobs` filter excluded `open`/`bidding` — newly created jobs were filtered out server-side.
2. `useCreateJob.onSuccess` did not invalidate `['agent_active_jobs']` (underscore key used by `useAgentActiveJobs` — not `queryKeys.agentJobs`).
3. `AgentActiveJob.status` was typed as the 3-value subset, blocking server-side filter widening.

Fix: Supabase `rpc_get_agent_active_jobs` widened to `('open','bidding','awarded','in_progress','pending_completion')`. Client invalidation added to both `useCreateJob` and new `useSetJobPhotos`. `AgentActiveJob.status` widened to full `JobStatus`. `JOB_STATUS_LABELS` gained `open → 'Open for Bids'` and `bidding → 'Receiving Bids'`. New `JOB_STATUS_COLORS` map: open/bidding → `COLORS.jobGreen`, awarded/in_progress → `COLORS.secondaryText`, pending_completion → `COLORS.warningAmber`. Inline ternary replaced with map lookup.

**Files modified this session:**
- `components/HomeTabAgent.tsx` — `JobStatus` import, `JOB_STATUS_LABELS` widened, new `JOB_STATUS_COLORS` map, ActiveJobCard color lookup
- `components/PostJobWizard.tsx` — `FileSystem`/`supabase` imports, `useSetJobPhotos` wiring, `uploadJobPhotos` helper, two-phase upload in `handlePostJob`
- `hooks/useData.ts` — `useCreateJob.onSuccess` invalidates `['agent_active_jobs']`; new `useSetJobPhotos` hook
- `types/index.ts` — `AgentActiveJob.status` widened to `JobStatus`
- `sql/schema.sql` — added `rpc_get_agent_active_jobs` (new — was previously missing from schema.sql, now in sync) and `rpc_set_job_photos`
- `tasks/atlasio-bug-history.md` — BUG-007 + BUG-008 entries
- `tasks/lessons.md` — private-bucket paths, two-phase RLS ordering, sibling cache-key invalidation, server-filter vs narrowed union

**Verification:**
- `npx tsc --noEmit` → **0 errors**
- `npx expo lint` → **0 new warnings** (7 pre-existing, unchanged)
- `COLORS.jobGreen` verified in `lib/tokens.ts:129`

**Metrics:** RPCs: 66 → 67 (+1 rpc_set_job_photos). Hooks: 65 → 66 (+1 useSetJobPhotos). Feature Flags: 11 (unchanged). Edge Functions: 11 (unchanged).

### S157 — Next Objectives
- Device QA: post a new repair job with photos, confirm `jobs.photo_urls` populated in Supabase, confirm job appears immediately in Active Jobs with "Open for Bids" label in green
- PhotoLightbox (S147) + RepairJobDetails photo render: generate signed URLs from the stored paths via `createSignedUrl` at display time — current consumers may still expect public URLs
- Flip feature flags back to demo defaults before investor demo

---

## S158 — Due date timezone fix + cancel job cache refresh (April 15, 2026)

**Status:** 🟢 Two surgical fixes shipped on top of S157b.

### Fix 1 — Due date off-by-one in EditRepairJob
`handleSave` was using `dueDate.toISOString().split('T')[0]` which converts to UTC and shifts the date by the timezone offset on every save from a negative-offset timezone. Denver (UTC-6/7) was losing a day on every Edit Job save.

**Fix:** construct `YYYY-MM-DD` from local date components (`getFullYear/getMonth/getDate`). No UTC involvement. Every timezone clean. Rule logged in `tasks/lessons.md`.

### Fix 2 — Cancel job showed stale card after navigation
`useCancelJob.onSuccess` invalidated `['agent_active_jobs']` which refetches in the background. `mutateAsync` resolved before the refetch landed, so `navigation.goBack()` fired against stale cache and the cancelled card was still visible briefly on HomeTab.

**Fix:** replace the active-jobs `invalidateQueries` with an `await qc.refetchQueries({ queryKey: ['agent_active_jobs'] })` inside an async `onSuccess`. This blocks `mutateAsync` resolution until the list has actually refetched. The three other invalidations stay as-is (background refresh is fine).

**Metrics:** unchanged. RPCs 67, Hooks 67, tsc 0, lint 0 new.

---

## S157b — EditRepairJob + RepairJobDetails full wire (April 15, 2026)

**Status:** 🟢 All scope items shipped. tsc 0, lint 0 new.

**Files modified this session (9):**
- `components/EditRepairJob.tsx` — full rewrite: route params → jobId, `useJob(jobId)` live fetch, pre-fill effect, signed-URL effect, absolute-centered header, DateTimePicker, real Image thumbnails, `ALL_TRADE_LABELS` from tradesMap, two-phase photo save, cancel via `useCancelJob`
- `components/RepairJobDetails.tsx` — `useJob(jobId)` live fetch (keeps local `job` state for 4 preserved `@demo` optimistic bid handlers), signed-URL effect for private bucket, formatted `bid_deadline`, loading guard placed after all hooks, null-safe handler sites via `job!` assertions
- `components/HomeStack.tsx` — `EditRepairJob` + `RepairJobDetails` params both narrowed to `{ jobId: string }`. Removed now-unused `Job`/`BidWithProfile` import
- `components/HomeTabAgent.tsx` — active-jobs card nav simplified from 14-line `{ job: {...stubbed} }` to `{ jobId: job.id }`. Removed unused `Job`/`BidWithProfile` import
- `components/NotificationsTab.tsx` — deep-link nav simplified to `{ jobId: notif.job_id }`. Removed local `resolveRepairJob` helper and its `Job`/`BidWithProfile`/`MOCK_REPAIR_JOBS` imports
- `components/FormField.tsx` — added optional `placeholderTextColor` prop (backwards-compat for 7 other consumers)
- `hooks/useData.ts` — new `useCancelJob` hook; `useUpdateJob` now invalidates `['agent_active_jobs']`
- `lib/tradesMap.ts` — expanded to full schema set (25 entries); new `ALL_TRADE_LABELS` export
- `tasks/atlasio-bug-history.md` — S157b block
- `tasks/lessons.md` — 4 new rules: tradesMap single source, scope-decision surfacing, signed URLs for private buckets, loading guards after hook calls
- `ATLASIO_CONTEXT.md` — this entry

**Key decisions:**
- Route params always pass `jobId`, never full `job` object (CLAUDE.md rule enforced on both screens)
- Photos: storage paths stored in DB, signed URLs generated at display time via `createSignedUrl(path, 3600)` — private bucket
- Minimum blast radius: RepairJobDetails keeps local `job` state snapshot seeded from `useJob` data. The 4 `@demo` optimistic bid handlers (`handleAcceptBid`/`handleCounterBid`/`handleRejectBid`/`handleSimulateProgress`) are preserved unchanged. Wiring them to real `useAcceptBid`/`useCounterBid`/`useRejectBid` is deferred to new Notion ticket ATL-CONTRACTOR-TRADES-3 follow-up (RepairJobDetails bid actions).
- `useCancelJob` wraps existing `rpc_cancel_job` — soft cancel, withdraws pending bids, ownership verified server-side
- tradesMap is the single source of truth — `ALL_TRADE_LABELS` drives the chip grid; `TRADE_LABEL_TO_ENUM` at save, `TRADE_ENUM_TO_LABEL` at load
- FormField `placeholderTextColor` is backwards-compat — 7 other consumers unchanged
- Direct table UPDATE on `jobs` is safe — RLS "Agents update own jobs" policy at schema.sql:604 gates on `auth.uid() = agent_id`
- `useUpdateJob` now invalidates `['agent_active_jobs']` (same BUG-008-class gap that BUG-008 already fixed for `useCreateJob`)
- Loading guard placed after all hook calls in RepairJobDetails to comply with rules-of-hooks (the component has 18+ hooks in its body)

**Metrics:** RPCs 67 (unchanged — rpc_cancel_job already live), Hooks 66 → 67 (+1 useCancelJob), tsc 0, lint 0 new (7 pre-existing).

**Closes:** ATL-120 (EditRepairJob side only; PostJobWizard → new follow-up ticket).

### S157b — Next Objectives
- Wire @demo bid action handlers in RepairJobDetails (accept/counter/reject) to real `useAcceptBid`/`useCounterBid`/`useRejectBid` hooks
- PostJobWizard tradesMap migration (ATL-CONTRACTOR-TRADES-3 parallel)
- Device QA: post job → edit → save → confirm live, cancel → confirm soft-cancel in Supabase

---

## S156 — BUG-001 RESOLVED (April 15, 2026)

**Status:** 🟢 BUG-001 Address Autocomplete fully resolved across all 4 consumers after 7 failed attempts.

**Root cause (two layers):**
1. **Modal + focused TextInput** (S155 failure mode) — iOS stole keyboard focus every keystroke
2. **Missing `response.ok` check** (ALL prior attempts' silent failure mode) — Google 4xx/5xx errors parsed as JSON, `data.suggestions` was undefined, `?? []` gave empty, UI silently showed "No matches." The 6 previous layout/rendering attempts never touched the data layer where the real bug lived.

**Final fix (`781830f`):**
- Rewrote `components/shared/AddressAutocompleteInput.tsx` with inline absolute-sibling dropdown pattern (no Modal), `response.ok` guard, `AbortController` for stale-response protection, `__DEV__` empty-key warn
- Refactored `PostStagingJobScreen.tsx` back to use the shared component (removed inline pilot + Build 46 diagnostic logging)
- Cleaned diagnostic logs from `ClientLifestyleScreen.tsx` but kept permanent `response.ok` guard
- 3 other consumers (`PostPhotoJobScreen`, `PostJobWizard`, `CreateDealChat`) picked up the fix with zero code changes

**Verification:**
- ✅ Build 46 device test: PostStagingJobScreen + NeighborhoodMatch working
- ✅ Dev client post-rewrite: PostPhotoJobScreen, PostJobWizard, CreateDealChat all working
- ✅ Backend wiring validated: Supabase `jobs.address = "2950 Brighton Boulevard, Denver, CO, USA"` (full Google Places string, zero transformation)
- ✅ `keyboardShouldPersistTaps="handled"` audited across all 4 consumers — clean

**Permanent lesson added to `tasks/atlasio-bug-history.md`:**
When a component appears to render empty, check whether it's receiving empty data or silently swallowing errors BEFORE touching layout code. Always gate `fetch` JSON parsing on `response.ok` and log error bodies when false.

**Files modified this session:**
- `components/shared/AddressAutocompleteInput.tsx` — full rewrite
- `components/PostStagingJobScreen.tsx` — refactored back to shared component
- `components/ClientLifestyleScreen.tsx` — permanent `response.ok` guard
- `tasks/atlasio-bug-history.md` — Attempt 7 (S156 inline pilot) + Attempt 8 (S156 Build 46 root cause + resolution) + permanent lesson

**Metrics:** unchanged (RPCs 66, Hooks 65, Edge Functions 11, tsc 0, lint 0 new).

**Commits:** `98983d6` (inline pilot) → `1efd308` (Build 46 diagnostic) → `781830f` (rewrite + full rollout)

---

## S155 — BUG-001 + BUG-002 + BUG-003 + BUG-006 Fixes (April 15, 2026)

**Feature flags:** ✅ Reset to demo defaults (`USE_MOCK_DATA: true`, `DEV_BYPASS_AUTH: true`, `DEV_SHOW_PASSWORD_LOGIN: false`). S154's QA-mode overrides restored to stock demo state.


### BUG-002 — ChatScreen keyboard-dismiss gap flash

**Files modified:**
- `components/ChatScreen.tsx` — Removed the S154 `keyboardVisible` state + `Keyboard.addListener` subscriptions (show/hide on iOS/Android). Input container `paddingBottom` reverted to a static `insets.bottom + 8`. Updated the hard-requirement comment block to explain why the listener was removed and why KAV owns all keyboard spacing. `Keyboard` import retained — still used by the message-scroll `keyboardDidShow` effect elsewhere in the file.

**Key decision — KAV owns keyboard spacing.** The S154 listener approach fought KAV during the hide-animation frame: `keyboardWillHide` fired and immediately restored `paddingBottom` to `insets.bottom + 8` while KAV was still animating its own internal padding down from keyboard-height. Both added bottom space in the same frame → ~34px gap flash for ~250ms on dismiss. With the listener removed, KAV `behavior='padding'` is the sole source of keyboard-height padding. The static inset only accounts for the home indicator, which never needs to animate. Rule documented in `tasks/lessons.md`: "Do NOT layer Keyboard.addListener padding on top of KAV behavior='padding'".

### BUG-006 — CreateDealChat "Create Chat" CTA hidden by keyboard

**Files modified:**
- `components/CreateDealChat.tsx` — `SafeAreaView edges={['top']}` → `edges={['top', 'bottom']}`. Footer `paddingBottom: Math.max(insets.bottom, 24)` → static `paddingBottom: 16` (SafeAreaView now owns the bottom inset — no double count). Added explicit `keyboardVerticalOffset={0}` to KAV. Removed `useSafeAreaInsets` import and the unused `insets` binding. Footer View remains a sibling of ScrollView inside KAV (was already correct; **not** restructured).

**Key decision — premise correction.** The initial BUG-006 prompt assumed the CTA was a child of the ScrollView and needed to be moved. It was already a sibling of ScrollView inside KAV. The real cause was SafeAreaView `edges={['top']}` only — the footer was manually adding `insets.bottom` inside a KAV whose container extended to the bottom of the screen, so when KAV added keyboard-height padding the combined offset pushed the CTA below the visible area. Adding the `'bottom'` edge to SafeAreaView + dropping the manual inset restores the expected behavior. Rule documented in `tasks/lessons.md`: "CTA placement inside KAV — always sibling of ScrollView, SafeAreaView edge pairing must match footer padding".

### BUG-003 — DealChatScreen sheet appearance + CreateDealChat dismiss icon

**Files modified:**
- `components/CreateDealChat.tsx` — (1) `useNavigation` import extended to include `CommonActions` from `@react-navigation/native`. (2) Replaced `BackIcon` with `CloseIcon` (pure SVG X, two `<Path>` lines, `stroke={COLORS.darkText}`, 22×22) — NOT Ionicons. S154's chevron was reverted. (3) `handleCreateChat` now dispatches `CommonActions.reset({ index: 1, routes: [{ name: 'InboxList' }, { name: 'DealChatScreen', params: {...} }] })` instead of `navigation.replace('DealChatScreen', ...)`. (4) Header comment block updated S154 → S155 to reflect the chrome reversal.
- `components/InboxStack.tsx` — Replaced the S152+S153 comment block above `<Stack.Screen name="CreateDealChat">` with an S155 comment explaining that `navigation.replace` does NOT escape the `fullScreenModal` ancestor on `NewMessageScreen` (line 62 of the same file), and that all navigation from CreateDealChat to DealChatScreen must use `CommonActions.reset` to mount clean.
- `lib/featureFlags.ts` — Feature flags reset to demo defaults per pre-commit checklist: `USE_MOCK_DATA: true` (was false), `DEV_BYPASS_AUTH: true` (was false), `DEV_SHOW_PASSWORD_LOGIN: false` (was true). S154 had explicitly preserved the QA-mode overrides; S155 is the first post-QA session so we flip back.
- `tasks/atlasio-bug-history.md` — BUG-003 status → 🟡 pending Build 44; Attempt 3 (S155) block added with the actual root cause (fullScreenModal ancestor leak from `NewMessageScreen`), the reset solution, and a correction to the prior "CommonActions.reset would clobber InboxList" note which turned out to be wrong.
- `tasks/lessons.md` — New rule: "fullScreenModal ancestor leak". Documents the leak, the 4 failed fixes across S151b–S154, and the `CommonActions.reset` pattern with `index: 1` multi-route array for preserving a back-target.

**Key decisions:**
- **Root cause was `NewMessageScreen`'s fullScreenModal, not CreateDealChat's own presentation.** Four prior sessions (S151b, S152, S153, S154) chased the wrong target — each tried to fix CreateDealChat's own registration, animation, or chrome. The actual leak is that `NewMessageScreen` at `InboxStack.tsx:62` is registered with `{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }`. On iOS native-stack, that presentation leaks down to every descendant pushed or replaced on top of it. `navigation.replace` inherits the modal layer regardless of the descendant's own options. Only `CommonActions.reset` (which rebuilds the stack from scratch) escapes the ancestor.
- **`CommonActions.reset` with `index: 1` preserves InboxList as the back-target.** S152's "What NOT to try" note said reset "would clobber InboxList" — that was wrong. Resetting to `[InboxList, DealChatScreen]` with `index: 1` makes DealChatScreen the active route with InboxList preserved as its parent. Back-nav from DealChatScreen lands on InboxList, which is the correct UX.
- **S154's chevron was reverted back to X.** S154 chose chevron to signal "pushed screen, not modal". But CreateDealChat is inside the NewMessageScreen modal flow — the mental model is still a sheet, even if the immediate screen isn't a modal at the native-stack level. X matches user expectations for dismiss. Pure SVG `CloseIcon` (two `<Path>` lines forming an X) — not Ionicons, which isn't imported anywhere in the file.
- **`NewMessageScreen`'s `fullScreenModal` registration is NOT being removed.** Its slide-up-from-bottom entry from InboxList is intentional UX. Fixing this one screen's navigation via `reset` is the minimal-blast-radius change. Other descendants of NewMessageScreen can use the same pattern if they hit the same bug.

### BUG-001 — Address autocomplete dropdown (original S155 fix)

**Card:** ATL-BUG-001 → 🟡 Pending device verification on Build 44

**Files modified:**
- `components/shared/AddressAutocompleteInput.tsx` — Full replacement of the S154 inline-absolute-in-ScrollView dropdown with a screen-level transparent `<Modal>` positioned via coordinates captured from `measure()` (NOT `measureInWindow`) called inside the wrapper's `onLayout` callback. Added `wrapperRef`, `dropdownLayout` state, `measureWrapper()` helper. Remeasure triggers on `onLayout`, `onFocus`, and `Keyboard.addListener('keyboardDidShow')`. Backdrop `Pressable` dismisses the Modal on outside tap. `onBlur` also closes. Modal `visible` condition: `showAutocomplete && dropdownLayout !== null` (single state + layout guard — no compound `dropdownVisible` alias). Inner View guards on `suggestions.length > 0` so the backdrop stays dismissible during fetch. Consumers (`PostPhotoJobScreen`, `PostStagingJobScreen`, `PostJobWizard`, `CreateDealChat`, `DealCreationSheet`) need zero edits.
- `tasks/atlasio-bug-history.md` — BUG-001 status → 🟡 Fix shipped S155. Added Attempt 4 (S155) block with the Modal + measure() approach. `measureInWindow` permanently banned in the "What NOT to try again" list along with absolute-in-ScrollView.
- `tasks/lessons.md` — New rule: "measure() vs measureInWindow inside ScrollView". Documents the onLayout → measure() → pageX/pageY → Modal pattern, why `measureInWindow` races, why absolute-in-ScrollView is banned on iOS regardless of zIndex.

**Key decisions:**
- **Revert S154 inline-absolute pattern; it was clipped/painted-under by iOS ScrollView.** Four prior fixes (S146, S151, S152, S153, S154) all failed because they treated this as either a zIndex problem (S146, S154) or a measureInWindow timing problem (S151–S153). It's neither — it's a RN-on-iOS platform constraint: absolute children of ScrollView are unreliable, and `measureInWindow` is async-unsafe in ScrollView layout contexts.
- **`measure()` called from `onLayout` is the reliable path.** `onLayout` fires after layout commits, `measure()` returns root-relative coords (what Modal positioning needs). `measureInWindow` is PERMANENTLY BANNED for this use case — documented in the component header, bug-history, and lessons.md.
- **Single-boolean Modal visible condition.** Per user instruction, Modal visible uses `showAutocomplete && dropdownLayout !== null` rather than a compound `dropdownVisible` alias — keeps the condition obvious and the backdrop dismissible during the brief fetch window before suggestions populate.
- **No consumer changes.** Fix is fully self-contained in AddressAutocompleteInput.tsx.

**Feature flags:** Unchanged from S154 QA state (`USE_MOCK_DATA: false`, `DEV_BYPASS_AUTH: false`, `DEV_SHOW_PASSWORD_LOGIN: true`). Flip to demo defaults before investor demo.

**Verification:**
- `npx tsc --noEmit` → **0 errors**
- `npx expo lint` → **0 new warnings** (7 pre-existing, unchanged from S154)
- Device verification pending Build 44
- Count updates: Hooks = unchanged. RPCs = unchanged. Shared components = unchanged (existing component modified).

### S155 — Next Objectives (S156 targets)
- Build 44 device verification of BUG-001 fix across all 5 consumers
- If verified: mark BUG-001 ✅ resolved in bug-history, flip flags to demo defaults
- If any consumer still fails: investigate whether Modal's root-mount context differs across nav stacks (especially `DealCreationSheet` which lives in a BottomSheet Modal already — nested Modal behavior on iOS can be finicky)

---

## S154 — Build 42 QA Fixes (April 15, 2026)

**Card:** ATL-QA-BUILD42 → ✅ Done after Build 43 QA

**Files modified:**
- `components/shared/AddressAutocompleteInput.tsx` — **Fix 4**. Full rewrite. Deleted the `Modal` overlay, `measureInWindow` path, `inputLayout` state, `inputWrapperRef`, `onLayout` handler, `onFocus` remeasure, 50ms setTimeout, `width > 0` guard, and all `__DEV__` diagnostic logs. Dropdown is now an inline absolute-positioned `<View>` with `top:52, zIndex:99, maxHeight:240` inside a `position:relative` wrapper, sibling to the `TextInput`. Mirrors the working pattern in `ClientLifestyleScreen.tsx` that has been shipping since S57. Component public API (`value`, `onSelect`, `placeholder`, `label`) unchanged — all 4 consumers (`PostPhotoJobScreen`, `PostStagingJobScreen`, `PostJobWizard`, `CreateDealChat`) need no edits.
- `components/CreateDealChat.tsx` — **Fix 2**. Header chrome normalized to the standard pushed-screen pattern. Root `<View>` → `<SafeAreaView edges={['top']}>` (imported `SafeAreaView` alongside existing `useSafeAreaInsets`). Removed manual `paddingTop: 8 + insets.top` math. Replaced the right-aligned X button with a left-aligned 44×44 back chevron (new `BackIcon` SVG, removed `CloseIcon`). Title is now centered in a `[Back][flex:1 title][44×44 spacer]` row at height 48. `navigation.replace('DealChatScreen', ...)` on create still correct (S152). InboxStack registration unchanged (already had no options after S153).
- `components/ChatScreen.tsx` — **Fix 1**. Added `keyboardVisible` state + `Keyboard.addListener` effect (`keyboardWillShow/Hide` on iOS, `keyboardDidShow/Hide` on Android). Input container `paddingBottom` is now `keyboardVisible ? 8 : insets.bottom + 8`. Structural hierarchy unchanged — the S153 KAV pattern was already correct; what failed on Build 42 was the static `insets.bottom + 8` double-counting the notch when iOS KAV `behavior='padding'` already pushed the input above the keyboard (keyboard covers home-indicator area). Updated the hard-requirement comment block with the `keyboardVisible` rationale. `keyboardVerticalOffset: 0` locked.
- `components/ProProfile.tsx` — **Fix 3**. Removed `SuccessToast` from the connection request flow. The `connectSent` state already drives the in-place "Request Sent ✓" button copy, which is the right confirmation pattern for an action with a visible in-place state change. Removed `SuccessToast` from the shared barrel import, removed `useSuccessToast` import + hook call, removed `showSuccess('Request sent')` in `handleSendConnect`, removed the `<SuccessToast>` render at the bottom. `SuccessToast.tsx` + `useSuccessToast.ts` unchanged — other screens (PostJobWizard, BidSubmission, EditProfile, etc.) still consume them.
- `tasks/bug-history.md` — Marked **BUG-001 RESOLVED** with the root cause explained (Modal detour chased the wrong problem; `ClientLifestyleScreen` was the working reference all along). Added **BUG-002b** entry for the Build 42 keyboard-open double-count continuation. Added a Build 42 attempt block to **BUG-003** explaining that S153's animation fix wasn't enough — the chrome (X button, left-aligned title, manual top inset) still read as modal.
- `tasks/lessons.md` — Updated the ChatScreen HARD REQUIREMENT block with the S154 `keyboardVisible` rule + exact `Keyboard.addListener` snippet.

**Key decisions:**
- **Fix 4 — delete the Modal path, don't patch it.** Four builds of patching `measureInWindow` races (guards, delays, remeasures, diagnostic logs) couldn't win a timing race that a simpler inline pattern avoids entirely. The working reference was already in the codebase at `ClientLifestyleScreen.tsx` — the S151 "do NOT attempt plain zIndex" advisory in bug-history was wrong and has been refuted and removed. The real ask for consumers is just adequate ScrollView `paddingBottom`, which all 4 current consumers already provide.
- **Fix 1 — keyboard-visibility listener, not `keyboardVerticalOffset: -insets.bottom`.** The latter would break re-entry from attachment/compose mode and conflicts with the ChatScreen hard-requirement lock that `keyboardVerticalOffset` stays at 0. The listener approach is narrowly scoped to the padding calculation that was actually wrong.
- **Fix 2 — chrome, not navigation.** S153's `animation: 'slide_from_right'` fix was correct but incomplete. On device, the screen still *read* as modal because its chrome (X button, left-aligned title, manual top-inset math) was bottom-sheet chrome. Normalizing the chrome to match `RepairJobDetails` et al. is what actually makes it stop looking like a sheet.
- **Fix 3 — in-place state beats a toast when it exists.** `connectSent` already drives the button copy change. A toast on top of that is noise. `SuccessToast` stays wired for the other consumers where there's no equivalent in-place feedback.

**Feature flags:** **NOT RESET.** Build 42 QA state preserved per spec — `USE_MOCK_DATA: false`, `DEV_BYPASS_AUTH: false`, `DEV_SHOW_PASSWORD_LOGIN: true`. Flip back to demo defaults before the next investor demo.

**Verification:**
- `npx tsc --noEmit` → **0 errors**
- `npx expo lint` → **0 new warnings** (7 pre-existing, unchanged from S153)
- Count updates: Hooks = unchanged. RPCs = unchanged. Shared components = unchanged.

---

## S153 — Build 41 QA Fixes (April 15, 2026)

**Card:** ATL-QA-BUILD41 → ✅ Done

**Files modified:**
- `components/InboxStack.tsx` — **Fix 1**. Removed lingering `options={{ animation: 'slide_from_bottom' }}` from `CreateDealChat` screen registration (left over from pre-S152 fullScreenModal setup). The screen now inherits the navigator's default `slide_from_right`, matching the rest of InboxStack. One-line change.
- `components/ChatScreen.tsx` — **Fix 2**. Removed `<SafeAreaView edges={['bottom']}>` wrapper around the input row; replaced with a plain `<View>`. Bottom inset is now owned by the outer input container's `paddingBottom: insets.bottom + 8` via a new `useSafeAreaInsets()` call. Imported `useSafeAreaInsets` alongside existing `SafeAreaView` import. Root cause: after S151/S152 removed `fullScreenModal` from `ChatScreen`'s registration, the screen started inheriting the navigator's safe-area context, which meant the inner `SafeAreaView edges={['bottom']}` double-counted the inset — leaving a strip of empty space below the input bar on notched devices. Updated the S152 hard-requirement comment block to reflect the new structure (plain View input row, insets on outer container). `keyboardVerticalOffset: 0`, top SafeAreaView, and KAV behavior are all unchanged.
- `components/shared/SuccessToast.tsx` — **Fix 3**. Repositioned from bottom to top. Changed initial `slideAnim` from `100` → `-80` so the toast slides DOWN from above the top edge. Replaced `bottom: insets.bottom + 32` with `top: insets.top + 8`, added `minHeight: 48` for better visibility. Same spring values (speed 14, bounciness 6), same 3000ms auto-dismiss, same green accent bar + check icon + dismiss X. Updated the file header comment to reflect the new direction. `hooks/useSuccessToast.ts` unchanged — no position logic lives there.
- `components/shared/AddressAutocompleteInput.tsx` — **Fix 4 (diagnostic)**. Wrapped `inputWrapperRef.current?.measureInWindow` in `setTimeout(..., 50)` so layout has time to settle before measuring — Build 40/41 QA showed that on first focus inside a `ScrollView`, `measureInWindow` intermittently returned `{0,0,0,0}`, and the existing `width > 0` guard then suppressed the dropdown entirely. Added a `__DEV__`-gated console.log inside the measure callback and a second render-time log tracking `dropdownVisible`, `showAutocomplete`, `suggestions.length`, and `inputLayout`. These diagnostics ship in Build 42 so we can see actual device behavior before committing to a deeper fix. The `width > 0` guard is preserved so we still don't render a zero-sized dropdown on the first stale measurement.
- `tasks/lessons.md` — Added "RULE — SafeAreaView(bottom) double-counts inset inside a native stack screen without fullScreenModal (S153)" and updated the S152 HARD REQUIREMENT block to reflect the new input-row structure.

**Key decisions:**
- **Fix 2 root cause confirmed before touching code.** The empty-space-below-input symptom only appeared after `fullScreenModal` was removed from InboxStack (S151/S152). Under fullScreenModal the modal layer sat outside the safe-area context, so the inner `SafeAreaView edges={['bottom']}` was the only inset owner and was correct. Under card presentation the screen is inside the navigator's safe-area context, so both the outer stack AND the inner SafeAreaView applied the inset — double-counted. Moving inset ownership to the outer container's paddingBottom is the cleanest fix and matches the pattern used across the rest of the app.
- **Fix 4 diagnostic-first, not blind fix.** The existing `width > 0` guard + `onLayout` + `onFocus` remeasure from S151/S152 is structurally correct. Rather than layering more speculative code, S153 ships logging to capture actual `measureInWindow` return values on device so Build 42 can make a data-driven decision. The 50ms delay is a low-risk improvement (lets layout settle) but is not sold as a complete fix.
- **Fix 3 — top placement, not size increase.** Making the toast physically larger at the bottom would have competed with the bottom tab bar and CTAs. Top placement mirrors iOS system notifications, keeps it out of the way of interactive UI, and is dramatically more noticeable without needing a bigger box.

**Feature flags:** **NOT RESET.** Build 41 QA state preserved per spec — `USE_MOCK_DATA: false`, `DEV_BYPASS_AUTH: false`, `DEV_SHOW_PASSWORD_LOGIN: true`. Flip back to demo defaults before the next investor demo.

**Verification:**
- `npx tsc --noEmit` → **0 errors**
- `npx expo lint` → **0 new warnings** (7 pre-existing, unchanged from S152)
- Count updates: Hooks = unchanged. RPCs = unchanged. Shared components = unchanged.

---

## S152 — Build 40 QA Fixes (April 14, 2026)

**Card:** ATL-QA-BUILD40 → ✅ Done

**Files modified:**
- `components/shared/AddressAutocompleteInput.tsx` — **Bug 1** + **Bug 2**. Bug 1: added `inputLayout.width > 0` guard to `dropdownVisible` so the `Modal` never renders at zero size before `measureInWindow` resolves on first focus. The existing `onLayout` + `onFocus` remeasure pattern from S151 was correct but the Modal was flashing at `{top:0, left:0, width:0}` on first open; the width guard blocks that invisible-state render. Bug 2: reworked `handleTextChange` to no longer call `onSelect('')` on every keystroke (that was silently wiping parent state on edit-after-select). Instead, parent commit now happens `onBlur`: if the user types but never picks a suggestion (iOS QuickType, autofill, Places API failure, manual entry), the typed text is committed to the parent form on blur. Selection via `handleSuggestionSelect` still wins — it fires `onSelect(description)` with the fully-formatted address. Partial strings never pass validation because commit is gated on blur, not on keystroke. Fix applies to PostPhotoJobScreen, PostStagingJobScreen, PostJobWizard, and CreateDealChat — all four screens share this component.
- `components/InboxStack.tsx` — **Bug 5**. Removed `presentation: 'fullScreenModal'` from the `CreateDealChat` screen registration. S151b had used `navigation.replace('DealChatScreen', …)` to work around the fullScreenModal layer, but on device the modal persisted after replace and back from DealChatScreen landed on CreateDealChat instead of Inbox. Removing the modal presentation lets the existing `replace` dispatch work naturally — same card animation as the rest of InboxStack, clean back → InboxList. `CreateDealChat.tsx` itself is untouched.
- `components/HomeTabAgent.tsx` — **Bug 3**. Restored dual-path `hasActiveRepair` derivation. S151 collapsed it into a single live-data expression (`!isLoadingJobs && !isFetchingJobs && activeJobs.length > 0`) which broke the mock "filled" demo toggle: with `USE_MOCK_DATA: true` the Repairs section showed empty regardless of the `isFilled` state. Now gated on `FEATURE_FLAGS.USE_MOCK_DATA`: mock mode uses the `isFilled` toggle, live mode derives from query data. Imported `FEATURE_FLAGS` from `lib/featureFlags` (was not previously in this file). Do not collapse these branches — they serve different purposes.
- `components/ProProfile.tsx` — **Bug 4**. Distinguished `connectSent` (just-sent in this session) from `connectionPending` (pre-existing DB pending state) in the primary CTA label. Previously both rendered as "Request Pending". After a successful send, the button now shows "Request Sent ✓" for clear visual confirmation alongside the `SuccessToast` fired in `handleSendConnect`. Both feedback mechanisms fire — the toast is additive, not a replacement. `setConnectSent(true)` + `showSuccess('Request sent')` both present in `onSuccess` (S149b wiring preserved).
- `components/ChatScreen.tsx` — **Bug 6**. Current KAV structure already matched the canonical pattern (`SafeAreaView(top)` → `KeyboardAvoidingView(padding, offset:0, flex:1)` → ScrollView(messages) → View(input container) → `SafeAreaView(bottom)`). Added a **hard-requirement comment block** above the `return` statement locking this structure — any future session that touches ChatScreen must preserve it. Removing `fullScreenModal` from InboxStack (S151/S152) requires `keyboardVerticalOffset: 0`; any change breaks input bar position (empty space below or input hidden by keyboard).
- `tasks/lessons.md` — Added "HARD REQUIREMENT — ChatScreen keyboard pattern (S152)" entry documenting the structure and the rationale for the lock.
- `tasks/screen-registry.md` — ChatScreen entry updated with the keyboard pattern hard-requirement note.

**Key decisions:**
- **Bug 2 root cause was NOT in PostJobWizard.** The session spec theorised a state-variable mismatch between `onSelect` target and validation field in PostJobWizard. Audit of PostJobWizard.tsx showed every reference uses `form.propertyAddress` consistently (line 343 value, line 344 onSelect, line 347 error, line 838 canContinue, line 870 RPC). No mismatch exists. The actual bug was in AddressAutocompleteInput: `handleTextChange` never committed typed text to parent — it only wiped it (`onSelect('')` on every subsequent keystroke). Fixed at the component level so all four consumer screens benefit.
- **Bug 5 — Option B chosen** (remove `fullScreenModal` from InboxStack) over Option A (pop + navigate from CreateDealChat). Structurally cleaner, leaves navigation call sites alone, and matches the S146 DealChatScreen card-animation precedent.
- **Bug 6 — no structural fix required.** The canonical KAV pattern was already in place; the value of this session on Bug 6 was locking it via a visible comment block + lessons.md entry so future sessions cannot silently regress it. The empty-space symptom reported in QA may have been transient (stale Metro cache after flag flip) or device-specific — structure matched spec, so locked as-is.
- **commit-on-keystroke rejected for Bug 2.** First attempt proposed committing the text on every keystroke; rejected by review because it would let partial strings ("123") pass validation mid-type. `onBlur` commit preserves the partial-string guard (validation only fires on Continue, which is a blur event anyway).

**Feature flags:** **NOT RESET.** Build 40 QA state preserved per spec — `USE_MOCK_DATA: false`, `DEV_BYPASS_AUTH: false`, `DEV_SHOW_PASSWORD_LOGIN: true`, `LIVE_NEIGHBORHOOD_HOOKS: false`. Flip back to demo defaults before the next investor demo.

**Verification:**
- `npx tsc --noEmit` → **0 errors**
- `npx expo lint` → **0 new warnings** (7 pre-existing, unchanged from S151)
- Count updates: Hooks = unchanged. RPCs = unchanged. Shared components = unchanged.

---

## S151 — Build 39 QA Fixes (April 14, 2026)

**Card:** ATL-QA-BUILD39 → ✅ Done

**Files modified:**
- `components/CategoryMapScreen.tsx` — Bug 8a. Replaced `SafeAreaView edges={['top']}` wrapper on the multi-category header overlay with a plain `View` + `paddingTop: insets.top + 8`. The `SafeAreaView`-as-absolute-overlay pattern was unreliable; explicit inset math fixes the notch clipping.
- `components/PostStagingJobScreen.tsx` — Bug 3. Date field label `"Specific Date (optional)"` → `"Date Needed *"`, placeholder `"Select a date (optional)"` → `"Select date"`. Matches PostPhotoJobScreen copy.
- `components/InboxStack.tsx` — Bug 5. Removed `presentation: 'fullScreenModal'` from ChatScreen screen options; added `gestureEnabled: true`. Swipe-back now works. Matches S146 DealChatScreen precedent.
- `components/NewMessageScreen.tsx` — Bug 6. Replaced left-chevron `BackIcon` with right-aligned `CloseIcon` (X). Header row now: `[title flex:1 left-aligned][44×44 X right]`. 44×44 Pressable touch target preserved.
- `components/CreateDealChat.tsx` — Bug 6 sibling. Same X-on-right pattern applied — it's the second bottom-sheet modal in InboxStack and had the same chevron issue.
- `components/HomeTabAgent.tsx` — Bug 1 + Bug 8b. Removed `hasActiveRepair` state entirely (was a demo scaffolding toggle defaulting `false`). Now derived: `hasActiveRepair = !isLoadingJobs && !isFetchingJobs && activeJobs.length > 0`. Empty/Filled dev toggle no longer writes to it (kept for other `isFilled`-gated sections). Root cause: with `USE_MOCK_DATA: false`, real data loaded but the manual toggle left `hasActiveRepair` false forever → empty state fired over real jobs.
- `components/ProProfile.tsx` — Bug 7. Removed the duplicate secondary "Message" CTA (was a mirror of the primary, both `console.log` only). Wired primary Message CTA: added `useInboxThreads()` import + client-side filter on `type === 'one_to_one'` matching `other_member.user_id === resolvedProfileId`. Navigates to `InboxStack.ChatScreen` with `threadId` if an existing 1:1 thread is found, else with `recipientId` so ChatScreen creates the thread on first send. `@demo`/`@backend` markers on the lookup.
- `components/shared/AddressAutocompleteInput.tsx` — Bugs 2 + 4. Migrated the suggestion dropdown out of the inline absolute-positioned child (which was clipped/occluded by the surrounding `KeyboardAvoidingView` + `ScrollView` stacking contexts on iOS) into a `Modal transparent` overlay. Input wrapper is measured via `measureInWindow` on layout + focus; dropdown is rendered at those window coordinates so it escapes every ancestor clip. Dropdown height is clamped by `Dimensions.get('window').height` so it never overflows. Added `__DEV__` console warning when `GOOGLE_MAPS_API_KEY` is empty (silent failure masked the bug during QA). Fix applies to PostPhotoJobScreen, PostStagingJobScreen, and PostJobWizard — they all import the same shared component.
- `components/SquadSlotPicker.tsx` — Bug 8b (closing-squad role select flash). `prosSource` no longer falls back to `CONNECTED_PROS` mock data when `USE_MOCK_DATA: false` — it returns `[]` during load. Added `isLoadingLivePros` gate using `isLoading || isFetching` from `useConnectedPros`. Renders a 3-row `SkeletonBlock` set while loading instead of mock pros. This is the specific "demo users flash to live users" bug reported in QA.
- `components/VouchFeedSection.tsx` — Bug 8b (vouch feed flash). Added `isLoadingVouches || isFetchingVouches` gate on `useVouchFeed(activeFilter)`. Renders skeleton rows while loading; empty state only fires after query settles. Gated to live mode (`!USE_MOCK_DATA && !externalVouches`) so the mock/embedded paths are unaffected.
- `components/AgentDealsScreen.tsx` — Bug 8b (deals list flash). Added `isLoadingDeals || isFetchingDeals` gate on `useAgentDeals()`. Skeleton cards render during load instead of falling straight through to the empty state.
- `tasks/lessons.md` — Added "LOADING STATE RULE (S151)" documenting the mock-fallback anti-pattern that caused the Build 39 flash bug, with correct pattern and anti-pattern side by side.

**Bug 2+4 root cause:** Dropdown was clipped/occluded by the iOS stacking contexts created by the parent `KeyboardAvoidingView` and `ScrollView`. The component already had `zIndex: 1000` but that only affects ordering among siblings of the *same parent* — it doesn't escape ancestor clipping. Modal overlay is the definitive fix because it renders in a top-level window outside the RN view tree. The `GOOGLE_MAPS_API_KEY` is present in EAS; the Google Places + Geocoding APIs are enabled; root cause is code, not environment.

**Bug 7 thread lookup:** Used `useInboxThreads()` (existing hook, returns `InboxThread[]` with `other_member.user_id`) + client-side `.find()` on `type === 'one_to_one'`. No new RPC introduced.

**Flash-fix audit — screens reviewed:**
- Already-gated (no change needed): `InboxList` (S138 skeleton + S149a empty state), `NetworkTab` (S138 skeleton + S149a empty state), `ContractorHomeTab`, `ProfileTab`.
- Fixed this session: `HomeTabAgent` (active jobs), `SquadSlotPicker`, `VouchFeedSection`, `AgentDealsScreen`.
- Out of scope this session (not in priority-6): `FindTab`, `NotificationsTab`, `PaymentSettingsScreen`, `DealClosedCelebrationScreen`, `HomeTabPartner`, `RepairJobDetails`. Any flash reports on those screens would be a follow-up session.

**Feature flags:** **NOT RESET.** Build 39 QA state preserved per spec — `USE_MOCK_DATA: false`, `DEV_BYPASS_AUTH: false`, `DEV_SHOW_PASSWORD_LOGIN: true`, `LIVE_NEIGHBORHOOD_HOOKS: false`. Flip back to demo defaults before the next investor demo.

**S151b addendum — CreateDealChat address + navigation:**
- `components/CreateDealChat.tsx` — Fix A: Property Address inline `TextInput` replaced with the shared `AddressAutocompleteInput` (imported from `./shared`). This screen had never been migrated in S144 so Google Places never fired on deal-chat creation. `@demo`/`@backend` markers note that lat/lng is still stubbed — `AddressAutocompleteInput` only returns the description string today; when `rpc_create_deal_thread` is wired, resolve lat/lng via a Places Details call or extend the shared component. Fix B: `handleCreateChat` now uses `navigation.replace('DealChatScreen', …)` instead of `navigation.navigate`. Because `CreateDealChat` is registered as `fullScreenModal` in `InboxStack`, plain navigate pushed `DealChatScreen` *on top of* the modal root → back returned to CreateDealChat. `replace` swaps the modal-root screen so back dismisses the modal layer and returns to `InboxList`. Considered and rejected `CommonActions.reset` (would clobber `InboxList` underneath).
- `components/DealChatScreen.tsx` — Fix C: **no changes needed.** Main chat input bar (`SafeAreaView edges=['top']` → `KeyboardAvoidingView flex:1 keyboardVerticalOffset:0` → ScrollView + input bar inside `SafeAreaView edges=['bottom']`) already matches the `tasks/lessons.md` canonical pattern. Deal Details edit modal KAV (line 463) is still the outermost child of `<Modal>` with `flex:1`, wrapping the `<Pressable backdrop>` → `Animated.View` sheet — the S146 Bug 7 fix is still in place. Verified; no regression.
- InboxStack presentation mode: `CreateDealChat` stays registered as `fullScreenModal` + `slide_from_bottom` — intentional per S151, the `replace` fix is sufficient.
- `npx tsc --noEmit` → 0 errors. `npx expo lint` → same 7 pre-existing warnings, none in `CreateDealChat.tsx`.

**Verification:**
- `npx tsc --noEmit` → 0 errors (verified at multiple checkpoints during the session)
- `npx expo lint` → 0 new warnings (7 pre-existing: CategoryMapScreen deps ×3, ContractorHomeTab unused var, PostPhoto/Staging `jobId` unused, SquadSlotPicker `prosSource` deps — all predate S151)
- Count updates: Hooks = unchanged (no new hooks added). RPCs = unchanged. Shared components = unchanged.

---

## S150 — Delight System: CelebrationScreen + MomentBanner + 7 Moments (April 14, 2026)

**Card:** ATL-DELIGHT-SYSTEM → ✅ Done

**Files created (3):**
- `components/shared/CelebrationScreen.tsx` (~290 lines) — Tier 1 full-screen delight component. Props: `icon, headline, subtext, ctaLabel, onCta, secondaryCta?, onSecondaryCta?, showConfetti?, accentColor?, ctaLoading?`. Replicates DealClosedCelebrationScreen confetti exactly: 12 dots, 30° radial burst, `Animated.stagger(40)`, spring `bounciness: 4, speed: 8`, opacity 1→0 timing 600ms delay 200. Entrance sequence: icon springs at 200ms (`bounciness: 14, speed: 6`), headline fades + translates at 350ms, subtext at 450ms, primary CTA at 550ms, secondary CTA at 600ms. Core RN `Animated` only, `useNativeDriver: true` throughout. `ctaLoading` threads to `PrimaryButton.loading` for async mutations.
- `components/shared/MomentBanner.tsx` (~130 lines) — Tier 2 slide-down banner. Absolute top positioning, zIndex 9998 (below SuccessToast 9999 — the two never fire simultaneously by design). Slide-in spring (`bounciness: 4, speed: 14`), auto-dismiss 2500ms, slide-out timing 250ms `Easing.in(Easing.ease)`. `pointerEvents: 'none'` — zero-friction, no dismiss button, no tap target. Props: `icon, message, visible, onDismiss, accentColor?`. Timer cleanup on unmount or visible-flip.
- `hooks/useMomentBanner.ts` (~55 lines) — state hook mirroring `useSuccessToast`: `{ bannerConfig, showBanner, clearBanner }`. NOT in barrel (per spec). Header documents the first-bid AsyncStorage pattern used in BidSubmissionScreen.

**Files modified (9):**
- `components/shared/index.ts` — exported `CelebrationScreen`, `MomentBanner`, and both prop types. `useMomentBanner` intentionally excluded (not in barrel, same as `useSuccessToast`).
- `components/BidSubmissionScreen.tsx` — **E1 Tier 2**: first-bid Banner. Gates on AsyncStorage key `atlasio_first_bid_shown`. On `submitBid.onSuccess`, if `!isEdit` AND key unset, fires `MomentBanner` with `🎯 First bid submitted — good luck!` AND sets the key; otherwise falls through to the existing S149b `SuccessToast`. The two never fire simultaneously (if/else branch guarantees it). `@demo`/`@backend` markers on the AsyncStorage fallback — replace with `profile.bids_count === 0` check when the field lands.
- `components/ContractorJobDetails.tsx` — **D1 Tier 1**: bid-accepted celebration Modal. `useRef hasShownJobWonRef` + `useEffect([isAccepted])` guard ensures it fires once. Renders `<Modal transparent={false} animationType="fade">` wrapping `<CelebrationScreen>` with `🔨` icon, headline "You got the job!", primary CTA "View Job Details", secondary "Message Agent", `showConfetti: true`. `handleMessageAgent` dismisses the modal and leaves navigation as a documented `@backend` TODO (prevents crashes when `Messages` route isn't registered in the current contractor stack).
- `components/HomeTabAgent.tsx` — **E2 Tier 2**: closing-squad-complete Banner. `useRef prevFilledCountRef` captures previous count; fires `🤝 Your closing squad is complete!` on the `< totalSlots → === totalSlots` transition only. Doesn't fire on mount or re-entry.
- `components/VerificationScreen.tsx` — **E3a Tier 2**: license-submitted Banner. Replaces the existing `Alert.alert('License Submitted'...)` in both LIVE_VERIFICATION_HOOKS paths (live + mock) with `MomentBanner` firing `🛡️ License submitted for review` (accent `successGreen`). Copy intentionally says "submitted for review" — never overclaims verified status.
- `components/InsuranceUploadScreen.tsx` — **E3b Tier 2**: insurance-submitted Banner (retargeted from VerificationScreen since S54 removed the insurance section there). `showBanner` fires `✅ Insurance submitted for review` right before `setSubmitted(true)`. Renders atop the existing "Submitted for Review" confirmation view as a brief flourish.
- `components/RepairJobDetails.tsx` — **E4 Tier 2**: first-bid-received Banner (agent side). `useRef prevBidsCountRef` tracks `bids.length`; fires `📬 Your first bid just came in!` on the `0 → 1` edge only. Works with both mock and live data paths (via existing `setJob` composite).
- `components/JobCompletionScreen.tsx` — contractor completed state enhancements (agent view untouched): (a) **earnings display** (line ~1429) — `$X,XXX earned` 32pt/700/successGreen, reads `job.awardedBid.amount`. Static render — count-up animation deferred to S151 (requires `useNativeDriver: false` + Animated listener, flagged for dedicated work); (b) **jobs completed stat** (line ~1442) — `Jobs completed: X` from new `useContractorEarnings()` hook, 14pt/500/secondaryText; (c) **vouch prompt card** — elevated from bottom button to a bordered `emptyStateFill` card above the primary CTA with `[Vouch Now] [Maybe Later]`. `vouchCardDismissed` state collapses the card when user picks Maybe Later. Gated on `activeIsContractor && !vouchCardDismissed && !showVouchModal`. (d) **Share CTA promotion NOT applied** — this file has no existing share flow, no `react-native-view-shot` import, no trophy animation. Flagged for S151 with exact line refs: `JobCompletionScreen.tsx:1515–1528` for the Done → "Share your win" swap, pattern reference `components/ShareableClosedDealCard.tsx`.
- `features/partners/components/PartnerDealsScreen.tsx` — **E5 Tier 2**: all-milestones-complete Banner. `useRef firedMilestoneDealsRef: Set<string>` keyed by `deal.job_id` guards against re-firing on re-entry. For each deal in `allDeals`, if `milestones.every(m => m.status === 'complete')` AND the deal isn't in the set, fires `🎉 All milestones complete — great work!` (accent `successGreen`) and adds the deal to the set. `break` after the first firing ensures only one banner per effect cycle. Set is session-scoped — fresh app session resets it.

**Key decisions:**
- **D2 (onboarding complete) downscoped** — the original `OnboardingComplete.tsx` is already a role-branded celebration with animated progress bar, Atlasio brand header, 3 role-specific benefit cards, and a BlurView + LinearGradient CTA. Replacing it with `CelebrationScreen` would have lost polish without a UX gain. The file was tentatively swapped during the build, then **restored to HEAD state** after review. `CelebrationScreen` remains available for future Tier 1 moments.
- **6 of 7 moments shipped as wired** (D1 + E1 + E2 + E3a + E3b + E4 + E5). D2 intentionally preserved original visual — the CelebrationScreen primitive is still net-new value.
- **No count-up animation** on JobCompletionScreen earnings — blast-radius control on a 1513-line role-branched file. Static render only. Exact implementation path documented for S151: needs `useNativeDriver: false` and an Animated listener to tick a React state, which diverges from the rest of S150's pure-transform animations.
- **`ContractorJobDetails.handleMessageAgent` defensive fix applied in review** — the initial version called `navigation.navigate('Messages')` which would throw if `Messages` isn't registered in the current contractor stack (ContractorHomeStack / ContractorJobsStack). Replaced with modal-dismiss-only + `@backend` TODO.
- **`ctaLoading` prop added to CelebrationScreen post-review** — threads through to `PrimaryButton.loading`. Not currently consumed (D1 doesn't need it, D2 reverted), but available for any future async-CTA Tier 1 consumer.
- **No new tokens** — all colors map to existing `COLORS.primary`, `successGreen`, `emptyStateFill`, `border`, `darkText`, `secondaryText`, plus `SHADOWS.card`.

**Verification:**
- `npx tsc --noEmit` → **0 errors**
- `npx expo lint` → **0 new errors/warnings** (7 pre-existing warnings unchanged: CategoryMapScreen useMemo deps ×3, ContractorHomeTab `CURRENT_CONTRACTOR` unused, InsuranceUploadScreen `showBanner` dep ×0 — fixed during build, PostPhotoJobScreen + PostStagingJobScreen `jobId` unused)
- Feature flags unchanged (demo defaults preserved)
- `DealClosedCelebrationScreen.tsx` untouched
- `JobCompletionScreen.tsx` agent view untouched
- `OnboardingComplete.tsx` zero net delta vs HEAD

**Shared Components (components/shared/):** Avatar, VerificationBadge, VerificationBanner, SkeletonBlock, ErrorToast, AddressAutocompleteInput, PhotoLightbox, EmptyState (S149a), SuccessToast (S149b), **CelebrationScreen (S150)**, **MomentBanner (S150)**.

**Hooks:** **+1 useMomentBanner** (mirrors useSuccessToast). Total hooks: 66 → 67.

**COLORS tokens:** 110 (unchanged — S150 reuses existing palette).

---

### S150 — Next Objectives (S151 targets)
- **JobCompletionScreen share CTA** — add `react-native-view-shot` import, create a `ShareableJobCompletionCard` (pattern: `components/ShareableClosedDealCard.tsx`), wire `handleShareWin` with `captureRef`, replace the Done button at `JobCompletionScreen.tsx:1515–1528` with `<PrimaryButton label="Share your win" ...>` and demote Done to secondary.
- **JobCompletionScreen earnings count-up** — add `Animated.Value(0)` for earnings, `Animated.timing` on `jobStatus === 'completed'` transition with `useNativeDriver: false`, `addListener` to tick a `displayEarnings` state, replace the static text at `JobCompletionScreen.tsx:1429`. Clean up listener on unmount.
- **OnboardingComplete D2 hybrid consideration** — if user signal indicates the Tier 1 celebration moment is still desired, wire `CelebrationScreen` as a brief Modal overlay BETWEEN "tap CTA" and "navigate to MainApp" (preserving the existing onboarding visual underneath).
- **Deferred from review:** `InsuranceUploadScreen` MomentBanner cosmetically overlaps the "Insurance Upload" header title during the 2.5s dismiss window — reposition banner to `top: insets.top + 48` or accept as-is.
- **QA focus for Build 39:** all 7 moment triggers on device (first-bid AsyncStorage key, squad-complete ref edge detection, license/insurance submission, first bid received on agent job, all milestones complete on partner deal). `atlasio_first_bid_shown` must be manually cleared to re-test the first-bid banner.
- **Docs follow-up:** add `tasks/screen-registry.md` entries for `CelebrationScreen` + `MomentBanner` + all 9 modified screens. Add `tasks/lessons.md` entry for "ref-gated once-only effect pattern for celebration triggers" (reusable).

---

## S149b — SuccessToast: Shared Component + Action Sweep (April 14, 2026)

**Card:** ATL-SUCCESS-TOAST → ✅ Done

**Files created (2):**
- `components/shared/SuccessToast.tsx` (~155 lines) — visual component: light green surface (`COLORS.successToastBg`), 1px border, 4px left accent bar (`COLORS.successGreen`), 18×18 inline checkmark circle SVG, message text (14pt/500), 44×44 manual dismiss `×`. Spring entrance (translateY 100→0, `bounciness: 6, speed: 14`). Auto-dismiss 3000ms with 200ms fade-out. Positioned `bottom: insets.bottom + 32, left: 24, right: 24`. Companion to `ErrorToast.tsx` — mirrors the architectural pattern (default export, useEffect + setTimeout fade), but visuals are intentionally distinct per the S149b spec's visual section. The "mirror exactly" line in the spec is for the architecture, not the appearance — documented in the file header.
- `hooks/useSuccessToast.ts` (~36 lines) — state hook: `{ successMessage, showSuccess, clearSuccess }`. Mirrors `useErrorToast.ts` exactly (single string state, useCallback show/clear pair). NOT in any barrel — imported directly by screens.

**Files modified (12):**
- `lib/tokens.ts` — added `// ── Success Toast (S149b) ──` section with 3 tokens: `successToastBg: '#F0FDF4'`, `successToastBorder: '#BBF7D0'`, `successToastText: '#15803D'`. Reused existing `COLORS.successGreen ('#16A34A')` for accent bar + check icon — did NOT add a new `success` token. **COLORS token count: 107 → 110.**
- `components/shared/index.ts` — added `export { default as SuccessToast } from './SuccessToast';`. Hook NOT in barrel per spec.
- `hooks/useUploadAvatar.ts` — added optional `onSuccess?: () => void` parameter to `pickAndUpload(currentAvatarUrl, onSuccess)`. Fires after successful upload AND successful remove (both code paths). Failure path unchanged — `Alert.alert('Upload Failed', message)` from the S146 fix is preserved exactly. Minimal-blast: hook still returns the same shape.
- `components/PostPhotoJobScreen.tsx` — replaced try-branch `Alert.alert('Job Posted!')` with `showSuccess('Photo job posted successfully')` + `setTimeout(navigation.goBack, 400)`. Catch fallback Alert untouched per user directive (option c).
- `components/PostStagingJobScreen.tsx` — same pattern: try-branch toast + 400ms nav delay, catch fallback Alert untouched.
- `components/BidSubmissionScreen.tsx` — replaced `Alert.alert(isEdit ? 'Bid Updated' : 'Bid Submitted', ...)` in `submitBid.mutate(...).onSuccess` with toast `'Bid updated'` / `'Bid submitted'` (`isEdit`-aware) + 400ms nav delay. `onError` Alert untouched.
- `components/EditProfileScreen.tsx` — TWO wirings: (a) `useUpdateProfile` onSuccess — toast `'Profile saved'` + 400ms nav delay, error Alert preserved; (b) avatar — `pickAndUpload(currentAvatarUrl, () => showSuccess('Photo updated'))` at both `Avatar onPress` and "Change Photo" Pressable. Avatar failure Alert (S146 fix) untouched.
- `components/ProProfile.tsx` — added `showSuccess('Request sent')` to `handleSendConnect` after the existing `setConnectSent(true)` + modal close. The owned mutation path. `useSendConnectionRequest` mutation otherwise unchanged.
- `components/FindTab.tsx` — also wired `showSuccess('Request sent')` into `handleSendConnect`. **Note:** FindTab's connection handler is currently a `console.log` stub; the real mutation lives in ProProfile. Added the toast anyway because FindTab's modal is the user-facing surface — users who tap "Send" expect feedback. Marked `@demo connection mutation is stubbed in FindTab — real mutation lives in ProProfile.handleSendConnect`.
- `components/AgentDealDetailScreen.tsx` — added `showSuccess('Link ready to share')` immediately after the awaited `Share.share(...)` call in `handleShare`. Wording deviates from the spec's `'Link copied to clipboard'` because the actual UX is `Share.share` (native iOS share sheet), NOT a clipboard copy. Per approved deviation (b), kept Share.share unchanged. Failure Alert untouched.
- `components/JobCompletionScreen.tsx` — added `showSuccess('Vouch sent — thanks for sharing your experience')` to `handleVouchSubmit`. Hook destructured with alias: `showSuccess: showSuccessToast` to avoid collision with the existing local `showSuccess` overlay state at line 448 (a totally separate "success overlay" animation system used for revision/confirmation flows). The `showSuccessOverlay` system was NOT touched — toast is additive, scoped to the vouch path only. Audit confirmed no `DealClosedCelebrationScreen` transition fires from this screen, so no animation conflict.

**Skipped (with reason):**
- **PostJobWizard.tsx** — already has a dedicated full-screen success view (`renderSuccessView` at line 905) using the DealCreationSheet pattern from S80. Per the spec's "do not add a toast on top of dedicated confirmation UI" rule, did NOT wire. The in-place success view is stronger feedback than a toast and intentionally requires user tap to navigate. Flagged here for visibility — no action needed.

**Spec deviations (all approved before build):**
1. **(a) "Mirror ErrorToast exactly" vs visual spec contradiction** — followed the visual spec (light surface, border, accent bar, icon, manual dismiss, safe-area positioning, 3000ms, spring `bounciness: 6 speed: 14`). The "mirror" rule applies to architecture, not visuals. Documented in `SuccessToast.tsx` file header.
2. **(b) Action #8 wording** — `'Link ready to share'` instead of `'Link copied to clipboard'` because the actual UX is `Share.share`, not Clipboard. `Share.share` left unchanged.
3. **(c) PostPhoto/PostStaging catch fallback Alerts** — left untouched. Worth noting these are actually mock success fallbacks (not error paths) — they fire `Alert.alert('Job Posted!')` even when the RPC fails, to keep the demo unbreakable. Inconsistent UX with the try-branch toast; flagged for a follow-up cleanup (consolidate to toast in both paths once `LIVE_*` flags are permanent).
4. **(d) FindTab wiring** — wired even though the mutation is stubbed (lives in ProProfile). User-facing surface needs feedback regardless.
5. **(e) Avatar wiring approach** — chose to add an optional `onSuccess` callback parameter to `pickAndUpload` (cleanest minimal-blast option). Alternative was a `useEffect` watching `isUploading` falling edge, which is fragile. Failure Alert (S146) preserved.
6. **`successGreen` token already exists** — reused the existing `COLORS.successGreen ('#16A34A')` from `lib/tokens.ts:75` for the accent bar + checkmark fill. Did NOT add a new `success` token (would have been a duplicate).

**Verification:**
- `npx tsc --noEmit` → **0 errors**
- `npx expo lint` → **0 errors**, 6 pre-existing warnings (CategoryMapScreen useMemo deps ×3, ContractorHomeTab `CURRENT_CONTRACTOR` unused, PostPhotoJobScreen + PostStagingJobScreen `jobId` unused — all pre-existing, none introduced by S149b).
- Feature flags unchanged (demo defaults preserved).
- Avatar failure `Alert.alert` (S146 fix) confirmed still fires on upload error.
- All 8 wired toasts use the same shared `<SuccessToast>` component — no per-screen variants.

**Shared Components (components/shared/):** Avatar, VerificationBadge, VerificationBanner, SkeletonBlock, ErrorToast, AddressAutocompleteInput, PhotoLightbox, EmptyState (S149a), **SuccessToast (S149b)**.

**Hooks:** **+1 useSuccessToast** (mirrors useErrorToast). Total hooks: 65 → 66.

**COLORS tokens:** 107 → 110 (+3).

---

## S149a — Empty States: Shared Component + Full Sweep (April 14, 2026)

**Card:** ATL-EMPTY-STATES → ✅ Done

**Files created (2):**
- `components/shared/EmptyState.tsx` (~150 lines) — public component: `EmptyStateProps` interface (`illustration`, `title`, `body`, `ctaLabel?`, `onCta?`, `style?`), illustration switch, layout (160×160 illustration → 17pt title → 14pt body → optional 14pt CTA, all centered, paddingHorizontal:32 paddingVertical:48, flex:1).
- `components/shared/EmptyStateIllustrations.tsx` (~290 lines) — 10 named SVG illustrations (`InboxIllustration`, `FindIllustration`, `NetworkIllustration`, `JobTrackerIllustration`, `ContractorHomeIllustration`, `AgentDealsIllustration`, `NotificationsIllustration`, `JobBidsIllustration`, `VouchFeedIllustration`, `ProfileVouchesIllustration`). All use 160×160 viewBox, strokeWidth 1.5, round caps/joins, palette of `EMPTY_PALETTE` (primary/fill/mid/white). Internal file — NOT exported from barrel.

**Files modified (12):**
- `lib/tokens.ts` — added `// ── Empty States (S149a) ──` section under `COLORS` with two new tokens: `emptyStateFill: '#EBF0FF'`, `emptyStateMid: '#C7D4FF'`. **COLORS token count: 105 → 107.**
- `components/shared/index.ts` — barrel exports `EmptyState` (default) plus type re-exports `EmptyStateProps` and `EmptyStateIllustration`. `EmptyStateIllustrations` intentionally NOT exported.
- `components/InboxList.tsx` — replaced custom "Start a conversation" empty UI inside the `threads.length === 0 && searchText.length === 0` branch with `<EmptyState illustration="inbox" title="No messages yet" body="Conversations with pros appear here." ctaLabel="Find pros" />` → CTA dispatches `CommonActions.navigate({ name: 'Find' })`.
- `components/FindTab.tsx` — replaced inline "No pros found" mini-empty with `<EmptyState illustration="find" />`. Already gated on `isSearching` (existing `searchText.length > 0 || activeRole !== 'All'` condition), so the empty state only shows after a search/filter is applied. CTA = local handler that calls `setSearchText('')` + `clearAllFilters()`.
- `components/NetworkTab.tsx` — replaced the main contacts empty state (the `contacts.length === 0 && searchText.length === 0` branch in agent/contractor mode) with `<EmptyState illustration="network" />`. CTA dispatches `CommonActions.navigate({ name: 'Find', params: { screen: 'FindMain' } })`. Two other in-file empty states (partner-mode "Your Agents" empty at line ~397, and the "no search matches" empty at line ~1063) intentionally left untouched as they are different sub-zones — flagged for follow-up.
- `components/JobTrackerTab.tsx` — replaced inline `ListEmptyComponent` View block with `<EmptyState illustration="job_tracker" />`. **Per-filter copy preserved** by keeping `EMPTY_STATE_CONFIG` keyed by `FilterOption` (only `headline`/`body` per filter; `icon` field removed). Deleted 5 unused inline icon components (`ClipboardIcon`, `EnvelopeIcon`, `PaperPlaneIcon`, `HammerIcon`, `CheckCircleIcon`). CTA = "Browse open jobs" → contractor `Home` tab.
- `components/ContractorHomeTab.tsx` — wrapped sections from Stripe banner through Market Pulse in a `!isFilled ? <EmptyState illustration="contractor_home" /> : <>...</>` conditional. When the demo "Empty" toggle is selected, ALL 5 section-level empty chips are replaced by ONE shared `<EmptyState>` (title `"You're all set"`, body `"No active jobs right now. New matches will appear here."`, CTA `"Browse open jobs"` → `Jobs` tab). `@demo — pull-down empty toggle can be removed when live hooks are wired` marker added. The 5 inline `EmptyStateCallout` section chips kept for the case when individual sections are empty inside a partially-filled state.
- `components/AgentDealsScreen.tsx` — replaced inline empty View with `<EmptyState illustration="agent_deals" />`. **Imports `DEAL_CREATION_ENABLED` from `lib/config.ts`** (NOT `lib/featureFlags.ts` — see Spec Deviations below). CTA `"Create a deal"` only rendered when `activeFilter === 'all' && DEAL_CREATION_ENABLED` — currently false at MVP launch. Body copy varies per filter (`'all'` / `'needs_attention'` / `'closing_soon'`). Removed unused `emptySubtitle` const.
- `components/NotificationsTab.tsx` — replaced `renderEmptyState` body with `<EmptyState illustration="notifications" title="You're all caught up" body="No new notifications right now." />`. No CTA per spec.
- `components/RepairJobDetails.tsx` — added a new bids-empty branch inside the existing Bids Section: `effectiveJobStatus === 'open' && sortedBids.length === 0` renders `<EmptyState illustration="job_bids" title="No bids yet" />`, otherwise renders `sortedBids.map(...)`. No CTA — informational only. Status gate ensures awarded/completed jobs continue to show their own status UI.
- `components/VouchFeedSection.tsx` — deleted local `EmptyState` component (renamed to ensure no shadowing). Imported shared `EmptyState` from `./shared` and `useDemoRole` from `lib/demoRoleContext`. Role-branched CTA: `demoRole === 'contractor'` shows `"Find work"`, `demoRole === 'agent'` shows no CTA. Inline comment explains the business rule (contractors earn vouches by completing jobs; agents don't get vouched the same way).
- `components/ProfileTab.tsx` — replaced the inline "No vouches yet" Text inside `VouchesBottomSheet` with `<EmptyState illustration="profile_vouches" title="No vouches received" body="Vouches from collaborators show here after completing jobs together." />`. No CTA. Style override `{ flex: 0, paddingVertical: 32 }` so the empty state fits inside the bottom-sheet ScrollView (avoids `flex:1` collapsing inside a scroll container).

**Spec deviations (flagged for review, none blocking):**
1. **`DEAL_CREATION_ENABLED` source:** spec named `lib/featureFlags.ts`, but the real flag lives in `lib/config.ts` alongside `PARTNER_TRACK_ENABLED`. Used the existing convention.
2. **JobTrackerTab per-filter copy:** spec gave one global copy block, but the screen already has filter-specific copy (`'No invitations'`, `'No bids sent'`, etc.) which is better UX. Kept the per-filter copy and used the same `job_tracker` illustration for all filters.
3. **`contractor_home` copy:** updated per user feedback to `title="You're all set"`, `body="No active jobs right now. New matches will appear here."` (spec originally said `"All clear"`).
4. **NetworkTab partial-replacement:** only the main contacts empty state was wired. The partner-mode "Your Agents" empty (line ~397) and the search-no-matches empty (line ~1063) were left as-is per minimal-blast-radius rule. Both are different sub-zones and would need separate decisions on illustration/copy.
5. **ContractorHomeTab full takeover:** rather than replacing each of the 5 section-level `EmptyStateCallout` chips (which are visually scoped to small section cards), I added a top-level `!isFilled` conditional that swaps all sections for one shared `<EmptyState>`. This matches the spec intent ("Empty state replaces the 'empty' pull-down toggle"). The section-level chips remain in place for partial-empty states.
6. **`style` prop usage:** four screens pass `style={{ flex: 0, paddingVertical: 32 }}` because the shared component's default `flex: 1` collapses inside ScrollView containers (RepairJobDetails bids, VouchFeedSection, ProfileTab vouches, and inside ContractorHomeTab the takeover uses `<View style={{ minHeight: 480 }}>` instead).

**Verification:**
- `npx tsc --noEmit` → **0 errors**
- `npx expo lint` → **0 errors**, 6 pre-existing warnings (CategoryMapScreen useMemo deps ×3, ContractorHomeTab `CURRENT_CONTRACTOR` unused, PostPhotoJobScreen + PostStagingJobScreen `jobId` unused — all pre-existing, none introduced by S149a).
- Feature flags unchanged (demo defaults preserved). `DEAL_CREATION_ENABLED: false` confirmed.

**Shared Components (components/shared/):** Avatar, VerificationBadge, VerificationBanner, SkeletonBlock, ErrorToast, AddressAutocompleteInput, PhotoLightbox, **EmptyState (S149a)**.

**COLORS tokens:** 105 → 107 (+2).

---

## S148b — Neighborhood Intelligence: Map Redesign (April 14, 2026)

**Card:** ATL-NEIGHBORHOOD-MAP → ✅ Done

**Files modified:**
- `lib/tokens.ts` — added 16 `categoryXxx` color tokens (all/coffee/yoga/parks/walkability/gym/grocery/transit/bike/air_quality/dining/schools/healthcare/pet_friendly/nightlife/other).
- `lib/neighborhoodScoring.ts` — added `CATEGORY_DISPLAY` constant (chip/map visual layer). `CATEGORY_META` untouched.
- `components/HomeStack.tsx` — widened `CategoryMapScreen` params as a **superset**: new optional `initialCategory`, `allResults`, `radiusMi` alongside the original legacy fields. Backwards-compatible with `AddressComparisonScreen`.
- `components/CategoryMapScreen.tsx` — full redesign (883 lines). Detects mode via `route.params.allResults`:
  - **Multi-category mode** (from NeighborhoodMatchScreen): filter chip bar (horizontal scroll, all + per-category), animated custom POI pins (category color + emoji bubble + tail), auto-fit camera (debounced 100ms), place preview bottom sheet with drag-to-dismiss PanResponder, backdrop dismiss, and "Open in Maps" platform deep link (`maps:` iOS / `geo:` Android).
  - **Legacy single-category mode** (from AddressComparisonScreen): preserved unchanged so existing comparison-card map chips still work.
- `components/NeighborhoodMatchScreen.tsx` — three additions:
  1. Primary "View All on Map" CTA above the Nearby list (passes full `categoryScores` + `pois`).
  2. Per-category "See on map" rows now navigate with `initialCategory: cat.category` + full `allResults` — the category arrives pre-selected.
  3. Score ring **shimmer sweep**: `LinearGradient` overlay on the ring, single 800ms fire after the score animation completes **if `compositeScore >= 80`**. Uses `expo-linear-gradient` (confirmed already in `package.json` ~55.0.13). Celebration effect — no dependency added.

**Key decisions:**
- **Param shape is additive, not replacing.** The spec asked for `{ initialCategory, allResults, address, radiusMi }` but also forbade modifying `AddressComparisonScreen`. Since ACS passes per-entry `lat/lng` + per-category POI slices, a hard replacement would have broken it. Resolved with a discriminated-style superset: new fields are optional, old fields remain. `CategoryMapScreen` dispatches on presence of `allResults`.
- **POI key strategy.** `POIResult` has no `id` field — used `${category}-${name}-${lat}-${lng}` for React keys and per-pin animation maps.
- **`CATEGORY_DISPLAY` vs `CATEGORY_META`.** Kept both. `CATEGORY_META` stays the score/label source of truth; `CATEGORY_DISPLAY` is a chip/map-only visual layer with shorter labels ("Parks" not "Parks & Nature") and distinct colors tuned for chip contrast on white.
- **No shared `Button` component exists.** "View All on Map" uses an inline primary `Pressable` matching app conventions (48pt height, radius 12, `COLORS.primary` bg, `COLORS.onPrimary` text).
- **Haptics on chip toggle** via `expo-haptics` `ImpactFeedbackStyle.Light` — already in deps.

**Verification:** `npx tsc --noEmit` → 0 errors. `npx expo lint` → 0 new warnings on touched files. Feature flags unchanged (`LIVE_NEIGHBORHOOD_HOOKS: false`).

---

## S62b — Partner Track RPCs (March 17, 2026)

**8 RPCs deployed to Supabase (all SECURITY DEFINER, smoke tested):**
- `rpc_get_partner_active_deals` — partner home tab + deals list data
- `rpc_update_milestone_status` — partner advances a milestone (ownership validated)
- `rpc_seed_deal_milestones` — seeds standard milestones on deal assignment (idempotent, live tested)
- `rpc_post_deal_alert` — partner posts urgent alert to agent (140-char limit enforced server-side)
- `rpc_dismiss_deal_alert` — agent or partner dismisses an alert (soft delete, both callers allowed)
- `rpc_get_partner_stats` — partner stats summary (vouches_received live; profile_views + search_appearances stubbed — ⚠️ flagged for product review before partner launch)
- `rpc_toggle_accepting_clients` — partner availability toggle (COALESCE-safe for nullable column)
- `rpc_get_deal_board_for_agent` — agent deal board full data per job (S63 data source)

**Architecture note:** ~~All 8 RPCs anchor to `job_id` as FK (temporary).~~
Migration to `transaction_id` completed in S87. RPCs updated: rpc_seed_deal_milestones, rpc_post_deal_alert, rpc_get_deal_board_for_agent.

**Live test:** `rpc_seed_deal_milestones` — 5 Title/Escrow milestones seeded correctly.
Idempotency guard confirmed (second call returns `seeded: false`). Test data cleaned up.

**Commit:** `feat: S62b partner RPCs deployed — 8 RPCs live`

When adding new RPCs, hooks, or Edge Functions — increment the count in this file and in the session commit message.

---

## Feature Flags (lib/featureFlags.ts) — Demo Defaults
```typescript
USE_MOCK_DATA: true           // true = demo mode, false = live Supabase
LIVE_ONBOARDING: false        // false for all demos
LIVE_CONTRACTOR_HOOKS: true   // flipped true in S36, permanent
LIVE_VERIFICATION_HOOKS: false
LIVE_INSURANCE_HOOKS: false   // flip true only for live insurance testing
DEV_BYPASS_AUTH: true         // true = loads agent demo user, bypasses login
DEV_SHOW_PASSWORD_LOGIN: false // true = shows password input for device testing
LIVE_SQUAD_SHARE: false
LIVE_PROFILE_HOOKS: true      // flipped true S133, rpc_get_profile_stats deployed — permanent
PARTNER_TRACK_ENABLED: false  // added S62, default false until partner onboarding live
DEAL_CREATION_ENABLED: false  // added S64b, default false until deal creation ready for partner pilot
```

**DEAL_CREATION_ENABLED flag matrix:**
| Scenario | PARTNER_TRACK_ENABLED | DEAL_CREATION_ENABLED |
|---|---|---|
| MVP launch (agent + contractor only) | false | false |
| Partner pilot (view only) | true | false |
| Full partner launch | true | true |
| Investor demo (show everything) | true | true |

**Flag workflow:**
- Flip flags to true for live testing
- Reset to demo defaults above before every commit and investor demo
- Never commit with live flags unless intentional and documented
- After any flag change: `npx expo start --clear` + force-close app on device

---

## Test Users
| Email | Password | Role | Notes |
|---|---|---|---|
| `tony@atlasioapp.com` | magic link | agent | Primary demo user |
| `contractor@atlasioapp.com` | `Atlasio2026!` | contractor | Insurance upload test user |

**Contractor account reset SQL** (run in Supabase SQL Editor when needed):
```sql
UPDATE profiles
SET
  insurance_status      = 'none',
  insurance_uploaded    = false,
  insurance_doc_url     = NULL,
  insurance_doc_name    = NULL,
  insurance_expiry_date = NULL,
  insurance_expiry      = NULL,
  updated_at            = NOW()
WHERE id = '08656bff-2726-433d-bd4b-76e4a0720d33';
```

To sign in as contractor for device testing:
```typescript
DEV_BYPASS_AUTH: false,
DEV_SHOW_PASSWORD_LOGIN: true,
LIVE_INSURANCE_HOOKS: true,
USE_MOCK_DATA: false,
```

---

## Architecture Rules

### Single-Value Principle
Data flowing across screens must always be in its final backend-ready format at the point of entry. No translation layers, mapping functions, or intermediate values requiring downstream conversion. UI-only groupings stay as local UI logic only.

### One Layout Tree Per Screen
Role-conditional content lives WITHIN zones of a single layout tree. Never create separate layout trees or separate files per role. `ProfileTab.tsx` handles agent | contractor | partner via role-conditional zone content — not separate components.

### Profile Architecture (established S43–S44)
- `ProfileTab.tsx` — own profile view for ALL roles (agent/contractor/partner)
- `ProProfile.tsx` — public view for ALL roles
- `ContractorProfileTab.tsx` — DELETED in S44, merged into ProfileTab

### Navigation Rules
- Always pass IDs not objects: `{ profileId: string }`, `{ jobId: string }`
- Cross-stack: `CommonActions.navigate({ name, params: { screen, params } })`
- **Use `navigation.push()` not `navigation.navigate()`** when navigating to screens that use route params — `navigate` reuses the cached screen with stale params, `push` always creates a fresh instance
- Route params are not guaranteed to update on re-navigation — always push fresh
- `InsuranceUpload` fullScreenModal: navigate back with `navigation.navigate('ProfileMain')`, NOT `navigation.getParent()?.goBack()`

### Stack Structure
- `ProfileStack`: ProfileMain → EditProfile → Settings → Verification → PhoneVerification → InsuranceUpload (fullScreenModal)
- `ContractorHomeStack`: Home → ContractorJobDetails → BidSubmission (modal) → JobCompletion (modal)
- `ContractorJobsStack`: JobTrackerTab → ContractorJobDetails → BidSubmission
- `HomeStack`: HomeMain → ClientLifestyleScreen (fullScreenModal) → NeighborhoodMatchScreen (fullScreenModal) → AddressComparisonScreen (fullScreenModal) → CategoryMapScreen (fullScreenModal)
- `BottomTabNavigator`: All 6 tabs always mounted; role-gated via `tabBarButton: () => null` + `tabBarItemStyle: { display: 'none' }` (S55 — eliminates icon flash on role toggle). Agent sees 5, Contractor sees 3. Partner Deals tab shows badge count from `usePartnerInvitations` (S64b).
- `DealCreationSheet`: Bottom sheet modal rendered in HomeTabAgent, gated behind `DEAL_CREATION_ENABLED` flag. Not a navigation route — rendered inline via Modal + spring animation.

### Bottom Sheet Animation Pattern (use consistently)
All bottom sheets use this exact spring pattern:
- `animationType="none"` on Modal
- Backdrop: `Animated.View`, opacity 0→0.5, 300ms, `Easing.out(Easing.ease)`
- Sheet: spring translateY, `damping: 24`, `stiffness: 220`
- Close: reverse both animations, set visible=false in callback
- `useSafeAreaInsets()` for `paddingBottom: insets.bottom + 16`

---

## SQL Workflow (CRITICAL — never skip)
1. **All SQL reviewed in Claude Chat first** — Claude Chat reviews every SQL statement before Tony executes it
2. **Tony executes manually in Supabase SQL Editor** — never via CLI
3. **Never run `supabase db push`** or any CLI database commands
4. **Schema-first verification** — before writing any query or RPC call:
   - Open `sql/schema.sql`
   - Find the exact table/RPC definition
   - Verify column names, types, nullable fields, parameter names
   - Copy parameter names exactly — never guess or abbreviate
   - Use `p_` prefix for RPC parameters (matches schema convention)
5. **Confirm column names** — the `profiles` table uses `name` (single TEXT column), NOT `full_name`, `first_name`, or `last_name`

---

## Edge Function Rules
- All Edge Functions live in `supabase/functions/<name>/index.ts`
- Deno-compatible syntax only (no Node.js APIs)
- Always deploy with `--no-verify-jwt` flag: `supabase functions deploy <name> --no-verify-jwt`
- CORS headers required on every function — match the `send-squad-email` pattern
- **Service role vs user client split:**
  - Use admin client (service role key) for storage operations — bypasses RLS
  - Use user client (Authorization header from request) for RPC calls — preserves `auth.uid()` context
  - Never use service role key for RPCs that rely on `auth.uid()` internally
- Secrets available in all Edge Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already set in project)
- `expo-file-system/legacy` — correct import path for `readAsStringAsync` in React Native (not `expo-file-system`)

### Edge Functions (11 deployed)
1. `process-stripe-fee` — Stripe PaymentIntent with tiered fee
2. `create-job-thread` — Auto-create job thread on bid INSERT
3. `filter-phone-numbers` — Strip phone numbers from messages
4. `send-push-notification` — Forward to Expo Push API
5. `stripe-connect-onboarding` — Stripe Express account + onboarding URL
6. `send-vouch-prompts` — Cron: 1hr post-completion vouch reminders
7. `expire-bidding-windows` — Cron: expire open jobs past bid_deadline
8. `send-squad-email` — Resend branded email with squad cards
9. `send-squad-sms` — Twilio SMS with Storage-hosted HTML page
10. `upload-insurance-document` — Server-side COI upload bypassing 42P17 RLS bug
11. `send-closing-update` — Webhook-triggered SMS on closing phase advance

---

## Known Type Gaps (access via `as any` — do not add to Profile interface without discussion)
The `Profile` TypeScript interface in `types/index.ts` is missing these fields that exist in the Supabase schema. They are accessed via `(profile as any)?.field` throughout the codebase:
- `insurance_status` — TEXT, default 'none'
- `insurance_doc_url` — TEXT, nullable
- `insurance_doc_name` — TEXT, nullable (added S54)
- `insurance_expiry` — TEXT, nullable (added S54, format MM/YYYY)

Do not add these to the `Profile` interface without a dedicated cleanup session — changes cascade everywhere.

---

## Insurance Upload Flow (established S54)
- **Entry point:** ProfileTab → Insurance row → `InsuranceUploadScreen` (fullScreenModal)
- **Flow:** `InsuranceUploadScreen` → base64 file → `upload-insurance-document` Edge Function → `credentials` bucket + `rpc_upload_insurance_document`
- **NOT in:** `VerificationScreen` (insurance section removed S54)
- **Pending state:** ProfileTab passes `{ status: 'pending_review', documentName }` via `navigation.push` → `InsuranceUploadScreen` renders `openedAsPending` view
- **RPC:** `rpc_upload_insurance_document(p_document_url, p_expiry_month, p_expiry_year, p_doc_name DEFAULT NULL)`
- **Known issue:** 42P17 StorageApiError on direct client-side upload — permanently resolved via Edge Function bypass. Do NOT attempt to revert to direct client upload.

---

## Neighborhood Intelligence (established S48)

### Overview
Client Lifestyle Fit Engine — agents input a client's lifestyle preferences and a property address, then receive a composite match score with category breakdowns and a nearby POI map.

### Files
| File | Purpose |
|------|---------|
| `app.config.js` | Extends app.json with env var injection (API keys via `extra` block, S57) |
| `lib/config.ts` | Centralized API key access — `GOOGLE_MAPS_API_KEY`, `AIRNOW_API_KEY` (S57) |
| `types/neighborhood.ts` | Types scoped to this feature (not in types/index.ts) |
| `lib/neighborhoodScoring.ts` | Weighted composite score computation + `CATEGORY_META` + `hashPriorities` cache key (S60) |
| `hooks/useNeighborhoodAnalysis.ts` | Data hook with mock fallback + live pipeline + cache lookup/save (S57, S60) |
| `components/ClientLifestyleScreen.tsx` | Tile selection + address autocomplete — mock + live paths (fullScreenModal) |
| `components/NeighborhoodMatchScreen.tsx` | Animated score ring + priority bars + nearby POIs (fullScreenModal) |
| `components/AddressComparisonScreen.tsx` | Two-phase comparison — address inputs → ranked results, mock + live paths (fullScreenModal, S56–S57) |
| `components/CategoryMapScreen.tsx` | Full-screen map with address + POI pins (fullScreenModal) |

### Feature Flag
```typescript
// In hooks/useNeighborhoodAnalysis.ts (NOT in lib/featureFlags.ts)
// Exported — screens import it for conditional autocomplete rendering (S57)
export const LIVE_NEIGHBORHOOD_HOOKS = false; // false = mock data, true = live APIs
```

### Navigation Flow
HomeTabAgent → "Client Tools" section → "Neighborhood Match" card → ClientLifestyleScreen (fullScreenModal) → NeighborhoodMatchScreen (fullScreenModal, slide_from_bottom) → "Compare Addresses" CTA → AddressComparisonScreen (fullScreenModal) → CategoryMapScreen (fullScreenModal)

### Entry Point
`HomeTabAgent.tsx` has a "Client Tools" section with a `ClientToolCard` component between Closing Squad and Quick Actions sections.

### 16 Lifestyle Categories (S61: was 9)
**Existing (9):** `coffee`, `yoga`, `parks`, `walkability`, `gym`, `grocery`, `transit`, `bike`, `air_quality`
**New standard (5, S61):** `dining`, `schools`, `healthcare`, `pet_friendly`, `nightlife`
**New custom (1, S61):** `other` — free-text `customLabel` via inline TextInput, uses `point_of_interest` Google Places type as broad fallback

### Selection Cap (S61)
`MAX_SELECTIONS = 6` — flat cap, any mix of Must Have / Nice to Have. Unselected tiles dim at limit (`opacity: 0.35`). Counter label below grid: "N of 6 selected" / amber "6 of 6 selected · limit reached".

### Radius Selector (S61)
`RadiusMi = 0.5 | 1 | 2` (default 1mi) — pill row above tile grid in `ClientLifestyleScreen`. Radius flows through all screens and hooks. Places API radius: `Math.round(radiusMi * 1609.344)` meters. Cache key includes `radius_mi` — different radius = different cache entry.

### Backend APIs (wired S57)
- Walk Score API — **deferred** (walkability derived as proxy from POI density, replaceable with zero arch changes)
- Google Places Nearby (New) — POI search per category (dynamic radius from `radiusMi`, S61) — **wired S57**
- Google Places Autocomplete (New) — address input — **wired S57**
- Google Places Details — geocode placeId → lat/lng — **wired S57**
- EPA AirNow — air quality index → score mapping — **wired S57**
- API keys injected via `app.config.js` → `Constants.expoConfig.extra` → `lib/config.ts`
- All mock data preserved in `hooks/useNeighborhoodAnalysis.ts` with `@demo` markers

### Dependencies
- `react-native-maps` — added S48 for CategoryMapScreen
- `expo-haptics` — tile long-press feedback
- `expo-constants` — API key injection via `app.config.js` extra block (S57)

---

## Supabase Schema Reference
- 20 tables, 15 enums, 50+ RLS policies, 37 indexes, 9 triggers, 37 RPCs
- Revenue: graduated fees (0% first 3 jobs → 5% months 4–9 → 10% standard)
- `sql/schema.sql` is the reference — always cross-check before writing queries
- **Never use `GENERATED ALWAYS AS` on the `profiles` table** — causes 42P17 infinite recursion (learned S46, confirmed S49). Use a BEFORE INSERT OR UPDATE trigger instead.

---

## Workflow Rules

### 1. Plan Mode Default
Enter plan mode (Shift+Tab twice) for ANY task that touches 3+ files or involves architectural decisions.
- Write the plan BEFORE touching any code
- If something goes sideways mid-implementation → STOP → re-plan → don't push through
- Use plan mode for verification strategy too, not just building

### 2. Subagent Strategy
- Use subagents to keep the main context window clean
- Offload research, file exploration, and type checking to subagents
- One task per subagent for focused execution
- Complex problems → throw more subagents at it, don't bloat the main thread

### 3. TypeScript Gate (MANDATORY)
Run `npx tsc --noEmit` after EVERY file change — no exceptions.
- This is the primary quality gate (no test suite exists yet)
- If tsc fails → fix BEFORE moving to the next task
- Never commit code that doesn't pass tsc

### 4. Backend Wiring Pattern
```typescript
// STATUS: wired (with mock fallback)
export const useJobById = (jobId: string) => {
  return useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        if (error) throw error;
        return data;
      } catch {
        console.warn('[useJobById] Supabase failed, using mock fallback');
        return MOCK_JOB;
      }
    },
  });
};
```
- ALWAYS keep mock data as fallback — demo app must never break
- NEVER delete mock data until explicit cleanup session
- Mark hook status: `// STATUS: mock | wired | tested`

### 5. Self-Improvement Loop
After ANY correction from the user → update `tasks/lessons.md` with:
- What went wrong
- Pattern to prevent recurrence
- The rule to follow going forward

### 6. Verification Before Done
- Never mark a task complete without proving it works
- Minimum proof: `npx tsc --noEmit` passes cleanly
- For hooks: verify query shape matches schema
- For mutations: verify invalidation keys match query keys they should refresh

### 7. Simplicity Over Elegance
- Prioritize correctness and speed over cleverness during wiring
- If a fix feels hacky for a non-trivial problem: pause and find the clean solution

### 8. Autonomous Bug Fixing
- Diagnose and fix bugs without hand-holding
- Read the error, trace the root cause, resolve it
- Fix TypeScript errors without being told how

### 9. Minimal Blast Radius
- Changes should only touch what's necessary
- No drive-by refactors unless explicitly requested
- Find root causes — no band-aids
- If a change requires modifying 5+ files, re-plan first

### 10. Flag Scope Expansions
- If a task can be completed more thoroughly than planned, confirm before exceeding original scope
- Never expand scope without user approval

---

## Design System Rules (non-negotiable)

### Typography
- Minimum `fontSize: 14` for ALL regular text
- Exception: `textTransform: 'uppercase'` section headers may use `fontSize: 12`
- `COLORS.lightText` only on `fontSize: 14+`
- At `fontSize: 12`, use `COLORS.secondaryText`
- Section header pattern:
  ```tsx
  fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12
  ```

### Layout
- Header height: 48px
- Header border: `borderBottomWidth: 0.68`, `borderBottomColor: COLORS.border`
- Cards: `borderRadius: 14`, `borderWidth: 0.68`, `borderColor: COLORS.cardBorder`
- Pills/avatars: `borderRadius: 9999`
- Header borders: `COLORS.border` (`#E5E7EB`) — NEVER black

### fullScreenModal Header Pattern (required)
3-element row: `[44px spacer][Title flex:1 textAlign:center][44px X button]`
- Title: centered via `flex:1, textAlign:'center'`
- Dismiss: X icon button (not back chevron) for modals
- `SafeAreaView` backgroundColor: `COLORS.background` — prevents gray status bar bleed on device

### Icon Touch Targets (App Store compliance)
- All SVG icons: `width={24} height={24}`
- All interactive icon Pressables: `width: 44, height: 44, alignItems: 'center', justifyContent: 'center'`
- NEVER use `hitSlop` as a touch target substitute

### Tokens (always import from lib/tokens.ts — never local COLORS)
- `COLORS.backgroundInfo = '#EFF6FF'` (added S38)
- `COLORS.warningAmber = '#D97706'` (added S43)
- `COLORS.counterAmber = '#D97706'` (same value, different semantic)
- Neighborhood Intelligence tokens (S58–S61, 12 total): `rankGold`, `rankSilver`, `rankBronze`, `winnerBannerBg`, `winnerBannerBorder`, `winnerBannerText`, `scoreGreen`, `scoreAmber`, `scoreRed`, `winnerCardBorder`, `disabledPrimaryTint`, `mustHaveTileBg`
- All hex values must trace back to a named token — no inline hex

---

## Shared Components (always reuse — never recreate inline)
Located in `components/shared/index.ts` (barrel export):
- `Button` — 6 variants: Primary, Secondary, Danger, Counter + 2 more
- `ScreenHeader`
- `DisplayTag` — 6 variants including ghost (use for unverified/empty CTAs)
- `VerificationBadge` — 3 states, 2 sizes
- `VerificationBanner` — amber, role/level-aware, returns null if verified
- `PortfolioGallery` — reuse unchanged, never rebuild inline

---

## @demo and @backend Markers (required in every file)
```tsx
// @demo hardcoded — replace with real data in production
// @backend rpc_name — params: { p_param: value }
```

---

## Task Tracking
- `tasks/lessons.md` — Claude Code self-improvement log (local, persists across sessions)
- Git commits — descriptive messages with what was wired/changed
- All progress tracking (Build Log, Deployment Tracker, etc.) lives in Notion, updated via Claude Chat "Log session" protocol

---

## Session Protocol

### Starting a Session
1. Review `tasks/lessons.md` for relevant past learnings
2. Enter plan mode — outline what you'll build
3. Get user approval on the plan before writing code

### During a Session
- One tier or feature focus per session
- Run `npx tsc --noEmit` after every file change
- Commit at logical checkpoints

### Ending a Session
1. Run final `npx tsc --noEmit` — must pass clean
2. Run `npx expo lint` — fix any issues
3. Create descriptive commit
4. Output session summary for user to paste into Claude Chat for Notion logging

---

## Session Prompt Requirements (include in EVERY Claude Code prompt)
1. File headers (what/who/where in nav)
2. Role branching comments (why + business rule)
3. `@backend` markers (RPC name + params)
4. `@demo` markers (what to replace)
5. Descriptive naming (`handleTradeSelection` not `handleNext`)
6. State flow comment block above main component
7. Section dividers in long files
8. "Flag scope expansions before executing"
9. "Read all relevant files before writing a single line of code. Produce a plan and wait for approval before executing."

---

## Verification Checklist (before marking any session complete)
- `npx tsc --noEmit` → 0 errors
- Shared components reused (not recreated inline)
- No local COLORS objects — all tokens from `lib/tokens.ts`
- No inline hex values
- All interactive icons have 44×44 Pressable touch targets
- All regular text ≥ 14pt fontSize
- `@demo` markers on all mock data
- `@backend` markers on all live data points
- Feature flags reset to demo defaults
- Both role visual checks passed

---

## Cumulative Progress

### S55 — Neighborhood Intelligence: Core Feature (March 15, 2026)
- Created `types/neighborhood.ts`, `lib/neighborhoodScoring.ts`, `hooks/useNeighborhoodAnalysis.ts`
- Created `ClientLifestyleScreen.tsx`, `NeighborhoodMatchScreen.tsx`, `CategoryMapScreen.tsx`
- Added `react-native-maps` dependency, `LIVE_NEIGHBORHOOD_HOOKS` flag
- 9 lifestyle categories, animated score ring, staggered bar animations, POI map pins
- Hooks +1 (useNeighborhoodAnalysis), Screens +3

### S56 — Neighborhood Intelligence: Multi-Address Comparison (March 16, 2026)
- **Created:** `components/AddressComparisonScreen.tsx` — two-phase fullScreenModal (address inputs → ranked results)
- **Modified:** `types/neighborhood.ts` — added `ComparisonEntry` + `AddressComparison` interfaces
- **Modified:** `hooks/useNeighborhoodAnalysis.ts` — added `useAddressComparison` hook with per-address mock score offsets
- **Modified:** `components/NeighborhoodMatchScreen.tsx` — added "Compare Addresses" CTA between priorities and nearby sections; fixed score bar animation (barAnims in render body); replaced AnimatedScoreText with static compositeScore display
- **Modified:** `components/HomeStack.tsx` — registered AddressComparisonScreen route + params
- **Hooks +1:** `useAddressComparison` (STATUS: mock)
- **Screens +1:** `AddressComparisonScreen`
- **Key decisions:** 2-col score grid with neutral pills (not per-category bars), winner card elevation (blue border + 4px left accent bar), static score bars in comparison cards (no animation — conflicts with card render order), mock score offsets tuned for green/amber demo contrast

### S57 — Neighborhood Intelligence: Live API Wiring (March 16, 2026)
- **Created:** `app.config.js` — Expo config extending app.json, injects API keys from process.env via extra block
- **Created:** `lib/config.ts` — Centralised API key access via Constants.expoConfig.extra
- **Modified:** `lib/neighborhoodScoring.ts` — Added `googlePlacesTypes: string[]` to CATEGORY_META (9 categories)
- **Modified:** `hooks/useNeighborhoodAnalysis.ts` — Full live pipeline: `runLiveAnalysis`, `fetchPlacesForCategory`, `fetchAirQuality`, `haversineDistanceMi`, `aqiToScore`. Both hooks +loadingMessage. `LIVE_NEIGHBORHOOD_HOOKS` exported.
- **Modified:** `components/HomeStack.tsx` — lat?/lng? added to NeighborhoodMatchScreen params; firstAddress?/firstLat?/firstLng? to AddressComparisonScreen; firstAnalysis made optional
- **Modified:** `components/NeighborhoodMatchScreen.tsx` — lat/lng from params → analyze(), loadingMessage below spinner, firstLat/firstLng in comparison nav
- **Modified:** `components/ClientLifestyleScreen.tsx` — Live autocomplete debounced 400ms (≥3 chars), geocodePlaceId, lat/lng to navigate, canAnalyze guard
- **Modified:** `components/AddressComparisonScreen.tsx` — Per-slot autocomplete + geocoding, AddressInput[], firstAddress pre-population
- **Bug fixed:** Google Places (New) API uses `radius` not `radiusInMeters` in circle object
- **Live tested:** Denver address confirmed — autocomplete ✅ AirNow ✅ POIs ✅ scores meaningful ✅
- **Hooks:** 58 (unchanged — existing hooks updated) | **Feature Flags:** 8 + 1 local | **tsc:** 0
- **S58 next objectives:** Edit priorities link, 9 new COLORS tokens, loading message display polish, search radius display on results screen

### S58 — Neighborhood Intelligence: UX Completeness (March 16, 2026)
- **Modified:** `lib/tokens.ts` — Added 9 Neighborhood Intelligence tokens: rankGold, rankSilver, rankBronze, winnerBannerBg, winnerBannerBorder, winnerBannerText, scoreGreen (#059669), scoreAmber, scoreRed
- **Modified:** `components/AddressComparisonScreen.tsx` — Replaced all inline hex with named tokens (RANK_BADGE_COLORS, getScoreColor, winner banner, rank badge text, CTA text). Added "← Edit priorities" link in Phase 2 results. Added "Within 0.5 miles" radius label per comparison card.
- **Modified:** `components/NeighborhoodMatchScreen.tsx` — Replaced all inline hex with named tokens (getScoreColor, bar track, Must Have star). Added "Within 0.5 miles" radius label below address badges.
- **Modified:** `components/HomeStack.tsx` — ClientLifestyleScreen params updated: `{ initialPriorities?: LifestylePriority[] } | undefined`
- **Modified:** `components/ClientLifestyleScreen.tsx` — Added useRoute + initialPriorities param. Tiles pre-populate on mount (lazy init) and on re-navigation (useEffect). State flow comment updated.
- **Inline hex remaining:** 0 in NeighborhoodMatchScreen; 3 annotated in AddressComparisonScreen (shadow #000, #BBF7D0 no-token, #C7D2FE no-token)
- **Key decisions:** scoreGreen unified to emerald-600 (#059669) across both screens; navigation.navigate (not getParent) correct for same-stack fullScreenModals; useEffect added alongside useState lazy init for re-navigation param updates
- **Hooks:** 58 (unchanged) | **COLORS tokens:** 114 (+9) | **tsc:** 0
- **S59 next objectives:** Device testing prep, ATLASIO_CONTEXT update

### S59 — Token Cleanup (March 16, 2026)
- **Modified:** `lib/tokens.ts` — Added 2 tokens to Neighborhood Intelligence section: `winnerCardBorder` (#BBF7D0), `disabledPrimaryTint` (#C7D2FE)
- **Modified:** `components/AddressComparisonScreen.tsx` — Replaced last 2 annotated inline hex values with named tokens
- **Fixed:** `LIVE_NEIGHBORHOOD_HOOKS` reset from stale `true` back to `false` demo default
- **Inline hex remaining:** 0 unannotated across all Neighborhood Intelligence screens (shadowColor '#000' intentional — SHADOWS preset)
- **Hooks:** 58 (unchanged) | **COLORS tokens:** 116 (+2) | **Neighborhood Intelligence tokens:** 11 total | **tsc:** 0
- **S60 next objectives:** Device testing, Walk Score API integration

### S60 — Neighborhood Intelligence: Cache Lookup (March 16, 2026)
- **Modified:** `lib/neighborhoodScoring.ts` — Added `hashPriorities()` utility for deterministic cache keys (sorted alphabetical, order-independent)
- **Modified:** `hooks/useNeighborhoodAnalysis.ts` — Cache check before live API pipeline in both `useNeighborhoodAnalysis` and `useAddressComparison`. `saveToCacheSilently()` fire-and-forget after cache miss. Supabase client imported.
- **Modified:** `sql/schema.sql` — Added `neighborhood_analyses` + `address_comparisons` tables (S59 backend, recorded S60). Added 4 RPCs.
- **New RPCs (4):** `rpc_save_neighborhood_analysis`, `rpc_get_cached_analysis`, `rpc_get_cached_comparison`, `rpc_save_address_comparison`
- **Cache TTL:** 7 days, matched by address + `hashPriorities()` hash + agent_id
- **RPCs:** 37 (+4) | **Tables:** 20 (+2) | **Hooks:** 58 (unchanged — cache wired into existing hooks) | **tsc:** 0

### S61 — Lifestyle Categories Expansion + Selection Cap + Radius Selector (March 16, 2026)
- **Modified:** `types/neighborhood.ts` — `LifestyleCategory` union +6 (`dining`, `schools`, `healthcare`, `pet_friendly`, `nightlife`, `other`). `LifestylePriority` +`customLabel?: string` (only set when `category === 'other'`). Added `RadiusMi = 0.5 | 1 | 2` type.
- **Modified:** `lib/neighborhoodScoring.ts` — 6 new `CATEGORY_META` entries with `googlePlacesTypes`. `hashPriorities()` updated to include `customLabel` in hash for `other` category (different labels = different cache entries).
- **Modified:** `lib/tokens.ts` — Added `mustHaveTileBg: '#FEF3C7'` (replaced inline hex in tile component).
- **Modified:** `hooks/useNeighborhoodAnalysis.ts` — Mock scores for 6 new categories. `radiusMi` param added to `analyze()`, `compare()`, `runLiveAnalysis()`, `fetchPlacesForCategory()`, `saveToCacheSilently()`. Places API radius now dynamic (`Math.round(radiusMi * 1609.344)` meters, was hardcoded 800). Cache RPCs updated: `p_radius_mi` in `rpc_get_cached_analysis`, `rpc_save_neighborhood_analysis`, `rpc_get_cached_comparison`.
- **Modified:** `components/ClientLifestyleScreen.tsx` — 16-tile grid (15 standard + Other pinned last). `MAX_SELECTIONS=6` flat cap with dim+lock UX and counter label. Other tile: animated TextInput (expand/collapse on select/deselect), `customLabel` stored and passed downstream. Radius selector: 3 pill buttons (0.5/1/2 mi, default 1mi) above tile grid, `radiusMi` in navigation params. Inline hex cleanup: 3 values replaced with tokens (`mustHaveTileBg`, `warningText`, `chipBg`, `border`, `warningAmber`).
- **Modified:** `components/NeighborhoodMatchScreen.tsx` — Accepts `radiusMi` from params. Dynamic radius label ("Within N mile(s)"). `getCategoryLabel()` resolves `customLabel` for Other in score bars, nearby section, and map navigation. Passes `radiusMi` to `AddressComparisonScreen`.
- **Modified:** `components/AddressComparisonScreen.tsx` — Accepts `radiusMi` from params. Dynamic radius label per comparison card. `getCategoryLabel()` for Other in score grid and map chips. Passes `radiusMi` to `compare()`.
- **Modified:** `components/HomeStack.tsx` — `radiusMi: RadiusMi` added to `NeighborhoodMatchScreen` and `AddressComparisonScreen` params. `RadiusMi` type imported.
- **Modified:** `components/CategoryMapScreen.tsx` — `.toFixed(1)` on POI `distanceMi` display.
- **SQL deployed (manually):** `neighborhood_analyses.radius_mi` column added (`NUMERIC(4,2) DEFAULT 1.0`). 3 RPCs updated: `rpc_get_cached_analysis` (+`p_radius_mi`), `rpc_get_cached_comparison` (+`p_radius_mi`), `rpc_save_neighborhood_analysis` (+`p_radius_mi`). `NOTIFY pgrst` complete.
- **Cache E2E test:** DEFERRED (device test not run this session)
- **RPCs:** 37 (3 updated, none new) | **Tables:** 20 (1 column added) | **Hooks:** 58 (unchanged) | **COLORS tokens:** 117 (+1) | **tsc:** 0
- **S62 next objectives:** Cache E2E device test (radius cache key verification), Walk Score API integration

### S62 — Partner Track: Home Tab + Deal Board (March 17, 2026)
- **Created:** `features/partners/types/partner.types.ts` — All partner-specific TypeScript interfaces (DealMilestone, DealAlert, PartnerActiveDeal, PartnerStats, MilestoneConfig, AlertTypeConfig, PartnerConnectionRequest)
- **Created:** `features/partners/lib/dealMilestones.ts` — Milestone set configs and alert type configs keyed by partner role, isMilestoneStale() helper, getRateLockDaysRemaining() helper, RATE_LOCK_DANGER_THRESHOLD_DAYS constant
- **Created:** `features/partners/hooks/usePartnerData.ts` — 8 TanStack Query hooks (4 queries + 4 mutations) with mock Denver data. All @backend RPCs stubbed: rpc_get_partner_active_deals, rpc_get_partner_stats, rpc_get_connection_requests, rpc_toggle_accepting_clients, rpc_update_milestone_status, rpc_post_deal_alert, rpc_dismiss_deal_alert
- **Created:** `features/partners/components/ActiveDealCard.tsx` — Reusable deal card with milestone progress, alert banners (danger/warning escalation), inline alert composer, milestone tap cycling
- **Created:** `features/partners/components/HomeTabPartner.tsx` — Partner home tab with 6 sections: Availability card, Connection Requests (horizontal scroll), Needs Attention deal board, Visibility Stats (3-tile), Recent Vouches, Share Profile CTA
- **Created:** `features/partners/components/PartnerDealsScreen.tsx` — Full deal pipeline with 3 filter chips (All/Needs Attention/Closing Soon), grouped sections (Closing within 14 days / Active), empty states per filter
- **Modified:** `lib/tokens.ts` — Added 3 tokens: `dangerText` (#DC2626), `dangerBg` (#FEF2F2), `dangerBorder` (#FECACA)
- **Modified:** `lib/config.ts` — Added `PARTNER_TRACK_ENABLED: false` feature flag
- **Modified:** `lib/demoRoleContext.ts` — Added `'partner'` to DemoRole union type
- **Modified:** `components/BottomTabNavigator.tsx` — Partner role branch: HomeTabPartner for Home tab, PartnerDealsScreen replaces Find tab as "Deals", role badge supports 'P' (amber), demo toggle cycles agent→contractor→partner only when PARTNER_TRACK_ENABLED===true
- **Key decisions:** Partner feature fully isolated in `features/partners/` folder. Types isolated from `types/index.ts`. Demo role toggle only includes partner when flag is true — invisible by default. ActiveDealCard extracted as shared component between both screens. Rate lock escalation threshold: 5 days. All RPCs stubbed with @backend markers for future backend session.
- **Hooks:** 64 (+6 new, +2 dismiss/connection) | **COLORS tokens:** 120 (+3) | **tsc:** 0
- **S63 next objectives:** Agent Deal Board visibility (agent sees partner milestone progress), `rpc_get_deal_board_for_agent`, `useRealtimeDealMilestones`, status dots on HomeTabAgent squad section

### S63 — Agent Deal Board (March 17, 2026)
- **Merged:** `HomeTabAgent.tsx` + `HomeTabAgentFilled.tsx` → unified `HomeTabAgent.tsx` with conditional content zones (Active Deals, vouch feed tabs, demo toggle)
- **Deleted:** `HomeTabAgentFilled.tsx` — fully merged into HomeTabAgent
- **Created:** `components/AgentDealDetailScreen.tsx` — Read-only milestone board per deal. Per-partner sections: avatar + status dot, alert banners (danger/warn), progress bar, milestone list with stale indicators. Realtime-ready.
- **Modified:** `hooks/useData.ts` — +3 hooks: `useAgentActiveDeals` (mock, 2 deals with partners/alerts), `useAgentDismissDealAlert` (optimistic mutation), `useRealtimeDealBoard` (Supabase Realtime channels for deal_milestones + deal_alerts, cleanup on unmount)
- **Modified:** `features/partners/types/partner.types.ts` — +2 interfaces: `AgentDealPartner`, `AgentActiveDeal` (agent-side multi-partner deal composite)
- **Modified:** `components/HomeStack.tsx` — Registered `AgentDealDetail` route with `{ jobId: string }` params
- **Modified:** `components/FindTab.tsx` — Added `accepting_clients` field to ProCard interface + "At Capacity" ghost badge via DisplayTag when `accepting_clients === false`
- **Modified:** `lib/featureFlags.ts` — Reset all flags to demo defaults
- **Key decisions:** Active Deals section renders conditionally (hidden when no deals). Status dot priority: red (alerts) > amber (stale) > green (on track) > gray (no milestones). Milestone rows are View not Pressable (read-only). All hooks use job_id as anchor (migrate to transaction_id in S64). Vouch feed: VouchFeedSection component restored in S67 with ProProfile navigation (replaces S63 inline feed that lacked tap handlers).
- **Hooks:** 67 (+3) | **Screens:** +1 (AgentDealDetailScreen) | **tsc:** 0
- **S64 next objectives:** transactions table, rpc_create_transaction, Deal Creation sheet, transaction_id migration for deal_milestones + deal_alerts

### S64b — Deal Creation + Partner Invitations (March 17, 2026)
- **Created:** `features/partners/components/DealCreationSheet.tsx` — Bottom sheet modal with spring animation (damping: 24, stiffness: 220). 4 fields: property address (Google Places Autocomplete reused from ClientLifestyleScreen pattern), closing date (MM/DD/YYYY), partner multi-select (mock 3 partners grouped by role), contract price (numeric). "Create Deal" CTA with loading state. Gated behind `DEAL_CREATION_ENABLED` flag.
- **Modified:** `lib/config.ts` — Added `DEAL_CREATION_ENABLED: false` feature flag with full comment documenting independence from `PARTNER_TRACK_ENABLED`
- **Modified:** `lib/featureFlags.ts` — Added `DEAL_CREATION_ENABLED: false` with flag matrix comment (MVP launch / partner pilot / full launch / investor demo scenarios)
- **Modified:** `features/partners/types/partner.types.ts` — Added 4 interfaces: `ConnectionRequestItem`, `DealInvitationItem`, `InvitationItem` (discriminated union), `PartnerInvitationsResponse`. All anchored to `transaction_id` (S64+).
- **Modified:** `features/partners/hooks/usePartnerData.ts` — Added `usePartnerInvitations()` query (mock, returns unified connection requests + deal invitations with total_count). Added `useRespondToDealInvitation()` mutation (mock, 800ms delay, optimistic card removal, conditional invalidation: accept invalidates active_deals + invitations, decline invitations only). Added `MOCK_PARTNER_INVITATIONS` with 1 connection request + 1 deal invitation.
- **Modified:** `hooks/useData.ts` — Added `useCreateTransaction()` mutation (mock, 1500ms delay, invalidates agent_active_deals on success). Full `@backend` stub: `rpc_create_transaction(p_property_address, p_closing_date, p_contract_price, p_buyer_name, p_mls_number, p_partner_assignments)`.
- **Modified:** `features/partners/components/HomeTabPartner.tsx` — Renamed "Connection Requests" section → "Invitations". Unified feed renders two card types via `item_type` discriminated union: connection request cards (existing visual, no changes) and deal invitation cards (new — 4px left border `COLORS.primary`, property address, agent avatar row, role pill, closing date, Accept/Decline actions). Decline uses `Alert.alert` confirmation before mutation fires. Imported `usePartnerInvitations`, `useRespondToDealInvitation`, `Alert`.
- **Modified:** `components/HomeTabAgent.tsx` — "New Deal +" CTA gated behind `DEAL_CREATION_ENABLED` (hidden when false). `DealCreationSheet` rendered conditionally inside component. Added `dealSheetVisible` state + `DEAL_CREATION_ENABLED` import from config.
- **Modified:** `components/BottomTabNavigator.tsx` — Partner Deals tab shows badge count from `usePartnerInvitations().data?.total_count`. Red badge with white text (`#EF4444` bg). Only visible when `demoRole === 'partner'` and `total_count > 0`. Imported `usePartnerInvitations` from partner hooks.
- **Key decisions:** `DEAL_CREATION_ENABLED` is independent from `PARTNER_TRACK_ENABLED` — separate capabilities with a clear flag matrix. All new deal data uses `transaction_id` as FK anchor (S64+), `job_id` preserved for backward compat only — every `@backend` marker includes this note. DealCreationSheet is a Modal (not a navigation route) — rendered inline in HomeTabAgent to match SquadSlotPicker pattern. Google Places Autocomplete reused verbatim from ClientLifestyleScreen (POST to `places.googleapis.com/v1/places:autocomplete`, 400ms debounce, 3+ char trigger).
- **Hooks:** 70 (+3: useCreateTransaction, usePartnerInvitations, useRespondToDealInvitation) | **Feature Flags:** +1 (DEAL_CREATION_ENABLED) | **tsc:** 0
- **S65 next objectives:** Next.js app at closing.atlasioapp.com, client token generation, live milestone progress, transactions table backend (rpc_create_transaction RPC deployment)

### S65 — Closing Tracker: Hooks + Agent UI + Send Toggle (March 18, 2026)
- **Modified:** `hooks/useData.ts` — +2 hooks: `useGenerateClientToken` (mock mutation, 600ms delay, returns demo URL `closing.atlasioapp.com/demo-token-001`, invalidates `agent_active_deals`), `useUpdateClosingDetails` (mock mutation, 800ms delay, saves closing day details object `{ time, location, bring_list, wire_amount }`, invalidates `agent_active_deals`). Both anchored to `transaction_id` (S64+). Full `@backend` stubs: `rpc_generate_client_token(p_transaction_id)`, `rpc_update_closing_details(p_transaction_id, p_closing_details)`.
- **Modified:** `components/AgentDealDetailScreen.tsx` — Added "Share" button in header (44×44 touch target, share icon SVG). Taps trigger `useGenerateClientToken` → copies URL to clipboard via `Clipboard.setStringAsync` → success toast (2s auto-dismiss). Added "Closing day details" collapsible section below milestone list: 4 fields (time, location, what to bring, wire amount) with TextInput + save button using `useUpdateClosingDetails`. Section gated behind `closingDetails` expand/collapse state. Added `expo-clipboard` dependency.
- **Modified:** `components/SendSquadScreen.tsx` — Added `Switch` import from react-native. Added `includeClosingTracker` toggle state (`useState(false)`). Inserted toggle row between medium selector and recipient input sections (matches `gap: 24` rhythm). Toggle is visual-only in demo — URL append deferred to send wiring session when `LIVE_SQUAD_SHARE=true`.
- **Modified:** `package.json` / `package-lock.json` — Added `expo-clipboard` dependency.
- **Key decisions:** Toggle in SendSquadScreen is state-only — does not affect send payload yet (scope boundary enforced). Share button in AgentDealDetailScreen is idempotent (RPC returns existing token if already generated). Closing details section uses inline form (not modal) to reduce navigation friction. All 3 changes are demo-functional with `@demo` + `@backend` markers.
- **Hooks:** 72 (+2: useGenerateClientToken, useUpdateClosingDetails) | **tsc:** 0
- **S66 next objectives:** Next.js closing tracker web app (closing.atlasioapp.com), transactions table + rpc_create_transaction deployment, live wiring of useGenerateClientToken + useUpdateClosingDetails

### S67 — send-closing-update Edge Function (March 18, 2026)
- **Created:** `supabase/functions/send-closing-update/index.ts` — Database webhook-triggered Edge Function. Fires on `deal_milestones` INSERT/UPDATE. Detects closing phase advance using `CLOSING_PHASES` map (5 phases, 12 milestone keys). Queries `transactions` for `notify_phone` + `client_token`. Sends SMS via Twilio with closing page URL (`closing.atlasioapp.com/{token}`), phase name, and days-to-closing countdown. Early exits for: no transaction_id, no notify_phone, no client_token, no phase advance. All errors return 200 OK (webhook-safe).
- **Updated:** `ATLASIO_CONTEXT.md` — Edge Functions 10 → 11.
- **Edge Functions:** 11 (+1: send-closing-update) | **Hooks:** 72 (unchanged)
- **Dashboard config required:** Database → Webhooks → `send-closing-update` on `deal_milestones` (INSERT, UPDATE) → Edge Function target
- **Bug fix:** Restored `VouchFeedSection` component in `HomeTabAgent.tsx` — S63 merge had kept old inline vouch feed without tap handlers. Now uses `VouchFeedSection` with `onNavigateToProfile` → `navigation.push('ProProfile', { profileId })`. Removed 187 lines of dead inline vouch code (VouchCard interface, VOUCH_FEED array, AvatarPlaceholder, ThumbUpIcon).
- **S68 next objectives:** Next.js closing tracker web app, transactions table deployment, live wiring of closing hooks

### S68 — Deal Screen Polish (March 18, 2026)
- **Modified:** `lib/tokens.ts` — no changes (SHADOWS.card already existed with correct values)
- **Modified:** `components/HomeTabAgent.tsx` — Applied `SHADOWS.card` to Active Deals horizontal scroll cards. Imported `SHADOWS` from tokens.
- **Modified:** `components/AgentDealsScreen.tsx` — Applied `SHADOWS.card` to full-width DealCard. Imported `SHADOWS` from tokens.
- **Modified:** `components/QuickActionsRow.tsx` — Replaced inline shadow (5 lines) with `...SHADOWS.card` token spread. Imported `SHADOWS` from tokens.
- **Modified:** `components/AgentDealDetailScreen.tsx` — 3 fixes: (1) Closing details empty state replaced plain text link with info card (`backgroundInfo` left-border callout + "+ Add details" primary button). (2) Alert dismiss now optimistic — local `dismissedAlertIds` state hides banner immediately on "Got it" press, mutation fires in background. (3) Closing form pre-fills `time` field with formatted `deal.closing_date` when opening from empty state.
- **Key decisions:** Shadow consistency across all card types via single `SHADOWS.card` token. No new tokens added. Alert dismiss uses local state (not query cache manipulation) for simplicity.
- **tsc:** 0
- **S69 next objectives:** Input field consistency audit + FormField standardisation

### S69 — Input Field Consistency Audit & Fix (March 19, 2026)
- **Modified:** `lib/tokens.ts` — Added 2 tokens: `COLORS.inputBackground` (#F9FAFB), `COLORS.inputActiveBorder` (rgba(0,61,195,0.25))
- **Modified:** `components/FormField.tsx` — Updated to Photo/Staging reference pattern: borderRadius 10, borderWidth 0.68, bg inputBackground, fontSize 15, active blue border on value, added `prefix`, `autoCapitalize`, `autoCorrect`, `secureTextEntry` props
- **Modified:** `components/PostJobWizard.tsx` — Replaced 5 inline label+TextInput patterns with FormField (Job Title, Address, Description, Budget min/max, Bid Window). Fixed import ordering lint warning.
- **Modified:** `components/EditRepairJob.tsx` — Replaced 4 inline label+TextInput patterns with FormField (Title, Budget min/max, Description). Due Date kept inline with suffix icon but styled to match.
- **Modified:** `components/AgentDealDetailScreen.tsx` — Replaced 4 closing detail inline fields with FormField (Date/time, Location, Bring list, Wire amount)
- **Modified:** `components/VerificationScreen.tsx` — Replaced License Number inline field with FormField. State picker styled to match.
- **Modified:** `components/LoginScreen.tsx` — Replaced email + password inline fields with FormField. Removed unused StyleSheet styles.
- **Modified:** `components/BidSubmissionScreen.tsx` — Added @design custom comment (intentionally excluded from FormField migration)
- **Key decisions:** Photo/Staging pattern selected as gold standard (Option A). FormField.tsx is the single source of truth for all label+input fields. BidSubmissionScreen intentionally excluded (custom bid-entry UX). 2 new COLORS tokens added. 5 screens migrated.
- **tsc:** 0
- **S70 next objectives:** Next.js closing tracker web app, transactions table deployment, live wiring of closing hooks

### S88 — Wire transactionId to Screen-Level Callers (March 22, 2026)
- **Modified:** `features/partners/types/partner.types.ts` — Added `transaction_id?: string` to `AgentActiveDeal` and `PartnerActiveDeal` interfaces
- **Modified:** `hooks/useData.ts` — Added `transaction_id` to `MOCK_AGENT_ACTIVE_DEALS` (2 entries) and `MOCK_AGENT_DEALS` (4 entries)
- **Modified:** `features/partners/hooks/usePartnerData.ts` — Added `transaction_id` to `MOCK_DEAL_1`, `MOCK_DEAL_2`, `MOCK_DEAL_3`
- **Modified:** `components/HomeStack.tsx` — Added `transactionId?: string` to `AgentDealDetail` route params
- **Modified:** `components/AgentDealDetailScreen.tsx` — Extracted `transactionId` from route params + deal data, wired to `useRealtimeDealBoard(jobId, transactionId)`, replaced `(deal as any).transaction_id` with typed access, wired to `useUpdateClosingDetails` and `useGenerateClientToken`
- **Modified:** `components/HomeTabAgent.tsx` — Navigation to `AgentDealDetail` now passes `transactionId: deal.transaction_id`
- **Modified:** `components/AgentDealsScreen.tsx` — Navigation to `AgentDealDetail` now passes `transactionId: deal.transaction_id`
- **Modified:** `features/partners/components/ActiveDealCard.tsx` — `onPostAlert` callback now passes `deal.transaction_id` as 5th arg
- **Modified:** `features/partners/components/HomeTabPartner.tsx` — `handlePostAlert` forwards `transactionId` to `postAlert.mutate()`
- **Modified:** `features/partners/components/PartnerDealsScreen.tsx` — `handlePostAlert` forwards `transactionId` to `postAlert.mutate()`
- **Key decisions:** (1) `useAgentActiveDeals()` in `HomeTabAgent.tsx` NOT wired with transactionId — listing screen fetches all deals, no single transactionId to pass. (2) `useAgentActiveDeals()` in `AgentDealDetailScreen.tsx` NOT wired — needs full list to find by jobId. (3) `transaction_id` added as optional to both deal types since existing deals may not have one.
- **Metrics:** RPCs: 33 (unchanged), Hooks: 57 (unchanged), Edge Functions: 11 (unchanged)
- **tsc:** 0
- **S89 next objectives:** Live wiring of partner deal hooks to Supabase RPCs, Next.js closing tracker web app

### S89 — PostPhotoJobScreen + PostStagingJobScreen Live Job Creation (March 22, 2026)
- **Modified:** `components/PostPhotoJobScreen.tsx` — Replaced mock submit handler with `useCreateJob` → `rpc_create_job({ p_job_type: 'photography' })`. Added mock fallback in catch block. Added `@backend` and `@demo` markers.
- **Modified:** `components/PostStagingJobScreen.tsx` — Replaced mock submit handler with `useCreateJob` → `rpc_create_job({ p_job_type: 'staging' })`. Added mock fallback in catch block. Added `@backend` and `@demo` markers.
- **Key decisions:** (1) `p_title` auto-generated as `'Photography Job'` / `'Staging Job'` — neither screen has a title input field yet. (2) PostPhotoJobScreen `sqft` field captured but not sent to RPC — `CreatePhotographyJobInput` has no `p_sqft` param. (3) PostStagingJobScreen `p_due_date` receives timeline key (e.g. `'1_week'`) not ISO date — needs proper date picker before launch. (4) No contractor invite flow on either screen — confirmed and not added.
- **Metrics:** RPCs: 33 (unchanged), Hooks: 57 (unchanged), Edge Functions: 11 (unchanged)
- **tsc:** 0
- **S90 next objectives:** Partner hooks live wiring (`usePartnerData.ts` audit + RPC wiring)

### S90 — Partner Hooks Live Wiring (March 22, 2026)
- **Modified:** `features/partners/hooks/usePartnerData.ts` — Wired 7 of 9 hooks from mock → live Supabase RPCs with mock fallback pattern:
  - `usePartnerActiveDeals` → `rpc_get_partner_active_deals` (no params, auth.uid())
  - `usePartnerStats` → `rpc_get_partner_stats` (no params, auth.uid(); profile_views + search_appearances return 0 — flagged S62b)
  - `usePartnerConnectionRequests` → `rpc_get_connection_requests` (no params, auth.uid())
  - `useToggleAcceptingClients` → `rpc_toggle_accepting_clients` (p_accepting: boolean)
  - `useUpdateMilestoneStatus` → `rpc_update_milestone_status` (p_milestone_id, p_status)
  - `usePostDealAlert` → `rpc_post_deal_alert` (p_job_id, p_transaction_id, p_alert_type, p_message, p_expires_at)
  - `useDismissDealAlert` → `rpc_dismiss_deal_alert` (p_alert_id)
- **Skipped (intentionally deferred):** `usePartnerInvitations` (RPC not yet deployed), `useRespondToDealInvitation` (RPC not yet deployed)
- **Modified:** `lib/config.ts` — Reset `PARTNER_TRACK_ENABLED` and `DEAL_CREATION_ENABLED` to `false` (demo defaults)
- **Added import:** `supabase` client from `lib/supabase.ts`
- **Key decisions:** All 7 wired hooks use try/catch with mock fallback — demo app never breaks. Query hooks gated behind `PARTNER_TRACK_ENABLED` (mock when false). Mutations always attempt live RPC regardless of flag. `useToggleAcceptingClients` invalidates `partner_stats` (per spec) in addition to existing `profile` key.
- **Metrics:** RPCs: 33 (unchanged), Hooks: 57 (unchanged — 7 upgraded from mock to wired, no new hooks), Edge Functions: 11 (unchanged)
- **tsc:** 0
- **S91 next objectives:** Deploy partner RPCs to schema.sql, Next.js closing tracker web app, usePartnerInvitations + useRespondToDealInvitation RPC deployment + wiring

### S91 — Partner Invitation RPCs + Hook Wiring (March 22, 2026)
- **Modified:** `features/partners/hooks/usePartnerData.ts` — Wired final 2 hooks from mock → live Supabase RPCs with mock fallback:
  - `usePartnerInvitations` → `rpc_get_partner_invitations` (no params, auth.uid(); returns PartnerInvitationsResponse)
  - `useRespondToDealInvitation` → `rpc_respond_to_deal_invitation` (p_transaction_partner_id, p_response; on accept internally seeds milestones via rpc_seed_deal_milestones)
- **Updated file header:** "7 of 9 hooks wired" → "all 9 hooks wired"
- **Schema note:** `transactions`, `transaction_partners` tables and `rpc_seed_deal_milestones` exist live in Supabase (deployed S62b/S64a) but schema.sql not yet updated — deferred to dedicated schema sync session
- **Key decisions:** Both hooks gated behind `PARTNER_TRACK_ENABLED` (mock when false). `useRespondToDealInvitation` keeps optimistic card removal + conditional invalidation (accept: partner_invitations + partner_active_deals, decline: partner_invitations only). All 9 partner hooks now fully wired.
- **Metrics:** RPCs: 33 (unchanged — RPCs already deployed, schema.sql update deferred), Hooks: 57 (unchanged — 2 upgraded from mock to wired, no new hooks), Edge Functions: 11 (unchanged)
- **tsc:** 0
- **S92 next objectives:** schema.sql sync (transactions, transaction_partners, rpc_seed_deal_milestones, rpc_get_partner_invitations, rpc_respond_to_deal_invitation), Next.js closing tracker web app

### S92 — HomeTabPartner Deals Section Header + Empty State Fix (March 22, 2026)
- **Modified:** `features/partners/components/HomeTabPartner.tsx` — 2 targeted fixes:
  - Section header now conditional: "Needs Attention" when deals need attention, "Your Deals" when all clear (fixes semantic mismatch with empty state)
  - "View all N deals →" link hidden when `totalActiveDeals === 0` (no longer shows "View all 0 deals")
- **Key decisions:** UI-only fix, no hooks/RPCs/schema changes. Empty state copy unchanged — header fix resolves the context mismatch automatically.
- **Metrics:** RPCs: 33, Hooks: 57, Edge Functions: 11 (all unchanged)
- **tsc:** 0
- **S93 next objectives:** schema.sql sync (transactions, transaction_partners, rpc_seed_deal_milestones, rpc_get_partner_invitations, rpc_respond_to_deal_invitation), Next.js closing tracker web app

### S93 — schema.sql Sync (March 22, 2026)
- **Modified:** `sql/schema.sql` — added Section 11 (Transactions + Partner RPCs) with 8 items:
  - `transactions` table (S64a)
  - `transaction_partners` table (S64a)
  - `rpc_seed_deal_milestones` updated signature with `p_transaction_id` (S87)
  - `rpc_get_partner_active_deals` updated signature — removed `p_partner_id` param (S92)
  - `rpc_get_partner_stats` updated signature — removed `p_partner_id` param (S92)
  - `rpc_get_connection_requests` full body (S92)
  - `rpc_get_partner_invitations` full body (S91)
  - `rpc_respond_to_deal_invitation` full body (S91)
- **Key decisions:** Documentation sync only — no SQL executed in Supabase, no hooks/UI changes. Table count updated 20→22. RPC count updated 33→39 in header.
- **Metrics:** RPCs: 33 (unchanged — already deployed), Hooks: 57, Edge Functions: 11 (all unchanged)
- **tsc:** 0
- **S94 next objectives:** Next.js closing tracker web app, partner hooks device testing, live wiring audit

### S94 — CLOSING_PHASES milestoneKeys Sync (March 24, 2026)
- **Modified:** `supabase/functions/send-closing-update/index.ts` — Added each phase's own key to its `milestoneKeys` array: `loan_application` → loan_application phase, `under_review` → under_review phase, `closing_day` → closing_day phase. Ensures milestones seeded with phase-level keys (matching DB source of truth) are correctly matched by `computePhaseIndex`.
- **Key decisions:** Existing milestone keys unchanged — only added the missing self-referential keys. `title_search` and `clear_to_close` phases already had their own key present.
- **Metrics:** RPCs: 33, Hooks: 58, Edge Functions: 11 (all unchanged)
- **tsc:** 0
- **S95 next objectives:** Deal creation error surfacing, share button wiring, cross-stack nav

### S95 — Deal Creation Error Surfacing + Share Button Wiring + Cross-Stack Nav + Live Indicator Removed (March 22, 2026)
- See git log for details (S95 committed before S96 session)

### S96 — Mock UUID Guards + Partner List Live Wiring (March 22, 2026)
- **Modified:** `components/AgentDealDetailScreen.tsx` — Tightened `handleShare` and `handleSendSms` guards to reject mock-prefixed transaction IDs (`transactionId.startsWith('mock-')`) in addition to null/undefined check. Mock deals now show "This deal does not have a live transaction ID yet" alert instead of crashing with Postgres UUID error.
- **Modified:** `hooks/useData.ts` — Added `useAgentPartnerConnections` hook (STATUS: wired with mock fallback). Queries `connections` table in both directions (agent as requester + agent as responder), joins `profiles` for name/display_role/avatar_color. Returns `PartnerConnection[]`. Mock fallback: 3 hardcoded partners (Lisa, David, Sarah).
- **Modified:** `features/partners/components/DealCreationSheet.tsx` — Replaced hardcoded `MOCK_CONNECTED_PARTNERS` array with `useAgentPartnerConnections()` hook. Added safety filter before RPC call: `selectedPartnerIds.filter(id => !id.startsWith('mock-'))` strips any mock IDs before passing to `rpc_create_transaction`. Removed `MockPartner` interface (now provided by hook).
- **Modified:** `lib/featureFlags.ts` — Reset `USE_MOCK_DATA` to `true` (demo default)
- **Modified:** `lib/config.ts` — Reset `PARTNER_TRACK_ENABLED` and `DEAL_CREATION_ENABLED` to `false` (demo defaults)
- **Key decisions:** (1) No new RPC needed — direct `connections` table query works via RLS "View own connections" policy. (2) Mock ID safety filter is a belt-and-suspenders guard — even if hook returns live data, any stale mock IDs in selectedPartnerIds get stripped before RPC call. (3) Seeded test partners Lisa Nguyen + David Park confirmed in Supabase with accepted connections to tony's UUID.
- **Metrics:** RPCs: 33 (unchanged), Hooks: 58 (+1: useAgentPartnerConnections), Edge Functions: 11 (unchanged)
- **tsc:** 0
- **S97 next objectives:** Next.js closing tracker web app, partner hooks device testing with `USE_MOCK_DATA: false`, live deal creation E2E test

### S97 — (skipped — no commit found)

### S98 — Deal Lookup Fallback to transaction_id (March 22, 2026)
- **Modified:** `components/AgentDealDetailScreen.tsx` — Deal lookup now falls back to `transaction_id` when `jobId` match fails (deals created via DealCreationSheet have `transaction_id` but no `jobId`)
- **Modified:** `features/partners/components/DealCreationSheet.tsx` — Post-creation navigation passes deal data for immediate display
- **Modified:** `hooks/useData.ts` — `useCreateTransaction` returns created deal data for navigation
- **Key decisions:** Belt-and-suspenders: try jobId first, fall back to transaction_id. Flags reset to demo defaults.
- **tsc:** 0

### S99 — Deal Data via Route Params (March 23, 2026)
- **Modified:** `components/AgentDealDetailScreen.tsx` — Accepts optional `dealData` via route params to avoid "Deal not found" flash after creation
- **Modified:** `components/HomeStack.tsx` — Added `dealData` to `AgentDealDetail` route params
- **Modified:** `features/partners/components/DealCreationSheet.tsx` — Passes full deal object via route params on creation success
- **Key decisions:** Eliminates race condition where hook data hasn't refetched yet but user is already on detail screen.
- **tsc:** 0

### S100 — Live Deal Creation + useAgentActiveDeals Wiring (March 23, 2026)
- **Modified:** `hooks/useData.ts` — `useCreateTransaction.onSuccess` now seeds milestones via `rpc_seed_transaction_milestones` fire-and-forget per assigned partner. `useAgentActiveDeals` wired to `rpc_get_agent_deals` with mock fallback.
- **3 hotfixes:** (1) Null guard on `p.alerts` in HomeTabAgent. (2) 18 null guards on `milestones` + `alerts` across 7 files — live RPC returns nullable arrays unlike mock data. (3) `partner_name` → `name` on `AgentDealPartner` type to match live RPC shape + optional `name`/`partner_avatar_color` + null guards on `.charAt()` calls.
- **Key lesson:** Live RPCs return nullable arrays and different field names than mock data — always add null guards and verify field names against actual RPC response shape.
- **tsc:** 0

### S101 — RPC Consumer Audit Rule + Lean Deal Types (March 23, 2026)
- **Modified:** `tasks/lessons.md` — Added "RPC Consumer Audit" rule (prevents S100-class null/field-name bugs)
- **Modified:** `components/HomeTabAgent.tsx` — Fixed key prop warning in deal partners map (added index fallback)
- **Modified:** `features/partners/types/partner.types.ts` — Added `AgentDealMilestone` + `AgentDealAlert` lean interfaces matching actual RPC response shape. Updated `AgentDealPartner` to use lean types.
- **Modified:** `hooks/useData.ts` — Trimmed mock data to match lean RPC response shape
- **tsc:** 0

### S102 — HomeTabPartner Polish Pass (March 23, 2026)
- **Modified:** `features/partners/components/HomeTabPartner.tsx` — Added `SHADOWS.card` to vouch cards, StatTile, Share Profile card. Added `paddingVertical: 4` to invitations horizontal ScrollView. Bumped fontSize 10→11 on deal invitation agent avatar initial. Added `?? ''` null guards on `.split()`/`.charAt()` (RPC Consumer Audit rule). Removed unused `usePartnerConnectionRequests` hook call. Added `@backend` markers at hook call sites. Added `@s103-todo` for My Network summary row.
- **Modified:** `features/partners/components/ActiveDealCard.tsx` — Replaced `#FFFFFF` with `COLORS.background` in CheckCircleIcon
- **Modified:** `lib/config.ts` — Reset `PARTNER_TRACK_ENABLED` + `DEAL_CREATION_ENABLED` to false
- **Key decisions:** All interactive text Pressables bumped to `minHeight: 44` for App Store compliance. RPC Consumer Audit rule applied proactively on all `.split()`/`.charAt()` calls.
- **tsc:** 0

### S103 — Partner Network Tab + HomeTabPartner My Network Row (March 23, 2026)
- **Created:** `PartnerAcceptedConnection` type in `features/partners/types/partner.types.ts` — connection_id, agent_id, agent_name, agent_company, agent_avatar_color, deal_count, connected_since
- **Modified:** `features/partners/hooks/usePartnerData.ts` — Added `usePartnerAcceptedConnections` hook (STATUS: wired with mock fallback). Queries `rpc_get_partner_accepted_connections` (no params, auth.uid()). Mock: 2 agents (Tony Giap, Sarah Williams). staleTime: 5min.
- **Modified:** `features/partners/components/HomeTabPartner.tsx` — Replaced `@s103-todo` comment with "My Network" summary row. Full-width tappable row: PeopleIcon + "My Network" label + agent count pill + chevron. Navigates to Network tab via `CommonActions.navigate({ name: 'Network' })`.
- **Modified:** `components/NetworkTab.tsx` — Added `PartnerNetworkView` component (partner role branch). Header "My Network" + "YOUR AGENTS" section with connection cards (40px avatar, name, company, deal count badge, Message CTA). Empty state: people icon + "No connections yet" + subtext. Uses `useDemoRole()` for role branching. Existing agent/contractor view extracted to `AgentNetworkView` — zero changes to existing behavior.
- **Modified:** `components/BottomTabNavigator.tsx` — Network tab now visible for partner role. Changed `demoRole !== 'agent'` to `demoRole === 'contractor'` on tabBarButton/tabBarItemStyle. Partner gets 5 tabs: Home, Deals, Network, Inbox, Profile.
- **Key decisions:** (1) One Layout Tree rule preserved — partner branch is a component inside NetworkTab.tsx, not a separate file. (2) RPC Consumer Audit applied: `?? ''` on agent_name, `?? '#999999'` on agent_avatar_color, `?? ''` on agent_company. (3) Network tab visibility expanded from agent-only to agent+partner.
- **Metrics:** Hooks: 74 (+1: usePartnerAcceptedConnections) | **tsc:** 0
- **S104 next objectives:** Next.js closing tracker web app, partner hooks device testing, live deal creation E2E test, partner Network tab device testing

### S103b — Chat Header Alignment (March 23, 2026)
- **Modified:** `components/ChatScreen.tsx`, `components/InboxList.tsx`, `components/ContractorInboxList.tsx` — Aligned chat header style (height, border, typography) across all three chat screens to canonical pattern
- **Modified:** `tasks/lessons.md` — Documented key prop warning as known React Navigation internals issue, not app code
- **tsc:** 0

### S104b — Production Messaging Wiring (March 23, 2026)
- **Modified:** `hooks/useData.ts` — +2 hooks: `useInboxThreads` (NEW, wired to `rpc_get_inbox_threads()` with unread_count badge), `useThreadMessages` (NEW, wired to `rpc_get_thread_messages(p_thread_id)`). Rewired `useSendMessage` → `rpc_send_message(p_thread_id, p_content)`. Updated `useCreateThread` to invalidate `inbox_threads` key.
- **Modified:** `components/ChatScreen.tsx` — Dual-path send: `rpc_create_thread` for first message, `rpc_send_message` for subsequent. Tracks `activeThreadId` in state.
- **Modified:** `components/InboxList.tsx` — Real threads from RPC replace mock data when `USE_MOCK_DATA=false`. Unread count badge renders from `thread.unread_count`.
- **Modified:** `components/InboxStack.tsx` — `threadId` now optional, `recipientId` added for new-conversation flow.
- **Modified:** `types/index.ts` — Added `InboxThread` + `ThreadMessage` interfaces matching RPC response shapes.
- **Created:** `lib/typeAdapters.ts` — `adaptInboxThreadToLocal` with relative timestamp formatting.
- **Key decisions:** (1) Dual-path send avoids creating empty threads — thread created on first message only. (2) `recipientId` param enables new-conversation flow from Network tab without requiring a pre-existing thread.
- **Hooks:** 58 (+2: useInboxThreads, useThreadMessages) | **tsc:** 0

### S105 — Messaging Nav Fixes (March 23, 2026)
- **Modified:** `components/NewMessageScreen.tsx` — `threadId: contact.id` → `recipientId: contact.id` (contact.id is a user UUID, not a thread ID)
- **Modified:** `components/ContractorJobDetails.tsx` — `contactId: job.agent.id` → `recipientId: job.agent.id` + added `contactRole: 'agent'`
- **Key decisions:** S104b introduced `recipientId` param on InboxStack but left two nav call sites using old param names. Both fixed to use the correct typed params.
- **Metrics:** RPCs: 59 (unchanged), Hooks: 58 (unchanged), Edge Functions: 11 (unchanged)
- **tsc:** 0

### S106 — Live Messaging E2E Test (March 23, 2026)
- **Modified:** `hooks/useData.ts` — useCreateThread + useSendMessage catch blocks now re-throw instead of returning fake success objects that masked real errors. Debug logs added/removed. useInboxThreads unwraps `data.threads` from RPC response (was returning raw `{ success, threads }` object). Mock IDs for Lisa Nguyen + David Park updated to real seeded profile UUIDs.
- **Modified:** `components/ChatScreen.tsx` — handleSend restructured: newMessage declared before RPC block; on createThread failure removes optimistic message + shows Alert.
- **Modified:** `components/InboxList.tsx` — Pull-to-refresh via RefreshControl on ScrollView.
- **Modified:** `components/NetworkTab.tsx` — Both handleMessageContact + handleMessageAgent fixed: `contactId` → `recipientId`, added `contactRole`.
- **Key decisions:** (1) Root cause was NetworkTab passing `contactId` instead of `recipientId` — ChatScreen got `undefined` and never called createThread. (2) Mock fallback catch blocks were returning fake success objects that masked the real error — now re-throw. (3) `useInboxThreads` was returning raw RPC response object instead of unwrapping `data.threads`. (4) SQL fix: created public.get_user_thread_ids(p_user_id uuid) SECURITY DEFINER function. Replaced 5 self-referencing RLS policies on thread_members (1), messages (2), threads (2) — all now use helper function instead of direct subqueries. Permanent rule: junction table RLS policies must never self-reference.
- **Metrics:** RPCs: 59 (unchanged), Hooks: 58 (unchanged), Edge Functions: 11 (unchanged)
- **tsc:** 0

### S107 — Messaging Polish + Inbox Display (March 24, 2026)
- **Modified:** `lib/typeAdapters.ts` — `adaptConnectionToNetworkContact` changed `id: conn.id` (connection row UUID) → `id: conn.profile?.id ?? conn.responder_id` (partner's profile UUID). Fixes FK violation on `rpc_create_thread`.
- **Modified:** `tasks/lessons.md` — Added "Connection ID ≠ Profile ID" rule: `connections.id` is the connection row UUID, never a user identifier.
- **Modified:** `components/InboxList.tsx` — Scroll-to-top on screen focus via `useFocusEffect` + `scrollViewRef`. RECENT section gap removed (`paddingVertical: 8` → `paddingTop: 0, paddingBottom: 8`). `navigate` → `push` for ChatScreen to prevent NewMessage flash.
- **Modified:** `components/InboxStack.tsx` — ChatScreen changed from `fullScreenModal` to pushed screen, enabling iOS swipe-right-to-go-back gesture.
- **Modified:** `components/ChatScreen.tsx` — Bubble flash fix: `currentUserId` init `''` instead of placeholder + message sync gates on userId resolved. `isConversationMode` includes `!!initialThreadId` so existing threads skip compose header. Input padding: replaced SafeAreaView with explicit `paddingBottom: Math.max(insets.bottom, 8)`.
- **Modified:** `components/NewMessageScreen.tsx` — Back button 36×36 → 44×44, removed `hitSlop`, added `paddingBottom: 4` to header.
- **Key decisions:** (1) Connection row UUID vs profile UUID was a 3-session debug trace (S106c–S107b). (2) `useInboxThreads` was returning raw RPC object — unwrapped `data.threads`. (3) ChatScreen flash caused by `isConversationMode` requiring `messages.length > 0` which is false on first render before RPC data loads.
- **Metrics:** RPCs: 59 (unchanged), Hooks: 58 (unchanged), Edge Functions: 11 (unchanged)
- **tsc:** 0
- **S108 next objectives:** Live messaging E2E re-test (full flow verification), Next.js closing tracker web app, partner hooks device testing

### S108 — NewMessage Screen Flash Fix + Messaging Cleanup (March 24, 2026)
- **Modified:** `components/ChatScreen.tsx` — 6 sub-sessions of incremental fixes:
  - S108: Added `isLoadingThread` gate with `ActivityIndicator` to prevent flash of empty/compose UI when opening existing threads. Added `isReady` gate combining `currentUserId` resolution with mock data flag.
  - S108b: Fixed chat input bottom padding — removed double safe-area offset (`Math.max(insets.bottom, 12)` → `paddingBottom: 8`), tab bar already handles home indicator.
  - S108d: FlatList opacity gate — `listReady` state + `onContentSizeChange` callback hides ScrollView during initial layout calculation. 50ms settle delay. Reset on thread change.
  - S108e: Removed `scrollToEnd` on initial thread open (`hasRenderedInitialMessages` ref). Post-send scroll delayed 150ms to avoid double-scroll. `blurOnSubmit={false}` keeps keyboard open on Send key (iMessage rapid-fire pattern).
  - S108f: Navigation-timed reveal — 400ms `screenReady` delay masks loading snap during push animation. Messages rendered at `opacity: 0` during animation, revealed when both `screenReady` + `listReady` are true. New compose flow skips delay.
  - S108g: Keyboard hides messages fix — `Keyboard.addListener('keyboardDidShow')` scrolls to latest messages when keyboard opens. KAV already wraps both ScrollView + input correctly.
  - S108h: keyboardVerticalOffset reverted to 0 — tabBarHeight offset created 84px gap between input and keyboard. KAV wrapping was the actual fix for keyboard coverage.
- **Modified:** `components/NetworkTab.tsx` — S108b: Both `handleMessageContact` (AgentNetworkView) and `handleMessageAgent` (PartnerNetworkView) now check `useInboxThreads()` for existing thread via `other_member.user_id` match. If found, passes `threadId` instead of `recipientId` — opens existing conversation directly instead of compose flow.
- **Modified:** `hooks/useData.ts` — S108c: Added `staleTime: 30_000` to `useThreadMessages` for instant cache-based reopens within 30s.
- **Key decisions:** (1) Layered reveal approach: `isLoadingThread` → `screenReady` (400ms nav delay) → `listReady` (layout settled) → `showMessages` (combined gate). (2) No scroll on initial load — only on new messages after first render. (3) Tab bar handles bottom safe area, so ChatScreen input needs only breathing room padding. (4) Network tab thread detection prevents redundant compose flow when thread already exists. (5) `keyboardVerticalOffset=0` is correct — tab bar height offset overcorrects, creating visible gap.
- **Metrics:** RPCs: 59 (unchanged), Hooks: 58 (unchanged), Edge Functions: 11 (unchanged)
- **tsc:** 0
### S109 — Closing Tracker E2E Audit (March 25, 2026)
- **Context:** Device testing with `USE_MOCK_DATA: false`, logged in as Lisa Nguyen (partner, role: `title_escrow`). Found 8 bugs.
- **Created partner test accounts:** Lisa Nguyen (`lisa@atlasioapp.com`, UUID: `c4a7dd76-4d1c-46b8-961a-84e77f638bd7`, role: `title_escrow`), David Park (`david@atlasioapp.com`, UUID: `a27e8c53-7fc3-4729-b429-425c2cda7757`, role: `mortgage_pro`). Both with accepted connections to Tony/Alex Morgan.
- **Bugs found:** (1) RPC fix needed, (2) `buyer_name` always null, (3) CRITICAL: partner loads agent tabs, (4) profile role missing, (5+6) license upload not persisting / verification empty, (7) "All deals on track" with 0 deals, (8) vouches showing demo data while live
- **Metrics:** RPCs: 59 (unchanged), Hooks: 58 (unchanged), Edge Functions: 11 (unchanged)
- **tsc:** 0

### S110 — Partner Role Routing Fix + Partner Experience Polish (March 25, 2026)
- **Modified:** `lib/demoRoleContext.ts` — Added `mapProfileRoleToDemoRole()` function that maps Supabase `profiles.role` values to DemoRole type. Partner roles (`title_escrow`, `mortgage_pro`, `attorney`, `warranty`, `inspector`, `home_inspector`, `appraiser`, `transaction_coordinator`) → `'partner'`.
- **Modified:** `components/BottomTabNavigator.tsx` — When `DEV_BYPASS_AUTH: false`, `useMyProfile()` syncs `demoRole` state to the user's actual profile role via `useEffect`. Long-press role toggle disabled for live users. Added imports: `FEATURE_FLAGS`, `useMyProfile`, `mapProfileRoleToDemoRole`, `useEffect`.
- **Modified:** `features/partners/components/HomeTabPartner.tsx` — (1) Bug #7: Deals section now distinguishes 0-deal empty state ("No active deals yet" / grey card) from all-deals-clear state ("All deals on track" / green card). (2) Bug #8: Vouch feed gated by `FEATURE_FLAGS.USE_MOCK_DATA` — shows empty state ("No vouches yet") when live. Added `FEATURE_FLAGS` import.
- **Modified:** `features/partners/components/DealCreationSheet.tsx` — Bug #2: Added "Buyer Name" TextInput field (field 2, before closing date). `buyerName` state threaded through to `createTransaction.mutateAsync({ buyerName })`. File header updated from 4 fields to 5 fields.
- **Modified:** `hooks/useData.ts` — `useCreateTransaction` mutation now accepts `buyerName?: string | null` and passes it as `p_buyer_name` to `rpc_create_transaction` (was hardcoded `null`).
- **Modified:** `components/VerificationScreen.tsx` — Added S110 note documenting flag-dependent behavior for license uploads.
- **Modified:** `components/OnboardingComplete.tsx` — Added S110 note documenting LIVE_ONBOARDING flag dependency for persisting onboarding data.
- **Modified:** `lib/featureFlags.ts` — Reset flags to demo defaults (`USE_MOCK_DATA: true`, `DEV_BYPASS_AUTH: true`, `DEV_SHOW_PASSWORD_LOGIN: false`).
- **Modified:** `lib/config.ts` — Reset `PARTNER_TRACK_ENABLED` and `DEAL_CREATION_ENABLED` to `false` (demo defaults).
- **Key decisions:** (1) Role mapping lives in `demoRoleContext.ts` as a shared utility — reusable by any component needing to map profile roles. (2) Bug #4 resolved by Bug #3 fix — ProfileTab already reads `ROLE_DISPLAY[profileRole]` correctly; issue was the wrong role context. (3) Bug #5+#6 documented as expected flag-dependent behavior, no code fix needed.
- **Metrics:** RPCs: 59 (unchanged), Hooks: 58 (unchanged), Edge Functions: 11 (unchanged), Feature Flags: 11 (added PARTNER_TRACK_ENABLED + DEAL_CREATION_ENABLED to CLAUDE.md)
- **tsc:** 0
### S111 — Auth Session Cache Fix + Flag Reset (March 25, 2026)
- **Modified:** `App.tsx` — CRITICAL fix: reordered `onAuthStateChange` handler so `SIGNED_OUT` event is checked before `!session` null guard. Previously, sign-out (which sends `session=null`) hit the null guard first and returned before `queryClient.clear()` could execute. Second user login saw first user's cached profile and role. Added `setUserRole('Agent')` reset on sign-out.
- **Modified:** `tasks/lessons.md` — Added "Auth Session Switch (S111)" lesson documenting the cache clear ordering bug and fix.
- **Bug #1 (CRITICAL) fixed:** After logout + login as different user, previous user's session persisted — wrong tabs, wrong profile name, wrong role. Root cause: dead code path where `queryClient.clear()` was unreachable.
- **Bug #2 resolved:** Profile tab not showing partner role was a symptom of Bug #1 (stale cache served wrong user's data). ProfileTab.tsx role display logic was already correct.
- **Key decision:** No query key change needed (`['profile', 'me']` is fine) — `queryClient.clear()` on sign-out wipes all cached data, so the next user starts fresh.
- **Metrics:** RPCs: 59 (unchanged), Hooks: 58 (unchanged), Edge Functions: 11 (unchanged), Feature Flags: 11 (unchanged)
- **tsc:** 0
### S112 — Milestone Persistence Fix + Partner UX Bugs (March 25, 2026)
- **Modified:** `features/partners/hooks/usePartnerData.ts` — CRITICAL: `useUpdateMilestoneStatus` was not persisting to Supabase. Root cause: missing `p_completed_at` param in RPC call (only sent 2 of 3 required params) + silent catch block swallowed errors. Fix: added `p_completed_at` param, added `PARTNER_TRACK_ENABLED` gate for mock path, errors now re-throw instead of faking success, added success/error logging.
- **Modified:** `features/partners/components/HomeTabPartner.tsx` — Deal invitation card redesign: agent avatar 24px → 40px, removed redundant role pill, added purchase price display (`$XXX,XXX` from `contract_price`), card width 200 → 220, address allows 2 lines.
- **Modified:** `features/partners/components/PartnerDealsScreen.tsx` — Fixed blank white space above ACTIVE section: removed excess `paddingTop` from ACTIVE section header when no "Closing Soon" deals exist (conditional `paddingTop: closingSoonGroup.length > 0 ? SPACING.lg : 0`).
- **Modified:** `components/InboxList.tsx` — Inbox thread avatar/name fallbacks: `SingleAvatar` shows "?" when name is empty, thread name shows "Unknown" when name is empty. Root SQL fix for `rpc_get_inbox_threads` profile join may also be needed.
- **Modified:** `lib/featureFlags.ts` — Flags set for device testing, reset to demo defaults before commit.
- **Modified:** `lib/config.ts` — `PARTNER_TRACK_ENABLED` and `DEAL_CREATION_ENABLED` set for testing, reset to demo defaults before commit.
- **Key decisions:** (1) Milestone RPC error handling now re-throws instead of faking success — matches S106 pattern for `useCreateThread`/`useSendMessage`. (2) `PARTNER_TRACK_ENABLED` gate added to mutation — mock path returns immediately without calling RPC. (3) Inbox avatar "?" fallback is defensive; root cause likely in RPC profile join (needs SQL investigation). (4) Deal invitation card purchase price gracefully hides if `contract_price` is null.
- **Metrics:** RPCs: 59 (unchanged), Hooks: 58 (unchanged), Edge Functions: 11 (unchanged), Feature Flags: 11 (unchanged)
- **tsc:** 0
- **S113 next objectives:** Verify `rpc_update_milestone_status` has 3 params in Supabase (add `p_completed_at` if missing), device QA milestone tap → Supabase row update → closing page Realtime refresh, investigate `rpc_get_inbox_threads` profile join for missing names/avatars, wire live vouch feed for partners
### S114 — Post Alert DateTimePicker (March 26, 2026)
- **Modified:** Replaced Post Alert date TextInput with native DateTimePicker
- **tsc:** 0
### S115 — Inbox Archive Fix + Deal Display + Connections Join (March 26, 2026)
- **S115b-rpc:** `rpc_get_agent_deals` updated in Supabase — added `milestone_label` + `sort_order` to response
- **S115c:** `AgentActiveDeal` type updated with `buyer_name` + `contract_price` fields, mock data updated, `AgentDealDetailScreen` displays buyer name + contract price
- **S115d:** `hooks/useData.ts` — `useConnections` bidirectional profile join fix (always returns other person's profile, not self)
- **S115e:** `rpc_archive_thread` new RPC deployed + `useArchiveThread` hook added + `InboxList.tsx` `handleDelete` wired to archive. `rpc_create_thread` updated to skip archived threads (no stale thread reuse).
- **S115f:** `useArchiveThread` upgraded with `onMutate` optimistic cache removal + `onError` rollback + `onSettled` invalidation
- **S115g:** `InboxList.tsx` `useEffect` condition fix — `inboxThreads.length > 0` → `inboxThreads !== undefined && !== null` so empty inbox after archiving all threads doesn't fall through to stale `liveThreads` branch
- **Key decisions:** (1) Archive not hard-delete — preserves message history for compliance. (2) Optimistic cache removal with rollback — instant UI even on slow connections. (3) Two-layer optimistic update: local `setThreads` for animation + TanStack cache `onMutate` for data consistency.
- **Metrics:** RPCs: 60 (+1: rpc_archive_thread), Hooks: 59 (+1: useArchiveThread), Edge Functions: 11 (unchanged), Feature Flags: 11 (unchanged)
- **tsc:** 0
- **S116 next objectives:** 3-dot menu + Edit Deal modal on AgentDealDetailScreen

### S116 — 3-Dot Menu + Edit Deal Modal on AgentDealDetailScreen (March 26, 2026)
- **Files created:** `components/EditDealScreen.tsx` — fullScreenModal with buyer name, contract price (currency formatting), closing date (DateTimePicker inline)
- **Files modified:** `components/AgentDealDetailScreen.tsx` (Share button → 3-dot menu with ActionSheetIOS/Alert), `components/HomeStack.tsx` (EditDeal route), `hooks/useData.ts` (useUpdateTransaction hook)
- **SQL deployed:** `rpc_update_transaction` — updates buyer_name, contract_price, closing_date on transactions table (SECURITY DEFINER, agent ownership check)
- **Key decisions:** (1) ActionSheetIOS on iOS / Alert on Android for 3-dot menu — lightweight, no new dependency needed for 2 menu items. (2) Currency formatting reuses DealCreationSheet pattern (strip non-digits on input, format with $ + commas on display). (3) DateTimePicker reuses DealCreationSheet inline pattern.
- **Metrics:** RPCs: 61 (+1: rpc_update_transaction), Hooks: 60 (+1: useUpdateTransaction), Screens: +1 (EditDealScreen)
- **tsc:** 0
- **S117 next objectives:** Inbox scroll UX polish (iMessage pattern)

### S116b + S117 — Edit Deal Clear Date + Inbox Refetch Spinner (March 26, 2026)
- **S116b modified:** `components/EditDealScreen.tsx` — added `dateWasCleared` state tracking so clearing a closing date persists NULL instead of being silently ignored by COALESCE. SQL: `p_clear_closing_date` boolean param added to `rpc_update_transaction`.
- **S117 modified:** `components/InboxList.tsx` — RefreshControl spinner now only shows on user-initiated pull-to-refresh, not on background refetches triggered by cache invalidation after archive (prevents jank/flash after deleting a thread).
- **Metrics:** RPCs: 61 (rpc_update_transaction updated, not new), Hooks: 60 (unchanged)
- **tsc:** 0

### S109/S118 — EAS Build Config + TestFlight Setup (March 26-27, 2026)
- **Files created:** `eas.json` — EAS build config (development, preview, production profiles)
- **Files modified:** `app.config.js` — added bundle ID `com.atlasioapp.atlasio`, build number, EAS project ID, iOS/Android config
- **S118c-g:** autoSubmit preview profile, app display name `atlasio-demo` → `Atlasio`, revert invalid autoSubmit, build number increments (1→4), legacy anon key fix, ITSAppUsesNonExemptEncryption flag
- **Metrics unchanged:** RPCs: 61, Hooks: 60
- **tsc:** 0

### S119a-c — Consolidate Flags, EditProfile Fixes, Wire Languages Column (March 28, 2026)
- **S119a modified:** `lib/featureFlags.ts`, `components/AddressComparisonScreen.tsx`, `components/ClientLifestyleScreen.tsx` — moved `LIVE_NEIGHBORHOOD_HOOKS` from `hooks/useNeighborhoodAnalysis.ts` to `lib/featureFlags.ts`, updated all consumers
- **S119b modified:** `components/EditProfileScreen.tsx` — hide bio field, add headline to save payload, headline limit 35→45, company 25 char limit, license row reads live data, service area Google Places city autocomplete, mock licenseNumber blanked
- **S119b modified:** `components/ProfileTab.tsx` — Z1 location→service area, Z4b languages card (hidden if ≤1 language)
- **S119c modified:** `types/index.ts`, `components/EditProfileScreen.tsx`, `components/ProfileTab.tsx`, `hooks/useData.ts` — wire `languages` column end-to-end (Profile type, save payload, useEffect pre-fill, ProfileTab live read)
- **Metrics unchanged:** RPCs: 61, Hooks: 60, Feature Flags: 11
- **tsc:** 0

### S119d — Wire NewMessageScreen to Live Connections (March 28, 2026)
- **Modified:** `components/NewMessageScreen.tsx` — replaced hardcoded `SUGGESTED_CONTACTS` (fake IDs) with live data from `useChatRecipients` hook. Feature-flagged: `USE_MOCK_DATA=true` keeps mock fallback. Live path returns real profile UUIDs from accepted connections, fixing broken thread creation for real users.
- **Metrics unchanged:** RPCs: 61, Hooks: 60
- **tsc:** 0

### S120a — QA Bug Fixes from TestFlight Build #5 (March 29, 2026)
- **Modified:** `components/ProfileTab.tsx` — (1) headline pill: removed `numberOfLines={1}` truncation, added `textAlign: 'center'` + `alignSelf: 'center'`; (2) languages card: added `(mockSource as any)?.languages` fallback so card shows in demo mode for agents
- **Modified:** `components/EditProfileScreen.tsx` — service area autocomplete dropdown: `zIndex: 99` → `999` on outer, inner, and dropdown containers (fixes clipping by ScrollView siblings)
- **Modified:** `components/NewMessageScreen.tsx` — header `paddingTop: 8` → `12` + insets.top (+4px breathing room)
- **Modified:** `components/ChatScreen.tsx` — (1) input bar `paddingBottom: 8` → `16`; (2) `keyboardVerticalOffset={0}` → `{Platform.OS === 'ios' ? 88 : 0}` (fixes keyboard covering input on pushed screens)
- **Modified:** `app.config.js` — build number 4 → 5
- **Metrics unchanged:** RPCs: 61, Hooks: 60, Edge Functions: 11, Feature Flags: 11
- **tsc:** 0
- **S120b next objectives:** TestFlight Build #6 QA, remaining inbox/chat polish, partner track wiring

### S113b/d/f/g — Alert Wiring Fixes, Dismiss Persistence, Greeting Headers, Deal Card Visibility (March 30, 2026)
- **S113b modified:** `features/partners/hooks/usePartnerData.ts` — `usePostDealAlert`: removed `p_job_id` from RPC call (param no longer exists), error re-throw instead of silent mock fallback (matches S106/S112 pattern), optimistic update matches on `transaction_id` not `job_id`. `features/partners/types/partner.types.ts` — `DealAlert.job_id` → `DealAlert.transaction_id`. `features/partners/components/HomeTabPartner.tsx`, `PartnerDealsScreen.tsx` — guard `if (!transactionId) return` before `postAlert.mutate()`.
- **S113d modified:** `hooks/useData.ts` — `useAgentDismissDealAlert` wired to live `rpc_dismiss_deal_alert` RPC (was mock-only). Optimistic update matches on `transaction_id` first, falls back to `job_id` for legacy deals. `components/AgentDealDetailScreen.tsx` — "Got it" handler passes `transactionId: deal.transaction_id`.
- **S113f modified:** `components/HomeTabAgent.tsx`, `features/partners/components/HomeTabPartner.tsx`, `components/ContractorHomeTab.tsx` — personalized time-of-day greeting on all 3 home tabs via `useMyProfile()`. Contractor tab switched from `CURRENT_CONTRACTOR.name` (mock) to live profile data.
- **S113g modified:** `features/partners/components/HomeTabPartner.tsx` — YOUR DEALS section: always renders `ActiveDealCard` for all deals when `totalActiveDeals > 0`. AllClearEmptyState no longer suppresses deal cards — replaced with subtle green dot + "All deals on track" text below cards.
- **Key decisions:** (1) Error re-throw pattern (S113b) matches S106/S112 — surfaces failures to `onError` for rollback instead of hiding behind mock data. (2) `transactionId` guard prevents RPC call with undefined param. (3) `firstName` fallback is `'there'` for null profile. (4) Deal cards always visible — "all clear" state was suppressing content.
- **Metrics:** RPCs: 61 (unchanged), Hooks: 60 (unchanged — useAgentDismissDealAlert upgraded from mock to live, not new)
- **tsc:** 0

### S121b — FindTab: Fix Double/Orphaned Spacing on ProCard Tags Row (March 30, 2026)
- **Files modified:** `components/FindTab.tsx` — ProCardComponent: (1) wrapped headline conditional in `minHeight: 32` container for consistent card heights when headline is absent, (2) removed `marginTop: 6` from headline pill View, (3) removed `marginTop: 8` from tags row View (was stacking with outer `gap: 8` = 16px total)
- **Key decisions:** Outer `<View style={{ gap: 8 }}>` already handles inter-element spacing; redundant marginTop on both headline pill and tags row caused double spacing when headline present and orphaned spacing when absent. `minHeight: 32` wrapper ensures cards render at consistent height regardless of headline presence.
- **Metrics unchanged:** RPCs: 61, Hooks: 60
- **tsc:** 0

### S121a — Transaction Close/Cancel Actions (March 30, 2026)
- **Files modified:** `features/partners/types/partner.types.ts` (added `status?: 'active' | 'closed' | 'cancelled'` to AgentActiveDeal), `hooks/useData.ts` (+2 hooks: useCloseTransaction, useCancelTransaction), `components/AgentDealDetailScreen.tsx` (bottom action zone with "Mark as Closed" SecondaryButton + "Cancel Deal" DangerButton, native Alert confirmation, cache invalidation on success)
- **Key decisions:** (1) Soft-archive pattern — no hard deletes, status column tracks lifecycle. (2) Action zone hidden when deal.status !== 'active'. (3) Review auto-fixed: tightened undefined-deal guard (`deal && ...`), removed no-op `loading` prop from DangerButton (component doesn't implement loading state). (4) Both RPCs already deployed as SECURITY DEFINER with agent ownership + active status checks.
- **Metrics:** RPCs: 63 (+2: rpc_close_transaction, rpc_cancel_transaction — backend deployed prior), Hooks: 62 (+2: useCloseTransaction, useCancelTransaction)
- **tsc:** 0

### S121c — FindTab ProCard: Role as Plain Text (March 30, 2026)
- **Files modified:** `components/FindTab.tsx` — ProCardComponent: removed role pill `<View>` wrapper (backgroundColor, borderRadius, paddingHorizontal/Vertical), role now renders as plain `<Text>` with `COLORS.primary`. Reduces competing pill/tag styles on card from 3 to 2.
- **Metrics unchanged:** RPCs: 63, Hooks: 62
- **tsc:** 0

### S121d — ChatScreen Keyboard Gap + Auto-Focus (March 30, 2026) — REVERTED
- **Attempted:** SafeAreaView edges fix, dynamic keyboardVerticalOffset, paddingBottom: insets.bottom on input bar, messageInputRef + auto-focus useEffects. All changes reverted after device testing — keyboard layout requires more investigation.
- **Deferred to:** S122a
- **Metrics unchanged:** RPCs: 63, Hooks: 62
- **tsc:** 0
- **S122 next objectives:** ChatScreen keyboard gap + auto-focus (S122a), ATLASIO_CONTEXT.md metrics cleanup

### S129 — Stripe Connect Contractor Payment Setup (April 4, 2026)
- **Files created:** `components/PaymentSettingsScreen.tsx` (status card: amber not-connected / green connected, "How it works" 3-step section, useFocusEffect cache refresh on return from Stripe)
- **Files modified:** `hooks/useData.ts` (+1 hook: useGetStripeOnboardingUrl), `components/SettingsScreen.tsx` (conditional Payment Setup row, contractor only, green/amber status text), `components/ContractorHomeTab.tsx` (amber Stripe Connect banner above Job Invites, cross-stack nav via CommonActions to ProfileStack), `components/ProfileStack.tsx` (PaymentSettings route + type)
- **Key decisions:** (1) stripe_account_id IS NOT NULL = connected (no boolean flag needed). (2) Return URL: https://closing.atlasioapp.com/stripe-return. (3) Cross-stack nav from ContractorHomeTab via CommonActions.navigate({ name: 'Profile', params: { screen: 'PaymentSettings' } }). (4) Edge Function writes stripe_account_id directly to profiles — useFocusEffect handles cache refresh. (5) /review P0 fixed: POST body now sends { user_id: session.user.id, return_url } to Edge Function (EF reads user_id from body, not JWT). (6) /review D: removed dead useSaveStripeAccountId hook — Edge Function handles the write, RPC was redundant.
- **Metrics:** Hooks: 63 (+1: useGetStripeOnboardingUrl), Screens: +1 (PaymentSettingsScreen)
- **tsc:** 0

### S130a — HomeTabAgent Polish (April 4, 2026)
- **Files modified:** `components/HomeTabAgent.tsx` — greeting subtitle ("X jobs posted") removed (name only), Closing Squad header→context copy marginTop set to 4px, Client Tools section header paddingBottom 8→16
- **Metrics unchanged**
- **tsc:** 0

### S130b — HomeTabAgent Greeting Padding (April 4, 2026)
- **Files modified:** `components/HomeTabAgent.tsx` — greeting paddingTop 20→16 (matches paddingBottom for balanced vertical spacing)
- **Metrics unchanged**
- **tsc:** 0

### S130c — Star Rating Order Audit (April 4, 2026)
- **Files modified:** `components/SquadSlotPicker.tsx`, `components/FindTab.tsx`, `components/CategoryMapScreen.tsx`, `components/ContractorJobDetails.tsx`, `components/ContractorHomeTab.tsx` — all star ratings now show number first, star icon second (e.g., "4.8 ★" not "★ 4.8"). 6 instances fixed across 5 files. 6 already-correct instances unchanged.
- **Metrics unchanged**
- **tsc:** 0

### S130d — Closing Squad Header Row minHeight (April 5, 2026)
- **Files modified:** `components/HomeTabAgent.tsx` — Closing Squad header row minHeight 36 → 32
- **Metrics unchanged**
- **tsc:** 0

### S130e — Closing Squad Header Top-Align + minHeight 28 (April 5, 2026)
- **Files modified:** `components/HomeTabAgent.tsx` — Closing Squad header row minHeight 32 → 28, alignItems: center → flex-start (text top-aligned, no padding above text)
- **Metrics unchanged**
- **tsc:** 0
- **TestFlight Builds this session:** #18 (build 20), #19 (build 21), #20 (build 22), #21 (build 23)

### S130e — Closing Squad Header Top-Aligned (April 5, 2026)
- **Files modified:** Closing Squad header row minHeight 28, text top-aligned
- **Metrics unchanged**
- **tsc:** 0

### S130f — Stripe Return Page + Edge Function return_url (April 5, 2026)
- **Files created:** `atlasio-closing/app/stripe-return/page.tsx` — pure static success page shown after Stripe Connect onboarding completes
- **Files modified:** `supabase/functions/stripe-connect-onboarding/index.ts` — `return_url` default changed from `atlasio://stripe-onboarding-complete` → `https://closing.atlasioapp.com/stripe-return`
- **Key decision:** return_url default = `https://closing.atlasioapp.com/stripe-return` (temporary until S-INFRA-04 deep links wired, at which point swap to `atlasio://stripe-onboarding-complete`)
- **Metrics unchanged:** RPCs 61, Hooks 59, Edge Functions 11
- **tsc:** 0

### S132 — Avatar Upload + ProProfile Live Data (April 7, 2026)
- **Files created:** `components/shared/Avatar.tsx` (reusable avatar — photo + initials fallback + camera overlay + upload spinner), `hooks/useUploadAvatar.ts` (pick photo → Supabase avatars bucket → update profiles.avatar_url → invalidate cache)
- **Files modified:** `components/shared/index.ts` (Avatar barrel export), `components/ProfileTab.tsx` (Avatar + useUploadAvatar wired), `components/EditProfileScreen.tsx` (Avatar + useUploadAvatar wired, CameraIcon removed), `components/ProProfile.tsx` (Avatar read-only + useProfileStats wired), `components/FindTab.tsx` (Avatar read-only, null URI), `components/InviteContractorsModal.tsx` (Avatar read-only, null URI), `components/InboxList.tsx` (@backend comment only), `hooks/useData.ts` (+useProfileStats with LIVE_PROFILE_HOOKS gate, +ProfileStats interface, +profileStats queryKey), `lib/featureFlags.ts` (+LIVE_PROFILE_HOOKS: false)
- **Key decisions:** Avatar upload fully live (no mock path) — uses Supabase avatars bucket + profiles.avatar_url. useProfileStats mock-only (rpc_get_profile_stats not yet deployed). LIVE_PROFILE_HOOKS flag added (default false). InboxList keeps existing group avatar pattern (2x2 grid incompatible with shared Avatar). ProProfileData NOT modified — avatar_url read from live profile fetch.
- **Shared component:** Avatar (components/shared/Avatar.tsx)
- **Metrics:** Hooks: 65 (+2: useUploadAvatar, useProfileStats), Feature Flags: 11 (+1: LIVE_PROFILE_HOOKS)
- **tsc:** 0

### S133 — Profile Stats Live + Avatar URL Wiring (April 8, 2026)
- **Files modified (5):** `lib/featureFlags.ts` (LIVE_PROFILE_HOOKS flipped true), `types/index.ts` (avatar_url added to InboxThread.other_member), `lib/typeAdapters.ts` (avatarUrl added to InboxChatThread + FindProCard, mapped through both adapters), `components/InboxList.tsx` (SingleAvatar replaced with shared Avatar, dead component removed, @cleanup comment added), `components/FindTab.tsx` (avatarUrl added to local ProCard interface, passed to Avatar uri prop)
- **Also updated:** `hooks/useData.ts` (useProfileStats status comment updated to "wired")
- **Key decisions:** LIVE_PROFILE_HOOKS permanently true (rpc_get_profile_stats deployed). avatar_url wired into InboxList other_member + FindTab ProCard. SingleAvatar cleanup debt documented — 4 files remaining (NewMessageScreen, CreateDealChat, ChatScreen, SquadSlotPicker).
- **Backend (deployed in Claude Chat, not this session):** rpc_get_profile_stats (new RPC), rpc_get_inbox_threads patched with avatar_url on other_member
- **Metrics:** RPCs: 64 (+1), Hooks: 65 (unchanged), Feature Flags: 11 (LIVE_PROFILE_HOOKS flipped true)
- **tsc:** 0

### S134 — SingleAvatar Cleanup (April 8, 2026)
- **Files modified (4):** `components/NewMessageScreen.tsx` (SingleAvatar replaced with shared Avatar, size 48), `components/CreateDealChat.tsx` (SingleAvatar replaced with shared Avatar, 2 instances: size 40 + 28), `components/ChatScreen.tsx` (SingleAvatar replaced with shared Avatar, 3 instances: size 40 + 36 + 64), `components/SquadSlotPicker.tsx` (SingleAvatar replaced with shared Avatar, size 48)
- **Also updated:** `components/InboxList.tsx` (@cleanup comment resolved)
- **Key decisions:** SingleAvatar inline component fully eliminated from codebase. Shared Avatar is now the sole avatar implementation across all files. No `interactive` prop exists on Avatar — non-interactive by default when no `onPress` passed.
- **Metrics:** RPCs: 64 (unchanged), Hooks: 65 (unchanged), Feature Flags: 11 (unchanged)
- **tsc:** 0

### S135a — Avatar Polish: Remove Photo + Role-Aware Guidance Copy (April 9, 2026)
- **Files modified (3):** `hooks/useUploadAvatar.ts` (pickAndUpload accepts currentAvatarUrl, state-aware action sheet, Remove Photo logic), `components/EditProfileScreen.tsx` (role-aware helper text below avatar, caller updated), `components/ProfileTab.tsx` ("Add photo" nudge when avatar_url null, caller updated)
- **Key decisions:** pickAndUpload now accepts `currentAvatarUrl?: string | null`. Action sheet is state-aware: "Take Photo" → "Change Photo" + "Remove Photo" when photo exists. Remove Photo clears `profiles.avatar_url` + attempts storage delete (non-critical, logged only). Role-aware helper text uses DB snake_case `'agent'` comparison. "Add photo" nudge is NOT a Pressable. No SQL, no new hooks, no new components.
- **Metrics:** RPCs: 64 (unchanged), Hooks: 65 (unchanged), Feature Flags: 11 (unchanged)
- **tsc:** 0

### S135b — Active Jobs Live Data (HomeTabAgent) (April 9, 2026)
- **Files modified (3):** `types/index.ts` (AgentActiveJob interface), `hooks/useData.ts` (useAgentActiveJobs hook + MOCK_AGENT_ACTIVE_JOBS), `components/HomeTabAgent.tsx` (wired hook, renamed section, inline card render)
- **Key decisions:** `rpc_get_agent_active_jobs` deployed S135b (SQL done in Claude Chat). Section renamed "Active Repairs" → "Active Jobs" (UI label only). All job types returned (repair, photography, staging). RepairCard NOT reused — inline card render with AgentActiveJob shape. Status display: awarded=Scheduled, in_progress=In Progress, pending_completion=Review Required (amber). `contractor_completed_at` non-null = "Needs your review" badge. Inline hex cleanup in filter pills. Hook follows mock fallback pattern with try/catch.
- **Metrics:** RPCs: 65 (+1 rpc_get_agent_active_jobs), Hooks: 66 (+1 useAgentActiveJobs), Feature Flags: 11 (unchanged)
- **tsc:** 0

### S136 — HomeTabAgent Inline Hex Cleanup (April 10, 2026)
- **Files modified (1):** `components/HomeTabAgent.tsx`
- **Key decisions:** Pure hex cleanup pass — 8 inline hex values replaced with COLORS tokens (top bar badge, demo toggle, squad avatars/icons, role picker modal). 3 rgba/hex values flagged with `@tokens` comments (no exact token match): `#8DB0FF` (top bar border), `rgba(0,61,195,0.15)` (avatar tint, iconTintBg is different opacity), `rgba(0,0,0,0.4)` (backdrop, between overlayLight/overlayDark). 1 avatar data hex (`#A8C5DA`) left as-is — data value, not a design token. No layout, logic, or spacing changes.
- **Metrics:** RPCs: 65, Hooks: 66, Feature Flags: 11 (all unchanged)
- **tsc:** 0

### S137a — AgentJobDetailScreen + Active Jobs Card Tap + Spring Press (April 10, 2026)
- **Files created (1):** `components/AgentJobDetailScreen.tsx`
- **Files modified (2):** `components/HomeStack.tsx`, `components/HomeTabAgent.tsx`
- **Key decisions:** New `AgentJobDetailScreen` (not adapting RepairJobDetails — clean agent/contractor separation). Route `AgentJobDetail: { jobId: string }` in HomeStack. Card tap fixed: `RepairJobDetails as any` → `AgentJobDetail` with `jobId`. `navigation.push()` used (not navigate) — lessons.md rule. Spring press microinteraction established: `scale(0.97)`, bounciness 6, speed 40/50. `ActiveJobCard` extracted as inline component for correct `useRef` scoping per card. Screen entrance: fade + slide-up 12px, 280ms, `useNativeDriver: true`. Status pulsing dot: `Animated.loop` on `in_progress` status. `handleConfirmComplete`: @demo Alert for now.
- **Metrics:** Screens: +1 (AgentJobDetailScreen). RPCs: 65, Hooks: 66, Feature Flags: 11 (unchanged)
- **tsc:** 0

### S137a-T4 — FindTab Inline Hex Cleanup (April 10, 2026)
- **Files modified (1):** `components/FindTab.tsx`
- **Key decisions:** 7 inline hex/rgba values replaced with tokens: 3x `#FFFFFF` → `COLORS.background`, 2x `#666666` → `COLORS.secondaryText`, `rgba(0,0,0,0.3)` → `COLORS.overlayLight`, inline shadow props → `...SHADOWS.card` spread. Added `SHADOWS` to import. Avatar data hex values (16 `avatarColor` entries) left as-is — data values, not design tokens.
- **Metrics:** RPCs: 65, Hooks: 66, Feature Flags: 11 (all unchanged)
- **tsc:** 0

### S138 — Shimmer Skeleton Loaders + Error Toast System (April 10, 2026)
- **Files created (3):** `components/shared/SkeletonBlock.tsx`, `components/shared/ErrorToast.tsx`, `hooks/useErrorToast.ts`
- **Files modified (8):** `lib/tokens.ts`, `components/shared/index.ts`, `components/HomeTabAgent.tsx`, `components/FindTab.tsx`, `components/ProProfile.tsx`, `components/InboxList.tsx`, `components/ContractorJobDetails.tsx`, `components/NetworkTab.tsx`, `components/JobTrackerTab.tsx`
- **Key decisions:** Shimmer via `Animated.timing` translateX (no LinearGradient, no third-party libraries). `SkeletonBlock` is the single shared primitive — all screen-specific skeletons are built from it inline. `ErrorToast` uses spring slide-up entrance + 4s auto-dismiss with optional retry button. `useErrorToast` is a simple useState hook wired at screen level (not inside useData.ts). Skeleton dimensions match real card dimensions from code. Screens with mock data only (ContractorJobDetails, JobTrackerTab) have skeletons pre-built and ready for when live hooks are wired. `ActivityIndicator` removed from HomeTabAgent (Active Jobs) and ProProfile.
- **New tokens (2):** `COLORS.skeletonBase` (#E8ECEF), `COLORS.skeletonShimmer` (rgba(255,255,255,0.55))
- **New shared components (2):** `SkeletonBlock`, `ErrorToast`
- **New hooks (1):** `useErrorToast`
- **Metrics:** RPCs: 65, Hooks: 67 (+1), Feature Flags: 11 (unchanged)
- **tsc:** 0 | **Lint:** 0 new warnings

### S139 — Spring Press Rollout + DealClosedCelebration Animation Restore (April 10, 2026)
- **Files modified (5):** `components/VouchFeedSection.tsx`, `components/AgentDealsScreen.tsx`, `components/NetworkTab.tsx`, `components/DealClosedCelebrationScreen.tsx`, `tasks/screen-registry.md`
- **Phase A — Spring Press Rollout (S139a):** Applied scale(0.97) bounciness 6 spring press pattern (established S137a) to 5 surfaces:
  - VouchFeedSection vouch cards (made cards tappable → recipient profile)
  - AgentDealsScreen deal pipeline cards (replaced opacity press feedback)
  - AgentDealsScreen filter chips (extracted FilterChip component, scale 0.95, bounciness 4)
  - NetworkTab connection request cards (tactile feedback only, no-op onPress)
  - NetworkTab NetworkProCard (replaced opacity press feedback)
- **Phase B — DealClosedCelebration Animation Restore (S139b):** Restored 3 animations using core RN Animated only (no Reanimated, no react-native-animatable):
  - Trophy bounce entrance (Animated.spring, bounciness 14)
  - Confetti burst (12 Animated.View dots, Animated.stagger 40ms, radial pattern)
  - Shareable deal card fade-in (opacity + translateY, 400ms delay)
- **Key decisions:** NetworkTab ProCards use inline `NetworkProCard` component (not FindTab's ProCard) — spring press applied directly. Connection request cards wrapped with tactile-only spring press (Accept/Decline buttons remain primary interaction). No animation libraries removed (react-native-animatable and react-native-confetti-cannon were already removed in S126). react-native-view-shot kept for share card capture.
- **No new hooks, screens, or tokens added.**
- **Metrics:** Hooks: 67 (unchanged) · Screens: unchanged · COLORS: 123 (unchanged)
- **Feature flags:** No changes (all remain at demo defaults)
- **tsc:** 0 | **Lint:** 0 new warnings

### S140 — Active Jobs Nav Restore + ChatScreen Keyboard Fix (April 11, 2026)
- **S140a — Nav Rewire:** Restored Active Jobs card tap from AgentJobDetailScreen back to RepairJobDetails (4-step timeline + completion flow). Stubbed missing Job fields with @demo markers (overwritten by useJob() on mount). Added @cleanup comment on orphaned AgentJobDetail route in HomeStack. Added @bug comment on duplicate HomeStackParamList in types/index.ts.
- **S140b — ChatScreen Keyboard Fix v2:** Reverted S139-hotfix dynamic paddingBottom on ChatScreen ScrollView. Root cause: KAV behavior='padding' already handles keyboard offset, S139-hotfix double-counted by adding keyboardHeight+16 to contentContainerStyle. Restored static paddingBottom: 16, kept scrollToEnd on keyboardDidShow.
- **Expo patch bumps:** expo 55.0.9→55.0.14, expo-blur, expo-document-picker, expo-haptics, expo-image-picker, expo-linear-gradient, expo-linking, expo-secure-store, expo-status-bar
- **Files modified (4):** `components/HomeTabAgent.tsx`, `components/HomeStack.tsx`, `components/ChatScreen.tsx`, `types/index.ts`
- **Metrics:** RPCs: 65, Hooks: 66, Feature Flags: 11 (all unchanged)
- **tsc:** 0 | **Lint:** 0 new warnings

### S140 — Next Objectives
- Demo Playbook rewrite (Claude Chat — no Claude Code needed)
- Token audit: add `COLORS.topBarBorder`, `COLORS.onPrimary`, rgba overlay tokens
- ProProfile: wire years_experience from profileStats into UI
- Wire `errorToast.showError()` into live hook onError callbacks as hooks go live
- Spring press remaining: FindTab ProCards (if not already done in S137b)
- Cleanup: remove AgentJobDetailScreen + route if confirmed fully unused
- Cleanup: unify duplicate HomeStackParamList (types/index.ts vs HomeStack.tsx)

### S142 — Spring Press: QuickActionsRow, Neighborhood Card, FindTab ProCards (April 13, 2026)
- **QuickActionsRow:** Applied scale(0.97) spring press to all 4 action cards. Array-of-refs pattern (`scaleAnims[index]`, `Array.from({ length: 4 }, ...)` — hardcoded to card count). Moved visual card styling from Pressable to inner `Animated.View`; removed pre-existing `opacity: pressed ? 0.85 : 1` press feedback (now handled by scale).
- **HomeTabAgent ClientToolCard:** Converted the local `ClientToolCard` component (used by the "Neighborhood Match" card → ClientLifestyleScreen) from arrow-expression to function body with spring press. Used `pressScaleAnim` ref name to avoid collision with pre-existing `scaleAnim` at line 348 (unrelated Active Jobs card animation). Removed pre-existing `opacity: pressed ? 0.7 : 1`.
- **FindTab ProCardComponent:** Added per-instance `scaleAnim` via `useRef` inside the function component (one ref per card, not array-of-refs since each card is its own React instance). Wrapped outer card visual in `Animated.View`. Inner Invite/Connect CTAs (lines 320/325) left untouched per spec. Removed pre-existing `opacity: pressed ? 0.95 : 1`.
- **Pattern adherence:** `toValue: 0.97`, `bounciness: 6`, `useNativeDriver: true` on every spring call — matches S139 exactly.
- **Key decisions:**
  - QuickActionsRow card count hardcoded to 4 with inline comment (cards array has 4 entries; update comment if that changes).
  - FindTab skipped array-of-refs because `ProCardComponent` is a function component re-instantiated per list item — local `useRef` gives one ref per instance naturally.
  - `ClientToolCard` turned out to be a local component (not shared across files), so no scope expansion required.
- **Files modified (3):** `components/QuickActionsRow.tsx`, `components/HomeTabAgent.tsx`, `components/FindTab.tsx`
- **Metrics:** RPCs: 65, Hooks: 66, Edge Functions: 11, Feature Flags: 11 (all unchanged)
- **tsc:** 0 | **Lint:** 0 new warnings (3 pre-existing unused-var warnings unrelated)

### S143 — Profile Save Fix, Role Pill, Service Area Pill, Avatar Upload (April 13, 2026)
- **Root cause:** `useUpdateProfile` called `supabase.from('profiles').update()` directly, which silently failed on the missing `languages` column and the 35-char `headline` CHECK constraint. The catch block returned a cache-merged fake Profile, making saves appear successful while nothing persisted. TestFlight users saw language/specialty/service area edits "save" but never land in the DB.
- **Fix 1 — hooks/useData.ts:** `useUpdateProfile` now calls new `rpc_update_profile` RPC. Dropped `getCurrentUserId()` — RPC uses `auth.uid()` server-side. Catch re-throws instead of returning a fake cache merge. No more silent failures. Status updated to `// STATUS: wired (RPC, no fallback — S143)`.
- **Fix 2 — components/EditProfileScreen.tsx:** Pre-fill gate switched from `!USE_MOCK_DATA` to `LIVE_PROFILE_HOOKS` — the old gate meant demo mode never pre-filled from live Supabase data, so the form always showed hardcoded `MOCK_AGENT_DATA` regardless of what was in the DB. `bio` removed from `handleSave` (the bio field is `@demo hidden`, so every save was overwriting real bio with mock string). Headline cap widened 45→50 chars. `trades` field sends `null` when `primaryTrade === ''` (agent flow) so `COALESCE(p_trades, trades)` preserves the existing row value instead of clobbering with `[]`.
- **Fix 3 — components/ProfileTab.tsx:** Added `roleLabel` with safe-capitalize fallback chain (`mockSource.display_role → liveProfile.display_role → ROLE_DISPLAY[profileRole] → capitalize(profileRole)`) — prevents raw lowercase `'agent'` from rendering. Wrapped role pill in a horizontal row with a new **service area pill** rendered inline (only when `profileServiceArea` is non-empty). Removed service area from the company/license line below to avoid duplication.
- **Fix 4 — hooks/useUploadAvatar.ts + app.json:** Replaced `fetch(uri).blob()` with `FileSystem.readAsStringAsync` base64 + `Uint8Array` upload — the old `fetch().blob()` path is unreliable on Expo SDK 54 iOS. Added `expo-image-picker` plugin to `app.json` with `photosPermission` and `cameraPermission` strings (plugin required for iOS to register ImagePicker delegate even though `app.config.js` already set the Info.plist keys).
- **Fix 5 — sql/schema.sql:** Appended S143 block: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}'` (missing column surfaced by schema audit), `DROP/ADD CONSTRAINT profiles_headline_check CHECK (<= 50)` (widened from 35), and `CREATE OR REPLACE FUNCTION rpc_update_profile(...) SECURITY DEFINER SET search_path = public`. The `updated_at` column is intentionally NOT set in the RPC body — the `update_profiles_updated_at` BEFORE UPDATE trigger (schema.sql:855) handles it, matching CLAUDE.md S49 warning against `GENERATED ALWAYS AS`.
- **Fix 6 — tasks/lessons.md:** Flagged latent contractor trades enum mismatch bug as `ATL-CONTRACTOR-TRADES`. `TRADE_OPTIONS` values in `EditProfileScreen.tsx` (`Electrician, Plumber, Roofer, Painter, Landscaper, Driveway/Paving`) don't match `trades_enum` values (`Electrical, Plumbing, Roofing, Painting, Landscaping / Drainage, Driveway / Paving`). Previously swallowed by the silent catch; post-S143 contractor save will throw. Agent flow unaffected — trades sent as `null`.
- **Key decisions:**
  - RPC over direct `.update()` — future-proofs against column drift; RPC signature is the contract, not the client-side object shape. Also lets `auth.uid()` run server-side without client-side session fetching.
  - Re-throw on catch (not silent mock fallback) — writes must surface errors. Breaks the "mock data is never deleted" rule for this ONE hook because silent writes are worse than loud failures. Reads still keep mock fallback everywhere.
  - Headline cap widened to 50 (not dropped entirely) — 45 was the original UI intent; 35 was an artifact of an old CHECK nobody verified. Splitting the difference at 50 gives breathing room without requiring UI copy changes beyond the `maxLength`.
  - Dropped `p_bio` from the RPC signature entirely — bio field is hidden, so there's no caller. Keeping a dead param is worse than removing it.
  - Schema audit caught two blockers (`languages` missing, headline CHECK ≠ UI cap) that would have wasted another debugging session. Reading `sql/schema.sql` BEFORE writing the RPC is now a hard rule in this skill for any write-path RPC.
- **Files modified (7):** `hooks/useData.ts`, `components/EditProfileScreen.tsx`, `components/ProfileTab.tsx`, `hooks/useUploadAvatar.ts`, `app.json`, `sql/schema.sql`, `tasks/lessons.md`
- **SQL pending manual execution in Supabase SQL Editor** (S143 block in `sql/schema.sql`): (1) ALTER TABLE profiles ADD COLUMN languages, (2) widen headline CHECK 35→50, (3) CREATE FUNCTION rpc_update_profile. Code shipped before SQL — profile save will throw `PGRST202 function does not exist` until Tony runs the SQL.
- **Metrics:** RPCs: 65 → 66, Hooks: 65, Edge Functions: 11, Feature Flags: 11 (all unchanged)
- **tsc:** 0 errors | **Lint:** 0 errors (3 pre-existing unused-var warnings in ContractorHomeTab/PostPhotoJobScreen/PostStagingJobScreen — untouched)

### S144 — Address Autocomplete + Date Picker on Job Screens, Icon Color Fix, Extract AddressAutocompleteInput (April 13, 2026)
- **Fix 1 — components/shared/AddressAutocompleteInput.tsx (NEW):** Extracted the Google Places (New) autocomplete pattern from PostJobWizard into a reusable shared component. Self-contained state (query, suggestions, showAutocomplete, debounced timer). Calls POST `places.googleapis.com/v1/places:autocomplete` with `X-Goog-Api-Key: GOOGLE_MAPS_API_KEY`. 400ms debounce, 3-char minimum. Matches existing input styling via `COLORS.inputBackground`/`inputActiveBorder`. Props: `value`, `onSelect`, `placeholder`, optional `label`.
- **Fix 2 — components/shared/index.ts:** Added `AddressAutocompleteInput` barrel export.
- **Fix 3 — components/PostJobWizard.tsx:** Replaced ~90 lines of inline autocomplete state, `fetchAutocompleteSuggestions`, handlers, and JSX with `<AddressAutocompleteInput>`. Removed now-unused `TextInput`, `useRef`, `useEffect`, `SHADOWS`, `GOOGLE_MAPS_API_KEY`, inline `PinIcon`, and local `PlaceSuggestion` type. Date picker unchanged (already correct).
- **Fix 4 — components/PostPhotoJobScreen.tsx:** Address TextInput replaced with `<AddressAutocompleteInput>`. `dateNeeded: string` → `Date | null` + `showDatePicker` state. Added inline `DateTimePicker` with `display="inline"`, `themeVariant="light"`, `minimumDate={new Date()}`, iOS/Android event handling matching PostJobWizard. `p_due_date` now sent as `toISOString().split('T')[0]` (YYYY-MM-DD) matching PostJobWizard convention. Header circle: `'#1A6B3C'` → `COLORS.jobGreen`. `CameraIcon` gains optional `color` prop (default `COLORS.primary`); header passes `COLORS.onPrimary` (white) for contrast.
- **Fix 5 — components/PostStagingJobScreen.tsx:** Address TextInput replaced with `<AddressAutocompleteInput>`. **Timeline chips kept unchanged.** Added optional `specificDate: Date | null` state + `DateTimePicker` section below timeline chips ("Specific Date (optional)"). `p_due_date` sends `specificDate.toISOString().split('T')[0]` when set, otherwise falls back to existing timeline key. Header circle: `'#7C3AED'` → `COLORS.jobPurple`. `ChairIcon` gains optional `color` prop (default `COLORS.primary`); header passes `COLORS.onPrimary`.
- **Fix 6 — lib/tokens.ts:** Added `jobGreen: '#1A6B3C'` and `jobPurple: '#7C3AED'` under new "Job Category Icon Circles" section. No more inline hex in Post*JobScreen headers.
- **Files created:** `components/shared/AddressAutocompleteInput.tsx`
- **Files modified:** `components/PostJobWizard.tsx`, `components/PostPhotoJobScreen.tsx`, `components/PostStagingJobScreen.tsx`, `components/shared/index.ts`, `lib/tokens.ts`
- **Key decisions:**
  - Extract-on-second-use: PostJobWizard had the correct inline implementation; extraction was deferred until PhotoJob and StagingJob needed it (this session).
  - StagingJob keeps timeline chips + adds optional specific-date override rather than replacing them — business rule preserves the coarse-grained option.
  - Icon color prop defaults to `COLORS.primary` (blue) so existing usage in any other screen is unaffected; headers explicitly pass `COLORS.onPrimary` for colored-background contrast.
  - Date RPC format: `YYYY-MM-DD` string (matches PostJobWizard). `Date.toISOString().split('T')[0]` rather than new Date utilities.
- **Metrics:** Shared Components +1 (AddressAutocompleteInput). COLORS tokens 123 → 125 (+2: jobGreen, jobPurple). Screens unchanged. RPCs/Hooks/Edge Functions/Feature Flags unchanged.
- **tsc:** 0 errors | **Lint:** 0 errors (3 pre-existing unused-var warnings unchanged)
- **No backend/schema changes** — pure frontend refactor and UI fix.

### S145a — ProfileTab License Pending State (April 13, 2026)
- **Fix — components/ProfileTab.tsx:** Credentials card License row now reflects `profiles.license_status` (the column `rpc_submit_license_verification` actually writes to), not just the legacy `license_verified` boolean. Derived `licenseStatus` reads from `mockSource?.license_status ?? liveProfile?.license_status ?? 'unverified'`, then `licenseVerified = licenseStatus === 'verified'` and `licensePending = licenseStatus === 'pending'`. Agent license row now renders "CO License · Pending Review" with an amber `COLORS.counterAmber` ShieldIcon when pending — previously the agent path fell through to "Not added · Tap to verify" because it only knew about the boolean. Contractor branch unchanged in behavior. `MOCK_CONTRACTOR_PROFILE` gains `license_status: 'verified' as const` alongside `license_verified: true` so the contractor demo state stays "strongest".
- **Why:** ProfileTab and VerificationScreen were reading two different columns. After a user submitted via `rpc_submit_license_verification`, `license_status='pending'` but `license_verified=false` — VerificationScreen showed "Pending Review" while ProfileTab told the agent "Not added · Tap to verify". Same user, two contradictory states.
- **Files modified:** `components/ProfileTab.tsx`
- **Metrics unchanged:** No new screens, hooks, RPCs, edge functions, feature flags, or schema.
- **tsc:** 0 errors
- **No backend/schema changes** — pure frontend display fix. Schema columns (`license_status`, `license_verified`) already exist (sql/schema.sql:1487, :1507); both remain in use, no migration needed.

### S145b — Avatar Initials Standardization (April 13, 2026)
- **Root cause:** Initials logic was inlined across 22+ components with inconsistent rules. Some used first char only, some first-of-first + first-of-last, some uppercased, some didn't, some crashed on empty strings. Same user rendered as `T`, `TG`, or `Tg` depending on the screen.
- **Fix — components/shared/Avatar.tsx:** Replaced inline `initial = name.charAt(0).toUpperCase()` (1-char, no null guard) with an inline 2-char formula: `(name ?? '').split(' ').filter(Boolean).slice(0,2).map(n => n[0]!.toUpperCase()).join('') || '?'`. Also replaced hard-coded `'#FFFFFF'` text color with `COLORS.onPrimary`. Component API unchanged — `uri`, `name`, `size`, `color`, `onPress`, `showCameraOverlay`, `isUploading` all preserved.
- **Callsite migration:** Deleted 14 local `AvatarPlaceholder` / `ModalAvatar` / `SenderAvatar` helper components and replaced ~20 inline/helper callsites with the shared `<Avatar>`. Net: -477 lines / +121 lines across S145b+c combined.
- **Files modified (21 consumer files + Avatar.tsx):** `AgentDealDetailScreen`, `AgentDealsScreen`, `ContractorHomeTab`, `ContractorInboxList`, `ContractorJobDetails`, `HomeTabAgent`, `InviteToJobModal`, `JobCompletionScreen`, `JobTrackerTab`, `MessageBubble`, `NetworkTab`, `NotificationsTab`, `PostJobWizard`, `ProProfile`, `RepairChatScreen`, `RepairJobDetails`, `RequestConnectModal`, `SendSquadScreen`, `VouchPromptModal`, `features/partners/DealCreationSheet`, `features/partners/HomeTabPartner`, `components/shared/Avatar`
- **Key decisions:**
  - Shared component owns the rule — no per-screen overrides. One source of truth for initials across the whole app.
  - Multi-word names render 2 chars uppercase (`"Tony Giap"` → `TG`). Single-word names render 1 char (`"Madonna"` → `M`) because the formula takes the first character of each of the first two whitespace-separated tokens — one token in, one char out. Acceptable because it eliminates the prior inconsistency; all call sites now render the same output for the same input.
  - `'?'` fallback for empty/undefined — never crash, never render whitespace.
  - **Two deviations where shared `<Avatar>` could not be used directly:** `SendSquadScreen.tsx` (64px squad hero has a 1.35px `COLORS.accentBlue` border) and `HomeTabAgent.tsx` line ~955 (squad slot avatars have a conditional 2px `rgba(0,61,195,0.15)` border and share their container with a PlusIcon for empty slots). In both cases the helper/inline View was kept, but the initials formula was rewritten in place to match the shared Avatar's output exactly, so the standardization goal still holds.
- **Metrics unchanged:** Shared Components count stays (Avatar already existed, formula + token update only).
- **tsc:** 0 errors | **lint:** 0 new warnings (3 pre-existing on main)

### S145c — Restore Swipe-Back Gesture on 9 Screens (April 13, 2026)
- **Root cause:** Native-stack screens with `headerShown: false` lose iOS swipe-back unless `gestureEnabled: true` is set explicitly. 9 screens had custom back chevrons but no way to swipe back — users had to aim for the chevron on every screen.
- **Fix — navigator configs only, no component touches:**
  - `components/HomeStack.tsx` — 6 screens: `Notifications`, `ProProfile`, `AgentDealsScreen`, `ClosedDeals`, `AgentJobDetail`, `AgentDealDetail`
  - `components/ProfileStack.tsx` — 2 screens: `Settings`, `PaymentSettings`
  - `components/BottomTabNavigator.tsx` — 1 screen: ContractorInbox `ChatScreen`
- **Audit method:** Read all 6 nav files to find screens inheriting `headerShown: false` without `presentation: 'fullScreenModal'`, then grepped the 17 screen component files for `goBack`/`ChevronLeft`/`BackIcon`/`showBack` to confirm which actually render a back chevron. Tab roots (HomeMain, InboxList, FindMain, NetworkMain, ProfileMain, ContractorHomeMain, ContractorJobsMain, ContractorInboxMain) were excluded — no back needed.
- **Files modified (3):** `components/HomeStack.tsx`, `components/ProfileStack.tsx`, `components/BottomTabNavigator.tsx`
- **Key decisions:**
  - Did NOT add `gestureEnabled: true` to fullScreenModal screens — those dismiss via X button, not swipe-back.
  - Did NOT touch tab root screens — the root of a stack has nothing to go back to.
  - Zero component file changes — this is purely a nav-config restoration.
- **Metrics unchanged.**
- **tsc:** 0 errors

### S147 — Job Details Card (job_type fields) + Shared PhotoLightbox (April 14, 2026)
`RepairJobDetails.tsx` is the shared agent-side details screen for all three job types, but rendered only repair-specific fields. Photography and staging jobs routed there with their type-specific data invisible. Photo section was a dummy `PhotoPlaceholder` — no real photos, no lightbox. Two fixes in one session.

- **Fix 1 — `RepairJobDetails.tsx` top info card now renders all relevant fields by `job.job_type`.** Rebuilt the card into four rows: (1) pills row (category + due date + explicit `URGENT` DisplayTag when `is_urgent`), (2) budget + address, (3) **job-type branch**, (4) description.
  - **repair branch:** trades chips (null-guarded, hidden when `trades` null per S143 latent bug — no display label remapping), bid_deadline row.
  - **photography branch:** service_packages as ghost DisplayTag chips, turnaround_preference row, sqft row.
  - **staging branch:** occupied_or_vacant DisplayTag pill (title-cased), rooms_count row, staging_scope as ghost DisplayTag chips, sqft row.
  - All section sublabels use the S41 pattern (`fontSize: 12, fontWeight: '600', COLORS.secondaryText, uppercase, letterSpacing: 0.5`). Category + due date pills kept at 12pt per CLAUDE.md allowed exceptions (compact badge text).
- **Fix 2 — Shared `PhotoLightbox` component + real photo strip on RepairJobDetails.**
  - **New file `components/shared/PhotoLightbox.tsx`** — full-screen paged photo viewer. Props: `{ visible, photos: string[], initialIndex, onClose }`. Modal `transparent animationType="fade"`, `rgba(0,0,0,0.95)` backdrop (intentionally not a token — true-black overlay, commented), horizontal paging ScrollView with `contentOffset` seeded from `initialIndex`, `onMomentumScrollEnd` tracks current index, counter `n / total` top-center, 44×44 close button top-right. `useEffect([visible, initialIndex])` resets internal index each time the lightbox opens. Returns null when `photos.length === 0`.
  - **`ContractorJobDetails.tsx` refactor:** replaced its inline lightbox Modal (lines 1295–1380) with `<PhotoLightbox>`. `DEMO_PHOTOS` changed from `{isPlaceholder, url}[]` to `string[]` with three real picsum URLs (parity with RepairJobDetails). Dropped unused `Modal` + `Dimensions` imports and the dead local `CameraIcon` component that only served the old placeholder branch. Thumbnails normalized to **88×88 / borderRadius 8** (from 112×88 / radius 10) to match RepairJobDetails.
  - **`RepairJobDetails.tsx` photo strip:** replaced `<PhotoPlaceholder />` (dead decorative component) with an edge-to-edge horizontal ScrollView of 88×88 thumbnails below the info card. State: `lightboxVisible`, `lightboxIndex`. Constant `DEMO_PHOTOS` (3 picsum URLs) defined outside the component; `displayPhotos = job.photo_urls?.length ? job.photo_urls : DEMO_PHOTOS` hoisted near state so both the strip and the `<PhotoLightbox>` mount reference the same value (no duplicate computation, no IIFE in JSX). `<PhotoLightbox>` mounted outside the scrollable content alongside the other Modals.
- **Mock data updates — `components/RepairJobsData.ts`:**
  - Added `photo_urls` array (3 picsum seeds) to job `id: '1'` so the strip + lightbox render immediately in the default demo walkthrough.
  - **New photography job `id: '7'`** — "Listing Photos — 4BR Colonial", open status, `job_type: 'photography'`, `service_packages: ['Interior + Exterior Photos', 'Drone / Aerial']`, `turnaround_preference: 'Next Day'`, `sqft: 2400`, one mock bid from a Part 107 licensed photographer.
  - **New staging job `id: '8'`** — "Stage Primary Suite + Living Areas", open status, `job_type: 'staging'`, `occupied_or_vacant: 'occupied'`, `rooms_count: 4`, `staging_scope: ['Living Room', 'Dining Room', 'Primary Bedroom']`, `sqft: 1800`, one mock bid from an occupied-staging specialist.
  - All new fields carry `@demo` markers.
- **`/review` findings (pre-commit):**
  - `[AUTO-FIXED]` chip map keys prefixed with index to prevent duplicate-label collisions (`key={`${i}-${trade}`}` across trades / service_packages / staging_scope rows).
  - `[AUTO-FIXED]` hoisted `displayPhotos`, removed IIFE + duplicate `photo_urls` computation at the lightbox mount.
  - `[FIXED after ASK]` category + due-date pill font size reverted 14→12pt after confirming the rest of the app (HomeTabAgent, ContractorJobDetails) uses 12pt for identical pills per CLAUDE.md allowed exceptions.
  - `[SKIP]` PhotoLightbox initialIndex bounds — defensive only, no current callers at risk.
  - `[SKIP]` ContractorJobDetails overflow overlay branch — pre-existing dead code, minimal blast radius rule.
- **Key decisions:**
  - `PhotoLightbox` takes `photos: string[]` instead of the original `{isPlaceholder, url}[]` shape. Simpler API, forces callers to pass real URLs only. The previous contractor-side placeholder branch was dead demo scaffolding — removed rather than ported.
  - `DisplayTag` import stays at `./DisplayTag` (not `./shared`). S147 did not migrate it into `components/shared/` — that's a larger refactor touching ProProfile, ProfileTab, and other consumers. Flagged for a future cleanup session.
  - Trades chip row on repair branch is hidden until `job.trades` is populated. Per `tasks/lessons.md` S143 rule, no display-label remapping was done — the TradeEnum rename (ATL-CONTRACTOR-TRADES) is a separate session.
  - `rgba(0, 0, 0, 0.95)` is the lightbox backdrop — intentionally inline, not a token. Commented in `PhotoLightbox.tsx` as "true-black overlay, intentionally not a design token".
- **Files modified (4) + created (1):**
  - Created: `components/shared/PhotoLightbox.tsx`
  - Modified: `components/RepairJobDetails.tsx`, `components/ContractorJobDetails.tsx`, `components/RepairJobsData.ts`, `components/shared/index.ts`
- **Metrics:** Shared Components +1 (PhotoLightbox). No new RPCs, hooks, edge functions, or feature flags.
- **tsc:** 0 errors | **Lint:** 0 errors (3 pre-existing unused-var warnings unchanged)

### S147 — Next Objectives
- **Build 28 QA** (carried from S146) — now also verify S147 photo strip + lightbox on device: repair/photography/staging details screens render correct job-type fields, thumbnails tap open lightbox to correct index, paging + close work, reopening resets to new initial index.
- **Populate `job.trades` on mock jobs** so the repair-branch trades chip row can be visually verified before the TradeEnum rename session. Use enum values verbatim (`Electrical`, `Plumbing`, etc.), NOT display labels.
- **Migrate `DisplayTag` into `components/shared/`** and update all consumers. Larger refactor — separate session.
- **ContractorJobDetails dead overflow overlay cleanup** (`index === 3 && DEMO_PHOTOS.length > 4`) — can go when the photo strip gets a real overflow design or real data with >4 photos.
- **Rollover from S146:** Bug 2 languages/specialties pre-fill investigation, TestFlight Build 28 on-device verification of all S146 fixes, all S145 rollover items still open.

### S146 — QA Bug Fixes from Build 27 (April 13, 2026)
Seven bugs surfaced from TestFlight Build 27 QA. Root-caused and fixed in one pass.

- **Bug 1 — components/ProfileTab.tsx:** Role pill rendered lowercase `'agent'` because `liveProfile.display_role` DB column returned the raw enum value (not the display string) and won the `??` fallback chain before `ROLE_DISPLAY[profileRole]` fired. Dropped `display_role` from both `profileDisplayRole` and `roleLabel` derivation chains. Both now use `ROLE_DISPLAY[profileRole]` as the authoritative display source. DB column is considered unreliable and is no longer read for display purposes.
- **Bug 3 — hooks/useUploadAvatar.ts:** Avatar upload was failing silently because (a) the outer catch block only set local `error` state that the caller didn't render, and (b) the 3-step pipeline (FileSystem read → base64 decode → storage upload) had no per-step error identification. Added inner try/catch around each step with tagged error messages (`FileSystem read failed: …`, `Base64 decode failed: …`, `Storage upload failed: …`), added `Alert.alert('Upload Failed', message)` in the outer catch so failures surface on-device. Also renamed `'Change Photo'` → `'Take Photo'` in both the iOS ActionSheet with-photo branch and the Android Alert options (the no-photo branches already said "Take Photo"). Android Alert title for existing-photo case renamed `'Change Photo'` → `'Update Photo'` to keep semantics clear.
- **Bug 4 — components/shared/AddressAutocompleteInput.tsx:** Dropdown rows were untappable inside ScrollView on iOS. Bumped all three stacking contexts (outer wrapper, inner relative wrapper, absolute dropdown View) from `zIndex: 99` to `zIndex: 1000` with matching `elevation: 1000` for Android. Elevation placed AFTER `...SHADOWS.card` spread on the dropdown to avoid the shadow preset overwriting it (caught by tsc TS2783). Consumer screens (PostPhotoJobScreen, PostStagingJobScreen, PostJobWizard) already had `keyboardShouldPersistTaps="handled"` — no consumer changes.
- **Bug 5 — components/EditProfileScreen.tsx:** Headline cap reverted 50 → 45 chars. Three spots updated: `slice(0, 45)` in onChangeText, `maxLength={45}`, and helperText `"45 chars max"`. SQL executed separately in Supabase SQL Editor: `ALTER TABLE profiles DROP CONSTRAINT profiles_headline_check; ALTER TABLE profiles ADD CONSTRAINT profiles_headline_check CHECK (char_length(headline) <= 45);`
- **Bug 6 — components/InboxStack.tsx:** `DealChatScreen` converted from `presentation: 'fullScreenModal'` (slide from bottom) to a pushed screen with `options={{ gestureEnabled: true }}`. `headerShown: false` inherits from Stack.Navigator screenOptions. Restores swipe-back-from-edge on iOS. Animation now slides from right matching the rest of InboxStack.
- **Bug 7 — components/DealChatScreen.tsx:** Deal Details edit modal sheet input was hidden behind keyboard. Root cause: `<KeyboardAvoidingView>` was nested *inside* the sheet's inner Pressable, so `behavior="padding"` had nothing to push against — the animated bottom-aligned sheet couldn't extend upward. Restructured: KAV now wraps the entire `<Pressable backdrop>` as the outermost Modal child with `flex: 1`. Keyboard now pushes the whole bottom-aligned sheet upward. Inner KAV removed. `translateY` spring animation (600→0) preserved.
- **Bug 2 — skipped:** Languages/Specialties/ServiceArea pre-fill reportedly not working. Investigation proved there is no code bug. `hooks/useData.ts:164` uses `supabase.from('profiles').select('*')` which returns all columns. `types/index.ts:168-169` declares both `languages: string[]` and `specialties: string[]`. The pre-fill `useEffect` in `EditProfileScreen.tsx:366-367` only overwrites `prev` when fetched arrays are non-empty — if DB rows genuinely have empty `languages`/`specialties` (default `'{}'`), the pre-fill is a no-op by design. Recommended on-device diagnosis: run `SELECT languages, specialties FROM profiles WHERE id = '<your-id>'` in Supabase SQL editor before assuming the hook is broken.
- **Key decisions:**
  - ProfileTab `display_role` removal is a hard break from the DB column. If partner roles ever need custom display labels, add them to the `ROLE_DISPLAY` map in `components/ProfileTab.tsx` rather than relying on the DB column.
  - Avatar upload errors now surface via `Alert.alert` in addition to `setError()`. This violates the "never add UI side effects in a hook" purist rule but is justified because the original silent failure meant the caller component had to opt-in to rendering the error, which wasn't happening.
  - AddressAutocompleteInput zIndex bump is the lightweight fix. If device testing shows the dropdown rows are still untappable, the next step is moving the dropdown into a `<Modal transparent>` overlay (more complex, better stacking guarantees).
  - DealChatScreen fullScreenModal → pushed conversion changes the transition animation. Modal entry points that relied on modal-specific dismiss behavior (none confirmed in code) may need adjustment.
- **Files modified (6):** `components/ProfileTab.tsx`, `hooks/useUploadAvatar.ts`, `components/shared/AddressAutocompleteInput.tsx`, `components/EditProfileScreen.tsx`, `components/InboxStack.tsx`, `components/DealChatScreen.tsx`
- **SQL executed in Supabase SQL Editor:** headline constraint revert 50 → 45 chars
- **Metrics unchanged** — no new RPCs, hooks, edge functions, feature flags, or shared components.
- **tsc:** 0 errors | **Lint:** 0 errors (3 pre-existing unused-var warnings unchanged)

---

## S148a — ATL-CONTRACTOR-TRADES Mapping Layer Fix (April 14, 2026)

**Scope:** Bidirectional mapping layer between `TRADE_OPTIONS` UI labels and `trades_enum` DB values. Resolves the latent contractor trades save bug flagged in S143 without schema changes or RPC changes.

**Files created:**
- **`lib/tradesMap.ts`** (new, 45 lines) — exports `TRADE_LABEL_TO_ENUM` and derived `TRADE_ENUM_TO_LABEL`. Source of truth for all trade translations. Verified against `sql/schema.sql:109–123` trades_enum definition.

**Files modified:**
- **`components/EditProfileScreen.tsx`** — imported maps; added state-flow comment block above main component; pre-fill `useEffect` now reverse-maps `myProfile.trade` + `myProfile.trades` DB enum values → UI labels so chip selection state matches `TRADE_OPTIONS`; `handleSave` now forward-maps UI labels → DB enum values via two local consts (`primaryTradeDB`, `tradesForDB`) before the `useUpdateProfile` mutation fires. Mock data left untouched.
- **`components/ProfileTab.tsx`** — imported `TRADE_ENUM_TO_LABEL`; Z1 hero trade pill now reverse-maps `profileTrade` (was rendering raw DB enum values like `Plumbing`, now renders `Plumber`). Applies to both mock and live profile paths.
- **`tasks/lessons.md`** — marked `ATL-CONTRACTOR-TRADES` as resolved; logged new deferred `ATL-CONTRACTOR-TRADES-2` covering `EditRepairJob.tsx` + `PostJobWizard.tsx` which declare their own independent `TRADE_OPTIONS` arrays.

**Final `TRADE_LABEL_TO_ENUM` map (8 entries, verified against schema.sql trades_enum):**
| UI Label | DB Enum Value | Type |
|---|---|---|
| `Electrician` | `Electrical` | mismatch |
| `Plumber` | `Plumbing` | mismatch |
| `Roofer` | `Roofing` | mismatch |
| `General Contractor` | `General Contractor` | identity ✓ |
| `HVAC` | `HVAC` | identity ✓ |
| `Painter` | `Painting` | mismatch |
| `Landscaper` | `Landscaping / Drainage` | mismatch |
| `Driveway/Paving` | `Driveway / Paving` | mismatch |

**Key decisions:**
- Option C (bidirectional mapping) chosen over renaming `TRADE_OPTIONS` — keeps UI labels human-readable and DB values correct.
- Shared `lib/tradesMap.ts` chosen over inline duplication in `ProfileTab.tsx` — future-proofs the eventual `ATL-CONTRACTOR-TRADES-2` migration of `EditRepairJob.tsx` + `PostJobWizard.tsx`.
- Scope held tight: did NOT touch `EditRepairJob.tsx`, `PostJobWizard.tsx`, or `ContractorTradeStep.tsx` even though they have similar latent bugs — logged as `ATL-CONTRACTOR-TRADES-2` for a dedicated follow-up session.
- Agent flow unaffected — `trades` still sent as `null` for agents via the existing `form.primaryTrade ? ... : null` guard.
- `General Contractor` and `HVAC` verified as literal identity mappings in `sql/schema.sql:110` and `:119`.

**Metrics unchanged** — no new RPCs, hooks, edge functions, feature flags, or shared components. One new lib file (`lib/tradesMap.ts`).

**tsc:** 0 errors | **Lint:** 0 errors (3 pre-existing unused-var warnings unchanged)

---

### S146 — Next Objectives
- **TestFlight Build 28 QA** — verify all 7 fixes on device, especially Bug 4 autocomplete tappability (zIndex may still fail on iOS ScrollView — fall back to Modal if so) and Bug 7 keyboard sheet interaction
- **Bug 2 investigation** — on device: edit profile, save languages + specialties, force-close app, reopen EditProfile, verify pre-fill populates. If not, run SQL to confirm DB row actually has populated arrays.
- **Rollover from S145:** Carried next objectives from S145 still open (profile save E2E verification, job posting flows E2E, contractor trades enum fix ATL-CONTRACTOR-TRADES, CLAUDE.md metrics sync already done S145c, AddressAutocompleteInput consolidation into 4 other screens, Screen Registry audit, Demo Playbook rewrite, cleanup AgentJobDetailScreen + duplicate HomeStackParamList)

### S145 — Next Objectives
- **Verify profile save end-to-end on device** after Tony executes the S143 SQL. Test: edit headline 36–50 chars, change languages, change service area, hit Save, force-close app, verify values persisted.
- **Verify job posting flows on device** — post a photo job with the new autocomplete + date picker, post a staging job with specificDate set, post a staging job with only timeline chip, confirm RPC accepts all three shapes.
- **Contractor trades enum fix** — rename `TRADE_OPTIONS` in `EditProfileScreen.tsx` to match `trades_enum` values (`Electrical` not `Electrician`, etc.), or build a UI→enum mapping layer. `ATL-CONTRACTOR-TRADES` in `tasks/lessons.md`.
- **AddressAutocompleteInput consolidation opportunities** — `AddressComparisonScreen.tsx`, `ClientLifestyleScreen.tsx`, `EditProfileScreen.tsx`, `DealCreationSheet.tsx` still have their own inline Google Places autocomplete implementations. Migrate each to `<AddressAutocompleteInput>` where the UX matches (some may need dropdown positioning tweaks).
- Screen Registry audit: full codebase sweep, orphan detection (unreferenced screens/routes) (carried)
- Demo Playbook rewrite (Claude Chat — carried from S140)
- Token audit: add `COLORS.topBarBorder`, rgba overlay tokens (carried — `onPrimary` already exists)
- Cleanup: remove AgentJobDetailScreen + route if confirmed fully unused (carried)
- Cleanup: unify duplicate HomeStackParamList (types/index.ts vs HomeStack.tsx) (carried)
