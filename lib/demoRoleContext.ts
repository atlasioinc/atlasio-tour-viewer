// ═══════════════════════════════════════════════════════════════
// lib/demoRoleContext.ts
// Shared context for demo role switching (Agent ↔ Contractor)
//
// Extracted from BottomTabNavigator to break circular import:
//   ProfileTab → BottomTabNavigator → ProfileStack → ProfileTab
//
// Used by:
//   - BottomTabNavigator.tsx (provides DemoRoleContext.Provider)
//   - ProfileTab.tsx (consumes useDemoRole hook)
//
// @demo — entire file removed at production launch.
//         Replace useDemoRole calls with live profile.role from Supabase.
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext } from 'react';

// @demo — role type for demo switcher toggle
// 'partner' only available when PARTNER_TRACK_ENABLED === true (S62)
export type DemoRole = 'agent' | 'contractor' | 'partner';

export interface DemoRoleContextType {
  demoRole: DemoRole;
  toggleRole: () => void;
}

export const DemoRoleContext = createContext<DemoRoleContextType>({
  demoRole: 'agent',
  toggleRole: () => {},
});

// @demo — consumed by ProfileTab and any screen needing current demo role.
// @backend — replace with useProfile() hook reading profile.role from Supabase.
export const useDemoRole = () => useContext(DemoRoleContext);

// Maps a Supabase profiles.role value to the DemoRole type used for tab routing.
// Agent roles: 'agent' (and any future agent subtypes)
// Contractor roles: 'contractor'
// Partner roles: all partner subtypes from the profiles.role enum
export function mapProfileRoleToDemoRole(profileRole: string | null | undefined): DemoRole {
  if (!profileRole) return 'agent';
  if (profileRole === 'contractor') return 'contractor';
  const partnerRoles = [
    'title_escrow', 'mortgage_pro', 'attorney', 'warranty',
    'inspector', 'home_inspector', 'appraiser',
    'transaction_coordinator',
  ];
  if (partnerRoles.includes(profileRole)) return 'partner';
  return 'agent';
}
