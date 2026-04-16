# Lessons Learned

Updated after each correction.

## RULE — fullScreenModal ancestor leak (added S155, April 15 2026)

`navigation.replace` does NOT escape a `fullScreenModal` ancestor on iOS native-stack.
If ANY screen earlier in the stack is registered with `{ presentation: 'fullScreenModal' }`,
every subsequent pushed/replaced screen on iOS inherits the modal presentation — even if
those child screens have no `presentation` option of their own. You'll see the destination
render as a sheet with rounded corners, with the underlying view still partially visible.

**Symptom:** A pushed screen appears as a bottom sheet or card modal instead of a full-screen
slide-from-right, despite having no `presentation` option and no `animation: 'slide_from_bottom'`.
Check the `Stack.Navigator` for a `fullScreenModal` ancestor — that's the leak.

**Wrong fixes (all tried in BUG-003 S151b–S154 and all failed):**
- `navigation.replace` from the descendant (inherits the modal)
- Removing `presentation` from the descendant (the parent still leaks)
- Changing `animation` on the descendant (animation ≠ presentation)
- Changing chrome (chevron → X or vice versa — cosmetic, doesn't fix the sheet look)

**Correct fix: `CommonActions.reset` with a preserved back-target.**
```ts
navigation.dispatch(
  CommonActions.reset({
    index: 1,
    routes: [
      { name: 'InboxList' },        // preserved back-target
      { name: 'DealChatScreen', params: {...} },  // clean mount, no modal ancestor
    ],
  }),
);
```
`reset` rebuilds the stack from scratch, so there's no ancestor to leak. `index: 1`
makes the second route active while keeping the first as its parent for back-nav.

**BUG-003 cost:** 4 sessions (S151b, S152, S153, S154) of failed fixes before this rule
was established. S152 even wrote "would clobber InboxList" in "What NOT to try" about
`CommonActions.reset` — that warning was wrong; reset works fine with a multi-route array.

## RULE — KAV owns keyboard spacing (added S155, April 15 2026)

Do NOT layer a `Keyboard.addListener` padding hack on top of `KeyboardAvoidingView`
with `behavior='padding'`. KAV already adds keyboard-height padding at its container's
bottom edge when the keyboard opens. Adding a listener that mutates `paddingBottom` on
a child View creates a race during the keyboard-hide animation: `keyboardWillHide` fires
and immediately restores the static padding while KAV is still animating its own padding
down. Both add bottom space in the same frame, producing a gap flash (~34px for ~250ms
on iOS).

**Correct pattern for a screen with an input bar pinned above the keyboard:**
```
SafeAreaView edges={['top']}
 └ KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={0} flex:1
    ├ Header
    ├ ScrollView flex:1   (content)
    └ View (input bar, paddingBottom: 8)   ← FIXED, NO insets
```
- Input bar is a direct child of KAV, outside ScrollView
- `paddingBottom` is FIXED at 8 (chat) or 16 (form CTA) — **no `insets.bottom`**
- KAV pushes the input bar up naturally when the keyboard opens
- iOS automatically handles the home indicator inset when the keyboard is visible
- NO `Keyboard.addListener` padding logic

**S159 update — never `edges={['bottom']}` on any SafeAreaView inside a KAV screen. Never `insets.bottom` on input/CTA containers. KAV `padding` owns all keyboard + safe-area spacing. Input/CTA `paddingBottom: 8` (chat) or `16` (form CTA) fixed — iOS handles the home indicator automatically when the keyboard is visible.**

This corrects the S155 guidance above, which said `insets.bottom + 8` was correct. It wasn't — the inset produced a ~34pt gap below the input on notch devices when the keyboard was open, because KAV already positions the container against the keyboard and iOS covers the home-indicator area with the keyboard itself. Fixed `paddingBottom: 8` (or 16 for form CTAs) is the permanent answer.

**Applies to:** ChatScreen, DealChatScreen, CreateDealChat, and every future chat/form screen with a pinned input bar or CTA.

**BUG-002/003/006 cost:** 5 sessions (S120a, S140/S141a, S146, S151–S153, S154, S155) of failed fixes before S159 nailed the real rule. S154 tried the listener approach. S155 tried static `insets.bottom + 8`. Both added bottom space KAV cannot cancel.

## RULE — CTA placement inside KAV (added S155, April 15 2026)

CTA/submit buttons on form screens must always be **siblings of the ScrollView inside
KeyboardAvoidingView**, never children of the ScrollView. This is how KAV pushes the CTA
above the keyboard when a field is focused.

**Correct pattern:**
```
SafeAreaView edges={['top', 'bottom']}
 └ KeyboardAvoidingView behavior='padding' keyboardVerticalOffset={0}
    ├ Header
    ├ ScrollView flex:1 keyboardShouldPersistTaps="handled"
    │   (form fields)
    └ View (CTA container, paddingBottom: 16)   ← sibling of ScrollView
```

**Key pairing with SafeAreaView:**
- If SafeAreaView has `edges={['top','bottom']}`: footer uses fixed `paddingBottom: 16`
- If SafeAreaView has `edges={['top']}` only: footer uses `paddingBottom: insets.bottom + 16`
- NEVER both (double-count) and NEVER neither (CTA sits on home indicator)

Verified screens: `CreateDealChat` (S155), `PostPhotoJobScreen` (reference).

## RULE — measure() vs measureInWindow inside ScrollView (added S155, April 15 2026)

`measureInWindow` called inside a ScrollView returns `{x:0, y:0, width:0, height:0}`
because it's async and fires before the ScrollView commits its layout. No amount of
`setTimeout` delay reliably fixes this (tried 50ms, 200ms — still races).

**Correct pattern for absolute-positioned overlays anchored to an input inside a ScrollView:**

1. Attach a `ref<View>` to a wrapper View around the anchor.
2. Attach `onLayout={measureWrapper}` to that wrapper.
3. Inside `measureWrapper`, call `wrapperRef.current?.measure((_x, _y, w, h, pageX, pageY) => {...})`.
4. Use `pageX/pageY` (root-relative coordinates) to position an absolute element inside a
   screen-level `<Modal transparent>`.
5. Also call `measureWrapper` on `onFocus` and `Keyboard.addListener('keyboardDidShow')` so
   the overlay reflows when the scroll container shifts.

**Why:** `onLayout` fires after layout commits, so `measure()` called inside it returns
valid coordinates. `measure()` is root-relative (what Modal positioning needs) whereas
`measureInWindow` is window-relative AND async-unsafe in this context.

**Also banned:** absolute-positioned View as a sibling inside a ScrollView. iOS clips or
paints-under regardless of zIndex — platform constraint, not a styling issue.

BUG-001 cost: 4 sessions (S146, S151, S152, S153) of failed fixes before this rule was
established. Applies to: AddressAutocompleteInput dropdown, any future anchored overlay.

## RULE — RPC Consumer Audit (added S101, March 23 2026)

Before committing ANY hook wired to a live RPC for the first time:

1. **Verify field names match TypeScript type exactly.**
   Check every field in the RPC JSON response against the TypeScript interface.
   `name` vs `partner_name`, `avatar_color` vs `partner_avatar_color` — any
   mismatch crashes silently on render.
   Also update mock data keys to match live field names.

2. **Add ?? [] to all array fields not guaranteed by the RPC response.**
   Any array property accessed with .filter(), .map(), .some(), .reduce(),
   or .length must have a null guard: (partner.milestones ?? []).filter(...)

3. **Add ?? '' to all string fields accessed with string methods.**
   Any string property accessed with .charAt(), .slice(), .toUpperCase(),
   .toLowerCase(), .split(), .trim() must have a null guard:
   (partner.name ?? '').charAt(0)

4. **Audit ALL consumer files — not just the hook file.**
   Search for the data type name across the entire codebase.
   Fix every file that accesses fields on the returned type.

S100 cost: 3 back-to-back crashes, 3 hotfixes, 8 files changed.
This rule prevents the entire class of bug.

## RULE — Never use non-null assertion (!) on hook data (added S104, March 23 2026)

Replace all `data!.property` and `array!.map()` patterns with
`(data ?? []).map()` or `(data ?? {})` defensive guards.
The `!` operator trusts that data is never null — live RPCs can return null
for empty results even when COALESCE is in the RPC body.
S104: `activeDeals!.map()` crashed when partner test user had no agent deals.

## RULE — Connection ID ≠ Profile ID (added S107, March 23 2026)

When querying the `connections` table, `connections.id` is the connection ROW UUID —
NOT a user profile UUID. Never pass `connections.id` as a user identifier to any RPC
that expects a `profiles.id` foreign key.

Always use:
- `requester_id` or `responder_id` for the actual profile UUID, OR
- The joined profile object's `.id` field (e.g., `conn.profile.id` from a
  `profile:profiles!responder_id(*)` join)

Before using any `.id` field as a `recipientId` or user identifier, verify what the
field actually refers to by tracing the data from the Supabase query through any
adapter functions to the navigation call site. Do NOT assume — read the query.

S107 cost: 3 debug sessions (S106c–S107b) to trace a single wrong UUID field.

## Auth Session Switch (S111)
When a user logs out and a different user logs in, ALL cached data must be cleared:
- queryClient.clear() on signOut
- Reset demoRole state to default
- Profile query key should include user ID to prevent cross-user cache hits
Without this, the second user sees the first user's data and role.

The specific bug: onAuthStateChange handler checked `!session` before `event === 'SIGNED_OUT'`.
Since sign-out sends session=null, the null guard returned early and `queryClient.clear()` was
never reached. Fix: check SIGNED_OUT event first, then the null guard.

## RULE — Role constants must use Supabase snake_case values, not display labels (added S122c, March 30 2026)

Any component constant that feeds a role value into a hook, filter, or query
(e.g. `useConnectedPros(role)`) must use the Supabase `profiles.role` snake_case
value — NOT a display label. Display strings belong in `label` fields only.

Root cause: `SQUAD_SLOTS` in `HomeTabAgent.tsx` used `role: 'Mortgage Pro'` and
`role: 'Title/Escrow'`. The `useConnectedPros(role)` hook filters by
`c.profile?.role === role` against Supabase `profiles.role` which stores
`'mortgage_pro'` and `'title_escrow'`. Exact string mismatch → empty picker sheet.
Fixed by separating `label` (display) from `role` (DB key) across 3 files.

Pattern to follow:
```typescript
// ✅ CORRECT — label for display, role for DB/filter
const SQUAD_SLOTS = [
  { id: 'mortgage', label: 'Mortgage Pro', role: 'mortgage_pro' },
  { id: 'title',    label: 'Title Officer', role: 'title_escrow' },
];

// ❌ WRONG — display string used as filter value
const SQUAD_SLOTS = [
  { id: 'mortgage', label: 'Mortgage Pro', role: 'Mortgage Pro' },
  { id: 'title',    label: 'Title Officer', role: 'Title/Escrow' },
];
```

Applies to: Any constant, slot definition, or config object where a `role` field
flows into `useConnectedPros()`, `useAgentPartnerConnections()`, or any hook that
compares against `profiles.role` in Supabase.

## RULE — Role string format in adapters and component logic (added S125a, April 1 2026)

Always use snake_case DB values (`mortgage_pro`, `title_escrow`) in component logic
and type adapters. Never map to display labels (`Mortgage Professional`, `Title & Escrow`)
in `adaptConnection*` functions — display labels are for rendering only, never for
filtering or comparison logic.

Root cause: `adaptConnectionToSquadCandidate` mapped `conn.profile.display_role` to the
`role` field on `SquadProCandidate`. SquadSlotPicker then filtered `p.role === role` using
the snake_case slot role against the display string — exact mismatch → empty picker.

Pattern: any `adaptX()` function that produces a `role` field consumed by a filter or
hook must use `conn.profile.role` (snake_case), not `conn.profile.display_role`.

## ✅ RESOLVED — Contractor Trades Save — ATL-CONTRACTOR-TRADES (S148a, April 14 2026)

- Root cause confirmed: `TRADE_OPTIONS` in `EditProfileScreen.tsx` used UI display labels that did not match `trades_enum` values in Postgres.
- Fix (Option C — bidirectional mapping layer):
  - New shared file `lib/tradesMap.ts` exports `TRADE_LABEL_TO_ENUM` + `TRADE_ENUM_TO_LABEL`.
  - `EditProfileScreen.tsx handleSave` translates UI labels → DB enum values before the `useUpdateProfile` mutation.
  - `EditProfileScreen.tsx` pre-fill `useEffect` reverse-maps DB enum values → UI labels so chip selection state matches `TRADE_OPTIONS`.
  - `ProfileTab.tsx` Z1 hero trade pill reverse-maps `profileTrade` (was rendering raw DB enum values, e.g. `Plumbing`, now renders `Plumber`).
- Agent flow unchanged — `trades` still sent as `null` for agents.
- Verified `General Contractor` and `HVAC` are identity mappings against `sql/schema.sql:109–123` (trades_enum).

## Known Latent Bug — ATL-CONTRACTOR-TRADES-2 (deferred, logged S148a)

EditRepairJob.tsx and PostJobWizard.tsx both declare independent TRADE_OPTIONS arrays
that may write to trades_enum columns. Same mismatch pattern as ATL-CONTRACTOR-TRADES.
Audit and apply mapping layer (import from `lib/tradesMap.ts`) in a dedicated session
before production launch.

## RULE — `components/shared/index.ts` is NOT the full shared-component list (added S148b, April 14 2026)

Before claiming "no shared X component exists," check BOTH:
1. `components/shared/index.ts` (barrel — Avatar, Verification*, Skeleton, PhotoLightbox, ErrorToast, AddressAutocompleteInput)
2. `components/*.tsx` at root — these are still shared, just not barrel-exported yet:
   - `components/Button.tsx` — primary/secondary/danger/counter variants (the real one)
   - `components/ScreenHeader.tsx`
   - `components/DisplayTag.tsx`
   - `components/PortfolioGallery.tsx`

CLAUDE.md Shared Components section (line ~496) is the source of truth — read it before concluding a shared component doesn't exist.

**S148b cost:** "View All on Map" CTA on `NeighborhoodMatchScreen.tsx` was built with an inline styled `Pressable` because I only checked the barrel. `Button` from `components/Button.tsx` should have been imported instead. Minor deviation, flagged in the session report, not worth a retroactive fix but worth preventing next time.

Pattern: when a spec says "use shared Button", `grep -l "export.*Button" components/ lib/` first.

## RULE — `showSuccess` from `useSuccessToast` collides with local state in JobCompletionScreen (added S149b, April 14 2026)

`JobCompletionScreen.tsx` declares a local `const [showSuccess, setShowSuccess] = useState(false)`
for its in-screen success overlay (separate from the shared SuccessToast system).

When importing the shared toast hook, alias the destructure to avoid a redeclare error:

```typescript
const { successMessage, showSuccess: showSuccessToast, clearSuccess } = useSuccessToast();
```

Generally, before destructuring `showSuccess` from `useSuccessToast`, grep the file for
`showSuccess` first — any screen with its own success overlay state will collide.
The two systems are deliberately separate (in-screen overlay vs root toast); don't merge them.

## RULE — Shared empty-state component default `flex: 1` collapses in ScrollView (added S149a, April 14 2026)

`components/shared/EmptyState.tsx` defaults to `flex: 1` so it can take over a screen.
Inside a `ScrollView` (or any container that doesn't size flex children), the component
collapses to zero height and renders nothing visible.

When using `<EmptyState />` inside a scroll container or section card, pass
`style={{ flex: 0, paddingVertical: 32 }}` to override. Used in: RepairJobDetails bids
section, VouchFeedSection, ProfileTab vouches bottom sheet.

Alternative for full-screen takeover inside a scroll: wrap in `<View style={{ minHeight: 480 }}>`
(used in ContractorHomeTab `!isFilled` branch).

## LOADING STATE RULE (added S151, April 14 2026)

Never use mock data as a render fallback when `USE_MOCK_DATA: false`. Gate all
data-dependent renders on the hook's loading state before falling through to an
empty state.

Pattern:
```typescript
const { data, isLoading, isFetching } = useHook();
if (isLoading || isFetching) return <SkeletonBlock ... />;
if (!data?.length) return <EmptyState ... />;
return <RealContent data={data} />;
```

Anti-pattern that caused the Build 39 "demo→live flash":
```typescript
// WRONG — falls back to MOCK_DATA while query resolves, then swaps to live
const prosSource = USE_MOCK_DATA ? MOCK : (liveData?.map(adapt) ?? MOCK);
```

Correct: empty array during load, skeleton gate on `isLoading || isFetching`,
then empty state on settled + no results. Applied to `SquadSlotPicker`,
`VouchFeedSection`, `AgentDealsScreen`, `HomeTabAgent` active jobs in S151.

## RULE — SafeAreaView(bottom) double-counts inset inside a native stack screen without fullScreenModal (added S153, April 15 2026)

When a screen is registered in a `@react-navigation/native-stack` stack with the
default `card` presentation (no `fullScreenModal`), the screen already sits inside
the navigator's safe-area context. Wrapping the bottom input row in
`<SafeAreaView edges={['bottom']}>` then double-counts the bottom inset, leaving
empty space below the input bar on notched devices.

Pattern to follow:
- Bottom inset is owned by the OUTER container's `paddingBottom: insets.bottom + 8`
  via `useSafeAreaInsets()`.
- The input row itself is a plain `<View>`, never a SafeAreaView.
- Top inset still uses `<SafeAreaView edges={['top']}>` on the screen root — that
  one does NOT double-count.

S153 cost: Build 40 regression after S151/S152 removed `fullScreenModal` from
`CreateDealChat` / `ChatScreen`. The pre-existing `SafeAreaView edges={['bottom']}`
input row was fine under fullScreenModal (modal layer was outside safe-area
context) but started double-counting once the card presentation took over.

Applies to: any screen transitioning away from `fullScreenModal` to default card
presentation. Audit all `SafeAreaView edges={['bottom']}` usage in that screen.

## HARD REQUIREMENT — ChatScreen keyboard pattern (S152, April 14 2026; updated S153, S154)

```
SafeAreaView(top) > KAV(padding, offset:0, flex:1)
  > Header View
  > Body (ScrollView or empty View, flex:1)
  > View(input container, paddingBottom: keyboardVisible ? 8 : insets.bottom + 8)
    > View(input row — plain View, NOT SafeAreaView)
```

`keyboardVerticalOffset` MUST be `0` after `fullScreenModal` was removed from
`CreateDealChat` / `ChatScreen` registration in `InboxStack.tsx` (S151/S152).

The bottom inset is owned by the outer input container via `useSafeAreaInsets()`
paddingBottom — NEVER by a `SafeAreaView edges={['bottom']}` wrapper on the input
row (that double-counts the inset when keyboard is closed; see S153 rule above).

**S154 addition — keyboardVisible state:** With iOS `behavior='padding'`, KAV
adds `paddingBottom = keyboardHeight` when the keyboard opens. The keyboard
already covers the home-indicator area on notched devices, so the static
`insets.bottom + 8` double-counts the notch and leaves a ~34px gap between the
input bar and the keyboard. Fix: subscribe to `Keyboard.addListener` and drop
`paddingBottom` to `8` while the keyboard is visible.

```typescript
const [keyboardVisible, setKeyboardVisible] = useState(false);
useEffect(() => {
  const showSub = Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
    () => setKeyboardVisible(true),
  );
  const hideSub = Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
    () => setKeyboardVisible(false),
  );
  return () => { showSub.remove(); hideSub.remove(); };
}, []);
// then: paddingBottom: keyboardVisible ? 8 : insets.bottom + 8
```

Never alter this structure. Any regression (empty space below input when keyboard
open OR closed, or input hidden by keyboard): restore this exact pattern.
**Do not** "fix" by changing `keyboardVerticalOffset` to a non-zero value —
breaks re-entry from attachments/compose modes.

## S157 — Two-phase uploads to private buckets + sibling-list cache keys

### `job-photos` is private — store paths, not signed URLs
Private Supabase Storage buckets require signed URLs to read, but signed URLs **expire**.
Persisting a signed URL in `jobs.photo_urls` means the link dies after the TTL and the
photo viewer breaks. Store the storage PATH (e.g. `{jobId}/0.jpg`), and generate a fresh
signed URL at display time with `createSignedUrl(path, expiresIn)`. This also cleanly
matches the RLS policy, which is path-scoped (`(storage.foldername(name))[1]::UUID`).

### Two-phase write order is forced by RLS
For `job-photos`, the insert policy requires the `jobs` row to already exist. Any "upload
then create" flow fails RLS. Always: `rpc_create_job` → upload under `{jobId}/...` →
`rpc_set_job_photos`. Never try to pass photo bytes into the creation RPC — pushes complexity
into plpgsql and can't use RLS-scoped storage anyway.

### Invalidate every sibling list that reads the same table
`useCreateJob` was invalidating `['repair-jobs']` and `['agent-jobs']` but not
`['agent_active_jobs']`, so Home tab stayed stale after a successful create. When adding a
new read hook that touches `jobs`, audit every mutation that writes `jobs` and add the new
key to its `onSuccess` invalidation list. Underscore vs hyphen in query keys matters —
`['agent_active_jobs']` ≠ `['agent-active-jobs']`.

### Narrowed type unions block server filter widening
`AgentActiveJob.status` was typed as `'awarded'|'in_progress'|'pending_completion'`. When
the server RPC filter was widened to include `open`/`bidding`, the client would not
type-check until the union was widened too. Prefer aliasing a shared enum (`JobStatus`)
for row types that come from a server-side filter you might later change.

## S157b — tradesMap single source of truth, scope-decision surfacing, signed URLs

### `lib/tradesMap.ts` is the single source of truth for trade label↔enum mapping
Never declare local `TRADE_OPTIONS` arrays in component files. ATL-119 (contractor profile) and ATL-120 (EditRepairJob/PostJobWizard) both originated from drifted local arrays. The map now exports `TRADE_LABEL_TO_ENUM`, `TRADE_ENUM_TO_LABEL`, and `ALL_TRADE_LABELS`. New screens that need a trade chip grid must import from `lib/tradesMap.ts`.

**Why:** drift between component-local arrays and the Postgres `trades_enum` silently corrupts saves — Postgres rejects the enum cast, the error gets swallowed by an adjacent try/catch, and the UI reports fake success. We've now had this bug twice.

**How to apply:** on new screens, `import { ALL_TRADE_LABELS, TRADE_LABEL_TO_ENUM, TRADE_ENUM_TO_LABEL } from '../lib/tradesMap';`. Use `ALL_TRADE_LABELS` for the chip grid. Map label→enum at save, enum→label at load. Never inline a new trade list.

### Always surface UX-impacting scope decisions — never silently defer
If a prompt instructs an approach that conflicts with a file's actual state, STOP and flag. S157b nearly shipped with a broken `ALL_TRADE_LABELS` import because the prompt assumed the export existed — surfaced as a blocker before writing code, user chose Option A, and ATL-120 got closed as a side-effect.

**Why:** silently working around missing exports leaves the codebase in a worse state than flagging. The user has context you don't about whether to expand the missing piece or work around it.

**How to apply:** when the prompt's stated state doesn't match the file's actual state, ask. Don't paper over. "The export you named doesn't exist — options: A/B/C" beats "quietly wrote TRADE_OPTIONS inline again."

### Private Supabase buckets: store paths, generate signed URLs at display time
`job-photos` is private. Persisting signed URLs in `jobs.photo_urls` would break after the TTL. Always write storage paths to the DB and call `createSignedUrl(path, 3600)` per path at mount time in a `useEffect` with a cancellation guard.

**Why:** signed URL TTLs. A URL generated on Monday dies by Friday.

**How to apply:** any screen that renders `photo_urls` from a private bucket needs a local `const [signedUrls, setSignedUrls] = useState<string[]>([])` + effect that iterates paths and calls `createSignedUrl`. Pattern used by EditRepairJob and RepairJobDetails (S157b).

### Loading guards in components with many hooks: place after all hook calls
If you need `if (!data) return <Spinner />` in a component that has 10+ hooks (useState/useEffect/useRef/useMemo/useCallback), place the early return AFTER all hook calls. Otherwise you violate rules-of-hooks — later hooks won't run on loading renders but will on subsequent renders, causing ordering bugs.

**Why:** React hooks are position-tracked. Skipping hooks on loading renders creates a different hook order than post-load renders, which React detects and errors on.

**How to apply:** move the `if (!data)` guard to just before the final `return (...)`. Use optional chaining or `data?.field ?? fallback` for any derived values in hook dependencies. Use `data!` non-null assertions inside event handlers (they only fire post-guard).

## S158 — Never use `toISOString().split('T')[0]` for date-only fields

`toISOString()` converts to UTC. A date picked as May 30 at midnight in Mountain
Time (UTC-6/7) becomes May 29 in UTC — the job saves off-by-one. Every
negative-offset timezone sees this bug, silently.

**Why:** JavaScript `Date` stores a wall-clock instant; `toISOString` rebases
to UTC before stringifying, and the date portion gets shifted by the timezone
offset. The user sees the wrong day even though they picked the right one.

**How to apply:** construct `YYYY-MM-DD` from local date components:
```ts
`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
```
No UTC involvement. Works in every timezone. First fix shipped S158
(EditRepairJob handleSave). Any new date-only write must use this pattern —
never `toISOString`.

## RULE — Primary CTA button pattern (added S159, April 16 2026)

Primary CTA buttons must match the PostPhotoJobScreen canonical pattern:
- `borderRadius: 12` — NOT `9999` (pill shape is for pills/chips, not CTAs)
- `paddingVertical: 15` — NOT fixed `height: 50/52`
- Active: `backgroundColor: COLORS.primary`
- Disabled: `backgroundColor: COLORS.disabledBg`
- Text: `fontSize: 16, fontWeight: '600', color: COLORS.onPrimary` (active) / `COLORS.disabledText` (disabled)
- Press feedback: `opacity: pressed && isValid ? 0.9 : 1`
- `lineHeight: 20` on button text

**Why:** S159 audit found CreateDealChat and DealChatScreen using `borderRadius: 9999` pill buttons as primary CTAs — inconsistent with PostPhotoJobScreen reference pattern and visually mismatched.

**How to apply:** before building any new CTA, read PostPhotoJobScreen.tsx sticky submit button (lines ~484–503). Match exactly. Broader CTA audit ticket created — ATL-CTA-AUDIT.

## Known terminal warning — not a bug

"Each child in a list should have a unique key prop" from HomeTabAgent ScrollView —
investigated S103b, all 7 .map() calls confirmed to have unique keys.
Source is React Navigation internals, not app code. Safe to ignore permanently.

