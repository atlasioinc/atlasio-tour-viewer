// InboxList.tsx
// ═══════════════════════════════════════════════════════════════
// Inbox List Screen — Agent inbox (683 lines)
// Thread list with Pinned / Recent sections
// Swipe-right: Pin/Unpin  |  Swipe-left: Mute, Delete
// Navigates to ChatScreen (1:1) or DealChatScreen (deal thread)
//
// Sections: Navigation Type, SVG Icons, Data Types, Mock Data,
//           Swipe Constants, Avatar, Swipeable Thread Row, Main Screen
//
// @demo  12 mock threads with unread counts + pinned state
//        Feature flag gate: FEATURE_FLAGS.USE_MOCK_DATA
// @backend useChatThreads (wired) — threads + profiles join
// @backend TODO: pin/mute/delete mutations — update threads table
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  LayoutAnimation,
  UIManager,
  Platform,
  Animated,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Line } from 'react-native-svg';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import SearchField from './SearchField';
import type { InboxStackParamList } from './InboxStack';
import { COLORS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useChatThreads, useInboxThreads, useArchiveThread } from '../hooks/useData';
import { adaptChatThreadToLocal, adaptInboxThreadToLocal } from '../lib/typeAdapters';
import { VerificationBanner } from './shared';
import { useVerificationGate } from '../hooks/useVerificationGate';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────
// NAVIGATION TYPE
// ─────────────────────────────────────────────
type InboxNavProp = NativeStackNavigationProp<InboxStackParamList, 'InboxList'>;

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const PlusIcon: React.FC = () => (
  <Svg width={28} height={28} viewBox="0 0 28 28" fill="none">
    <Path d="M14 6V22" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M6 14H22" stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const PinIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 17V21M15.6 3.6L20.4 8.4C20.8 8.8 20.8 9.5 20.3 9.9L16.5 12.8C16.3 12.9 16.2 13.2 16.2 13.4V15.5C16.2 15.8 16 16.1 15.7 16.2L8.3 16.2C8 16.1 7.8 15.8 7.8 15.5V13.4C7.8 13.2 7.7 12.9 7.5 12.8L3.7 9.9C3.2 9.5 3.2 8.8 3.6 8.4L8.4 3.6C8.8 3.2 9.5 3.2 9.9 3.7L12.8 7.5C12.9 7.7 13.2 7.8 13.4 7.8H13.4C13.6 7.8 13.9 7.7 14 7.5L14.1 7.5"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UnpinIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 17V21M15.6 3.6L20.4 8.4C20.8 8.8 20.8 9.5 20.3 9.9L16.5 12.8C16.3 12.9 16.2 13.2 16.2 13.4V15.5C16.2 15.8 16 16.1 15.7 16.2L8.3 16.2C8 16.1 7.8 15.8 7.8 15.5V13.4C7.8 13.2 7.7 12.9 7.5 12.8L3.7 9.9C3.2 9.5 3.2 8.8 3.6 8.4L8.4 3.6C8.8 3.2 9.5 3.2 9.9 3.7L12.8 7.5C12.9 7.7 13.2 7.8 13.4 7.8H13.4C13.6 7.8 13.9 7.7 14 7.5L14.1 7.5"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1="3" y1="3" x2="21" y2="21" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const MuteIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Line x1="2" y1="2" x2="22" y2="22" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const TrashIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M3 6H5H21" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path
      d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────

interface ChatThread {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  isUnread: boolean;
  unreadCount?: number;
  isPinned: boolean;
  isGroup: boolean;
  memberCount?: number;
  avatarColors: string[];
  isOnline?: boolean;
  /** @demo — role label for deal context threads; replace with thread.contact.role when LIVE */
  contactRole?: string;
  /** @demo — address for deal context threads; replace with thread.deal.address when LIVE */
  dealAddress?: string;
  // Navigation helpers from RPC data
  threadId?: string;
  otherMemberUserId?: string;
  otherMemberCompany?: string;
}

// ─────────────────────────────────────────────
// @demo INITIAL MOCK DATA — 12 threads with pinned/unread state
// @backend Replace with useChatThreads (wired, feature flag gate)
// ─────────────────────────────────────────────

const INITIAL_THREADS: ChatThread[] = [
  {
    id: 't1',
    name: 'My A-Team',
    lastMessage: 'You: CD looks good, closing Friday?',
    timestamp: '2m',
    isUnread: false,
    isPinned: true,
    isGroup: true,
    memberCount: 6,
    avatarColors: ['#C4A882', '#7BA3C9', '#D4A8B5', '#A8C5DA'],
    isOnline: true,
  },
  {
    id: 't2',
    name: '123 Main St – Smith Buyer',
    lastMessage: 'Title: EMD received, CD ready',
    timestamp: '10:45 AM',
    isUnread: true,
    isPinned: false,
    isGroup: true,
    memberCount: 6,
    avatarColors: ['#B5C4A8', '#C9B87B', '#A8B5D4', '#D4C5A8'],
  },
  {
    id: 't3',
    name: 'Alex Chen – Rocket Mortgage',
    lastMessage: "I'll get the updated pre-approval...",
    timestamp: '9:30 AM',
    isUnread: true,
    isPinned: false,
    isGroup: false,
    avatarColors: ['#A8D4C5'],
    // @demo — address hardcoded here; replace with thread.deal.address when LIVE
    contactRole: 'Mortgage Pro',
    dealAddress: '123 Main St, Denver CO',
  },
  {
    id: 't4',
    name: '456 Oak Ave – Johnson Deal',
    lastMessage: 'Inspection scheduled for Monday',
    timestamp: 'Yesterday',
    isUnread: false,
    isPinned: false,
    isGroup: true,
    memberCount: 5,
    avatarColors: ['#D4A8A8', '#B5D4C5', '#C5A8D4', '#A8C4B5'],
  },
  {
    id: 't5',
    name: 'Sarah Martinez – Premier Title',
    lastMessage: 'Closing docs are ready for review',
    timestamp: 'Yesterday',
    isUnread: false,
    isPinned: false,
    isGroup: false,
    avatarColors: ['#D4B5A8'],
    // @demo — address hardcoded here; replace with thread.deal.address when LIVE
    contactRole: 'Title/Escrow',
    dealAddress: '456 Oak Ave, Denver CO',
  },
  {
    id: 't6',
    name: 'Mike Rodriguez – Home Inspector',
    lastMessage: 'Found some minor issues with HVAC',
    timestamp: 'Tuesday',
    isUnread: false,
    isPinned: false,
    isGroup: false,
    avatarColors: ['#7BA3C9'],
  },
  {
    id: 't7',
    name: 'Lisa Chen – Appraisal',
    lastMessage: 'Report will be ready by Thursday',
    timestamp: 'Monday',
    isUnread: false,
    isPinned: false,
    isGroup: false,
    avatarColors: ['#B8A8D4'],
  },
  {
    id: 't8',
    name: '789 Elm St – Davis Listing',
    lastMessage: 'You: Photos look great, listing live tomorrow',
    timestamp: 'Monday',
    isUnread: false,
    isPinned: false,
    isGroup: true,
    memberCount: 4,
    avatarColors: ['#A8D4D4', '#C4A882', '#D4A8C5', '#B5C5D4'],
  },
];

// ─────────────────────────────────────────────
// SWIPE ACTION CONSTANTS
// ─────────────────────────────────────────────

const SWIPE_ACTION_WIDTH = 80;

// ─────────────────────────────────────────────
// AVATAR COMPONENTS
// ─────────────────────────────────────────────

const SingleAvatar: React.FC<{ color: string; name: string; size?: number }> = ({
  color,
  name,
  size = 48,
}) => {
  const initials = (name || '?').split(' ').slice(0, 2).map((n) => n[0] ?? '').join('').substring(0, 2) || '?';
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.34, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};

const GroupAvatar: React.FC<{ colors: string[]; size?: number; isOnline?: boolean }> = ({
  colors,
  size = 48,
  isOnline,
}) => {
  const cellSize = 22;
  const gap = size - cellSize * 2;
  const c = [...colors, '#C0C0C0', '#C0C0C0', '#C0C0C0', '#C0C0C0'].slice(0, 4);
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, width: cellSize, height: cellSize, borderRadius: 9999, backgroundColor: c[0] }} />
      <View style={{ position: 'absolute', left: cellSize + gap, top: 0, width: cellSize, height: cellSize, borderRadius: 9999, backgroundColor: c[1] }} />
      <View style={{ position: 'absolute', left: 0, top: cellSize + gap, width: cellSize, height: cellSize, borderRadius: 9999, backgroundColor: c[2] }} />
      <View style={{ position: 'absolute', left: cellSize + gap, top: cellSize + gap, width: cellSize, height: cellSize, borderRadius: 9999, backgroundColor: c[3] }} />
      {isOnline && (
        <View style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderRadius: 9999, backgroundColor: COLORS.onlineGreen, borderWidth: 1.5, borderColor: '#FFFFFF' }} />
      )}
    </View>
  );
};

// ─────────────────────────────────────────────
// SWIPEABLE THREAD ROW
// ─────────────────────────────────────────────

const SwipeableThreadRow: React.FC<{
  thread: ChatThread;
  onPress: (thread: ChatThread) => void;
  onTogglePin: (threadId: string) => void;
  onMute: (threadId: string) => void;
  onDelete: (threadId: string) => void;
}> = ({ thread, onPress, onTogglePin, onMute, onDelete }) => {
  const swipeableRef = useRef<Swipeable>(null);

  // ── Swipe RIGHT -> Pin / Unpin (single action) ──
  const renderLeftActions = useCallback(
    (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const scale = dragX.interpolate({
        inputRange: [0, SWIPE_ACTION_WIDTH],
        outputRange: [0.6, 1],
        extrapolate: 'clamp',
      });
      const opacity = dragX.interpolate({
        inputRange: [0, SWIPE_ACTION_WIDTH * 0.5, SWIPE_ACTION_WIDTH],
        outputRange: [0, 0.5, 1],
        extrapolate: 'clamp',
      });

      return (
        <Pressable
          onPress={() => {
            swipeableRef.current?.close();
            onTogglePin(thread.id);
          }}
          style={{
            width: SWIPE_ACTION_WIDTH,
            backgroundColor: COLORS.primary,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Animated.View style={{ alignItems: 'center', gap: 4, transform: [{ scale }], opacity }}>
            {thread.isPinned ? <UnpinIcon /> : <PinIcon />}
            <Text style={{ fontSize: 12, fontWeight: '500', color: '#FFFFFF', lineHeight: 16 }}>
              {thread.isPinned ? 'Unpin' : 'Pin'}
            </Text>
          </Animated.View>
        </Pressable>
      );
    },
    [thread.id, thread.isPinned, onTogglePin],
  );

  // ── Swipe LEFT -> Mute + Delete (two actions) ──
  const renderRightActions = useCallback(
    (_progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
      const scale = dragX.interpolate({
        inputRange: [-(SWIPE_ACTION_WIDTH * 2), 0],
        outputRange: [1, 0.6],
        extrapolate: 'clamp',
      });
      const opacity = dragX.interpolate({
        inputRange: [-(SWIPE_ACTION_WIDTH * 2), -(SWIPE_ACTION_WIDTH * 0.5), 0],
        outputRange: [1, 0.5, 0],
        extrapolate: 'clamp',
      });

      return (
        <View style={{ flexDirection: 'row' }}>
          {/* Mute */}
          <Pressable
            onPress={() => {
              swipeableRef.current?.close();
              onMute(thread.id);
            }}
            style={{
              width: SWIPE_ACTION_WIDTH,
              backgroundColor: '#6B7280',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Animated.View style={{ alignItems: 'center', gap: 4, transform: [{ scale }], opacity }}>
              <MuteIcon />
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#FFFFFF', lineHeight: 16 }}>Mute</Text>
            </Animated.View>
          </Pressable>

          {/* Delete */}
          <Pressable
            onPress={() => {
              swipeableRef.current?.close();
              onDelete(thread.id);
            }}
            style={{
              width: SWIPE_ACTION_WIDTH,
              backgroundColor: '#EF4444',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Animated.View style={{ alignItems: 'center', gap: 4, transform: [{ scale }], opacity }}>
              <TrashIcon />
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#FFFFFF', lineHeight: 16 }}>Delete</Text>
            </Animated.View>
          </Pressable>
        </View>
      );
    },
    [thread.id, onMute, onDelete],
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={SWIPE_ACTION_WIDTH}
      rightThreshold={SWIPE_ACTION_WIDTH}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      <Pressable
        onPress={() => onPress(thread)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 24,
          paddingVertical: 16,
          backgroundColor: COLORS.background,
          borderBottomWidth: 0.68,
          borderBottomColor: COLORS.cardBorder,
          gap: 12,
          opacity: pressed ? 0.9 : 1,
        })}
      >
        {thread.isGroup ? (
          <GroupAvatar colors={thread.avatarColors} isOnline={thread.isOnline} />
        ) : (
          <SingleAvatar color={thread.avatarColors[0]} name={thread.name} />
        )}

        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text
              style={{ flex: 1, fontSize: 16, fontWeight: thread.isUnread ? '600' : '400', color: COLORS.darkText, lineHeight: 24 }}
              numberOfLines={1}
            >
              {thread.name || 'Unknown'}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: thread.isUnread ? '600' : '400', color: thread.isUnread ? COLORS.primary : COLORS.secondaryText, lineHeight: 16, marginLeft: 8 }}>
              {thread.timestamp}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text
              style={{ flex: 1, fontSize: 14, fontWeight: thread.isUnread ? '500' : '400', color: thread.isUnread ? COLORS.bodyText : COLORS.secondaryText, lineHeight: 20 }}
              numberOfLines={1}
            >
              {thread.lastMessage}
            </Text>

            {thread.isGroup && thread.memberCount && (
              <View style={{ height: 20, paddingHorizontal: 8, backgroundColor: COLORS.primary, borderRadius: 9999, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '400', color: '#FFFFFF', lineHeight: 16 }}>
                  {thread.memberCount} members
                </Text>
              </View>
            )}

            {thread.isUnread && (
              (thread.unreadCount ?? 0) > 0 ? (
                <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 9999, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
                    {(thread.unreadCount ?? 0) > 99 ? '99+' : thread.unreadCount}
                  </Text>
                </View>
              ) : (
                <View style={{ width: 8, height: 8, borderRadius: 9999, backgroundColor: COLORS.primary }} />
              )
            )}
          </View>
        </View>
      </Pressable>
    </Swipeable>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════

const InboxList: React.FC = () => {
  const navigation = useNavigation<InboxNavProp>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [searchText, setSearchText] = useState('');
  const [threads, setThreads] = useState<ChatThread[]>(INITIAL_THREADS);
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const { showBanner: showVerifyBanner, level: verifyLevel } = useVerificationGate();

  // ── Archive thread mutation ──
  // @backend rpc_archive_thread({ p_thread_id })
  const archiveThread = useArchiveThread();

  // ── Live data hooks ──
  // @backend rpc_get_inbox_threads() — no params, auth.uid()
  // Returns threads with other_member profile + unread_count
  const { data: inboxThreads, refetch: refetchInbox, isRefetching: isInboxRefetching } = useInboxThreads();
  // Legacy hook kept for backward compatibility
  const { data: liveThreads } = useChatThreads();

  React.useEffect(() => {
    if (FEATURE_FLAGS.USE_MOCK_DATA) return;
    // Prefer RPC-based inbox threads over legacy direct query
    if (inboxThreads !== undefined && inboxThreads !== null) {
      setThreads(inboxThreads.map(adaptInboxThreadToLocal));
      return;
    }
    // Fallback: legacy useChatThreads
    if (liveThreads) {
      setThreads(liveThreads.map(adaptChatThreadToLocal));
    }
  }, [inboxThreads, liveThreads]);

  // Scroll to top when screen comes into focus (e.g., back from ChatScreen)
  useFocusEffect(
    useCallback(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    }, []),
  );

  const filteredThreads = threads.filter((t) => {
    if (searchText.length === 0) return true;
    const q = searchText.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.lastMessage.toLowerCase().includes(q);
  });

  const pinnedThreads = filteredThreads.filter((t) => t.isPinned);
  const recentThreads = filteredThreads.filter((t) => !t.isPinned);

  // ── Toggle pin state ──
  // Animates the row moving between pinned/recent sections.
  // Backend: UPDATE conversations SET pinned_at = now()/NULL WHERE id = ?
  const handleTogglePin = useCallback((threadId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setThreads((prev) =>
      prev.map((t) => (t.id === threadId ? { ...t, isPinned: !t.isPinned } : t)),
    );
    // TODO: TanStack mutation -> supabase.from('conversations').update({ pinned_at })
  }, []);

  // ── Mute thread ──
  const handleMute = useCallback((threadId: string) => {
    console.log('Mute thread:', threadId);
    // TODO: TanStack mutation -> supabase.from('conversations').update({ muted_at: now() })
  }, []);

  // ── Delete (archive) thread ──
  // @backend rpc_archive_thread({ p_thread_id }) — sets is_archived = true
  const handleDelete = useCallback((threadId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Optimistic removal for instant UI feedback
    setThreads((prev) => prev.filter((t) => t.id !== threadId));
    // Persist archive to Supabase — cache invalidation refreshes on success
    archiveThread.mutateAsync(threadId).catch((error) => {
      console.error('[handleDelete] archive failed:', error);
    });
  }, [archiveThread]);

  // ── Navigate to chat screen ──
  const handleThreadPress = useCallback((thread: ChatThread) => {
    if (thread.isGroup) {
      const parts = (thread.name ?? '').split(/\s[-\u2013]\s/);
      const propertyAddress = parts[0] ?? '';

      navigation.navigate('DealChatScreen' as any, {
        dealName: thread.name ?? '',
        propertyAddress,
        closingDate: '',
      });
    } else {
      // Use RPC-sourced fields when available, fall back to parsed name
      const resolvedThreadId = thread.threadId ?? thread.id;
      const parts = (thread.name ?? '').split(/\s[-\u2013]\s/);
      const contactName = parts[0] ?? thread.name ?? 'Unknown';
      const contactCompany = thread.otherMemberCompany ?? parts[1] ?? '';

      navigation.push('ChatScreen', {
        threadId: resolvedThreadId,
        contactName,
        contactCompany,
        contactRole: thread.contactRole ?? '',
        contactAvatarColor: (thread.avatarColors ?? [])[0] ?? '#7BA3C9',
        dealAddress: thread.dealAddress,
      });
    }
  }, [navigation]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

        {/* Sticky Header */}
        <View style={{ backgroundColor: COLORS.background, borderBottomWidth: 0.68, borderBottomColor: COLORS.border, paddingTop: 0, paddingBottom: 12, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '500', lineHeight: 24 }}>
              Inbox
            </Text>
            <SearchField
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search messages..."
            />
          </View>
        </View>

        {/* Thread List */}
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: COLORS.screenBg }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isInboxRefetching}
              onRefresh={refetchInbox}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >

          {/* ── Verification Banner — inside scroll so it sits on screenBg naturally ── */}
          {showVerifyBanner && !verifyBannerDismissed && (
            <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 }}>
              <VerificationBanner
                level={verifyLevel}
                role="agent"
                onPress={() => navigation.dispatch(
                  CommonActions.navigate({ name: 'Profile', params: { screen: 'Verification' } }),
                )}
                onDismiss={() => setVerifyBannerDismissed(true)}
              />
            </View>
          )}
          {threads.length === 0 && searchText.length === 0 ? (
            /* ── True Empty State — No conversations yet ── */
            /* @demo Replace threads.length check with real thread count from useChatThreads() */
            <View style={{ paddingTop: 80, paddingBottom: 48, paddingHorizontal: 32, alignItems: 'center', gap: 16 }}>
              {/* Chat bubble icon */}
              <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                <Path d="M21 15C21 15.5304 20.7893 16.0391 20.4142 16.4142C20.0391 16.7893 19.5304 17 19 17H7L3 21V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V15Z" stroke={COLORS.lightText} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28, textAlign: 'center' }}>
                Start a conversation
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 22, textAlign: 'center' }}>
                Send a 1:1 message to a connection or kick off a Deal Chat for your next transaction.
              </Text>
              <Pressable
                onPress={() => navigation.navigate('NewMessage')}
                style={({ pressed }) => ({
                  marginTop: 8,
                  height: 44,
                  paddingHorizontal: 32,
                  backgroundColor: COLORS.primary,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 }}>
                  New Message
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* Pinned Section */}
              {pinnedThreads.length > 0 && (
                <View>
                  <View style={{ paddingHorizontal: 24, paddingTop: 0, paddingBottom: 8, backgroundColor: COLORS.screenBg }}>
                    <Text style={{ color: COLORS.secondaryText, fontSize: 12, fontWeight: '400', textTransform: 'uppercase', lineHeight: 16, letterSpacing: 0.3 }}>
                      Pinned
                    </Text>
                  </View>
                  {pinnedThreads.map((thread) => (
                    <SwipeableThreadRow
                      key={thread.id}
                      thread={thread}
                      onPress={handleThreadPress}
                      onTogglePin={handleTogglePin}
                      onMute={handleMute}
                      onDelete={handleDelete}
                    />
                  ))}
                </View>
              )}

              {/* Recent Section */}
              <View>
                <View style={{ paddingHorizontal: 24, paddingTop: 0, paddingBottom: 8, backgroundColor: COLORS.screenBg }}>
                  <Text style={{ color: COLORS.secondaryText, fontSize: 12, fontWeight: '400', textTransform: 'uppercase', lineHeight: 16, letterSpacing: 0.3 }}>
                    Recent
                  </Text>
                </View>
                <View style={{ backgroundColor: COLORS.background }}>
                  {recentThreads.length > 0 ? (
                    recentThreads.map((thread) => (
                      <SwipeableThreadRow
                        key={thread.id}
                        thread={thread}
                        onPress={handleThreadPress}
                        onTogglePin={handleTogglePin}
                        onMute={handleMute}
                        onDelete={handleDelete}
                      />
                    ))
                  ) : (
                    /* ── Search Empty State — No matches for current query ── */
                    <View style={{ padding: 48, alignItems: 'center', gap: 12 }}>
                      <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
                        <Path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke={COLORS.lightText} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M21 21L16.65 16.65" stroke={COLORS.lightText} strokeWidth={1.5} strokeLinecap="round" />
                      </Svg>
                      <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.bodyText }}>
                        No messages found
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, textAlign: 'center' }}>
                        Try adjusting your search
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* FAB — navigates to NewMessage screen */}
        <Pressable
          onPress={() => navigation.navigate('NewMessage')}
          style={({ pressed }) => ({
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 9999,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 15,
            elevation: 8,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <PlusIcon />
        </Pressable>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

export default InboxList;
