// HomeTabAgentFilled.tsx
// ═══════════════════════════════════════════════════════════════
// Home Tab — Agent View (filled-state variant, 1388 lines)
// Dashboard with populated data — vouch feed, active repairs, squad
// Sections: Design Tokens, SVG Icons, Squad Slot Data,
//           Quick Actions, Vouch Feed Data, Tab Filters,
//           Avatar, Main Component
//
// Vouch feed: tab-filtered (Contractors first — MVP revenue driver)
//   All | Contractors | Photographers | Stagers | Partners
//
// @demo  Squad slots, quick actions, vouch feed = local constants
// @demo  Active repairs from RepairJobsData (MOCK_REPAIR_JOBS)
//        Feature flag gate: FEATURE_FLAGS.USE_MOCK_DATA
// @backend useAgentJobs (wired) — jobs.agent_id = auth.uid()
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import SearchField from './SearchField';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './HomeStack';
import { MOCK_REPAIR_JOBS } from './RepairJobsData';
import RepairCard from './RepairCard';
import { COLORS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useAgentJobs } from '../hooks/useData';
import { useVerificationGate } from '../hooks/useVerificationGate';


// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

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

const ThumbUpIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M4.67 7.33L6.67 2C7.02 2 7.36 2.14 7.61 2.39C7.86 2.64 8 2.98 8 3.33V5.67H11.16C11.33 5.67 11.49 5.7 11.64 5.77C11.79 5.84 11.92 5.94 12.02 6.07C12.12 6.2 12.19 6.35 12.22 6.51C12.25 6.68 12.24 6.85 12.19 7.01L10.93 11.01C10.86 11.24 10.72 11.43 10.53 11.57C10.34 11.71 10.11 11.78 9.88 11.78H4.67M4.67 7.33V11.78M4.67 7.33H3C2.63 7.33 2.33 7.63 2.33 8V11.11C2.33 11.48 2.63 11.78 3 11.78H4.67"
      stroke={COLORS.mutedText}
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
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
  isAddNew?: boolean;
}

const SQUAD_SLOTS: SquadSlot[] = [
  { id: 'mortgage', label: 'Mortgage Pro' },
  { id: 'title', label: 'Title Officer' },
  { id: 'inspector', label: 'Home\nInspector' },
  { id: 'tc', label: 'Transaction\nCoordinator' },
  { id: 'add', label: 'Add Another\nRole', isAddNew: true },
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
// @demo VOUCH FEED DATA — mock vouch cards
// ~75% Contractor vouches, ~25% Partner vouches
// Reflects MVP revenue driver: agent ↔ contractor activity
// @backend TODO: useVouchFeed() — vouches + profiles join
// ─────────────────────────────────────────────

interface VouchCard {
  id: string;
  agentName: string;
  proName: string;
  company?: string;
  timeAgo: string;
  quote: string;
  tag: string;
  likes: number;
  avatarColor: string;
}

const VOUCH_FEED: VouchCard[] = [
  {
    id: '1',
    agentName: 'Marcus W.',
    proName: 'Jake Thompson',
    company: '@ Summit Roofing',
    timeAgo: '1h ago',
    quote: '"Emergency roof repair before closing, done in 24 hours flat"',
    tag: 'Contractors',
    likes: 9,
    avatarColor: '#A8C4B8',
  },
  {
    id: '2',
    agentName: 'Amanda R.',
    proName: 'Precision Plumbing Co.',
    company: undefined,
    timeAgo: '2h ago',
    quote: '"Re-piped the whole house in 2 days, passed inspection first try"',
    tag: 'Contractors',
    likes: 7,
    avatarColor: '#D4B8A8',
  },
  {
    id: '3',
    agentName: 'Sarah J.',
    proName: 'Mike Rodriguez',
    company: '@ Rocket Mortgage',
    timeAgo: '3h ago',
    quote: '"Closed my cash offer in 12 days"',
    tag: 'Mortgage',
    likes: 5,
    avatarColor: '#E8D5B7',
  },
  {
    id: '4',
    agentName: 'Stephanie K.',
    proName: 'Denver Electric Pros',
    company: undefined,
    timeAgo: '3h ago',
    quote: '"Full panel upgrade, cleanest work the inspector had ever seen"',
    tag: 'Contractors',
    likes: 6,
    avatarColor: '#B8A8D4',
  },
  {
    id: '5',
    agentName: 'Chris P.',
    proName: "Amy's Repairs LLC",
    company: undefined,
    timeAgo: '4h ago',
    quote: '"Fixed foundation issues under budget and on time"',
    tag: 'Contractors',
    likes: 4,
    avatarColor: '#D4C5A8',
  },
  {
    id: '6',
    agentName: 'Robert K.',
    proName: 'Lisa Martinez',
    company: '@ First National Title',
    timeAgo: '5h ago',
    quote: '"Fastest turnaround on a complex estate sale"',
    tag: 'Title',
    likes: 8,
    avatarColor: '#D4A8B5',
  },
  {
    id: '7',
    agentName: 'Jason M.',
    proName: 'Carlos Mendez',
    company: '@ Mendez Electric LLC',
    timeAgo: '5h ago',
    quote: '"Rewired the entire kitchen, passed rough-in on the first call"',
    tag: 'Contractors',
    likes: 11,
    avatarColor: '#A8D4C5',
  },
  {
    id: '8',
    agentName: 'Nicole T.',
    proName: 'Alpine HVAC Solutions',
    company: undefined,
    timeAgo: '6h ago',
    quote: '"New furnace installed same week, warranty included"',
    tag: 'Contractors',
    likes: 5,
    avatarColor: '#A8B5D4',
  },
  {
    id: '9',
    agentName: 'Martin G.',
    proName: 'John Chen',
    company: '@ HomeGuard Inspections',
    timeAgo: '6h ago',
    quote: '"Found issues others missed, saved my client $15K"',
    tag: 'Inspectors',
    likes: 6,
    avatarColor: '#A8C5DA',
  },
  {
    id: '10',
    agentName: 'Laura D.',
    proName: 'Front Range Floors',
    company: undefined,
    timeAgo: '8h ago',
    quote: '"Refinished hardwoods in 3 days, buyer was blown away at walkthrough"',
    tag: 'Contractors',
    likes: 8,
    avatarColor: '#C4B882',
  },
  {
    id: '11',
    agentName: 'Kevin B.',
    proName: 'Fresh Coat Denver',
    company: undefined,
    timeAgo: '10h ago',
    quote: '"Painted entire interior in 2 days, not a single drip. Pro-level clean work"',
    tag: 'Contractors',
    likes: 5,
    avatarColor: '#D4A8A8',
  },
  {
    id: '12',
    agentName: 'Jennifer W.',
    proName: 'Tom Anderson',
    company: '@ VA Loan Pros',
    timeAgo: '12h ago',
    quote: '"17 day close on VA loan, zero drama"',
    tag: 'Mortgage',
    likes: 5,
    avatarColor: '#B5D4A8',
  },
  {
    id: '13',
    agentName: 'Tyler R.',
    proName: 'Walsh Landscaping',
    company: undefined,
    timeAgo: '1d ago',
    quote: '"Fixed grading and drainage before appraisal, saved the deal"',
    tag: 'Contractors',
    likes: 7,
    avatarColor: '#B5D4A8',
  },
  {
    id: '14',
    agentName: 'Brandon H.',
    proName: 'Superior Inspections',
    company: undefined,
    timeAgo: '1d ago',
    quote: '"Same-day report, incredibly thorough"',
    tag: 'Inspectors',
    likes: 5,
    avatarColor: '#C5A8D4',
  },
  {
    id: '15',
    agentName: 'Rachel F.',
    proName: 'Hernandez Drywall',
    company: undefined,
    timeAgo: '1d ago',
    quote: '"Matched 1960s texture perfectly, you can\'t even tell where the patch is"',
    tag: 'Contractors',
    likes: 10,
    avatarColor: '#A8C4D4',
  },
  {
    id: '16',
    agentName: 'David L.',
    proName: 'Denver Pest Solutions',
    company: undefined,
    timeAgo: '2d ago',
    quote: '"Termite treatment done same week, clearance letter in hand for closing"',
    tag: 'Contractors',
    likes: 6,
    avatarColor: '#D4C5B5',
  },
];

// Tab filter options — Contractors first (MVP revenue driver)
const FILTER_TABS = ['All', 'Contractors', 'Mortgage', 'Title', 'Inspectors'];

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

const HomeTabAgentFilled: React.FC = () => {
  const { data: liveJobs } = useAgentJobs();
  const activeJobs = FEATURE_FLAGS.USE_MOCK_DATA ? MOCK_REPAIR_JOBS : (liveJobs ?? []);

  const [activeTab, setActiveTab] = useState<string>('All');
  const [hasActiveRepair, setHasActiveRepair] = useState<boolean>(false);
  const [isFilled, setIsFilled] = useState<boolean>(false);
  const [searchText, setSearchText] = useState('');
  const [activeRepairPill, setActiveRepairPill] = useState<string | null>(null);
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { canPostJob } = useVerificationGate();

  // Filter vouch cards by active tab
  const filteredVouches =
    activeTab === 'All'
      ? VOUCH_FEED
      : VOUCH_FEED.filter((v) => v.tag === activeTab);

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
            {isFilled ? 'Denver ✦' : 'Denver'}
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

        {/* ── YOUR CLOSING SQUAD SECTION ──
            Parent has NO horizontal padding — children manage
            their own paddingHorizontal for consistent alignment
            while allowing the squad scroll to bleed to edges. */}
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
          {/* Header Row — fixed minHeight prevents layout shift
              when Send to Client CTA toggles on/off */}
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
            {isFilled && (
              <Pressable
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

          {/* Squad Slots — Horizontal Scroll (bleeds to edges) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}
          >
            {SQUAD_SLOTS.map((slot) => (
              <Pressable
                key={slot.id}
                style={{
                  alignItems: 'center',
                  width: 80,
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 9999,
                    backgroundColor:
                      isFilled && !slot.isAddNew
                        ? slot.id === 'mortgage'
                          ? '#E8D5B7'
                          : slot.id === 'title'
                            ? '#A8C5DA'
                            : slot.id === 'inspector'
                              ? '#D4A8B5'
                              : '#B5D4A8'
                        : slot.isAddNew
                          ? COLORS.primary
                          : COLORS.squadCircle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isFilled && !slot.isAddNew ? (
                    <Text
                      style={{
                        fontSize: 20,
                        fontWeight: '600',
                        color: '#FFFFFF',
                      }}
                    >
                      {slot.id === 'mortgage'
                        ? 'MR'
                        : slot.id === 'title'
                          ? 'PT'
                          : slot.id === 'inspector'
                            ? 'JC'
                            : 'KW'}
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
                >
                  {isFilled && !slot.isAddNew
                    ? slot.id === 'mortgage'
                      ? 'Mike\nRodriguez'
                      : slot.id === 'title'
                        ? 'Premier\nTitle'
                        : slot.id === 'inspector'
                          ? 'John\nChen'
                          : 'Karen\nWilson'
                    : slot.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* CTA Text — only show in empty state */}
          {!isFilled && (
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
          )}
        </View>
        
        
        {/* ── ACTIVE REPAIRS SECTION ── */}
        <View
          style={{
            paddingTop: 24,
            paddingBottom: 24,
            backgroundColor: COLORS.background,
            borderTopWidth: 0.71,
            borderTopColor: COLORS.border,
            borderBottomWidth: 0.71,
            borderBottomColor: COLORS.border,
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
                  {`Active Repairs (${hasActiveRepair ? activeJobs.length : 0})`}
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

              {/* Filter Pills — only show when active repair exists */}
              {hasActiveRepair && (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 8,
                  }}
                >
                  {['Urgent', 'New Bids'].map((pill) => (
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
                contentContainerStyle={{ gap: 16, paddingLeft: 16, paddingRight: 16, paddingBottom: 4 }}
              >
                {activeJobs.map((job) => (
                  <RepairCard
                    key={job.id}
                    job={job as any}
                    onPress={() => navigation.navigate('RepairJobDetails', { job: job as any })}
                    width={360}
                  />
                ))}
              </ScrollView>
            )}
            
          </View>
        </View>


        {/* ── QUICK ACTION CARDS — Horizontal Scroll ── */}
        <View
          style={{
            backgroundColor: COLORS.filterBg,
            paddingTop: 24,
            paddingBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: COLORS.darkText,
              lineHeight: 24,
              paddingBottom: 16,
              paddingHorizontal: 16,
            }}
          >
            Quick Actions
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 16, paddingLeft: 16, paddingRight: 16 }}
          >
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                style={({ pressed }) => ({
                  width: 260,
                  height: 100,
                  padding: 16,
                  backgroundColor: action.bgColor,
                  borderRadius: 14,
                  borderWidth: 0.69,
                  borderColor: action.borderColor,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: COLORS.background,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {action.icon}
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '400',
                      color: COLORS.darkText,
                      lineHeight: 24,
                    }}
                  >
                    {action.title}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '400',
                      color: COLORS.bodyText,
                      lineHeight: 20,
                    }}
                  >
                    {action.subtitle}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* ── VOUCH FEED SECTION ── */}
        <View
          style={{
            backgroundColor: COLORS.background,
            paddingTop: 32,
            paddingHorizontal: 16,
            gap: 24,
          }}
        >
          {/* Section Header */}
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: COLORS.darkText,
              lineHeight: 24,
            }}
          >
            What Agents Near You Are Vouching
          </Text>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{
              borderBottomWidth: 0.69,
              borderBottomColor: COLORS.border,
            }}
          >
            {FILTER_TABS.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderTopLeftRadius: 10,
                  borderTopRightRadius: 10,
                  backgroundColor:
                    activeTab === tab ? COLORS.tagBg : 'transparent',
                  borderBottomWidth: activeTab === tab ? 1.38 : 0,
                  borderBottomColor: COLORS.accentBlue,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '400',
                    color:
                      activeTab === tab
                        ? COLORS.accentBlue
                        : COLORS.bodyText,
                    lineHeight: 24,
                    textAlign: 'center',
                  }}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Vouch Cards Feed */}
          <View style={{ gap: 16 }}>
            {filteredVouches.map((vouch) => (
              <View
                key={vouch.id}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  borderWidth: 0.69,
                  borderColor: COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 16,
                }}
              >
                {/* Avatar */}
                <AvatarPlaceholder
                  name={vouch.agentName}
                  color={vouch.avatarColor}
                />

                {/* Card Content */}
                <View style={{ flex: 1, gap: 8 }}>
                  {/* Name row + time */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <View style={{ flex: 1, gap: 4, paddingRight: 8 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '400',
                          lineHeight: 24,
                        }}
                      >
                        <Text style={{ color: COLORS.bodyText }}>
                          {`${vouch.agentName} just vouched `}
                        </Text>
                        <Text style={{ color: COLORS.primary }}>
                          {vouch.proName}
                        </Text>
                      </Text>
                      {vouch.company && (
                        <Text
                          style={{
                            fontSize: 16,
                            fontWeight: '400',
                            color: COLORS.bodyText,
                            lineHeight: 24,
                          }}
                        >
                          {vouch.company}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '400',
                        color: COLORS.lightText,
                        lineHeight: 16,
                        marginTop: 4,
                      }}
                    >
                      {vouch.timeAgo}
                    </Text>
                  </View>

                  {/* Quote */}
                  <View
                    style={{
                      padding: 8,
                      backgroundColor: COLORS.quoteBg,
                      borderRadius: 10,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '400',
                        fontStyle: 'italic',
                        color: COLORS.statText,
                        lineHeight: 24,
                      }}
                    >
                      {vouch.quote}
                    </Text>
                  </View>

                  {/* Tag + Likes */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        backgroundColor: COLORS.tagBg,
                        borderRadius: 9999,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '400',
                          color: COLORS.accentBlue,
                          lineHeight: 16,
                        }}
                      >
                        {vouch.tag}
                      </Text>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <ThumbUpIcon />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '400',
                          color: COLORS.mutedText,
                          lineHeight: 16,
                        }}
                      >
                        {vouch.likes}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Load More Button */}
          <Pressable
            style={({ pressed }) => ({
              alignItems: 'center',
              paddingVertical: 16,
              paddingBottom: 32,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.primary,
                lineHeight: 24,
              }}
            >
              Load more activity
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default HomeTabAgentFilled;
