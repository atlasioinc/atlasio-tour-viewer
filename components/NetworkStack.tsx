// NetworkStack.tsx
// ═══════════════════════════════════════════════════════════════
// Network Stack Navigator
// Screens:
//   NetworkTab → ProProfile (tap any contact card)
// Pattern matches HomeStack / InboxStack architecture
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NetworkTab from './NetworkTab';
import ProProfile from './ProProfile';
import type { ProProfileData } from './ProProfile';

// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

export type NetworkStackParamList = {
  NetworkMain: undefined;
  ProProfile: {
    profile: ProProfileData;
  };
};

const Stack = createNativeStackNavigator<NetworkStackParamList>();

// ═══════════════════════════════════════════════════════════════
// STACK NAVIGATOR
// ═══════════════════════════════════════════════════════════════

const NetworkStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="NetworkMain" component={NetworkTab} />
    <Stack.Screen name="ProProfile" component={ProProfile} />
  </Stack.Navigator>
);

export default NetworkStack;
