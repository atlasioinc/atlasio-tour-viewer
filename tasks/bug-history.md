# Bug History

Track every QA bug, what was attempted, what failed, and what finally worked.
Read this file before planning any fix for a bug listed here. Do NOT repeat failed
approaches — the goal is to converge on the working fix faster each build.

---

## BUG-001 — Address autocomplete dropdown not appearing on device ✅ RESOLVED S154

**Component:** `components/shared/AddressAutocompleteInput.tsx`
**Consumers:** PostPhotoJobScreen, PostStagingJobScreen, PostJobWizard, CreateDealChat
**First reported:** Build 39 QA
**Resolved:** Build 42 (S154)

### Root cause

The Modal + `measureInWindow` path chased the wrong problem. A working reference
already existed in the codebase — `components/ClientLifestyleScreen.tsx` renders
its Places-autocomplete dropdown as an **inline absolute-positioned View with
`zIndex: 99`** inside a `position:relative` wrapper, nested inside a ScrollView
with generous `paddingBottom`. It worked on device from day one because the
ScrollView gave the dropdown room to render and there was no stacking-context
conflict — only a clipping concern, which the parent padding solved.

The Modal detour in `AddressAutocompleteInput` introduced `measureInWindow`
timing races that never settled on first focus, producing zero-size or
never-visible dropdowns no amount of guards could compensate for.

### Attempts

1. **Build 39 (S151) — zIndex on dropdown View.** Added high `zIndex` to an
   inline dropdown View. **Result:** appeared to fail — later traced to
   consumers with tight ScrollView `paddingBottom` clipping the dropdown, not
   a stacking issue. Advisory "do NOT attempt plain zIndex" written here was
   wrong. **Refuted by Build 42.**
2. **Build 39 (S151b) — Modal overlay.** Moved dropdown into a React Native
   `Modal` with `measureInWindow` anchoring. **Result:** PARTIAL. Dropdown
   rendered at `{top:0, left:0, width:0}` on first focus.
3. **Build 40 (S152) — `width > 0` guard + remeasure.** **Result:** FAILED.
   `measureInWindow` still returned zeros before layout settled.
4. **Build 41 (S153) — 50ms setTimeout + diagnostic logs.** **Result:** still
   failing on device; logs confirmed `measureInWindow` was the race.
5. **Build 42 (S154) — Delete Modal path; inline absolute dropdown mirroring
   ClientLifestyleScreen.** Removed `Modal`, `measureInWindow`, `inputLayout`
   state, `onLayout`/`onFocus` remeasure, 50ms delay, all diagnostic logs, and
   the `width > 0` guard. Rendered dropdown inline as a sibling of the
   TextInput inside `<View position:relative>` with `top:52`, `zIndex:99`,
   `maxHeight:240`. **Result:** FIXED.

### The pattern that works

```tsx
<View style={{ position: 'relative' }}>
  <TextInput ... />
  {showAutocomplete && suggestions.length > 0 && (
    <View style={{
      position: 'absolute', top: 52, left: 0, right: 0, zIndex: 99,
      maxHeight: 240,
      backgroundColor: COLORS.background,
      borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
      ...SHADOWS.card,
      overflow: 'hidden',
    }}>
      {suggestions.map(...)}
    </View>
  )}
</View>
```

Consumers must give their outer ScrollView enough `contentContainerStyle.paddingBottom`
to clear the 240px dropdown max-height when the address field is near the bottom
of a form. All 4 current consumers verified S154.

### Do NOT attempt again

- React Native `Modal` + `measureInWindow` anchoring for an inline dropdown —
  the first-focus measurement race is unwinnable without hacks.
- Re-introducing the `width > 0` guard — not needed in the inline pattern.

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

## BUG-002b — ChatScreen input bar floats above keyboard on notched devices (Build 42) ✅ RESOLVED S154

**Component:** `components/ChatScreen.tsx`
**First reported:** Build 42 QA — continuation of BUG-002 after S153's SafeAreaView fix

### Root cause

With iOS `KeyboardAvoidingView behavior='padding'` + `keyboardVerticalOffset={0}`,
KAV adds `paddingBottom = keyboardHeight` when the keyboard opens. The keyboard
already covers the home-indicator area on notched devices. The input container's
static `paddingBottom: insets.bottom + 8 (≈42)` then renders as a ~34px gap
between the input bar and the top of the keyboard, and because that static
padding doesn't animate, the input visually "trails" the keyboard rise.

S153 fixed the **keyboard-closed** double-inset correctly. It did not fix the
**keyboard-open** case, which needed a second condition.

### Fix

Subscribe to `Keyboard.addListener` (`keyboardWillShow/Hide` on iOS,
`keyboardDidShow/Hide` on Android), store `keyboardVisible` in state, and
conditionally apply `paddingBottom: keyboardVisible ? 8 : insets.bottom + 8`
on the outer input container. `keyboardVerticalOffset` stays at `0` per the
hard-requirement lock in ChatScreen.tsx.

### Do NOT attempt again

- Changing `keyboardVerticalOffset` to `-insets.bottom` — breaks re-entry from
  attachments/compose modes and conflicts with the hard-requirement lock.
- Setting the input's `paddingBottom` to a single static value — there is no
  static value that correctly handles both the closed and open keyboard states.

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
   `slide_from_right`. **Result:** partial — navigation animation fixed, but the
   screen's internal chrome (plain `View` root with manual `insets.top`, title
   left-aligned with right-side `X` button) still *looked* like a bottom sheet on
   device, which read as "still modal" in Build 42 QA.
2. **Build 42 (S154) — Normalize header chrome to standard pushed-screen pattern.**
   Swapped root `View` → `SafeAreaView edges={['top']}`, removed manual
   `paddingTop: 8 + insets.top`, replaced the X button with a back chevron, and
   rebuilt the title row as `[Back 44×44][Title flex:1 centered][44×44 spacer]`.
   **Result:** FIXED.

### Do NOT attempt again

- Setting `animation: 'slide_from_bottom'` on a non-modal card screen — always
  makes it look like a sheet regardless of presentation.
- Keeping bottom-sheet header chrome (X button, left-aligned title, manual top
  inset math) on a screen after removing its `fullScreenModal` presentation —
  even with correct navigation, the chrome alone makes the screen read as modal.

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
