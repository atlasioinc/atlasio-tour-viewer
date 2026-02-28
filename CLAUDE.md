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
