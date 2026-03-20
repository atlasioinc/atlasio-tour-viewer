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

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  FlatList,
  RefreshControl,
  StatusBar,
  Modal,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SHADOWS } from '../lib/tokens';
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
      <Text style={{ fontSize: 12, fontWeight: '600', color: c.text, lineHeight: 16, textTransform: 'uppercase' }}>
        {percent}%
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '400', color: c.text, lineHeight: 16, textTransform: 'uppercase' }}>
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
      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
        {job.address} · Due {job.deadline}
      </Text>

      {/* Progress bar */}
      <View style={{ gap: 4 }}>
        <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 9999, overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${progress * 100}%`, backgroundColor: COLORS.primary, borderRadius: 9999 }} />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 16 }}>
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
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
              {job.agentRating.toFixed(1)}
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16, textTransform: 'uppercase' }}>
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
      {/* @design: intentional 12pt exception — ambient/confirmatory context */}
      <DisplayTag label={invite.tradeNeeded} fontSize={12} />
      {/* @design: intentional 12pt exception — ambient/confirmatory context */}
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
      style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, marginBottom: 10 }}
      numberOfLines={1}
      ellipsizeMode="tail"
    >
      {invite.address}
    </Text>

    {/* Row 4: Budget label — GROUPED with price (4px) */}
    <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textTransform: 'uppercase', marginBottom: 2 }}>
      Budget
    </Text>

    {/* Row 5: Price range */}
    <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.primary, marginBottom: 8 }}>
      {invite.budgetRange}
    </Text>

    {/* Row 6: Due date */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
      <CalendarIcon size={16} color={COLORS.secondaryText} />
      <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, marginLeft: 6 }}>
        Due {invite.dueDate}
      </Text>
    </View>

    {/* Row 7: Agent info */}
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: invite.note ? 8 : 0 }}>
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
          {'"'}{invite.note}{'"'}
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
      {/* @design: intentional 12pt exception — ambient/confirmatory context */}
      <DisplayTag label={job.tradeNeeded} fontSize={12} />
      {/* @design: intentional 12pt exception — ambient/confirmatory context */}
      <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText }}>
        {job.postedTime}
      </Text>
    </View>

    {/* Row 2: Job title — GROUPED with address (4px) */}
    <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.darkText, marginBottom: 4 }} numberOfLines={1} ellipsizeMode="tail">
      {job.title}
    </Text>

    {/* Row 3: Address */}
    <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, marginBottom: 10 }} numberOfLines={1} ellipsizeMode="tail">
      {job.address}
    </Text>

    {/* Row 4: Budget label — GROUPED with price (4px) */}
    <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textTransform: 'uppercase', marginBottom: 2 }}>
      Budget
    </Text>

    {/* Row 5: Price range */}
    <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.primary, marginBottom: 8 }}>
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

const EarningsSummaryCard: React.FC<{ earnings: EarningsData; onViewInsights?: () => void }> = ({ earnings, onViewInsights }) => (
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

    {/* Big earnings number + trend chip */}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 32, fontWeight: '700', color: COLORS.primary, lineHeight: 40 }}>
        ${earnings.monthTotal.toLocaleString()}
      </Text>
      {/* Earnings trend chip + context label — matches Market Pulse pattern */}
      {/* @demo: hardcoded ↑ 18% — production calculates (currentMonthEarnings - lastMonthEarnings) / lastMonthEarnings * 100 */}
      {/* @backend: rpc_get_contractor_earnings should return current_month and prior_month values for trend calculation */}
      <View style={{ alignItems: 'center', gap: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: COLORS.feeBg, borderRadius: 9999 }}>
          <TrendUpIcon />
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.successGreen, lineHeight: 20 }}>
            ↑ 18%
          </Text>
        </View>
        {/* @design: intentional 12pt — ambient context label under chip, not decision-critical text */}
        <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText }}>
          vs. last month
        </Text>
      </View>
    </View>

    {/* Stats grid (2x2) */}
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <View style={{
        flex: 1,
        padding: 12,
        backgroundColor: COLORS.statBg,
        borderRadius: 10,
        gap: 4,
      }}>
        <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
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
        <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
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

    {/* View Insights CTA — opens earnings insight bottom sheet */}
    {/* @demo: always visible. Production: only show when sufficient data available */}
    {onViewInsights && (
      <Pressable
        onPress={onViewInsights}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          alignSelf: 'flex-start',
          marginTop: 0,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Text style={{
          fontSize: 14,
          fontWeight: '500',
          color: COLORS.primary,
          lineHeight: 20,
        }}>
          View Insights
        </Text>
        {/* @design: replace › with ChevronRightIcon SVG when available */}
        <Text style={{ fontSize: 20, fontWeight: '500', color: COLORS.primary, lineHeight: 24 }}>›</Text>
      </Pressable>
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
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
            Avg {data.tradeName} bid in Denver
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.darkText, lineHeight: 28 }}>
            ${data.avgBidForTrade.toLocaleString()}
          </Text>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: data.demandTrend === 'up' ? COLORS.feeBg : data.demandTrend === 'down' ? 'rgba(220, 38, 38, 0.06)' : COLORS.warningBg, borderRadius: 9999 }}>
            <TrendIcon />
            <Text style={{ fontSize: 14, fontWeight: '600', color: trendColor, lineHeight: 20 }}>
              {trendLabel}
            </Text>
          </View>
          {/* @design: intentional 12pt — ambient context label under chip, not decision-critical text */}
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText }}>
            vs. last month
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: COLORS.border }} />

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
            Jobs This Week
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
            {data.jobsPostedThisWeek}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
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

// =============================================================================
// EMPTY STATE CALLOUT
// Shown in each section when no data exists (first launch, new contractor).
// Branded light-blue container with section-specific icon, headline, subtext.
// @demo: renders whenever section data array is empty
// =============================================================================

// Empty state icons — inline SVG, COLORS.primary stroke, 24x24
const InviteEmptyIcon = (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 8l9 6 9-6M3 8v10a1 1 0 001 1h16a1 1 0 001-1V8M3 8a1 1 0 011-1h16a1 1 0 011 1"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const JobsEmptyIcon = (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9a2 2 0 012-2h14a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M3 13h18"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

const ActiveWorkEmptyIcon = (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M3 10h18" stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M8 3v4" stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M16 3v4" stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const EarningsEmptyIcon = (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M12 7v10" stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" />
    <Path
      d="M14.5 9.5a2.5 2.5 0 00-5 0c0 1.5 1 2 2.5 2.5s2.5 1 2.5 2.5a2.5 2.5 0 01-5 0"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const MarketDataEmptyIcon = (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M4 18v-4" stroke={COLORS.primary} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M12 18V8" stroke={COLORS.primary} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M20 18V4" stroke={COLORS.primary} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M2 18h20" stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

interface EmptyStateCalloutProps {
  icon: React.ReactNode;
  headline: string;
  subtext: string;
}

const EmptyStateCallout: React.FC<EmptyStateCalloutProps> = ({
  icon,
  headline,
  subtext,
}) => (
  <View style={{
    backgroundColor: COLORS.background,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center' as const,
  }}>
    {icon}
    <Text style={{
      fontSize: 14,
      fontWeight: '600',
      color: COLORS.darkText,
      textAlign: 'center',
      marginTop: 10,
      marginBottom: 4,
    }}>
      {headline}
    </Text>
    <Text style={{
      fontSize: 13,
      fontWeight: '400',
      color: COLORS.secondaryText,
      textAlign: 'center',
      lineHeight: 18,
    }}>
      {subtext}
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
  const insets = useSafeAreaInsets();

  // Earnings insights bottom sheet visibility
  const [showInsightsSheet, setShowInsightsSheet] = useState(false);
  const [insightsSheetMounted, setInsightsSheetMounted] = useState(false);
  const insightsBackdropAnim = useRef(new Animated.Value(0)).current;
  const insightsSlideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current;

  useEffect(() => {
    if (showInsightsSheet) {
      setInsightsSheetMounted(true);
      Animated.parallel([
        Animated.timing(insightsBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(insightsSlideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (insightsSheetMounted) {
      Animated.parallel([
        Animated.timing(insightsBackdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(insightsSlideAnim, {
          toValue: Dimensions.get('window').height,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setInsightsSheetMounted(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- animated refs are stable
  }, [showInsightsSheet]);

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
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 12 }}
              nestedScrollEnabled={true}
              removeClippedSubviews={true}
            />
          ) : (
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <View style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: DIMENSIONS.cardRadius,
                overflow: 'hidden',
              }}>
                <EmptyStateCallout
                  icon={InviteEmptyIcon}
                  headline="No invites yet"
                  subtext="Agents will invite you directly when your trade matches their job."
                />
              </View>
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
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 12 }}
              nestedScrollEnabled={true}
              removeClippedSubviews={true}
            />
          ) : (
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <View style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: DIMENSIONS.cardRadius,
                overflow: 'hidden',
              }}>
                <EmptyStateCallout
                  icon={JobsEmptyIcon}
                  headline="No jobs in your area yet"
                  subtext="New repair jobs matching your trade will show up here as agents post them."
                />
              </View>
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
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <View style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: DIMENSIONS.cardRadius,
                overflow: 'hidden',
              }}>
                <EmptyStateCallout
                  icon={ActiveWorkEmptyIcon}
                  headline="No active work yet"
                  subtext="Once you win a bid, your in-progress jobs will appear here."
                />
              </View>
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
            <EarningsSummaryCard earnings={earnings} onViewInsights={() => setShowInsightsSheet(true)} />
          ) : (
            <View style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: DIMENSIONS.cardRadius,
              overflow: 'hidden',
            }}>
              <EmptyStateCallout
                icon={EarningsEmptyIcon}
                headline="No earnings yet"
                subtext="Completed job payments will show up here once you start winning bids."
              />
            </View>
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
            <View style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: DIMENSIONS.cardRadius,
              overflow: 'hidden',
            }}>
              <EmptyStateCallout
                icon={MarketDataEmptyIcon}
                headline="No market data yet"
                subtext="Local pricing trends for your trade will appear here as activity picks up."
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─────────────────────────────────────────
          EARNINGS INSIGHTS BOTTOM SHEET
          @demo: all insight values hardcoded
          @backend: derive from:
            - rpc_get_contractor_earnings (avg bid, monthly totals)
            - rpc_get_market_data (market avg bid, platform win rate)
            - Calculated: contractor win rate from bid history
      ───────────────────────────────────────── */}
      <Modal
        visible={insightsSheetMounted}
        transparent
        animationType="none"
        onRequestClose={() => setShowInsightsSheet(false)}
      >
        {/* Backdrop */}
        <Animated.View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.5)',
          opacity: insightsBackdropAnim,
        }}>
          <Pressable
            style={{ flex: 1 }}
            onPress={() => setShowInsightsSheet(false)}
          />
        </Animated.View>

        {/* Sheet */}
        <Animated.View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: COLORS.background,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 16,
          transform: [{ translateY: insightsSlideAnim }],
        }}>
          {/* Handle bar */}
          <View style={{
            width: 36,
            height: 4,
            backgroundColor: COLORS.border,
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 20,
          }} />

          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.darkText }}>
              Earnings Insights
            </Text>
            <Pressable
              onPress={() => setShowInsightsSheet(false)}
              style={({ pressed }) => ({
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 20, color: COLORS.secondaryText, lineHeight: 24 }}>×</Text>
            </Pressable>
          </View>

          {/* Row 1 — Pricing Insight */}
          {/* @demo: hardcoded. @backend: (marketAvgBid - contractorAvgBid) / marketAvgBid * 100 */}
          <View style={{
            backgroundColor: COLORS.backgroundInfo,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            gap: 4,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 15 }}>{'\uD83D\uDCA1'}</Text>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: COLORS.primary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                // @design: intentional 13pt uppercase eyebrow label exception
              }}>
                Pricing Insight
              </Text>
            </View>
            <Text style={{
              fontSize: 15,
              fontWeight: '400',
              color: COLORS.darkText,
              lineHeight: 22,
            }}>
              Your avg bid ($1,132) is 39% below the Denver market average ($1,850).
            </Text>
          </View>

          {/* Row 2 — Win Rate */}
          {/* @demo: hardcoded. @backend: bidsWon / totalBids from bid history */}
          <View style={{
            backgroundColor: 'rgba(22, 163, 74, 0.08)',
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            gap: 4,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 15 }}>{'\uD83D\uDCC8'}</Text>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: COLORS.primary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                // @design: intentional 13pt uppercase eyebrow label exception
              }}>
                Win Rate
              </Text>
            </View>
            <Text style={{
              fontSize: 15,
              fontWeight: '400',
              color: COLORS.darkText,
              lineHeight: 22,
            }}>
              You{"'"}re winning 60% of bids — above the platform average of 44%.
            </Text>
          </View>

          {/* Row 3 — Opportunity (synthesis row) */}
          {/* @demo: hardcoded synthesis. @backend: AI-calculated recommendation using win rate + market delta */}
          <View style={{
            backgroundColor: COLORS.warningBg,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            gap: 4,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <Text style={{ fontSize: 15 }}>{'\uD83C\uDFAF'}</Text>
              <Text style={{
                fontSize: 13,
                fontWeight: '600',
                color: COLORS.primary,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                // @design: intentional 13pt uppercase eyebrow label exception
              }}>
                Opportunity
              </Text>
            </View>
            <Text style={{
              fontSize: 15,
              fontWeight: '400',
              color: COLORS.darkText,
              lineHeight: 22,
            }}>
              Raising your avg bid by 15–20% would still keep you competitive and could add ~$800/month in earnings.
            </Text>
          </View>

        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

export default ContractorHomeTab;
