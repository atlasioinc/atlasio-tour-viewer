# Next Session Context
# Generated: S177 end-of-session — May 6, 2026
# Read by: Claude Chat at S178 session start for state reconcile

---

## Build state
- RPCs: 77
- Hooks: 72
- Edge Functions: 11
- tsc: 0 | Lint: 0 new (8 pre-existing warnings in unrelated files)
- Last build: Build 56 (in TestFlight — awaiting device QA before merge)

## Active branches
- feat/atl-location-03-s175 @ af7c5c4 — S175 base + S177 modal fixes committed
- feat/atl-bid-actions-01-s176 @ [update with final S177 cleanup commit hash] — S176 base + S177 invite/bid wiring + S177 notification mock cleanup

## QA items pending (Build 56 — device required)
- [ ] InviteContractorsModal — Your Network shows contractor roles only (no partners)
- [ ] InviteContractorsModal — Near This Job rows show trade pill + distance
- [ ] Job Invites section on ContractorHomeTab — invite appears under Job Invites not New Jobs
- [ ] JobInviteCard visual treatment — 3px left bar, Invited badge, note block
- [ ] ContractorJobDetails — all 6 bid states render from live data (no mock)
- [x] Send invite → SuccessToast + job_invitations row — PASSED S177
- [x] Invite write — correct invited_by UUID + note — PASSED S177
- [ ] Accept bid → bids.status = accepted + jobs.status = in_progress
- [ ] Counter bid → bids table updated
- [ ] Reject bid → bids table updated
- [ ] BidSubmissionScreen onError — surface RPC error message (e.g. force a duplicate-bid attempt and confirm the alert text reflects the real error)

## If QA passes — merge sequence
git checkout main
git merge feat/atl-location-03-s175
git merge feat/atl-bid-actions-01-s176
git push origin main

## S178 priorities (in order)
1. Build 57 — queue new EAS build to pick up all S177 changes (including the late-session notification mock cleanup)
2. Device QA — Build 57 — run full QA checklist above
3. Merge to main — after QA passes both branches
4. BidSubmissionScreen live wiring — `useSubmitBid` mock fallback removed S177; `onError` surface fixed in S177 cleanup. Remaining audit: confirm submission paths (new bid + edit bid) end-to-end on device with no mock fallthrough.
5. rpc_get_job_details signed photo_urls — verify on device; remove DEMO_PHOTOS fallback after
6. S-INFRA-03 — Expo Push Notifications E2E (critical launch blocker) — note: notifications hooks are now fully live (no mock fallback) so the push pipeline is the only remaining gap
7. ATL-LOCATION-04 — PhotoJobDetails + StagingJobDetails + InviteContractorsModal parity
8. REFACTOR-REPAIRJOBDETAILS-LOCAL-JOB-STATE — S176 carryover

## Open flags / known gaps
- DEMO_PHOTOS retained in ContractorJobDetails as photoSources fallback — @demo TODO to remove after photo_urls verified on device
- `useNotifications` / `useMarkNotificationsRead` / `useUnreadNotificationCount` — fully live as of S177 cleanup commit (no more mock fallback). NotificationsScreen / Notifications badge consumers should be tested for graceful error handling on device when Supabase is unreachable.
- BidSubmissionScreen `onError` now surfaces real RPC errors — full submit-flow audit still pending Build 57 device QA.
- component-inventory.md created S177 — needs backfill for pre-S177 components in S178
- CHORE-CLAUDE-MD-SDK-AUDIT — CLAUDE.md says SDK 54/RN 0.81.5; actual SDK 55/RN 0.83.4

## SQL deployed S177
- vouches_recipient_role_check — CHECK constraint on public.vouches.recipient_role
- rpc_get_job_invitations() — new RPC, 0 args, 18-field return
- rpc_get_job_details(uuid) — updated: +invitation_id, +bid_count, +my_bid.counter_amount
- (S177 cleanup commit: no SQL changes — code-only)

## Metrics to reconcile
RPCs: 77 | Hooks: 72 | Edge Functions: 11
(Claude Chat: cross-check these against Notion Live Build State v2 at S178 start)

## Notion pages to fetch at session start
- Start New Session: 328e6d90-cf26-8157-aa05-ead5f497d4ab
- Live Build State v2: 357e6d90-cf26-814c-ac6d-c6baa911fc2a
- Phase 1 Launch Readiness: 358e6d90-cf26-818b-a435-d1d9defe5ab0

## New Notion archive pages created S177 (large-page strategy fallback)
- **Backend Deployment Tracker — S177–S190**: 358e6d90-cf26-810c-af25-ffd86aa2c4c1
  - Created because parent (315e6d90-cf26-81d0-861f-c5fad9ab4feb) exceeded MCP timeout threshold
  - All S177 RPC deployments documented in this archive
  - Header link on parent page **PENDING** — small targeted edit also timed out; Claude Chat to retry header link
  - Claude Chat: please update Start New Session with this archive ID
