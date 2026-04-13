// RepairChatScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Repair Chat — Job Thread (agent ↔ bidder) (551 lines)
// Auto-created when a contractor submits a bid
// Thread type: job_thread (distinct from one_to_one and deal_chat)
//
// Architecture notes:
// - threadType 'job_thread' maps to conversations.thread_type in Supabase
// - conversationId will be used for Realtime subscriptions
// - Messages follow same schema as ChatScreen (sender, text, timestamp)
// - Phone number regex filtering enforced server-side (edge function)
// - 50 messages/day rate limit enforced server-side
// - 5 attachments / 5MB per message limit
//
// Navigation: HomeStack → RepairJobDetails → RepairChatScreen
// Params: { bidId, bidderName, bidderAvatarColor, jobId, jobTitle }
//
// Sections: Design Tokens, Route Params, Message Type, SVG Icons,
//           Avatar, Context Tip Banner, Message Bubble, Mock Messages,
//           Main Component
//
// @demo  Mock messages array (4 messages, lines ~270–295)
//        No feature flag gate — fully mock, no hooks wired
// @backend TODO: useMessages + useSendMessage — same as ChatScreen
// @backend TODO: Realtime subscription for live message updates
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import type { HomeStackParamList } from './HomeStack';
import { COLORS } from '../lib/tokens';
import { Avatar } from './shared';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// ROUTE PARAMS TYPE
// ─────────────────────────────────────────────

export interface RepairChatParams {
  bidId: string;
  bidderName: string;
  bidderAvatarColor: string;
  jobId: string;
  jobTitle: string;
}

type RepairChatRouteProp = RouteProp<HomeStackParamList, 'RepairChatScreen'>;

// ─────────────────────────────────────────────
// MESSAGE TYPE
// ─────────────────────────────────────────────

interface ChatMessage {
  id: string;
  senderId: string; // 'me' for current user, bid.id for bidder
  text: string;
  timestamp: string;
  isMe: boolean;
}

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackChevronIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M12.5 15L7.5 10L12.5 5"
      stroke={COLORS.darkText}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AttachIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19"
      stroke={COLORS.bodyText}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M5 12H19"
      stroke={COLORS.bodyText}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const SendIcon: React.FC<{ active: boolean }> = ({ active }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 2L11 13"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 2L15 22L11 13L2 9L22 2Z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// CONTEXT TIP BANNER
// Privacy & usage reminder shown at top of chat
// ─────────────────────────────────────────────

const ContextTipBanner: React.FC = () => (
  <View>
    <View
      style={{
        paddingHorizontal: 17,
        paddingVertical: 17,
        backgroundColor: COLORS.infoBg,
        borderRadius: 14,
        borderWidth: 1.35,
        borderColor: COLORS.infoBorder,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '400',
          color: COLORS.primary,
          lineHeight: 16,
          textAlign: 'center',
        }}
      >
        Use this chat to clarify details on the job. To protect your privacy and
        the integrity of the platform, avoid sharing or requesting phone numbers
        and payment information.
      </Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// MESSAGE BUBBLE (reusable, matches ChatScreen)
// ─────────────────────────────────────────────

const MessageBubble: React.FC<{ message: ChatMessage; senderName: string; senderColor: string }> = ({
  message,
  senderName,
  senderColor,
}) => {
  if (message.isMe) {
    return (
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12 }}>
        <View
          style={{
            maxWidth: '75%',
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: COLORS.sentBubble,
            borderRadius: 16,
            borderBottomRightRadius: 4,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.sentText, lineHeight: 20 }}>
            {message.text}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '400',
            color: COLORS.timestampText,
            lineHeight: 16,
            marginTop: 4,
            paddingRight: 4,
          }}
        >
          {message.timestamp}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 12, gap: 8 }}>
      <Avatar name={senderName} color={senderColor} size={28} />
      <View style={{ flex: 1 }}>
        <View
          style={{
            maxWidth: '85%',
            paddingHorizontal: 14,
            paddingVertical: 10,
            backgroundColor: COLORS.receivedBubble,
            borderRadius: 16,
            borderBottomLeftRadius: 4,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 0.5 },
            shadowOpacity: 0.05,
            shadowRadius: 1,
            elevation: 1,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.receivedText, lineHeight: 20 }}>
            {message.text}
          </Text>
        </View>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '400',
            color: COLORS.timestampText,
            lineHeight: 16,
            marginTop: 4,
            paddingLeft: 4,
          }}
        >
          {message.timestamp}
        </Text>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// @demo MOCK MESSAGES — 4 repair thread messages
// ─────────────────────────────────────────────

const INITIAL_MESSAGES: ChatMessage[] = [];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const RepairChatScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RepairChatRouteProp>();

  const { bidderName, bidderAvatarColor, jobId, jobTitle } = route.params;

  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  // Send message handler
  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: 'me',
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText('');

    // Scroll to bottom after send
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // TODO: Supabase insert into messages table
    // mutation.mutate({
    //   conversation_id: conversationId,
    //   sender_id: currentUserId,
    //   content: trimmed,
    //   thread_type: 'job_thread',
    // });
  }, [inputText]);

  // Attachment handler (stub — will wire to AttachSheet)
  const handleAttach = useCallback(() => {
    // TODO: Open AttachSheet bottom sheet
    console.log('Open attachment picker for job thread:', jobId);
  }, [jobId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ══════════════════════════════════════════
            HEADER: Back + Avatar + Name (48px)
            ══════════════════════════════════════════ */}
        <View
          style={{
            height: 48,
            paddingHorizontal: 16,
            paddingBottom: 4,
            backgroundColor: COLORS.background,
            borderBottomWidth: 0.68,
            borderBottomColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Left: Back button */}
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <BackChevronIcon />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '400',
                color: COLORS.darkText,
                lineHeight: 20,
              }}
            >
              Back
            </Text>
          </Pressable>

          {/* Center: Avatar + Name (absolutely positioned) */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              pointerEvents: 'none',
            }}
          >
            <Avatar name={bidderName} color={bidderAvatarColor} size={32} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: COLORS.darkText,
                lineHeight: 24,
              }}
              numberOfLines={1}
            >
              {bidderName}
            </Text>
          </View>

          {/* Right: spacer for balance */}
          <View style={{ width: 60 }} />
        </View>

        {/* ══════════════════════════════════════════
            JOB TITLE BAR (blue strip)
            ══════════════════════════════════════════ */}
        <View
          style={{
            height: 32,
            backgroundColor: COLORS.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '400',
              color: '#FFFFFF',
              lineHeight: 16,
            }}
            numberOfLines={1}
          >
            {jobTitle}
          </Text>
        </View>

        {/* ══════════════════════════════════════════
            CHAT CONTENT
            ══════════════════════════════════════════ */}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: COLORS.screenBg }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16, gap: 16 }}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            scrollViewRef.current?.scrollToEnd({ animated: false })
          }
        >
          {/* Context Tip */}
          <ContextTipBanner />

          {/* Messages */}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              senderName={bidderName}
              senderColor={bidderAvatarColor}
            />
          ))}

          {/* Empty state hint (when no messages) */}
          {messages.length === 0 && (
            <View style={{ alignItems: 'center', paddingTop: 48 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '400',
                  color: COLORS.lightText,
                  lineHeight: 20,
                  textAlign: 'center',
                }}
              >
                Start a conversation about this job
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ══════════════════════════════════════════
            MESSAGE INPUT BAR
            ══════════════════════════════════════════ */}
        <View
          style={{
            backgroundColor: COLORS.background,
            borderTopWidth: 0.68,
            borderTopColor: COLORS.border,
            paddingTop: 12,
            paddingBottom: Platform.OS === 'ios' ? 34 : 8,
            paddingHorizontal: 24,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* Attach button */}
            <Pressable
              onPress={handleAttach}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <AttachIcon />
            </Pressable>

            {/* Text input */}
            <View
              style={{
                flex: 1,
                height: 45,
                paddingHorizontal: 16,
                borderRadius: 9999,
                borderWidth: 0.68,
                borderColor: COLORS.inputBorder,
                justifyContent: 'center',
              }}
            >
              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Type a message..."
                placeholderTextColor={COLORS.placeholderText}
                style={{
                  fontSize: 16,
                  fontWeight: '400',
                  color: COLORS.darkText,
                }}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
            </View>

            {/* Send button */}
            <Pressable
              onPress={handleSend}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: inputText.trim().length > 0 ? (pressed ? 0.5 : 1) : 0.5,
              })}
            >
              <SendIcon active={inputText.trim().length > 0} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default RepairChatScreen;
