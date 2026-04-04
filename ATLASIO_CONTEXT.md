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

## Current Metrics (updated S129 — April 4, 2026)
- **RPCs:** 63 (includes 4 messaging RPCs S104b, 2 completion RPCs S85, get_user_thread_ids S106, rpc_archive_thread S115e, rpc_update_transaction S116, rpc_close_transaction + rpc_cancel_transaction S121a, and others S91-S103)
- **Hooks:** 63 (+1 useGetStripeOnboardingUrl S129; useData.ts count; partner hooks in usePartnerData.ts tracked separately)
- **Feature Flags:** 10 — 8 in featureFlags.ts + PARTNER_TRACK_ENABLED + DEAL_CREATION_ENABLED in config.ts. Note: LIVE_NEIGHBORHOOD_HOOKS referenced in code but missing from featureFlags.ts (S105 finding).
- **Edge Functions:** 11
- **Screens:** +1 (PaymentSettingsScreen S129)
- **Storage Buckets:** 7
- **Tables:** 22+ (schema.sql documents 22 as of S93; messaging tables predate tracking)
- **COLORS tokens:** 123
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
- **Files modified:** Closing Squad header row minHeight 36 → 32
- **Metrics unchanged**
- **tsc:** 0

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
