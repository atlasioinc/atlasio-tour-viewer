// InboxStack.tsx
// ═══════════════════════════════════════════════════════════════
// Inbox Stack Navigator (75 lines)
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
    /** threads.id UUID — required when opening an existing thread (from InboxList) */
    threadId?: string;
    /** profiles.id UUID — required when starting a new conversation (from ProCard / contact) */
    recipientId?: string;
    contactName: string;
    contactCompany: string;
    contactRole: string;
    contactAvatarColor: string;
    /** @demo — address hardcoded in mock threads; replace with thread.deal.address when LIVE */
    dealAddress?: string;
  };
  CreateDealChat: undefined;
  DealChatScreen: {
    /** threads.id UUID — present when created via rpc_create_deal_thread (S160).
     *  Absent when navigating from InboxList (demo threads) until message
     *  loading is wired in a future session. */
    threadId?: string;
    dealName: string;
    propertyAddress: string;
    closingDate: string;
    /** True when the current user just created the deal (CreateDealChat flow).
     *  Suppresses the "Agent added you to this chat" system pill since the
     *  creator was not added by anyone. Absent / false from InboxList. */
    isCreator?: boolean;
    /** S161: real member data for avatar stack in header.
     *  Each entry is a non-self thread member: { name, color }.
     *  From CreateDealChat: participant name + avatarColor.
     *  From InboxList: member name + avatar_color from rpc_get_inbox_threads members[]. */
    members?: { name: string; color: string }[];
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
    <Stack.Screen
      name="NewMessage"
      component={NewMessageScreen}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <Stack.Screen
      name="ChatScreen"
      component={ChatScreen}
      options={{ headerShown: false, gestureEnabled: true }}
    />
    {/* S155: CreateDealChat inherits default slide_from_right. NO presentation
        options — chrome is S155 X-dismiss via CloseIcon. Navigation from
        CreateDealChat → DealChatScreen uses CommonActions.reset (NOT replace)
        because NewMessageScreen's fullScreenModal ancestor (line 62 above)
        leaks its modal presentation down the stack when replace is used on
        iOS native-stack. See CreateDealChat.tsx handleCreateChat +
        tasks/atlasio-bug-history.md BUG-003 Attempt 3 (S155). */}
    <Stack.Screen
      name="CreateDealChat"
      component={CreateDealChat}
    />
    <Stack.Screen
      name="DealChatScreen"
      component={DealChatScreen}
      options={{ gestureEnabled: true }}
    />
  </Stack.Navigator>
);

export default InboxStack;
