// NetworkTab.tsx
// ═══════════════════════════════════════════════════════════════
// Network Tab — Agent View
// View and manage your professional network
// Two tabs: Closing Partners (grouped by role) & Contractors (grouped by trade)
// Features: search, message button, invite to job
// Connection Requests — bottom sheet behind header icon (Session 17)
// Squad toggle removed (Session 21) — squad management lives on HomeTab
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  LayoutAnimation,
  UIManager,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import SearchField from './SearchField';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NetworkStackParamList } from './NetworkStack';
import { mapNetworkContactToProfile } from './proProfileHelpers';
import InviteToJobModal from './InviteToJobModal';
import type { InviteContractor } from './InviteToJobModal';
import { COLORS } from '../lib/tokens';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const SearchIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={9.17} cy={9.17} r={6.67} stroke={COLORS.lightText} strokeWidth={1.67} />
    <Path d="M14.17 14.17L17.5 17.5" stroke={COLORS.lightText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

// Notification bell with red dot — driven by pending request count
const ContactRequestsIcon: React.FC<{ hasNotification?: boolean }> = ({ hasNotification = true }) => (
  <View style={{ width: 24, height: 24 }}>
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={8.5} cy={7} r={4} stroke={COLORS.primary} strokeWidth={2} />
    </Svg>
    {hasNotification && (
      <View style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderRadius: 9999, backgroundColor: COLORS.notificationRed, borderWidth: 1.5, borderColor: '#FFFFFF' }} />
    )}
  </View>
);

// Check icon for Accept button
const CheckIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M11.67 3.5L5.25 9.92L2.33 7" stroke="#FFFFFF" strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// X icon for Decline button
const XSmallIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M10.5 3.5L3.5 10.5" stroke={COLORS.bodyText} strokeWidth={1.33} strokeLinecap="round" />
    <Path d="M3.5 3.5L10.5 10.5" stroke={COLORS.bodyText} strokeWidth={1.33} strokeLinecap="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// CONNECTION REQUEST TYPES & MOCK DATA
// ─────────────────────────────────────────────

/**
 * Incoming connection request data.
 *
 * @backend
 * Query: useConnectionRequests()
 *   → SELECT * FROM connections
 *     WHERE to_id = auth.uid()
 *       AND state = 'pending'
 *     ORDER BY created_at DESC
 *
 * Accept: supabase.rpc('rpc_accept_connection', { connection_id })
 *   → Sets state = 'accepted', triggers push notification to sender
 *   → Invalidates: ['connections'], ['connectionRequests'], ['network']
 *
 * Decline: supabase.rpc('rpc_reject_connection', { connection_id })
 *   → Sets state = 'rejected'
 *   → Invalidates: ['connectionRequests']
 *
 * Realtime: subscribe to connections table INSERT where to_id = auth.uid()
 */
interface ConnectionRequest {
  id: string;
  name: string;
  company: string;
  role: string;
  avatarColor: string;
  note?: string;
  mutualConnections: number;
}

const MOCK_CONNECTION_REQUESTS: ConnectionRequest[] = [
  {
    id: 'cr1',
    name: 'Rachel Kim',
    company: 'First National Lending',
    role: 'Mortgage Pro',
    avatarColor: '#C4A882',
    note: 'Hey! I work with a lot of agents in the Denver metro area. Would love to connect and see if we can refer business.',
    mutualConnections: 4,
  },
  {
    id: 'cr2',
    name: 'Marcus Webb',
    company: 'Webb General Contracting',
    role: 'General Contractor',
    avatarColor: '#7BA3C9',
    note: 'Saw your listing on Cherry Creek. My crew handles full punch lists — let me know if you need bids.',
    mutualConnections: 2,
  },
  {
    id: 'cr3',
    name: 'Sofia Delgado',
    company: 'Rocky Mountain Title',
    role: 'Title/Escrow',
    avatarColor: '#D4A8B5',
    mutualConnections: 7,
  },
  {
    id: 'cr4',
    name: 'Tyler Brooks',
    company: 'Front Range Inspections',
    role: 'Home Inspector',
    avatarColor: '#A8D4B5',
    note: 'Fellow Denver pro — always looking to build strong agent relationships.',
    mutualConnections: 1,
  },
];

// ─────────────────────────────────────────────
// NETWORK CONTACT DATA TYPE
// ─────────────────────────────────────────────

interface NetworkContact {
  id: string;
  name: string;
  company: string;
  role: string;        // display role (e.g., "Mortgage Lender")
  group: string;       // grouping category (e.g., "Mortgage Pro" or "Electrical")
  tags: string[];
  avatarColor: string;
  tab: 'partners' | 'contractors';
}

// ─────────────────────────────────────────────
// MOCK DATA — Closing Partners
// Tags use standardized enums from tagEnums.ts
// ─────────────────────────────────────────────

const PARTNERS: NetworkContact[] = [
  // Mortgage Pro (3)
  { id: 'p1', name: 'Brian Smith', company: 'Home Lending Solutions', role: 'Mortgage Lender', group: 'Mortgage Pro', tags: ['VA Specialist', 'Fast Closer', 'No Junk Fees'], avatarColor: '#C4A882', tab: 'partners' },
  { id: 'p2', name: 'Maria Santos', company: 'Berkley Lending', role: 'Mortgage Lender', group: 'Mortgage Pro', tags: ['FHA Approved', 'Fast Closer'], avatarColor: '#D4A8B5', tab: 'partners' },
  { id: 'p3', name: 'Emma Thompson', company: 'Elite Mortgage Service', role: 'Mortgage Lender', group: 'Mortgage Pro', tags: ['Spanish-Speaking', 'Jumbo Loan Specialist', 'Fast Closer'], avatarColor: '#A8C5DA', tab: 'partners' },

  // Title/Escrow (2)
  { id: 'p4', name: 'Emily Rodriguez', company: 'Fidelity National Title', role: 'Title/Escrow', group: 'Title/Escrow', tags: ['Fast Turnaround', 'Spanish-Speaking', 'Clear Communication'], avatarColor: '#B5C4A8', tab: 'partners' },
  { id: 'p5', name: 'David Park', company: 'Chicago Title', role: 'Title/Escrow', group: 'Title/Escrow', tags: ['Fast Turnaround', 'No Junk Fees', 'Weekend Warrior'], avatarColor: '#C9B87B', tab: 'partners' },

  // Home Inspector (3)
  { id: 'p6', name: 'Michael Torres', company: 'Torres Home Inspections', role: 'Home Inspector', group: 'Home Inspector', tags: ['Same-Day Turnaround', 'Detailed Reports'], avatarColor: '#7BA3C9', tab: 'partners' },
  { id: 'p7', name: 'Linda Chang', company: 'Complete Inspections', role: 'Home Inspector', group: 'Home Inspector', tags: ['Detailed Reports', 'Foundation Specialist'], avatarColor: '#D4A8C5', tab: 'partners' },
  { id: 'p8', name: 'Robert Johnson', company: 'HomeCheck Pro', role: 'Home Inspector', group: 'Home Inspector', tags: ['24-Hour Turnaround', 'Detailed Reports', 'Spanish-Speaking'], avatarColor: '#A8B5D4', tab: 'partners' },

  // Transaction Coordinator (3)
  { id: 'p9', name: 'Amanda Hayes', company: 'Smooth Closings TC', role: 'Transaction Coordinator', group: 'Transaction Coordinator', tags: ['Fast Turnaround', 'Clear Communication'], avatarColor: '#A8D4D4', tab: 'partners' },
  { id: 'p10', name: 'Marcus Williams', company: 'Closing Concierge', role: 'Transaction Coordinator', group: 'Transaction Coordinator', tags: ['Clear Communication', 'Fast Turnaround'], avatarColor: '#D4D4A8', tab: 'partners' },
  { id: 'p11', name: 'Jessica Martinez', company: 'Premier TC Services', role: 'Transaction Coordinator', group: 'Transaction Coordinator', tags: ['Weekend Warrior', 'Spanish-Speaking'], avatarColor: '#B8A8D4', tab: 'partners' },

  // Appraiser (2)
  { id: 'p12', name: 'Daniel Kim', company: 'Precision Appraisals', role: 'Appraiser', group: 'Appraiser', tags: ['FHA Approved', 'Fast Turnaround'], avatarColor: '#A8D4B5', tab: 'partners' },
  { id: 'p13', name: 'Susan Taylor', company: 'Elite Appraisal Group', role: 'Appraiser', group: 'Appraiser', tags: ['Complex Specialist', 'Fast Turnaround'], avatarColor: '#D4B5A8', tab: 'partners' },

  // Other (2)
  { id: 'p14', name: 'Carlos Ramirez', company: 'Ramirez Photography', role: 'Photographer', group: 'Other', tags: ['Fast Turnaround', 'Weekend Warrior'], avatarColor: '#C5A8C5', tab: 'partners' },
  { id: 'p15', name: 'Nicole Anderson', company: 'Stage Right Home Staging', role: 'Home Stager', group: 'Other', tags: ['Fast Turnaround', 'Clear Communication'], avatarColor: '#A8C5B5', tab: 'partners' },
];

// ─────────────────────────────────────────────
// MOCK DATA — Contractors
// Tags use standardized enums from tagEnums.ts
// ─────────────────────────────────────────────

const CONTRACTORS: NetworkContact[] = [
  { id: 'c1', name: 'Brian Cooper', company: 'ProBuild Contractors', role: 'General Contractor', group: 'General', tags: ['Licensed & Insured', 'Fast Response', 'On-Time Expert'], avatarColor: '#7BA3C9', tab: 'contractors' },
  { id: 'c2', name: 'Carlos Mendez', company: 'Mendez Electric LLC', role: 'Electrician', group: 'Electrical', tags: ['Licensed & Insured', 'Spanish-Speaking', 'Fast Response'], avatarColor: '#A8D4C5', tab: 'contractors' },
  { id: 'c3', name: 'Mike Patterson', company: 'Denver Plumbing Pros', role: 'Plumber', group: 'Plumbing', tags: ['Licensed & Insured', 'Emergency Service', 'Fast Response'], avatarColor: '#C5B5A8', tab: 'contractors' },
  { id: 'c4', name: 'James Foster', company: 'Summit Roofing & Repair', role: 'Roofer', group: 'Roofing', tags: ['Licensed & Insured', 'Emergency Service', 'Warranty Offered'], avatarColor: '#D4C5A8', tab: 'contractors' },
  { id: 'c5', name: 'Tyler Reed', company: 'Alpine HVAC Solutions', role: 'HVAC Technician', group: 'HVAC', tags: ['Licensed & Insured', 'Fast Response', 'Warranty Offered'], avatarColor: '#B5C5D4', tab: 'contractors' },
  { id: 'c6', name: 'Sandra Kim', company: 'Fresh Coat Denver', role: 'Painter', group: 'Painting', tags: ['Licensed & Insured', 'Clean Work', 'On-Time Expert'], avatarColor: '#D4A8A8', tab: 'contractors' },
  { id: 'c7', name: 'Derek Lawson', company: 'Front Range Floors', role: 'Flooring Installer', group: 'Flooring', tags: ['Licensed & Insured', 'Clean Work', 'Competitive Pricing'], avatarColor: '#C4B882', tab: 'contractors' },
  { id: 'c8', name: 'Tony Hernandez', company: 'Hernandez Drywall', role: 'Drywall Specialist', group: 'Drywall', tags: ['Licensed & Insured', 'On-Time Expert', 'Spanish-Speaking'], avatarColor: '#A8C4D4', tab: 'contractors' },
  { id: 'c9', name: 'Kevin Walsh', company: 'Walsh Landscaping', role: 'Landscaper', group: 'Landscaping', tags: ['Licensed & Insured', 'Competitive Pricing', 'Clean Work'], avatarColor: '#B5D4A8', tab: 'contractors' },
  { id: 'c10', name: 'Ray Nguyen', company: 'Denver Pest Solutions', role: 'Pest Control', group: 'Pest Control', tags: ['Licensed & Insured', 'Fast Response', 'Warranty Offered'], avatarColor: '#D4C5B5', tab: 'contractors' },
];

const ALL_CONTACTS = [...PARTNERS, ...CONTRACTORS];

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{ name: string; color: string; size?: number }> = ({ name, color, size = 56 }) => {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.32, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// CONNECTION REQUEST CARD (Session 16)
// ─────────────────────────────────────────────
// Horizontal scroll card for incoming connection requests.
// Business context: Every accepted connection → messaging →
// squad eligibility → job → bid → 3% fee. This is the trust gateway.

const ConnectionRequestCard: React.FC<{
  request: ConnectionRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
}> = ({ request, onAccept, onDecline }) => (
  <View
    style={{
      width: 260,
      padding: 16,
      backgroundColor: COLORS.background,
      borderRadius: 14,
      borderWidth: 0.68,
      borderColor: 'rgba(0, 61, 195, 0.15)',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
      elevation: 2,
      gap: 12,
    }}
  >
    {/* Avatar + Info */}
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      <AvatarPlaceholder name={request.name} color={request.avatarColor} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}
          numberOfLines={1}
        >
          {request.name}
        </Text>
        <Text
          style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}
          numberOfLines={1}
        >
          {request.role} · {request.company}
        </Text>
        {request.mutualConnections > 0 && (
          <Text style={{ fontSize: 11, fontWeight: '400', color: COLORS.lightText, lineHeight: 16 }}>
            {request.mutualConnections} mutual connection{request.mutualConnections !== 1 ? 's' : ''}
          </Text>
        )}
      </View>
    </View>

    {/* Optional Note Preview */}
    {request.note && (
      <Text
        style={{
          fontSize: 12,
          fontWeight: '400',
          color: COLORS.bodyText,
          lineHeight: 16,
          fontStyle: 'italic',
        }}
        numberOfLines={2}
      >
        "{request.note}"
      </Text>
    )}

    {/* CTA Buttons: Accept (primary) + Decline (outline) */}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Pressable
        onPress={() => onAccept(request.id)}
        style={({ pressed }) => ({
          flex: 1,
          height: 34,
          backgroundColor: COLORS.primary,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <CheckIcon />
        <Text style={{ fontSize: 13, fontWeight: '500', color: '#FFFFFF', lineHeight: 18 }}>
          Accept
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onDecline(request.id)}
        style={({ pressed }) => ({
          flex: 1,
          height: 34,
          backgroundColor: COLORS.background,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <XSmallIcon />
        <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.bodyText, lineHeight: 18 }}>
          Decline
        </Text>
      </Pressable>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// NETWORK PRO CARD (condensed design)
// Squad toggle removed — squad management on HomeTab
// ─────────────────────────────────────────────

const NetworkProCard: React.FC<{
  contact: NetworkContact;
  onMessage: (contact: NetworkContact) => void;
  onInviteToJob?: (contact: NetworkContact) => void;
  onViewProfile: (contact: NetworkContact) => void;
  isContractor?: boolean;
}> = ({ contact, onMessage, onInviteToJob, onViewProfile, isContractor = false }) => (
  <Pressable
    onPress={() => onViewProfile(contact)}
    style={({ pressed }) => ({
      width: '100%',
      padding: 16,
      backgroundColor: COLORS.background,
      borderRadius: 14,
      borderWidth: 0.68,
      borderColor: COLORS.cardBorder,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
      gap: 16,
      opacity: pressed ? 0.95 : 1,
    })}
  >
    {/* Top row: Avatar + Info */}
    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
      <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>
        <AvatarPlaceholder name={contact.name} color={contact.avatarColor} />
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }} numberOfLines={1}>
            {contact.name}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }} numberOfLines={1}>
            {contact.company}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>
            {contact.role}
          </Text>
        </View>
      </View>
    </View>

    {/* Tags */}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {contact.tags.map((tag) => (
        <View key={tag} style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: COLORS.tagBg, borderRadius: 10 }}>
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.tagText, lineHeight: 16 }}>{tag}</Text>
        </View>
      ))}
    </View>

    {/* CTA Button — Invite to Job for Contractors, Message for Partners */}
    <Pressable
      onPress={() => isContractor ? onInviteToJob?.(contact) : onMessage(contact)}
      style={({ pressed }) => ({
        height: 36,
        paddingHorizontal: 16,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        borderWidth: 1.35,
        borderColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20, textAlign: 'center' }}>
        {isContractor ? 'Invite to Job' : 'Message'}
      </Text>
    </Pressable>
  </Pressable>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const NetworkTab: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<NetworkStackParamList>>();
  const [activeTab, setActiveTab] = useState<'partners' | 'contractors'>('partners');
  const [searchText, setSearchText] = useState<string>('');
  const [contacts, setContacts] = useState<NetworkContact[]>(ALL_CONTACTS);

  // ── Connection Requests state ──
  /**
   * @backend Replace with: const { data: connectionRequests } = useConnectionRequests();
   * Query: connections WHERE to_id = auth.uid() AND state = 'pending' ORDER BY created_at DESC
   */
  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>(MOCK_CONNECTION_REQUESTS);

  // ── Connection Requests bottom sheet animation ──
  const [requestsSheetVisible, setRequestsSheetVisible] = useState(false);
  const [requestsSheetMounted, setRequestsSheetMounted] = useState(false);
  const requestsBackdropAnim = useRef(new Animated.Value(0)).current;
  const requestsSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (requestsSheetVisible) {
      setRequestsSheetMounted(true);
      Animated.parallel([
        Animated.timing(requestsBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(requestsSlideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (requestsSheetMounted) {
      Animated.parallel([
        Animated.timing(requestsBackdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(requestsSlideAnim, {
          toValue: Dimensions.get('window').height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setRequestsSheetMounted(false));
    }
  }, [requestsSheetVisible]);

  // ── Invite to Job modal state ──
  const [inviteModalVisible, setInviteModalVisible] = useState<boolean>(false);
  const [invitePro, setInvitePro] = useState<InviteContractor | null>(null);

  const openInviteModal = (contact: NetworkContact) => {
    setInvitePro({
      id: contact.id,
      name: contact.name,
      company: contact.company,
      role: contact.role,
      avatarColor: contact.avatarColor,
      trades: contact.tags,
    });
    setInviteModalVisible(true);
  };

  const closeInviteModal = () => {
    setInviteModalVisible(false);
    setInvitePro(null);
  };

  // ── Navigate to 1:1 chat (cross-stack → Inbox tab → ChatScreen) ──
  // Uses CommonActions to push ChatScreen on top of InboxList so the
  // Inbox tab still shows its list when tapped directly from the tab bar.
  const handleMessageContact = (contact: NetworkContact) => {
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Inbox',
        params: {
          screen: 'ChatScreen',
          initial: false,
          params: {
            contactId: contact.id,
            contactName: contact.name,
            contactAvatarColor: contact.avatarColor,
            contactCompany: contact.company,
          },
        },
      })
    );
  };

  // ── Connection Request handlers (Session 16) ──

  /**
   * Accept a connection request.
   * @backend Replace with: acceptConnectionMutation.mutate(id)
   *   → supabase.rpc('rpc_accept_connection', { connection_id: id })
   *   → Invalidates: ['connections'], ['connectionRequests'], ['network']
   */
  const handleAcceptRequest = (id: string) => {
    const accepted = connectionRequests.find((r) => r.id === id);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const remaining = connectionRequests.filter((r) => r.id !== id);
    setConnectionRequests(remaining);
    if (remaining.length === 0) setRequestsSheetVisible(false);
    // TODO: Replace console.log with toast notification component
    if (accepted) {
      console.log(`✅ Connected with ${accepted.name}!`);
    }
  };

  /**
   * Decline a connection request.
   * @backend Replace with: declineConnectionMutation.mutate(id)
   *   → supabase.rpc('rpc_reject_connection', { connection_id: id })
   *   → Invalidates: ['connectionRequests']
   */
  const handleDeclineRequest = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const remaining = connectionRequests.filter((r) => r.id !== id);
    setConnectionRequests(remaining);
    if (remaining.length === 0) setRequestsSheetVisible(false);
  };

  // ── Filter contacts by tab and search ──
  const filteredContacts = useMemo(() => {
    return contacts.filter((c) => {
      const matchesTab = c.tab === activeTab;
      const matchesSearch =
        searchText.length === 0 ||
        c.name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.company.toLowerCase().includes(searchText.toLowerCase()) ||
        c.role.toLowerCase().includes(searchText.toLowerCase()) ||
        c.tags.some((t) => t.toLowerCase().includes(searchText.toLowerCase()));
      return matchesTab && matchesSearch;
    });
  }, [contacts, activeTab, searchText]);

  // ── Group contacts by their group field, sorted alphabetically ──
  const groupedContacts = useMemo(() => {
    const groups: { [key: string]: NetworkContact[] } = {};
    filteredContacts.forEach((c) => {
      if (!groups[c.group]) groups[c.group] = [];
      groups[c.group].push(c);
    });
    // Sort group keys alphabetically
    const sortedKeys = Object.keys(groups).sort((a, b) => a.localeCompare(b));
    return sortedKeys.map((key) => ({
      title: key,
      count: groups[key].length,
      contacts: groups[key],
    }));
  }, [filteredContacts]);

  // ── Total count for subtitle ──
  const totalCount = filteredContacts.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          STICKY HEADER
          ══════════════════════════════════════════ */}
      <View style={{ backgroundColor: COLORS.background, borderBottomWidth: 0.71, borderBottomColor: COLORS.border, paddingTop: 0, paddingBottom: 0 }}>

        {/* Top Row: Title + Search + Contact Requests */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '600', lineHeight: 24 }}>
            Network
          </Text>
          <SearchField
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search my network"
          />
          <Pressable
            onPress={() => { if (connectionRequests.length > 0) setRequestsSheetVisible(true); }}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <ContactRequestsIcon hasNotification={connectionRequests.length > 0} />
          </Pressable>
        </View>

        {/* Tab Switcher */}
        <View style={{ marginHorizontal: 16, marginBottom: 8, padding: 4, backgroundColor: COLORS.screenBg, borderRadius: 10, flexDirection: 'row' }}>
          <Pressable
            onPress={() => { setActiveTab('partners'); setSearchText(''); }}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              backgroundColor: activeTab === 'partners' ? COLORS.background : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: activeTab === 'partners' ? '#000000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: activeTab === 'partners' ? 0.1 : 0,
              shadowRadius: 3,
              elevation: activeTab === 'partners' ? 2 : 0,
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: activeTab === 'partners' ? '500' : '400',
              color: activeTab === 'partners' ? COLORS.primary : COLORS.bodyText,
              lineHeight: 24,
              textAlign: 'center',
            }}>
              Closing Partners
            </Text>
          </Pressable>
          <Pressable
            onPress={() => { setActiveTab('contractors'); setSearchText(''); }}
            style={{
              flex: 1,
              height: 40,
              borderRadius: 8,
              backgroundColor: activeTab === 'contractors' ? COLORS.background : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: activeTab === 'contractors' ? '#000000' : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: activeTab === 'contractors' ? 0.1 : 0,
              shadowRadius: 3,
              elevation: activeTab === 'contractors' ? 2 : 0,
            }}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: activeTab === 'contractors' ? '500' : '400',
              color: activeTab === 'contractors' ? COLORS.primary : COLORS.bodyText,
              lineHeight: 24,
              textAlign: 'center',
            }}>
              Contractors
            </Text>
          </Pressable>
        </View>
      </View>

      {/* ══════════════════════════════════════════
          SCROLLABLE CONTENT
          ══════════════════════════════════════════ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        keyboardShouldPersistTaps="handled"
      >

        {/* Partner/Contractor count */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8 }}>
          <Text style={{ color: COLORS.secondaryText, fontSize: 14, fontWeight: '400', lineHeight: 20 }}>
            {totalCount} {activeTab === 'partners' ? 'Partners' : 'Contractors'}
          </Text>
        </View>

        {groupedContacts.length > 0 ? (
          groupedContacts.map((group) => (
            <View key={group.title}>
              {/* Group Header */}
              <View style={{
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: 8,
                backgroundColor: COLORS.screenBg,
                borderBottomWidth: 0.71,
                borderBottomColor: COLORS.border,
              }}>
                <Text style={{
                  color: COLORS.primary,
                  fontSize: 15,
                  fontWeight: '400',
                  textTransform: 'uppercase',
                  lineHeight: 22,
                  letterSpacing: 0.14,
                }}>
                  {`${group.title.toUpperCase()} (${group.count})`}
                </Text>
              </View>

              {/* Cards */}
              <View style={{ paddingTop: 8, paddingBottom: 16, paddingHorizontal: 16, gap: 12 }}>
                {group.contacts.map((contact) => (
                  <NetworkProCard
                    key={contact.id}
                    contact={contact}
                    onMessage={handleMessageContact}
                    onInviteToJob={openInviteModal}
                    onViewProfile={(c) => navigation.navigate('ProProfile', { profile: mapNetworkContactToProfile(c) })}
                    isContractor={activeTab === 'contractors'}
                  />
                ))}
              </View>
            </View>
          ))
        ) : (
          /* ── Empty State ── */
          <View style={{ padding: 48, alignItems: 'center', gap: 12 }}>
            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
              <Circle cx={11} cy={11} r={8} stroke={COLORS.lightText} strokeWidth={1.5} />
              <Path d="M21 21L16.65 16.65" stroke={COLORS.lightText} strokeWidth={1.5} strokeLinecap="round" />
            </Svg>
            <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.bodyText }}>
              No matches found
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, textAlign: 'center' }}>
              Try adjusting your search or check the other tab
            </Text>
          </View>
        )}

        {/* Bottom spacing for tab bar */}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* ── Invite to Job Modal ── */}
      {invitePro && (
        <InviteToJobModal
          visible={inviteModalVisible}
          onClose={closeInviteModal}
          contractor={invitePro}
          onCreateNewJob={() => {
            // TODO: Navigate to PostJobWizard with contractor pre-attached
            // navigation.navigate('PostJob', { inviteContractor: invitePro });
            console.log('Navigate to PostJobWizard for', invitePro.name);
          }}
          onInviteSent={(jobId, contractorId, message) => {
            // TODO: Invalidate TanStack queries after invite
            console.log('Invite sent:', { jobId, contractorId, message });
          }}
        />
      )}

      {/* ── Connection Requests Bottom Sheet ── */}
      <Modal
        visible={requestsSheetMounted}
        transparent
        animationType="none"
        onRequestClose={() => setRequestsSheetVisible(false)}
      >
        {/* Backdrop */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            opacity: requestsBackdropAnim,
          }}
        >
          <Pressable
            onPress={() => setRequestsSheetVisible(false)}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            transform: [{ translateY: requestsSlideAnim }],
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 40,
              maxHeight: Dimensions.get('window').height * 0.85,
            }}
          >
            {/* Handle bar */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#D1D5DC',
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 16,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: COLORS.darkText,
                  lineHeight: 28,
                }}
              >
                Connection Requests ({connectionRequests.length})
              </Text>
              <Pressable
                onPress={() => setRequestsSheetVisible(false)}
                hitSlop={12}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                  <Path d="M5 5L15 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
                  <Path d="M15 5L5 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>

            {/* Request List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
            >
              {connectionRequests.map((request, index) => (
                <View
                  key={request.id}
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: index === 0 ? 0.68 : 0,
                    borderBottomWidth: 0.68,
                    borderColor: COLORS.border,
                  }}
                >
                  {/* Sender info row */}
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 9999,
                        backgroundColor: request.avatarColor,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 15, fontWeight: '600', color: '#FFFFFF' }}>
                        {request.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: COLORS.darkText,
                          lineHeight: 20,
                        }}
                        numberOfLines={1}
                      >
                        {request.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '400',
                          color: COLORS.secondaryText,
                          lineHeight: 16,
                        }}
                        numberOfLines={1}
                      >
                        {request.role} · {request.company}
                      </Text>
                      {request.mutualConnections > 0 && (
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '400',
                            color: COLORS.lightText,
                            lineHeight: 16,
                          }}
                        >
                          {request.mutualConnections} mutual connection{request.mutualConnections !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Optional note */}
                  {request.note && (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '400',
                        color: COLORS.bodyText,
                        lineHeight: 18,
                        marginBottom: 12,
                      }}
                      numberOfLines={2}
                    >
                      "{request.note}"
                    </Text>
                  )}

                  {/* Accept / Decline buttons */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => handleDeclineRequest(request.id)}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 36,
                        borderRadius: 8,
                        borderWidth: 1.35,
                        borderColor: '#D1D5DC',
                        backgroundColor: COLORS.background,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.bodyText, lineHeight: 18 }}>
                        Decline
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleAcceptRequest(request.id)}
                      style={({ pressed }) => ({
                        flex: 1,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: COLORS.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '500', color: '#FFFFFF', lineHeight: 18 }}>
                        Accept
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

export default NetworkTab;
