// InboxStack.tsx
// ═══════════════════════════════════════════════════════════════
// Inbox Stack Navigator
// Screens:
//   InboxList → NewMessage → ChatScreen (1:1 flow)
//   InboxList → NewMessage → CreateDealChat (deal setup)
//   InboxList → DealChatScreen (existing deal chat from thread list)
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import InboxList from './InboxList';
import NewMessageScreen from './NewMessageScreen';
import ChatScreen from './ChatScreen';
import CreateDealChat from './CreateDealChat';
import DealChatScreen from './DealChatScreen';

// ─────────────────────────────────────────────
// TYPE DEFINITIONS
// ─────────────────────────────────────────────

export type InboxStackParamList = {
  InboxList: undefined;
  NewMessage: undefined;
  ChatScreen: {
    contactName: string;
    contactCompany: string;
    contactRole: string;
    contactAvatarColor: string;
  };
  CreateDealChat: undefined;
  DealChatScreen: {
    dealName: string;
    propertyAddress: string;
    closingDate: string;
  };
};

const Stack = createNativeStackNavigator<InboxStackParamList>();

// ═══════════════════════════════════════════════════════════════
// STACK NAVIGATOR
// ═══════════════════════════════════════════════════════════════

const InboxStack: React.FC = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right',
    }}
  >
    <Stack.Screen name="InboxList" component={InboxList} />
    <Stack.Screen name="NewMessage" component={NewMessageScreen} />
    <Stack.Screen
      name="ChatScreen"
      component={ChatScreen}
      options={{
        presentation: 'fullScreenModal',
        animation: 'slide_from_bottom',
      }}
    />
    <Stack.Screen name="CreateDealChat" component={CreateDealChat} />
    <Stack.Screen
      name="DealChatScreen"
      component={DealChatScreen}
      options={{
        presentation: 'fullScreenModal',
        animation: 'slide_from_bottom',
      }}
    />
  </Stack.Navigator>
);

export default InboxStack;
