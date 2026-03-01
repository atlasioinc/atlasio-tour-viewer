// NotificationsTab.tsx
// ═══════════════════════════════════════════════════════════════
// Notifications Tab — Agent View
// Grouped by date (Today, Yesterday, Earlier)
// Notification types: connection_request, vouch_received,
//   bid_new, bid_accepted, bid_countered, bid_rejected,
//   job_expired, mention, message_new
// Unread indicators: blue left border (3.44px)
// Production-ready: structured for TanStack Query + Supabase
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  SectionList,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import type { HomeStackParamList } from './HomeStack';
import type { Job, BidWithProfile } from '../types';
import { MOCK_REPAIR_JOBS } from './RepairJobsData';
import { COLORS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useNotifications as useNotificationsHook } from '../hooks/useData';
import { adaptNotificationToLocal } from '../lib/typeAdapters';

// ─────────────────────────────────────────────
// DESIGN TOKENS (from Figma)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// NOTIFICATION TYPES
// ─────────────────────────────────────────────

type NotificationType =
  | 'connection_request'
  | 'connection_accepted'
  | 'connection_rejected'
  | 'vouch_received'
  | 'bid_new'
  | 'bid_accepted'
  | 'bid_countered'
  | 'bid_rejected'
  | 'job_expired'
  | 'mention'
  | 'message_new';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  subtitle: string;
  timestamp: string;
  is_read: boolean;
  created_at: string; // ISO string for sorting
  // Optional fields for specific types
  avatar_color?: string;
  avatar_name?: string;
  action_label?: string; // e.g., "View"
  deep_link?: string; // target screen for navigation
  // ── Related entity IDs (production: foreign keys) ──
  // These link notifications to the relevant data for deep linking.
  // In production, the backend populates these when creating notifications.
  job_id?: string; // links to repair_jobs table
  thread_id?: string; // links to threads table
  user_id?: string; // links to users table (for connection requests)
}

// ─────────────────────────────────────────────
// SVG ICONS — type-specific
// ─────────────────────────────────────────────

// Heart icon (vouch_received) — #FB2C36
const HeartIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"
      stroke={COLORS.notificationRed}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Wrench icon (bid_new, bid_accepted, bid_countered, bid_rejected, job_expired) — #FF6900
const WrenchIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"
      stroke={COLORS.bidOrange}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// At sign icon (mention) — #AD46FF
const AtSignIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={4} stroke={COLORS.mentionPurple} strokeWidth={2} />
    <Path
      d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"
      stroke={COLORS.mentionPurple}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Bell icon (message_new, connection_accepted, connection_rejected) — #003DC3
const BellIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Check icon (accept button) — #00C950
const CheckIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M3.33 10L8.33 15L16.67 5" stroke={COLORS.onlineGreen} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// X icon (reject button) — #FB2C36
const XIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 5L15 15" stroke={COLORS.rejectRed} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M15 5L5 15" stroke={COLORS.rejectRed} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

// Back arrow
const BackIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18L9 12L15 6" stroke={COLORS.headingText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{ name: string; color: string; size?: number }> = ({ name, color, size = 48 }) => {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.3, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// ICON CIRCLE — gray background with type icon
// ─────────────────────────────────────────────

const IconCircle: React.FC<{ type: NotificationType }> = ({ type }) => {
  const getIcon = () => {
    switch (type) {
      case 'vouch_received':
        return <HeartIcon />;
      case 'bid_new':
      case 'bid_accepted':
      case 'bid_countered':
      case 'bid_rejected':
      case 'job_expired':
        return <WrenchIcon />;
      case 'mention':
        return <AtSignIcon />;
      case 'connection_accepted':
      case 'connection_rejected':
      case 'message_new':
      default:
        return <BellIcon />;
    }
  };

  return (
    <View style={{ width: 48, height: 48, borderRadius: 9999, backgroundColor: COLORS.chipBg, alignItems: 'center', justifyContent: 'center' }}>
      {getIcon()}
    </View>
  );
};

// ─────────────────────────────────────────────
// MOCK DATA — 10 notifications matching Figma
// Sorted newest first by created_at
// ─────────────────────────────────────────────
// Production: Replace with TanStack Query fetch from Supabase
// queryKey: ['notifications']
// Supabase: supabase.from('notifications').select('*').order('created_at', { ascending: false })

const MOCK_NOTIFICATIONS: Notification[] = [
  // ── Today ──
  {
    id: 'notif-1',
    type: 'connection_request',
    title: 'Alex Chen wants to connect',
    subtitle: "Hi! I'd love to connect and sh.. leads in Dallas...",
    timestamp: '2h ago',
    is_read: false,
    created_at: '2025-12-01T14:00:00Z',
    avatar_color: '#A8C5DA',
    avatar_name: 'Alex Chen',
  },
  {
    id: 'notif-2',
    type: 'vouch_received',
    title: 'Mike Torres vouched for you!',
    subtitle: '"Best agent I\'ve worked with"',
    timestamp: '4h ago',
    is_read: false,
    created_at: '2025-12-01T12:00:00Z',
  },
  {
    id: 'notif-3',
    type: 'bid_new',
    title: 'New $1,240 bid from Torres Electric',
    subtitle: 'Attic Vent Seal + GFCI Install',
    timestamp: '5h ago',
    is_read: false,
    created_at: '2025-12-01T11:00:00Z',
    action_label: 'View',
    deep_link: 'RepairJobDetails',
    job_id: 'repair-1',
  },
  // ── Yesterday ──
  {
    id: 'notif-4',
    type: 'bid_accepted',
    title: "You accepted Mike Torres's $1,200 bid",
    subtitle: '123 Main St attic vents - Expected start: Tomorrow',
    timestamp: 'Yesterday, 3:45 PM',
    is_read: false,
    created_at: '2025-11-30T15:45:00Z',
    deep_link: 'RepairJobDetails',
    job_id: 'repair-1',
  },
  {
    id: 'notif-5',
    type: 'bid_countered',
    title: 'Mike Torres countered $1,100',
    subtitle: 'Attic Vent Seal + GFCI Install',
    timestamp: '5h ago',
    is_read: true,
    created_at: '2025-11-30T14:00:00Z',
    action_label: 'View',
    deep_link: 'RepairJobDetails',
    job_id: 'repair-1',
  },
  {
    id: 'notif-6',
    type: 'mention',
    title: 'Alex Chen mentioned you',
    subtitle: 'in 123 Main St deal chat',
    timestamp: 'Yesterday, 11:30 AM',
    is_read: true,
    created_at: '2025-11-30T11:30:00Z',
    deep_link: 'DealChatScreen',
  },
  // ── Earlier ──
  {
    id: 'notif-7',
    type: 'connection_accepted',
    title: 'Sarah Miller accepted your connection',
    subtitle: 'You can now message each other',
    timestamp: 'Nov 28',
    is_read: true,
    created_at: '2025-11-28T10:00:00Z',
    deep_link: 'ChatScreen',
  },
  {
    id: 'notif-8',
    type: 'bid_rejected',
    title: 'Your bid was declined',
    subtitle: 'Roof Leak Repair - 456 Oak Ave',
    timestamp: 'Nov 27',
    is_read: true,
    created_at: '2025-11-27T16:00:00Z',
    job_id: 'repair-2',
  },
  {
    id: 'notif-9',
    type: 'job_expired',
    title: 'Kitchen Faucet job expired',
    subtitle: 'No bids were accepted before the deadline',
    timestamp: 'Nov 26',
    is_read: true,
    created_at: '2025-11-26T09:00:00Z',
    job_id: 'repair-3',
  },
  {
    id: 'notif-10',
    type: 'message_new',
    title: 'New message from Rachel Williams',
    subtitle: 'RE: Closing timeline for 789 Pine Blvd',
    timestamp: 'Nov 25',
    is_read: true,
    created_at: '2025-11-25T14:30:00Z',
    deep_link: 'ChatScreen',
  },
];

// ─────────────────────────────────────────────
// DATE GROUPING HELPER
// ─────────────────────────────────────────────

interface NotificationSection {
  title: string;
  data: Notification[];
}

const groupNotificationsByDate = (notifications: Notification[]): NotificationSection[] => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toDateString() === today.toDateString();
  };

  const isYesterday = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toDateString() === yesterday.toDateString();
  };

  const todayItems: Notification[] = [];
  const yesterdayItems: Notification[] = [];
  const earlierItems: Notification[] = [];

  // For demo: use mock grouping based on ID patterns
  // Production: group by actual created_at dates
  notifications.forEach((n) => {
    if (isToday(n.created_at)) {
      todayItems.push(n);
    } else if (isYesterday(n.created_at)) {
      yesterdayItems.push(n);
    } else {
      earlierItems.push(n);
    }
  });

  // For demo purposes, use hardcoded grouping since mock dates won't match "today"
  const sections: NotificationSection[] = [];

  // Group first 3 as "Today", next 3 as "Yesterday", rest as "Earlier"
  const demoToday = notifications.slice(0, 3);
  const demoYesterday = notifications.slice(3, 6);
  const demoEarlier = notifications.slice(6);

  if (demoToday.length > 0) sections.push({ title: 'TODAY', data: demoToday });
  if (demoYesterday.length > 0) sections.push({ title: 'YESTERDAY', data: demoYesterday });
  if (demoEarlier.length > 0) sections.push({ title: 'EARLIER', data: demoEarlier });

  return sections;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
// Production Integration Notes:
// ─────────────────────────────────────────────
// 1. FETCHING: Replace MOCK_NOTIFICATIONS with TanStack Query:
//    const { data } = useQuery({
//      queryKey: ['notifications'],
//      queryFn: () => supabase.from('notifications')
//        .select('*').order('created_at', { ascending: false })
//    });
//
// 2. REALTIME: Subscribe to new notifications:
//    useEffect(() => {
//      const channel = supabase.channel('notifications')
//        .on('postgres_changes', {
//          event: 'INSERT', schema: 'public', table: 'notifications',
//          filter: `user_id=eq.${userId}`
//        }, () => queryClient.invalidateQueries(['notifications']))
//        .subscribe();
//      return () => { supabase.removeChannel(channel); };
//    }, []);
//
// 3. MARK READ: Replace local state toggle with:
//    const markRead = useMutation({
//      mutationFn: (id) => supabase.from('notifications')
//        .update({ is_read: true }).eq('id', id),
//      onSuccess: () => queryClient.invalidateQueries(['notifications'])
//    });
//
// 4. DEEP LINKS: Replace console.log with actual navigation.navigate()
// ═══════════════════════════════════════════════════════════════

const NotificationsTab: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { data: liveNotifications } = useNotificationsHook();
  const _initialNotifications = FEATURE_FLAGS.USE_MOCK_DATA ? MOCK_NOTIFICATIONS : (liveNotifications?.map(adaptNotificationToLocal) as Notification[] ?? []);
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  // When live data loads and flag is off, sync state
  React.useEffect(() => {
    if (!FEATURE_FLAGS.USE_MOCK_DATA && liveNotifications) {
      setNotifications(liveNotifications.map(adaptNotificationToLocal) as Notification[]);
    }
  }, [liveNotifications]);

  // ── Mark single notification as read ──
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }, []);

  // ── Mark all notifications as read ──
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  // ── Resolve a repair job by ID ──
  // Production: this becomes an API call or cache lookup
  // e.g., queryClient.getQueryData(['repair_job', jobId])
  const resolveRepairJob = useCallback((jobId?: string): (Job & { bids: BidWithProfile[] }) | undefined => {
    if (!jobId) return undefined;
    return MOCK_REPAIR_JOBS.find((j) => j.id === jobId);
  }, []);

  // ── Handle notification tap → mark read + deep link ──
  // Production: deep_link field maps to screen names,
  // entity IDs (job_id, chat_id, user_id) provide the route params.
  // When backend is ready, replace resolveRepairJob with API/cache lookup.
  const handleNotificationPress = useCallback((notif: Notification) => {
    markAsRead(notif.id);

    switch (notif.type) {
      case 'bid_new':
      case 'bid_countered':
      case 'bid_accepted':
      case 'bid_rejected':
      case 'job_expired': {
        const job = resolveRepairJob(notif.job_id);
        if (job) {
          navigation.navigate('RepairJobDetails', { job });
        }
        break;
      }
      case 'connection_request':
        // Production: navigation.navigate('ConnectionRequests')
        console.log('Nav to: ConnectionRequests', notif.user_id);
        break;
      case 'connection_accepted':
      case 'connection_rejected':
        // Production: navigation.navigate('NetworkTab')
        console.log('Nav to: NetworkTab', notif.user_id);
        break;
      case 'vouch_received':
        // Production: navigation.navigate('ProfileTab', { section: 'vouches' })
        console.log('Nav to: ProfileTab (vouches)');
        break;
      case 'mention':
        // Production: navigation.navigate('DealChatScreen', { chatId: notif.thread_id })
        console.log('Nav to: DealChatScreen', notif.thread_id);
        break;
      case 'message_new':
        // Production: navigation.navigate('ChatScreen', { chatId: notif.thread_id })
        console.log('Nav to: ChatScreen', notif.thread_id);
        break;
      default:
        console.log('Nav to: Home');
    }
  }, [markAsRead, resolveRepairJob, navigation]);

  // ── Handle accept/reject connection request ──
  const handleAcceptConnection = useCallback((notif: Notification) => {
    markAsRead(notif.id);
    // Remove from list and show confirmation
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    console.log('Accepted connection:', notif.title);
  }, [markAsRead]);

  const handleRejectConnection = useCallback((notif: Notification) => {
    markAsRead(notif.id);
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    console.log('Rejected connection:', notif.title);
  }, [markAsRead]);

  // ── Group notifications into sections ──
  const sections = useMemo(() => groupNotificationsByDate(notifications), [notifications]);

  // ── Unread count ──
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Render section header ──
  const renderSectionHeader = ({ section }: { section: NotificationSection }) => (
    <View
      style={{
        paddingTop: 12,
        paddingBottom: 8,
        paddingHorizontal: 16,
        backgroundColor: COLORS.screenBg,
        borderBottomWidth: 0.69,
        borderBottomColor: COLORS.border,
      }}
    >
      {/* Section title — matches NetworkTab role group headers */}
      <Text style={{ fontSize: 15, fontWeight: '400', color: COLORS.primary, lineHeight: 22, textTransform: 'uppercase', letterSpacing: 0.14 }}>
        {section.title}
      </Text>
    </View>
  );

  // ── Render notification row ──
  const renderNotification = ({ item }: { item: Notification }) => {
    const isUnread = !item.is_read;
    const isConnectionRequest = item.type === 'connection_request';
    // Unread title: fontWeight 600, read title: fontWeight 400
    const titleWeight = isUnread ? '600' : '400';

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingTop: 16,
          paddingBottom: 16,
          paddingLeft: 16,
          paddingRight: 20,
          backgroundColor: pressed ? '#F9FAFB' : COLORS.background,
          // Unread: 3.44px blue left border
          borderLeftWidth: isUnread ? 3.44 : 0,
          borderLeftColor: isUnread ? COLORS.primary : 'transparent',
          // Adjust left padding when border is present
          ...(isUnread ? { paddingLeft: 12.56 } : {}),
        })}
      >
        {/* Icon / Avatar */}
        {isConnectionRequest && item.avatar_name ? (
          <AvatarPlaceholder name={item.avatar_name} color={item.avatar_color || '#A8C5DA'} />
        ) : (
          <IconCircle type={item.type} />
        )}

        {/* Text Content */}
        <View style={{ flex: 1, gap: 2 }}>
          {/* Title: 16px, 600 if unread / 400 if read, #101828 */}
          <Text style={{ fontSize: 16, fontWeight: titleWeight, color: COLORS.headingText, lineHeight: 24 }}>
            {item.title}
          </Text>
          {/* Subtitle: 14px, 400, #4A5565 */}
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }} numberOfLines={1}>
            {item.subtitle}
          </Text>
          {/* Timestamp: 12px, 400, #99A1AF */}
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.lightText, lineHeight: 16 }}>
            {item.timestamp}
          </Text>
        </View>

        {/* Right side: Accept/Reject buttons OR View link */}
        {isConnectionRequest ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* Accept: green circle border */}
            <Pressable
              onPress={() => handleAcceptConnection(item)}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 9999,
                backgroundColor: COLORS.background,
                borderWidth: 1.38,
                borderColor: COLORS.onlineGreen,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <CheckIcon />
            </Pressable>
            {/* Reject: red circle border */}
            <Pressable
              onPress={() => handleRejectConnection(item)}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                borderRadius: 9999,
                backgroundColor: COLORS.background,
                borderWidth: 1.38,
                borderColor: COLORS.rejectRed,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <XIcon />
            </Pressable>
          </View>
        ) : item.action_label ? (
          <Pressable
            onPress={() => handleNotificationPress(item)}
            hitSlop={12}
            style={{ padding: 8 }}
          >
            {/* "View": 14px, 500, #003DC3 */}
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20, textAlign: 'center' }}>
              {item.action_label}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    );
  };

  // ── Item separator (thin divider line, offset left) ──
  const renderSeparator = () => (
    <View style={{ paddingLeft: 76 }}>
      <View style={{ height: 0.69, backgroundColor: COLORS.cardBorder }} />
    </View>
  );

  // ── Empty state ──
  const renderEmptyState = () => (
    <View style={{ flex: 1, paddingTop: 120, alignItems: 'center', gap: 12 }}>
      <View style={{ width: 64, height: 64, borderRadius: 9999, backgroundColor: COLORS.chipBg, alignItems: 'center', justifyContent: 'center' }}>
        <BellIcon />
      </View>
      <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.headingText, lineHeight: 28 }}>
        No notifications yet
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20, textAlign: 'center', paddingHorizontal: 48 }}>
        Check back soon! You'll see connection requests, bids, vouches, and more here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          HEADER: 64px, ← | Notifications | Mark all read
          ══════════════════════════════════════════ */}
      <View
        style={{
          height: 48,
          paddingHorizontal: 16,
          backgroundColor: COLORS.background,
          borderBottomWidth: 0.69,
          borderBottomColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Back */}
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 40,
            height: 40,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <BackIcon />
        </Pressable>

        {/* Title: center absolute — 16px, 500, #003DC3 */}
        <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.primary, lineHeight: 24 }}>
            Notifications
          </Text>
        </View>

        {/* Mark all read: 14px, 400, #003DC3 */}
        <Pressable
          onPress={unreadCount > 0 ? markAllAsRead : undefined}
          hitSlop={12}
          style={({ pressed }) => ({
            opacity: pressed && unreadCount > 0 ? 0.5 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '400', color: unreadCount > 0 ? COLORS.primary : COLORS.lightText, lineHeight: 20, textAlign: 'center' }}>
            Mark all read
          </Text>
        </Pressable>
      </View>

      {/* ══════════════════════════════════════════
          NOTIFICATION LIST
          ══════════════════════════════════════════ */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderNotification}
        renderSectionHeader={renderSectionHeader}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
};

export default NotificationsTab;
