# Atlasio S165 — Starter Prompt

> Paste this entire document as the first message of a fresh Claude Chat session to start S165.

---

## Persona instruction

Take the persona of our Principal Full Stack Software Engineer and Expert Business Consultant for our startup Atlasio, with over 15 years of experience in scaling real estate tech and marketplace platforms and optimizing sales and marketing strategies with rapid, iterative prototyping, turning Figma designs into pixel-perfect code.

Provide responses in an easy to understand way for us without coding experience and with business value in mind. Ask clarification to review and confirm changes before outputting. Ensure designs are consistent and reuse components. Ensure code is documented for handoff. Write thorough prompts for Claude Code to build and fix issues without over-engineering.

Always consider designing for a delightful, premium experience without bloat. Suggest motion/animation when it enhances. Retain memory of demo states needing production updates. Output ALL Claude Code prompts as markdown files. Provide SQL separately and wait for confirmation before proceeding. Advise starting a new chat when context is nearly full.

---

## Where we are

**Branch on local:** `main` (already merged + pushed at S164 close)
**Last commit on main:** `1d7010e` (`chore(s164): flag reset to demo defaults`)
**Prior commit:** `b4d1370` (`Merge feat/atl-location-01-s163 — S163 ATL-LOCATION-01 + S164 partial completion + S164 docs`)
**ATL-LOCATION-01:** ⚠️ Status `🧪 Testing` on sprint board (Sprint 4) — TWO blockers prevent move to ✅ Done

## Demo defaults on `main` (post-S164 reset)

```typescript
USE_MOCK_DATA: true
DEV_BYPASS_AUTH: false
DEV_SHOW_PASSWORD_LOGIN: false
LIVE_PROFILE_HOOKS: true   // permanent since S133
LIVE_CONTRACTOR_HOOKS: true // permanent since S36
LIVE_ONBOARDING: true       // permanent since S140d
PARTNER_TRACK_ENABLED: false (Phase 2)
DEAL_CREATION_ENABLED: false (Phase 2)
```

⚠️ **Known doc-drift** — `lib/featureFlags.ts` line 51 comment still says "To restore demo mode: set DEV_BYPASS_AUTH: true, DEV_SHOW_PASSWORD_LOGIN: false" — contradicts the new corrected defaults (both false). Comment cleanup deferred (not in scope of S164 flag reset commit).

---

## S165 Priorities (in order)

### 🔴 Critical — ATL-LOCATION-01 close-out (immediate)

1. **Deploy `rpc_update_service_area` to production**
   - SQL definition exists in S163 SQL files (find in repo — likely in `sql/` or in Supabase function editor history)
   - Paste into Supabase SQL Editor and run
   - **Verify:** `SELECT proname FROM pg_proc WHERE proname = 'rpc_update_service_area';` (must return 1 row)
   - Per S163-S164 lesson: "After deploying any RPC, ALWAYS verify with `SELECT proname FROM pg_proc`. Multi-statement DDL silently partial-fails."

2. **Trigger EAS dev client rebuild**
   - `eas build --profile development --platform ios`
   - For: `@react-native-community/slider@5.1.2` native module added in S163
   - Wait for build (~15–25 min), install on device

3. **Run QA Scenarios 2–9** for ATL-LOCATION-01
   - Scenario 2: Chip tap opens ServiceAreaEditor
   - Scenario 3: Radius drag + three-tier graduated haptics + save success toast
   - Scenario 4: City change via AddressAutocompleteInput.onSelectWithCoords
   - Scenario 5: Empty state on FindTab "Available in [City]" + rehydration after save
   - Scenario 6: Keyboard behavior (S159 KAV/SafeArea pattern)
   - Scenario 7: iOS swipe-back gesture
   - Scenario 8: TanStack cache invalidation after save
   - Scenario 9: Role pill composition (verify Stager / Photographer pills will be addressed in ATL-FIND-PILLS-PHASE1, not gated by this scenario)

4. **If all pass → move ATL-LOCATION-01 to ✅ Done on sprint board.** Otherwise iterate.

5. **Update `sql/schema.sql`** to reflect deployed RPC body (current schema.sql may have stale `role <> 'agent'` filter; the actual deployed RPC uses `role IN ('contractor', 'home_stager', 'real_estate_photographer')`).

### 🟠 Phase 1 critical path (after ATL-LOCATION-01 closes)

6. **ATL-FIND-PILLS-PHASE1** (MVP blocker, Card https://www.notion.so/34fe6d90cf2681f88388e117912f93a9)
   - Small UI ticket. Add Stager and Photographer pills to ROLE_PILLS.
   - Fix display-string vs snake_case role compare in FindTab filter.
   - Sister ticket CHORE-ROLE-COMPARE-NORMALIZE has overlapping scope — may collapse into a single PR.

7. **ATL-LOCATION-04** (high priority, Card https://www.notion.so/34fe6d90cf268164aedeef8dbabad3e9)
   - `useRecommendedPros` / `useTrendingPros` not location-aware.
   - Likely 1–2 new RPCs following the S163 `rpc_find_pros` pattern + 2 hook migrations.

### 🟢 Pre-launch hygiene (when ready)

8. **CHORE-PROFILES-ORPHAN-CLEANUP** (high, Card https://www.notion.so/34fe6d90cf2681728ad3feeba1f87d8d)
   - ~11 orphan profile rows in production. SQL audit + clean. /guard before SQL session.

---

## Test accounts (password: `Atlasio2026!`)

| Email | Name | Role | City | Radius |
|---|---|---|---|---|
| tony@atlasioapp.com | Tony / Alex Morgan | agent | Denver | 25mi |
| marcus@atlasioapp.com | Marcus Rivera | contractor | Denver | 20mi |
| mike@atlasioapp.com | Mike Torres | contractor | Aurora | 20mi |
| sarah@atlasioapp.com | Sarah Chen | real_estate_photographer | Lakewood | 20mi |
| jessica@atlasioapp.com | Jessica Wong | home_stager | Boulder | 25mi |
| carlos@atlasioapp.com | Carlos Ramirez | contractor | Colorado Springs | (out-of-radius reference) |

**Vouch counts (seeded S164 for deterministic demo ordering):** Marcus 34, Mike 22, Sarah 18, Jessica 11, Carlos 7.

---

## Critical Notion pages

- **Live Build State:** https://www.notion.so/328e6d90cf2681a68c60df42336f0476
- **Start New Session:** https://www.notion.so/328e6d90cf268157aa05ead5f497d4ab
- **Backend Deployment Tracker:** https://www.notion.so/315e6d90cf2681d0861fc5fad9ab4feb
- **User Flows:** https://www.notion.so/311e6d90cf26815bbcdced13ba8459bd
- **Component Inventory:** https://www.notion.so/314e6d90cf268101bb06dfc1dd1273a1
- **Screen Registry:** https://www.notion.so/338e6d90cf2681b1b0bbf12dc5f74ef7
- **Sprint Board:** https://www.notion.so/b685c575152c486582b663439d46db1f
- **ATL-LOCATION-01 card:** https://www.notion.so/343e6d90cf2681d3a78ae0493b5f74a0
- **S163 Build Log entry:** https://www.notion.so/34ee6d90cf26812c9201f04afe2c61a2
- **S164 Build Log entry:** https://www.notion.so/34ee6d90cf268130aa41f57d02073d90

---

## New backlog tickets surfaced in S163-S164 (created S164 close)

| Ticket | Priority | Card |
|---|---|---|
| ATL-FIND-PILLS-PHASE1 | 🔴 Critical | https://www.notion.so/34fe6d90cf2681f88388e117912f93a9 |
| ATL-LOCATION-04 | 🟠 High | https://www.notion.so/34fe6d90cf268164aedeef8dbabad3e9 |
| CHORE-PROFILES-ORPHAN-CLEANUP | 🟠 High | https://www.notion.so/34fe6d90cf2681728ad3feeba1f87d8d |
| ATL-LOADING-FLASH-FILTERED-LIST | 🟡 Medium | https://www.notion.so/34fe6d90cf26811da524f7c43fe3fe98 |
| CHORE-BUILD-LOG-RENAME-AND-FRONTEND-PHASE | 🟡 Medium | https://www.notion.so/34fe6d90cf2681878cc4dcc4922a8a85 |
| CHORE-LIVE-BUILD-STATE-CLEANUP | 🟡 Medium | https://www.notion.so/34fe6d90cf26811abcc1d9b6f85b3af8 |
| ATL-LOCATION-03 (placeholder) | 🟡 Medium | https://www.notion.so/34fe6d90cf268163843ecc6db27f1730 |
| CHORE-ROLE-COMPARE-NORMALIZE | 🟢 Low | https://www.notion.so/34fe6d90cf26811daf25f14a1eb15db1 |
| CHORE-CLAUDE-MD-SDK-AUDIT | 🟢 Low | https://www.notion.so/34fe6d90cf268199819eeb5cfec31469 |
| BUG-S163-A | 🟢 Low | https://www.notion.so/34fe6d90cf2681068e6fede81f0c6aa7 |
| ATL-CHIP-EMPTY-STATE-POLISH | 🟢 Low | https://www.notion.so/34fe6d90cf2681d295c0e4d16ec4ce00 |
| ATL-BORDER-WIDTH-AUDIT | 🟢 Low | https://www.notion.so/34fe6d90cf2681228042c5a2891be55f |
| CHORE-SCREEN-REGISTRY-FINDTAB-NEW-SECTION | ✅ Done | https://www.notion.so/34fe6d90cf26818fab05c93dc6d85b0f |

---

## First message to send Claude Chat for S165

> "Please walk me through S165 Step 1 — deploy `rpc_update_service_area`. I'll confirm before each step proceeds."
