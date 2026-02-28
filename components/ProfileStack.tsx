// ProfileStack.tsx
// ═══════════════════════════════════════════════════════════════
// Profile Stack Navigator
// Screens:
//   ProfileMain (ProfileTab) — own profile view
//   EditProfile (fullScreenModal) — edit profile form
//   Settings — account, notifications, preferences
//
// Why a stack?
//   ProfileTab was previously a bare component in BottomTabNavigator.
//   Wrapping in a stack enables push navigation to EditProfile and
//   Settings without cross-stack hacks.
//
// Pattern matches: FindStack, InboxStack, NetworkStack
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProfileTab from './ProfileTab';
import EditProfileScreen from './EditProfileScreen';
import SettingsScreen from './SettingsScreen';

// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

export type ProfileStackParamList = {
  ProfileMain: undefined;
  EditProfile: { role: string };
  Settings: undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

// ═══════════════════════════════════════════════════════════════
// STACK NAVIGATOR
// ═══════════════════════════════════════════════════════════════

const ProfileStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="ProfileMain" component={ProfileTab} />
    <Stack.Screen
      name="EditProfile"
      component={EditProfileScreen}
      options={{
        presentation: 'fullScreenModal',
        animation: 'slide_from_bottom',
      }}
    />
    <Stack.Screen name="Settings" component={SettingsScreen} />
  </Stack.Navigator>
);

export default ProfileStack;
