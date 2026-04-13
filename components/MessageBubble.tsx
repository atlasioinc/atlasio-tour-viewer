// MessageBubble.tsx
// ═══════════════════════════════════════════════════════════════
// Reusable Message Bubble Component (160 lines)
// Shared by: ChatScreen, DealChatScreen
// (RepairChatScreen has its own inline bubble — future consolidation TODO)
//
// Modes:
//   1:1 chat — isMine right-aligns (blue), received left-aligns (gray)
//   Deal chat — adds sender name above + 40px avatar beside received
// Timestamp always inside the bubble
//
// @demo  No mock data — pure UI component
// @backend none — stateless presenter, data comes from parent
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../lib/tokens';
import { Avatar } from './shared';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export interface Message {
  id: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  senderName?: string;
  senderAvatarColor?: string;
}

interface MessageBubbleProps {
  message: Message;
  showSender?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showSender = false }) => {
  const { text, timestamp, isMine, senderName, senderAvatarColor } = message;

  // ── Sent bubble (same for both 1:1 and deal chat) ──
  if (isMine) {
    return (
      <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-end' }}>
        <View style={{ maxWidth: 271 }}>
          <View
            style={{
              paddingTop: 10,
              paddingBottom: 10,
              paddingHorizontal: 16,
              backgroundColor: COLORS.primary,
              borderRadius: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '400', color: '#FFFFFF', lineHeight: 20 }}>
              {text}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.timestampMine, lineHeight: 16 }}>
              {timestamp}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Received bubble — deal chat (avatar + name + bubble) ──
  if (showSender) {
    return (
      <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'flex-end', gap: 12 }}>
        {senderAvatarColor && senderName && (
          <Avatar name={senderName} color={senderAvatarColor} size={40} />
        )}

        <View style={{ flex: 1, maxWidth: 271, gap: 4 }}>
          {senderName && (
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.darkText, lineHeight: 20 }}>
              {senderName}
            </Text>
          )}

          <View
            style={{
              paddingTop: 10,
              paddingBottom: 10,
              paddingHorizontal: 16,
              backgroundColor: COLORS.background,
              borderRadius: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.darkText, lineHeight: 20 }}>
              {text}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.timestampText, lineHeight: 16 }}>
              {timestamp}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Received bubble — 1:1 chat (no avatar/name) ──
  return (
    <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'flex-start' }}>
      <View style={{ maxWidth: 271 }}>
        <View
          style={{
            paddingTop: 10,
            paddingBottom: 10,
            paddingHorizontal: 16,
            backgroundColor: COLORS.background,
            borderRadius: 16,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.darkText, lineHeight: 20 }}>
            {text}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.timestampText, lineHeight: 16 }}>
            {timestamp}
          </Text>
        </View>
      </View>
    </View>
  );
};

export default MessageBubble;
