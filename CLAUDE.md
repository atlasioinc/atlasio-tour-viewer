# Atlasio — React Native Real Estate Marketplace

## Tech Stack
- React Native 0.81.5 + Expo SDK 54
- React Navigation 7 (native-stack + bottom-tabs)
- TanStack Query (configured in lib/queryClient.ts)
- Supabase (client in lib/supabase.ts, schema deployed)
- TypeScript 5.9
- Design tokens in lib/tokens.ts

## Commands
- `npx expo start` — Start dev server
- `npx tsc --noEmit` — TypeScript check (**run after EVERY file change, hard gate**)
- `npx expo lint` — Lint check

## Folder Structure
```
/app
  /components     — all screen .tsx files + shared components
  /types          — types/index.ts (single source of truth for all interfaces)
  /hooks          — useData.ts (all TanStack Query hooks), useDebounce.ts
  /lib            — supabase.ts, queryClient.ts, tokens.ts
  /sql            — schema.sql (deployed to Supabase, NOT bundled in app)
  /tasks          — lessons.md (Claude Code self-improvement log)
```

## Architecture Rules
- Nav params use IDs not objects: `{ profileId: string }`, `{ jobId: string }`
- Screens fetch fresh data via TanStack Query hooks in hooks/useData.ts
- All entity interfaces live in types/index.ts — single source of truth
- Design tokens live in lib/tokens.ts (COLORS, BORDERS, ANIMATIONS, etc.)
- Header borders: `#E5E7EB` (COLORS.border) — NEVER black
- Cards: 14px border-radius, 0.68px border #F3F4F6
- Pills/avatars: borderRadius 9999

## Supabase Schema (deployed Feb 28, 2026)
- 18 tables, 15 enums, 50 RLS policies, 36 indexes, 9 triggers, 15 RPCs
- Revenue: graduated fees (0% first 3 jobs → 5% months 4-9 → 10% standard)
- Job types: repair, photography, staging (unified `jobs` table)
- **sql/schema.sql is the single source of truth for all Supabase queries**
- ALWAYS cross-reference schema.sql before writing any query or RPC call
- Match column names, types, and RPC parameter names EXACTLY

## Key Business Rules
- Agents post jobs; contractors/photographers/stagers bid
- "Invite to Job" CTA for job-eligible roles (Contractor, Home Stager, Real Estate Photographer)
- "Message" + "Request to Connect" for partner roles
- Contractors CANNOT see other contractors' profiles or bids (RLS enforced)
- Connection required for messaging

## Files — Modify With Caution
- `BottomTabNavigator.tsx` — complex tab hiding logic
- `types/index.ts` — shared across all screens, changes cascade everywhere
- `lib/tokens.ts` — design system source of truth

---

## Workflow Rules

### 1. Plan Mode Default
Enter plan mode (Shift+Tab twice) for ANY task that touches 3+ files or involves architectural decisions.
- Write the plan BEFORE touching any code
- If something goes sideways mid-implementation → STOP → re-plan → don't push through
- Use plan mode for verification strategy too, not just building
- Write detailed specs upfront to reduce ambiguity

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
- Cross-reference sql/schema.sql for exact column names and RPC signatures
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

**Do NOT duplicate Notion tracking in local files.** Use `tasks/lessons.md` for
Claude Code's learning memory only. All progress tracking lives in Notion.

---

## Session Protocol

### Starting a Session
1. Create a feature branch: `backend/session-N-description`
2. Review `tasks/lessons.md` for relevant past learnings
3. Enter plan mode — outline what you'll build this session
4. Get user approval on the plan before writing code

### During a Session
- One tier or feature focus per session
- Run `npx tsc --noEmit` after every file change
- Commit at logical checkpoints (not just at the end)
- If you hit a blocker → document it → move to next task → come back

### Ending a Session
1. Run final `npx tsc --noEmit` — must pass clean
2. Run `npx expo lint` — fix any issues
3. Create descriptive commit with summary of all changes
4. Output a session summary for the user to paste into Claude Chat:
   - Hooks wired (list each, old status → new status)
   - Types updated
   - Files modified
   - Blockers hit
   - Next session priorities

The user will then run "Log b-e session" in Claude Chat to update all Notion docs.

## Design System Rules (non-negotiable — added S41-S44)

### Typography
- Minimum fontSize 14pt for ALL regular text — no exceptions
- Exception: `textTransform: 'uppercase'` section headers may use fontSize 12
- `COLORS.lightText` only permitted on fontSize 14+
- At fontSize 12, use `COLORS.secondaryText` instead
- Section header pattern (use exactly):
  ```tsx
  fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12
  ```

### Icon Touch Targets (App Store compliance)
- All SVG icons: width={24} height={24}
- ALL interactive icon Pressables: width: 44, height: 44,
  alignItems: 'center', justifyContent: 'center'
- NEVER use hitSlop as a touch target substitute — it expands
  tap area invisibly without fixing layout
- Exceptions: tab bar icons, Button component variants, logo SVGs

### Tokens (always import from lib/tokens.ts — never local COLORS)
- COLORS.backgroundInfo = '#EFF6FF' (added S38)
- COLORS.warningAmber = '#D97706' (added S43)
- COLORS.counterAmber = '#D97706' (same value, different semantic)
- All hex values must trace back to a named token — no inline hex

---

## Shared Components (always reuse — never recreate inline)
Located in components/shared/index.ts (barrel export)
- Button — 6 variants: Primary, Secondary, Danger, Counter + 2 more
- ScreenHeader
- DisplayTag — 6 variants including ghost (use for unverified/empty CTAs)
- VerificationBadge — 3 states, 2 sizes
- VerificationBanner — amber, role/level-aware, returns null if verified
- PortfolioGallery — reuse unchanged, never rebuild inline

---

## Feature Flags (lib/featureFlags.ts)
- USE_MOCK_DATA: true → demo mode. false → live Supabase
- LIVE_ONBOARDING: false for demos, true for live testing
- LIVE_CONTRACTOR_HOOKS: true (flipped S36)
- All new feature flags default to false until explicitly tested

Demo mode rule: Flip flags to true for live testing, back to false
before investor demos. Never commit with flags true unless intentional.

---

## Architecture Rules (hard constraints)

### Single-Value Principle
Data flowing across screens must always be in its final
backend-ready format at the point of entry. No translation layers,
mapping functions, or intermediate values requiring downstream
conversion. UI-only groupings stay as local UI logic only.

### One Layout Tree Per Screen
Role-conditional content lives WITHIN zones of a single layout tree.
Never create separate layout trees or separate files per role.
ProfileTab.tsx handles agent | contractor | partner via role-conditional
zone content — not separate components.

### Profile Architecture (established S43-S44)
- ProfileTab.tsx — own profile view for ALL roles (agent/contractor/partner)
- ProProfile.tsx — public view for ALL roles
- ContractorProfileTab.tsx — DELETED in S44 (merged into ProfileTab)
- isOwnProfile boolean gates control layer (Z6 Stats, Z7 Controls)

### Bottom Sheet Animation Pattern (use consistently)
All bottom sheets use this exact spring pattern:
- animationType="none" on Modal
- Backdrop: Animated.View, opacity 0→0.5, 300ms, Easing.out(Easing.ease)
- Sheet: spring translateY, damping: 24, stiffness: 220
- Close: reverse both animations, set visible=false in callback
- useSafeAreaInsets() for paddingBottom: insets.bottom + 16
Examples: SquadSlotPicker, ConnectionRequests, EarningsInsights,
VouchesBottomSheet

### Navigation Params
- Always pass IDs not objects: { profileId: string }, { jobId: string }
- Cross-stack: CommonActions.navigate({ name, params: { screen, params } })
- ProfileStack: ProfileMain → EditProfile → Settings
- ContractorHomeStack: Home → ContractorJobDetails → BidSubmission (modal)
  → JobCompletion (modal)
- ContractorJobsStack: JobTrackerTab → ContractorJobDetails → BidSubmission
- BottomTabNavigator: Agent = 5 tabs, Contractor = 3 tabs

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
3. @backend markers (RPC name + params)
4. @demo markers (what to replace with)
5. Descriptive naming (handleTradeSelection not handleNext)
6. State flow comment block above main component
7. Section dividers in long files
8. "Flag scope expansions before executing. If a task can be
   completed more thoroughly than planned, confirm before
   exceeding the original scope."
9. "Read all relevant files before writing a single line of code.
   Produce a plan and wait for approval before executing."

---

## Verification Checklist (before marking any session complete)
- npx tsc --noEmit → 0 errors
- Shared components reused (not recreated inline)
- No local COLORS objects — all tokens from lib/tokens.ts
- No inline hex values
- All interactive icons have 44×44 Pressable touch targets
- All regular text ≥ 14pt fontSize
- @demo markers on all mock data
- @backend markers on all live data points
- Both role visual checks passed (switch userRole, verify render)
- App.tsx returned to default userRole='Agent' after testing
