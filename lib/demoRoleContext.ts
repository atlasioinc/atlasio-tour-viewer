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
export type DemoRole = 'agent' | 'contractor';

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
