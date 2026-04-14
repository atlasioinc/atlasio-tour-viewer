# Atlasio — React Native Real Estate Marketplace

## Tech Stack
- React Native 0.81.5 + Expo SDK 54
- React Navigation 7 (native-stack + bottom-tabs)
- TanStack Query v5 (configured in lib/queryClient.ts)
- Supabase (client in lib/supabase.ts, schema deployed) — Project ID: `fqeighzlnreghzmailgx`
- TypeScript 5.9
- Design tokens in lib/tokens.ts
- Stripe Connect (contractor payments)

## Commands
- `npx expo start` — Start dev server
- `npx expo start --clear` — Start with cleared Metro cache (use after any flag change)
- `npx tsc --noEmit` — TypeScript check (**run after EVERY file change, hard gate**)
- `npx expo lint` — Lint check
- `supabase functions deploy <n> --no-verify-jwt` — Deploy Edge Function

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

## Current Metrics (updated S147 — April 14, 2026)
- **RPCs:** 66
- **Hooks:** 65
- **Feature Flags:** 11 (9 in featureFlags.ts + PARTNER_TRACK_ENABLED + DEAL_CREATION_ENABLED in config.ts)
- **Edge Functions:** 11
- **Storage Buckets:** 7
- **Shared Components (components/shared/):** Avatar (S145b), VerificationBadge, VerificationBanner, SkeletonBlock, ErrorToast, AddressAutocompleteInput (S144), PhotoLightbox (S147)
- **tsc:** 0 errors

When adding new RPCs, hooks, or Edge Functions — increment the count in this file and in the session commit message.

---

## Feature Flags (lib/featureFlags.ts) — Demo Defaults
```typescript
USE_MOCK_DATA: true            // true = demo mode, false = live Supabase
LIVE_ONBOARDING: false         // false for all demos
LIVE_CONTRACTOR_HOOKS: true    // flipped true in S36, permanent
LIVE_VERIFICATION_HOOKS: false
LIVE_INSURANCE_HOOKS: false    // flip true only for live insurance testing
DEV_BYPASS_AUTH: true          // true = loads agent demo user, bypasses login
DEV_SHOW_PASSWORD_LOGIN: false // true = shows password input for device testing
LIVE_SQUAD_SHARE: false
LIVE_NEIGHBORHOOD_HOOKS: false  // false = mock data, true = Walk Score + Places + AirNow APIs (S56+)
PARTNER_TRACK_ENABLED: false    // in lib/config.ts — false until partner onboarding live (S62)
DEAL_CREATION_ENABLED: false    // in lib/config.ts — false until deal creation ready (S79)
```

**Flag workflow:**
- Flip flags to true for live testing
- Reset to demo defaults above before every commit and investor demo
- Never commit with flags true unless intentional and documented
- After any flag change: `npx expo start --clear` + force-close app on device
- All new feature flags default to false until explicitly tested
- When adding a new flag: add to `lib/featureFlags.ts` + add to the Feature Flags list in this file + document purpose in inline comment

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

**To sign in as contractor for device testing, set these flags:**
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
- `ContractorProfileTab.tsx` — DELETED in S44 (merged into ProfileTab)
- `isOwnProfile` boolean gates control layer (Z6 Stats, Z7 Controls)

### Bottom Sheet Animation Pattern (use consistently)
All bottom sheets use this exact spring pattern:
- `animationType="none"` on Modal
- Backdrop: `Animated.View`, opacity 0→0.5, 300ms, `Easing.out(Easing.ease)`
- Sheet: spring translateY, `damping: 24`, `stiffness: 220`
- Close: reverse both animations, set visible=false in callback
- `useSafeAreaInsets()` for `paddingBottom: insets.bottom + 16`
- Examples: `SquadSlotPicker`, `ConnectionRequests`, `EarningsInsights`, `VouchesBottomSheet`

### Navigation Params
- Always pass IDs not objects: `{ profileId: string }`, `{ jobId: string }`
- Cross-stack: `CommonActions.navigate({ name, params: { screen, params } })`
- **Use `navigation.push()` not `navigation.navigate()`** when navigating to screens that use route params — `navigate` reuses the cached screen with stale params, `push` always creates a fresh instance
- Route params are not guaranteed to update on re-navigation — always push fresh
- `InsuranceUpload` fullScreenModal: navigate back with `navigation.navigate('ProfileMain')`, NOT `navigation.getParent()?.goBack()`

### Stack Structure
- `HomeStack`: HomeMain → RepairJobDetails → ProProfile → PostJobWizard → PostPhotoJobScreen → PostStagingJobScreen → SendSquad → ClientLifestyleScreen → NeighborhoodMatchScreen → CategoryMapScreen
- `ProfileStack`: ProfileMain → EditProfile → Settings → Verification → PhoneVerification → InsuranceUpload (fullScreenModal)
- `ContractorHomeStack`: Home → ContractorJobDetails → BidSubmission (modal) → JobCompletion (modal)
- `ContractorJobsStack`: JobTrackerTab → ContractorJobDetails → BidSubmission
- `BottomTabNavigator`: Agent = 5 tabs, Contractor = 3 tabs

---

## Supabase Schema
- 18 tables, 15 enums, 50+ RLS policies, 37 indexes, 9 triggers, 33 RPCs
- Revenue: graduated fees (0% first 3 jobs → 5% months 4–9 → 10% standard)
- Job types: repair, photography, staging (unified `jobs` table)
- **`sql/schema.sql` is the single source of truth for all Supabase queries**
- ALWAYS cross-reference schema.sql before writing any query or RPC call
- Match column names, types, and RPC parameter names EXACTLY
- **`profiles` table uses `name` (single TEXT column) — NOT `full_name`, `first_name`, or `last_name`**
- **NEVER use `GENERATED ALWAYS AS` on the `profiles` table** — causes 42P17 infinite recursion. Use a BEFORE INSERT OR UPDATE trigger instead (learned S46, confirmed S49)

### Key Business Rules
- Agents post jobs; contractors/photographers/stagers bid
- "Invite to Job" CTA for job-eligible roles (Contractor, Home Stager, Real Estate Photographer)
- "Message" + "Request to Connect" for partner roles
- Contractors CANNOT see other contractors' profiles or bids (RLS enforced)
- Connection required for messaging

### Files — Modify With Caution
- `BottomTabNavigator.tsx` — complex tab hiding logic
- `types/index.ts` — shared across all screens, changes cascade everywhere
- `lib/tokens.ts` — design system source of truth

---

## SQL Workflow (CRITICAL — never skip)
0. **Run `/guard` before any SQL session** — activates `/careful` (warns before DROP TABLE, supabase db push, force-push) + `/freeze` (locks edits to the target SQL file only). This is the outermost safety layer for all schema and RPC work.
1. **All SQL reviewed in Claude Chat first** — Claude Chat reviews every SQL statement before Tony executes it
2. **Tony executes manually in Supabase SQL Editor** — never via CLI
3. **Never run `supabase db push`** or any CLI database commands
4. **Schema-first verification** — before writing any query or RPC call:
   - Open `sql/schema.sql`
   - Find the exact table/RPC definition
   - Verify column names, types, nullable fields, and parameter names
   - Copy parameter names exactly — don't guess or abbreviate
   - Use `p_` prefix for RPC parameters (matches schema convention)
   - Check RLS policies to understand who can read/write what
5. **Output SQL as a code block** for Tony to review and execute — never execute directly
6. **After any schema change is executed** — update `sql/schema.sql` to reflect the deployed state. The file must always match what is live in Supabase. Never leave schema.sql behind the live database.

---

## Edge Function Rules
- All Edge Functions live in `supabase/functions/<n>/index.ts`
- Deno-compatible syntax only — no Node.js APIs
- Always deploy with `--no-verify-jwt`: `supabase functions deploy <n> --no-verify-jwt`
- CORS headers required on every function — match the `send-squad-email` pattern
- **Service role vs user client split (critical):**
  - Use admin client (service role key) for storage operations — bypasses RLS
  - Use user client (Authorization header from request) for RPC calls — preserves `auth.uid()` context
  - Never use service role key for RPCs that rely on `auth.uid()` internally
- Secrets available in all Edge Functions: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (already set)
- `expo-file-system/legacy` — correct import path for `readAsStringAsync` in Expo SDK 54 (NOT `expo-file-system`)

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

## Known Type Gaps (access via `as any` — do not add to Profile interface without a dedicated cleanup session)
The `Profile` TypeScript interface in `types/index.ts` is missing these fields that exist in Supabase. They are accessed via `(profile as any)?.field` throughout the codebase. Changes to the interface cascade everywhere.
- `insurance_status` — TEXT, default 'none'
- `insurance_doc_url` — TEXT, nullable
- `insurance_doc_name` — TEXT, nullable (added S54)
- `insurance_expiry` — TEXT, nullable (added S54, format MM/YYYY)

---

## Insurance Upload Flow (established S54)
- **Entry point:** ProfileTab → Insurance row → `InsuranceUploadScreen` (fullScreenModal)
- **Flow:** `InsuranceUploadScreen` → read file as base64 (`expo-file-system/legacy`) → invoke `upload-insurance-document` Edge Function → `credentials` bucket + `rpc_upload_insurance_document`
- **NOT in:** `VerificationScreen` (insurance section removed S54)
- **Pending state:** ProfileTab passes `{ status: 'pending_review', documentName }` via `navigation.push` → `InsuranceUploadScreen` renders `openedAsPending` view
- **RPC:** `rpc_upload_insurance_document(p_document_url, p_expiry_month, p_expiry_year, p_doc_name DEFAULT NULL)`
- **Known issue resolved:** 42P17 StorageApiError on direct client-side upload — permanently resolved via Edge Function bypass. **Do NOT attempt to revert to direct client-side upload.**

---

## Workflow Rules

### 1. Plan Mode Default
Enter plan mode (Shift+Tab twice) for ANY task that touches 3+ files or involves architectural decisions.
- Write the plan BEFORE touching any code
- Write detailed specs upfront to reduce ambiguity
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
- Treat type errors as blockers, not warnings

### 4. Backend Wiring Pattern (CRITICAL)
When wiring hooks from mock → live Supabase:
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
        return MOCK_JOB; // fallback preserves demo app
      }
    },
  });
};
```
**Rules:**
- ALWAYS keep mock data as fallback — the demo app must never break
- NEVER delete mock data files until explicit cleanup session
- Mark hook status in comments: `// STATUS: mock | wired | tested`
- Cross-reference `sql/schema.sql` for exact column names and RPC signatures
- Use `p_` prefix for RPC parameters (matches schema convention)

### 5. Schema-First Verification
Before writing ANY Supabase query or RPC call:
1. Open `sql/schema.sql`
2. Find the exact table/RPC definition
3. Verify column names, types, nullable fields, and parameter names
4. Copy parameter names exactly — don't guess or abbreviate
5. Check RLS policies to understand who can read/write what

### 6. Self-Improvement Loop
After ANY correction from the user → update `tasks/lessons.md` with:
- What went wrong
- Pattern to prevent recurrence
- The rule to follow going forward

Review `tasks/lessons.md` at the start of every session.

### 7. Verification Before Done
- Never mark a task complete without proving it works
- Minimum proof: `npx tsc --noEmit` passes cleanly
- For hooks: verify the query shape matches the schema
- For mutations: verify invalidation keys match the query keys they should refresh
- Ask: "Would a staff engineer approve this PR?"

### 8. Simplicity Over Elegance
- During hook wiring: prioritize correctness and speed over cleverness
- Don't over-engineer a `useAcceptBid()` — it's a simple RPC call
- Save architectural elegance for design decisions, not plumbing
- If a fix feels hacky for a non-trivial problem: pause and find the clean solution
- For simple, obvious changes: just do them and move on

### 9. Autonomous Bug Fixing
- When given a bug report or error: diagnose and fix it — don't ask for hand-holding
- Read the error, check the logs, trace the root cause, resolve it
- Zero context-switching required from the user
- Fix failing TypeScript errors without being told how

### 10. Minimal Blast Radius
- Changes should only touch what's necessary
- No drive-by refactors unless explicitly requested
- Find root causes — no temporary fixes or band-aids
- If a change requires modifying 5+ files, re-plan first

### 11. Flag Scope Expansions
- "Flag scope expansions before executing. If a task can be completed more thoroughly than planned, confirm before exceeding the original scope."
- Never expand scope without user approval

### 12. gstack Review Gate (MANDATORY)
- Run `/review` before every commit — catches production bugs that pass `tsc` but break at runtime
- Run `/investigate` instead of ad-hoc debugging — traces root cause before touching any code; auto-freezes scope to the module under investigation
- Run `/guard` before any session touching SQL, Edge Functions, or Supabase schema
- Run `/careful` before any destructive terminal command (rm -rf, git reset --hard, supabase db push — the last of which is permanently prohibited regardless)
- Run `/qa` before every TestFlight build — browser-based click-through regression check

---

## Task Tracking

### In Claude Code (local)
- `tasks/lessons.md` — Self-improvement log (persists across sessions)
- Git commits — Descriptive messages with what was wired/changed

### In Notion (updated via Claude Chat after each session)
- Backend Build Log — session-by-session log
- Hook Wiring Tracker — every hook's status (mock → wired → tested)
- Backend Deployment Tracker — what's live on Supabase
- Backend Integration Guide Scorecard — tier-by-tier progress

**Do NOT duplicate Notion tracking in local files.** Use `tasks/lessons.md` for Claude Code's learning memory only. All progress tracking lives in Notion.

---

## Session Protocol

### Starting a Session
1. Create a feature branch: `backend/session-N-description`
2. Review `tasks/lessons.md` for relevant past learnings
3. If this is a debugging/bug-fix session → run `/investigate` first; do NOT touch code before root cause is confirmed
4. If this session touches SQL or Edge Functions → run `/guard` before writing any queries
5. Enter plan mode — outline what you'll build this session
6. Get user approval on the plan before writing code
7. **If building new UI** — identify the closest existing screen as a pattern reference (see Pattern Reference section under Design System Rules) and read it before writing any code

### During a Session
- One tier or feature focus per session
- Run `npx tsc --noEmit` after every file change
- Commit at logical checkpoints (not just at the end)
- If you hit a blocker → document it → move to next task → come back

### Ending a Session
1. Run `/review` — fix all flagged issues before proceeding
2. Run final `npx tsc --noEmit` — must pass clean
3. Run `npx expo lint` — fix any issues
4. Create descriptive commit with summary of all changes
5. Update `ATLASIO_CONTEXT.md`:
   - Add S[N] entry to cumulative progress list (files created/modified, key decisions)
   - Update screen count if new screens were added
   - Update hooks count if new hooks were added
   - Update feature flags list if new flags were added
   - Update S[N+1] next objectives section
   - Do NOT change any other sections
6. Update `sql/schema.sql` if any schema changes were made:
   - New table, column, RPC, trigger, or index added → update schema.sql to match
   - The file must always reflect what is actually deployed in Supabase
   - Never leave schema.sql behind the live database
7. Run `git push origin main`
8. Output a session summary for the user to paste into Claude Chat:
   - Hooks wired (list each, old status → new status)
   - Types updated
   - Files modified
   - Blockers hit
   - Next session priorities

The user will then run "Log session" in Claude Chat to update all Notion docs.

---

## Design System Rules (non-negotiable — established S41–S44)

### Typography
- Minimum `fontSize: 14` for ALL regular body text — no exceptions
- `COLORS.lightText` only permitted on `fontSize: 14+`
- At `fontSize: 12`, use `COLORS.secondaryText` instead

**Common text patterns — use these exactly, do not invent new ones:**
```tsx
// Screen/modal title (header)
fontSize: 17, fontWeight: '600', color: COLORS.darkText

// Section header (uppercase label above a group of content)
fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12

// Input field label (above a TextInput — match PostPhotoJobScreen exactly)
fontSize: 14, fontWeight: '600', color: COLORS.darkText,
lineHeight: 20, marginBottom: 8, marginTop: 20

// Body / card content
fontSize: 15, fontWeight: '400', color: COLORS.darkText

// Secondary / supporting text
fontSize: 14, fontWeight: '400', color: COLORS.secondaryText

// Placeholder text
placeholderTextColor: COLORS.bodyText

// Badge / pill text
fontSize: 12, fontWeight: '500', color: COLORS.bodyText
```

**Intentional exceptions (12pt):** trade pills, card timestamps, urgency pills, compact badge text, `textTransform: 'uppercase'` section labels — all must use `COLORS.secondaryText`

### Layout Dimensions
- Header height: 48px
- Header border: `borderBottomWidth: 0.68`, `borderBottomColor: COLORS.border`
- Cards: `borderRadius: 14`, `borderWidth: 0.68`, `borderColor: COLORS.cardBorder`
- Pills/avatars: `borderRadius: 9999`
- Header borders: `COLORS.border` (`#E5E7EB`) — NEVER black

### Spacing Rhythm (established S35 — use consistently)
- **4px gap** — grouped elements (label→value, title→address, budget label→price)
- **12px gap** — non-grouped elements within a card
- **16px** — horizontal padding on all screens (`paddingHorizontal: 16`)
- **20px / 24px** — section top spacing (`marginTop: 24` between form sections)
- Padding directly on `Pressable` — never add an inner `View` wrapper for padding

### Sticky CTA Pattern (use on all forms and job posting screens)
Match `PostPhotoJobScreen.tsx` exactly:
```tsx
// Sticky submit button — always outside KeyboardAvoidingView
<View style={{
  position: 'absolute', bottom: 0, left: 0, right: 0,
  paddingHorizontal: 16,
  paddingVertical: 16,
  paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16,
  backgroundColor: COLORS.background,
  borderTopWidth: 0.69, borderTopColor: COLORS.border,
}}>
  <Pressable ...>
```
- CTA lives OUTSIDE `KeyboardAvoidingView` — never inside it (causes white block above keyboard)
- `KeyboardAvoidingView` wraps `ScrollView` only
- `ScrollView` needs `contentContainerStyle={{ paddingBottom: 120 }}` minimum to clear CTA

### fullScreenModal Header Pattern (required for all modals)
3-element row: `[44px spacer][Title flex:1 textAlign:center][44px X button]`
- Title centered via `flex:1, textAlign:'center'`
- Dismiss: X icon button (not back chevron) for all modals
- `SafeAreaView` backgroundColor: `COLORS.background` — prevents gray status bar bleed on device

### Icon Touch Targets (App Store compliance)
- All SVG icons: `width={24} height={24}`
- ALL interactive icon Pressables: `width: 44, height: 44, alignItems: 'center', justifyContent: 'center'`
- NEVER use `hitSlop` as a touch target substitute — it expands tap area invisibly without fixing layout
- Exceptions: tab bar icons, Button component variants, logo SVGs

### Tokens (always import from lib/tokens.ts — never local COLORS)
- `COLORS.backgroundInfo = '#EFF6FF'` (added S38)
- `COLORS.warningAmber = '#D97706'` (added S43)
- `COLORS.counterAmber = '#D97706'` (same value, different semantic)
- All hex values must trace back to a named token — no inline hex

---

### Pattern Reference (read before building any new screen or flow)
Before writing a single line of code on any new screen or flow:
- **Input forms:** Read `PostPhotoJobScreen.tsx` — input labels, TextInput styles, button patterns, KeyboardAvoidingView, section headers
- **Multi-step forms:** Read `PostJobWizard.tsx` — step progression, validation, form state
- **Detail screens:** Read `RepairJobDetails.tsx` — header pattern, section layout, card styles, sticky CTAs
- **Modal screens:** Read `VerificationScreen.tsx` — fullScreenModal header, SafeAreaView, dismiss pattern
- **List/feed screens:** Read `HomeTabAgentFilled.tsx` — section headers, card rows, scroll layout
- Do NOT rely on memory for spacing, font sizes, or token names — read the reference file first
- Match the existing pattern exactly before introducing any new style

---

## Shared Components (always reuse — never recreate inline)

Barrel export at `components/shared/index.ts`:
- `Avatar` — standardized initials + image avatar (S145b)
- `VerificationBadge` — 3 states, 2 sizes
- `VerificationBanner` — amber, role/level-aware, returns null if verified
- `SkeletonBlock` — loading placeholder
- `ErrorToast` — error surfacing component
- `AddressAutocompleteInput` — Google Places autocomplete (S144)
- `PhotoLightbox` — full-screen paged photo viewer (S147), used by RepairJobDetails + ContractorJobDetails

Additional shared components still at `components/*.tsx` (not yet migrated into `components/shared/`):
- `Button` — 6 variants: Primary, Secondary, Danger, Counter + 2 more (`components/Button.tsx`)
- `ScreenHeader` (`components/ScreenHeader.tsx`)
- `DisplayTag` — 6 variants including ghost (`components/DisplayTag.tsx`)
- `PortfolioGallery` (`components/PortfolioGallery.tsx`)

---

## @demo and @backend Markers (required in every file)

Every piece of mock data must have:
```tsx
// @demo hardcoded — replace with real data in production
// @backend rpc_name — params: { p_param: value }
```

Every live data point must have the RPC name and exact params.
This is the handoff contract for future engineers.

---

## Session Prompt Requirements (include in EVERY Claude Code prompt)
1. File headers (what/who/where in nav)
2. Role branching comments (why + business rule)
3. `@backend` markers (RPC name + params)
4. `@demo` markers (what to replace with)
5. Descriptive naming (`handleTradeSelection` not `handleNext`)
6. State flow comment block above main component
7. Section dividers in long files
8. "Flag scope expansions before executing. If a task can be completed more thoroughly than planned, confirm before exceeding the original scope."
9. "Read all relevant files before writing a single line of code. Produce a plan and wait for approval before executing."

---

## Verification Checklist (before marking any session complete)
- `/review` passed — all flagged issues resolved
- `npx tsc --noEmit` → 0 errors
- Shared components reused (not recreated inline)
- No local COLORS objects — all tokens from `lib/tokens.ts`
- No inline hex values
- All interactive icons have 44×44 Pressable touch targets
- All regular text ≥ 14pt fontSize
- `@demo` markers on all mock data
- `@backend` markers on all live data points
- Feature flags reset to demo defaults
- Both role visual checks passed (switch userRole, verify render)
- App.tsx returned to default userRole='Agent' after testing

---

## gstack

Use `/browse` from gstack for all web browsing. Never use `mcp__claude-in-chrome__*` tools.

If skills stop working, run: `cd .claude/skills/gstack && ./setup`

### Available Skills

| Skill | Role | When to use in Atlasio |
|---|---|---|
| `/office-hours` | YC Office Hours | Reframe a feature before building — challenges your premise |
| `/plan-ceo-review` | CEO/Founder | Scope review on any feature proposal |
| `/plan-eng-review` | Eng Manager | Architecture, data flow, edge cases before implementation |
| `/plan-design-review` | Senior Designer | Design audit (0–10 per dimension) on any screen |
| `/design-consultation` | Design Partner | Full design system work |
| `/review` | Staff Engineer | **Run before every commit** — finds production bugs tsc misses |
| `/investigate` | Debugger | **Run instead of ad-hoc debugging** — root cause first, auto-freezes scope |
| `/qa` | QA Lead | **Run before every TestFlight build** — real browser click-through |
| `/qa-only` | QA Reporter | Bug report only, no code changes |
| `/design-review` | Designer Who Codes | Design audit + fixes with atomic commits |
| `/ship` | Release Engineer | Sync main, run tests, push, open PR |
| `/browse` | QA Engineer | Real Chromium browser for manual testing |
| `/setup-browser-cookies` | Session Manager | Import real browser session for authenticated QA |
| `/document-release` | Technical Writer | Update docs after shipping (README, ARCHITECTURE, etc.) |
| `/retro` | Eng Manager | Weekly dev stats — commits, lines added, test health |
| `/codex` | Second Opinion | OpenAI independent review of any diff |
| `/careful` | Safety Guardrails | Warns before destructive commands (rm -rf, DROP TABLE, force-push) |
| `/freeze` | Edit Lock | Locks edits to one directory — use while debugging |
| `/guard` | Full Safety | `/careful` + `/freeze` combined — **required for all SQL/Edge Function work** |
| `/unfreeze` | Unlock | Remove freeze boundary |
| `/gstack-upgrade` | Self-Updater | Upgrade gstack to latest version |

### Atlasio-Specific Rules (non-negotiable)

- **`/guard` is required before any SQL session** — activates careful + freeze; prevents accidental schema changes outside the target file
- **`/review` before every commit** — this is now part of the Verification Checklist and Ending a Session protocol
- **`/investigate` for all debugging** — never start touching code before root cause is confirmed; auto-freezes to the module under investigation
- **`/qa` before every TestFlight build** — catches regressions before the build goes to device
- **`/careful` permanently blocks in this project (regardless of gstack):** `supabase db push`, `DROP TABLE`, `rm -rf`, force-push
- **SQL workflow unchanged** — gstack adds a safety layer but does not replace it: all SQL reviewed in Claude Chat first, Tony executes manually in Supabase SQL Editor, never via CLI
- **Mock data is never deleted** — `/review` and `/qa` must not flag missing mock fallbacks as issues; they are intentional
