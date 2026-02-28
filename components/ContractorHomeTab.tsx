// ContractorHomeTab.tsx
// ═══════════════════════════════════════════════════════════════
// Home Tab — Contractor View
// Main dashboard for contractors after onboarding
// Sections: Top Bar, Active Jobs, New Invitations, Matching Jobs,
//           Earnings Summary, Market Pulse
//
// @demo  — Demo toggle (Empty/Filled) hidden behind scroll pull-down
// @demo  — Role toggle at top to switch Agent ↔ Contractor view
//          Production: remove toggle, use auth role from context
//
// @backend — All mock data annotated with Supabase queries
//            Replace MOCK_ arrays with TanStack Query hooks
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS } from '../lib/tokens';
import { CardButton } from './Button';
import { DisplayTag, DisplayTagRow, StatPill } from './DisplayTag';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type ContractorTrade = 'Plumber' | 'Electrician' | 'General Contractor' | 'Roofer' | 'Painter' | 'HVAC Technician' | 'Carpenter' | 'Landscaper';

interface ActiveJob {
  id: string;
  title: string;
  address: string;
  agentName: string;
  agentAvatar: string; // color placeholder
  jobStatus: 'in_progress' | 'pending_confirmation' | 'awarded';
  deadline: string;
  acceptedAmount: string;
  trade: string;
}

interface JobInvite {
  id: string;
  address: string;
  tradeNeeded: string;
  budgetRange: string;
  dueDate: string;
  agentName: string;
  agentAvatar: string;
  agentRating: number;
  invitedAgo: string;
  note?: string;
  /** Whether the contractor has already submitted a bid.
   *  When true: chat icon appears, CTA changes to "View Bid".
   *  @backend Derived: EXISTS(bid WHERE job_id AND contractor_id) */
  hasBid?: boolean;
}

interface MatchingJob {
  id: string;
  address: string;
  tradeNeeded: string;
  budgetRange: string;
  distanceMi: number;
  dueDate: string;
  bidCount: number;
  isUrgent: boolean;
  /** Whether the contractor has already submitted a bid.
   *  When true: chat icon appears, CTA changes to "View Bid".
   *  @backend Derived: EXISTS(bid WHERE job_id AND contractor_id) */
  hasBid?: boolean;
}

interface EarningsData {
  monthTotal: number;
  jobsCompleted: number;
  avgBid: number;
  pendingPayments: number;
  feeTier: 'launch_promo' | 'early_adopter' | 'standard';
  feeTierLabel: string;
  feePercent: number;
  acceptedBidCount: number;
}

interface MarketPulseData {
  avgBidForTrade: number;
  tradeName: string;
  demandTrend: 'up' | 'down' | 'flat';
  demandPercent: number;
  topTrades: string[];
  jobsPostedThisWeek: number;
}

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
    <Circle cx={8} cy={6} r={2} stroke={COLORS.bodyText} strokeWidth={1.33} />
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

const CalendarIcon: React.FC<{ size?: number; color?: string }> = ({ size = 14, color = COLORS.lightText }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path
      d="M4.67 1.17V3.5M9.33 1.17V3.5M1.75 5.83H12.25M2.33 2.33H11.67C11.99 2.33 12.25 2.59 12.25 2.92V11.67C12.25 11.99 11.99 12.25 11.67 12.25H2.33C2.01 12.25 1.75 11.99 1.75 11.67V2.92C1.75 2.59 2.01 2.33 2.33 2.33Z"
      stroke={color}
      strokeWidth={1.17}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StarIcon: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path
      d="M7 1.17L8.82 4.87L12.88 5.46L9.94 8.32L10.64 12.36L7 10.44L3.36 12.36L4.06 8.32L1.12 5.46L5.18 4.87L7 1.17Z"
      fill={COLORS.starColor}
      stroke={COLORS.starColor}
      strokeWidth={1.17}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BidIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M11.67 8.17C11.67 8.48 11.55 8.78 11.33 9L7.58 12.75C7.36 12.97 7.06 13.09 6.75 13.09C6.44 13.09 6.14 12.97 5.92 12.75L1.75 8.58V2.33H7.99L11.33 5.67C11.55 5.89 11.67 6.19 11.67 6.5V8.17Z"
      stroke={COLORS.primary}
      strokeWidth={1.17}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={4.67} cy={5.25} r={0.58} fill={COLORS.primary} />
  </Svg>
);

const CheckCircleIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
      stroke={COLORS.successGreen}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 4L12 14.01l-3-3"
      stroke={COLORS.successGreen}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const DollarIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 1V23"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const TrendUpIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M23 6L13.5 15.5L8.5 10.5L1 18" stroke={COLORS.successGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 6H23V12" stroke={COLORS.successGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrendDownIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M23 18L13.5 8.5L8.5 13.5L1 6" stroke={COLORS.errorRed} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 18H23V12" stroke={COLORS.errorRed} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrendFlatIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12H19" stroke={COLORS.counterAmber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M15 8L19 12L15 16" stroke={COLORS.counterAmber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MapPinSmallIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 16 16" fill="none">
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

const ChatBubbleSmallIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 20 20" fill="none">
    <Path
      d="M17.5 9.58C17.5 13.26 14.14 16.25 10 16.25C9.09 16.25 8.22 16.1 7.41 15.83L3.33 17.5L4.58 14.17C3.27 12.92 2.5 11.32 2.5 9.58C2.5 5.9 5.86 2.92 10 2.92C14.14 2.92 17.5 5.9 17.5 9.58Z"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LightningIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M7.58 1.17L2.33 8.17H7L6.42 12.83L11.67 5.83H7L7.58 1.17Z"
      stroke={COLORS.statText}
      strokeWidth={1.17}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Section header icons — 20px, brand-tinted background circle
const SectionIcon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View style={{
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.iconTintBg,
    alignItems: 'center',
    justifyContent: 'center',
  }}>
    {children}
  </View>
);

const RepairIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const InviteIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={8.5} cy={7} r={4} stroke={COLORS.primary} strokeWidth={2} />
    <Path d="M20 8V14" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
    <Path d="M23 11H17" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const BriefcaseIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 21V5C16 4.46957 15.7893 3.96086 15.4142 3.58579C15.0391 3.21071 14.5304 3 14 3H10C9.46957 3 8.96086 3.21071 8.58579 3.58579C8.21071 3.96086 8 4.46957 8 5V21" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{
  name: string;
  color: string;
  size?: number;
}> = ({ name, color, size = 40 }) => {
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
// STATUS CHIP (reused pattern from RepairCard)
// ─────────────────────────────────────────────

interface StatusChipConfig {
  label: string;
  bgColor: string;
  textColor: string;
}

const STATUS_CHIP_MAP: Record<string, StatusChipConfig> = {
  awarded: {
    label: 'Awarded',
    bgColor: 'rgba(0, 61, 195, 0.08)',
    textColor: '#003DC3',
  },
  in_progress: {
    label: 'In Progress',
    bgColor: 'rgba(22, 163, 74, 0.10)',
    textColor: '#15803D',
  },
  pending_confirmation: {
    label: 'Pending Review',
    bgColor: 'rgba(234, 88, 12, 0.10)',
    textColor: '#C2410C',
  },
};

const JobStatusChip: React.FC<{ status: string }> = ({ status }) => {
  const config = STATUS_CHIP_MAP[status];
  if (!config) return null;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        backgroundColor: config.bgColor,
        borderRadius: 9999,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: '500', color: config.textColor, lineHeight: 16 }}>
        {config.label}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// FEE TIER BADGE
// ─────────────────────────────────────────────

const FeeTierBadge: React.FC<{ tier: EarningsData['feeTier']; label: string; percent: number }> = ({ tier, label, percent }) => {
  const configs: Record<string, { bg: string; text: string; border: string }> = {
    launch_promo: { bg: COLORS.feeBg, text: COLORS.feeText, border: 'rgba(22, 163, 74, 0.20)' },
    early_adopter: { bg: COLORS.warningBg, text: COLORS.warningText, border: 'rgba(217, 119, 6, 0.20)' },
    standard: { bg: COLORS.tagBg, text: COLORS.primary, border: 'rgba(0, 61, 195, 0.15)' },
  };
  const c = configs[tier];
  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: c.bg,
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: c.border,
      gap: 4,
    }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.text, lineHeight: 16 }}>
        {percent}%
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '400', color: c.text, lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// MOCK DATA
// ═══════════════════════════════════════════════════════════════

/**
 * Current contractor profile (logged-in user).
 * @demo Replace with auth context user profile
 * @backend const { data: profile } = useProfile(auth.uid());
 */
const CURRENT_CONTRACTOR = {
  name: 'Brian Cooper',
  primaryTrade: 'Plumber' as ContractorTrade,
  secondaryTrades: ['General Contractor'] as ContractorTrade[],
  location: 'Denver, CO',
  avatarColor: '#7BA3C9',
};

/**
 * Active jobs — jobs where this contractor's bid was accepted and work is in progress.
 * @backend const { data: activeJobs } = useActiveJobs();
 *   → supabase.from('jobs')
 *     .select('*, bids(*), profiles!agent_id(name, avatar_url)')
 *     .in('status', ['awarded', 'in_progress', 'pending_confirmation'])
 *     .eq('bids.contractor_id', auth.uid())
 *     .eq('bids.status', 'accepted')
 *     .order('due_date', { ascending: true })
 */
const MOCK_ACTIVE_JOBS: ActiveJob[] = [
  {
    id: 'aj1',
    title: 'Fix Leaking Kitchen Faucet',
    address: '4521 Elm Street, Denver CO',
    agentName: 'Rachel Williams',
    agentAvatar: '#C4A882',
    jobStatus: 'in_progress',
    deadline: 'Mar 2',
    acceptedAmount: '$280',
    trade: 'Plumber',
  },
  {
    id: 'aj2',
    title: 'Bathroom Pipe Replacement',
    address: '782 Maple Drive, Lakewood CO',
    agentName: 'Marcus Lee',
    agentAvatar: '#B5C4A8',
    jobStatus: 'pending_confirmation',
    deadline: 'Mar 5',
    acceptedAmount: '$1,450',
    trade: 'Plumber',
  },
  {
    id: 'aj3',
    title: 'Install Water Heater',
    address: '1150 Pine Court, Aurora CO',
    agentName: 'Emma Thompson',
    agentAvatar: '#A8C5DA',
    jobStatus: 'awarded',
    deadline: 'Mar 8',
    acceptedAmount: '$2,200',
    trade: 'Plumber',
  },
];

/**
 * New invitations — jobs where an agent specifically invited this contractor to bid.
 * @backend const { data: invitations } = useJobInvitations();
 *   → supabase.from('job_invitations')
 *     .select('*, jobs(*, profiles!agent_id(name, avatar_url, rating))')
 *     .eq('contractor_id', auth.uid())
 *     .eq('status', 'pending')
 *     .order('created_at', { ascending: false })
 */
const MOCK_INVITATIONS: JobInvite[] = [
  {
    id: 'inv1',
    address: '331 Oak Boulevard, Denver CO',
    tradeNeeded: 'Plumber',
    budgetRange: '$200 – $600',
    dueDate: 'Mar 10',
    agentName: 'Rachel Williams',
    agentAvatar: '#C4A882',
    agentRating: 4.9,
    invitedAgo: '2h ago',
    note: 'Hot water heater leaking — need fast response.',
    hasBid: true,
  },
  {
    id: 'inv2',
    address: '1847 Elm Street, Denver CO',
    tradeNeeded: 'Plumber',
    budgetRange: '$150 – $400',
    dueDate: 'Mar 7',
    agentName: 'Tom Anderson',
    agentAvatar: '#C5D4A8',
    agentRating: 4.9,
    invitedAgo: '5h ago',
  },
  {
    id: 'inv3',
    address: '205 Birch Lane, Centennial CO',
    tradeNeeded: 'General Contractor',
    budgetRange: '$500 – $1,200',
    dueDate: 'Mar 12',
    agentName: 'Sarah Chen',
    agentAvatar: '#A8B5D4',
    agentRating: 4.9,
    invitedAgo: '1d ago',
  },
  {
    id: 'inv4',
    address: '900 Aspen Way, Littleton CO',
    tradeNeeded: 'Plumber',
    budgetRange: '$300 – $800',
    dueDate: 'Mar 15',
    agentName: 'Lisa Martinez',
    agentAvatar: '#B8A8D4',
    agentRating: 4.8,
    invitedAgo: '2d ago',
  },
];

/**
 * Matching jobs — jobs in the contractor's trade/area that they weren't invited to.
 * Filtered by primary_trade + secondary_trades + service_area radius.
 * @backend const { data: matchingJobs } = useMatchingJobs();
 *   → supabase.rpc('get_matching_jobs', {
 *       contractor_id: auth.uid(),
 *       trades: [primary_trade, ...secondary_trades],
 *       lat: contractor.lat,
 *       lng: contractor.lng,
 *       radius_mi: contractor.service_radius
 *     })
 *     .order('due_date', { ascending: true })
 */
const MOCK_MATCHING_JOBS: MatchingJob[] = [
  {
    id: 'mj1',
    address: '742 Pine Avenue, Denver CO',
    tradeNeeded: 'Plumber',
    budgetRange: '$100 – $250',
    distanceMi: 2.3,
    dueDate: 'Mar 3',
    bidCount: 2,
    isUrgent: true,
    hasBid: true,
  },
  {
    id: 'mj2',
    address: '1560 Willow Creek, Aurora CO',
    tradeNeeded: 'Plumber',
    budgetRange: '$400 – $900',
    distanceMi: 5.1,
    dueDate: 'Mar 9',
    bidCount: 1,
    isUrgent: false,
  },
  {
    id: 'mj3',
    address: '88 Spruce Drive, Lakewood CO',
    tradeNeeded: 'General Contractor',
    budgetRange: '$800 – $2,000',
    distanceMi: 7.4,
    dueDate: 'Mar 14',
    bidCount: 0,
    isUrgent: false,
  },
  {
    id: 'mj4',
    address: '3200 Cherry Lane, Centennial CO',
    tradeNeeded: 'Plumber',
    budgetRange: '$200 – $500',
    distanceMi: 3.8,
    dueDate: 'Mar 6',
    bidCount: 3,
    isUrgent: true,
  },
  {
    id: 'mj5',
    address: '415 Magnolia Blvd, Denver CO',
    tradeNeeded: 'General Contractor',
    budgetRange: '$1,500 – $3,000',
    distanceMi: 1.9,
    dueDate: 'Mar 20',
    bidCount: 0,
    isUrgent: false,
  },
];

/**
 * Earnings summary for current month.
 * @backend const { data: earnings } = useContractorEarnings();
 *   → supabase.rpc('get_contractor_earnings', {
 *       contractor_id: auth.uid(),
 *       period: 'current_month'
 *     })
 *   Fee tier determined by: account_age_months + total_accepted_bids
 *   Schedule: first 3 accepted bids = 0% (launch_promo),
 *             Months 4–9 = 5% (early_adopter),
 *             Month 10+ = 10% (standard)
 *   Volume tiers Year 2+: Pro 8% (4-10 jobs/mo), Elite 7% (11+)
 */
const MOCK_EARNINGS: EarningsData = {
  monthTotal: 4530,
  jobsCompleted: 4,
  avgBid: 1132,
  pendingPayments: 2200,
  feeTier: 'early_adopter',
  feeTierLabel: 'Early Adopter',
  feePercent: 5,
  acceptedBidCount: 12,
};

/**
 * Market pulse data — aggregated from jobs table, refreshed daily.
 * @backend const { data: pulse } = useMarketPulse();
 *   → supabase.rpc('get_market_pulse', {
 *       trade: contractor.primary_trade,
 *       market: 'denver'
 *     })
 *   Computed via Supabase edge function, cached in market_pulse table
 */
const MOCK_MARKET_PULSE: MarketPulseData = {
  avgBidForTrade: 1850,
  tradeName: 'Plumbing',
  demandTrend: 'up',
  demandPercent: 12,
  topTrades: ['Plumbing', 'HVAC', 'Roofing'],
  jobsPostedThisWeek: 47,
};

// ═══════════════════════════════════════════════════════════════
// CARD COMPONENTS
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// ACTIVE JOB CARD
// Vertical full-width card for in-progress work
// ─────────────────────────────────────────────

const ActiveJobCard: React.FC<{ job: ActiveJob; onMarkComplete: () => void; onChat: () => void }> = ({ job, onMarkComplete, onChat }) => (
  <View
    style={{
      backgroundColor: COLORS.background,
      borderRadius: DIMENSIONS.cardRadius,
      borderWidth: 1, borderColor: COLORS.border,
      shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    }}
  >
    {/* Row 1: Trade pill + Status chip — scan layer */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0 }}>
      <DisplayTag label={job.trade} />
      <JobStatusChip status={job.jobStatus} />
    </View>

    {/* Row 2: Blue header — Job title + Amount — decision layer */}
    <View
      style={{
        backgroundColor: COLORS.statBg,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        margin: 8,
        borderRadius: 10,
      }}
    >

      <Text
        style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 22, flex: 1 }}
        numberOfLines={2}
      >
        {job.title}
      </Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary, lineHeight: 22 }}>
        {job.acceptedAmount}
      </Text>
    </View>

    {/* Detail layer */}
    <View style={{ paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
      {/* Row 3: Agent */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AvatarPlaceholder name={job.agentName} color={job.agentAvatar} size={28} />
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
          {job.agentName}
        </Text>
      </View>

      {/* Row 4: Address + Due date */}
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MapPinSmallIcon />
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20, flex: 1 }} numberOfLines={1}>
            {job.address}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <CalendarIcon color={COLORS.bodyText} />
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
            Due {job.deadline}
          </Text>
        </View>
      </View>

      {/* Row 5: CTA + Chat button */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {/* Chat icon button — always visible on active jobs */}
        <Pressable
          onPress={onChat}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 8,
            borderWidth: 0.68,
            borderColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <ChatBubbleSmallIcon />
        </Pressable>

        {/* Primary CTA — fills remaining width */}
        <View style={{ flex: 1 }}>
          {job.jobStatus === 'in_progress' && (
            <CardButton
              label="Mark Complete"
              onPress={onMarkComplete}
              variant="filled"
              fullWidth
            />
          )}
          {job.jobStatus === 'pending_confirmation' && (
            <View style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              backgroundColor: 'rgba(234, 88, 12, 0.06)',
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.counterAmber, lineHeight: 20, flex: 1 }}>
                Waiting for agent to confirm
              </Text>
            </View>
          )}
          {job.jobStatus === 'awarded' && (
            <CardButton
              label="Start Work"
              onPress={() => console.log('Start work:', job.id)}
              variant="outlined"
              fullWidth
            />
          )}
        </View>
      </View>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// JOB INVITE CARD
// Vertical full-width card for agent invitations
// ─────────────────────────────────────────────

const JobInviteCard: React.FC<{
  invite: JobInvite;
  onAccept: () => void;
  onDecline: () => void;
  onChat?: () => void;
  hasBid?: boolean;
}> = ({ invite, onAccept, onDecline, onChat, hasBid = false }) => (
  <View
    style={{
      backgroundColor: COLORS.background,
      borderRadius: DIMENSIONS.cardRadius,
      borderWidth: 1, borderColor: COLORS.border,
      shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    }}
  >
    {/* Row 1: Trade pill + Time — scan layer */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0 }}>
      <DisplayTag label={invite.tradeNeeded} />
      <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
        {invite.invitedAgo}
      </Text>
    </View>

    {/* Row 2: Blue header — Address + Budget — decision layer */}
    <View
      style={{
        backgroundColor: COLORS.statBg,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        margin: 8,
        borderRadius: 10,
      }}
    >
      <Text
        style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 22, flex: 1 }}
        numberOfLines={2}
      >
        {invite.address}
      </Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary, lineHeight: 22 }}>
        {invite.budgetRange}
      </Text>
    </View>

    {/* Detail layer */}
    <View style={{ paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
      {/* Row 3: Agent + Rating */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AvatarPlaceholder name={invite.agentName} color={invite.agentAvatar} size={28} />
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
          {invite.agentName}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <StarIcon size={14} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
            {invite.agentRating}
          </Text>
        </View>
      </View>

      {/* Row 4: Due date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <CalendarIcon color={COLORS.bodyText} />
        <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
          Due {invite.dueDate}
        </Text>
      </View>

      {/* Row 5 (optional): Agent note */}
      {invite.note && (
        <View style={{
          padding: 10,
          backgroundColor: COLORS.quoteBg,
          borderRadius: 8,
          borderLeftWidth: 3,
          borderLeftColor: COLORS.primary,
        }}>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20, fontStyle: 'italic' }}>
            "{invite.note}"
          </Text>
        </View>
      )}

      {/* Row 6: CTAs */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {/* Chat icon — only visible after bid has been submitted */}
        {hasBid && onChat && (
          <Pressable
            onPress={onChat}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 8,
              borderWidth: 0.68,
              borderColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <ChatBubbleSmallIcon />
          </Pressable>
        )}
        <Pressable
          onPress={onDecline}
          style={({ pressed }) => ({
            flex: 1,
            height: 36,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.secondaryText, lineHeight: 20 }}>
            Decline
          </Text>
        </Pressable>
        <CardButton
          label={hasBid ? "View Bid" : "Accept & Bid"}
          onPress={onAccept}
          variant="filled"
          flex
        />
      </View>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// MATCHING JOB CARD
// Vertical full-width card for browse jobs
// ─────────────────────────────────────────────

const MatchingJobCard: React.FC<{
  job: MatchingJob;
  onViewBid: () => void;
  onChat?: () => void;
  hasBid?: boolean;
}> = ({ job, onViewBid, onChat, hasBid = false }) => (
  <View
    style={{
      backgroundColor: COLORS.background,
      borderRadius: DIMENSIONS.cardRadius,
      borderWidth: 1, borderColor: COLORS.border,
      shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
    }}
  >
    {/* Row 1: Trade pill + Urgent badge — scan layer */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 0 }}>
      <DisplayTag label={job.tradeNeeded} />
      {job.isUrgent ? (
        <View style={{
          paddingHorizontal: 8,
          paddingVertical: 3,
          backgroundColor: 'rgba(220, 38, 38, 0.08)',
          borderRadius: 9999,
        }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#DC2626', lineHeight: 16 }}>
            URGENT
          </Text>
        </View>
      ) : (
        <View />
      )}
    </View>

    {/* Row 2: Blue header — Address + Budget — decision layer */}
    <View
      style={{
        backgroundColor: COLORS.statBg,
        paddingHorizontal: 14,
        paddingVertical: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 12,
        margin: 8,
        borderRadius: 10,
      }}
    >
      <Text
        style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 22, flex: 1 }}
        numberOfLines={2}
      >
        {job.address}
      </Text>
      <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary, lineHeight: 22 }}>
        {job.budgetRange}
      </Text>
    </View>

    {/* Detail layer */}
    <View style={{ paddingTop: 8, paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
      {/* Row 3: Due date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <CalendarIcon color={COLORS.bodyText} />
        <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
          Due {job.dueDate}
        </Text>
      </View>

      {/* Row 4: Distance + Bid count */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <MapPinSmallIcon />
          <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 18 }}>
            {job.distanceMi} mi away
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <BidIcon />
          <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.primary, lineHeight: 18 }}>
            {job.bidCount} {job.bidCount === 1 ? 'bid' : 'bids'}
          </Text>
        </View>
      </View>

      {/* Row 5: CTA + optional Chat */}
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        {hasBid && onChat && (
          <Pressable
            onPress={onChat}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 8,
              borderWidth: 0.68,
              borderColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <ChatBubbleSmallIcon />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <CardButton
            label={hasBid ? "View Bid" : "View & Bid"}
            onPress={onViewBid}
            variant="outlined"
            fullWidth
          />
        </View>
      </View>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// EARNINGS SUMMARY CARD
// ─────────────────────────────────────────────

const EarningsSummaryCard: React.FC<{ earnings: EarningsData }> = ({ earnings }) => (
  <View
    style={{
      padding: 16,
      backgroundColor: COLORS.background,
      borderRadius: DIMENSIONS.cardRadius,
      borderWidth: 1, borderColor: COLORS.border,
      shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
      gap: 16,
    }}
  >
    {/* Header + Fee tier badge */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.darkText }}>
        This Month
      </Text>
      <FeeTierBadge tier={earnings.feeTier} label={earnings.feeTierLabel} percent={earnings.feePercent} />
    </View>

    {/* Big earnings number */}
    <Text style={{ fontSize: 32, fontWeight: '700', color: COLORS.primary, lineHeight: 40 }}>
      ${earnings.monthTotal.toLocaleString()}
    </Text>

    {/* Stats grid (2x2) */}
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{
        flex: 1,
        padding: 12,
        backgroundColor: COLORS.statBg,
        borderRadius: 10,
        gap: 4,
      }}>
        <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
          Jobs Completed
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
          {earnings.jobsCompleted}
        </Text>
      </View>
      <View style={{
        flex: 1,
        padding: 12,
        backgroundColor: COLORS.statBg,
        borderRadius: 10,
        gap: 4,
      }}>
        <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
          Avg Bid
        </Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
          ${earnings.avgBid.toLocaleString()}
        </Text>
      </View>
    </View>

    {/* Pending payments */}
    {earnings.pendingPayments > 0 && (
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: COLORS.warningBg,
        borderRadius: 10,
      }}>
        <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.warningText, lineHeight: 20 }}>
          Pending Payments
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.warningText, lineHeight: 22 }}>
          ${earnings.pendingPayments.toLocaleString()}
        </Text>
      </View>
    )}
  </View>
);

// ─────────────────────────────────────────────
// MARKET PULSE SECTION
// ─────────────────────────────────────────────

const MarketPulseSection: React.FC<{ data: MarketPulseData }> = ({ data }) => {
  const TrendIcon = data.demandTrend === 'up' ? TrendUpIcon : data.demandTrend === 'down' ? TrendDownIcon : TrendFlatIcon;
  const trendColor = data.demandTrend === 'up' ? COLORS.successGreen : data.demandTrend === 'down' ? COLORS.errorRed : COLORS.counterAmber;
  const trendLabel = data.demandTrend === 'up' ? `↑ ${data.demandPercent}%` : data.demandTrend === 'down' ? `↓ ${data.demandPercent}%` : '→ Flat';

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: COLORS.background,
        borderRadius: DIMENSIONS.cardRadius,
        borderWidth: 1, borderColor: COLORS.border,
        shadowColor: "#000000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
        gap: 16,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.iconTintBg, alignItems: 'center', justifyContent: 'center' }}>
          <LightningIcon />
        </View>
        <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.darkText }}>
          Market Pulse
        </Text>
      </View>

      {/* Avg bid for trade */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ gap: 2 }}>
          <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
            Avg {data.tradeName} bid in Denver
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.darkText, lineHeight: 28 }}>
            ${data.avgBidForTrade.toLocaleString()}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: data.demandTrend === 'up' ? COLORS.feeBg : data.demandTrend === 'down' ? 'rgba(220, 38, 38, 0.06)' : COLORS.warningBg, borderRadius: 9999 }}>
          <TrendIcon />
          <Text style={{ fontSize: 14, fontWeight: '600', color: trendColor, lineHeight: 20 }}>
            {trendLabel}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: COLORS.border }} />

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
            Jobs This Week
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
            {data.jobsPostedThisWeek}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
            Top Trades
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
            {data.topTrades.join(', ')}
          </Text>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// EMPTY STATE COMPONENT
// ─────────────────────────────────────────────

const EmptyState: React.FC<{ title: string; message: string }> = ({ title, message }) => (
  <View
    style={{
      padding: 24,
      backgroundColor: COLORS.background,
      borderRadius: DIMENSIONS.cardRadius,
      borderWidth: 1, borderColor: COLORS.border,
      alignItems: 'center',
      gap: 8,
    }}
  >
    <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.bodyText, lineHeight: 22 }}>
      {title}
    </Text>
    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, textAlign: 'center', lineHeight: 20, paddingHorizontal: 16 }}>
      {message}
    </Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════


const ContractorHomeTab: React.FC = () => {
  const [isFilled, setIsFilled] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // ── Data (conditional on demo toggle) ──
  const activeJobs = isFilled ? MOCK_ACTIVE_JOBS : [];
  const invitations = isFilled ? MOCK_INVITATIONS : [];
  const matchingJobs = isFilled ? MOCK_MATCHING_JOBS : [];
  const earnings = isFilled ? MOCK_EARNINGS : null;
  const marketPulse = isFilled ? MOCK_MARKET_PULSE : null;

  // ── Unified feed: tag each item with its type for rendering ──
  type FeedItem =
    | { type: 'active'; data: ActiveJob }
    | { type: 'invite'; data: JobInvite }
    | { type: 'matching'; data: MatchingJob };

  // Sort priority: Invitations → Urgent matching → In-progress → Pending confirmation → Awarded → Non-urgent matching
  // @backend Replace with single sorted query: supabase.rpc('get_contractor_feed', { contractor_id, sort: 'priority' })
  const allFeedItems: FeedItem[] = [
    ...invitations.map((inv) => ({ type: 'invite' as const, data: inv })),
    ...matchingJobs.filter((j) => j.isUrgent).map((j) => ({ type: 'matching' as const, data: j })),
    ...activeJobs.filter((j) => j.jobStatus === 'in_progress').map((j) => ({ type: 'active' as const, data: j })),
    ...activeJobs.filter((j) => j.jobStatus === 'pending_confirmation').map((j) => ({ type: 'active' as const, data: j })),
    ...activeJobs.filter((j) => j.jobStatus === 'awarded').map((j) => ({ type: 'active' as const, data: j })),
    ...matchingJobs.filter((j) => !j.isUrgent).map((j) => ({ type: 'matching' as const, data: j })),
  ];

  // ── Filter feed based on active pill ──
  const filteredFeed = activeFilter === 'All'
    ? allFeedItems
    : allFeedItems.filter((item) => {
        if (activeFilter === 'Active') return item.type === 'active';
        if (activeFilter === 'Invitations') return item.type === 'invite';
        if (activeFilter === 'Matching') return item.type === 'matching';
        return true;
      });

  // ── Filter pill config ──
  const FILTER_PILLS = [
    { key: 'All', label: 'All', count: allFeedItems.length },
    { key: 'Active', label: 'Active', count: activeJobs.length },
    { key: 'Invitations', label: 'Invitations', count: invitations.length },
    { key: 'Matching', label: 'Matching', count: matchingJobs.length },
  ];

  // ── Empty state messages per filter ──
  const getEmptyState = () => {
    switch (activeFilter) {
      case 'Active':
        return { title: 'No active jobs', message: 'Check your invitations or browse matching jobs to get started.' };
      case 'Invitations':
        return { title: 'No new invitations', message: 'Your profile is visible to agents — invites will appear here.' };
      case 'Matching':
        return { title: 'No matching jobs', message: "We'll notify you when new jobs are posted in your trade." };
      default:
        return { title: 'No jobs yet', message: 'Jobs, invitations, and matching opportunities will appear here.' };
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          STICKY HEADER
          ══════════════════════════════════════════ */}
      <View style={{ backgroundColor: COLORS.background }}>
        {/* Top Bar — Location, Title, Notifications */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          {/* Location — fixed width bookend */}
          <View style={{ width: 80 }}>
            <Pressable
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                opacity: pressed ? 0.5 : 1,
                alignSelf: 'flex-start',
              })}
            >
              <LocationPinIcon />
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                {isFilled ? 'Denver ✦' : 'Denver'}
              </Text>
            </Pressable>
          </View>

          {/* Title — true center */}
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary }}>
            Atlasio
          </Text>

          {/* Notification Bell — fixed width bookend */}
          <View style={{ width: 80, alignItems: 'flex-end' }}>
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
            {isFilled && (
              <View
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  width: 20,
                  height: 20,
                  borderRadius: 9999,
                  backgroundColor: COLORS.notifBadge,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: COLORS.background,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '400', color: '#FFFFFF', lineHeight: 16 }}>
                  3
                </Text>
              </View>
            )}
          </Pressable>
          </View>
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 12 }}
        >
          {FILTER_PILLS.map((pill) => {
            const isActive = activeFilter === pill.key;
            return (
              <Pressable
                key={pill.key}
                onPress={() => setActiveFilter(pill.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 9999,
                  backgroundColor: isActive ? COLORS.primary : COLORS.background,
                  borderWidth: isActive ? 0 : 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: isActive ? '600' : '400',
                    color: isActive ? '#FFFFFF' : COLORS.bodyText,
                    lineHeight: 20,
                  }}
                >
                  {pill.label}
                </Text>
                <View
                  style={{
                    minWidth: 20,
                    height: 20,
                    borderRadius: 9999,
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : COLORS.screenBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 6,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: isActive ? '#FFFFFF' : COLORS.bodyText,
                      lineHeight: 16,
                    }}
                  >
                    {pill.count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Header border */}
        <View style={{ height: 0.69, backgroundColor: COLORS.border }} />
      </View>

      {/* ══════════════════════════════════════════
          SCROLLABLE CONTENT
          ══════════════════════════════════════════ */}
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
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
            gap: 0,
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

        {/* ═══════════════════════════════════════
            UNIFIED JOB FEED
            ═══════════════════════════════════════ */}
        <View style={{ paddingTop: 20, paddingBottom: 24, paddingHorizontal: 16, gap: 12 }}>
          {filteredFeed.length > 0 ? (
            filteredFeed.map((item) => {
              if (item.type === 'active') {
                return (
                  <ActiveJobCard
                    key={`active-${item.data.id}`}
                    job={item.data}
                    onMarkComplete={() => {
                      // @nav → JobCompletionScreen (already built)
                      navigation.navigate('JobCompletion', { jobId: item.data.id });
                    }}
                    onChat={() => {
                      // @nav → RepairChatScreen tied to this job
                      navigation.navigate('RepairChat', {
                        jobId: item.data.id,
                        agentName: item.data.agentName,
                        address: item.data.address,
                      });
                    }}
                  />
                );
              }
              if (item.type === 'invite') {
                return (
                  <JobInviteCard
                    key={`invite-${item.data.id}`}
                    invite={item.data}
                    hasBid={item.data.hasBid}
                    onAccept={() => {
                      // @nav → BidSubmissionScreen
                      navigation.navigate('BidSubmission', { jobId: item.data.id });
                    }}
                    onDecline={() => {
                      // @backend supabase.from('job_invitations').update({ status: 'declined' }).eq('id', item.data.id)
                      console.log('Decline:', item.data.id);
                    }}
                    onChat={item.data.hasBid ? () => {
                      navigation.navigate('RepairChat', {
                        jobId: item.data.id,
                        agentName: item.data.agentName,
                        address: item.data.address,
                      });
                    } : undefined}
                  />
                );
              }
              if (item.type === 'matching') {
                return (
                  <MatchingJobCard
                    key={`matching-${item.data.id}`}
                    job={item.data}
                    hasBid={item.data.hasBid}
                    onViewBid={() => {
                      // @nav → ContractorJobDetails → BidSubmissionScreen
                      navigation.navigate('ContractorJobDetails', { jobId: item.data.id });
                    }}
                    onChat={item.data.hasBid ? () => {
                      navigation.navigate('RepairChat', {
                        jobId: item.data.id,
                        address: item.data.address,
                      });
                    } : undefined}
                  />
                );
              }
              return null;
            })
          ) : (
            <EmptyState
              title={getEmptyState().title}
              message={getEmptyState().message}
            />
          )}
        </View>

        {/* ═══════════════════════════════════════
            SECTION — EARNINGS SUMMARY
            ═══════════════════════════════════════ */}
        <View style={{ paddingTop: 24, paddingBottom: 24, paddingHorizontal: 16, backgroundColor: COLORS.background, gap: 16 }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28 }}>
              Earnings
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '400', color: '#666666', lineHeight: 20 }}>
              Your financial scorecard
            </Text>
          </View>

          {earnings ? (
            <EarningsSummaryCard earnings={earnings} />
          ) : (
            <EmptyState
              title="No earnings yet"
              message="Complete your first job to start tracking earnings here."
            />
          )}
        </View>

        {/* ═══════════════════════════════════════
            SECTION — MARKET PULSE
            ═══════════════════════════════════════ */}
        <View style={{ paddingTop: 24, paddingBottom: 40, paddingHorizontal: 16, backgroundColor: COLORS.screenBg, gap: 16 }}>
          <View style={{ gap: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28 }}>
              Denver Market
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '400', color: '#666666', lineHeight: 20 }}>
              Local demand intelligence for your trade
            </Text>
          </View>

          {marketPulse ? (
            <MarketPulseSection data={marketPulse} />
          ) : (
            <EmptyState
              title="Market data loading"
              message="We're gathering data for your trade in Denver. Check back soon."
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ContractorHomeTab;
