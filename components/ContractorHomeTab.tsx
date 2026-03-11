// ContractorHomeTab.tsx
// ═══════════════════════════════════════════════════════════════
// Home Tab — Contractor View
// Triage dashboard: horizontal scroll sections + vertical active work
//
// Layout: Greeting → Job Invites (horiz) → New Jobs (horiz) →
//         Active Work (vert) → Earnings → Market Pulse
//
// Card components (3):
//   JobInviteCard   — horizontal scroll, reuse from S34 (tappable, no CTA footer)
//   NewJobCard      — horizontal scroll, marketplace browse cards
//   ActiveWorkCard  — vertical stack, progress bar + agent info
//
// Pull-to-refresh: RefreshControl on outer ScrollView
//
// Empty / Filled toggle:
//   Hidden behind scroll pull-down (showDevToggle state).
//   Switches between MOCK_* arrays and empty arrays.
//   @demo Remove toggle + empty state in production.
//
// @demo  All MOCK_* data arrays
// @demo  Role toggle at top to switch Agent ↔ Contractor view
//        Production: remove toggle, use auth role from context
//
// @backend TODO: Replace MOCK_ arrays with TanStack Query hooks
//   → useContractorActiveJobs()    — jobs.status IN (awarded, in_progress, pending_completion)
//   → useContractorInvitations()   — job_invitations.contractor_id = auth.uid()
//   → useContractorMatchingJobs()  — jobs filtered by contractor trade + service area
//   → useContractorEarnings()      — aggregate from completed bids
//   → useMarketPulse()             — aggregate job stats by trade
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, TYPOGRAPHY, SPACING, DIMENSIONS, SHADOWS } from '../lib/tokens';
import { DisplayTag } from './DisplayTag';

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
  agentRating: number;
  agentCompany: string;
  jobStatus: 'in_progress' | 'pending_completion' | 'awarded';
  deadline: string;
  acceptedAmount: string;
  trade: string;
}

interface JobInvite {
  id: string;
  title: string;
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
  title: string;
  address: string;
  tradeNeeded: string;
  budgetRange: string;
  distanceMi: number;
  dueDate: string;
  bidCount: number;
  isUrgent: boolean;
  postedTime: string;
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

const CalendarIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = COLORS.secondaryText }) => (
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
    textColor: COLORS.primary,
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
// @demo MOCK DATA — all arrays below are demo-only
// @backend Replace each MOCK_ with TanStack Query hook (see header)
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
 *     .in('status', ['awarded', 'in_progress', 'pending_completion'])
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
    agentRating: 4.9,
    agentCompany: 'Keller Williams',
    jobStatus: 'in_progress',
    deadline: 'Mar 12',
    acceptedAmount: '$280',
    trade: 'Plumber',
  },
  {
    id: 'aj2',
    title: 'Bathroom Pipe Replacement',
    address: '782 Maple Drive, Lakewood CO',
    agentName: 'Marcus Lee',
    agentAvatar: '#B5C4A8',
    agentRating: 4.7,
    agentCompany: 'RE/MAX Alliance',
    jobStatus: 'pending_completion',
    deadline: 'Mar 15',
    acceptedAmount: '$1,450',
    trade: 'Plumber',
  },
  {
    id: 'aj3',
    title: 'Install Water Heater',
    address: '1150 Pine Court, Aurora CO',
    agentName: 'Emma Thompson',
    agentAvatar: '#A8C5DA',
    agentRating: 4.8,
    agentCompany: 'Compass',
    jobStatus: 'awarded',
    deadline: 'Mar 18',
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
    title: 'Water Heater Replacement',
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
    title: 'Toilet Repair & Overflow Fix',
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
    title: 'Kitchen Remodel Plumbing',
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
    title: 'Sump Pump Installation',
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
    title: 'Toilet Repair & Overflow Fix',
    address: '742 Pine Avenue, Denver CO',
    tradeNeeded: 'Plumber',
    budgetRange: '$100 – $250',
    distanceMi: 2.3,
    dueDate: 'Mar 13',
    bidCount: 2,
    isUrgent: true,
    postedTime: '2h ago',
    hasBid: true,
  },
  {
    id: 'mj2',
    title: 'Water Heater Maintenance',
    address: '1560 Willow Creek, Aurora CO',
    tradeNeeded: 'Plumber',
    budgetRange: '$400 – $900',
    distanceMi: 5.1,
    dueDate: 'Mar 19',
    bidCount: 1,
    isUrgent: false,
    postedTime: '5h ago',
  },
  {
    id: 'mj3',
    title: 'Kitchen Cabinet Remodel',
    address: '88 Spruce Drive, Lakewood CO',
    tradeNeeded: 'General Contractor',
    budgetRange: '$800 – $2,000',
    distanceMi: 7.4,
    dueDate: 'Mar 24',
    bidCount: 0,
    isUrgent: false,
    postedTime: '1d ago',
  },
  {
    id: 'mj4',
    title: 'Garbage Disposal Replacement',
    address: '3200 Cherry Lane, Centennial CO',
    tradeNeeded: 'Plumber',
    budgetRange: '$200 – $500',
    distanceMi: 3.8,
    dueDate: 'Mar 16',
    bidCount: 3,
    isUrgent: true,
    postedTime: '3h ago',
  },
  {
    id: 'mj5',
    title: 'Deck & Patio Expansion',
    address: '415 Magnolia Blvd, Denver CO',
    tradeNeeded: 'General Contractor',
    budgetRange: '$1,500 – $3,000',
    distanceMi: 1.9,
    dueDate: 'Mar 28',
    bidCount: 0,
    isUrgent: false,
    postedTime: '2d ago',
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
// ACTIVE WORK CARD (S35)
// Vertical full-width card with progress bar + agent info
// ─────────────────────────────────────────────

const ActiveWorkCard: React.FC<{ job: ActiveJob; onPress: () => void }> = ({ job, onPress }) => {
  // @demo Calculate progress from job status
  // @backend In production: derive from job.progress field or milestone count
  const progress = job.jobStatus === 'in_progress' ? 0.6 : job.jobStatus === 'pending_completion' ? 0.9 : 0.3;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: COLORS.background,
        borderRadius: DIMENSIONS.cardRadius,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
        gap: 12,
        opacity: pressed ? 0.95 : 1,
        ...SHADOWS.card,
      })}
    >
      {/* Job title */}
      <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }} numberOfLines={2}>
        {job.title}
      </Text>

      {/* Location + due date */}
      <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
        {job.address} · Due {job.deadline}
      </Text>

      {/* Progress bar */}
      <View style={{ gap: 4 }}>
        <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 9999, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${progress * 100}%`, backgroundColor: COLORS.primary, borderRadius: 9999 }} />
        </View>
        <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.primary, lineHeight: 16 }}>
          {Math.round(progress * 100)}% complete
        </Text>
      </View>

      {/* Agent info */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AvatarPlaceholder name={job.agentName} color={job.agentAvatar} size={32} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
              {job.agentName}
            </Text>
            <StarIcon size={12} />
            <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
              {job.agentRating.toFixed(1)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>
            {job.agentCompany}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};

// ─────────────────────────────────────────────
// JOB INVITE CARD
// Vertical full-width card for agent invitations
// ─────────────────────────────────────────────

const JobInviteCard: React.FC<{
  invite: JobInvite;
  onPress: () => void;
}> = ({ invite, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      width: 320,
      backgroundColor: COLORS.background,
      borderRadius: DIMENSIONS.cardRadius,
      borderWidth: 1, borderColor: COLORS.border,
      padding: 16,
      ...SHADOWS.card,
      opacity: pressed ? 0.95 : 1,
    })}
  >
    {/* Row 1: Trade badge + Timestamp — context group with title (4px) */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <DisplayTag label={invite.tradeNeeded} />
      <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText }}>
        {invite.invitedAgo}
      </Text>
    </View>

    {/* Row 2: Job title — GROUPED with address (4px) */}
    <Text
      style={{ ...TYPOGRAPHY.headingM, color: COLORS.darkText, marginBottom: 4 }}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {invite.title}
    </Text>

    {/* Row 3: Address */}
    <Text
      style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, marginBottom: 12 }}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {invite.address}
    </Text>

    {/* Row 4: Budget label — GROUPED with price (4px) */}
    <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, marginBottom: 4 }}>
      Budget
    </Text>

    {/* Row 5: Price range */}
    <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.primary, marginBottom: 12 }}>
      {invite.budgetRange}
    </Text>

    {/* Row 6: Due date */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <CalendarIcon size={16} color={COLORS.secondaryText} />
      <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, marginLeft: 6 }}>
        Due {invite.dueDate}
      </Text>
    </View>

    {/* Row 7: Agent info */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: invite.note ? 12 : 0 }}>
      <AvatarPlaceholder name={invite.agentName} color={invite.agentAvatar} size={24} />
      <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.darkText, marginLeft: 8 }} numberOfLines={1}>
        {invite.agentName}
      </Text>
      <StarIcon size={12} />
      <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.darkText, marginLeft: 4 }}>
        {invite.agentRating}
      </Text>
    </View>

    {/* Row 8 (optional): Agent comment — last element, no marginBottom */}
    {/* @backend TODO: Show invite.note in ContractorJobDetails screen */}
    {/* (deferred to future session - see S35 decision log) */}
    {invite.note ? (
      <View style={{
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: COLORS.quoteBg,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.primary,
      }}>
        <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, fontStyle: 'italic' }} numberOfLines={1} ellipsizeMode="tail">
          "{invite.note}"
        </Text>
      </View>
    ) : null}
  </Pressable>
);

// ─────────────────────────────────────────────
// NEW JOB CARD (S35)
// Horizontal scroll card for marketplace browse
// ─────────────────────────────────────────────

const NewJobCard: React.FC<{ job: MatchingJob; onPress: () => void }> = ({ job, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      width: 320,
      backgroundColor: COLORS.background,
      borderRadius: DIMENSIONS.cardRadius,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 16,
      opacity: pressed ? 0.95 : 1,
      ...SHADOWS.card,
    })}
  >
    {/* Row 1: Trade badge + Timestamp — context group with title (4px) */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
      <DisplayTag label={job.tradeNeeded} />
      <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText }}>
        {job.postedTime}
      </Text>
    </View>

    {/* Row 2: Job title — GROUPED with address (4px) */}
    <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.darkText, marginBottom: 4 }} numberOfLines={1} ellipsizeMode="tail">
      {job.title}
    </Text>

    {/* Row 3: Address */}
    <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, marginBottom: 12 }} numberOfLines={1} ellipsizeMode="tail">
      {job.address}
    </Text>

    {/* Row 4: Budget label — GROUPED with price (4px) */}
    <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, marginBottom: 4 }}>
      Budget
    </Text>

    {/* Row 5: Price range */}
    <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.primary, marginBottom: 12 }}>
      {job.budgetRange}
    </Text>

    {/* Row 6: Due date — last element, no marginBottom */}
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <CalendarIcon size={16} color={COLORS.secondaryText} />
      <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, marginLeft: 6 }}>
        Due {job.dueDate}
      </Text>
    </View>
  </Pressable>
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
      ...SHADOWS.card,
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
        ...SHADOWS.card,
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
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<NativeStackNavigationProp<any>>();

  // ── Data (conditional on demo toggle) ──
  const activeJobs = isFilled ? MOCK_ACTIVE_JOBS : [];
  const invitations = isFilled ? MOCK_INVITATIONS : [];
  const matchingJobs = isFilled ? MOCK_MATCHING_JOBS : [];
  const earnings = isFilled ? MOCK_EARNINGS : null;
  const marketPulse = isFilled ? MOCK_MARKET_PULSE : null;

  // ── Time-based greeting ──
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // ── Pull-to-refresh ──
  // @backend In production: invalidate TanStack Query cache
  //          queryClient.invalidateQueries(['contractor-jobs']);
  const handleRefresh = async () => {
    setRefreshing(true);
    // @demo Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          SCROLLABLE CONTENT — pull-to-refresh enabled
          ══════════════════════════════════════════ */}
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: 56 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
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

        {/* ══════════════════════════════════════════
            GREETING HEADER
            ══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.darkText, lineHeight: 32 }}>
            {greeting}, {CURRENT_CONTRACTOR.name.split(' ')[0]} 👋
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20, marginTop: 4 }}>
            {invitations.length} {invitations.length === 1 ? 'invite' : 'invites'} · {matchingJobs.length} new jobs · {activeJobs.length} active
          </Text>
        </View>

        {/* ══════════════════════════════════════════
            SECTION 1 — JOB INVITES (horizontal scroll)
            ══════════════════════════════════════════ */}
        <View style={{ paddingBottom: 24 }}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 26 }}>
              Job Invites ({invitations.length})
            </Text>
            <Pressable onPress={() => navigation.navigate('Jobs')} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>
                See All
              </Text>
            </Pressable>
          </View>

          {invitations.length > 0 ? (
            <FlatList
              horizontal
              data={invitations}
              renderItem={({ item }) => (
                <JobInviteCard
                  invite={item}
                  onPress={() => {
                    // @nav → ContractorJobDetails (invited job)
                    navigation.navigate('ContractorJobDetails', { jobId: item.id });
                  }}
                />
              )}
              keyExtractor={(item) => `invite-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              nestedScrollEnabled={true}
              removeClippedSubviews={true}
            />
          ) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20, textAlign: 'center' }}>
                No invites yet. Agents will reach out directly when they need your expertise. Check out New Jobs to find work!
              </Text>
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════
            SECTION 2 — NEW JOBS FOR YOU (horizontal scroll)
            ══════════════════════════════════════════ */}
        <View style={{ paddingBottom: 24 }}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 26 }}>
              New Jobs for You ({matchingJobs.length})
            </Text>
            <Pressable onPress={() => navigation.navigate('Jobs')} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>
                See All
              </Text>
            </Pressable>
          </View>

          {matchingJobs.length > 0 ? (
            <FlatList
              horizontal
              data={matchingJobs.slice(0, 50)}
              renderItem={({ item }) => (
                <NewJobCard
                  job={item}
                  onPress={() => {
                    // @nav → ContractorJobDetails (marketplace browse)
                    navigation.navigate('ContractorJobDetails', { jobId: item.id });
                  }}
                />
              )}
              keyExtractor={(item) => `new-${item.id}`}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              nestedScrollEnabled={true}
              removeClippedSubviews={true}
            />
          ) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20, textAlign: 'center' }}>
                No new jobs matching your trade right now. Check back soon or browse all jobs in the Jobs tab!
              </Text>
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════
            SECTION 3 — ACTIVE WORK (vertical stack)
            ══════════════════════════════════════════ */}
        <View style={{ paddingBottom: 24 }}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 26 }}>
              Active Work ({activeJobs.length})
            </Text>
            <Pressable onPress={() => navigation.navigate('Jobs')} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>
                See All
              </Text>
            </Pressable>
          </View>

          {activeJobs.length > 0 ? (
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {activeJobs.map((job) => (
                <ActiveWorkCard
                  key={job.id}
                  job={job}
                  onPress={() => {
                    // @nav → ContractorJobDetails (active work)
                    navigation.navigate('ContractorJobDetails', { jobId: job.id });
                  }}
                />
              ))}
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20, textAlign: 'center' }}>
                No active jobs yet. Submit bids on open jobs to get started!
              </Text>
            </View>
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
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20 }}>
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
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20 }}>
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
