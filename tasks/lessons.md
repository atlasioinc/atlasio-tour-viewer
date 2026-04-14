# Lessons Learned

Updated after each correction.

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

## Known terminal warning — not a bug

"Each child in a list should have a unique key prop" from HomeTabAgent ScrollView —
investigated S103b, all 7 .map() calls confirmed to have unique keys.
Source is React Navigation internals, not app code. Safe to ignore permanently.

