// DealChatScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Deal Chat Screen — Group conversation for transaction coordination (612 lines)
// Header: "< Inbox" + group avatar grid + deal name
// Info bar: Property address + closing date (blue banner)
// Body: System message + message bubbles with sender names/avatars
// Footer: Attach + message input + send
//
// Sections: Design Tokens, SVG Icons, Route Type,
//           Group Avatar Grid, Mock Data, Main Screen
//
// @demo  MOCK_DEAL_MESSAGES (7 messages from 3 participants)
//        Gated on FEATURE_FLAGS.USE_MOCK_DATA (S160 follow-up). When false,
//        the screen starts with an empty messages array — the system pill
//        renders and the user can type-and-see local-only bubbles until
//        useThreadMessages(threadId) is wired.
// @backend — threadId received from CreateDealChat params (S160).
//            Wire useThreadMessages(threadId) in a future session to load real messages.
// @backend TODO: useMessages + useSendMessage (deal thread variant)
// @backend TODO: Realtime subscription for group messages
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  StatusBar,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import type { InboxStackParamList } from './InboxStack';
import MessageBubble from './MessageBubble';
import type { Message } from './MessageBubble';
import AttachSheet from './AttachSheet';
import { COLORS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.5 15L7.5 10L12.5 5" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AttachIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 5V19" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" />
    <Path d="M5 12H19" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SendIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M22 2L11 13" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DocumentPreviewIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={COLORS.secondaryText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2V8H20" stroke={COLORS.secondaryText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 5L15 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M15 5L5 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const ChevronRightIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 4L10 8L6 12" stroke={COLORS.darkText} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// ROUTE TYPE
// ─────────────────────────────────────────────
type DealChatRouteProp = RouteProp<InboxStackParamList, 'DealChatScreen'>;

// ─────────────────────────────────────────────
// GROUP AVATAR GRID (2x2)
// ─────────────────────────────────────────────

const GroupAvatarGrid: React.FC<{ colors: string[] }> = ({ colors }) => {
  const slots = colors.slice(0, 4);
  return (
    <View style={{ width: 36, height: 36, flexDirection: 'row', flexWrap: 'wrap', gap: 2 }}>
      {slots.map((color, i) => {
        const initials = ['SM', 'AC', 'AG', 'JL'][i] || '?';
        return (
          <View
            key={i}
            style={{
              width: 17,
              height: 17,
              borderRadius: 9999,
              backgroundColor: color,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 6, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
          </View>
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────
// @demo MOCK DATA — 7 deal chat messages from 3 participants
// ─────────────────────────────────────────────

const MOCK_DEAL_MESSAGES: Message[] = [
  {
    id: 'dm1',
    text: "Hi everyone! I've received the EMD and we're processing the title search now.",
    timestamp: '10:15 AM',
    isMine: false,
    senderName: 'Sarah Martinez',
    senderAvatarColor: '#D4A8B5',
  },
  {
    id: 'dm2',
    text: 'Great! The pre-approval letter is ready. Should I send it directly to title?',
    timestamp: '10:22 AM',
    isMine: false,
    senderName: 'Alex Chen',
    senderAvatarColor: '#7BA3C9',
  },
  {
    id: 'dm3',
    text: 'Yes please Alex, and Sarah can you confirm the closing date?',
    timestamp: '10:25 AM',
    isMine: true,
  },
  {
    id: 'dm4',
    text: 'Closing is confirmed for December 15th at 2 PM. CD will be ready by Friday.',
    timestamp: '10:45 AM',
    isMine: false,
    senderName: 'Sarah Martinez',
    senderAvatarColor: '#D4A8B5',
  },
  {
    id: 'dm5',
    text: 'Perfect, thanks Sarah!',
    timestamp: '10:46 AM',
    isMine: true,
  },
];

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════

const DealChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<DealChatRouteProp>();

  // Safe defaults — prevents .trim() of undefined crash when
  // navigating from InboxList or any other entry point that
  // may not supply every param.
  const {
    threadId,
    dealName = '',
    propertyAddress = '',
    closingDate = '',
    isCreator = false,
  } = route.params ?? {};
  // @backend — wired in future session via useThreadMessages(threadId)
  void threadId;

  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<Message[]>(
    FEATURE_FLAGS.USE_MOCK_DATA ? MOCK_DEAL_MESSAGES : []
  );
  const [showAttach, setShowAttach] = useState(false);
  const [pendingAction, setPendingAction] = useState<'photo' | 'document' | null>(null);
  const [attachments, setAttachments] = useState<{ type: 'photo' | 'document'; uri: string; name: string }[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);

  // Editable deal details
  const [currentDealName, setCurrentDealName] = useState(dealName);
  const [currentAddress] = useState(propertyAddress);
  const [currentClosingDate] = useState(closingDate);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDealName, setEditDealName] = useState(currentDealName);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const openEditModal = () => {
    setEditDealName(currentDealName);
    setShowEditModal(true);
    Animated.spring(slideAnim, { toValue: 1, tension: 65, friction: 11, useNativeDriver: true }).start();
  };

  const closeEditModal = () => {
    Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setShowEditModal(false);
    });
  };

  const handleSaveEdit = () => {
    if (editDealName.trim().length === 0) return;
    setCurrentDealName(editDealName.trim());
    console.log('Deal details updated:', { dealName: editDealName.trim() });
    closeEditModal();
  };

  // Picker useEffect
  useEffect(() => {
    if (pendingAction && !showAttach) {
      const timer = setTimeout(async () => {
        if (pendingAction === 'photo') {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return;
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
            if (!result.canceled && result.assets.length > 0) {
              setAttachments((prev) => [...prev, ...result.assets.map((a) => ({ type: 'photo' as const, uri: a.uri, name: a.fileName || 'Photo' }))]);
            }
          } catch (e) { console.log('Photo error:', e); }
        } else if (pendingAction === 'document') {
          try {
            const result = await DocumentPicker.getDocumentAsync({});
            if (!result.canceled && result.assets && result.assets.length > 0) {
              setAttachments((prev) => [...prev, ...result.assets.map((a) => ({ type: 'document' as const, uri: a.uri, name: a.name || 'Document' }))]);
            }
          } catch (e) { console.log('Document error:', e); }
        }
        setPendingAction(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingAction, showAttach]);

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // Scroll to latest when keyboard opens (S108g pattern)
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return () => {
      showSub.remove();
    };
  }, []);

  const handleSend = () => {
    if (messageText.trim().length === 0 && attachments.length === 0) return;
    const newMessage: Message = {
      id: `dm${Date.now()}`,
      text: messageText.trim() || `Attachment(s): ${attachments.length}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      isMine: true,
    };
    setMessages((prev) => [...prev, newMessage]);
    setMessageText('');
    setAttachments([]);
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ══════════════════════════════════════════
            HEADER: < Inbox | [grid avatar] | Deal Name
            ══════════════════════════════════════════ */}
        <View style={{ backgroundColor: COLORS.background, borderBottomWidth: 0.68, borderBottomColor: COLORS.border, paddingBottom: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 48, justifyContent: 'space-between' }}>
            {/* Left: Back to Inbox */}
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.5 : 1 })}
            >
              <BackIcon />
              <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.darkText, lineHeight: 24 }}>
                Inbox
              </Text>
            </Pressable>

            {/* Avatar grid + deal name + edit caret */}
            <Pressable
              onPress={openEditModal}
              style={({ pressed }) => ({ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 12, marginLeft: 16, opacity: pressed ? 0.5 : 1 })}
            >
              <GroupAvatarGrid colors={['#D4A8B5', '#7BA3C9', '#A8D4C5', '#C9B87B']} />
              <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.darkText, lineHeight: 24, flexShrink: 1 }} numberOfLines={1}>
                {currentDealName}
              </Text>
              <ChevronRightIcon />
            </Pressable>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            INFO BAR — Property + Closing Date (stacked)
            Only shown when at least one of address or closing date is populated.
            ══════════════════════════════════════════ */}
        {(currentAddress.trim().length > 0 || currentClosingDate.trim().length > 0) && (
          <View
            style={{
              backgroundColor: COLORS.primary,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.onPrimary, textAlign: 'center' }}>
              {currentAddress || 'Deal Chat'}
            </Text>
            {currentClosingDate ? (
              <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.onPrimary, textAlign: 'center', opacity: 0.85, marginTop: 2 }}>
                Closing {currentClosingDate}
              </Text>
            ) : null}
          </View>
        )}

        {/* ══════════════════════════════════════════
            CHAT BODY
            ══════════════════════════════════════════ */}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: COLORS.screenBg }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16, gap: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* System message — S160: hidden for the deal creator (CreateDealChat
              sets isCreator=true). Shown for participants opening the chat from
              Inbox or any non-creator entry point. */}
          {!isCreator && (
            <View style={{ alignItems: 'center' }}>
              <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.systemBg, borderRadius: 9999 }}>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>
                  Agent added you to this chat
                </Text>
              </View>
            </View>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} showSender={true} />
          ))}
        </ScrollView>

        {/* ══════════════════════════════════════════
            MESSAGE INPUT BAR
            ══════════════════════════════════════════ */}
        <View
          style={{
            backgroundColor: COLORS.background,
            borderTopWidth: 0.68,
            borderTopColor: COLORS.border,
            paddingTop: 8,
            paddingBottom: 8,
            paddingHorizontal: 24,
          }}
        >
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {attachments.map((att, index) => (
                <View
                  key={`${att.uri}-${index}`}
                  style={{ width: 72, height: 72, borderRadius: 12, backgroundColor: att.type === 'photo' ? '#000' : '#F9FAFB', borderWidth: 0.68, borderColor: COLORS.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
                >
                  {att.type === 'photo' ? (
                    <Image source={{ uri: att.uri }} style={{ width: 72, height: 72 }} />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <DocumentPreviewIcon />
                      <Text style={{ fontSize: 9, color: COLORS.secondaryText, textAlign: 'center', paddingHorizontal: 4 }} numberOfLines={1}>{att.name}</Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => handleRemoveAttachment(index)}
                    style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 9999, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                      <Path d="M2 2L8 8" stroke="#FFF" strokeWidth={1.5} strokeLinecap="round" />
                      <Path d="M8 2L2 8" stroke="#FFF" strokeWidth={1.5} strokeLinecap="round" />
                    </Svg>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => setShowAttach(true)}
              hitSlop={8}
              style={({ pressed }) => ({ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
            >
              <AttachIcon />
            </Pressable>

            <View style={{ flex: 1, height: 45, paddingHorizontal: 16, borderRadius: 9999, borderWidth: 0.68, borderColor: COLORS.inputBorder, justifyContent: 'center' }}>
              <TextInput
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message..."
                placeholderTextColor="rgba(10, 10, 10, 0.5)"
                style={{ fontSize: 16, fontWeight: '400', color: COLORS.darkText }}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                keyboardAppearance="light"
              />
            </View>

            <Pressable
              onPress={handleSend}
              hitSlop={8}
              style={({ pressed }) => ({ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: (messageText.trim().length > 0 || attachments.length > 0) ? (pressed ? 0.5 : 1) : 0.5 })}
            >
              <SendIcon />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <AttachSheet
        visible={showAttach}
        onClose={() => setShowAttach(false)}
        onPhotoPress={() => { setPendingAction('photo'); setShowAttach(false); }}
        onDocumentPress={() => { setPendingAction('document'); setShowAttach(false); }}
      />

      {/* ══════════════════════════════════════════
          EDIT DEAL DETAILS MODAL
          ══════════════════════════════════════════ */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="none"
        onRequestClose={closeEditModal}
      >
        {/* S146: KAV wraps the whole sheet so the keyboard pushes the bottom-aligned sheet upward */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <Pressable
            onPress={closeEditModal}
            style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
          >
            <Animated.View
              style={{
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                }],
              }}
            >
              <Pressable
                onPress={() => {}}
                style={{
                  backgroundColor: COLORS.background,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                }}
              >
                {/* Handle bar */}
                <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 8 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.inputBorder }} />
                </View>

                {/* Header row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingBottom: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28 }}>
                    Deal Details
                  </Text>
                  <Pressable
                    onPress={closeEditModal}
                    hitSlop={12}
                    style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 9999, backgroundColor: COLORS.chipBg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
                  >
                    <CloseIcon />
                  </Pressable>
                </View>

                {/* Form fields */}
                <View style={{ paddingHorizontal: 24, gap: 20, paddingBottom: 40 }}>
                  {/* Deal / Chat Name — editable */}
                  <View style={{ gap: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                      Deal/Chat Name <Text style={{ color: COLORS.errorRed }}>*</Text>
                    </Text>
                    <View
                      style={{
                        height: 45,
                        paddingHorizontal: 16,
                        backgroundColor: COLORS.background,
                        borderRadius: 10,
                        borderWidth: 0.68,
                        borderColor: editDealName.trim().length === 0 ? COLORS.errorRed : COLORS.border,
                        justifyContent: 'center',
                      }}
                    >
                      <TextInput
                        value={editDealName}
                        onChangeText={setEditDealName}
                        placeholder="e.g., 123 Main St – Smith Buyer"
                        placeholderTextColor={COLORS.placeholderText}
                        style={{ fontSize: 14, fontWeight: '400', color: COLORS.darkText }}
                        keyboardAppearance="light"
                      />
                    </View>
                  </View>

                  {/* Property Address — read-only info row */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                      Property Address
                    </Text>
                    <View style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: COLORS.filterBg,
                      borderRadius: 10,
                      borderWidth: 0.68,
                      borderColor: COLORS.border,
                    }}>
                      <Text style={{ fontSize: 15, color: currentAddress ? COLORS.darkText : COLORS.secondaryText }}>
                        {currentAddress || 'Not set'}
                      </Text>
                    </View>
                  </View>

                  {/* Closing Date — read-only info row */}
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                      Closing Date
                    </Text>
                    <View style={{
                      paddingVertical: 12,
                      paddingHorizontal: 16,
                      backgroundColor: COLORS.filterBg,
                      borderRadius: 10,
                      borderWidth: 0.68,
                      borderColor: COLORS.border,
                    }}>
                      <Text style={{ fontSize: 15, color: currentClosingDate ? COLORS.darkText : COLORS.secondaryText }}>
                        {currentClosingDate || 'Not set'}
                      </Text>
                    </View>
                  </View>

                  {/* Save button */}
                  <Pressable
                    onPress={handleSaveEdit}
                    style={({ pressed }) => ({
                      backgroundColor: editDealName.trim().length > 0 ? COLORS.primary : COLORS.disabledBg,
                      borderRadius: 12,
                      paddingVertical: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 4,
                      opacity: pressed && editDealName.trim().length > 0 ? 0.9 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 16, fontWeight: '600', color: editDealName.trim().length > 0 ? COLORS.onPrimary : COLORS.disabledText, lineHeight: 20 }}>
                      Save
                    </Text>
                  </Pressable>
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

export default DealChatScreen;
