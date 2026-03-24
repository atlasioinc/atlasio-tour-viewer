// ChatScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Chat Screen — 1:1 conversation view (692 lines)
// Three states:
//   1. Empty — centered avatar + "No messages yet"
//   2. Conversation — message bubbles
//   3. Add contact — contact list in body
// Header: Back + avatar + name/company (conversation mode)
//    OR:  Back + "New Message" + To: field (compose mode)
//
// Sections: Design Tokens, SVG Icons, Data Types, All Contacts,
//           Mock Conversation, Avatar, Add-Contact Row, Main Screen
//
// @demo  MOCK_MESSAGES (5 messages), ALL_CONTACTS (4 contacts)
//        Feature flag gate: FEATURE_FLAGS.USE_MOCK_DATA
// @backend useMessages (wired) — messages for thread
// @backend useSendMessage (wired) — insert message
// @backend useMarkThreadRead (wired) — mark thread as read
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
import { useMessages, useSendMessage, useMarkThreadRead, useCreateThread, useThreadMessages } from '../hooks/useData';
import { useRealtimeMessages } from '../hooks/useRealtime';
import { adaptMessageToBubble } from '../lib/typeAdapters';
import { supabase } from '../lib/supabase';

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

const PlusIcon: React.FC<{ color?: string }> = ({ color = COLORS.primary }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 4V16" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M4 10H16" stroke={color} strokeWidth={2} strokeLinecap="round" />
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

const CloseChipIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M5 5L11 11" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M11 5L5 11" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const DocumentPreviewIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={COLORS.secondaryText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2V8H20" stroke={COLORS.secondaryText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrashIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6H5H21" stroke={COLORS.secondaryText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path
      d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
      stroke={COLORS.secondaryText}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────

interface Recipient {
  id: string;
  name: string;
  company: string;
  role: string;
  avatarColor: string;
}

type ChatScreenRouteProp = RouteProp<InboxStackParamList, 'ChatScreen'>;

// ─────────────────────────────────────────────
// @demo ALL CONTACTS — 4 mock contacts for compose mode
// ─────────────────────────────────────────────

const ALL_CONTACTS: Recipient[] = [
  { id: 's1', name: 'Mike Rodriguez', company: 'First National Bank', role: 'Lender', avatarColor: '#7BA3C9' },
  { id: 's2', name: 'Jennifer Lee', company: 'Premier Title', role: 'Title', avatarColor: '#D4A8B5' },
  { id: 's3', name: 'Carlos Martinez', company: 'Precision Inspections', role: 'Inspector', avatarColor: '#A8D4C5' },
  { id: 's4', name: 'Amy Chen', company: 'BuildRight Contractors', role: 'Contractor', avatarColor: '#C9B87B' },
  { id: 's5', name: 'Robert Johnson', company: 'Accurate Appraisals', role: 'Appraiser', avatarColor: '#A8B5D4' },
  { id: 's6', name: 'Sarah Williams', company: 'Elite Mortgage Group', role: 'Lender', avatarColor: '#D4C5A8' },
  { id: 's7', name: 'David Torres', company: 'Secure Title Co', role: 'Title', avatarColor: '#B5C4A8' },
  { id: 's8', name: 'Lisa Park', company: 'HomeCheck Pro', role: 'Inspector', avatarColor: '#D4A8C5' },
  { id: 's9', name: 'Marcus Brown', company: 'ProBuild Contractors', role: 'Contractor', avatarColor: '#C4A882' },
  { id: 's10', name: 'Emma Wilson', company: 'Prestige Title Services', role: 'Title', avatarColor: '#B8A8D4' },
];

// ─────────────────────────────────────────────
// @demo MOCK CONVERSATION DATA — 5 messages
// @backend Replace with useMessages (wired, feature flag gate)
// ─────────────────────────────────────────────

const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    text: "Hi! Thanks for reaching out. I'd be happy to help with your client's loan.",
    timestamp: '10:15 AM',
    isMine: false,
  },
  {
    id: 'm2',
    text: "Great! They're looking at a property at 456 Oak Avenue. Can you provide pre-approval?",
    timestamp: '10:18 AM',
    isMine: true,
  },
  {
    id: 'm3',
    text: "Absolutely. I'll need some documents from them. Can they provide last 2 years tax returns and recent pay stubs?",
    timestamp: '10:22 AM',
    isMine: false,
  },
  {
    id: 'm4',
    text: "Yes, I'll have them send those over today.",
    timestamp: '10:25 AM',
    isMine: true,
  },
  {
    id: 'm5',
    text: 'Perfect! Once I receive those, I can have the pre-approval letter ready within 24 hours.',
    timestamp: '10:27 AM',
    isMine: false,
  },
];

// ─────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────

const SingleAvatar: React.FC<{ color: string; name: string; size?: number }> = ({
  color,
  name,
  size = 36,
}) => {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').substring(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.34, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// ADD-CONTACT ROW
// ─────────────────────────────────────────────

const AddContactRow: React.FC<{
  contact: Recipient;
  onPress: (contact: Recipient) => void;
}> = ({ contact, onPress }) => (
  <Pressable
    onPress={() => onPress(contact)}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: 48,
      backgroundColor: COLORS.background,
      borderBottomWidth: 0.68,
      borderBottomColor: COLORS.cardBorder,
      gap: 12,
      opacity: pressed ? 0.9 : 1,
    })}
  >
    <SingleAvatar color={contact.avatarColor} name={contact.name} size={40} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }} numberOfLines={1}>
        {contact.name}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }} numberOfLines={1}>
        {contact.company} • {contact.role}
      </Text>
    </View>
  </Pressable>
);

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════

const ChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<ChatScreenRouteProp>();
  const { threadId: initialThreadId, recipientId, contactName, contactCompany, contactRole, contactAvatarColor, dealAddress } = route.params;

  // ── Active thread ID — starts from route param, set after rpc_create_thread on first send ──
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(initialThreadId);

  // ── Live data hooks ──
  // @backend rpc_get_thread_messages({ p_thread_id }) — load on mount when threadId known
  const { data: rpcMessages } = useThreadMessages(activeThreadId);
  // Legacy hook kept for realtime subscription compatibility
  const { data: liveMessages } = useMessages(activeThreadId ?? '');
  const sendMessage = useSendMessage();
  // @backend rpc_create_thread({ p_recipient_id, p_first_message }) — first message only
  const createThread = useCreateThread();
  const markRead = useMarkThreadRead();
  useRealtimeMessages(activeThreadId ?? '');

  // Mark thread as read when screen mounts
  useEffect(() => {
    if (activeThreadId) markRead.mutate(activeThreadId);
  }, [activeThreadId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth: resolve current user ID for message ownership ──
  const [currentUserId, setCurrentUserId] = useState<string>('');
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setCurrentUserId(data.user.id);
    });
  }, []);

  // ── State ──
  const [messageText, setMessageText] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [toSearchText, setToSearchText] = useState('');
  const [highlightedChip, setHighlightedChip] = useState<string | null>(null);
  const [showAttach, setShowAttach] = useState(false);
  const [pendingAction, setPendingAction] = useState<'photo' | 'document' | null>(null);
  const [attachments, setAttachments] = useState<{ type: 'photo' | 'document'; uri: string; name: string }[]>([]);
  const [messages, setMessages] = useState<Message[]>(FEATURE_FLAGS.USE_MOCK_DATA ? MOCK_MESSAGES : []);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(!!initialThreadId); // true when opening existing thread

  // ── Sync live messages when feature flag is off ──
  // Prefer RPC messages (useThreadMessages) over direct query (useMessages)
  useEffect(() => {
    if (FEATURE_FLAGS.USE_MOCK_DATA) return;
    if (!currentUserId) return; // wait for auth — prevents bubble flash
    // RPC messages from rpc_get_thread_messages
    if (rpcMessages && rpcMessages.length > 0) {
      const adapted = rpcMessages.map((m) => ({
        id: m.id,
        text: m.content ?? '',
        timestamp: new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
        isMine: m.sender_id === currentUserId,
        senderName: m.sender_name ?? undefined,
      }));
      setMessages(adapted);
      return;
    }
    // Fallback: legacy direct query messages
    if (liveMessages && liveMessages.length > 0) {
      const adapted = liveMessages.map((m) => adaptMessageToBubble(m, currentUserId));
      setMessages(adapted);
    }
  }, [rpcMessages, liveMessages, currentUserId]);
  const toInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Recipients
  const [recipients, setRecipients] = useState<Recipient[]>([
    {
      id: 'initial',
      name: contactName,
      company: contactCompany,
      role: contactRole,
      avatarColor: contactAvatarColor,
    },
  ]);

  // Filter contacts for add mode
  const availableContacts = useMemo(() => {
    const recipientIds = new Set(recipients.map((r) => r.name));
    let filtered = ALL_CONTACTS.filter((c) => !recipientIds.has(c.name));
    if (toSearchText.length > 0) {
      const q = toSearchText.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [recipients, toSearchText]);

  // ── Picker useEffect ──
  useEffect(() => {
    if (pendingAction && !showAttach) {
      const timer = setTimeout(async () => {
        if (pendingAction === 'photo') {
          try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return;

            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              quality: 0.8,
            });

            if (!result.canceled && result.assets.length > 0) {
              const newAttachments = result.assets.map((asset) => ({
                type: 'photo' as const,
                uri: asset.uri,
                name: asset.fileName || 'Photo',
              }));
              setAttachments((prev) => [...prev, ...newAttachments]);
            }
          } catch (e) {
            console.log('Photo error:', e);
          }
        } else if (pendingAction === 'document') {
          try {
            const result = await DocumentPicker.getDocumentAsync({});

            if (!result.canceled && result.assets && result.assets.length > 0) {
              const newAttachments = result.assets.map((asset) => ({
                type: 'document' as const,
                uri: asset.uri,
                name: asset.name || 'Document',
              }));
              setAttachments((prev) => [...prev, ...newAttachments]);
            }
          } catch (e) {
            console.log('Document error:', e);
          }
        }
        setPendingAction(null);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [pendingAction, showAttach]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  // ── Handlers ──
  // @backend rpc_send_message({ p_thread_id, p_content }) — subsequent messages
  // @backend rpc_create_thread({ p_recipient_id, p_first_message }) — first message only
  const handleSend = async () => {
    if (messageText.trim().length === 0 && attachments.length === 0) return;

    const content = messageText.trim() || (attachments.length > 0 ? `📎 ${attachments.length} attachment(s)` : '');

    // Declare optimistic message before RPC block so it's accessible in catch
    const newMessageId = `m${Date.now()}`;
    const newMessage: Message = {
      id: newMessageId,
      text: content,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      isMine: true,
    };

    if (!FEATURE_FLAGS.USE_MOCK_DATA) {
      if (activeThreadId) {
        // Thread exists — send message directly via RPC
        sendMessage.mutate({ threadId: activeThreadId, content });
      } else if (recipientId) {
        // First message — create thread via RPC, store returned thread_id
        try {
          const result = await createThread.mutateAsync({
            recipientId,
            firstMessage: content,
          });
          if (result?.thread_id) {
            setActiveThreadId(result.thread_id);
          }
        } catch (err) {
          console.warn('[ChatScreen] createThread failed', err);
          // Remove optimistic message — it was never sent
          setMessages(prev => prev.filter(m => m.id !== newMessageId));
          Alert.alert(
            'Message not sent',
            'Unable to start this conversation. Please try again.',
            [{ text: 'OK' }],
          );
          return; // don't append optimistic message below
        }
      }
    }

    // Append locally for instant feedback (optimistic update)
    setMessages((prev) => [...prev, newMessage]);
    setMessageText('');
    setAttachments([]);
    setHasSentFirstMessage(true);
  };

  const handleAddContactPress = () => {
    setIsAddingContact(true);
    setToSearchText('');
    setTimeout(() => toInputRef.current?.focus(), 100);
  };

  const handleSelectContact = (contact: Recipient) => {
    setRecipients((prev) => [...prev, contact]);
    setToSearchText('');
    setHighlightedChip(null);
    setIsAddingContact(false);
  };

  const handleRemoveRecipient = (name: string) => {
    setRecipients((prev) => prev.filter((r) => r.name !== name));
  };

  const handleDismissContactList = () => {
    setIsAddingContact(false);
    setToSearchText('');
    toInputRef.current?.blur();
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Determine header mode: conversation (has messages) vs compose (new/empty)
  const isConversationMode = hasSentFirstMessage && messages.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* ══════════════════════════════════════════
            HEADER — Two modes
            ══════════════════════════════════════════ */}
        <View style={{ backgroundColor: COLORS.background, borderBottomWidth: 0.68, borderBottomColor: COLORS.border, paddingBottom: 4 }}>
          {isConversationMode && !isAddingContact ? (
            /* ── Conversation header: Back + Avatar + Name/Company ── */
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, height: 48, gap: 12 }}>
              <Pressable
                onPress={() => navigation.goBack()}
                hitSlop={12}
                style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
              >
                <BackIcon />
              </Pressable>
              <SingleAvatar color={recipients[0]?.avatarColor || '#C0C0C0'} name={recipients[0]?.name || '?'} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText, lineHeight: 22 }} numberOfLines={1}>
                  {recipients.length === 1 ? recipients[0]?.name : `${recipients[0]?.name} + ${recipients.length - 1}`}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 18 }} numberOfLines={1}>
                  {dealAddress
                    ? `${contactRole} · ${dealAddress}`
                    : recipients.length === 1 ? recipients[0]?.company : `${recipients.length} members`}
                </Text>
              </View>
              <Pressable
                onPress={() => Alert.alert(
                  'Delete Conversation',
                  'This conversation will be permanently deleted.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => navigation.goBack() },
                  ],
                )}
                hitSlop={12}
                style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
              >
                <TrashIcon />
              </Pressable>
            </View>
          ) : (
            /* ── Compose header: Back + "New Message" + To: field ── */
            <>
              <Pressable onPress={handleDismissContactList} style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, height: 48 }}>
                <Pressable
                  onPress={() => {
                    if (isAddingContact) {
                      handleDismissContactList();
                    } else {
                      navigation.goBack();
                    }
                  }}
                  hitSlop={12}
                  style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
                >
                  <BackIcon />
                </Pressable>
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28, marginLeft: 12 }}>
                  New Message
                </Text>
              </Pressable>

              <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
                <View
                  style={{
                    minHeight: 49,
                    backgroundColor: COLORS.filterBg,
                    borderRadius: 10,
                    borderWidth: 0.68,
                    borderColor: COLORS.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingLeft: 12,
                    paddingRight: 8,
                    paddingVertical: 8,
                    gap: 8,
                    flexWrap: 'wrap',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.secondaryText, lineHeight: 20 }}>To:</Text>

                  {recipients.map((r) => (
                    <View
                      key={r.name}
                      style={{
                        height: 32,
                        paddingLeft: 12,
                        paddingRight: 6,
                        backgroundColor: highlightedChip === r.name ? '#6B9BF2' : COLORS.primary,
                        borderRadius: 9999,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '400', color: '#FFFFFF', lineHeight: 20 }}>{r.name}</Text>
                      <Pressable onPress={() => handleRemoveRecipient(r.name)} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
                        <CloseChipIcon />
                      </Pressable>
                    </View>
                  ))}

                  <TextInput
                    ref={toInputRef}
                    value={toSearchText}
                    onChangeText={(text) => {
                      setToSearchText(text);
                      setHighlightedChip(null);
                      if (!isAddingContact) setIsAddingContact(true);
                    }}
                    onFocus={() => setIsAddingContact(true)}
                    onKeyPress={({ nativeEvent }) => {
                      if (nativeEvent.key === 'Backspace' && toSearchText.length === 0 && recipients.length > 0) {
                        const lastRecipient = recipients[recipients.length - 1].name;
                        if (highlightedChip === lastRecipient) {
                          setRecipients((prev) => prev.slice(0, -1));
                          setHighlightedChip(null);
                        } else {
                          setHighlightedChip(lastRecipient);
                        }
                      } else {
                        setHighlightedChip(null);
                      }
                    }}
                    placeholder={isAddingContact ? 'Search...' : 'Add contact...'}
                    placeholderTextColor="rgba(10, 10, 10, 0.4)"
                    style={{ flex: 1, minWidth: 80, height: 32, fontSize: 14, fontWeight: '400', color: COLORS.darkText, paddingVertical: 0 }}
                  />

                  <View style={{ flex: 1 }} />

                  <Pressable onPress={handleAddContactPress} hitSlop={8} style={({ pressed }) => ({ width: 28, height: 28, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}>
                    <PlusIcon color={COLORS.primary} />
                  </Pressable>
                </View>
              </View>
            </>
          )}
        </View>

        {/* ══════════════════════════════════════════
            BODY
            ══════════════════════════════════════════ */}
        {isAddingContact ? (
          /* ── Add contact list ── */
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, backgroundColor: COLORS.background }}
            keyboardShouldPersistTaps="handled"
          >
            {availableContacts.length > 0 ? (
              availableContacts.map((contact) => (
                <AddContactRow key={contact.id} contact={contact} onPress={handleSelectContact} />
              ))
            ) : (
              <View style={{ padding: 48, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.placeholderText, textAlign: 'center' }}>No more contacts to add</Text>
              </View>
            )}
          </ScrollView>
        ) : messages.length > 0 ? (
          /* ── Message bubbles ── */
          <ScrollView
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, backgroundColor: COLORS.screenBg }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16, gap: 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </ScrollView>
        ) : (
          /* ── Empty state ── */
          <View style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
            <View style={{ paddingTop: 40, alignItems: 'center', gap: 8 }}>
              {recipients.length > 0 && (
                <SingleAvatar color={recipients[0].avatarColor} name={recipients[0].name} size={64} />
              )}
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24, textAlign: 'center' }}>
                  {recipients.length === 0 ? 'New Message' : recipients.length === 1 ? recipients[0].name : `${recipients[0].name} + ${recipients.length - 1} more`}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20, textAlign: 'center' }}>
                  {recipients.length === 0 ? 'Add a recipient to get started' : recipients.length === 1 ? `${recipients[0].company} • ${recipients[0].role}` : `Group chat • ${recipients.length} members`}
                </Text>
              </View>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.placeholderText, lineHeight: 20, textAlign: 'center' }}>No messages yet</Text>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.placeholderText, lineHeight: 16, textAlign: 'center' }}>Start the conversation!</Text>
              </View>
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════
            MESSAGE INPUT BAR
            ══════════════════════════════════════════ */}
        <View
          style={{
            backgroundColor: COLORS.background,
            borderTopWidth: 0.68,
            borderTopColor: COLORS.border,
            paddingTop: 8,
            paddingBottom: 0,
            paddingHorizontal: 16,
          }}
        >
          {/* Attachment previews */}
          {attachments.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
            >
              {attachments.map((att, index) => (
                <View
                  key={`${att.uri}-${index}`}
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 12,
                    backgroundColor: att.type === 'photo' ? '#000000' : COLORS.filterBg,
                    borderWidth: 0.68,
                    borderColor: COLORS.border,
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {att.type === 'photo' ? (
                    <Image source={{ uri: att.uri }} style={{ width: 72, height: 72 }} />
                  ) : (
                    <View style={{ alignItems: 'center', gap: 4 }}>
                      <DocumentPreviewIcon />
                      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.secondaryText, textAlign: 'center', paddingHorizontal: 4 }} numberOfLines={1}>
                        {att.name}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    onPress={() => handleRemoveAttachment(index)}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 20,
                      height: 20,
                      borderRadius: 9999,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
                      <Path d="M2 2L8 8" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
                      <Path d="M8 2L2 8" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
                    </Svg>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <SafeAreaView edges={['bottom']} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                onFocus={handleDismissContactList}
                placeholder="Type a message..."
                placeholderTextColor="rgba(10, 10, 10, 0.5)"
                style={{ fontSize: 16, fontWeight: '400', color: COLORS.darkText }}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSend}
              />
            </View>

            <Pressable
              onPress={handleSend}
              hitSlop={8}
              style={({ pressed }) => ({ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', opacity: (messageText.trim().length > 0 || attachments.length > 0) ? (pressed ? 0.5 : 1) : 0.5 })}
            >
              <SendIcon />
            </Pressable>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>

      <AttachSheet
        visible={showAttach}
        onClose={() => setShowAttach(false)}
        onPhotoPress={() => { setPendingAction('photo'); setShowAttach(false); }}
        onDocumentPress={() => { setPendingAction('document'); setShowAttach(false); }}
      />
    </SafeAreaView>
  );
};

export default ChatScreen;