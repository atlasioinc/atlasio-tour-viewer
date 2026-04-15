# Bug History

Track every QA bug, what was attempted, what failed, and what finally worked.
Read this file before planning any fix for a bug listed here. Do NOT repeat failed
approaches — the goal is to converge on the working fix faster each build.

---

## BUG-001 — Address autocomplete dropdown not appearing on device

**Component:** `components/shared/AddressAutocompleteInput.tsx`
**Consumers:** PostPhotoJobScreen, PostStagingJobScreen, PostJobWizard, CreateDealChat
**First reported:** Build 39 QA

### Attempts

1. **Build 39 (S151) — zIndex on dropdown View.** Added high `zIndex` to the inline
   dropdown View to escape ScrollView/KeyboardAvoidingView stacking contexts.
   **Result:** FAILED. Dropdown still hidden behind other layers.
2. **Build 39 (S151b) — Modal overlay.** Moved dropdown into a React Native `Modal`
   with `transparent + statusBarTranslucent`, measured input via `measureInWindow`
   and anchored the dropdown absolutely. **Result:** PARTIAL. Dropdown sometimes
   rendered at `{top:0, left:0, width:0}` on first focus (invisible zero-size).
3. **Build 40 (S152) — `width > 0` guard + `onLayout` + `onFocus` remeasure.**
   Gated `dropdownVisible` on `inputLayout.width > 0`; added `onLayout` + `onFocus`
   remeasure calls. **Result:** FAILED on device. Dropdown still not appearing
   despite the code being structurally correct. Suspected: `measureInWindow`
   returning `{0,0,0,0}` before layout settles.
4. **Build 41 (S153) — 50ms delay + diagnostic logs.** Wrapped `measureInWindow`
   in `setTimeout(..., 50)` to let layout settle; added `__DEV__`-gated console
   logs inside the measure callback and at render time tracking `dropdownVisible`,
   `showAutocomplete`, `suggestions.length`, and `inputLayout`. **Result:** PENDING
   device verification on Build 42. Diagnostic-first — decision on a deeper fix
   waits for actual `measureInWindow` return values from device logs.

### Do NOT attempt again

- Plain `zIndex` on dropdown View without Modal overlay — stacking contexts block it.
- `measureInWindow` without a delay — returns `{0,0,0,0}` intermittently on first focus.
- Removing the `width > 0` guard — reintroduces the zero-size invisible flash.

---

## BUG-002 — ChatScreen empty space below input bar

**Component:** `components/ChatScreen.tsx`
**First reported:** Build 40 QA (regression after S151/S152)

### Root cause

After S151/S152 removed `fullScreenModal` presentation from `ChatScreen` in
`InboxStack.tsx`, the screen started inheriting the navigator's safe-area context.
The existing inner `<SafeAreaView edges={['bottom']}>` wrapper on the input row
then double-counted the bottom inset (once from the stack, once from the inner
SafeAreaView), leaving a strip of empty space below the input bar on notched
devices.

Under `fullScreenModal` the modal layer sat outside the safe-area context, so the
inner SafeAreaView was the only inset owner and worked correctly. Removing
`fullScreenModal` flipped the invariant.

### Attempts

1. **Build 40 (S152) — "no structural fix required."** Audited the KAV structure,
   confirmed it matched the canonical pattern, and added a hard-requirement comment
   block locking it. **Result:** FAILED — the bug was the SafeAreaView itself, not
   the KAV. The lock prevented regression in the wrong direction.
2. **Build 41 (S153) — Replace inner SafeAreaView with plain View; move inset to
   outer container.** Added `useSafeAreaInsets()` hook, swapped
   `<SafeAreaView edges={['bottom']}>` → `<View>`, and set the outer input container
   to `paddingBottom: insets.bottom + 8`. Updated the hard-requirement comment block
   to reflect the new structure. **Result:** FIXED (pending Build 42 device verify).

### Do NOT attempt again

- Wrapping the input row in `<SafeAreaView edges={['bottom']}>` inside a non-modal
  stack screen — double-counts the inset.
- Changing `keyboardVerticalOffset` away from `0` — breaks input bar position when
  keyboard opens.
- Adding `edges={['top']}` to the inner row — inner SafeAreaView is not the inset
  owner; the outer container is.

---

## BUG-003 — CreateDealChat still animates as sheet

**Component:** `components/InboxStack.tsx`
**First reported:** Build 41 QA

### Root cause

S151b removed `presentation: 'fullScreenModal'` from the `CreateDealChat` screen
registration, but left `options={{ animation: 'slide_from_bottom' }}` behind. The
screen then used the default card presentation but still slid up from the bottom,
which visually read as a sheet even though structurally it was a card.

### Attempts

1. **Build 41 (S153) — Remove `animation: 'slide_from_bottom'`.** One-line change:
   deleted the entire `options` prop so the screen inherits the navigator's default
   `slide_from_right`. **Result:** FIXED.

### Do NOT attempt again

- Setting `animation: 'slide_from_bottom'` on a non-modal card screen — always
  makes it look like a sheet regardless of presentation.

---

## BUG-004 — SuccessToast too small and positioned too low

**Component:** `components/shared/SuccessToast.tsx`
**First reported:** Build 40 QA

### Root cause

Toast was rendered at the bottom of the screen (`bottom: insets.bottom + 32`),
competing visually with the bottom tab bar and CTAs. Users missed it entirely.

### Attempts

1. **Build 41 (S153) — Reposition to top of screen.** Changed initial `slideAnim`
   from `100` → `-80` (slides DOWN from above); replaced `bottom: insets.bottom + 32`
   with `top: insets.top + 8`; added `minHeight: 48` for a more visible container.
   Kept same spring values (speed 14, bounciness 6) and 3000ms auto-dismiss.
   Updated header comment to reflect new direction. **Result:** FIXED.

### Do NOT attempt again

- Placing the toast near interactive bottom UI — users treat it as a modal and miss it.
- Making the bottom toast physically larger instead of repositioning — competes with CTAs.

---

## BUG-005 — HomeTabAgent repairs section (NOT A BUG)

**Status:** Intentional dual-path design — do not attempt to fix.

`HomeTabAgent.tsx` derives `hasActiveRepair` via two branches:
- `USE_MOCK_DATA: true` → uses the `isFilled` toggle for demo
- `USE_MOCK_DATA: false` → derives from live query data

S151 collapsed this into a single live-data expression and broke the mock "filled"
demo state. S152 restored the dual-path. Do NOT collapse these branches — they
serve different purposes (demo toggle vs live query).
