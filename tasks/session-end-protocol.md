# Session End Protocol
# tasks/session-end-protocol.md
# Read and execute automatically at the end of every build or fix session.
# Do not skip any step. Do not abbreviate. Run before the final commit.

---

## When to run
At the end of every Claude Code session, before the final commit, when the
user says "Log session" OR when all session tickets are closed and gates pass.

## Step 0 — Run /review
Run `/review` on all files modified this session before starting the protocol.
Fix any issues surfaced. Re-run `npx tsc --noEmit` and `npx expo lint` after.
Both must be clean before proceeding.

---

## Step 1 — Update `tasks/lessons.md`
If any permanent rules, architecture decisions, or hard-won debugging lessons
were established this session, add them now.

Format:
## RULE — <topic> (added S[N], <date>)
- Rule statement. Specific. Actionable. Written for a new engineer at handoff.

Or for session-specific learnings:
### S[N] — <topic>
- Bullet point learnings

Only add entries if something genuinely new was learned. Do not pad.

---

## Step 2 — Update `tasks/screen-registry.md`
For every screen touched this session:
- New screen → add full entry (file, role, nav type, entry/exit points, wiring status, data source)
- Modified screen → update wiring status, data source, notes
- Deleted/merged screen → remove entry

Wiring status values: ✅ Live | 🟡 Partial | 🔴 Mock | 🔵 Static

---

## Step 3 — Update or create `tasks/component-inventory.md`
If the file does not exist, create it with this header:
# Component Inventory
# Last updated: S[N] — [date]
# Source of truth for shared components. Import always from components/shared/index.ts.

For every shared component added or modified this session:
## [ComponentName]
- File: components/[ComponentName].tsx
- Exported from: components/shared/index.ts
- Variants: [list variants]
- Props: [key props]
- Last modified: S[N]
- Notes: [any usage constraints]

---

## Step 4 — Update `ATLASIO_CONTEXT.md`
Add a session entry block:
## S[N] — [date]
**Tickets:** [comma-separated ticket IDs]
**Files modified:** [list]
**Key decisions:** [bullet points — architecture choices, deferred items, flags]
**SQL deployed:** [RPC names + what changed, or "none"]
**Metrics:** RPCs [old]→[new] | Hooks [old]→[new] | Edge Functions [old]→[new]
**Next session priorities:** [ordered list]

Update the metrics line at the top of the file to reflect new totals.
Update the Active Sprint and On The Horizon sections if anything changed.

---

## Step 5 — Write `tasks/next-session-context.md`
Overwrite the file completely. This is the primary handoff document.
Claude Chat reads this at the start of every new session for the reconcile check.

Use this exact structure:

# Next Session Context
# Generated: S[N] end-of-session — [date]
# Read by: Claude Chat at S[N+1] session start for state reconcile

---

## Build state
- RPCs: [N]
- Hooks: [N]
- Edge Functions: [N]
- tsc: 0 | Lint: 0 new
- Last build: Build [N] ([status])

## Active branches
- [branch name] @ [commit hash] — [status]

## QA items pending
- [ ] [item] — [branch it validates]

## S[N+1] priorities (in order)
1. [Highest priority — ticket ID + one line description]

## Open flags / known gaps
- [Any @demo TODO items needing follow-up]
- [Any deferred items called out this session]

## SQL deployed this session
- [RPC name] — [what changed, or "none"]

## Metrics to reconcile
RPCs: [N] | Hooks: [N] | Edge Functions: [N]
(Claude Chat: cross-check these against Notion Live Build State at session start)

## Notion pages to fetch at session start
- Start New Session: 328e6d90-cf26-8157-aa05-ead5f497d4ab
- Live Build State v2: 357e6d90-cf26-814c-ac6d-c6baa911fc2a
- Phase 1 Launch Readiness: 358e6d90-cf26-818b-a435-d1d9defe5ab0

---

## Step 6 — Update Notion (5 pages via Notion MCP)
Fetch each page before updating. Use short unique anchor strings for old_str.

### 6a — Build Log DB (7a961d25-719b-43e4-89a2-aa117c79ca4d)
Create a new entry: Session S[N] | Date | Tickets closed | Files changed count
Metrics delta: RPCs [±N] | Hooks [±N] | SQL deployed | Build queued | Notes

### 6b — Live Build State v2 (357e6d90-cf26-814c-ac6d-c6baa911fc2a)
- Current State table — update metrics, branch, build rows
- Session log — prepend new S[N] entry
- Next Session Priorities — replace with S[N+1] list

### 6c — Backend Deployment Tracker (315e6d90-cf26-81d0-861f-c5fad9ab4feb)
Add a row for each RPC deployed or updated. If none: "S[N] — no RPC changes."

### 6d — Sprint Board (7360a7b2-7bcf-4fcc-a1a0-532bb9c567d4)
- Move closed tickets to '✅ Done'
- Create new tickets at '⚙️ Engineering' or '🗂 Backlog'
- Milestone: '🚀 MVP Launch'

### 6e — Phase 1 Launch Readiness (358e6d90-cf26-818b-a435-d1d9defe5ab0)
Update any rows resolved or newly identified. Update "Last updated" line.

### Fallback if Notion MCP write fails
Note failure in ATLASIO_CONTEXT.md as:
// NOTION-UPDATE-FAILED: [page name] — Claude Chat to retry
Do not block the build. Report to Tony at session end.

### Large page strategy — prevent MCP timeout failures
Notion MCP writes time out on pages that have grown too long (~200+ blocks).
Follow this strategy on every session end:

Rule 1 — If a write times out, do NOT retry the same page.
Create a new child page instead:
1. Create new Notion page as child of the parent
2. Title: "[Page Name] — S[N]–S[N+x]" e.g. "Build Log — S178–S190"
3. Write the new entry to the fresh child page
4. Add a link to the new child page at the top of the original page
5. Add the new page ID to tasks/next-session-context.md

Rule 2 — Report new page IDs in the session end report.
Claude Chat will update Start New Session and userMemories with the new ID.

Page size thresholds:
- Build Log DB — new archive page after ~50 entries
- Live Build State v2 session log — archive after ~30 entries
- Backend Deployment Tracker — new page after ~60 RPC rows
- Component Inventory — split by domain after ~40 components

---

## Step 7 — Final commit
Stage all modified files including all tasks/ doc files and ATLASIO_CONTEXT.md.

Commit message format:
chore: session end protocol S[N] — [one line summary]

- [ticket 1 closed]
- [ticket 2 closed]
- Docs: ATLASIO_CONTEXT, screen-registry, next-session-context updated
- Notion: Build Log, Live Build State, Sprint Board updated

Push: git push origin [branch-name]
PAT required — password auth not supported.

---

## Step 8 — Report back to Claude Chat
Send a completion report with:
- Checklist of every step: completed ✅ or failed ❌ with reason
- Final metrics: RPCs | Hooks | Edge Functions
- Commit hash
- Any items needing Claude Chat follow-up
