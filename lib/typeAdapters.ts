// lib/typeAdapters.ts
// ═══════════════════════════════════════════════════════════════
// Type Adapter Layer
// Maps Supabase/hook return types → screen-local display types
// Eliminates `as unknown as` casts in screen files.
//
// Each adapter is a pure function: hook data in → local type out.
// ═══════════════════════════════════════════════════════════════

import type {
  ChatThreadView,
  InboxThread,
  Message,
  Profile,
  Connection,
  Vouch,
  Notification as GlobalNotification,
  VerificationLevel,
} from '../types';

// ─────────────────────────────────────────────
// InboxList: ChatThreadView → local ChatThread
// ─────────────────────────────────────────────

interface InboxChatThread {
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
  avatarUrl?: string | null;    // S133: photo URL from other_member.avatar_url
  isOnline?: boolean;
  contactRole?: string;
  dealAddress?: string;
  // Navigation helpers from RPC data
  threadId?: string;
  otherMemberUserId?: string;
  otherMemberCompany?: string;
}

export const adaptChatThreadToLocal = (thread: ChatThreadView): InboxChatThread => ({
  id: thread.id,
  name: thread.name ?? '',
  lastMessage: thread.last_message ?? '',
  timestamp: thread.last_message_at
    ? new Date(thread.last_message_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '',
  isUnread: thread.is_unread,
  isPinned: thread.is_pinned,
  isGroup: thread.type !== 'one_to_one',
  memberCount: thread.member_count,
  avatarColors: thread.avatar_colors,
  isOnline: thread.is_online,
});

// ─────────────────────────────────────────────
// InboxList: InboxThread (RPC) → local ChatThread
// @backend rpc_get_inbox_threads() — maps RPC response to InboxList display shape
// ─────────────────────────────────────────────

export const adaptInboxThreadToLocal = (thread: InboxThread): InboxChatThread => ({
  id: thread.thread_id,
  name: (thread.other_member?.name ?? '') || (thread.name ?? ''),
  lastMessage: thread.last_message ?? '',
  timestamp: thread.last_message_at
    ? formatRelativeTimestamp(thread.last_message_at)
    : '',
  isUnread: (thread.unread_count ?? 0) > 0,
  unreadCount: thread.unread_count ?? 0,
  isPinned: thread.is_pinned ?? false,
  isGroup: thread.type !== 'one_to_one',
  avatarColors: [thread.other_member?.avatar_color ?? '#7BA3C9'],
  avatarUrl: thread.other_member?.avatar_url ?? null,
  contactRole: '',
  dealAddress: thread.property_address ?? undefined,
  // Pass through for navigation
  threadId: thread.thread_id,
  otherMemberUserId: thread.other_member?.user_id ?? '',
  otherMemberCompany: thread.other_member?.company ?? '',
});

function formatRelativeTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][date.getDay()] ?? `${diffDays}d`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────
// ChatScreen: types.Message → MessageBubble.Message
// ─────────────────────────────────────────────

interface BubbleMessage {
  id: string;
  text: string;
  timestamp: string;
  isMine: boolean;
  senderName?: string;
  senderAvatarColor?: string;
}

export const adaptMessageToBubble = (msg: Message, currentUserId: string): BubbleMessage => ({
  id: msg.id,
  text: msg.content,
  timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
  isMine: msg.sender_id === currentUserId,
  senderName: msg.sender_name || undefined,
});

// ─────────────────────────────────────────────
// FindTab: Profile → local ProCard
// ─────────────────────────────────────────────

interface FindProCard {
  id: string;
  name: string;
  company: string;
  role: string;
  trade?: string;
  secondary_trades?: string[];
  rating: number;
  vouches: number;
  tags: string[];
  headline: string | null;
  avatarColor: string;
  avatarUrl?: string | null;    // S133: photo URL from profiles.avatar_url
  closingDays?: number;
  distanceMi?: number;
  verification_level?: VerificationLevel;
}

export const adaptProfileToProCard = (profile: Profile): FindProCard => ({
  id: profile.id,
  name: profile.name,
  company: profile.company,
  role: profile.display_role,
  trade: profile.trade ?? undefined,
  secondary_trades: profile.trades?.length ? profile.trades.slice(1) : undefined,
  rating: profile.rating,
  vouches: profile.vouch_count,
  tags: profile.tags as string[],
  headline: null,
  avatarColor: profile.avatar_color,
  avatarUrl: profile.avatar_url ?? null,
  closingDays: profile.typical_close_days ?? undefined,
  verification_level: profile.verification_level,
});

// ─────────────────────────────────────────────
// NetworkTab: (Connection & { profile: Profile }) → local NetworkContact
// ─────────────────────────────────────────────

interface LocalNetworkContact {
  id: string;
  name: string;
  company: string;
  role: string;
  group: string;
  tags: string[];
  avatarColor: string;
  tab: 'partners' | 'contractors';
}

const CONTRACTOR_ROLES = new Set(['contractor', 'home_stager', 'real_estate_photographer']);

export const adaptConnectionToNetworkContact = (
  conn: Connection & { profile: Profile },
): LocalNetworkContact => ({
  id: conn.profile?.id ?? conn.responder_id,
  name: conn.profile.name,
  company: conn.profile.company,
  role: conn.profile.display_role,
  group: conn.profile.display_role,
  tags: conn.profile.tags as string[],
  avatarColor: conn.profile.avatar_color,
  tab: CONTRACTOR_ROLES.has(conn.profile.role) ? 'contractors' : 'partners',
});

// ─────────────────────────────────────────────
// NetworkTab: (Connection & { requester: Profile }) → local ConnectionRequest
// ─────────────────────────────────────────────

interface NetworkConnectionRequest {
  id: string;
  name: string;
  company: string;
  role: string;
  avatarColor: string;
  note?: string;
  mutualConnections: number;
}

export const adaptConnectionToRequest = (
  conn: Connection & { requester: Profile },
): NetworkConnectionRequest => ({
  id: conn.id,
  name: conn.requester.name,
  company: conn.requester.company,
  role: conn.requester.display_role,
  avatarColor: conn.requester.avatar_color,
  note: conn.note ?? undefined,
  mutualConnections: 0, // TODO: compute mutual connections via separate query
});

// ─────────────────────────────────────────────
// VouchFeedSection: Vouch (with joined profiles) → local VouchFeedItem
// ─────────────────────────────────────────────

interface VouchFeedProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  avatar_color: string;
  company: string;
  role: string;
  trade?: string;
  is_verified: boolean;
  vouches_count: number;
}

interface VouchFeedItem {
  id: string;
  voucher: VouchFeedProfile;
  recipient: VouchFeedProfile;
  comment: string | null;
  tags: string[];
  created_at: string;
  review_id: string | null;
}

export const adaptVouchToFeedItem = (vouch: Vouch & { author?: Profile; recipient?: Profile }): VouchFeedItem => ({
  id: vouch.id,
  voucher: {
    id: vouch.author_id,
    name: vouch.author?.name ?? vouch.author_name,
    avatar_url: vouch.author?.avatar_url ?? null,
    avatar_color: vouch.author?.avatar_color ?? vouch.avatar_color,
    company: vouch.author?.company ?? '',
    role: vouch.author?.display_role ?? '',
    trade: vouch.author?.trade ?? undefined,
    is_verified: vouch.author?.is_verified ?? false,
    vouches_count: vouch.author?.vouch_count ?? 0,
  },
  recipient: {
    id: vouch.recipient_id,
    name: vouch.recipient?.name ?? vouch.recipient_name,
    avatar_url: vouch.recipient?.avatar_url ?? null,
    avatar_color: vouch.recipient?.avatar_color ?? vouch.avatar_color,
    company: vouch.recipient?.company ?? vouch.recipient_company ?? '',
    role: vouch.recipient?.display_role ?? vouch.recipient_role ?? '',
    trade: vouch.recipient?.trade ?? undefined,
    is_verified: vouch.recipient?.is_verified ?? false,
    vouches_count: vouch.recipient?.vouch_count ?? 0,
  },
  comment: vouch.quote,
  tags: vouch.tags,
  created_at: vouch.created_at,
  review_id: vouch.review_id,
});

// ─────────────────────────────────────────────
// SquadSlotPicker: (Connection & { profile: Profile }) → local SquadProCandidate
// ─────────────────────────────────────────────

interface SquadProCandidate {
  id: string;
  name: string;
  company: string;
  role: string;
  rating: number;
  vouches: number;
  avatarColor: string;
}

export const adaptConnectionToSquadCandidate = (
  conn: Connection & { profile: Profile },
): SquadProCandidate => ({
  id: conn.profile.id,
  name: conn.profile.name,
  company: conn.profile.company,
  role: conn.profile.role,
  rating: conn.profile.rating,
  vouches: conn.profile.vouch_count,
  avatarColor: conn.profile.avatar_color,
});

// ─────────────────────────────────────────────
// NotificationsTab: global Notification → local Notification
// The local type adds `timestamp` (formatted) and uses a narrower NotificationType union.
// ─────────────────────────────────────────────

// Map schema notification_type_enum (20 values) → local display type (11 categories)
const NOTIFICATION_TYPE_MAP: Record<string, string> = {
  'connection_request_received': 'connection_request',
  'connection_accepted': 'connection_accepted',
  'connection_declined': 'connection_rejected',
  'vouch_received': 'vouch_received',
  'mutual_vouch_prompt': 'vouch_received',
  'bid_new': 'bid_new',
  'bid_edited': 'bid_new',
  'bid_accepted_contractor': 'bid_accepted',
  'bid_accepted_agent_confirmation': 'bid_accepted',
  'bid_countered': 'bid_countered',
  'counter_resubmitted': 'bid_countered',
  'bid_rejected': 'bid_rejected',
  'bid_withdrawn': 'bid_rejected',
  'bidding_window_expiring': 'bid_new',
  'contractor_marked_complete': 'bid_accepted',
  'agent_confirmed_complete': 'bid_accepted',
  'job_expired': 'job_expired',
  'job_cancelled': 'job_expired',
  'invited_to_bid': 'bid_new',
  'message_new': 'message_new',
};

interface LocalNotification {
  id: string;
  type: string; // mapped to local display category
  title: string;
  subtitle: string;
  timestamp: string;
  is_read: boolean;
  created_at: string;
  avatar_color?: string;
  avatar_name?: string;
  action_label?: string;
  deep_link?: string;
  job_id?: string;
  thread_id?: string;
  user_id?: string;
}

export const adaptNotificationToLocal = (n: GlobalNotification): LocalNotification => ({
  id: n.id,
  type: NOTIFICATION_TYPE_MAP[n.type] ?? n.type,
  title: n.title,
  subtitle: n.subtitle,
  timestamp: formatNotificationTimestamp(n.created_at),
  is_read: n.is_read,
  created_at: n.created_at,
  avatar_color: n.avatar_color ?? undefined,
  avatar_name: n.avatar_name ?? undefined,
  action_label: n.action_label ?? undefined,
  deep_link: n.deep_link ?? undefined,
  job_id: n.job_id ?? undefined,
  thread_id: n.thread_id ?? undefined,
  user_id: n.user_id,
});

function formatNotificationTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
