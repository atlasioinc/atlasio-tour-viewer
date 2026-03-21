// ContractorJobDetails.tsx
// ═══════════════════════════════════════════════════════════════
// WHAT: Full job detail screen for contractors. Shows job info,
//       agent's budget (redesigned solid blue card), contractor's
//       own bid state (3 card designs: no-bid / pending / countered),
//       job photos strip with lightbox, and inline counter comparison.
//
// WHERE IN NAV:
//   ContractorHomeStack:  ContractorHomeTab → ContractorJobDetails
//   ContractorJobsStack:  JobTrackerTab → ContractorJobDetails
//   Route param: { jobId: string }
//
// DEMO STATES (toggle via segmented control hidden above scroll):
//   Index 0 → MOCK_JOB_NO_BID       → no bid card, CTA = "Submit Bid"
//   Index 1 → MOCK_JOB_BID_PENDING  → bid card (pending), CTA = "Edit Bid"
//   Index 2 → MOCK_JOB_COUNTERED    → counter card, CTA = Decline/Counter/Accept
//
// @demo All job data is mock. Replace with:
//   useContractorJobDetails(jobId) → jobs + bids join, filtered by contractor_id = auth.uid()
// @backend RPC: rpc_submit_bid (via BidSubmissionScreen)
// @backend RPC: rpc_respond_to_counter_offer (useRespondToCounter — already wired S30)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { COLORS, DIMENSIONS, SHADOWS, TYPOGRAPHY } from '../lib/tokens';
import { DisplayTag } from './DisplayTag';
import type { ContractorJobDetail } from '../types';
import { useRespondToCounter, useStartJob } from '../hooks/useData';
import { CounterButton, DangerButton } from './Button';

// ─────────────────────────────────────────────
// ROUTE PARAMS
// ─────────────────────────────────────────────

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

const BidIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M11.67 8.17C11.67 8.48 11.55 8.78 11.33 9L7.58 12.75C7.36 12.97 7.06 13.09 6.75 13.09C6.44 13.09 6.14 12.97 5.92 12.75L1.75 8.58V2.33H7.99L11.33 5.67C11.55 5.89 11.67 6.19 11.67 6.5V8.17Z" stroke={COLORS.bodyText} strokeWidth={1.17} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={4.67} cy={5.25} r={0.58} fill={COLORS.bodyText} />
  </Svg>
);

const CheckCircleIcon: React.FC<{ width?: number; height?: number; color?: string }> = ({
  width = 16, height = 16, color = COLORS.inRangeGreen,
}) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 4L12 14.01l-3-3" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CircleDotIcon: React.FC<{ color?: string }> = ({ color = COLORS.primary }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={8.5} stroke={color} strokeWidth={1.67} />
    <Circle cx={10} cy={10} r={4} fill={color} />
  </Svg>
);

const CircleEmptyIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={8.5} stroke={COLORS.border} strokeWidth={1.67} />
  </Svg>
);

const MessageIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M17.5 13.33A1.67 1.67 0 0 1 15.83 15H5.83L2.5 18.33V5A1.67 1.67 0 0 1 4.17 3.33H15.83A1.67 1.67 0 0 1 17.5 5V13.33Z"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CameraIcon: React.FC<{ width?: number; height?: number; color?: string }> = ({
  width = 24, height = 24, color = COLORS.lightText,
}) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none">
    <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={13} r={4} stroke={color} strokeWidth={1.5} />
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

// =============================================================================
// FORMAT RELATIVE TIME
// Converts ISO timestamp to relative label ("2h ago", "3d ago", "just now").
// Used for invite timestamps on AgentMessageBanner.
// @backend: called with job_invitations.created_at ISO string
// =============================================================================
const formatRelativeTime = (isoString: string): string => {
  if (!isoString) return '';
  const now = new Date();
  const past = new Date(isoString);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

// =============================================================================
// AGENT MESSAGE BANNER
// Shows when contractor was personally invited to a job (job_type === 'invite').
// Preserves the agent's personal note throughout the bid decision flow.
// @backend: agent_message from rpc_get_job_details → job_invitations.note
// =============================================================================

interface AgentMessageBannerProps {
  agentName: string;
  message: string;
  invitedAt: string;
}

const AgentMessageBanner: React.FC<AgentMessageBannerProps> = ({
  agentName,
  message,
  invitedAt,
}) => (
  <View style={{
    backgroundColor: COLORS.backgroundInfo,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  }}>
    <Text style={{
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    }}>
      Invited by {agentName}
    </Text>
    <Text style={{
      fontSize: 15,
      fontWeight: '400',
      color: COLORS.darkText,
      lineHeight: 22,
      marginBottom: 6,
    }}>
{`\u201C${message}\u201D`}
    </Text>
    <Text style={{
      fontSize: 14,
      fontWeight: '400',
      color: COLORS.secondaryText,
    }}>
      — {agentName}, {invitedAt}
    </Text>
  </View>
);

// ─────────────────────────────────────────────
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

// @demo State 1: Invite job, no bid yet
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
  job_type: 'invite',           // @demo — valid test value; real value comes from rpc_get_job_details
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
  job_type: 'invite',            // @demo: explicit job_type — do not rely on spread inheritance for demo state clarity
  bidCount: 4,
  myBid: {
    id: 'bid-1',
    amount: 45000, // $450
    timelineDays: 3,
    notes: 'Can start tomorrow. Will bring replacement parts for both faucet and P-trap. Standard repair, should take 2-3 hours on site.',
    status: 'pending',
  },
};

// @demo State 3: Counter-offer received (marketplace job — no invite banner)
const MOCK_JOB_COUNTERED: ContractorJobDetail = {
  ...MOCK_JOB_NO_BID,
  id: 'mj3',
  job_type: 'open',
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

// @demo State 4: Awarded — bid accepted, ready to start work
// @demo hardcoded — replace with useContractorJobDetails(jobId)
const MOCK_JOB_AWARDED: ContractorJobDetail = {
  ...MOCK_JOB_NO_BID,
  id: 'mj4',
  address: '1203 Oak Lane, Denver CO 80203',
  jobStatus: 'awarded',
  job_type: 'invite',
  bidCount: 4,
  myBid: {
    id: 'bid-3',
    amount: 45000, // $450
    timelineDays: 3,
    notes: 'Can start tomorrow. Will bring replacement parts for both faucet and P-trap.',
    status: 'accepted',
  },
};

// @demo State 5: In Progress — contractor is working, proof of work section active
// @demo hardcoded — replace with useContractorJobDetails(jobId)
const MOCK_JOB_IN_PROGRESS: ContractorJobDetail = {
  ...MOCK_JOB_NO_BID,
  id: 'mj5',
  jobStatus: 'in_progress',
  job_type: 'invite',
  bidCount: 4,
  myBid: {
    id: 'bid-4',
    amount: 45000,
    timelineDays: 3,
    notes: 'Can start tomorrow. Will bring replacement parts for both faucet and P-trap.',
    status: 'accepted',
  },
};

// @demo State 6: Pending Confirmation — waiting for agent review
// @demo hardcoded — replace with useContractorJobDetails(jobId)
const MOCK_JOB_PENDING_CONFIRMATION: ContractorJobDetail = {
  ...MOCK_JOB_NO_BID,
  id: 'mj6',
  address: '891 Birch Blvd, Denver CO 80203',
  jobStatus: 'pending_completion',
  job_type: 'invite',
  bidCount: 4,
  myBid: {
    id: 'bid-5',
    amount: 45000,
    timelineDays: 3,
    notes: 'Can start tomorrow. Will bring replacement parts for both faucet and P-trap.',
    status: 'accepted',
  },
};

// @demo Toggle states
const DEMO_STATES: ContractorJobDetail[] = [
  MOCK_JOB_NO_BID, MOCK_JOB_BID_PENDING, MOCK_JOB_COUNTERED,
  MOCK_JOB_AWARDED, MOCK_JOB_IN_PROGRESS, MOCK_JOB_PENDING_CONFIRMATION,
];
const DEMO_LABELS = ['No Bid', 'Pending', 'Counter', 'Awarded', 'Active', 'Review'];

// @demo 3 placeholder photo tiles — replace with job.photos[] array of signed Supabase storage URLs
// @backend Storage bucket: job-photos (agent upload, 5MB limit, accessible to bidding contractors)
const DEMO_PHOTOS = [
  { isPlaceholder: true, url: null as string | null },
  { isPlaceholder: true, url: null as string | null },
  { isPlaceholder: true, url: null as string | null },
];

// ─────────────────────────────────────────────
// STATUS TIMELINE (States 4/5/6 progress tracker)
// Pattern: matches JobCompletionScreen StatusTimeline exactly
// ─────────────────────────────────────────────

interface TimelineStep {
  label: string;
  status: 'completed' | 'active' | 'pending';
  sublabel?: string;
}

const StatusTimeline: React.FC<{ steps: TimelineStep[] }> = ({ steps }) => (
  <View style={{ gap: 0 }}>
    {steps.map((step, index) => {
      const isLast = index === steps.length - 1;

      return (
        <View key={step.label} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Icon column */}
          <View style={{ width: 28, alignItems: 'center' }}>
            {step.status === 'completed' ? (
              <CheckCircleIcon width={20} height={20} color={COLORS.successGreen} />
            ) : step.status === 'active' ? (
              <CircleDotIcon color={COLORS.primary} />
            ) : (
              <CircleEmptyIcon />
            )}
            {/* Connector line */}
            {!isLast && (
              <View
                style={{
                  width: 2,
                  height: 28,
                  backgroundColor:
                    step.status === 'completed' ? COLORS.successGreen : COLORS.border,
                  marginTop: 4,
                  marginBottom: 4,
                  borderRadius: 1,
                }}
              />
            )}
          </View>

          {/* Label */}
          <View style={{ flex: 1, paddingLeft: 10, paddingBottom: isLast ? 0 : 8 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: step.status === 'active' ? '600' : '400',
                color:
                  step.status === 'pending'
                    ? COLORS.lightText
                    : step.status === 'active'
                    ? COLORS.primary
                    : COLORS.darkText,
                lineHeight: 20,
              }}
            >
              {step.label}
            </Text>
            {step.sublabel && (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '400',
                  color: COLORS.lightText,
                  lineHeight: 16,
                  marginTop: 2,
                }}
              >
                {step.sublabel}
              </Text>
            )}
          </View>
        </View>
      );
    })}
  </View>
);

// @demo Demo routing — maps ContractorHomeTab mock job IDs to MOCK_JOB_* constants.
// Production: ContractorJobDetails reads job status from useContractorJobDetails(jobId).
//   'aj1' (742 Pine Ave, 60% progress)   → index 4 → MOCK_JOB_IN_PROGRESS (State 5)
//   'aj2' (1203 Oak Lane, 30% progress)  → index 3 → MOCK_JOB_AWARDED (State 4)
//   'aj3' (891 Birch Blvd, 85% progress) → index 5 → MOCK_JOB_PENDING_CONFIRMATION (State 6)
// Fallback: 0 (State 1 — no bid submitted). Never default to a state that assumes an active job.
const JOB_ID_TO_STATE_INDEX: Record<string, number> = {
  aj1: 4,  // MOCK_JOB_IN_PROGRESS
  aj2: 3,  // MOCK_JOB_AWARDED
  aj3: 5,  // MOCK_JOB_PENDING_CONFIRMATION
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ContractorJobDetails: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ ContractorJobDetails: { jobId?: string } }, 'ContractorJobDetails'>>();
  const insets = useSafeAreaInsets();

  // @demo State toggle (cycles through 6 mock states)
  // Initialises from route param jobId when navigated from ContractorHomeTab active jobs
  const initialIndex = route.params?.jobId ? (JOB_ID_TO_STATE_INDEX[route.params.jobId] ?? 0) : 0;
  const [demoStateIndex, setDemoStateIndex] = useState(initialIndex);

  // Lightbox state for job photos
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const job = DEMO_STATES[demoStateIndex];
  const respondToCounter = useRespondToCounter();
  const startJob = useStartJob();

  const hasBid = !!job.myBid;
  const isCountered = job.myBid?.status === 'countered';
  const isAccepted = job.myBid?.status === 'accepted';
  const isAwarded = job.jobStatus === 'awarded';
  const isInProgress = job.jobStatus === 'in_progress';
  const isPendingCompletion = job.jobStatus === 'pending_completion';

  // ── Counter-offer handlers ──
  // @backend All 3 use useRespondToCounter → rpc_respond_to_counter_offer

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

  // ── Decline invite handler ──
  // @demo: static copy — production should include agent name: "Decline [Agent Name]'s invitation?"
  // @backend: replace navigation.goBack() with rpc_decline_job_invite(job_id, contractor_id, reason?) + success toast
  const handleDeclineInvite = () => {
    Alert.alert(
      'Decline Invitation',
      'Are you sure you want to decline this job invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  // ── Sticky CTA logic ──

  const renderStickyCTA = () => {
    // Countered state — 3 action buttons in sticky bar
    if (isCountered) {
      return (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 24),
          backgroundColor: COLORS.background,
          borderTopWidth: DIMENSIONS.cardBorderWidth,
          borderTopColor: COLORS.border,
        }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              onPress={handleDeclineCounter}
              style={({ pressed }) => ({
                flex: 1,
                height: 48,
                borderRadius: DIMENSIONS.buttonRadius,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.rejectRed, lineHeight: 20 }}>Decline</Text>
            </Pressable>
            <CounterButton
              label="Counter"
              onPress={handleCounterBack}
              fullWidth={false}
              flex={1}
            />
            <Pressable
              onPress={handleAcceptCounter}
              style={({ pressed }) => ({
                flex: 1,
                height: 48,
                borderRadius: DIMENSIONS.buttonRadius,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF', lineHeight: 20 }}>Accept</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    let label = '';
    let onPress = () => {};
    let disabled = false;

    if (!hasBid && job.job_type === 'invite') {
      // Invited job, no bid yet — side-by-side: Decline + Submit Bid
      const ctaBarStyle = {
        position: 'absolute' as const,
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 24),
        backgroundColor: COLORS.background,
        borderTopWidth: DIMENSIONS.cardBorderWidth,
        borderTopColor: COLORS.border,
      };
      return (
        <View style={ctaBarStyle}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <DangerButton
              label="Decline"
              onPress={handleDeclineInvite}
              fullWidth={false}
              style={{ flex: 1 }}
            />
            <Pressable
              onPress={() => navigation.navigate('BidSubmission', { jobId: job.id })}
              style={({ pressed }) => ({
                flex: 2,
                height: 48,
                borderRadius: DIMENSIONS.buttonRadius,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', lineHeight: 24 }}>Submit Bid</Text>
            </Pressable>
          </View>
        </View>
      );
    }

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
    } else if (isAwarded) {
      // State 4: Awarded — "Start Work" with confirmation
      label = 'Start Work';
      onPress = () => Alert.alert(
        'Ready to start?',
        'Starting this job notifies the agent.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start Work',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              // @backend rpc_start_job(p_job_id) — validates awarded contractor, transitions awarded → in_progress
              // @demo: mock 800ms delay, optimistic status update
              startJob.mutate({ jobId: job.id });
            },
          },
        ],
      );
    } else if (isInProgress) {
      // State 5: In Progress — routes to JobCompletionScreen for proof upload
      label = 'Upload Proof & Complete';
      onPress = () => navigation.push('JobCompletion', {
        jobId: job.id,
        userRole: 'contractor',
      });
    } else if (isPendingCompletion) {
      // State 6: Pending Confirmation — fully disabled
      label = 'Waiting for Agent Review';
      disabled = true;
    } else {
      return null;
    }

    return (
      <View style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 24),
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
            ...(hasBid && !isAwarded && !isAccepted && !isInProgress && !isPendingCompletion ? {
              backgroundColor: COLORS.background,
              borderWidth: 1,
              borderColor: COLORS.primary,
            } : {}),
          })}
        >
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: disabled ? COLORS.disabledText : (hasBid && !isAwarded && !isAccepted && !isInProgress && !isPendingCompletion ? COLORS.primary : '#FFFFFF'),
            lineHeight: 24,
          }}>
            {label}
          </Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── Header ── */}
      <View style={{
        paddingTop: 8 + insets.top,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: DIMENSIONS.headerBorderWidth,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.background,
      }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
          <BackArrowIcon />
        </Pressable>
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>Job Details</Text>
        <Pressable
          onPress={() => Alert.alert('Actions', '', [
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
        contentContainerStyle={{ paddingBottom: 80 + Math.max(insets.bottom, 24) }}
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
                <Text style={{ fontSize: 14, fontWeight: '600', color: demoStateIndex === i ? '#FFFFFF' : COLORS.primary }}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, gap: 16 }}>

          {/* ── Agent Message Banner ── */}
          {/* Conditional: only renders for invite jobs with a message (States 1 + 2) */}
          {job.job_type === 'invite' && job.agent_message ? (
            <AgentMessageBanner
              agentName={job.agent?.name ?? 'Agent'}          // @backend: rpc_get_job_details → agent.name
              message={job.agent_message ?? ''}               // @backend: rpc_get_job_details → job_invitations.note
              invitedAt={formatRelativeTime(job.invited_at ?? '')}  // @backend: rpc_get_job_details → job_invitations.created_at
            />
          ) : null}

          {/* ── 2. Trade + Urgency Row ── */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* @design: intentional 12pt exception — trade is confirmatory context for matched contractor */}
            <DisplayTag label={job.trade} variant="primary" fontSize={12} />
            {/* @design: intentional 12pt exception — matches urgency pill on ContractorJobsTab, ambient context not decision-critical */}
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
          {/* @demo budgetMin/budgetMax from MOCK_JOB_* (stored in cents). Replace with job.budget_min / job.budget_max */}
          {/* @backend fields: jobs.budget_min, jobs.budget_max (integer cents) */}
          <View style={{
            backgroundColor: COLORS.accentBlue,   // Solid fill — gradient flattened for RN (Figma spec: #155DFC→#1447E6)
            borderRadius: 14,
            paddingHorizontal: 16,
            paddingVertical: 16,
          }}>
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              lineHeight: 16,
              color: COLORS.budgetLabelText,        // #DBEAFE
              marginBottom: 4,
            }}>
              Agent{"'"}s Budget
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={{ ...TYPOGRAPHY.displayM, color: COLORS.background }}>
                {centsToDisplay(job.budgetMin)}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: '400', lineHeight: 28, color: COLORS.budgetSeparator }}>
                {' – '}
              </Text>
              <Text style={{ ...TYPOGRAPHY.displayM, color: COLORS.background }}>
                {centsToDisplay(job.budgetMax)}
              </Text>
            </View>
          </View>

          {/* ── 8. Your Bid Card (all non-countered bid states) ── */}
          {/* States 2/4/5/6: in-place card with state-conditional badge + border */}
          {/* @demo Renders for all MOCK_JOB_* with myBid except countered */}
          {/* @backend myBid fields from bids table: amount, timeline_days, notes, status */}
          {hasBid && !isCountered && (
            <View style={{
              backgroundColor: COLORS.background,
              borderRadius: DIMENSIONS.cardRadius,
              borderWidth: 1,
              borderColor: isAwarded ? COLORS.accentBlue
                : isInProgress ? COLORS.accentBlue
                : isPendingCompletion ? COLORS.counterAmber
                : COLORS.accentBlue,      // State 2 (pending/edited): blue border
              ...(isAwarded ? { borderLeftWidth: 4, borderLeftColor: COLORS.primary } : {}),
              padding: 16,
              ...SHADOWS.card,
            }}>
              {/* Eyebrow label — matches "Agent's Budget" presentation on blue card above */}
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                lineHeight: 16,
                color: COLORS.bodyText,
                marginBottom: 4,
              }}>
                Your Bid
              </Text>

              {/* Row 1: Amount + In Range indicator + Status badge */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ ...TYPOGRAPHY.displayM, color: COLORS.headingText }}>
                    {centsToDisplay(job.myBid!.amount)}
                  </Text>
                  {/* "In range" — show only when bid is within agent's budget band AND in pending state */}
                  {/* @demo Always true for MOCK_JOB_BID_PENDING ($450 is within $200–$600) */}
                  {/* @backend condition: myBid.amount >= job.budget_min && myBid.amount <= job.budget_max */}
                  {!isAwarded && !isInProgress && !isPendingCompletion &&
                    job.myBid!.amount >= job.budgetMin && job.myBid!.amount <= job.budgetMax && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <CheckCircleIcon width={16} height={16} color={COLORS.inRangeGreen} />
                      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.inRangeGreen, lineHeight: 16 }}>
                        In range
                      </Text>
                    </View>
                  )}
                </View>
                {/* State-conditional badge */}
                {isAwarded ? (
                  <View style={{
                    backgroundColor: COLORS.feeBg,
                    borderRadius: 9999,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.successGreen, lineHeight: 16 }}>
                      Accepted
                    </Text>
                  </View>
                ) : isInProgress ? (
                  <View style={{
                    backgroundColor: COLORS.backgroundInfo,
                    borderRadius: 9999,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, lineHeight: 16 }}>
                      In Progress
                    </Text>
                  </View>
                ) : isPendingCompletion ? (
                  <View style={{
                    backgroundColor: COLORS.warningBg,
                    borderRadius: 9999,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.warningAmber, lineHeight: 16 }}>
                      Pending Review
                    </Text>
                  </View>
                ) : (
                  /* State 2: Pending badge — unchanged */
                  <View style={{
                    backgroundColor: COLORS.infoBg,      // #EFF6FF light blue bg
                    borderRadius: 9999,
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.accentBlue, lineHeight: 16 }}>
                      Pending
                    </Text>
                  </View>
                )}
              </View>

              {/* Row 2: Timeline */}
              {/* @backend Replace timelineDays with job.myBid.timeline_days */}
              <Text style={{ fontSize: 14, color: COLORS.statText, lineHeight: 20, marginBottom: job.myBid!.notes ? 6 : 0 }}>
                Timeline: {job.myBid!.timelineDays} {job.myBid!.timelineDays === 1 ? 'day' : 'days'}
              </Text>

              {/* Row 3: Notes (optional) */}
              {job.myBid!.notes ? (
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }} numberOfLines={3}>
                  {job.myBid!.notes}
                </Text>
              ) : null}
            </View>
          )}

          {/* ── Progress Tracker (States 4/5/6 only) ── */}
          {/* Matches JobCompletionScreen progress section exactly */}
          {(isAwarded || isInProgress || isPendingCompletion) && (
            <View>
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.darkText,
                lineHeight: 24,
                marginBottom: 12,
              }}>
                Progress
              </Text>
              <View style={{
                backgroundColor: COLORS.background,
                borderRadius: 14,
                borderWidth: 0.68,
                borderColor: COLORS.cardBorder,
                ...SHADOWS.card,
                padding: 16,
              }}>
                <StatusTimeline steps={[
                  {
                    label: 'Job Awarded',
                    status: isAwarded ? 'active' : 'completed',
                    sublabel: `${centsToDisplay(job.myBid!.amount)} · ${job.agent.name}`,
                  },
                  {
                    label: 'Work In Progress',
                    status: isInProgress ? 'active' : isAwarded ? 'pending' : 'completed',
                    sublabel: `Due ${job.dueDate}`,
                  },
                  {
                    label: 'Completion Submitted',
                    status: isPendingCompletion ? 'active' : 'pending',
                    sublabel: isPendingCompletion ? undefined : 'Upload proof & submit',
                  },
                  {
                    label: 'Agent Confirmed',
                    status: 'pending',
                  },
                ]} />
              </View>
            </View>
          )}

          {/* ── 9. Counter-Offer Card ── */}
          {/* Shows when the agent has issued a counter-offer to this contractor's bid */}
          {/* ACTION BUTTONS (Accept / Counter / Decline) live in renderStickyCTA() — NOT here */}
          {/* @demo Renders for MOCK_JOB_COUNTERED (demoStateIndex === 2) */}
          {/* @backend counterAmount from job.myBid.counter_amount, counterNotes from job.myBid.counter_notes */}
          {isCountered && job.myBid && (
            <View style={{
              backgroundColor: COLORS.background,
              borderRadius: DIMENSIONS.cardRadius,
              borderWidth: 1,
              borderColor: COLORS.counterAmber,     // #D97706 amber border = agent has responded
              padding: 16,
              ...SHADOWS.card,
            }}>
              {/* Eyebrow label — matches "Agent's Budget" presentation on blue card above */}
              <Text style={{
                fontSize: 14,
                fontWeight: '600',
                lineHeight: 16,
                color: COLORS.bodyText,
                marginBottom: 4,
              }}>
                Your Bid
              </Text>

              {/* Row 1: Original bid amount + "Countered" badge */}
              {/* Note: "In range" indicator is intentionally NOT shown in countered state */}
              {/* Business rule: counter supersedes budget range relevance — agent's counter is the new reference point */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ ...TYPOGRAPHY.displayM, color: COLORS.headingText }}>
                  {centsToDisplay(job.myBid.amount)}
                </Text>
                <View style={{
                  backgroundColor: COLORS.warningBg,     // #FFFBEB amber tint
                  borderRadius: 9999,
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.counterAmber, lineHeight: 16 }}>
                    Countered
                  </Text>
                </View>
              </View>

              {/* Row 2: Agent's counter amount — amber highlighted */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: job.myBid.counterNotes ? 10 : 0,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.counterAmber, lineHeight: 20 }}>
                  Agent{"'"}s counter:{' '}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.counterAmber, lineHeight: 20 }}>
                  {centsToDisplay(job.myBid.counterAmount!)}
                </Text>
              </View>

              {/* Row 3: Agent's counter note (optional) */}
              {job.myBid.counterNotes ? (
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
                  {'"'}{job.myBid.counterNotes}{'"'}
                </Text>
              ) : null}
            </View>
          )}

          {/* ── 4b. Job Photos Strip ── */}
          {/* @demo Renders DEMO_PHOTOS (3 placeholder camera tiles). Replace with job.photos[] from useContractorJobDetails */}
          {/* @backend job.photos is string[] of signed Supabase storage URLs from the job-photos bucket */}
          {/* Render strip whenever photos exist. In demo, DEMO_PHOTOS.length > 0 always shows it. */}
          {DEMO_PHOTOS.length > 0 && (
            <View style={{ marginHorizontal: -16 }}>
              {/* Negative margin breaks out of parent paddingHorizontal: 16 so strip reads edge-to-edge */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              >
                {DEMO_PHOTOS.map((photo, index) => (
                  <Pressable
                    key={index}
                    onPress={() => {
                      setLightboxIndex(index);
                      setLightboxVisible(true);
                    }}
                    style={({ pressed }) => ({
                      width: 112,
                      height: 88,
                      borderRadius: 10,
                      overflow: 'hidden',
                      backgroundColor: COLORS.chipBg,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    {photo.isPlaceholder ? (
                      // @demo Placeholder — remove when job.photos[] has real URLs
                      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <CameraIcon width={24} height={24} color={COLORS.lightText} />
                      </View>
                    ) : (
                      <Image
                        source={{ uri: photo.url! }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                    )}

                    {/* Overflow overlay on 4th tile when more than 4 photos exist */}
                    {/* @demo Not active at 3 photos — activates when job.photos.length > 4 */}
                    {index === 3 && DEMO_PHOTOS.length > 4 && (
                      <View style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.45)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.background }}>
                          +{DEMO_PHOTOS.length - 4}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

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
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }} numberOfLines={2}>
                    {job.address}
                  </Text>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 2, backgroundColor: COLORS.chipBg, borderRadius: 9999, alignSelf: 'flex-start' }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.bodyText }}>2.3 mi</Text>
                  </View>
                </View>
              </View>

              {/* Due date */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <CalendarIcon />
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18 }}>
                  {job.dueDate}
                </Text>
              </View>
            </View>

            {/* Bid count — show only when 1–3 bids. Hidden at 0 and at 4+. */}
            {/* Business rule: Low count is a competitive urgency signal. High count is discouraging — hide it. */}
            {/* @demo bidCount is set per MOCK_JOB_* object. Replace with job.bids_count from useContractorJobDetails */}
            {job.bidCount >= 1 && job.bidCount <= 3 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BidIcon />
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.successGreen, lineHeight: 18 }}>
                  {`Only ${job.bidCount} ${job.bidCount === 1 ? 'bid' : 'bids'} so far`}
                </Text>
              </View>
            )}
          </View>

          {/* ── 7. Agent Card ── */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              backgroundColor: COLORS.background,
              borderRadius: DIMENSIONS.cardRadius,
              borderWidth: 1,
              borderColor: COLORS.border,
              ...SHADOWS.card,
            }}
          >
            <AvatarPlaceholder name={job.agent.name} color={job.agent.avatarColor} size={40} />
            <View style={{ flex: 1, marginLeft: 12, gap: 2 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
                {job.agent.name}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 18 }}>
                {job.agent.company}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <StarIcon />
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 16 }}>
                  {job.agent.rating.toFixed(1)}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>
                  · {job.agent.vouchCount} vouches
                </Text>
              </View>
            </View>
            {/* Message button — icon-only, matches agent-side BidCard pattern */}
            {/* @backend requires active connection between contractor and agent */}
            {/* @demo job.hasUnreadAgentMessages flag controls red notification dot */}
            {/*       In production: set via realtime subscription or chat_threads table query */}
            <Pressable
              onPress={() => {
                // @nav → ChatScreen modal (1:1 agent message thread)
                navigation.navigate('ChatScreen', {
                  contactId: job.agent.id,
                  contactName: job.agent.name,
                  contactAvatarColor: job.agent.avatarColor,
                  contactCompany: job.agent.company,
                });
              }}
              hitSlop={8}
              style={({ pressed }) => ({
                width: 40,
                height: 40,
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-start',
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <MessageIcon />
              {(job as any).hasUnreadAgentMessages && (
                <View
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 14,
                    height: 14,
                    borderRadius: 9999,
                    backgroundColor: COLORS.notificationRed,
                    borderWidth: 2,
                    borderColor: COLORS.background,
                  }}
                />
              )}
            </Pressable>
          </View>

          {/* States 4/5/6 content now rendered in-place via the Your Bid card above */}

        </View>
      </ScrollView>

      {/* ── 10. Sticky Bottom CTA ── */}
      {renderStickyCTA()}

      {/* ── Photo Lightbox Modal ── */}
      {/* Full-screen swipeable photo viewer. Triggered by tapping any tile in the photos strip. */}
      {/* @demo Renders placeholder tiles (camera icon + "No photo"). Replace with real photo.url values */}
      {/* @backend Photo URLs come from job.photos[] — signed Supabase storage URLs (job-photos bucket) */}
      <Modal
        visible={lightboxVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>

          {/* Counter: "1 / 3" */}
          <Text style={{
            position: 'absolute',
            top: 60,
            alignSelf: 'center',
            zIndex: 10,
            fontSize: 14,
            fontWeight: '600',
            color: COLORS.background,
          }}>
            {lightboxIndex + 1} / {DEMO_PHOTOS.length}
          </Text>

          {/* Close button */}
          <Pressable
            onPress={() => setLightboxVisible(false)}
            hitSlop={16}
            style={({ pressed }) => ({
              position: 'absolute',
              top: 56,
              right: 20,
              zIndex: 10,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 20, color: COLORS.background, fontWeight: '300', lineHeight: 24 }}>✕</Text>
          </Pressable>

          {/* Horizontally paginated photo viewer */}
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(
                e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width
              );
              setLightboxIndex(index);
            }}
            contentOffset={{ x: lightboxIndex * Dimensions.get('window').width, y: 0 }}
            style={{ flex: 1 }}
          >
            {DEMO_PHOTOS.map((photo, index) => (
              <View
                key={index}
                style={{
                  width: Dimensions.get('window').width,
                  flex: 1,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {photo.isPlaceholder ? (
                  // @demo Placeholder — remove when job.photos[] has real URLs
                  <View style={{ alignItems: 'center', gap: 12 }}>
                    <CameraIcon width={48} height={48} color={COLORS.lightText} />
                    <Text style={{ fontSize: 14, color: COLORS.lightText }}>No photo</Text>
                  </View>
                ) : (
                  <Image
                    source={{ uri: photo.url! }}
                    style={{
                      width: Dimensions.get('window').width,
                      height: Dimensions.get('window').height * 0.75,
                    }}
                    resizeMode="contain"
                  />
                )}
              </View>
            ))}
          </ScrollView>

        </View>
      </Modal>
    </View>
  );
};

export default ContractorJobDetails;
