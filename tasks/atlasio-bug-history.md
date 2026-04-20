# Atlasio — Persistent Bug History
**Last updated:** S162b ATL-INBOX-MOCK-SHADOW FIXED | April 19, 2026

This document tracks bugs that have required multiple fix attempts.
Use this before writing any fix prompt to avoid repeating failed approaches.

---

## ATL-INBOX-MOCK-SHADOW — Contractor/Partner inbox showed mock threads instead of live deal_chat (S162b)

**Screen:** `components/ContractorInboxList.tsx` (shared by contractor + partner roles)
**Hook:** `hooks/useData.ts` → `useInboxThreads` (no change — already wired)
**Status:** 🟢 Fixed in S162b (bundled with ATL-DEAL-THREAD-06 commit on `feat/atl-deal-thread-06-s162`).

### Symptom
Lisa (title_escrow) and David (mortgage_pro) saw 12 hardcoded mock threads ("Rachel Williams / 4521 Elm Street", "Marcus Lee / 782 Maple Drive", etc.) in their inbox even with `USE_MOCK_DATA = false`. Real deal_chat threads they were members of (e.g. `77722f91-67a1-4d6a-b69f-347f5695075c` — "123 Main St" created by Tony) never appeared. Backend was healthy: `rpc_get_inbox_threads` returned the thread correctly when called as Lisa.

### Root cause
`ContractorInboxList.tsx` was 100% hardcoded mock. It did not import `useInboxThreads` or any data hook — render path used `MOCK_ACTIVE_THREADS` and `MOCK_PAST_THREADS` directly. The S160/S161 work that wired `rpc_get_inbox_threads` → `adaptInboxThreadToLocal` → `InboxList.tsx` was scoped to the agent inbox only. The contractor/partner inbox surface was left with a `@backend TODO: useContractorJobChats()` placeholder that never landed.

Compounding issue: `ContractorInboxStack` in `BottomTabNavigator.tsx` only registered `ChatScreen`, not `DealChatScreen` — so even if the data flowed, navigation to a deal_chat would fail.

### Resolution (S162b)
1. Wire `useInboxThreads` into `ContractorInboxList.tsx`. `useEffect` overwrites the mock state with adapted live data filtered to `type IN ('deal_chat', 'job_thread')`. Demo mode (`USE_MOCK_DATA = true`) preserves the existing 12 hardcoded threads driven by the in-screen `isFilled` toggle.
2. `handleThreadPress` branches on stashed `__type` field: `deal_chat` → `DealChatScreen` with `members[]` + `closingDate`; everything else → `ChatScreen` (existing behavior).
3. `ThreadRow` suppresses the `ThreadStatusBadge` when `__type === 'deal_chat'` so the placeholder `'in_progress'` jobStatus does not render as a misleading "In Progress" pill.
4. `BottomTabNavigator.tsx` `ContractorInboxStack` registers `DealChatScreen` so the navigation target exists.
5. Header comment reframed: "users see threads they are members of" (RLS-enforced); the older "contractors only chat in job context" client-side convention is preserved by the type filter, not by lack of data.

### Known limitations / follow-ups
- Past threads (`completed`, `cancelled`) are NOT yet returned by `rpc_get_inbox_threads`. In live mode the "Past Jobs" section is empty; the section header is already conditionally rendered behind `visiblePastThreads.length > 0` so nothing visually breaks. Defer to a session that extends the RPC.
- "Job Chats" header still says that — a deal_chat shows up under "Active Jobs" with no status badge. Acceptable interim. Consider renaming the section header (and adding a dedicated "Deal" pill variant) in a S163 design pass.
- `lib/typeAdapters.ts` `adaptInboxThreadToLocal` is **role-agnostic** — verified during S162b investigation. No `viewerRole` parameter needed. RPC `members[]` excludes the caller server-side regardless of role.

### Do NOT
- Do NOT add `useContractorJobChats()` as a separate hook — it would duplicate `useInboxThreads`. RLS on `thread_members` already gates membership scoping correctly.
- Do NOT rename `ContractorInboxList.tsx` in S162b — file rename is a separate semantic change deferred to S163.
- Do NOT remove the demo `isFilled` toggle — it remains useful for QA in mock mode.
- Do NOT introduce a new "Deal" pill variant in S162b — that's a separate design decision deferred to S163. Suppression is the right interim answer.

---

## ATL-DEAL-THREAD-06 — System pill creator detection (S162)

**Screen:** `components/DealChatScreen.tsx`
**Hook:** `hooks/useData.ts` → `useIsThreadCreator`
**Migration:** `ALTER TABLE thread_members ALTER COLUMN joined_at SET DEFAULT clock_timestamp();`
**Status:** 🟢 Fixed for all threads created on or after the S162 migration (April 18, 2026).

### Symptom
"Agent added you to this chat" system pill incorrectly shown for the deal creator on Inbox re-entry. The route-param `isCreator` was only true on the first-creation hop from `CreateDealChat` — it defaulted to false/undefined on every other entry path, so the true creator saw the pill every time they came back from Inbox.

### Root cause
Creator identity is not route-derivable. It must be server-derived from `thread_members`.

The earliest-joined-member heuristic was viable in theory but required a schema tweak: `thread_members.joined_at` previously defaulted to `now()`, which returns transaction start time in Postgres. Every row inserted inside `rpc_create_deal_thread` (agent + each participant) got an identical timestamp to the microsecond, making `ORDER BY joined_at ASC LIMIT 1` non-deterministic.

### Resolution (S162)
1. Migration: `thread_members.joined_at` default changed from `now()` (transaction-time, ties all rows in same RPC) → `clock_timestamp()` (wall-clock, deterministic per statement). Agent row is inserted first in `rpc_create_deal_thread`, so agent wins the earliest-joined query.
2. New hook `useIsThreadCreator(threadId)` (`hooks/useData.ts`) queries `thread_members` `ORDER BY joined_at ASC LIMIT 1` and compares `user_id` to `auth.uid()` via `getCurrentUserId()`. Returns `boolean | undefined`; error and mock paths return `undefined`. 5-min `staleTime` because creator never changes.
3. `DealChatScreen.tsx` renames the route-param destructure to `routeIsCreator` and merges server truth via Option C: `const isCreator = serverIsCreator ?? routeIsCreator`. The pill render (`{!isCreator && …}`) consumes the merged value with no other changes.
4. `sql/schema.sql:367` synced to match deployed state (`DEFAULT clock_timestamp()`).

### Known-acceptable edge case
Threads created BEFORE the S162 migration have tied `joined_at` values (all rows share transaction-start timestamp). For these threads:
- If the query happens to return the creator first, `useIsThreadCreator` returns `true` → pill hidden correctly.
- If it returns another member first, the hook returns `false` → pill incorrectly shown for the creator.
- Either way, the UI degrades gracefully via the route-param `routeIsCreator` fallback on the first-creation hop. On Inbox re-entry for pre-S162 threads, creator may see the pill incorrectly.

**Mitigation:** Create fresh deal threads post-migration for demo purposes. All deal threads from S162 forward are deterministic.

**Not a bug.** This is expected and documented.

### Do NOT
- Do NOT add a `creator_id` column to `threads` to "fix" pre-migration threads — out of scope. The small user cohort affected (anyone who created a deal pre-S162) can be unblocked by creating a fresh deal thread.
- Do NOT modify `rpc_get_inbox_threads` to return creator info — out of scope for this ticket.
- Do NOT change the route-param `isCreator` plumbing from `CreateDealChat` → `DealChatScreen` — it is the loading-state fallback that hides the pill during the ~100–300ms server query on first-creation hop.
- Do NOT backfill `joined_at` for existing rows — `clock_timestamp()` is a default for NEW inserts only, and rewriting historical timestamps would be a fake fix.

---

## ATL-DEAL-THREAD-01 — CreateDealChat not persisting deal threads

**Screen:** `components/CreateDealChat.tsx` → `components/DealChatScreen.tsx`
**Hook:** `hooks/useData.ts` → `useCreateDealThread`
**RPC:** `rpc_create_deal_thread(p_deal_name TEXT, p_property_address TEXT, p_closing_date DATE, p_participant_ids UUID[])` — deployed S160
**Status:** 🟢 WIRED in S160. `handleCreateChat` now calls the RPC; `DealChatScreen` receives the returned `thread_id`. Demo-mode mock contact IDs will trigger an Alert on failure (see Known Limitations below).

### Symptom
Before S160, `handleCreateChat` only `console.log`ed the payload and navigated to `DealChatScreen` with no `thread_id` — threads were never persisted to Supabase, never appeared in the Inbox, and `DealChatScreen` had no backend linkage for future message loading.

### Root cause
`threads` table has no INSERT RLS policy (`sql/schema.sql:662-670` only exposes SELECT + UPDATE for members). Direct client INSERT is impossible. A SECURITY DEFINER RPC is required — same pattern as the existing `rpc_create_thread` for 1:1 chats.

### Resolution (S160)
1. Added `rpc_create_deal_thread` as a SECURITY DEFINER Postgres function (deployed to Supabase, mirrored in `sql/schema.sql:18b`). Inserts into `threads` with `type='deal_chat'` + seeds `thread_members` for agent (`auth.uid()`) and every participant UUID in the array. Returns `{ success, thread_id }` or `{ success: false, error }`.
2. Added `useCreateDealThread` mutation hook (`hooks/useData.ts`) with `refetchQueries({ queryKey: queryKeys.inboxThreads })` on success — same pattern as `useCancelJob` (S157b) for immediate Inbox refresh.
3. Rewrote `handleCreateChat` in `CreateDealChat.tsx` as async: calls `createDealThread.mutateAsync(...)`, navigates via `CommonActions.reset` with `threadId: result.thread_id` on success, shows `Alert.alert('Error', ...)` on failure. Button shows 'Creating…' and is `disabled` during the save.
4. Added parallel `closingDateISO` state to `CreateDealChat.tsx` — the existing display string ("Dec 15") loses the year, so `handleDateConfirm` now sets both the display string and a YYYY-MM-DD ISO string in lockstep. Display flows to the DealChatScreen banner; ISO flows to the RPC.
5. Threaded `threadId?: string` through `InboxStackParamList` (`components/InboxStack.tsx`) and `DealChatScreen.tsx` route-param destructuring. Silenced the TS unused-local warning with `void threadId;` + `@backend — wired in future session via useThreadMessages(threadId)` comment.
6. Fixed `InboxThread.type` enum mismatch in `types/index.ts`: `'deal'` → `'deal_chat'` (matches Supabase `thread_type_enum`).
7. Deleted duplicate `InboxStackParamList` export from `types/index.ts` — it had drifted from the canonical definition in `components/InboxStack.tsx`. All five consumer files already import from `./InboxStack`; no call-site changes needed.

### Known limitations
- **Demo-mode RPC failure:** `DEAL_CONTACTS` in `CreateDealChat.tsx:97` uses mock IDs (`'d1'..'d10'`) that are not valid UUIDs. In demo mode the RPC will reject the participant array cast and the user will see an Alert. This is by design per the S160 decision log — the fix is to wire a real network-contact source in a follow-up session.
- **Message loading deferred:** `DealChatScreen` receives the real `threadId` but still renders `MOCK_DEAL_MESSAGES`. `useThreadMessages(threadId)` wiring + realtime subscription are scoped to a separate session.
- **InboxList still mock:** existing InboxList navigation to DealChatScreen does not supply a `threadId` (handled via the optional `threadId?: string` param shape).

### Do NOT
- Do NOT attempt to revert to direct client INSERT on the `threads` table — RLS blocks it.
- Do NOT make `threadId` required on `DealChatScreen` until InboxList passes it on every navigation.
- Do NOT remove the `Alert` failure handler — it is the only user feedback in the demo-mode failure path.

---

## BUG-001 — Address Autocomplete Dropdown Not Appearing

**Screens affected:** PostPhotoJobScreen, PostStagingJobScreen, PostJobWizard, CreateDealChat
**File:** `components/shared/AddressAutocompleteInput.tsx` (S156 rewrite — single source of truth for all 4 consumers)
**Status:** 🟢 RESOLVED in S156. Build 46 verified working on PostStagingJobScreen + ClientLifestyleScreen. Post-rewrite confirmed on PostPhotoJobScreen (repair jobs), PostJobWizard, and CreateDealChat via dev client. Backend wiring validated: Supabase `jobs.address` contains fully-formatted Google Places string (e.g. `"2950 Brighton Boulevard, Denver, CO, USA"`). `keyboardShouldPersistTaps="handled"` audited across all 4 consumers — clean.

### Symptom
Input field appears and accepts text. No dropdown appears. Google Places API key confirmed valid (preview + production EAS environments). APIs enabled: Places API (New), Geocoding API. Key present in build.

### Attempt 1 — S146 (zIndex bump)
**Approach:** Bumped zIndex from 99 → 1000 with matching elevation on all three stacking contexts.
**Result:** Passed in Build 27. Regressed in later builds.
**Root cause of regression:** Unknown — likely a parent container added in S149a/S150 created a new stacking context that clipped the absolute-positioned dropdown regardless of zIndex.

### Attempt 2 — S151 (Modal overlay nuclear option)
**Approach:** Moved dropdown out of ScrollView into a `<Modal transparent>` overlay. Used `measureInWindow` to get absolute screen coordinates and position the dropdown below the input.
**Result:** Failed on device (Build 40/41). Input accepts text but no dropdown appears.
**Root cause:** `measureInWindow` fires before layout completes, returning `{x:0, y:0, width:0, height:0}`. Modal renders at position 0,0 with zero width — invisible/off-screen.

### Attempt 3 — S152 (width > 0 guard + onBlur commit)
**Approach:** Added `inputLayout.width > 0` guard to `dropdownVisible` computation. Added `onBlur` commit to fix "address required" validation error as side effect.
**Result:** Code confirmed in file (grep verified). Still not working on Build 41.
**Root cause:** `measureInWindow` still returning 0 — guard prevents the zero-size render but the dropdown never gets valid layout to show.

### Attempt 4 — S153 (50ms delay + diagnostic logs)
**Approach:** Added 50ms `setTimeout` delay inside `measureInput()` before calling `measureInWindow`. Added diagnostic `console.log` to capture what coordinates were returned.
**Result:** Failed on Build 42. Diagnostic confirmed `measureInWindow` still returned 0,0,0,0 even after the delay. The race is not about time — it's that `measureInWindow` is structurally unsafe inside a ScrollView.
**Root cause:** `measureInWindow` does not reliably commit layout-window coordinates from within a ScrollView on iOS regardless of delay. No amount of `setTimeout` solves this.

### Attempt 5 — S154 (delete Modal, inline absolute-in-ScrollView rewrite)
**Approach:** Full rewrite. Deleted the entire Modal + `measureInWindow` path. Switched to an inline absolute-positioned `<View>` with `top:52, zIndex:99, maxHeight:240` inside a `position:relative` wrapper, sibling to the `TextInput`. Mirrored the working pattern in `ClientLifestyleScreen.tsx` that had been shipping since S57. S154 called the S151 "do NOT attempt plain zIndex" advisory "wrong" and removed it from bug-history.
**Result:** Failed on Build 43. Dropdown still did not appear on device.
**Root cause:** The S151 advisory was NOT wrong. Absolute children of a `ScrollView` on iOS are clipped or painted-under regardless of zIndex — platform constraint, not a styling/stacking issue. `ClientLifestyleScreen.tsx` worked because its autocomplete lives OUTSIDE a ScrollView (it's a direct child of the screen root). The four job-posting consumers all wrap AddressAutocompleteInput inside a ScrollView, which is the failing condition.

### Attempt 6 — S155 (Modal + measure() from onLayout)
**Approach:** Screen-level transparent `<Modal>` positioned via coordinates captured through `measure()` (NOT `measureInWindow`) called inside the wrapper's `onLayout` callback. Remeasure also triggers on `onFocus` and `Keyboard.addListener('keyboardDidShow')` to handle scroll-shifted layouts. Backdrop `Pressable` dismisses. Modal `visible` condition: `showAutocomplete && dropdownLayout !== null` (single boolean + layout guard — no compound alias). Inner View additionally guards on `suggestions.length > 0` so backdrop remains dismissible during fetch.
**Result:** Failed on Build 44 device test. Two regressions observed:
  1. **Keyboard closes on every keystroke.** On iOS, mounting a `<Modal>` while a sibling `<TextInput>` is focused causes the Modal to steal focus — iOS dismisses the keyboard. Because `handleTextChange` flips `showAutocomplete=true` on the first qualifying keystroke, the Modal mounts → keyboard closes → input blurs → `onBlur` fires `setShowAutocomplete(false)` → modal unmounts → user retaps → loop. Every character felt like a submit.
  2. **Autocomplete dropdown still does not appear** — even when the Modal briefly mounts, `onBlur` immediately closes it, and `measure()` captured from `onLayout` fires once at mount, before the ScrollView has scrolled the input into final position, so `dropdownLayout` can be stale/off-screen.
**Root cause:** The `<Modal>` approach is fundamentally incompatible with a focused sibling `TextInput` on iOS native-stack. No prop combination (`transparent`, `animationType='none'`, etc.) prevents the focus steal. This is a platform behavior, not a bug we can work around.
**measureInWindow is still PERMANENTLY BANNED.** The Modal pattern itself is also now banned alongside a focused input.

### Attempt 7 — S156 (inline absolute-sibling dropdown, per-screen pilot on PostStagingJobScreen)
**Scope:** PILOT — applied only to `components/PostStagingJobScreen.tsx`. The shared `AddressAutocompleteInput` component is intentionally NOT touched. If the pilot succeeds on device, the pattern will be rolled out to the other three consumers (PostPhotoJobScreen, PostJobWizard, CreateDealChat) and the shared component will be rewritten or deleted.
**Reference:** Mirrors the pattern in `components/ClientLifestyleScreen.tsx:617-681` which has been shipping successfully since S57. That screen's autocomplete also lives inside a `ScrollView` — the S154 claim that "ClientLifestyleScreen works because it's outside a ScrollView" was wrong. The real difference is that ClientLifestyleScreen uses a plain absolute sibling `<View>`, not a Modal, and does not mutate `showAutocomplete` on blur.
**Approach — line-level detail:**
  1. **No `<Modal>`, no `measure()`, no `onLayout`, no `Keyboard.addListener`, no `onBlur`.** The broken shared component's entire layout-measurement stack is deleted from the pilot.
  2. TextInput wrapped in `<View style={{ position: 'relative', zIndex: 50 }}>`. Dropdown is a direct sibling inside that same wrapper with `position: 'absolute', top: 52, left: 0, right: 0, zIndex: 99, elevation: 4`. `top: 52` = input height (46 with `paddingVertical: 12` + `lineHeight: 20` + 0.68 borders) + 4px visual gap, matching the S155-removed `measure()` offset.
  3. **Local state owned by PostStagingJobScreen (not shared):** `addressSuggestions`, `showAddressAutocomplete`, `isFetchingAddressSuggestions`, `addressAutocompleteTimerRef`. Pulling these into the screen file lets us debug one consumer in isolation without touching the other three.
  4. **Debounced fetch:** 400ms `setTimeout` on `handleAddressChange`. Clears timer on unmount via `useEffect` cleanup. Same debounce interval as ClientLifestyleScreen.
  5. **Guard `text.length < 3`:** dropdown hidden + suggestions cleared below 3 chars. Matches ClientLifestyleScreen gate.
  6. **Google Places (New) API call:** `POST https://places.googleapis.com/v1/places:autocomplete` with header `X-Goog-Api-Key: GOOGLE_MAPS_API_KEY` (imported from `lib/config`) and body `{ input, includedRegionCodes: ['us'] }`. Response mapped to `{ placeId, description }[]` with empty-value filter. Identical shape to ClientLifestyleScreen `fetchAutocompleteSuggestions`.
  7. **Three dropdown render states inside the absolute View:** (a) fetching + no results → "Searching…", (b) no results after fetch → "No matches", (c) suggestions list → `Pressable` rows that call `handleAddressSuggestionSelect(description)` which sets `address`, clears suggestions, hides dropdown.
  8. **`onFocus` deliberately omitted.** No measure, no scroll, no state mutation. The parent `KeyboardAvoidingView` + `keyboardShouldPersistTaps="handled"` on the ScrollView handles focus without us touching it. This is what keeps the keyboard from closing.
  9. **`onBlur` deliberately omitted.** The S155 shared component's `onBlur` auto-committed to parent AND called `setShowAutocomplete(false)`, which competed with Modal lifecycle. Neither is needed: value is already in local state via `onChangeText`, and tapping outside the dropdown blurs the input naturally — the dropdown stays visible briefly but doesn't block other field taps because `keyboardShouldPersistTaps="handled"`.
  10. **Value binding is direct `value={address}`** — no intermediate `addressQuery` buffer (which the shared component had and which contributed to the S152 "edit-after-select wipes parent state" workaround). Simpler, fewer race conditions.
**Files changed:**
  - `components/PostStagingJobScreen.tsx` — imports `useRef, useEffect, GOOGLE_MAPS_API_KEY`; removes `AddressAutocompleteInput` from `./shared` import (keeps `SuccessToast`); adds 4 state slots + timer ref; adds `fetchAddressSuggestions`, `handleAddressChange`, `handleAddressSuggestionSelect`, cleanup `useEffect`; replaces the `<AddressAutocompleteInput />` JSX (~6 lines) with the inline wrapper + TextInput + absolute dropdown (~75 lines).
**Not changed:**
  - `components/shared/AddressAutocompleteInput.tsx` — left intact and still imported by the other 3 consumers. Do NOT delete until device verification on PostStagingJobScreen succeeds.
  - `components/PostPhotoJobScreen.tsx`, `components/PostJobWizard.tsx`, `components/CreateDealChat.tsx` — still use the broken shared component. They will be migrated if the pilot passes.
**Result:** tsc 0 errors, lint not yet run. Pending device verification on Build 45.
**Why this should work where S155 failed:**
  - No Modal means no focus steal → keyboard stays up → no "closes on every keystroke".
  - Absolute sibling is inside the same `position: 'relative'` wrapper, not a separate window → no coordinate math, no layout race.
  - `zIndex: 99 + elevation: 4` is enough on both platforms when the dropdown is a sibling of the input (not a descendant of a clipped ancestor). The S154 failure was blamed on "iOS ScrollView clips absolute children" but ClientLifestyleScreen disproves that — more likely the S154 implementation had an ancestor card with `overflow: 'hidden'` or `borderRadius` that clipped it.
**What to verify on device (Build 45):**
  - Keyboard stays up while typing (no dismiss-per-character).
  - Dropdown appears at ≥3 characters, 400ms after last keystroke.
  - Suggestions populate from live Google Places API (not empty).
  - Tapping a suggestion sets the address and closes the dropdown.
  - Scrolling the ScrollView while typing does not misalign the dropdown (it's relative to input, so it should follow automatically).
  - Other form fields still tappable through/around the dropdown area.

### Attempt 8 — S156 Build 46 (response.ok check + full rollout) 🟢 RESOLVED
**Context:** Build 45 shipped the inline pilot to PostStagingJobScreen. Device test showed a NEW failure mode: the inline pattern rendered correctly and the keyboard stayed up, but both PostStagingJobScreen and the previously-working ClientLifestyleScreen displayed "No matches" / a brief "Searching…" flash, then nothing. Server-side curl with the exact same key + body returned valid suggestions, proving the API, key, and request shape were all correct. The failure was on the client side.
**Investigation:** User confirmed Google Cloud Console: key unrestricted, "Places API (New)" enabled, billing active. That ruled out the entire restriction / enablement branch.
**Build 46 diagnostic ship:** Added `response.ok` check, full error body logging, key-length log (never the key itself), and in-UI error surfacing to both PostStagingJobScreen and ClientLifestyleScreen. Shipped as `1efd308`. The moment the diagnostic code ran on device, the autocomplete **started working**. The fix was the diagnostic itself — because the old code never checked `response.ok`, Google's error responses silently parsed as JSON, `data.suggestions` was undefined, `?? []` gave empty, and the UI showed "No matches" forever. The `response.ok` branch didn't just log errors, it also **correctly handled the success path** by no longer swallowing them.
**Actual root cause (both layers):**
  1. **Modal + focused TextInput (S155 failure mode).** iOS steals keyboard focus when a `<Modal>` mounts while a sibling `<TextInput>` is focused. This caused the "keyboard closes per keystroke" regression on Build 44.
  2. **Missing `response.ok` check (ALL attempts 1–7 failure mode).** The original fetch code parsed ANY JSON response (including error bodies) and read `data.suggestions ?? []`. When Google returned a 4xx/5xx — which apparently happened intermittently due to network or transient backend issues — the UI silently showed empty results. This is what made the bug look like "dropdown never appears" across 6 different attempted fixes. None of the S146–S155 approaches addressed it because everyone assumed the code was successfully getting empty results, not silently swallowing errors.
**S156 Final Fix Ship (`781830f`):** Rewrote `components/shared/AddressAutocompleteInput.tsx` with the complete working pattern:
  - Inline absolute-sibling dropdown inside `position:'relative'` wrapper (no Modal)
  - `response.ok` check with `console.warn` on non-OK status + body logging
  - `AbortController` to drop stale in-flight responses
  - `__DEV__` warn when `GOOGLE_MAPS_API_KEY` is empty
  - 400ms debounce, 3-char minimum, US region gate
  - `onSelect(text)` called on every keystroke (so manually-typed addresses still commit to the parent form even without a suggestion tap)
**Refactored PostStagingJobScreen back to the shared component.** Removed the inline copy and diagnostic logging. Single source of truth restored.
**Removed diagnostic logging from ClientLifestyleScreen** but kept the permanent `response.ok` guard.
**Auto-rollout:** All 3 remaining consumers (`PostPhotoJobScreen`, `PostJobWizard`, `CreateDealChat`) picked up the fix with zero code changes because they already imported the shared component.
**Verification:**
  - ✅ Build 46 device test: PostStagingJobScreen + NeighborhoodMatch both working
  - ✅ Dev client post-rewrite test: PostPhotoJobScreen (repair jobs), PostJobWizard, CreateDealChat all working
  - ✅ Backend wiring: Supabase `jobs.address = "2950 Brighton Boulevard, Denver, CO, USA"` — full formatted Google Places string, zero transformation needed
  - ✅ `keyboardShouldPersistTaps="handled"` audited across all 4 consumers — clean
**Commits:** `1efd308` (diagnostic) → `781830f` (rewrite + rollout)

### What NOT to try again
- zIndex/elevation bumps — doesn't escape ancestor clip contexts on iOS (S146)
- Changing `keyboardShouldPersistTaps` — already set to "handled" on all consumers
- Mock path changes — component always hits live API, no mock path exists
- `measureInWindow` — returns 0,0,0,0 inside ScrollView, confirmed S151–S153
- `<Modal>` overlay while TextInput is focused — iOS focus steal closes keyboard on every keystroke (S155)
- `onBlur` auto-closing the dropdown — races against Modal/dropdown lifecycle (S155)
- **Parsing `fetch` responses without checking `response.ok`** — Google (and most REST APIs) return errors as valid JSON bodies. `data.field ?? fallback` silently masks 4xx/5xx failures. Permanent rule: always gate JSON parsing on `response.ok`, and log the error body when it's false. (S151–S156)

### The permanent lesson
The six failed attempts all assumed the problem was layout/rendering because the visible symptom was "dropdown doesn't appear." The real bug was that the fetch was silently failing on Google errors, so the component was correctly rendering "no results" every time. No amount of Modal/measure/zIndex work could fix a data-layer bug. **When a component appears to render empty, check whether it's receiving empty data or silently swallowing errors — BEFORE touching layout code.**

### Files to read before next fix attempt (if regression)
- `components/shared/AddressAutocompleteInput.tsx` — the S156 canonical implementation
- `components/ClientLifestyleScreen.tsx:318-357` — duplicate reference with the `response.ok` guard
- This log section — to avoid re-running the 6 dead-end approaches

---

## BUG-002 — ChatScreen Empty Space Below Input Bar

**Screen:** ChatScreen (`components/ChatScreen.tsx`)
**File:** `components/ChatScreen.tsx`, `components/InboxStack.tsx`
**Status:** 🟢 RESOLVED S159 — `paddingBottom` on input container changed from `insets.bottom + 8` to fixed `8`. KAV `behavior='padding'` owns all keyboard + safe-area spacing; iOS automatically handles the home indicator when the keyboard is visible. `useSafeAreaInsets` import and hook call removed (no other references).

### Symptom
Visible empty space between the message input bar and the bottom of the screen. Keyboard push works correctly (input bar rises above keyboard) but empty space persists when keyboard is dismissed.

### History
This bug has appeared and been "fixed" multiple times:

### Attempt 1 — S120a
**Approach:** `keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}`
**Result:** Worked at the time (ChatScreen was in fullScreenModal presentation).

### Attempt 2 — S140 / S141a
**Approach:** Keyboard pattern restructure. `keyboardVerticalOffset={0}` established as correct for the modal presentation context.
**Result:** Worked temporarily.

### Attempt 3 — S146 (DealChatScreen fix, same pattern)
**Approach:** Applied canonical pattern: `SafeAreaView(top) → KAV(padding, offset:0) → ScrollView → View(input) → SafeAreaView(bottom)(input row)`
**Result:** Worked for DealChatScreen.

### Attempt 4 — S151 (removed fullScreenModal from ChatScreen in InboxStack)
**Context:** `presentation: 'fullScreenModal'` was removed from ChatScreen registration to fix swipe-back gesture.
**Result:** Removing fullScreenModal changed how the bottom safe area is handled. `SafeAreaView edges={['bottom']}` on the input row began double-counting the bottom inset — once from SafeAreaView, once from the navigation container.
**Empty space returned.**

### Attempt 5 — S152 (hard-requirement comment lock)
**Approach:** Added hard-requirement comment block. Structure was already "canonical" so no code change was made.
**Result:** Empty space still present on Build 41. Comment documented the pattern but the pattern itself was wrong for the new (non-modal) presentation context.

### Attempt 6 — S153 (plain View input row + insets.bottom + 8)
**Approach:** Replaced `<SafeAreaView edges={['bottom']}>` on the input row with plain `<View>`. Added `paddingBottom: insets.bottom + 8` on the outer input bar container via `useSafeAreaInsets()`. This manually controls the inset without relying on SafeAreaView double-counting.
**Result:** Worked when keyboard was closed. Regressed on Build 42 when keyboard opened — iOS KAV `behavior='padding'` already pushed the input above the keyboard (keyboard covers home-indicator area), so the static `insets.bottom + 8` double-counted the notch, leaving a ~34px gap between input bar and keyboard.

### Attempt 7 — S154 (Keyboard.addListener to drop padding while keyboard open)
**Approach:** Added `keyboardVisible` state + `Keyboard.addListener` for `keyboardWillShow/Hide` on iOS and `keyboardDidShow/Hide` on Android. Input container `paddingBottom` became `keyboardVisible ? 8 : insets.bottom + 8`.
**Result:** Failed on Build 43. New symptom: ~34px gap FLASH for ~250ms during keyboard dismiss. Keyboard-closed state and keyboard-open state both visually correct, but the transition frame was broken.
**Root cause:** `keyboardWillHide` fired and immediately restored `paddingBottom` to `insets.bottom + 8` while KAV was still animating its own internal padding down from keyboard-height. Both added bottom space in the same frame. The listener was fighting KAV, not helping it.

### Hard requirement (S152, updated S155)
The comment block at the top of ChatScreen.tsx documents this pattern. It MUST be updated after every structural change. Future sessions: read the comment before touching ChatScreen.

### Key insight
`SafeAreaView edges={['bottom']}` behavior changes depending on whether the screen is presented as `fullScreenModal` or a standard pushed screen. After `fullScreenModal` removal, use explicit `insets.bottom` instead of relying on SafeAreaView edge handling. AND: do NOT layer additional `Keyboard.addListener` padding on top of KAV `behavior='padding'` — KAV owns all keyboard spacing.

### Attempt 8 — S155 (remove Keyboard.addListener; KAV owns keyboard spacing)
**Approach:** Deleted the S154 `keyboardVisible` state + `Keyboard.addListener` subscriptions from ChatScreen. Input container `paddingBottom` is now a static `insets.bottom + 8`. KeyboardAvoidingView `behavior='padding'` (iOS) owns ALL keyboard spacing — adding a listener on top created a race with KAV's own padding animation during keyboard hide.
**Why S154 failed:** `keyboardWillHide` fired and immediately restored `paddingBottom` to `insets.bottom + 8` while KAV was still animating its internal padding down from keyboard-height. Both were adding bottom space in the same frame → ~34px gap flash for ~250ms on dismiss.
**Why this should work:** With `behavior='padding'` on iOS, KAV adds keyboard-height padding at its container's bottom edge. The input bar (direct child of KAV, outside ScrollView) is pushed up naturally. The static `insets.bottom + 8` only accounts for the home-indicator inset — never the keyboard — so there's nothing to animate or double-count.
**Result:** tsc 0 errors, lint 0 errors. Pending device verification on Build 44.
**Hard rule (added to lessons.md):** Do NOT layer `Keyboard.addListener` padding logic on top of KAV `behavior='padding'`. KAV owns keyboard spacing.

### Attempt 9 — S159 (remove insets.bottom from input container) 🟢 RESOLVED
**Approach:** Changed input container `paddingBottom: insets.bottom + 8` → fixed `paddingBottom: 8`. Removed `useSafeAreaInsets` import and `const insets = useSafeAreaInsets()` call (no other usages). Updated hard-requirement comment block to document the S159 rule.
**Why S155 was wrong:** S155 assumed the static `insets.bottom + 8` was needed "to cover the home-indicator inset, never the keyboard". But KAV `behavior='padding'` already positions the container against the keyboard when open, and iOS covers the home-indicator area with the keyboard itself. Adding `insets.bottom` on top produced a visible ~34pt gap below the input when the keyboard was up on notch devices.
**Why this works:** With `paddingBottom: 8` fixed, KAV pushes the container exactly `keyboardHeight` up when the keyboard opens, leaving 8pt of breathing room between the input and keyboard top. When the keyboard is closed, iOS automatically provides the safe-area inset via native layout — no manual handling required.
**Result:** tsc 0 errors, lint 7 pre-existing warnings (0 new).

---

## BUG-003 — CreateDealChat Opens as Sheet Instead of Full Screen

**Screen:** CreateDealChat (`components/CreateDealChat.tsx`)
**File:** `components/InboxStack.tsx`, `components/CreateDealChat.tsx`
**Status:** 🟢 RESOLVED S155 (sheet presentation) + S159 (DealChatScreen input-lag keyboard variant — see below)

### S159 addendum — DealChatScreen input lag
Separate symptom, same root-cause family as BUG-002/BUG-006: DealChatScreen's input row was wrapped in a nested `<SafeAreaView edges={['bottom']}>` inside the input container. That injected a dynamic `insets.bottom` which KAV `behavior='padding'` could not cancel — the input floated ~34pt above the keyboard on notch devices. **S159 fix:** replaced the nested `SafeAreaView` with a plain `<View>`. Root `SafeAreaView edges={['top']}` and Edit Deal Details Modal KAV left untouched.

### Symptom
After creating a deal chat, the DealChatScreen presents as a bottom sheet (slides up from bottom). Back navigation returns to wrong screen.

### Attempt 1 — S151b (navigation.replace)
**Approach:** Changed `navigation.navigate` → `navigation.replace` in `handleCreateChat`.
**Result:** Failed. `replace` within a `fullScreenModal` stack keeps the modal presentation on the new screen. Back still went to wrong place.

### Attempt 2 — S152 (remove fullScreenModal from CreateDealChat in InboxStack)
**Approach:** Removed `presentation: 'fullScreenModal'` from CreateDealChat screen registration.
**Result:** `fullScreenModal` confirmed removed (grep verified). But `animation: 'slide_from_bottom'` still present — causes sheet appearance even without fullScreenModal.
**Back navigation:** Unknown if improved since animation makes it hard to tell.

### Attempt 3 — S153 (remove slide_from_bottom animation)
**Approach:** Removed `animation: 'slide_from_bottom'` from CreateDealChat options in InboxStack. Let the screen inherit default `slide_from_right` from `Stack.Navigator.screenOptions`.
**Result:** Failed on Build 42. Animation changed but the sheet appearance persisted — rounded corners, partial visibility of the parent screen behind the destination.
**Root cause:** Animation ≠ presentation. The leak was always from a parent presentation, not from CreateDealChat's own animation option.

### Attempt 4 — S154 (chrome normalization: X → back chevron)
**Approach:** Reasoned "chrome, not navigation". Replaced the X dismiss button with a back chevron (new `BackIcon` SVG), converted the root `<View>` to `<SafeAreaView edges={['top']}>`, removed manual `paddingTop: 8 + insets.top` math, and switched from right-aligned X to left-aligned 44×44 back chevron — matching `RepairJobDetails` and other standard pushed screens. The hypothesis was that CreateDealChat "still *read* as modal because its chrome was bottom-sheet chrome".
**Result:** Failed on Build 43. Chrome now looked like a pushed screen, but DealChatScreen still presented as a sheet after `navigation.replace`. Chrome was a cosmetic change that did not affect the actual navigation presentation.
**Root cause:** Same leak as Attempts 1–3 — an ancestor `fullScreenModal` was still leaking into the replaced screen. Chrome choice is downstream of the real problem.

### Attempt 5 — S155 (CommonActions.reset + X icon reversal)
**Approach:**
1. Replaced `navigation.replace('DealChatScreen', ...)` in `CreateDealChat.handleCreateChat` with `CommonActions.reset({ index: 1, routes: [{ name: 'InboxList' }, { name: 'DealChatScreen', params: {...} }] })`.
2. Reverted the S154 chrome chevron back to an X dismiss (pure SVG `CloseIcon`, matching the file's existing SVG convention — not Ionicons).
3. Updated `InboxStack.tsx` comments above `CreateDealChat` registration to document that `replace` does NOT escape a `fullScreenModal` ancestor and that future edits must use `reset`.

**Root cause (finally identified):** Not an animation option, not CreateDealChat's own presentation, and not a React Native `<Modal>` wrapper. The problem is `NewMessageScreen` at `InboxStack.tsx:62`, which is registered as `{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }`. On iOS native-stack, a `fullScreenModal` presentation established by an ancestor screen LEAKS down the stack — any subsequent `navigation.replace` (or even `navigate`) from a descendant screen inherits the modal layer. S152's note "removed fullScreenModal presentation so navigation.replace works naturally" was incomplete — S152 removed it from CreateDealChat but missed that NewMessageScreen (CreateDealChat's parent in the flow) still has it.

**Why the "What NOT to try" list was wrong about `CommonActions.reset`:** The prior entry said reset "would clobber InboxList from the stack". That's only true if you reset to `routes: [{ name: 'DealChatScreen' }]`. Resetting to `[InboxList, DealChatScreen]` with `index: 1` preserves InboxList as the back-target. Back from DealChatScreen lands on InboxList — the correct UX.

**Result:** tsc 0 errors, lint 0 errors. Pending device verification on Build 44.
**Hard rule (added to lessons.md):** `navigation.replace` does NOT escape a `fullScreenModal` ancestor on iOS native-stack. Use `CommonActions.reset` with a multi-route `routes` array to mount a clean, non-modal destination while preserving the back-target.

### What NOT to try
- `navigation.getParent()` approaches — adds complexity, not needed
- Changing DealChatScreen presentation — DealChatScreen itself is correct
- Removing `fullScreenModal` from NewMessageScreen — its slide-up entry is intentional UX
- `navigation.replace` — DOES NOT escape fullScreenModal ancestor on iOS native-stack (confirmed S151b, S152, S153, S154)
- `navigation.navigate` — same leak as replace; the ancestor modal presentation is inherited by any descendant pushed/navigated on top
- Changing `animation` options on the descendant — animation is not presentation (confirmed S153)
- Chrome changes (X ↔ chevron) — cosmetic only, does not affect presentation (confirmed S154)

---

## BUG-004 — SuccessToast Positioning and Size

**Component:** `components/shared/SuccessToast.tsx`
**Status:** 🔴 Unresolved as of Build 41

### Symptom
Toast appears at bottom of screen, too small, barely visible. User misses the feedback.

### History
Toast was built in S149b as a bottom-positioned notification matching `ErrorToast` pattern. On device, the bottom position competes with the tab bar and safe area — feels lost.

### S153 approach
Reposition to top of screen (`top: insets.top + 8`). Change animation from slide-up to slide-down. Set `minHeight: 48`. This is consistent with iOS system notification behavior and much more visible.

### Note
`ErrorToast` stays at bottom — errors are different in nature (user needs to see what they were doing when the error occurred). Success confirmations can move to top without UX conflict.

---

## BUG-005 — HomeTabAgent Repair Cards Empty (RESOLVED — NOT A BUG)

**Status:** ✅ Resolved — confirmed correct behavior

### Explanation
With `USE_MOCK_DATA: false` (QA mode), `hasActiveRepair` derives from live Supabase data. Tony's account has no active repair jobs in the database. Empty state is correct.

To see repair cards: set `USE_MOCK_DATA: true` (mock/demo mode).

The dual-path fix from S152 is correct:
- `USE_MOCK_DATA: true` → `isFilled` toggle drives repairs section
- `USE_MOCK_DATA: false` → live data from `useAgentActiveJobs()`

**Do not file this as a bug again.**

---

## BUG-006 — CreateDealChat "Create Chat" CTA Hidden by Keyboard

**Screen:** CreateDealChat (`components/CreateDealChat.tsx`)
**Status:** 🟢 RESOLVED S159 — root `SafeAreaView` changed from `edges={['top', 'bottom']}` → `edges={['top']}`. The bottom-edge claim at the root pre-consumed `insets.bottom` before KAV could push the CTA against the keyboard, producing a ~34pt gap above the keyboard. With `edges={['top']}` only, KAV `behavior='padding'` owns all keyboard + safe-area spacing, and the footer `paddingBottom: 16` fixed value is now flush against the keyboard. S155 comment block replaced with the S159 rule.

### Symptom
When the keyboard opens on any form field (Deal Name, Property Address, Closing Date, etc.), the "Create Chat" CTA at the bottom is pushed off screen.

### Initial hypothesis (wrong)
S155 prompt assumed the CTA was a child of the ScrollView and needed to be moved outside. **It was not** — the footer View was already a sibling of the ScrollView inside KAV (verified in file before editing). Restructuring was unnecessary.

### Real cause
`SafeAreaView edges={['top']}` only — bottom inset was not owned by SafeAreaView. The footer's `paddingBottom: Math.max(insets.bottom, 24)` was manually applying the home-indicator inset INSIDE a KAV that extended to the bottom of the screen. When KAV `behavior='padding'` added keyboard-height padding, the combined offset pushed the visible footer below the keyboard edge on taller devices.

### S155 fix
1. Changed `SafeAreaView edges={['top']}` → `edges={['top', 'bottom']}`
2. Footer `paddingBottom: Math.max(insets.bottom, 24)` → static `paddingBottom: 16` (SafeAreaView now owns the bottom inset — no double count)
3. Added explicit `keyboardVerticalOffset={0}` to KAV (matches ChatScreen lock)
4. Removed now-unused `useSafeAreaInsets` import + `insets` binding

### What was NOT changed
- Footer is still a sibling of ScrollView inside KAV (was already correct — don't touch)
- KAV `behavior='padding'` on iOS / `'height'` on Android (unchanged)
- `keyboardShouldPersistTaps="handled"` on ScrollView (unchanged — already set)

---

## Patterns Learned

### SafeAreaView + fullScreenModal interaction
`SafeAreaView edges={['bottom']}` behaves differently depending on screen presentation mode:
- In `fullScreenModal`: SafeAreaView correctly handles bottom inset
- In standard pushed screen: SafeAreaView + navigation container double-counts the inset
**Rule:** When `fullScreenModal` is removed from a screen, replace `SafeAreaView edges={['bottom']}` with explicit `useSafeAreaInsets().bottom` padding.

### measure() vs measureInWindow inside ScrollView (S155)
**`measureInWindow` is PERMANENTLY BANNED inside a ScrollView.** It returns `{x:0, y:0, width:0, height:0}` because it's async and fires before the ScrollView commits its layout. No amount of `setTimeout` delay fixes this (S153 tried 50ms and still got 0,0,0,0).

**Correct pattern:** `measure()` called from within the wrapper's `onLayout` callback returns root-relative coordinates at a point when layout is already committed. Position a screen-level `<Modal transparent>` using those `pageX/pageY/width` values. Also re-measure on `onFocus` and `Keyboard.addListener('keyboardDidShow')` for scroll-shifted layouts.

Previous incorrect "Pattern Learned" told sessions to add a 50ms delay before `measureInWindow`. That advice is wrong and has been replaced.

### Overlays anchored to inputs inside ScrollView (S155)
**Absolute-positioned children of a `ScrollView` on iOS are unreliable.** iOS clips or paints-under absolute children regardless of zIndex. This is a React Native platform constraint, not a styling/stacking issue. S146 and S154 both tried inline absolute dropdowns and both failed in different builds.

**Correct pattern:** Render the overlay at screen-root level via `<Modal transparent>`, positioned with coordinates from `measure()` (see rule above). The `ClientLifestyleScreen.tsx` inline-absolute pattern works ONLY because its autocomplete lives outside a ScrollView — do not generalize that pattern to consumers that wrap the component in a ScrollView.

### fullScreenModal ancestor leak (S155)
`navigation.replace` and `navigation.navigate` do NOT escape a `fullScreenModal` ancestor on iOS native-stack. If ANY screen earlier in the stack is registered with `{ presentation: 'fullScreenModal' }`, every subsequent pushed/replaced/navigated screen inherits the modal presentation — even if those child screens have no `presentation` option of their own.

**Symptom:** A pushed screen appears as a bottom sheet with rounded corners, parent screen partially visible behind it, despite having no `presentation` option of its own.

**Correct fix: `CommonActions.reset` with a multi-route array.**
```ts
navigation.dispatch(
  CommonActions.reset({
    index: 1,
    routes: [
      { name: 'InboxList' },                           // preserved back-target
      { name: 'DealChatScreen', params: {...} },        // clean mount, no modal ancestor
    ],
  }),
);
```
`reset` rebuilds the stack from scratch — no ancestor to leak. `index: 1` makes the second route active while preserving the first as its back-target.

Previous incorrect "Pattern Learned" told sessions to "remove fullScreenModal from the screen registration". That was incomplete — it removes it from the wrong screen. The ancestor (e.g., `NewMessageScreen`) is where the leak originates, and removing its `fullScreenModal` may break intentional UX. Use `reset` instead.

### KAV owns keyboard spacing (S155)
Do NOT layer a `Keyboard.addListener` padding hack on top of `KeyboardAvoidingView behavior='padding'`. KAV already adds keyboard-height padding at its container's bottom edge when the keyboard opens. Adding a listener that mutates `paddingBottom` on a child View creates a race during the keyboard-hide animation: `keyboardWillHide` fires and immediately restores the static padding while KAV is still animating its own padding down — both add bottom space in the same frame, producing a ~34px gap flash for ~250ms.

**Correct pattern:** KAV owns all keyboard spacing. The input bar container uses a static `paddingBottom: insets.bottom + 8` that only accounts for the home indicator, never the keyboard.

---

## BUG-007 — Photo Thumbnails Blank, `photo_urls: []` in Supabase

**Screens affected:** PostJobWizard (repair job posting)
**Files:** `components/PostJobWizard.tsx`, `hooks/useData.ts`, `sql/schema.sql`
**Status:** 🟢 RESOLVED in S157

### Symptom
User selects photos in PostJobWizard — thumbnails show in UI. After submit, Supabase `jobs.photo_urls` = `[]`. No error surfaced.

### Root cause
Photo upload pipeline never existed. `form.photos` stored raw `expo-image-picker` local URIs; `handlePostJob` called `rpc_create_job` without passing photos; the RPC didn't accept a `p_photo_urls` param and its INSERT didn't touch `photo_urls` (default `'{}'`). Photos were held in state and dropped at submit.

### Fix (S157)
Two-phase write. Must be in this order because `job-photos` bucket RLS requires the job row to exist (`(storage.foldername(name))[1]::UUID` matched against `jobs.agent_id = auth.uid()`):
1. `rpc_create_job` returns `jobId`
2. Per photo: `FileSystem.readAsStringAsync(uri, Base64)` → `Uint8Array` → `supabase.storage.from('job-photos').upload('{jobId}/{i}.jpg', bytes, { contentType: 'image/jpeg', upsert: false })`
3. New `rpc_set_job_photos(p_job_id, p_photo_urls)` writes the collected storage paths to `jobs.photo_urls`

Partial upload failures are logged and skipped — job creation always wins. `job-photos` is private, so storage PATHS (not signed URLs) are persisted; signed URLs must be generated at display time via `createSignedUrl(path, expiresIn)`.

---

## BUG-008 — New Job Not Appearing in Active Jobs

**Screens affected:** HomeTabAgent (Active Jobs section)
**Files:** `components/HomeTabAgent.tsx`, `hooks/useData.ts`, `types/index.ts`, `sql/schema.sql`
**Status:** 🟢 RESOLVED in S157

### Symptom
Newly posted job has `status = 'open'` in Supabase but does not appear in HomeTabAgent Active Jobs. Trades (`["General Contractor","Electrical"]`) are valid `trades_enum` values — red herring.

### Root cause (three layers)
1. **Server filter.** `rpc_get_agent_active_jobs` restricted to `awarded | in_progress | pending_completion`. Newly-created `open` jobs were filtered out by design.
2. **Cache invalidation.** `useCreateJob.onSuccess` invalidated `['repair-jobs']` and `['agent-jobs']` but NOT `['agent_active_jobs']` (underscore key used by `useAgentActiveJobs`). Even if the server filter were correct, the home tab would not refetch until manual pull-to-refresh.
3. **Type narrowing.** `AgentActiveJob.status` was typed as the 3-value subset, so widening the RPC would not type-check on the client.

### Fix (S157)
- Supabase: widened `rpc_get_agent_active_jobs` status filter to `('open','bidding','awarded','in_progress','pending_completion')`.
- `useCreateJob.onSuccess` + new `useSetJobPhotos.onSuccess` both invalidate `['agent_active_jobs']`.
- `AgentActiveJob.status` widened to full `JobStatus` (all 8 values).
- `HomeTabAgent` added `JOB_STATUS_LABELS` entries (`open: 'Open for Bids'`, `bidding: 'Receiving Bids'`) and a new `JOB_STATUS_COLORS` map (`open`/`bidding` → `COLORS.jobGreen`, `awarded`/`in_progress` → `COLORS.secondaryText`, `pending_completion` → `COLORS.warningAmber`). Inline ternary replaced with map lookup.

---

## S157b — EditRepairJob + RepairJobDetails full wire

**Status:** 🟢 RESOLVED S157b

### What was broken (pre-S157b)
- EditRepairJob was pure `@demo` — `handleSave` navigated with mock data via nav params; `handleDelete` was `console.log`; photos were hardcoded placeholder strings; trades pre-fill used the legacy `job.category` single-string field; budget parsed out of a formatted display string; header was off-center; due date was a raw TextInput typed as MM/DD/YYYY.
- RepairJobDetails took a full `job` object via nav params (`useState(route.params.job)`) — always stale after edit. Photos treated `job.photo_urls` as ready-to-use URLs (broken for the private `job-photos` bucket after BUG-007). `bid_deadline` rendered as raw ISO string.
- `useUpdateJob` missed `['agent_active_jobs']` in its invalidation set — same class of gap BUG-008 patched for `useCreateJob`.
- ATL-120 latent bug: EditRepairJob declared its own local `TRADE_OPTIONS` array drifted from `trades_enum`.
- "Delete Job" button was a `@backend TODO` despite `rpc_cancel_job` being live at schema.sql:1274.

### Fix (S157b)
- **Route params:** both screens take `{ jobId: string }`. Live data via `useJob(jobId)`. HomeTabAgent active-jobs card and NotificationsTab deep links updated.
- **EditRepairJob rewrite:** pre-fill effect, signed-URL effect, absolute-centered header, `DateTimePicker`, real `<Image>` thumbnails, `ALL_TRADE_LABELS` from `lib/tradesMap.ts`, two-phase photo sync on save, cancel via `useCancelJob` → `rpc_cancel_job`.
- **RepairJobDetails:** live `useJob(jobId)` with local state snapshot preserved (keeps the 4 existing `@demo` optimistic bid handlers working unchanged — minimum blast radius). Signed-URL effect, formatted `bid_deadline`, loading guard placed after all hook calls.
- **tradesMap:** expanded `TRADE_LABEL_TO_ENUM` to the full `trades_enum` set (6 profile fixes + 19 identity mappings). Added `ALL_TRADE_LABELS`. Closes ATL-120 for EditRepairJob.
- **FormField:** added backwards-compat optional `placeholderTextColor` prop.
- **`useUpdateJob`:** now invalidates `['agent_active_jobs']`.
- **New hook:** `useCancelJob(jobId)` — wraps `rpc_cancel_job` (already live). Soft cancel; withdraws pending bids; ownership verified server-side.

### Non-obvious calls
- **6 `setJob(` call sites** in RepairJobDetails were audited. 4 are `@demo` optimistic bid handlers (`setTimeout` + `console.log`) that should call the real `useAcceptBid`/`useCounterBid`/`useRejectBid` hooks but don't. Preserved unchanged this session — new Notion ticket created.
- **Loading guard placement:** the early-return sits *after* all useState/useEffect/useRef calls to comply with rules-of-hooks.
- **Null-safety:** 7 handler sites use `job!.id` / `job!.title` non-null assertion. Safe because handlers only fire post-guard.

---

---

## BUG-011 — Dark Keyboard Flash on DealChatScreen Initial Load

**Status:** 🟡 Pending device verification

**Symptom:** When DealChatScreen first opens, the keyboard briefly renders dark before switching to the light keyboard. Occurs on initial screen load. Edit modal TextInput now works (Attempt 1 fixed that). Issue is on the main message composer.

**Screens affected:** DealChatScreen.tsx (main message composer)

**Root cause:** `autoFocus` fires during `CommonActions.reset` screen transition before the white background paints. iOS samples keyboard appearance at focus time and sees the dark transition background, falling back to system appearance. Once the screen fully renders, `keyboardAppearance="light"` takes effect and the keyboard switches — producing the visible dark→light flash.

**Previous attempts:**
- Attempt 1 (S159, commit fd26b05): Added `keyboardAppearance="light"` to message composer TextInput and edit modal TextInput. Edit modal: FIXED. Main message composer: FAILED — dark flash persists.
- Attempt 2 (S159, commit 0e23329): Added `keyboardAppearance="light"` to CreateDealChat TextInputs. Not the right screen for this bug.
- Attempt 3 (S159): Removed `autoFocus`, replaced with 350ms delayed focus via `useRef<TextInput>` + `useEffect`. Allows `CommonActions.reset` animation to complete and view tree to paint before iOS samples keyboard appearance.
- Attempt 4 (S159): Global `TextInput.defaultProps.keyboardAppearance = 'light'` set in `App.tsx` (module scope, before any component definition). Removed `inputRef` + delayed-focus `useEffect` from DealChatScreen entirely. No `autoFocus` — user taps to focus, consistent with iMessage/WhatsApp pattern. Status: 🟡 Pending device verification.

**What NOT to try again:**
- Simply adding `keyboardAppearance="light"` to the TextInput — already done, does not resolve the flash on initial screen load.
- Adding `keyboardAppearance="light"` alone without addressing `autoFocus` — the prop is correct but `autoFocus` fires before iOS can read it during screen transitions.
- Delayed focus via `setTimeout` (350ms, 600ms) — unreliable across devices, animation duration varies.
- `autoFocus` during `CommonActions.reset` transition — always samples dark compositor layer.

**Supporting evidence:**
- Edit modal TextInput has NO `autoFocus` and works correctly — user taps it after the modal has fully rendered
- Root SafeAreaView has `backgroundColor: COLORS.background` (#FFFFFF) — no dark surface
- Screen is a standard pushed card (InboxStack line 80–83), no modal presentation
- The flash only occurs on initial screen mount, not on subsequent focus events

---

### CTA placement inside KAV (S155)
CTA/submit buttons on form screens must always be **siblings of the ScrollView inside KeyboardAvoidingView**, never children of the ScrollView. This is how KAV pushes the CTA above the keyboard when a field is focused.

**SafeAreaView edge pairing with footer padding:**
- If SafeAreaView has `edges={['top','bottom']}`: footer uses fixed `paddingBottom: 16`
- If SafeAreaView has `edges={['top']}` only: footer uses `paddingBottom: insets.bottom + 16`
- NEVER both (double-count) and NEVER neither (CTA sits on home indicator)
