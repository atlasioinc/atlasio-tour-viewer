// RequestConnectModal.tsx
// ═══════════════════════════════════════════════════════════════
// "Request to Connect" Modal (370 lines)
// Reusable modal — agent taps "Request to Connect" on any pro card
// Entry points: FindTab, ProProfile
//
// @demo  Console.log on send, simulated success
// @backend TODO: rpc_send_connection_request(target_id, message?)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import { Avatar } from './shared';

// ─────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────

interface RequestConnectModalProps {
  visible: boolean;
  name: string;
  company: string;
  role: string;
  avatarColor?: string;
  /** Optional nudge text shown above the message input */
  nudgeText?: string;
  onClose: () => void;
  onSend: (message: string) => void;
}

// ─────────────────────────────────────────────
// CLOSE (X) ICON
// ─────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Line x1={5} y1={5} x2={15} y2={15} stroke="#99A1AF" strokeWidth={1.67} strokeLinecap="round" />
    <Line x1={15} y1={5} x2={5} y2={15} stroke="#99A1AF" strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const RequestConnectModal: React.FC<RequestConnectModalProps> = ({
  visible,
  name,
  company,
  role,
  avatarColor = '#C4A882',
  nudgeText,
  onClose,
  onSend,
}) => {
  const [message, setMessage] = useState<string>('');
  const MAX_CHARS = 200;

  // Reset message when modal opens
  useEffect(() => {
    if (visible) setMessage('');
  }, [visible]);

  const firstName = name.split(' ')[0];

  const handleSend = () => {
    console.log('Connection request sent to:', name);
    console.log('Message:', message || '(no message)');
    onSend(message);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* ── Backdrop ── */}
        <Pressable
          onPress={onClose}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          {/* ── Modal Card ── */}
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 380,
              backgroundColor: COLORS.background,
              borderRadius: 20,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 25 },
              shadowOpacity: 0.15,
              shadowRadius: 50,
              elevation: 10,
              overflow: 'hidden',
            }}
          >
            {/* ── Top Content Section ── */}
            <View style={{ padding: 24, gap: 16 }}>

              {/* Title Row + Close Button */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    color: COLORS.darkText,
                    fontSize: 20,
                    fontWeight: '600',
                    lineHeight: 28,
                  }}
                >
                  {`Request to Connect with ${name}?`}
                </Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={({ pressed }) => ({
                    width: 28,
                    height: 28,
                    borderRadius: 9999,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <CloseIcon />
                </Pressable>
              </View>

              {/* Pro Info Row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingBottom: 16,
                  borderBottomWidth: 0.68,
                  borderBottomColor: COLORS.cardBorder,
                }}
              >
                <Avatar name={name} color={avatarColor} size={56} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text
                    style={{
                      color: COLORS.darkText,
                      fontSize: 16,
                      fontWeight: '600',
                      lineHeight: 24,
                    }}
                  >
                    {name}
                  </Text>
                  <Text
                    style={{
                      color: COLORS.secondaryText,
                      fontSize: 14,
                      fontWeight: '400',
                      lineHeight: 20,
                    }}
                    numberOfLines={1}
                  >
                    {`${company} • ${role}`}
                  </Text>
                </View>
              </View>

              {/* Body Text */}
              <Text
                style={{
                  color: COLORS.sortText,
                  fontSize: 14,
                  fontWeight: '400',
                  lineHeight: 20,
                }}
              >
                Adding a personal note increases your chances of acceptance.
              </Text>

              {/* Verification nudge (social proof) */}
              {nudgeText && (
                <View style={{
                  backgroundColor: COLORS.infoBg,
                  borderRadius: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 0.68,
                  borderColor: COLORS.infoBorder,
                }}>
                  <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '400', lineHeight: 18 }}>
                    {nudgeText}
                  </Text>
                </View>
              )}

              {/* Message Input */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    color: COLORS.darkText,
                    fontSize: 14,
                    fontWeight: '500',
                    lineHeight: 20,
                  }}
                >
                  Optional message
                </Text>
                <TextInput
                  value={message}
                  onChangeText={(text) => {
                    if (text.length <= MAX_CHARS) setMessage(text);
                  }}
                  placeholder={`Hi ${firstName}, I'd love to connect — I frequently work with VA loans in the Denver area.`}
                  placeholderTextColor="#99A1AF"
                  multiline
                  textAlignVertical="top"
                  style={{
                    height: 105,
                    paddingHorizontal: 16,
                    paddingTop: 12,
                    paddingBottom: 12,
                    borderRadius: 14,
                    borderWidth: 0.68,
                    borderColor: COLORS.border,
                    color: COLORS.darkText,
                    fontSize: 14,
                    fontWeight: '400',
                    lineHeight: 20,
                  }}
                />
                <Text
                  style={{
                    color: COLORS.secondaryText,
                    fontSize: 12,
                    fontWeight: '400',
                    lineHeight: 16,
                  }}
                >
                  {`${message.length}/${MAX_CHARS} characters`}
                </Text>
              </View>
            </View>

            {/* ── Bottom Buttons ── */}
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: 24,
                paddingBottom: 24,
                gap: 12,
              }}
            >
              {/* Cancel */}
              <Pressable
                onPress={onClose}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 47,
                  borderRadius: 14,
                  borderWidth: 1.35,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    color: COLORS.sortText,
                    fontSize: 14,
                    fontWeight: '500',
                    lineHeight: 20,
                    textAlign: 'center',
                  }}
                >
                  Cancel
                </Text>
              </Pressable>

              {/* Send Request */}
              <Pressable
                onPress={handleSend}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 47,
                  borderRadius: 14,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 3,
                  elevation: 2,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text
                  style={{
                    color: COLORS.background,
                    fontSize: 14,
                    fontWeight: '500',
                    lineHeight: 20,
                    textAlign: 'center',
                  }}
                >
                  Send Request
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default RequestConnectModal;
