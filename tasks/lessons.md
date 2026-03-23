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

## Known terminal warning — not a bug

"Each child in a list should have a unique key prop" from HomeTabAgent ScrollView —
investigated S103b, all 7 .map() calls confirmed to have unique keys.
Source is React Navigation internals, not app code. Safe to ignore permanently.

