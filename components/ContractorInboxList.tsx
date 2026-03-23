// ContractorInboxList.tsx
// ═══════════════════════════════════════════════════════════════
// Contractor Inbox — Job-Scoped Chat Threads (812 lines)
//
// Business rule: Contractors can ONLY chat in the context of a job.
// No proactive outreach, no standalone DMs. Every thread is tied
// to a repair job via jobId. This protects the commission model —
// all contractor ↔ agent interactions flow through billable jobs.
//
// Thread creation triggers:
//   1. Invited to a job → thread auto-creates
//   2. Bid submitted → thread opens with posting agent
//   3. Active job (awarded/in_progress) → ongoing channel
//
// Thread lifecycle:
//   - Active: invited / bid_submitted / awarded / in_progress → read/write
//   - Past: completed / cancelled → read-only archive, swipe to delete
//
// Sections: SVG Icons, Avatar, Status Badge, Data Types, Mock Data,
//           Thread Row, Section Header, Empty State, Main Component
// No search, no FAB — intentionally minimal (business-scoped only)
//
// @demo  12 mock threads (8 active, 4 past) with unread counts (lines ~225–340)
// @backend TODO: useContractorJobChats() — replace mock data
//   → supabase.from('job_chat_threads')
//     .select('*, jobs(title, address, status, due_date), profiles!agent_id(name, avatar_url)')
//     .eq('contractor_id', auth.uid())
//     .order('last_message_at', { ascending: false })
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import { Swipeable } from 'react-native-gesture-handler';
import { COLORS, DIMENSIONS, TYPOGRAPHY } from '../lib/tokens';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}


// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const LocationPinIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 1.33C5.42 1.33 3.33 3.42 3.33 6C3.33 9.5 8 14.67 8 14.67C8 14.67 12.67 9.5 12.67 6C12.67 3.42 10.58 1.33 8 1.33Z"
      stroke={COLORS.lightText}
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={8} cy={6} r={2} stroke={COLORS.lightText} strokeWidth={1.33} />
  </Svg>
);

const ChatBubbleIcon: React.FC<{ color?: string }> = ({ color = COLORS.primary }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M17.5 9.58C17.5 13.26 14.14 16.25 10 16.25C9.09 16.25 8.22 16.1 7.41 15.83L3.33 17.5L4.58 14.17C3.27 12.92 2.5 11.32 2.5 9.58C2.5 5.9 5.86 2.92 10 2.92C14.14 2.92 17.5 5.9 17.5 9.58Z"
      stroke={color}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LockIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M3.5 5.5V3.5C3.5 2.12 4.62 1 6 1C7.38 1 8.5 2.12 8.5 3.5V5.5M2.5 5.5H9.5C10.05 5.5 10.5 5.95 10.5 6.5V10C10.5 10.55 10.05 11 9.5 11H2.5C1.95 11 1.5 10.55 1.5 10V6.5C1.5 5.95 1.95 5.5 2.5 5.5Z"
      stroke={COLORS.lightText}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrashIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M2.25 4.5H15.75M6 4.5V3C6 2.17 6.67 1.5 7.5 1.5H10.5C11.33 1.5 12 2.17 12 3V4.5M14.25 4.5V15C14.25 15.83 13.58 16.5 12.75 16.5H5.25C4.42 16.5 3.75 15.83 3.75 15V4.5H14.25Z"
      stroke="#FFFFFF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{
  name: string;
  color: string;
  size?: number;
}> = ({ name, color, size = 48 }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.35, fontWeight: '600', color: '#FFFFFF' }}>
        {initials}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────

interface ThreadStatusConfig {
  label: string;
  bgColor: string;
  textColor: string;
}

const THREAD_STATUS_MAP: Record<string, ThreadStatusConfig> = {
  invited: {
    label: 'Invited',
    bgColor: 'rgba(0, 61, 195, 0.08)',
    textColor: COLORS.primary,
  },
  bid_submitted: {
    label: 'Bid Sent',
    bgColor: 'rgba(0, 61, 195, 0.08)',
    textColor: COLORS.primary,
  },
  awarded: {
    label: 'Awarded',
    bgColor: 'rgba(22, 163, 74, 0.10)',
    textColor: COLORS.feeText,
  },
  in_progress: {
    label: 'In Progress',
    bgColor: 'rgba(22, 163, 74, 0.10)',
    textColor: COLORS.feeText,
  },
  pending_completion: {
    label: 'Pending Review',
    bgColor: 'rgba(234, 88, 12, 0.10)',
    textColor: COLORS.counterAmber,
  },
  completed: {
    label: 'Completed',
    bgColor: COLORS.cardBorder,
    textColor: COLORS.mutedText,
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: COLORS.cardBorder,
    textColor: COLORS.lightText,
  },
};

const ThreadStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config = THREAD_STATUS_MAP[status];
  if (!config) return null;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: config.bgColor,
        borderRadius: 9999,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: config.textColor, lineHeight: 16 }}>
        {config.label}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────

type ThreadStatus = 'invited' | 'bid_submitted' | 'awarded' | 'in_progress' | 'pending_completion' | 'completed' | 'cancelled';

interface JobChatThread {
  id: string;
  jobId: string;
  jobTitle: string;
  jobStatus: ThreadStatus;
  address: string;
  agentName: string;
  agentAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  trade: string;
}

// ─────────────────────────────────────────────
// @demo MOCK DATA — 12 threads (8 active, 4 past)
// ─────────────────────────────────────────────

/**
 * Job chat threads — one thread per job the contractor is involved with.
 * @demo Replace with live data from useContractorJobChats() hook
 * @backend supabase.from('job_chat_threads')
 *   .select('*, jobs(title, address, status, due_date, trade), profiles!agent_id(name, avatar_url)')
 *   .eq('contractor_id', auth.uid())
 *   .order('last_message_at', { ascending: false })
 */
const MOCK_ACTIVE_THREADS: JobChatThread[] = [
  {
    id: 'thread1',
    jobId: 'aj1',
    jobTitle: 'Fix Leaking Kitchen Faucet',
    jobStatus: 'in_progress',
    address: '4521 Elm Street, Denver CO',
    agentName: 'Rachel Williams',
    agentAvatar: '#C4A882',
    lastMessage: 'Sounds good, I\'ll have the parts by Thursday morning.',
    lastMessageTime: '2m ago',
    unreadCount: 0,
    trade: 'Plumber',
  },
  {
    id: 'thread2',
    jobId: 'aj2',
    jobTitle: 'Bathroom Pipe Replacement',
    jobStatus: 'pending_completion',
    address: '782 Maple Drive, Lakewood CO',
    agentName: 'Marcus Lee',
    agentAvatar: '#B5C4A8',
    lastMessage: 'Photos uploaded — please review when you get a chance.',
    lastMessageTime: '1h ago',
    unreadCount: 0,
    trade: 'Plumber',
  },
  {
    id: 'thread3',
    jobId: 'aj3',
    jobTitle: 'Install Water Heater',
    jobStatus: 'awarded',
    address: '1150 Pine Court, Aurora CO',
    agentName: 'Emma Thompson',
    agentAvatar: '#A8C5DA',
    lastMessage: 'Great! When can you start?',
    lastMessageTime: '3h ago',
    unreadCount: 2,
    trade: 'Plumber',
  },
  {
    id: 'thread4',
    jobId: 'inv1',
    jobTitle: 'Hot Water Heater Repair',
    jobStatus: 'bid_submitted',
    address: '331 Oak Boulevard, Denver CO',
    agentName: 'Rachel Williams',
    agentAvatar: '#C4A882',
    lastMessage: 'I submitted my bid — $450 with 2-day turnaround.',
    lastMessageTime: '5h ago',
    unreadCount: 1,
    trade: 'Plumber',
  },
  {
    id: 'thread5',
    jobId: 'inv2',
    jobTitle: 'Pipe Insulation',
    jobStatus: 'invited',
    address: '1847 Elm Street, Denver CO',
    agentName: 'Tom Anderson',
    agentAvatar: '#C5D4A8',
    lastMessage: 'Hey Brian, I have a job that\'s right up your alley.',
    lastMessageTime: '5h ago',
    unreadCount: 1,
    trade: 'Plumber',
  },
];

const MOCK_PAST_THREADS: JobChatThread[] = [
  {
    id: 'thread6',
    jobId: 'past1',
    jobTitle: 'Garbage Disposal Install',
    jobStatus: 'completed',
    address: '912 Cedar Road, Denver CO',
    agentName: 'Sarah Chen',
    agentAvatar: '#A8B5D4',
    lastMessage: 'Thanks Brian, great work as always! Left you a vouch.',
    lastMessageTime: 'Feb 20',
    unreadCount: 0,
    trade: 'Plumber',
  },
  {
    id: 'thread7',
    jobId: 'past2',
    jobTitle: 'Water Line Repair',
    jobStatus: 'completed',
    address: '2340 Birch Way, Centennial CO',
    agentName: 'Lisa Martinez',
    agentAvatar: '#B8A8D4',
    lastMessage: 'Perfect, the homeowner is really happy.',
    lastMessageTime: 'Feb 15',
    unreadCount: 0,
    trade: 'Plumber',
  },
  {
    id: 'thread8',
    jobId: 'past3',
    jobTitle: 'Sump Pump Replacement',
    jobStatus: 'cancelled',
    address: '605 Spruce Lane, Lakewood CO',
    agentName: 'David Kim',
    agentAvatar: '#A8D4B5',
    lastMessage: 'Sorry, the seller decided not to do the repair.',
    lastMessageTime: 'Feb 10',
    unreadCount: 0,
    trade: 'Plumber',
  },
];

// ─────────────────────────────────────────────
// THREAD ROW COMPONENT
// ─────────────────────────────────────────────

interface ThreadRowProps {
  thread: JobChatThread;
  onPress: () => void;
  isPast?: boolean;
}

const ThreadRow: React.FC<ThreadRowProps> = ({ thread, onPress, isPast = false }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      flexDirection: 'row',
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
      backgroundColor: pressed ? COLORS.filterBg : COLORS.background,
      opacity: isPast ? 0.75 : 1,
    })}
  >
    {/* Avatar */}
    <View style={{ position: 'relative' }}>
      <AvatarPlaceholder name={thread.agentName} color={thread.agentAvatar} size={48} />
      {/* Unread dot */}
      {thread.unreadCount > 0 && (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 20,
            height: 20,
            borderRadius: 9999,
            backgroundColor: COLORS.notificationRed,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: COLORS.background,
          }}
        >
          <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>
            {thread.unreadCount}
          </Text>
        </View>
      )}
    </View>

    {/* Content */}
    <View style={{ flex: 1, gap: 4 }}>
      {/* Row 1: Agent name + timestamp */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 15,
            fontWeight: thread.unreadCount > 0 ? '600' : '500',
            color: COLORS.darkText,
            lineHeight: 22,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {thread.agentName}
        </Text>
        <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.lightText, lineHeight: 18, marginLeft: 8 }}>
          {thread.lastMessageTime}
        </Text>
      </View>

      {/* Row 2: Address + Status badge */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
          <LocationPinIcon />
          <Text
            style={{
              fontSize: 13,
              fontWeight: '400',
              color: COLORS.secondaryText,
              lineHeight: 18,
              flex: 1,
            }}
            numberOfLines={1}
          >
            {thread.address}
          </Text>
        </View>
        <ThreadStatusBadge status={thread.jobStatus} />
      </View>

      {/* Row 3: Last message preview */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {isPast && <LockIcon />}
        <Text
          style={{
            fontSize: 14,
            fontWeight: thread.unreadCount > 0 ? '500' : '400',
            color: thread.unreadCount > 0 ? COLORS.darkText : COLORS.lightText,
            lineHeight: 20,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {thread.lastMessage}
        </Text>
      </View>
    </View>
  </Pressable>
);

// ─────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; count: number }> = ({ title, count }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 8,
    }}
  >
    <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16, textTransform: 'uppercase', letterSpacing: 0.3 }}>
      {title}
    </Text>
    <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16, letterSpacing: 0.3 }}>
      {count}
    </Text>
  </View>
);

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────

const EmptyInbox: React.FC = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 9999,
        backgroundColor: COLORS.screenBg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ChatBubbleIcon color={COLORS.lightText} />
    </View>
    <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24, textAlign: 'center' }}>
      No job chats yet
    </Text>
    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20, textAlign: 'center', maxWidth: 280 }}>
      Your conversations will appear here when you{"'"}re invited to a job, submit a bid, or start working on a repair.
    </Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ContractorInboxList: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [isFilled, setIsFilled] = useState<boolean>(true);

  // @demo Replace with hook data
  const activeThreads = isFilled ? MOCK_ACTIVE_THREADS : [];
  const pastThreads = isFilled ? MOCK_PAST_THREADS : [];

  // Deletion handler for past threads
  // @backend supabase.from('job_chat_threads').update({ deleted_by_contractor: true }).eq('id', threadId)
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const handleDeleteThread = (threadId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setDeletedIds((prev) => new Set(prev).add(threadId));
  };

  const visibleActiveThreads = activeThreads.filter((t) => !deletedIds.has(t.id));
  const visiblePastThreads = pastThreads.filter((t) => !deletedIds.has(t.id));

  const hasAnyThreads = visibleActiveThreads.length > 0 || visiblePastThreads.length > 0;

  const handleThreadPress = (thread: JobChatThread) => {
    navigation.navigate('ChatScreen', {
      threadId: thread.id,
      contactName: thread.agentName,
      contactCompany: '', // @backend: fetch from agent profile
      contactRole: 'Agent',
      contactAvatarColor: thread.agentAvatar,
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          HEADER — Job Chats (matches JobTracker / MyProfile header)
          ══════════════════════════════════════════ */}
      <View
        style={{
          height: DIMENSIONS.headerHeight,
          alignItems: 'center',
          justifyContent: 'center',
          borderBottomWidth: DIMENSIONS.headerBorderWidth,
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.background,
          paddingBottom: 4,
        }}
      >
        <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.primary }}>
          Job Chats
        </Text>
      </View>

      {/* ══════════════════════════════════════════
          SCROLLABLE CONTENT
          ══════════════════════════════════════════ */}
      {hasAnyThreads ? (
        <ScrollView
          style={{ flex: 1, backgroundColor: COLORS.background }}
          showsVerticalScrollIndicator={false}
          contentOffset={{ x: 0, y: 56 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── DEMO TOGGLE — visible on pull down ──
              @demo Remove entire block for production */}
          <View
            style={{
              backgroundColor: COLORS.screenBg,
              paddingVertical: 8,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable
              onPress={() => setIsFilled(false)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                backgroundColor: !isFilled ? COLORS.primary : 'transparent',
                borderRadius: 8,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: !isFilled ? '#FFFFFF' : COLORS.primary }}>
                Empty
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsFilled(true)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                backgroundColor: isFilled ? COLORS.primary : 'transparent',
                borderRadius: 8,
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderWidth: 1,
                borderLeftWidth: 0,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: isFilled ? '#FFFFFF' : COLORS.primary }}>
                Filled
              </Text>
            </Pressable>
          </View>

          {/* ─── ACTIVE THREADS ─── */}
          {visibleActiveThreads.length > 0 && (
            <View>
              <SectionHeader title="Active Jobs" count={visibleActiveThreads.length} />
              {visibleActiveThreads.map((thread, index) => (
                <View key={thread.id}>
                  <Swipeable
                    renderRightActions={() => (
                      <Pressable
                        onPress={() => {
                          // @demo — log delete action to console
                          console.log(`delete thread ${thread.id}`);
                          // @backend: rpc_delete_chat_thread(threadId)
                          handleDeleteThread(thread.id);
                        }}
                        style={{
                          backgroundColor: COLORS.errorRed,
                          width: 80,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <TrashIcon />
                      </Pressable>
                    )}
                    rightThreshold={40}
                    overshootRight={false}
                  >
                    <ThreadRow
                      thread={thread}
                      onPress={() => handleThreadPress(thread)}
                    />
                  </Swipeable>
                  {index < visibleActiveThreads.length - 1 && (
                    <View style={{ height: 0.68, backgroundColor: COLORS.border, marginLeft: 76 }} />
                  )}
                </View>
              ))}
            </View>
          )}

          {/* ─── PAST THREADS ─── */}
          {visiblePastThreads.length > 0 && (
            <View>
              <SectionHeader title="Past Jobs" count={visiblePastThreads.length} />
              {visiblePastThreads.map((thread, index) => (
                <View key={thread.id}>
                  <Swipeable
                    renderRightActions={() => (
                      <Pressable
                        onPress={() => {
                          // @demo — log delete action to console
                          console.log(`delete thread ${thread.id}`);
                          // @backend: rpc_delete_chat_thread(threadId)
                          handleDeleteThread(thread.id);
                        }}
                        style={{
                          backgroundColor: COLORS.errorRed,
                          width: 80,
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <TrashIcon />
                      </Pressable>
                    )}
                    rightThreshold={40}
                    overshootRight={false}
                  >
                    <ThreadRow
                      thread={thread}
                      onPress={() => handleThreadPress(thread)}
                      isPast
                    />
                  </Swipeable>
                  {index < visiblePastThreads.length - 1 && (
                    <View style={{ height: 0.68, backgroundColor: COLORS.border, marginLeft: 76 }} />
                  )}
                </View>
              ))}

              {/* Read-only notice */}
              <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    backgroundColor: COLORS.screenBg,
                    borderRadius: 8,
                  }}
                >
                  <LockIcon />
                  <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.lightText, lineHeight: 18, flex: 1 }}>
                    Past job chats are read-only archives
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Bottom spacing */}
          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        /* ── EMPTY STATE ── */
        <View style={{ flex: 1 }}>
          {/* Demo toggle also shown in empty state */}
          <View
            style={{
              backgroundColor: COLORS.screenBg,
              paddingVertical: 8,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable
              onPress={() => setIsFilled(false)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                backgroundColor: !isFilled ? COLORS.primary : 'transparent',
                borderRadius: 8,
                borderTopRightRadius: 0,
                borderBottomRightRadius: 0,
                borderWidth: 1,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: !isFilled ? '#FFFFFF' : COLORS.primary }}>
                Empty
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setIsFilled(true)}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 8,
                backgroundColor: isFilled ? COLORS.primary : 'transparent',
                borderRadius: 8,
                borderTopLeftRadius: 0,
                borderBottomLeftRadius: 0,
                borderWidth: 1,
                borderLeftWidth: 0,
                borderColor: COLORS.primary,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: isFilled ? '#FFFFFF' : COLORS.primary }}>
                Filled
              </Text>
            </Pressable>
          </View>
          <EmptyInbox />
        </View>
      )}
    </SafeAreaView>
  );
};

export default ContractorInboxList;
