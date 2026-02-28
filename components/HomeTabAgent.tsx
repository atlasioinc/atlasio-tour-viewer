// HomeTabAgent.tsx
// ═══════════════════════════════════════════════════════════════
// Home Tab — Agent View
// Main dashboard after onboarding completion
// Sections: Top Bar, Closing Squad, Quick Actions, Active Repairs, Vouch Feed
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  TextInput,
  FlatList,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import SearchField from './SearchField';
import SquadSlotPicker, { SquadProCandidate } from './SquadSlotPicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './HomeStack';
import { MOCK_REPAIR_JOBS, ACTIVE_REPAIR_JOBS } from './RepairJobsData';
import RepairCard from './RepairCard';
import { COLORS } from '../lib/tokens';
import QuickActionsRow from './QuickActionsRow';
import VouchFeedSection, { VouchFeedProfile } from './VouchFeedSection';
import type { ProProfileData } from './ProProfile';

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

const SearchIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle
      cx={9.17}
      cy={9.17}
      r={6.67}
      stroke={COLORS.lightText}
      strokeWidth={1.67}
    />
    <Path
      d="M14.17 14.17L17.5 17.5"
      stroke={COLORS.lightText}
      strokeWidth={1.67}
      strokeLinecap="round"
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

const ClockIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle
      cx={12}
      cy={12}
      r={10}
      stroke={COLORS.cardBlueIcon}
      strokeWidth={2}
    />
    <Path
      d="M12 6V12L16 14"
      stroke={COLORS.cardBlueIcon}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const ShieldDocIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z"
      stroke={COLORS.cardGreenIcon}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2V8H20"
      stroke={COLORS.cardGreenIcon}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 13L11 15L15 11"
      stroke={COLORS.cardGreenIcon}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ToolIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14.7 6.3C14.5168 6.48693 14.4141 6.73825 14.4141 7C14.4141 7.26175 14.5168 7.51307 14.7 7.7L16.3 9.3C16.4869 9.48322 16.7383 9.58585 17 9.58585C17.2617 9.58585 17.5131 9.48322 17.7 9.3L21.47 5.53C21.9728 6.6412 22.1251 7.87924 21.9065 9.07916C21.6878 10.2791 21.1087 11.3838 20.2463 12.2463C19.3838 13.1087 18.2791 13.6878 17.0792 13.9065C15.8792 14.1251 14.6412 13.9728 13.53 13.47L6.62 20.38C6.22218 20.7778 5.68261 21.0013 5.12 21.0013C4.55739 21.0013 4.01783 20.7778 3.62 20.38C3.22218 19.9822 2.99868 19.4426 2.99868 18.88C2.99868 18.3174 3.22218 17.7778 3.62 17.38L10.53 10.47C10.0272 9.35878 9.87493 8.12076 10.0935 6.92084C10.3122 5.72092 10.8913 4.61623 11.7537 3.75377C12.6162 2.89131 13.7209 2.31219 14.9208 2.09355C16.1208 1.87491 17.3588 2.02718 18.47 2.53L14.71 6.29L14.7 6.3Z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrendingIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
      stroke={COLORS.cardPurpleIcon}
      strokeWidth={2}
    />
    <Path
      d="M16 12L12 8L8 12"
      stroke={COLORS.cardPurpleIcon}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12 16V8"
      stroke={COLORS.cardPurpleIcon}
      strokeWidth={2}
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

// ─────────────────────────────────────────────
// SQUAD SLOT DATA
// ─────────────────────────────────────────────

interface SquadSlot {
  id: string;
  label: string;
  role: string;
  isAddNew?: boolean;
}

const SQUAD_SLOTS: SquadSlot[] = [
  { id: 'mortgage', label: 'Mortgage Pro', role: 'Mortgage Pro' },
  { id: 'title', label: 'Title Officer', role: 'Title/Escrow' },
  { id: 'inspector', label: 'Home\nInspector', role: 'Home Inspector' },
  { id: 'tc', label: 'Transaction\nCoordinator', role: 'Transaction Coordinator' },
  { id: 'add', label: 'Add Another\nRole', role: '', isAddNew: true },
];

// Roles available to add beyond the default 4
const ADDITIONAL_ROLES = [
  { id: 'appraiser', label: 'Appraiser', role: 'Appraiser' },
  { id: 'contractor', label: 'Contractor', role: 'Contractor' },
  { id: 'warranty', label: 'Warranty', role: 'Warranty' },
  { id: 'attorney', label: 'Attorney', role: 'Attorney' },
];

// ─────────────────────────────────────────────
// QUICK ACTION CARD DATA
// ─────────────────────────────────────────────

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'fast-lender',
    title: 'Need a Fast Lender',
    subtitle: 'Closes ≤21 days ·\n10+ vouches',
    bgColor: COLORS.cardBlue,
    borderColor: COLORS.cardBlueBorder,
    icon: <ClockIcon />,
  },
  {
    id: 'reliable-title',
    title: 'Reliable Title',
    subtitle: 'Fees shown · 4.8+ rating',
    bgColor: COLORS.cardGreen,
    borderColor: COLORS.cardGreenBorder,
    icon: <ShieldDocIcon />,
  },
  {
    id: 'repair-bid',
    title: 'Repair Bid',
    subtitle: 'Get bids in <2h',
    bgColor: COLORS.cardOrange,
    borderColor: COLORS.cardOrangeBorder,
    icon: <ToolIcon />,
  },
  {
    id: 'top-this-week',
    title: 'Top in Denver This Week',
    subtitle: 'Highest vouches',
    bgColor: COLORS.cardPurple,
    borderColor: COLORS.cardPurpleBorder,
    icon: <TrendingIcon />,
  },
];

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER (colored circle with initials)
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
      <Text
        style={{
          fontSize: size * 0.35,
          fontWeight: '600',
          color: '#FFFFFF',
        }}
      >
        {initials}
      </Text>
    </View>
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
    console.log('Navigate to Find Tab');
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

  const handleSendToClient = () => {
    const filled = Object.entries(squadMembers).map(
      ([slotId, pro]) => `${slotId}: ${pro.name}`
    );
    console.log('Send to Client:', filled);
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
          borderBottomColor: '#8DB0FF',
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
                color: '#FFFFFF',
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
                color: !isFilled ? '#FFFFFF' : COLORS.primary,
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
                color: isFilled ? '#FFFFFF' : COLORS.primary,
              }}
            >
              Filled
            </Text>
          </Pressable>
        </View>

        {/* ── YOUR CLOSING SQUAD SECTION ── */}
        <View
          style={{
            backgroundColor: COLORS.screenBg,
            paddingTop: 24,
            paddingBottom: 24,
            borderBottomWidth: 0.69,
            borderBottomColor: COLORS.border,
            gap: 24,
          }}
        >
          {/* Header Row */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              minHeight: 36,
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

          {/* Squad Slots — Horizontal Scroll */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
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
                      borderColor: member ? 'rgba(0, 61, 195, 0.15)' : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {member ? (
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: '600',
                          color: '#FFFFFF',
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
                      <PlusIcon size={24} color="#FFFFFF" />
                    )}
                  </View>
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
                    {member ? member.name : slot.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* CTA / Progress Text */}
          {!hasAnyFilled ? (
            <View style={{ gap: 4, paddingHorizontal: 16 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: COLORS.darkText,
                  lineHeight: 24,
                  textAlign: 'center',
                }}
              >
                Build your closing squad
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '400',
                  color: COLORS.bodyText,
                  lineHeight: 24,
                  textAlign: 'center',
                }}
              >
                Add your go-to pros. Send to clients in one tap.
              </Text>
            </View>
          ) : filledCount < totalSlots ? (
            <View style={{ paddingHorizontal: 16 }}>
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

        <QuickActionsRow />

        {/* ── ACTIVE REPAIRS SECTION ── */}
        <View
          style={{
            paddingTop: 24,
            paddingBottom: 24,
            backgroundColor: COLORS.background,
          }}
        >
          <View
            style={{
              paddingLeft: 0,
              paddingRight: 0,
              gap: 16,
            }}
          >
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
                  {`Active Repairs (${hasActiveRepair ? ACTIVE_REPAIR_JOBS.length : 0})`}
                </Text>
                <Pressable
                  onPress={() => navigation.navigate('PostJobWizard')}
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
                        backgroundColor: activeRepairPill === pill ? '#003DC3' : '#F3F4F6',
                        borderRadius: 9999,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '400',
                          color: activeRepairPill === pill ? '#FFFFFF' : '#364153',
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

            {hasActiveRepair && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingLeft: 16, paddingRight: 16, paddingBottom: 4 }}
              >
                {ACTIVE_REPAIR_JOBS.map((job) => (
                  <RepairCard
                    key={job.id}
                    job={job}
                    onPress={() => navigation.navigate('RepairJobDetails', { job })}
                    width={325}
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* ── VOUCH FEED SECTION ──
            Session 18 fix: Maps VouchFeedProfile → ProProfileData
            so ProProfile renders without crashing on missing fields.
            Production: ProProfile will fetch fresh data via profileId. */}
        <VouchFeedSection
          onNavigateToProfile={(vouchProfile: VouchFeedProfile) => {
            const profileData: ProProfileData = {
              id: vouchProfile.id,
              name: vouchProfile.name,
              company: vouchProfile.company,
              location: 'Denver, CO',
              rating: 0,
              vouches: vouchProfile.vouches_count,
              active_since: '',
              role: vouchProfile.role,
              trade: vouchProfile.trade || vouchProfile.role,
              licensed: '',
              distance: '',
              bio: '',
              avatarColor: vouchProfile.avatar_color,
              performance_stats: { completed_jobs: 0, on_time_rate: 0, avg_response: '' },
              tags: [],
              recent_vouches: [],
              is_connected: false,
              is_own_profile: false,
              portfolio_photos: [],
            };
            navigation.navigate('ProProfile', { profile: profileData } as any);
          }}
        />

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
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
                  backgroundColor: '#D1D5DC',
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
                    backgroundColor: pressed ? '#F9FAFB' : COLORS.background,
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
    </SafeAreaView>
  );
};

export default HomeTabAgent;
