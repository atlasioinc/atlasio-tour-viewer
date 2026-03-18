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

## Current Metrics (updated S64b — March 17, 2026)
- **RPCs:** 41
- **Hooks:** 70 (+3 S64b: useCreateTransaction, usePartnerInvitations, useRespondToDealInvitation)
- **Feature Flags:** 8 (+1 local: `LIVE_NEIGHBORHOOD_HOOKS`) + `PARTNER_TRACK_ENABLED` + `DEAL_CREATION_ENABLED` in lib/config.ts
- **Edge Functions:** 10
- **Storage Buckets:** 6
- **Screens:** +1 S63 (AgentDealDetailScreen), +1 S64b (DealCreationSheet — bottom sheet modal)
- **COLORS tokens:** 120
- **Lifestyle Categories:** 16
- **tsc:** 0 errors

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

**Architecture note:** All 8 RPCs anchor to `job_id` as FK (temporary).
Migrate to `transaction_id` in S64 when `transactions` table exists.

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

### Edge Functions (10 deployed)
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
Both `HomeTabAgent.tsx` and `HomeTabAgentFilled.tsx` have a "Client Tools" section with a `ClientToolCard` component between Closing Squad and Quick Actions sections.

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
- **Key decisions:** Active Deals section renders conditionally (hidden when no deals). Status dot priority: red (alerts) > amber (stale) > green (on track) > gray (no milestones). Milestone rows are View not Pressable (read-only). All hooks use job_id as anchor (migrate to transaction_id in S64). Vouch feed inlined from HomeTabAgentFilled (replaces VouchFeedSection import).
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
