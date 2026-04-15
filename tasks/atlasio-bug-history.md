# Atlasio — Persistent Bug History
**Last updated:** S153 | April 14, 2026

This document tracks bugs that have required multiple fix attempts.
Use this before writing any fix prompt to avoid repeating failed approaches.

---

## BUG-001 — Address Autocomplete Dropdown Not Appearing

**Screens affected:** PostPhotoJobScreen, PostStagingJobScreen, PostJobWizard, CreateDealChat
**File:** `components/shared/AddressAutocompleteInput.tsx`
**Status:** 🔴 Unresolved as of Build 41

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

### Current hypothesis
`measureInWindow` consistently returns 0 because it's called before the component is fully laid out in the window coordinate space. The `onLayout` callback fires in local coordinates, and `measureInWindow` inside it may still be premature.

### S153 approach
Add 50ms delay inside `measureInput()` before calling `measureInWindow`. Add diagnostic `console.log` to confirm what values are returned. If width still 0 after delay, investigate `showAutocomplete` state — suggestions may not be populating.

### What NOT to try again
- zIndex/elevation bumps — doesn't escape ancestor clip contexts on iOS
- Changing `keyboardShouldPersistTaps` — already set to "handled" on all consumers
- Mock path changes — component always hits live API, no mock path exists

### Files to read before next fix attempt
- `components/shared/AddressAutocompleteInput.tsx` — full file
- Check `showAutocomplete` state transitions
- Check `suggestions` array population
- Console output from diagnostic log (Build 42)

---

## BUG-002 — ChatScreen Empty Space Below Input Bar

**Screen:** ChatScreen (`components/ChatScreen.tsx`)
**File:** `components/ChatScreen.tsx`, `components/InboxStack.tsx`
**Status:** 🔴 Unresolved as of Build 41

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

### S153 approach
Replace `<SafeAreaView edges={['bottom']}>` on input row with plain `<View>`. Add `paddingBottom: insets.bottom + 8` to the outer input bar container using `useSafeAreaInsets()`. This manually controls the inset without relying on SafeAreaView double-counting.

### Hard requirement (S152)
The comment block at the top of ChatScreen.tsx documents this pattern. It MUST be updated after S153 fix to reflect the corrected pattern. Future sessions: read the comment before touching ChatScreen.

### Key insight
`SafeAreaView edges={['bottom']}` behavior changes depending on whether the screen is presented as `fullScreenModal` or a standard pushed screen. After `fullScreenModal` removal, use explicit `insets.bottom` instead of relying on SafeAreaView edge handling.

---

## BUG-003 — CreateDealChat Opens as Sheet Instead of Full Screen

**Screen:** CreateDealChat (`components/CreateDealChat.tsx`)
**File:** `components/InboxStack.tsx`, `components/CreateDealChat.tsx`
**Status:** 🟡 Partially resolved — animation fix pending Build 42

### Symptom
After creating a deal chat, the DealChatScreen presents as a bottom sheet (slides up from bottom). Back navigation returns to wrong screen.

### Attempt 1 — S151b (navigation.replace)
**Approach:** Changed `navigation.navigate` → `navigation.replace` in `handleCreateChat`.
**Result:** Failed. `replace` within a `fullScreenModal` stack keeps the modal presentation on the new screen. Back still went to wrong place.

### Attempt 2 — S152 (remove fullScreenModal from CreateDealChat in InboxStack)
**Approach:** Removed `presentation: 'fullScreenModal'` from CreateDealChat screen registration.
**Result:** `fullScreenModal` confirmed removed (grep verified). But `animation: 'slide_from_bottom'` still present — causes sheet appearance even without fullScreenModal.
**Back navigation:** Unknown if improved since animation makes it hard to tell.

### S153 approach
Remove `animation: 'slide_from_bottom'` from CreateDealChat options in InboxStack. Let it inherit default `slide_from_right` animation from Stack.Navigator. This is the only remaining line causing the sheet appearance.

### What NOT to try
- `navigation.getParent()` approaches — adds complexity, not needed once animation is fixed
- `CommonActions.reset` — would clobber InboxList from the stack
- Changing DealChatScreen presentation — DealChatScreen itself is correct

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

## Patterns Learned

### SafeAreaView + fullScreenModal interaction
`SafeAreaView edges={['bottom']}` behaves differently depending on screen presentation mode:
- In `fullScreenModal`: SafeAreaView correctly handles bottom inset
- In standard pushed screen: SafeAreaView + navigation container double-counts the inset
**Rule:** When `fullScreenModal` is removed from a screen, replace `SafeAreaView edges={['bottom']}` with explicit `useSafeAreaInsets().bottom` padding.

### measureInWindow timing
`measureInWindow` called inside `onLayout` may still return 0 if the layout hasn't propagated to window coordinates yet. Use a 50ms `setTimeout` delay before calling `measureInWindow` to ensure layout is complete.

### Modal overlay for dropdowns in ScrollView
The `position: absolute` dropdown approach fails on iOS inside `ScrollView` regardless of zIndex. Modal overlay is the correct solution but requires valid `measureInWindow` coordinates. If coordinates are 0, the dropdown renders invisibly.

### navigation.replace in fullScreenModal stacks
`navigation.replace` within a `fullScreenModal` presentation keeps the modal layer active — the replaced screen inherits the modal presentation. To fix: remove `fullScreenModal` from the screen registration so replace works naturally as a standard stack operation.
