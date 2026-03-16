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

## Current Metrics (updated S56 — March 16, 2026)
- **RPCs:** 33
- **Hooks:** 58
- **Feature Flags:** 8 (+1 local: `LIVE_NEIGHBORHOOD_HOOKS`)
- **Edge Functions:** 10
- **Storage Buckets:** 6
- **tsc:** 0 errors

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
```

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
- `BottomTabNavigator`: All 6 tabs always mounted; role-gated via `tabBarButton: () => null` + `tabBarItemStyle: { display: 'none' }` (S55 — eliminates icon flash on role toggle). Agent sees 5, Contractor sees 3.

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
| `types/neighborhood.ts` | Types scoped to this feature (not in types/index.ts) |
| `lib/neighborhoodScoring.ts` | Weighted composite score computation + `CATEGORY_META` |
| `hooks/useNeighborhoodAnalysis.ts` | Data hook with mock fallback (`LIVE_NEIGHBORHOOD_HOOKS = false`) |
| `components/ClientLifestyleScreen.tsx` | Tile selection + address autocomplete (fullScreenModal) |
| `components/NeighborhoodMatchScreen.tsx` | Animated score ring + priority bars + nearby POIs (fullScreenModal) |
| `components/AddressComparisonScreen.tsx` | Two-phase comparison screen — address inputs → ranked results (fullScreenModal, S56) |
| `components/CategoryMapScreen.tsx` | Full-screen map with address + POI pins (fullScreenModal) |

### Feature Flag
```typescript
// In hooks/useNeighborhoodAnalysis.ts (NOT in lib/featureFlags.ts)
const LIVE_NEIGHBORHOOD_HOOKS = false; // false = mock data, true = live APIs (S50)
```

### Navigation Flow
HomeTabAgent → "Client Tools" section → "Neighborhood Match" card → ClientLifestyleScreen (fullScreenModal) → NeighborhoodMatchScreen (fullScreenModal, slide_from_bottom) → "Compare Addresses" CTA → AddressComparisonScreen (fullScreenModal) → CategoryMapScreen (fullScreenModal)

### Entry Point
Both `HomeTabAgent.tsx` and `HomeTabAgentFilled.tsx` have a "Client Tools" section with a `ClientToolCard` component between Closing Squad and Quick Actions sections.

### 9 Lifestyle Categories
`coffee`, `yoga`, `parks`, `walkability`, `gym`, `grocery`, `transit`, `bike`, `air_quality`

### Backend APIs (scheduled S50)
- Walk Score API — walkability, transit, bike scores
- Google Places Nearby (New) — POI search per category (800m radius)
- Google Places Autocomplete (New) — address input
- EPA AirNow — air quality index → score mapping
- All mock data in `hooks/useNeighborhoodAnalysis.ts` with `@demo` markers

### Dependencies
- `react-native-maps` — added S48 for CategoryMapScreen
- `expo-haptics` — tile long-press feedback

---

## Supabase Schema Reference
- 18 tables, 15 enums, 50+ RLS policies, 37 indexes, 9 triggers, 33 RPCs
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
- `RANK_BADGE_COLORS = ['#F59E0B', '#9CA3AF', '#B45309']` (local constants in AddressComparisonScreen.tsx — @tokens: add rankGold/rankSilver/rankBronze to tokens.ts in cleanup session)
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
