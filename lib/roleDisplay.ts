/**
 * lib/roleDisplay.ts
 * Single source of truth for role → human-readable label mapping.
 *
 * S146 permanent decision: the DB `display_role` column is unreliable.
 * Never read `profile.display_role` for display purposes.
 * Always use roleLabel(profile.role) or ROLE_DISPLAY[profile.role].
 *
 * @backend If new roles are added to the profiles.role enum in Postgres,
 * add them here before any screen can display that user's role label.
 *
 * Modified: S170 — extracted from components/ProfileTab.tsx
 */

export const ROLE_DISPLAY: Record<string, string> = {
  agent: 'Real Estate Agent',
  mortgage_pro: 'Mortgage Pro',
  title_escrow: 'Title & Escrow',
  home_inspector: 'Home Inspector',
  contractor: 'Contractor',
  appraiser: 'Appraiser',
  transaction_coordinator: 'Transaction Coordinator',
  attorney: 'Attorney',
  warranty: 'Home Warranty',
  home_stager: 'Home Stager',
  real_estate_photographer: 'Real Estate Photographer',
  other: 'Professional',
};

/**
 * Returns the human-readable label for a given role string.
 * Falls back to a capitalised version of the raw role if not in the map.
 * Never returns the raw DB display_role column value.
 */
export const roleLabel = (role: string): string =>
  ROLE_DISPLAY[role] ?? (role.charAt(0).toUpperCase() + role.slice(1));
