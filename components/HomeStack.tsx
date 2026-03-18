// HomeStack.tsx
// ═══════════════════════════════════════════════════════════════
// Home Stack Navigator (128 lines)
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
import type { Job, BidWithProfile } from '../types';
import type { ProProfileData } from './ProProfile';
import type { SquadProCandidate } from './SquadSlotPicker';
import JobCompletionScreen from './JobCompletionScreen';
import ClientLifestyleScreen from './ClientLifestyleScreen';
import NeighborhoodMatchScreen from './NeighborhoodMatchScreen';
import CategoryMapScreen from './CategoryMapScreen';
import AddressComparisonScreen from './AddressComparisonScreen';
import AgentDealDetailScreen from './AgentDealDetailScreen';
import AgentDealsScreen from './AgentDealsScreen';
import type { LifestylePriority, LifestyleCategory, POIResult, NeighborhoodAnalysis, RadiusMi } from '../types/neighborhood';

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
    job: Job & { bids: BidWithProfile[] };
  };
  EditRepairJob: {
    job: Job & { bids: BidWithProfile[] };
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
    profileId?: string;
    profile?: ProProfileData;
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
  ClientLifestyleScreen: {
    initialPriorities?: LifestylePriority[];  // pre-fills tile selections when coming from Edit priorities
  } | undefined;
  NeighborhoodMatchScreen: {
    priorities: LifestylePriority[];
    clientLabel: string;
    address: string;
    lat?: number;         // geocoded in live path, absent in mock path
    lng?: number;         // geocoded in live path, absent in mock path
    radiusMi: RadiusMi;   // S61: search radius (0.5 | 1 | 2)
  };
  CategoryMapScreen: {
    category: LifestyleCategory;
    label: string;
    emoji: string;
    pois: POIResult[];
    addressLat: number;
    addressLng: number;
    address: string;
  };
  AgentDealsScreen: undefined;
  AgentDealDetail: {
    jobId: string;
  };
  AddressComparisonScreen: {
    priorities: LifestylePriority[];
    clientLabel: string;
    firstAddress: string;
    firstAnalysis?: NeighborhoodAnalysis;   // optional — not needed in live path
    firstLat?: number;                      // geocoded — live path only
    firstLng?: number;                      // geocoded — live path only
    radiusMi: RadiusMi;                     // S61: search radius forwarded from NeighborhoodMatchScreen
  };
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
    <Stack.Screen
      name="RepairJobDetails"
      component={RepairJobDetails}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <Stack.Screen
      name="EditRepairJob"
      component={EditRepairJob}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
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
    <Stack.Screen
      name="ClientLifestyleScreen"
      component={ClientLifestyleScreen}
      options={{ presentation: 'fullScreenModal', headerShown: false }}
    />
    <Stack.Screen
      name="NeighborhoodMatchScreen"
      component={NeighborhoodMatchScreen}
      options={{
        presentation: 'fullScreenModal',
        animation: 'slide_from_bottom',
        headerShown: false,
      }}
    />
    <Stack.Screen
      name="AddressComparisonScreen"
      component={AddressComparisonScreen}
      options={{
        presentation: 'fullScreenModal',
        animation: 'slide_from_bottom',
        headerShown: false,
      }}
    />
    <Stack.Screen name="AgentDealsScreen" component={AgentDealsScreen} options={{ headerShown: false }} />
    <Stack.Screen
      name="AgentDealDetail"
      component={AgentDealDetailScreen}
      options={{ headerShown: false }}
    />
    <Stack.Screen
      name="CategoryMapScreen"
      component={CategoryMapScreen}
      options={{ presentation: 'fullScreenModal', headerShown: false }}
    />
  </Stack.Navigator>
);

export default HomeStack;
