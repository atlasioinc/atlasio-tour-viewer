// HomeTabAgent.tsx
// ═══════════════════════════════════════════════════════════════
// Home Tab — Agent View (unified: empty + filled states, S63 merge)
// Main dashboard after onboarding completion
// Sections: SVG Icons, Squad Slot Data, Quick Actions, Active Deals,
//           Vouch Feed Data, Avatar, Main Component
//
// Layout: Top Bar → Active Deals (conditional) → Closing Squad (4 slots)
//         → Client Tools → Quick Actions → Active Jobs → Vouch Feed
//
// Active Deals section renders only when useAgentActiveDeals() returns deals
// with seeded milestones. Hidden entirely when no deals exist.
//
// @demo  Squad slots + quick actions + vouch feed = local constants
// @demo  Active jobs from MOCK_AGENT_ACTIVE_JOBS when USE_MOCK_DATA: true
// @backend rpc_get_agent_active_jobs() — deployed S135b
// @backend useAgentJobs (wired) — jobs.agent_id = auth.uid()
// @backend useMyProfile (wired) — profiles.id = auth.uid()
// @backend useAgentActiveDeals (mock) — rpc_get_deal_board_for_agent
// NOTE: will migrate to transaction_id in S64 when transactions table exists
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Modal,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import SearchField from './SearchField';
import SquadSlotPicker, { SquadProCandidate } from './SquadSlotPicker';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './HomeStack';
import type { AgentActiveJob, Job, BidWithProfile } from '../types';
import { COLORS, SHADOWS } from '../lib/tokens';
import { DEAL_CREATION_ENABLED } from '../lib/config';
import { useMyProfile, useAgentActiveDeals, useAgentActiveJobs } from '../hooks/useData';
import VouchFeedSection, { VouchFeedProfile } from './VouchFeedSection';
import { VerificationBanner, SkeletonBlock, ErrorToast } from './shared';
import { useErrorToast } from '../hooks/useErrorToast';
import { CardButton } from './Button';
import QuickActionsRow from './QuickActionsRow';
import { useVerificationGate } from '../hooks/useVerificationGate';
import { getSlotStatusDot } from '../features/partners/lib/dealMilestones';

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const LocationPinIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 1.33C5.42 1.33 3.33 3.42 3.33 6C3.33 9.5 8 14.67 8 14.67C8 14.67 12.67 9.5 12.67 6C12.67 3.42 10.58 1.33 8 1.33Z"
      stroke={COLORS.bodyText}
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx={8}
      cy={6}
      r={2}
      stroke={COLORS.bodyText}
      strokeWidth={1.33}
    />
  </Svg>
);

const BellIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z"
      stroke={COLORS.bodyText}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21"
      stroke={COLORS.bodyText}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const PlusIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = COLORS.bodyText,
}) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 3.33V12.67"
      stroke={color}
      strokeWidth={1.67}
      strokeLinecap="round"
    />
    <Path
      d="M3.33 8H12.67"
      stroke={color}
      strokeWidth={1.67}
      strokeLinecap="round"
    />
  </Svg>
);

const SendToClientIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
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

const PostJobWrenchIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const NewDealHouseIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M9 22V12H15V22" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// ACTIVE DEALS — Status Dot Calculation (S63, extracted to dealMilestones.ts in S66)
// ─────────────────────────────────────────────
// getSlotStatusDot imported from features/partners/lib/dealMilestones

const STATUS_DOT_COLORS: Record<string, string> = {
  red: COLORS.dangerText,
  amber: COLORS.warningAmber,
  green: COLORS.successGreen,
  gray: COLORS.secondaryText,
};

// ─────────────────────────────────────────────
// @demo SQUAD SLOT DATA — static mock slots
// ─────────────────────────────────────────────

interface SquadSlot {
  id: string;
  label: string;
  role: string;
  isAddNew?: boolean;
}

// role values must match profiles.role in Supabase (snake_case) — NOT display labels
// useConnectedPros(role) filters by c.profile?.role === role
// label is the display string shown under the slot circle
const SQUAD_SLOTS: SquadSlot[] = [
  { id: 'mortgage', label: 'Mortgage Pro', role: 'mortgage_pro' },
  { id: 'title', label: 'Title Officer', role: 'title_escrow' },
  { id: 'inspector', label: 'Home\nInspector', role: 'home_inspector' },
  { id: 'tc', label: 'Transaction\nCoordinator', role: 'transaction_coordinator' },
  { id: 'add', label: 'Add Another\nRole', role: '', isAddNew: true },
];

// Roles available to add beyond the default 4
const ADDITIONAL_ROLES = [
  { id: 'appraiser', label: 'Appraiser', role: 'appraiser' },
  { id: 'contractor', label: 'Contractor', role: 'contractor' },
  { id: 'warranty', label: 'Warranty', role: 'warranty' },
  { id: 'attorney', label: 'Attorney', role: 'attorney' },
];

// ─────────────────────────────────────────────
// QUICK ACTION CARD DATA
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// NEIGHBORHOOD INTELLIGENCE ICONS + CARD
// ─────────────────────────────────────────────

const SparklesIcon = ({ size = 20, color = COLORS.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z" fill={color} />
    <Path d="M19 15L19.8 17.2L22 18L19.8 18.8L19 21L18.2 18.8L16 18L18.2 17.2L19 15Z" fill={color} />
    <Path d="M5 3L5.5 4.5L7 5L5.5 5.5L5 7L4.5 5.5L3 5L4.5 4.5L5 3Z" fill={color} />
  </Svg>
);

const ChevronRightIcon = ({ size = 16, color = COLORS.lightText }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3L11 8L6 13" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ── ClientToolCard ────────────────────────────────────────────────────────────
// Reusable card for the Client Tools section.
// Each tool is one <ClientToolCard> entry — add future tools the same way.
// Props: icon component, title string, subtitle string, onPress handler.
// ─────────────────────────────────────────────────────────────────────────────
interface ClientToolCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}

const ClientToolCard = ({ icon, title, subtitle, onPress }: ClientToolCardProps) => {
  // Separate ref name to avoid collision with other scaleAnims elsewhere in this file
  const pressScaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={{
          marginHorizontal: 16,
          backgroundColor: COLORS.background,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          transform: [{ scale: pressScaleAnim }],
        }}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 10,
          backgroundColor: COLORS.tagBg,
          alignItems: 'center', justifyContent: 'center',
        }}>
          {icon}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 2 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.secondaryText, lineHeight: 20 }}>
            {subtitle}
          </Text>
        </View>
        <ChevronRightIcon size={16} color={COLORS.lightText} />
      </Animated.View>
    </Pressable>
  );
};

// ─────────────────────────────────────────────
// JOB STATUS DISPLAY MAP — agent-facing labels
// pending_completion = contractor marked done, agent needs to confirm
// ─────────────────────────────────────────────
const JOB_STATUS_LABELS: Record<string, string> = {
  awarded: 'Scheduled',
  in_progress: 'In Progress',
  pending_completion: 'Review Required',
};

// ─────────────────────────────────────────────
// SKELETON LOADERS — shimmer placeholders matching real card dimensions (S138)
// ─────────────────────────────────────────────

const ActiveDealsSkeletonRow = () => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 12 }}
  >
    {[0, 1].map(i => (
      <View key={i} style={{
        width: 180,
        borderRadius: 14,
        borderWidth: 0.68,
        borderColor: COLORS.cardBorder,
        backgroundColor: COLORS.background,
        padding: 12,
        gap: 8,
      }}>
        <SkeletonBlock width="100%" height={14} borderRadius={6} />
        <SkeletonBlock width="60%" height={12} borderRadius={6} />
        <View style={{ flexDirection: 'row', marginTop: 4, gap: 4 }}>
          {[0, 1, 2].map(j => (
            <SkeletonBlock key={j} width={28} height={28} borderRadius={9999} />
          ))}
        </View>
      </View>
    ))}
  </ScrollView>
);

const ActiveJobsSkeletonRow = () => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 4 }}
  >
    {[0, 1].map(i => (
      <View key={i} style={{
        width: 325,
        borderRadius: 14,
        borderWidth: 0.68,
        borderColor: COLORS.cardBorder,
        backgroundColor: COLORS.background,
        padding: 16,
        gap: 8,
      }}>
        <SkeletonBlock width="70%" height={16} borderRadius={6} />
        <SkeletonBlock width="50%" height={13} borderRadius={6} />
        <SkeletonBlock width={100} height={28} borderRadius={14} />
      </View>
    ))}
  </ScrollView>
);

// ─────────────────────────────────────────────
// ACTIVE JOB CARD — inline component for per-card spring press animation
// @demo Active Jobs cards — powered by MOCK_AGENT_ACTIVE_JOBS when USE_MOCK_DATA: true
// @backend rpc_get_agent_active_jobs() — deployed S135b
// Press animation: scale(0.97) spring — established pattern for all cards in app
// ─────────────────────────────────────────────

const ActiveJobCard: React.FC<{ job: AgentActiveJob; onPress: () => void }> = ({
  job,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={onPress}
        style={{
          width: 325,
          borderRadius: 14,
          borderWidth: 0.68,
          borderColor: COLORS.cardBorder,
          backgroundColor: COLORS.background,
          padding: 16,
          gap: 8,
          ...SHADOWS.card,
        }}
      >
        {/* Urgent badge */}
        {job.is_urgent && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: COLORS.urgentBg,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 9999,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.urgentText }}>
              Urgent
            </Text>
          </View>
        )}

        {/* Title */}
        <Text
          numberOfLines={1}
          style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}
        >
          {job.title}
        </Text>

        {/* Address */}
        <Text
          numberOfLines={1}
          style={{ fontSize: 14, color: COLORS.secondaryText }}
        >
          {job.address}
        </Text>

        {/* Contractor name */}
        <Text style={{ fontSize: 14, color: COLORS.bodyText }}>
          {job.contractor?.name ?? 'Contractor'}
        </Text>

        {/* Status + Due date row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '500',
              color: job.status === 'pending_completion' ? COLORS.warningAmber : COLORS.secondaryText,
            }}
          >
            {JOB_STATUS_LABELS[job.status] ?? job.status}
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.secondaryText }}>
            {new Date(job.due_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        {/* Review Required badge — contractor marked done, agent needs to confirm */}
        {job.contractor_completed_at !== null && (
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: COLORS.warningBg,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 9999,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.warningText }}>
              Needs your review
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const HomeTabAgent: React.FC = () => {
  const [hasActiveRepair, setHasActiveRepair] = useState<boolean>(false);
  const [isFilled, setIsFilled] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [activeRepairPill, setActiveRepairPill] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  // Verification banner + gate
  const { data: myProfile } = useMyProfile();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { canPostJob } = useVerificationGate();

  // @backend rpc_get_agent_active_jobs() — deployed S135b
  // @demo MOCK_AGENT_ACTIVE_JOBS in hooks/useData.ts when USE_MOCK_DATA: true
  const { data: activeJobs = [], isLoading: isLoadingJobs, refetch: refetchJobs } = useAgentActiveJobs();

  // ── Active Deals (S63) ──
  // @backend rpc_get_deal_board_for_agent — params: { p_agent_id: auth.uid() }
  // NOTE: will migrate to transaction_id in S64 when transactions table exists
  const { data: activeDeals, isLoading: isLoadingDeals, refetch: refetchDeals } = useAgentActiveDeals();
  const hasActiveDeals = (activeDeals?.length ?? 0) > 0;

  // ── Error toast (S138) ──
  const errorToast = useErrorToast();

  // ── Time-based greeting ──
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const firstName = myProfile?.name?.split(' ')[0] ?? 'there';

  // ── Squad State ──
  const [squadMembers, setSquadMembers] = useState<{ [slotId: string]: SquadProCandidate }>({});
  const [additionalSlots, setAdditionalSlots] = useState<SquadSlot[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerRole, setPickerRole] = useState('');
  const [pickerSlotId, setPickerSlotId] = useState('');
  const [pickerCurrentProId, setPickerCurrentProId] = useState<string | undefined>();
  const [rolePickerVisible, setRolePickerVisible] = useState(false);

  // ── Add Another Role modal animation (fade backdrop + slide sheet) ──
  const [roleModalMounted, setRoleModalMounted] = useState(false);
  const roleBackdropAnim = useRef(new Animated.Value(0)).current;
  const roleSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;
  const pendingPickerRef = useRef<{ role: string; slotId: string } | null>(null);

  useEffect(() => {
    if (rolePickerVisible) {
      setRoleModalMounted(true);
      Animated.parallel([
        Animated.timing(roleBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(roleSlideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (roleModalMounted) {
      Animated.parallel([
        Animated.timing(roleBackdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(roleSlideAnim, {
          toValue: Dimensions.get('window').height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRoleModalMounted(false);
        if (pendingPickerRef.current) {
          const { role, slotId } = pendingPickerRef.current;
          pendingPickerRef.current = null;
          setTimeout(() => {
            setPickerRole(role);
            setPickerSlotId(slotId);
            setPickerCurrentProId(undefined);
            setPickerVisible(true);
          }, 100);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- animated refs are stable
  }, [rolePickerVisible]);

  // Computed squad values
  const filledCount = Object.keys(squadMembers).length;
  const totalSlots = SQUAD_SLOTS.filter((s) => !s.isAddNew).length + additionalSlots.length;
  const hasAnyFilled = filledCount > 0;

  // Combine default + additional slots; filled sort left, empty right, "Add" always last
  const roleSlots = [
    ...SQUAD_SLOTS.filter((s) => !s.isAddNew),
    ...additionalSlots,
  ].sort((a, b) => {
    const aFilled = squadMembers[a.id] ? 0 : 1;
    const bFilled = squadMembers[b.id] ? 0 : 1;
    return aFilled - bFilled;
  });
  const allSquadSlots = [
    ...roleSlots,
    SQUAD_SLOTS.find((s) => s.isAddNew)!,
  ];

  // Available roles = ones not yet added as additional slots
  const availableRoles = ADDITIONAL_ROLES.filter(
    (r) => !additionalSlots.some((s) => s.id === r.id)
  );

  // ── Squad Handlers ──
  const handleSlotPress = (slot: SquadSlot) => {
    if (slot.isAddNew) {
      setRolePickerVisible(true);
      return;
    }
    const existingPro = squadMembers[slot.id];
    setPickerRole(slot.role);
    setPickerSlotId(slot.id);
    setPickerCurrentProId(existingPro?.id);
    setPickerVisible(true);
  };

  const handleProSelected = (pro: SquadProCandidate) => {
    setSquadMembers((prev) => ({
      ...prev,
      [pickerSlotId]: pro,
    }));
    setPickerVisible(false);
  };

  const handleFindNewPro = () => {
    setPickerVisible(false);
    navigation.dispatch(CommonActions.navigate({ name: 'Find' }));
  };

  const handleRemovePro = () => {
    setSquadMembers((prev) => {
      const next = { ...prev };
      delete next[pickerSlotId];
      return next;
    });
    setAdditionalSlots((prev) => prev.filter((s) => s.id !== pickerSlotId));
  };

  const isAdditionalSlot = (slotId: string): boolean =>
    additionalSlots.some((s) => s.id === slotId);

  const handleAddRole = (role: { id: string; label: string; role: string }) => {
    const newSlot: SquadSlot = {
      id: role.id,
      label: role.label,
      role: role.role,
    };
    setAdditionalSlots((prev) => [...prev, newSlot]);
    pendingPickerRef.current = { role: role.role, slotId: role.id };
    setRolePickerVisible(false);
  };

  // ── Vouch Feed → ProProfile navigation ──
  const handleVouchNavigate = (profile: VouchFeedProfile) => {
    navigation.push('ProProfile', { profileId: profile.id });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          TOP BAR — Location, Search, Notifications
          ══════════════════════════════════════════ */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 0,
          paddingBottom: 12,
          backgroundColor: COLORS.background,
          borderBottomWidth: 0.69,
          borderBottomColor: '#8DB0FF', // @tokens — no exact match. Add COLORS.topBarBorder: '#8DB0FF' in token audit session
          gap: 10,
        }}
      >
        {/* Location */}
        <Pressable
          onPress={() => {
            setIsFilled((prev) => {
              const next = !prev;
              setHasActiveRepair(next);
              return next;
            });
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <LocationPinIcon />
          <Text
            style={{
              fontSize: 14,
              fontWeight: '400',
              color: COLORS.bodyText,
              lineHeight: 20,
            }}
          >
            {isFilled ? 'Denver \u2726' : 'Denver'}
          </Text>
        </Pressable>

        <SearchField
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search..."
        />

        {/* Notification Bell */}
        <Pressable
          onPress={() => navigation.navigate('Notifications')}
          style={({ pressed }) => ({
            width: 24,
            height: 24,
            position: 'relative' as const,
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <BellIcon />
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -8,
              width: 20,
              height: 20,
              borderRadius: 9999,
              backgroundColor: COLORS.notificationRed,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '400',
                color: COLORS.background,
                lineHeight: 16,
              }}
            >
              3
            </Text>
          </View>
        </Pressable>
      </View>

      {/* ══════════════════════════════════════════
          SCROLLABLE CONTENT
          ══════════════════════════════════════════ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: 64 }}
      >

        {/* ── Verification Banner — inside scroll so it sits on screenBg naturally ── */}
        {!bannerDismissed && myProfile && myProfile.verification_level !== 'fully_verified' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <VerificationBanner
              level={myProfile.verification_level ?? 'none'}
              role={myProfile.role === 'agent' ? 'agent' : 'contractor'}
              onPress={() => {
                // TODO: PRODUCTION — navigate to VerificationScreen (requires cross-stack navigation)
              }}
              onDismiss={() => setBannerDismissed(true)}
            />
          </View>
        )}

        {/* ── DEMO TOGGLE — visible on pull down ── */}
        <View
          style={{
            backgroundColor: COLORS.screenBg,
            paddingVertical: 8,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
          }}
        >
          <Pressable
            onPress={() => {
              setIsFilled(false);
              setHasActiveRepair(false);
            }}
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
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: !isFilled ? COLORS.background : COLORS.primary,
              }}
            >
              Empty
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setIsFilled(true);
              setHasActiveRepair(true);
            }}
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
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: isFilled ? COLORS.background : COLORS.primary,
              }}
            >
              Filled
            </Text>
          </Pressable>
        </View>

        {/* ── Greeting header ── */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.darkText, lineHeight: 32 }}>
            {greeting}, {firstName} 👋
          </Text>
          {/* @demo subtitle removed — greeting is name only per S130a design decision */}
        </View>

        {/* ── YOUR CLOSING SQUAD SECTION ── */}
        <View
          style={{
            backgroundColor: COLORS.screenBg,
            paddingTop: 24,
            paddingBottom: 24,
            borderBottomWidth: 0.69,
            borderBottomColor: COLORS.border,
          }}
        >
          {/* Header Row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              minHeight: 28,
              paddingHorizontal: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: COLORS.darkText,
                lineHeight: 24,
              }}
            >
              Your Closing Squad
            </Text>
            {hasAnyFilled && (
              <Pressable
                onPress={() =>
                navigation.navigate('SendSquad', {
                  squadMembers,
                  defaultSlots: SQUAD_SLOTS,
                  additionalSlots,
                  })
                }
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  paddingHorizontal: 12,
                  height: 36,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                  backgroundColor: COLORS.background,
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 6,
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <SendToClientIcon />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: COLORS.primary,
                    lineHeight: 20,
                    textAlign: 'center',
                  }}
                >
                  Send to Client
                </Text>
              </Pressable>
            )}
          </View>

          {/* Context copy — always visible, not gated by fill state */}
          <Text style={{ fontSize: 14, color: COLORS.secondaryText, lineHeight: 20, paddingHorizontal: 16, marginTop: 4 }}>
            Add your go-to pros. Send to clients in one tap.
          </Text>

          {/* Squad Slots — Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 16 }}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
          >
            {allSquadSlots.map((slot) => {
              const member = squadMembers[slot.id];
              return (
                <Pressable
                  key={slot.id}
                  onPress={() => handleSlotPress(slot)}
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    width: 80,
                    gap: 12,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 9999,
                      backgroundColor:
                        member
                          ? member.avatarColor || '#A8C5DA'
                          : slot.isAddNew
                            ? COLORS.primary
                            : COLORS.squadCircle,
                      borderWidth: member ? 2 : 0,
                      borderColor: member ? 'rgba(0, 61, 195, 0.15)' : 'transparent', // @tokens — iconTintBg is 0.10 opacity, different. Add dedicated token in token audit session
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {member ? (
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: '600',
                          color: COLORS.background,
                        }}
                      >
                        {member.name
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .substring(0, 2)}
                      </Text>
                    ) : !slot.isAddNew ? (
                      <View
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9999,
                          backgroundColor: COLORS.background,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <PlusIcon size={16} color={COLORS.bodyText} />
                      </View>
                    ) : (
                      <PlusIcon size={24} color={COLORS.background} />
                    )}
                  </View>
                  {member ? (
                    <View style={{ alignItems: 'center', gap: 2 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '500',
                          color: COLORS.bodyText,
                          lineHeight: 16,
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {member.name.split(' ')[0]}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: '400',
                          color: COLORS.secondaryText,
                          lineHeight: 14,
                          textAlign: 'center',
                        }}
                        numberOfLines={1}
                      >
                        {slot.label.replace('\n', ' ')}
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '400',
                        color: COLORS.bodyText,
                        lineHeight: 16,
                        textAlign: 'center',
                      }}
                      numberOfLines={2}
                    >
                      {slot.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Progress Text — only when partially filled */}
          {hasAnyFilled && filledCount < totalSlots ? (
            <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '400',
                  color: COLORS.bodyText,
                  lineHeight: 20,
                  textAlign: 'center',
                }}
              >
                {filledCount} of {totalSlots} roles filled — keep building!
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── ACTIVE DEALS SECTION (S63) ──
            Renders only when useAgentActiveDeals() returns deals with seeded milestones.
            @demo mock data: 2 deals (1 with alert, 1 clean)
            @backend rpc_get_deal_board_for_agent — params: { p_agent_id: auth.uid() }
            NOTE: will migrate to transaction_id in S64 when transactions table exists
            ──────────────────────────────────────────────────────────── */}
        {(hasActiveDeals || isLoadingDeals) && (
          <View style={{
            paddingTop: 24, paddingBottom: 16,
            backgroundColor: COLORS.background,
            borderBottomWidth: 0.69, borderBottomColor: COLORS.border,
          }}>
            {/* Section header row */}
            <View style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              paddingHorizontal: 16, marginBottom: 16,
            }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
                Active Deals
              </Text>
              {/* @demo flip DEAL_CREATION_ENABLED: true to show CTA
                  @backend rpc_create_transaction — entry point for deal creation */}
              {DEAL_CREATION_ENABLED && (
                <CardButton
                  variant="outlined"
                  label="New Deal"
                  onPress={() => navigation.push('DealCreation')}
                  leftIcon={<NewDealHouseIcon />}
                />
              )}
            </View>

            {/* Deal cards — loading skeleton or horizontal scroll (S138) */}
            {isLoadingDeals ? <ActiveDealsSkeletonRow /> : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 12 }}
            >
              {(activeDeals ?? []).map((deal) => {
                // Count undismissed alerts across all partners
                const totalAlerts = deal.partners.reduce(
                  (sum, p) => sum + (p.alerts ?? []).filter(a => !a.dismissed_at).length, 0,
                );
                const closingLabel = deal.closing_date
                  ? new Date(deal.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : null;

                return (
                  <Pressable
                    key={deal.job_id}
                    onPress={() => navigation.push('AgentDealDetail', { jobId: deal.job_id, transactionId: deal.transaction_id })}
                    style={({ pressed }) => ({
                      width: 180,
                      borderRadius: 14, borderWidth: 0.68, borderColor: COLORS.cardBorder,
                      backgroundColor: COLORS.background, padding: 12,
                      ...SHADOWS.card,
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    {/* Address */}
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText }} numberOfLines={1}>
                      {deal.address}
                    </Text>

                    {/* Closing date */}
                    {closingLabel && (
                      <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, marginTop: 2 }}>
                        Closing {closingLabel}
                      </Text>
                    )}

                    {/* Squad avatar row with status dots */}
                    <View style={{ flexDirection: 'row', marginTop: 10, gap: 4 }}>
                      {deal.partners.map((partner, idx) => {
                        const dot = getSlotStatusDot(partner, partner.partner_role);
                        return (
                          <View key={partner.partner_id ?? `partner-${idx}`} style={{ position: 'relative' }}>
                            <View style={{
                              width: 28, height: 28, borderRadius: 9999,
                              backgroundColor: partner.partner_avatar_color ?? COLORS.secondaryText,
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.background }}>
                                {(partner.name ?? '').charAt(0)}
                              </Text>
                            </View>
                            {/* Status dot — bottom-right on avatar */}
                            <View style={{
                              position: 'absolute', bottom: -1, right: -1,
                              width: 8, height: 8, borderRadius: 9999,
                              backgroundColor: STATUS_DOT_COLORS[dot],
                              borderWidth: 1.5, borderColor: COLORS.background,
                            }} />
                          </View>
                        );
                      })}
                    </View>

                    {/* Alert pill */}
                    {totalAlerts > 0 && (
                      <View style={{
                        alignSelf: 'flex-start', marginTop: 8,
                        backgroundColor: COLORS.mustHaveTileBg,
                        borderRadius: 9999, paddingHorizontal: 8, paddingVertical: 2,
                      }}>
                        <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.warningAmber }}>
                          {totalAlerts} alert{totalAlerts > 1 ? 's' : ''}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
            )}

            {/* View all deals link → AgentDealsScreen (wired S66) */}
            <Pressable
              onPress={() => navigation.push('AgentDealsScreen')}
              style={({ pressed }) => ({ paddingHorizontal: 16, marginTop: 12, opacity: pressed ? 0.5 : 1 })}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary }}>
                View all deals →
              </Text>
            </Pressable>
          </View>
        )}

        {/* ── CLIENT TOOLS SECTION ─────────────────────────────────────────────────
            Entry point for agent intelligence tools.
            v1: Neighborhood Match only.
            Future tools (post-seed): add as additional <ClientToolCard> entries below.
            Each card navigates into HomeStack via fullScreenModal.
            ──────────────────────────────────────────────────────────── */}

        {/* Section header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 16 }}>
          <Text style={{
            fontSize: 18, fontWeight: '600',
            color: COLORS.darkText,
            lineHeight: 24,
          }}>
            Client Tools
          </Text>
        </View>

        {/* Tool cards — add future tools here as additional <ClientToolCard> entries */}
        <ClientToolCard
          icon={<SparklesIcon size={20} color={COLORS.primary} />}
          title="Neighborhood Match"
          subtitle="Match areas to your client's lifestyle"
          onPress={() => navigation.navigate('ClientLifestyleScreen')}
        />

        <QuickActionsRow />

        {/* ── ACTIVE JOBS SECTION ── */}
        {/* @backend rpc_get_agent_active_jobs() — deployed S135b */}
        {/* @demo MOCK_AGENT_ACTIVE_JOBS in hooks/useData.ts when USE_MOCK_DATA: true */}
        <View
          style={{
            paddingTop: 24,
            paddingBottom: 24,
            backgroundColor: COLORS.background,
          }}
        >
          <View style={{ gap: 16 }}>
            {/* Header Row */}
            <View style={{ gap: 12, paddingHorizontal: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: COLORS.darkText,
                    lineHeight: 24,
                  }}
                >
                  {`Active Jobs (${hasActiveRepair ? activeJobs.length : 0})`}
                </Text>
                <Pressable
                  onPress={() => {
                    if (!canPostJob) {
                      Alert.alert(
                        'Verify your account to post jobs',
                        'To protect our community, we require account verification before posting jobs. This helps ensure quality and trust.',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Get Verified',
                            onPress: () => navigation.dispatch(
                              CommonActions.navigate({ name: 'Profile', params: { screen: 'Verification' } }),
                            ),
                          },
                        ],
                      );
                      return;
                    }
                    navigation.navigate('PostJobWizard');
                  }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    paddingHorizontal: 12,
                    height: 36,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                    backgroundColor: COLORS.background,
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 6,
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <PostJobWrenchIcon />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: COLORS.primary,
                      lineHeight: 20,
                      textAlign: 'center',
                    }}
                  >
                    Post New Job
                  </Text>
                </Pressable>
              </View>

              {/* Filter Pills */}
              {hasActiveRepair && (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  {['Urgent', 'New Bids', 'In Progress'].map((pill) => (
                    <Pressable
                      key={pill}
                      onPress={() => setActiveRepairPill(activeRepairPill === pill ? null : pill)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: activeRepairPill === pill ? COLORS.primary : COLORS.chipBg,
                        borderRadius: 9999,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '400',
                          color: activeRepairPill === pill ? COLORS.background : COLORS.statText,
                          lineHeight: 20,
                          textAlign: 'center',
                        }}
                      >
                        {pill}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* Loading skeleton (S138) */}
            {isLoadingJobs && <ActiveJobsSkeletonRow />}

            {/* Empty state */}
            {!isLoadingJobs && (!hasActiveRepair || activeJobs.length === 0) && (
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.secondaryText,
                  textAlign: 'center',
                  paddingVertical: 16,
                }}
              >
                No active jobs
              </Text>
            )}

            {/* Job cards horizontal scroll */}
            {!isLoadingJobs && hasActiveRepair && activeJobs.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingVertical: 4 }}
              >
                {activeJobs.map((job: AgentActiveJob) => (
                  <ActiveJobCard
                    key={job.id}
                    job={job}
                    onPress={() => navigation.push('RepairJobDetails', {
                      job: {
                        ...job,
                        // @demo: stub missing Job fields — overwritten by useJob(jobId) on mount
                        agent_id: '',
                        description: '',
                        photo_urls: [],
                        awarded_bid_id: null,
                        bid_deadline: null,
                        max_bid_edits: 3,
                        invited_contractor_ids: [],
                        category: null,
                        service_packages: null,
                        turnaround_preference: null,
                        sqft: null,
                        occupied_or_vacant: null,
                        rooms_count: null,
                        staging_scope: null,
                        agent_confirmed_at: null,
                        completion_notes: null,
                        proof_photo_urls: [],
                        revision_notes: null,
                        vouch_prompt_sent: false,
                        updated_at: job.created_at,
                        bids: [],
                        // @backend: wire real bids when DEAL_CREATION_ENABLED=true
                      } as Job & { bids: BidWithProfile[] },
                    })}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* ── VOUCH FEED SECTION ──
            @demo 20 mock vouch cards with filter tabs + 75% contractor bias
            @backend useVouchFeed() — vouches + profiles join
            Names are tappable → ProProfile navigation */}
        <View style={{ paddingTop: 24, paddingBottom: 20 }}>
          <VouchFeedSection onNavigateToProfile={handleVouchNavigate} />
        </View>

      </ScrollView>

      {/* ── SQUAD SLOT PICKER (bottom sheet) ── */}
      <SquadSlotPicker
        visible={pickerVisible}
        role={pickerRole}
        onSelect={handleProSelected}
        onClose={() => setPickerVisible(false)}
        onFindNewPro={handleFindNewPro}
        onRemove={
          pickerCurrentProId || isAdditionalSlot(pickerSlotId)
            ? handleRemovePro
            : undefined
        }
        currentProId={pickerCurrentProId}
        isAdditionalRole={isAdditionalSlot(pickerSlotId)}
      />

      {/* ── ADD ANOTHER ROLE MODAL ── */}
      <Modal
        visible={roleModalMounted}
        transparent
        animationType="none"
        onRequestClose={() => setRolePickerVisible(false)}
      >
        {/* Backdrop */}
        <Animated.View
          style={{
            ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
            backgroundColor: 'rgba(0, 0, 0, 0.4)', // @tokens — between overlayLight (0.3) and overlayDark (0.5). Add dedicated token in token audit session
            opacity: roleBackdropAnim,
          }}
        >
          <Pressable
            onPress={() => setRolePickerVisible(false)}
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
            transform: [{ translateY: roleSlideAnim }],
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: COLORS.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 40,
            }}
          >
            {/* Handle bar */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: COLORS.inputBorder,
                }}
              />
            </View>

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 16,
              }}
            >
              <View style={{ flex: 1, gap: 2, paddingRight: 16 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '600',
                    color: COLORS.darkText,
                    lineHeight: 28,
                  }}
                >
                  Add Another Role
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: COLORS.secondaryText,
                    lineHeight: 20,
                  }}
                >
                  Choose a role to add to your squad
                </Text>
              </View>
              <Pressable
                onPress={() => setRolePickerVisible(false)}
                hitSlop={12}
                style={({ pressed }) => ({
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  backgroundColor: COLORS.chipBg,
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

            {/* Role List */}
            {availableRoles.length > 0 ? (
              availableRoles.map((role) => (
                <Pressable
                  key={role.id}
                  onPress={() => handleAddRole(role)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: 0.68,
                    borderTopColor: COLORS.border,
                    backgroundColor: pressed ? COLORS.filterBg : COLORS.background,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '400',
                      color: COLORS.darkText,
                      lineHeight: 24,
                    }}
                  >
                    {role.label}
                  </Text>
                  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                    <Path
                      d="M6 4L10 8L6 12"
                      stroke={COLORS.lightText}
                      strokeWidth={1.33}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>
              ))
            ) : (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: COLORS.secondaryText,
                    textAlign: 'center',
                    lineHeight: 20,
                  }}
                >
                  All available roles have been added to your squad
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Modal>

      {/* Error toast (S138) — errorToast.showError('msg') from error handlers */}
      {errorToast.errorMessage ? (
        <ErrorToast
          message={errorToast.errorMessage}
          onDismiss={errorToast.dismissError}
          onRetry={() => { refetchJobs(); refetchDeals(); }}
        />
      ) : null}
    </SafeAreaView>
  );
};

export default HomeTabAgent;
