// ContractorJobDetails.tsx
// ═══════════════════════════════════════════════════════════════
// Contractor Job Details — Single job view from contractor's perspective
// Sections: Header, Trade+Urgency, Title, Budget, Scope, Details Grid,
//           Agent Card, Your Bid (conditional), Counter-Offer (conditional),
//           Sticky Bottom CTA
//
// Navigated from: ContractorHomeTab cards (ActiveJobCard, JobInviteCard, MatchingJobCard)
// Route param: { jobId: string }
//
// @demo Cycles through 3 states via pull-down toggle:
//   1. Open job, no bid yet → CTA = "Submit Bid"
//   2. Bid submitted, pending → shows "Your Bid" section
//   3. Counter-offer received → shows comparison card + Accept/Counter/Decline
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS, DIMENSIONS, SHADOWS } from '../lib/tokens';
import { DisplayTag } from './DisplayTag';
import type { ContractorJobDetail } from '../types';
import { useRespondToCounter } from '../hooks/useData';

// ─────────────────────────────────────────────
// ROUTE PARAMS
// ─────────────────────────────────────────────

type ContractorJobDetailsParams = {
  ContractorJobDetails: { jobId: string };
};

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackArrowIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MoreDotsIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={5} r={1.5} fill={COLORS.bodyText} />
    <Circle cx={12} cy={12} r={1.5} fill={COLORS.bodyText} />
    <Circle cx={12} cy={19} r={1.5} fill={COLORS.bodyText} />
  </Svg>
);

const MapPinIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
    <Path d="M8 1.33C5.42 1.33 3.33 3.42 3.33 6C3.33 9.5 8 14.67 8 14.67C8 14.67 12.67 9.5 12.67 6C12.67 3.42 10.58 1.33 8 1.33Z" stroke={COLORS.lightText} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={8} cy={6} r={2} stroke={COLORS.lightText} strokeWidth={1.33} />
  </Svg>
);

const CalendarIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M4.67 1.17V3.5M9.33 1.17V3.5M1.75 5.83H12.25M2.33 2.33H11.67C11.99 2.33 12.25 2.59 12.25 2.92V11.67C12.25 11.99 11.99 12.25 11.67 12.25H2.33C2.01 12.25 1.75 11.99 1.75 11.67V2.92C1.75 2.59 2.01 2.33 2.33 2.33Z" stroke={COLORS.lightText} strokeWidth={1.17} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StarIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 14 14" fill="none">
    <Path d="M7 1.17L8.82 4.87L12.88 5.46L9.94 8.32L10.64 12.36L7 10.44L3.36 12.36L4.06 8.32L1.12 5.46L5.18 4.87L7 1.17Z" fill={COLORS.starColor} stroke={COLORS.starColor} strokeWidth={1.17} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRightIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18L15 12L9 6" stroke={COLORS.lightText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ArrowRightIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={COLORS.counterAmber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BidIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M11.67 8.17C11.67 8.48 11.55 8.78 11.33 9L7.58 12.75C7.36 12.97 7.06 13.09 6.75 13.09C6.44 13.09 6.14 12.97 5.92 12.75L1.75 8.58V2.33H7.99L11.33 5.67C11.55 5.89 11.67 6.19 11.67 6.5V8.17Z" stroke={COLORS.bodyText} strokeWidth={1.17} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={4.67} cy={5.25} r={0.58} fill={COLORS.bodyText} />
  </Svg>
);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const centsToDisplay = (cents: number): string => {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

const AvatarPlaceholder: React.FC<{ name: string; color: string; size?: number }> = ({ name, color, size = 40 }) => {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// BID STATUS CHIP
// ─────────────────────────────────────────────

const BID_STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: 'rgba(0, 61, 195, 0.08)', text: COLORS.primary },
  countered: { label: 'Countered', bg: 'rgba(217, 119, 6, 0.10)', text: COLORS.counterAmber },
  accepted: { label: 'Accepted', bg: 'rgba(22, 163, 74, 0.10)', text: COLORS.successGreen },
  rejected: { label: 'Rejected', bg: 'rgba(231, 0, 11, 0.10)', text: COLORS.rejectRed },
  edited: { label: 'Edited', bg: 'rgba(0, 61, 195, 0.08)', text: COLORS.primary },
};

const BidStatusChip: React.FC<{ status: string }> = ({ status }) => {
  const config = BID_STATUS_CONFIG[status] ?? BID_STATUS_CONFIG.pending;
  return (
    <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: config.bg, borderRadius: 9999 }}>
      <Text style={{ fontSize: 12, fontWeight: '600', color: config.text, lineHeight: 16 }}>{config.label}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// @demo MOCK DATA — 3 states
// ─────────────────────────────────────────────

/**
 * @backend const { data: jobDetails } = useContractorJobDetails(jobId);
 *   → supabase.from('jobs')
 *     .select('*, profiles!agent_id(name, company, avatar_url, avatar_color, rating, vouch_count)')
 *     .eq('id', jobId)
 *     .single()
 *   + supabase.from('bids').select('*').eq('job_id', jobId).eq('contractor_id', auth.uid()).maybeSingle()
 */

// @demo State 1: Open job, no bid yet
const MOCK_JOB_NO_BID: ContractorJobDetail = {
  id: 'mj1',
  title: 'Fix Leaking Kitchen Faucet & Under-Sink Pipes',
  description: 'Kitchen faucet has been dripping for 2 weeks. The P-trap under the sink also has a slow leak. Need a licensed plumber to assess and fix both issues. Access is straightforward — first floor kitchen, standard cabinetry. Homeowner will be present.',
  address: '742 Pine Avenue, Denver CO 80203',
  trade: 'Plumber',
  budgetMin: 20000, // $200
  budgetMax: 60000, // $600
  dueDate: 'Mar 10',
  isUrgent: true,
  photos: [],
  bidCount: 3,
  jobStatus: 'open',
  agent: {
    id: 'agent-1',
    name: 'Rachel Williams',
    company: 'Keller Williams Denver',
    avatarColor: '#C4A882',
    rating: 4.9,
    vouchCount: 24,
  },
};

// @demo State 2: Bid submitted, pending
const MOCK_JOB_BID_PENDING: ContractorJobDetail = {
  ...MOCK_JOB_NO_BID,
  id: 'mj2',
  bidCount: 4,
  myBid: {
    id: 'bid-1',
    amount: 45000, // $450
    timelineDays: 3,
    notes: 'Can start tomorrow. Will bring replacement parts for both faucet and P-trap. Standard repair, should take 2-3 hours on site.',
    status: 'pending',
  },
};

// @demo State 3: Counter-offer received
const MOCK_JOB_COUNTERED: ContractorJobDetail = {
  ...MOCK_JOB_NO_BID,
  id: 'mj3',
  bidCount: 4,
  myBid: {
    id: 'bid-2',
    amount: 45000, // $450
    timelineDays: 3,
    notes: 'Can start tomorrow. Will bring replacement parts for both faucet and P-trap.',
    status: 'countered',
    counterAmount: 38000, // $380
    counterNotes: 'Great proposal! Could you work within $380? Another plumber quoted similar but we prefer your profile.',
  },
};

// @demo Toggle states
const DEMO_STATES: ContractorJobDetail[] = [MOCK_JOB_NO_BID, MOCK_JOB_BID_PENDING, MOCK_JOB_COUNTERED];
const DEMO_LABELS = ['No Bid', 'Bid Pending', 'Countered'];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ContractorJobDetails: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<ContractorJobDetailsParams, 'ContractorJobDetails'>>();

  // @demo State toggle (cycles through 3 mock states)
  const [demoStateIndex, setDemoStateIndex] = useState(0);
  const job = DEMO_STATES[demoStateIndex];
  const respondToCounter = useRespondToCounter();

  const hasBid = !!job.myBid;
  const isCountered = job.myBid?.status === 'countered';
  const isAccepted = job.myBid?.status === 'accepted';
  const isInProgress = job.jobStatus === 'in_progress';
  const isPendingCompletion = job.jobStatus === 'pending_completion';

  // ── Counter-offer handlers ──

  const handleAcceptCounter = () => {
    if (!job.myBid) return;
    Alert.alert(
      'Accept Counter-Offer?',
      `Accept ${centsToDisplay(job.myBid.counterAmount!)} for this job?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: () => respondToCounter.mutate({ bidId: job.myBid!.id, action: 'accept' }),
        },
      ],
    );
  };

  const handleDeclineCounter = () => {
    if (!job.myBid) return;
    Alert.alert(
      'Decline Counter-Offer?',
      'Your bid will be withdrawn from this job.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => respondToCounter.mutate({ bidId: job.myBid!.id, action: 'decline' }),
        },
      ],
    );
  };

  const handleCounterBack = () => {
    if (!job.myBid) return;
    navigation.navigate('BidSubmission', {
      jobId: job.id,
      prefillAmount: job.myBid.counterAmount,
      prefillTimeline: job.myBid.timelineDays,
      prefillNotes: job.myBid.notes,
      isEdit: true,
    });
  };

  // ── Sticky CTA logic ──

  const renderStickyCTA = () => {
    // Hide sticky bar when counter-offer section is showing (has inline actions)
    if (isCountered) return null;

    let label = '';
    let onPress = () => {};
    let disabled = false;

    if (!hasBid) {
      label = 'Submit Bid';
      onPress = () => navigation.navigate('BidSubmission', { jobId: job.id });
    } else if (job.myBid?.status === 'pending' || job.myBid?.status === 'edited') {
      label = 'Edit Bid';
      onPress = () => navigation.navigate('BidSubmission', {
        jobId: job.id,
        prefillAmount: job.myBid!.amount,
        prefillTimeline: job.myBid!.timelineDays,
        prefillNotes: job.myBid!.notes,
        isEdit: true,
      });
    } else if (isAccepted) {
      label = 'Start Work';
      onPress = () => Alert.alert('Start Work', 'Mark this job as in progress?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Start', onPress: () => console.log('Start work') },
      ]);
    } else if (isInProgress) {
      label = 'Mark Complete';
      onPress = () => navigation.navigate('JobCompletion', { jobId: job.id });
    } else if (isPendingCompletion) {
      label = 'Waiting for Agent Review';
      disabled = true;
    } else {
      return null;
    }

    return (
      <View style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.background,
        borderTopWidth: DIMENSIONS.cardBorderWidth,
        borderTopColor: COLORS.border,
      }}>
        <Pressable
          onPress={onPress}
          disabled={disabled}
          style={({ pressed }) => ({
            height: 48,
            borderRadius: DIMENSIONS.buttonRadius,
            backgroundColor: disabled ? COLORS.disabledBg : COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed && !disabled ? 0.85 : 1,
            ...(hasBid && !isAccepted && !isInProgress && !isPendingCompletion ? {
              backgroundColor: COLORS.background,
              borderWidth: 1,
              borderColor: COLORS.primary,
            } : {}),
          })}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: disabled ? COLORS.disabledText : (hasBid && !isAccepted && !isInProgress && !isPendingCompletion ? COLORS.primary : '#FFFFFF'),
            lineHeight: 24,
          }}>
            {label}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── Header ── */}
      <View style={{
        height: DIMENSIONS.headerHeight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: DIMENSIONS.headerBorderWidth,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
      }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <BackArrowIcon />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, lineHeight: 24 }}>Job Details</Text>
        <Pressable
          onPress={() => Alert.alert('Actions', '', [
            { text: 'Share Job', onPress: () => {} },
            { text: 'Report Job', onPress: () => {}, style: 'destructive' },
            { text: 'Cancel', style: 'cancel' },
          ])}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <MoreDotsIcon />
        </Pressable>
      </View>

      {/* ── Scrollable Content ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        contentOffset={{ x: 0, y: 50 }}
      >
        {/* @demo Toggle — hidden above scroll start */}
        <View style={{ alignItems: 'center', paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row' }}>
            {DEMO_LABELS.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => setDemoStateIndex(i)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  backgroundColor: demoStateIndex === i ? COLORS.primary : 'transparent',
                  borderWidth: 1,
                  borderColor: COLORS.primary,
                  borderLeftWidth: i === 0 ? 1 : 0,
                  borderTopLeftRadius: i === 0 ? 8 : 0,
                  borderBottomLeftRadius: i === 0 ? 8 : 0,
                  borderTopRightRadius: i === DEMO_LABELS.length - 1 ? 8 : 0,
                  borderBottomRightRadius: i === DEMO_LABELS.length - 1 ? 8 : 0,
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: demoStateIndex === i ? '#FFFFFF' : COLORS.primary }}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 16 }}>

          {/* ── 2. Trade + Urgency Row ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <DisplayTag label={job.trade} variant="primary" />
            {job.isUrgent && (
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.urgentBg, borderRadius: 9999 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.urgentText, lineHeight: 16 }}>URGENT</Text>
              </View>
            )}
          </View>

          {/* ── 3. Job Title ── */}
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.darkText, lineHeight: 26 }}>
            {job.title}
          </Text>

          {/* ── 4. Budget Card ── */}
          <View style={{
            backgroundColor: COLORS.statBg,
            borderRadius: DIMENSIONS.cardRadius,
            padding: 16,
            gap: 4,
          }}>
            <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.primary, lineHeight: 28 }}>
              {centsToDisplay(job.budgetMin)} – {centsToDisplay(job.budgetMax)}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
              Agent's budget range
            </Text>
          </View>

          {/* ── 5. Scope Section ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
              Job Description
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 22 }}>
              {job.description}
            </Text>
          </View>

          {/* ── 6. Details Grid ── */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {/* Address */}
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                <View style={{ marginTop: 2 }}><MapPinIcon /></View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }} numberOfLines={2}>
                    {job.address}
                  </Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: COLORS.chipBg, borderRadius: 9999, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 11, fontWeight: '500', color: COLORS.bodyText }}>2.3 mi</Text>
                  </View>
                </View>
              </View>

              {/* Due date */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CalendarIcon />
                <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
                  {job.dueDate}
                </Text>
              </View>
            </View>

            {/* Bid count */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <BidIcon />
              <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
                {job.bidCount} {job.bidCount === 1 ? 'bid' : 'bids'} so far
              </Text>
            </View>
          </View>

          {/* ── 7. Agent Card ── */}
          <Pressable
            onPress={() => navigation.dispatch(
              CommonActions.navigate({ name: 'ProProfile', params: { profileId: job.agent.id } }),
            )}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              backgroundColor: COLORS.background,
              borderRadius: DIMENSIONS.cardRadius,
              borderWidth: 1,
              borderColor: COLORS.border,
              ...SHADOWS.card,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <AvatarPlaceholder name={job.agent.name} color={job.agent.avatarColor} size={40} />
            <View style={{ flex: 1, marginLeft: 12, gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
                {job.agent.name}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 18 }}>
                {job.agent.company}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <StarIcon />
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.statText, lineHeight: 16 }}>
                  {job.agent.rating.toFixed(1)}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.lightText, lineHeight: 16 }}>
                  · {job.agent.vouchCount} vouches
                </Text>
              </View>
            </View>
            <ChevronRightIcon />
          </Pressable>

          {/* ── 8. Your Bid Section (conditional) ── */}
          {hasBid && !isCountered && (
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
                Your Bid
              </Text>
              <View style={{
                padding: 16,
                backgroundColor: COLORS.background,
                borderRadius: DIMENSIONS.cardRadius,
                borderWidth: 1,
                borderColor: COLORS.border,
                gap: 10,
              }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.primary, lineHeight: 28 }}>
                    {centsToDisplay(job.myBid!.amount)}
                  </Text>
                  <BidStatusChip status={job.myBid!.status} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
                  Timeline: {job.myBid!.timelineDays} {job.myBid!.timelineDays === 1 ? 'day' : 'days'}
                </Text>
                {job.myBid!.notes ? (
                  <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }} numberOfLines={3}>
                    {job.myBid!.notes}
                  </Text>
                ) : null}
              </View>
            </View>
          )}

          {/* ── 9. Counter-Offer Section (conditional) ── */}
          {isCountered && job.myBid && (
            <View style={{ gap: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
                Counter-Offer from {job.agent.name}
              </Text>

              {/* Comparison card */}
              <View style={{
                padding: 16,
                backgroundColor: COLORS.background,
                borderRadius: DIMENSIONS.cardRadius,
                borderWidth: 1,
                borderColor: COLORS.counterAmber,
                gap: 12,
              }}>
                {/* Amount comparison row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.lightText, lineHeight: 16 }}>Your bid</Text>
                    <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.bodyText, lineHeight: 22 }}>
                      {centsToDisplay(job.myBid.amount)}
                    </Text>
                  </View>
                  <ArrowRightIcon />
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.lightText, lineHeight: 16 }}>Counter</Text>
                    <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.counterAmber, lineHeight: 28 }}>
                      {centsToDisplay(job.myBid.counterAmount!)}
                    </Text>
                  </View>
                </View>

                {/* Counter notes */}
                {job.myBid.counterNotes && (
                  <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18, textAlign: 'center' }}>
                    "{job.myBid.counterNotes}"
                  </Text>
                )}
              </View>

              {/* Action buttons row */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {/* Accept */}
                <Pressable
                  onPress={handleAcceptCounter}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 44,
                    borderRadius: DIMENSIONS.buttonRadius,
                    backgroundColor: COLORS.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', lineHeight: 20 }}>Accept</Text>
                </Pressable>

                {/* Counter back */}
                <Pressable
                  onPress={handleCounterBack}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 44,
                    borderRadius: DIMENSIONS.buttonRadius,
                    backgroundColor: COLORS.background,
                    borderWidth: 1,
                    borderColor: COLORS.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, lineHeight: 20 }}>Counter</Text>
                </Pressable>

                {/* Decline */}
                <Pressable
                  onPress={handleDeclineCounter}
                  style={({ pressed }) => ({
                    flex: 1,
                    height: 44,
                    borderRadius: DIMENSIONS.buttonRadius,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.rejectRed, lineHeight: 20 }}>Decline</Text>
                </Pressable>
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* ── 10. Sticky Bottom CTA ── */}
      {renderStickyCTA()}
    </SafeAreaView>
  );
};

export default ContractorJobDetails;
