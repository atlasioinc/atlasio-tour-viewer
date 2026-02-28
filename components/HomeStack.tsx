// HomeStack.tsx
// ═══════════════════════════════════════════════════════════════
// Home Stack Navigator
// Screens:
//   HomeTabAgent → RepairJobDetails (drill into a repair job)
//   HomeTabAgent → Notifications (bell icon)
//   HomeTabAgent → SendSquad (send squad to client flow)
//   HomeTabAgent → PostPhotoJobScreen (Quick Actions → photographer)
//   HomeTabAgent → PostStagingJobScreen (Quick Actions → stager)
//   RepairJobDetails → RepairChatScreen (fullScreenModal, slide up)
// Pattern matches InboxStack architecture
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeTabAgent from './HomeTabAgent';
import RepairJobDetails from './RepairJobDetails';
import EditRepairJob from './EditRepairJob';
import RepairChatScreen from './RepairChatScreen';
import NotificationsTab from './NotificationsTab';
import ProProfile from './ProProfile';
import PostJobWizard from './PostJobWizard';
import SendSquadScreen from './SendSquadScreen';
import PostPhotoJobScreen from './PostPhotoJobScreen';
import PostStagingJobScreen from './PostStagingJobScreen';
import type { RepairJob } from './RepairJobDetails';
import type { ProProfileData } from './ProProfile';
import type { SquadProCandidate } from './SquadSlotPicker';
import JobCompletionScreen from './JobCompletionScreen';

// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

interface SquadSlot {
  id: string;
  label: string;
  role: string;
  isAddNew?: boolean;
}

export type HomeStackParamList = {
  HomeMain: undefined;
  RepairJobDetails: {
    job: RepairJob;
  };
  EditRepairJob: {
    job: RepairJob;
  };
  RepairChatScreen: {
    bidId: string;
    bidderName: string;
    bidderAvatarColor: string;
    jobId: string;
    jobTitle: string;
  };
  Notifications: undefined;
  ProProfile: {
    profile: ProProfileData;
  };
  PostJobWizard: undefined;
  PostPhotoJobScreen: undefined;
  PostStagingJobScreen: undefined;
  SendSquad: {
    squadMembers: Record<string, SquadProCandidate>;
    defaultSlots: SquadSlot[];
    additionalSlots: SquadSlot[];
  };
  JobCompletion: { jobId: string; userRole: 'agent' | 'contractor' };
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

// ═══════════════════════════════════════════════════════════════
// STACK NAVIGATOR
// ═══════════════════════════════════════════════════════════════

const HomeStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="HomeMain" component={HomeTabAgent} />
    <Stack.Screen name="RepairJobDetails" component={RepairJobDetails} />
    <Stack.Screen name="EditRepairJob" component={EditRepairJob} />
    <Stack.Screen
      name="RepairChatScreen"
      component={RepairChatScreen}
      options={{
        presentation: 'fullScreenModal',
        animation: 'slide_from_bottom',
      }}
    />
    <Stack.Screen name="Notifications" component={NotificationsTab} />
    <Stack.Screen name="ProProfile" component={ProProfile} />
    <Stack.Screen
      name="PostJobWizard"
      component={PostJobWizard}
      options={{ presentation: 'fullScreenModal', headerShown: false }}
    />
    <Stack.Screen
      name="PostPhotoJobScreen"
      component={PostPhotoJobScreen}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <Stack.Screen
      name="PostStagingJobScreen"
      component={PostStagingJobScreen}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <Stack.Screen
      name="SendSquad"
      component={SendSquadScreen}
      options={{
        presentation: 'fullScreenModal',
        animation: 'slide_from_bottom',
      }}
    />
    <Stack.Screen name="JobCompletion" component={JobCompletionScreen}
      options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} 
    />
  </Stack.Navigator>
);

export default HomeStack;
