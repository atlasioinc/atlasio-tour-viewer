// FindStack.tsx
// ═══════════════════════════════════════════════════════════════
// Find Stack Navigator (53 lines)
// Screens:
//   FindTab → ProProfile (tap any pro card)
// Pattern matches HomeStack / InboxStack architecture
//
// Route Params:
//   FindMain accepts optional preset params from Quick Actions
//   (cross-stack navigation from HomeTabAgent → Fast-Close Lender card)
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FindTab from './FindTab';
import ProProfile from './ProProfile';
import type { ProProfileData } from './ProProfile';
import ServiceAreaEditorScreen from './ServiceAreaEditorScreen';

// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

export type FindStackParamList = {
  FindMain: {
    presetRole?: string;
    presetFilters?: string[];
    presetSort?: string;
  } | undefined;
  ProProfile: {
    profileId?: string;
    profile?: ProProfileData;
  };
  // S163 — ATL-LOCATION-01: agent service area editor. No params — editor
  // reads useMyProfile directly via getServiceArea (single cast point).
  ServiceAreaEditor: undefined;
};

const Stack = createNativeStackNavigator<FindStackParamList>();

// ═══════════════════════════════════════════════════════════════
// STACK NAVIGATOR
// ═══════════════════════════════════════════════════════════════

const FindStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="FindMain" component={FindTab} />
    <Stack.Screen name="ProProfile" component={ProProfile} />
    <Stack.Screen
      name="ServiceAreaEditor"
      component={ServiceAreaEditorScreen}
      options={{ presentation: 'fullScreenModal' }}
    />
  </Stack.Navigator>
);

export default FindStack;
