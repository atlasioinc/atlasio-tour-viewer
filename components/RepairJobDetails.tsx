// ═══════════════════════════════════════════════════════════════
// components/RepairJobDetails.tsx
// Repair Job Details — Agent View (1,853 lines)
//
// Shows job info, photos, bids received, and bid action modals.
// Agent-only screen — contractors see ContractorJobDetails instead.
// Navigation: HomeStack → RepairJobDetails
//
// ─────────────────────────────────────────────
// KEY SECTIONS:
//   Bid Card Component  — contractor name, trade pill, price, timeline
//   Sort Dropdown       — Recommended / Lowest Price / Highest Rated / Fastest
//   Bid Action Modals   — Accept / Counter / Reject (3 modal flows)
//   Status Timeline     — 4-step post-award tracker (visible after bid accepted)
//   Invite Modal        — triggers InviteContractorsModal
// ─────────────────────────────────────────────
//
// @backend: useJob(jobId), useJobBids(jobId) — live data with mock fallback
// @backend: useRealtimeBids(jobId) — realtime subscription for bid updates
// @backend: useAcceptBid → rpc_accept_bid(p_bid_id, p_job_id)        (S176)
// @backend: useCounterBid → rpc_counter_bid(p_bid_id, p_job_id, p_counter_amount)  (S176)
// @backend: useRejectBid → rpc_reject_bid(p_bid_id, p_job_id)        (S176)
//        Optimistic setJob preserved post-await for instant UX; query
//        invalidation reconciles to server truth shortly after.
// @demo: DEV helper handleOpenContractorView — opens contractor JobCompletion view.
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Image,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import type { HomeStackParamList } from './HomeStack';
import type { Job, BidWithProfile, BidStatus, JobStatus } from '../types';
import InviteContractorsModal from './InviteContractorsModal';
import InfoBanner from './InfoBanner';
import { COLORS } from '../lib/tokens';
import { useJob, useJobBids, useContractorsForJob, useAcceptBid, useCounterBid, useRejectBid } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { useRealtimeBids } from '../hooks/useRealtime';
import { Avatar, PhotoLightbox, VerificationBanner, EmptyState, MomentBanner, SuccessToast } from './shared';
import { useMomentBanner } from '../hooks/useMomentBanner';
import { useSuccessToast } from '../hooks/useSuccessToast';
import { DisplayTag } from './DisplayTag';
import { useVerificationGate } from '../hooks/useVerificationGate';

// Which bid action modal is currently visible
type BidActionModal = 'accept' | 'counter' | 'reject' | null;

// ─────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────

const priceToCents = (price: string): number => {
  const cleaned = price.replace(/[^0-9.]/g, '');
  return Math.round(parseFloat(cleaned) * 100);
};

// Job with profile-enriched bids (for UI display)
type JobWithBidProfiles = Job & { bids: BidWithProfile[] };

type RepairJobDetailsRouteProp = RouteProp<HomeStackParamList, 'RepairJobDetails'>;

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.5 15L7.5 10L12.5 5" stroke={COLORS.headingText} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EditIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M11.33 2A1.89 1.89 0 0 1 14 4.67L5.33 13.33 1.33 14.67 2.67 10.67 11.33 2Z" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronDownIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M4 6L8 10L12 6" stroke={COLORS.statText} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M3 8L6.5 11.5L13 4.5" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MoreIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 10.83a0.83 0.83 0 1 0 0-1.66 0.83 0.83 0 0 0 0 1.66Z" fill={COLORS.headingText} stroke={COLORS.headingText} strokeWidth={1.67} />
    <Path d="M10 5.83a0.83 0.83 0 1 0 0-1.66 0.83 0.83 0 0 0 0 1.66Z" fill={COLORS.headingText} stroke={COLORS.headingText} strokeWidth={1.67} />
    <Path d="M10 15.83a0.83 0.83 0 1 0 0-1.66 0.83 0.83 0 0 0 0 1.66Z" fill={COLORS.headingText} stroke={COLORS.headingText} strokeWidth={1.67} />
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

const ShieldCheckIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M6 1L2 3V5.67C2 8.17 3.71 10.49 6 11C8.29 10.49 10 8.17 10 5.67V3L6 1Z"
      stroke={COLORS.primary}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.5 6L5.5 7L7.5 5"
      stroke={COLORS.primary}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ── Timeline step icons ──

const CheckCircleIcon: React.FC<{ size?: number; color?: string }> = ({ size = 20, color = COLORS.successGreen }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={8.5} stroke={color} strokeWidth={1.67} />
    <Path d="M6.5 10L9 12.5L13.5 7.5" stroke={color} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
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

const ChevronRightSmallIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M5.25 3.5L8.75 7L5.25 10.5" stroke={COLORS.primary} strokeWidth={1.17} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// STATUS TIMELINE (shared pattern with JobCompletionScreen)
// ─────────────────────────────────────────────

interface TimelineStep {
  label: string;
  status: 'completed' | 'active' | 'pending';
  sublabel?: string;
  sublabelColor?: string;
  isTappable?: boolean;
}

const JobStatusTimeline: React.FC<{
  steps: TimelineStep[];
  onTapStep?: (index: number) => void;
}> = ({ steps, onTapStep }) => (
  <View style={{ gap: 0 }}>
    {steps.map((step, index) => {
      const isLast = index === steps.length - 1;

      return (
        <Pressable
          key={step.label}
          onPress={step.isTappable && onTapStep ? () => onTapStep(index) : undefined}
          disabled={!step.isTappable}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'flex-start',
            opacity: pressed && step.isTappable ? 0.7 : 1,
          })}
        >
          {/* Icon column */}
          <View style={{ width: 28, alignItems: 'center' }}>
            {step.status === 'completed' ? (
              <CheckCircleIcon size={20} color={COLORS.successGreen} />
            ) : step.status === 'active' ? (
              <CircleDotIcon color={COLORS.primary} />
            ) : (
              <CircleEmptyIcon />
            )}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
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
              {step.isTappable && <ChevronRightSmallIcon />}
            </View>
            {step.sublabel && (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: step.sublabelColor
                    ? step.sublabelColor
                    : step.isTappable
                    ? COLORS.primary
                    : COLORS.secondaryText,
                  lineHeight: 18,
                  marginTop: 2,
                }}
              >
                {step.sublabel}
              </Text>
            )}
          </View>
        </Pressable>
      );
    })}
  </View>
);

// ─────────────────────────────────────────────
// DEMO PHOTOS — fallback used when job.photo_urls is empty
// @demo picsum placeholders — replace with real Supabase storage URLs
// @backend job.photo_urls is string[] of signed URLs from the job-photos bucket
// ─────────────────────────────────────────────

const DEMO_PHOTOS = [
  'https://picsum.photos/seed/repair1/800/600',
  'https://picsum.photos/seed/repair2/800/600',
  'https://picsum.photos/seed/repair3/800/600',
];

// ─────────────────────────────────────────────
// TRADE + LICENSED PILL
// ─────────────────────────────────────────────

const TradePill: React.FC<{ trade: string; isLicensed: boolean }> = ({ trade, isLicensed }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: COLORS.tagBg,
      borderRadius: 10,
      gap: 4,
    }}
  >
    <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.tagText, lineHeight: 16 }}>
      {trade}
    </Text>
    {isLicensed && (
      <>
        <Text style={{ fontSize: 12, color: COLORS.tagText, lineHeight: 16 }}>·</Text>
        <ShieldCheckIcon />
        <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.tagText, lineHeight: 16 }}>
          Licensed
        </Text>
      </>
    )}
  </View>
);

// ─────────────────────────────────────────────
// BID CARD COMPONENT
// ─────────────────────────────────────────────

const BidCard: React.FC<{
  bid: BidWithProfile;
  onAccept: () => void;
  onCounter: () => void;
  onReject: () => void;
  onMessage: () => void;
}> = ({ bid, onAccept, onCounter, onReject, onMessage }) => (
  <View
    style={{
      padding: 16,
      backgroundColor: COLORS.background,
      borderRadius: 16,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
      gap: 12,
    }}
  >
    {/* Header: Avatar + Name/Company/Rating + Message Icon */}
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Avatar name={bid.name} color={bid.avatar_color} size={52} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.headingText, lineHeight: 24 }}>
          {bid.name}
        </Text>
        <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }} numberOfLines={1}>
          {bid.company}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.darkText, lineHeight: 20 }}>
            {bid.rating} <Text style={{ color: COLORS.starColor }}>★</Text>
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>•</Text>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
            {bid.response_time}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onMessage}
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
        {bid.has_unread_messages && (
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

    {/* Price */}
    <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.primary, lineHeight: 32, letterSpacing: 0.07 }}>
      {bid.price}
    </Text>

    {/* Message */}
    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.statText, lineHeight: 20 }}>
      {bid.message}
    </Text>

    {/* Tags: Trade pill + regular tags */}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      <TradePill trade={bid.trade ?? ''} isLicensed={bid.is_licensed} />
      {bid.tags.map((tag) => (
        <View key={tag} style={{ paddingHorizontal: 9, paddingVertical: 4, backgroundColor: COLORS.chipBg, borderRadius: 9999 }}>
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.statText, lineHeight: 16 }}>{tag}</Text>
        </View>
      ))}
    </View>

    {/* Action Buttons or Status Badge */}
    {bid.status === 'accepted' ? (
      <View
        style={{
          height: 36,
          borderRadius: 8,
          backgroundColor: '#F0FDF4',
          borderWidth: 0.68,
          borderColor: '#16A34A',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
        }}
      >
        <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
          <Path d="M3 8L6.5 11.5L13 4.5" stroke="#16A34A" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#16A34A', lineHeight: 20 }}>Awarded</Text>
      </View>
    ) : bid.status === 'rejected' ? (
      <View
        style={{
          height: 36,
          borderRadius: 8,
          backgroundColor: '#FEF2F2',
          borderWidth: 0.68,
          borderColor: '#E7000B',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#E7000B', lineHeight: 20 }}>Not Selected</Text>
      </View>
    ) : bid.status === 'countered' ? (
      <View
        style={{
          height: 36,
          borderRadius: 8,
          backgroundColor: '#FFFBEB',
          borderWidth: 0.68,
          borderColor: '#D97706',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#D97706', lineHeight: 20 }}>Counter Sent — Waiting</Text>
      </View>
    ) : (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          onPress={onAccept}
          style={({ pressed }) => ({
            flex: 1, height: 36, paddingHorizontal: 16,
            backgroundColor: COLORS.primary, borderRadius: 8,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20, textAlign: 'center' }}>Accept</Text>
        </Pressable>
        <Pressable
          onPress={onCounter}
          style={({ pressed }) => ({
            flex: 1, height: 36, paddingHorizontal: 16,
            backgroundColor: COLORS.background, borderRadius: 8,
            borderWidth: 0.68, borderColor: COLORS.primary,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20, textAlign: 'center' }}>Counter</Text>
        </Pressable>
        <Pressable
          onPress={onReject}
          style={({ pressed }) => ({
            flex: 1, height: 36, paddingHorizontal: 16,
            backgroundColor: COLORS.background, borderRadius: 8,
            borderWidth: 0.68, borderColor: COLORS.rejectRed,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.rejectRed, lineHeight: 20, textAlign: 'center' }}>Reject</Text>
        </Pressable>
      </View>
    )}
  </View>
);

const SORT_OPTIONS = ['Recommended', 'Lowest Price', 'Highest Rated', 'Fastest Response'];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const RepairJobDetails: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RepairJobDetailsRouteProp>();
  const insets = useSafeAreaInsets();

  // S157b — route param is now jobId (CLAUDE.md rule), live fetch via useJob.
  // S176 — bid handlers now call live mutations (useAcceptBid/useCounterBid/
  // useRejectBid). Local `job` state remains: ~50 JSX consumer sites depend on
  // it, and the optimistic setJob calls inside each handler give instant UX
  // while query invalidation reconciles to server truth shortly after.
  // @cleanup — local job state can be removed when all setJob() callers are
  //   eliminated and JSX migrates to read jobData/liveBids directly. Tracked
  //   as a follow-up to ATL-BID-ACTIONS-01 (see ATLASIO_CONTEXT.md S177).
  const { jobId } = route.params;
  const { data: jobData, isLoading: isLoadingJob } = useJob(jobId);
  const { data: liveBids } = useJobBids(jobId);
  useRealtimeBids(jobId);

  // S176 — live bid action mutations
  const acceptBid = useAcceptBid();
  const counterBid = useCounterBid();
  const rejectBid = useRejectBid();

  const [job, setJob] = useState<JobWithBidProfiles | null>(null);
  // Photos shown in strip + lightbox — signed URLs generated from private bucket paths.
  // Falls back to DEMO_PHOTOS when the job has no uploaded photos.
  const [displayPhotos, setDisplayPhotos] = useState<string[]>(DEMO_PHOTOS);
  const [selectedSort, setSelectedSort] = useState('Recommended');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  // Photo lightbox state — feeds <PhotoLightbox> rendered below
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const { showBanner: showVerifyBanner, level: verifyLevel } = useVerificationGate();

  // S171 — ATL-LOCATION-03: nearby contractors lookup.
  // Cast via 'as any' per CLAUDE.md Known Type Gaps pattern — job_lat/job_lng
  // not yet on Job interface (cleanup: dedicated session).
  // Ships dark until ATL-GEOCODE-01 writes coords on job creation.
  // @demo TODO(ATL-GEOCODE-01): showNearbyNudge always false until geocoding wired
  const jobLat = (jobData as any)?.job_lat as number | null | undefined;
  const jobLng = (jobData as any)?.job_lng as number | null | undefined;
  const { data: nearbyContractors } = useContractorsForJob(jobLat, jobLng);
  const nearbyCount = nearbyContractors?.length ?? 0;
  const showNearbyNudge = nearbyCount > 0 && jobLat != null && jobLng != null;

  // S175 — listen for InviteContractorsModal success signal.
  // Modal dismisses immediately on success; this surfaces the toast on this screen.
  // @backend useInviteContractors invalidates the repair-job query on success,
  //   so the bid list and counters refresh automatically — no extra refetch here.
  const { successMessage, showSuccess, clearSuccess } = useSuccessToast();
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      'atlasio.job.contractorsInvited',
      ({ jobId: inviteJobId, count }: { jobId: string; count: number }) => {
        if (inviteJobId !== jobId) return; // ignore other jobs' events
        showSuccess(`${count} invitation${count > 1 ? 's' : ''} sent`);
      },
    );
    return () => sub.remove();
  }, [jobId, showSuccess]);

  // Seed local job state when live fetch resolves
  useEffect(() => {
    if (jobData) {
      setJob({ ...jobData, bids: liveBids ?? [] } as JobWithBidProfiles);
    }
  }, [jobData, liveBids]);

  // Signed URL effect — private bucket, paths → fresh signed URLs on each mount
  useEffect(() => {
    const paths = job?.photo_urls;
    if (!paths || paths.length === 0) {
      setDisplayPhotos(DEMO_PHOTOS);
      return;
    }
    let cancelled = false;
    (async () => {
      const urls: string[] = [];
      for (const path of paths) {
        const { data, error } = await supabase.storage
          .from('job-photos')
          .createSignedUrl(path, 3600);
        if (error) {
          console.warn('[RepairJobDetails] createSignedUrl failed:', path, error.message);
          continue;
        }
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      if (!cancelled) setDisplayPhotos(urls.length > 0 ? urls : DEMO_PHOTOS);
    })();
    return () => { cancelled = true; };
  }, [job?.photo_urls]);

  // Safe bids derivation — keeps all downstream hooks (useMomentBanner, useRef,
  // useEffect) running consistently even during the loading window when `job`
  // is still null. Real loading guard moves to just before final return below.
  const bids: BidWithProfile[] = (job?.bids ?? []) as BidWithProfile[];

  // ─── E4: First bid received Tier 2 delight (S150) ──────────────────
  // Fires when the agent's job receives its very first bid — i.e. when
  // bids.length transitions from 0 to 1. Uses a ref to capture the
  // previous count so it only fires on the 0→1 edge, not on every
  // subsequent re-render.
  // @demo bids observed via setJob/liveBids composite — works with both
  // mock and live data paths.
  const {
    bannerConfig: firstBidBannerConfig,
    showBanner: showFirstBidBanner,
    clearBanner: clearFirstBidBanner,
  } = useMomentBanner();
  const prevBidsCountRef = useRef(bids.length);
  useEffect(() => {
    if (prevBidsCountRef.current === 0 && bids.length === 1) {
      showFirstBidBanner({
        icon: '📬',
        message: 'Your first bid just came in!',
        accentColor: COLORS.primary,
      });
    }
    prevBidsCountRef.current = bids.length;
  }, [bids.length, showFirstBidBanner]);
  const sortedBids = [...bids].sort((a, b) => {
    switch (selectedSort) {
      case 'Lowest Price':
        return (
          parseFloat(a.price.replace(/[^0-9.]/g, '')) -
          parseFloat(b.price.replace(/[^0-9.]/g, ''))
        );
      case 'Highest Rated':
        return b.rating - a.rating;
      case 'Fastest Response':
        return (a.response_time ?? '').localeCompare(b.response_time ?? '');
      default:
        return 0;
    }
  });

  // ── Derive job-level status from bid states ──
  const hasAcceptedBid = bids.some((b) => b.status === 'accepted');
  const effectiveJobStatus: JobStatus = (job?.status ?? (hasAcceptedBid ? 'in_progress' : 'open')) as JobStatus;
  const isJobAwarded = effectiveJobStatus !== 'draft' && effectiveJobStatus !== 'open';
  const acceptedBid = bids.find((b) => b.status === 'accepted');

  // ── Build timeline steps based on effective job status ──
  const getTimelineSteps = (): TimelineStep[] => {
    const awarded = isJobAwarded;
    const contractorLabel = acceptedBid?.name || 'Contractor';
    const amountLabel = acceptedBid?.price || '';

    const steps: TimelineStep[] = [
      {
        label: 'Bid Accepted',
        status: awarded ? 'completed' : 'pending',
        sublabel: awarded
          ? `${contractorLabel}${amountLabel ? ' · ' + amountLabel : ''}`
          : undefined,
      },
      {
        label: 'Work In Progress',
        status:
          effectiveJobStatus === 'in_progress'
            ? 'active'
            : effectiveJobStatus === 'awarded'
            ? 'active'
            : effectiveJobStatus === 'pending_completion' ||
              effectiveJobStatus === 'completed'
            ? 'completed'
            : 'pending',
        sublabel:
          effectiveJobStatus === 'in_progress' || effectiveJobStatus === 'awarded'
            ? `Due ${job?.due_date ?? ''}`
            : undefined,
      },
      {
        label: 'Completion Submitted',
        status:
          effectiveJobStatus === 'pending_completion' ||
          effectiveJobStatus === 'completed'
            ? 'completed'
            : 'pending',
      },
      {
        label: 'Confirmed & Closed',
        status:
          effectiveJobStatus === 'completed'
            ? 'completed'
            : effectiveJobStatus === 'pending_completion'
            ? 'active'
            : 'pending',
        sublabel:
          effectiveJobStatus === 'pending_completion'
            ? 'Tap to review & confirm'
            : undefined,
        isTappable: effectiveJobStatus === 'pending_completion',
      },
    ];

    return steps;
  };

  // Handle tapping the active timeline step → navigate to JobCompletionScreen
  const handleTimelineStepTap = (stepIndex: number) => {
    if (effectiveJobStatus === 'pending_completion' && stepIndex === 3) {
      navigation.navigate('JobCompletion', {
        jobId: job!.id,
        userRole: 'agent',
      });
    }
  };

  // @demo DEV: Open contractor view directly ──
  const handleOpenContractorView = () => {
    navigation.navigate('JobCompletion', {
      jobId: job!.id,
      userRole: 'contractor',
    });
  };

  // S171 — single entry point for opening invite modal.
  // Replaces inline setShowInviteModal(true) — used by action-menu + zero-bid nudge.
  const handleOpenInviteModal = () => setShowInviteModal(true);

  // Navigate to RepairChatScreen (job thread) for a specific bidder
  const handleOpenRepairChat = (bid: BidWithProfile) => {
    navigation.navigate('RepairChatScreen', {
      bidId: bid.id,
      bidderName: bid.name,
      bidderAvatarColor: bid.avatar_color,
      jobId: job!.id,
      jobTitle: job!.title,
    });
  };

  // ─────────────────────────────────────────────
  // BID ACTION STATE
  // ─────────────────────────────────────────────
  const [activeBidAction, setActiveBidAction] = useState<BidActionModal>(null);
  const [selectedBid, setSelectedBid] = useState<BidWithProfile | null>(null);
  const [counterAmount, setCounterAmount] = useState<string>('');
  const [counterError, setCounterError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const counterInputRef = useRef<TextInput>(null);

  const openBidAction = (action: BidActionModal, bid: BidWithProfile) => {
    setSelectedBid(bid);
    setActiveBidAction(action);
    setCounterAmount('');
    setCounterError('');
  };

  const closeBidAction = () => {
    if (isSubmitting) return;
    Keyboard.dismiss();
    setActiveBidAction(null);
    setSelectedBid(null);
    setCounterAmount('');
    setCounterError('');
  };

  useEffect(() => {
    if (activeBidAction === 'counter') {
      setTimeout(() => counterInputRef.current?.focus(), 300);
    }
  }, [activeBidAction]);

  // ─────────────────────────────────────────────
  // BID ACTION HANDLERS — S176 wired to live RPCs
  // Optimistic setJob preserved post-await so the timeline card flips
  // immediately; query invalidation reconciles to server truth.
  // CTAs disabled while isSubmitting to prevent double-tap.
  // ─────────────────────────────────────────────

  // @backend — useAcceptBid → rpc_accept_bid(p_bid_id, p_job_id)
  const handleAcceptBid = async () => {
    if (!selectedBid) return;
    setIsSubmitting(true);

    try {
      await acceptBid.mutateAsync({ bidId: selectedBid.id, jobId: job!.id });

      // Optimistic UI: update bid status + job status (server reconciles via invalidation)
      setJob(prev => prev ? ({
        ...prev,
        status: 'in_progress' as JobStatus,
        awarded_bid_id: selectedBid.id,
        bids: prev.bids.map(b =>
          b.id === selectedBid.id
            ? { ...b, status: 'accepted' as BidStatus }
            : { ...b, status: 'rejected' as BidStatus }
        ) as BidWithProfile[],
      }) : prev);

      closeBidAction();
    } catch (err: any) {
      Alert.alert('Failed to accept bid', err?.message ?? 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // @backend — useCounterBid → rpc_counter_bid(p_bid_id, p_job_id, p_counter_amount)
  const handleCounterBid = async () => {
    if (!selectedBid) return;

    const cleanedAmount = counterAmount.replace(/[^0-9.]/g, '');
    const counterCents = Math.round(parseFloat(cleanedAmount) * 100);
    const originalCents = priceToCents(selectedBid.price);

    if (!cleanedAmount || isNaN(counterCents) || counterCents <= 0) {
      setCounterError('Enter a valid amount');
      return;
    }
    if (counterCents >= originalCents) {
      setCounterError(`Must be less than ${selectedBid.price}`);
      return;
    }
    if (counterCents < 5000) {
      setCounterError('Minimum counter is $50');
      return;
    }

    setIsSubmitting(true);

    try {
      await counterBid.mutateAsync({
        bidId: selectedBid.id,
        jobId: job!.id,
        counterAmount: counterCents,
      });

      setJob(prev => prev ? ({
        ...prev,
        bids: prev.bids.map(b =>
          b.id === selectedBid.id
            ? { ...b, status: 'countered' as BidStatus, counter_amount: counterCents }
            : b
        ) as BidWithProfile[],
      }) : prev);

      closeBidAction();
    } catch (err: any) {
      Alert.alert('Failed to send counter offer', err?.message ?? 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // @backend — useRejectBid → rpc_reject_bid(p_bid_id, p_job_id)
  const handleRejectBid = async () => {
    if (!selectedBid) return;
    setIsSubmitting(true);

    try {
      await rejectBid.mutateAsync({ bidId: selectedBid.id, jobId: job!.id });

      setJob(prev => prev ? ({
        ...prev,
        bids: prev.bids.map(b =>
          b.id === selectedBid.id
            ? { ...b, status: 'rejected' as BidStatus }
            : b
        ) as BidWithProfile[],
      }) : prev);

      closeBidAction();
    } catch (err: any) {
      Alert.alert('Failed to reject bid', err?.message ?? 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading guard — placed after all hook calls to comply with rules of hooks.
  // All useState/useEffect/useRef/useMemo above run every render; JSX branches here.
  if (isLoadingJob || !job) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // S172 — `budget_range` may be null on jobs created via the new wizard
  // (PostJobWizard sends min/max but no formatted range). Fall back to formatting
  // budget_min/budget_max here so the row never renders blank. Mirrors
  // AgentJobDetailScreen.tsx pattern.
  const budgetDisplay =
    job.budget_range ??
    (job.budget_min != null && job.budget_max != null
      ? `$${job.budget_min.toLocaleString()}–$${job.budget_max.toLocaleString()}`
      : 'Not set');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* HEADER */}
      <View
        style={{
          paddingTop: 8 + insets.top,
          paddingHorizontal: 8,
          paddingBottom: 12,
          backgroundColor: COLORS.background,
          borderBottomWidth: 0.68,
          borderBottomColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Back button — fixed width so title centering is symmetric */}
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <BackIcon />
        </Pressable>

        {/* Title — flex:1 fills remaining space, text centered within it */}
        <Text
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: '500',
            color: COLORS.darkText,
            lineHeight: 24,
            textAlign: 'center',
            paddingHorizontal: 8,
          }}
          numberOfLines={1}
        >
          {job.title}
        </Text>

        {/* More icon — fixed width matches back button for symmetric layout */}
        <Pressable
          onPress={() => setShowActionMenu(true)}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <MoreIcon />
        </Pressable>
      </View>

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) }}
      >
        {/* Job Info Card */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <View
            style={{
              padding: 16,
              backgroundColor: COLORS.background,
              borderRadius: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
              gap: 12,
            }}
          >
            {/* Row 1 — pills: category + due date + explicit urgency label */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {job.category && (
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.infoBg, borderRadius: 9999 }}>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.primary, lineHeight: 16 }}>
                    {job.category}
                  </Text>
                </View>
              )}
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: COLORS.chipBg, borderRadius: 9999 }}>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.statText, lineHeight: 16 }}>
                  {job.due_date}
                </Text>
              </View>
              {job.is_urgent && (
                <DisplayTag label="URGENT" variant="error" fontSize={12} />
              )}
            </View>

            {/* Row 2 — address + budget */}
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                Budget:{' '}
                <Text style={{ fontWeight: '500', color: COLORS.headingText }}>{budgetDisplay}</Text>
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                {job.address}
              </Text>
            </View>

            {/* Row 3 — job-type specific fields */}
            {job.job_type === 'repair' && (
              <View style={{ gap: 12 }}>
                {/* @demo trades null for existing mock jobs — chip row only renders when populated */}
                {(job.trades ?? []).length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.secondaryText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Trades
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {(job.trades ?? []).map((trade, i) => (
                        <DisplayTag key={`${i}-${trade}`} label={trade} variant="default" />
                      ))}
                    </View>
                  </View>
                )}
                {job.bid_deadline && (
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                    Bids due:{' '}
                    <Text style={{ fontWeight: '500', color: COLORS.headingText }}>
                      {new Date(job.bid_deadline).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </Text>
                  </Text>
                )}
              </View>
            )}

            {job.job_type === 'photography' && (
              <View style={{ gap: 12 }}>
                {(job.service_packages ?? []).length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.secondaryText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Service Packages
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {(job.service_packages ?? []).map((pkg, i) => (
                        <DisplayTag key={`${i}-${pkg}`} label={pkg} variant="ghost" />
                      ))}
                    </View>
                  </View>
                )}
                {job.turnaround_preference && (
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                    Turnaround:{' '}
                    <Text style={{ fontWeight: '500', color: COLORS.headingText }}>{job.turnaround_preference}</Text>
                  </Text>
                )}
                {job.sqft != null && (
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                    Approx.{' '}
                    <Text style={{ fontWeight: '500', color: COLORS.headingText }}>{job.sqft.toLocaleString()} sq ft</Text>
                  </Text>
                )}
              </View>
            )}

            {job.job_type === 'staging' && (
              <View style={{ gap: 12 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  {job.occupied_or_vacant && (
                    <DisplayTag
                      label={job.occupied_or_vacant.charAt(0).toUpperCase() + job.occupied_or_vacant.slice(1)}
                      variant="default"
                    />
                  )}
                  {job.rooms_count != null && (
                    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                      <Text style={{ fontWeight: '500', color: COLORS.headingText }}>{job.rooms_count} rooms</Text>
                    </Text>
                  )}
                </View>
                {(job.staging_scope ?? []).length > 0 && (
                  <View style={{ gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.secondaryText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Staging Scope
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {(job.staging_scope ?? []).map((room, i) => (
                        <DisplayTag key={`${i}-${room}`} label={room} variant="ghost" />
                      ))}
                    </View>
                  </View>
                )}
                {job.sqft != null && (
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                    Approx.{' '}
                    <Text style={{ fontWeight: '500', color: COLORS.headingText }}>{job.sqft.toLocaleString()} sq ft</Text>
                  </Text>
                )}
              </View>
            )}

            {/* Row 4 — description */}
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.statText, lineHeight: 20 }}>
              {job.description}
            </Text>
          </View>

          {/* Photo strip — tappable thumbnails → PhotoLightbox */}
          {displayPhotos.length > 0 && (
            <View style={{ marginHorizontal: -16, marginTop: 12 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 4 }}
              >
                {displayPhotos.map((uri, index) => (
                  <Pressable
                    key={`${index}-${uri}`}
                    onPress={() => {
                      setLightboxIndex(index);
                      setLightboxVisible(true);
                    }}
                    style={({ pressed }) => ({
                      width: 88,
                      height: 88,
                      borderRadius: 8,
                      overflow: 'hidden',
                      backgroundColor: COLORS.chipBg,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Image source={{ uri }} style={{ width: 88, height: 88 }} resizeMode="cover" />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ═══ STATUS TIMELINE (visible only after a bid is accepted) ═══ */}
        {isJobAwarded && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <View
              style={{
                backgroundColor: COLORS.background,
                borderRadius: 14,
                borderWidth: 0.68,
                borderColor: COLORS.cardBorder,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 3,
                elevation: 2,
                padding: 16,
              }}
            >
              {/* Header row: title + dev action icons */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: COLORS.darkText,
                    lineHeight: 24,
                  }}
                >
                  Job Progress
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {/* Contractor View — hard hat / wrench icon */}
                  <Pressable
                    onPress={handleOpenContractorView}
                    hitSlop={6}
                    style={({ pressed }) => ({
                      width: 30,
                      height: 30,
                      borderRadius: 9999,
                      backgroundColor: COLORS.infoBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                      <Path d="M9.67 6.33L14 2" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M11.33 4.67L13.17 6.5" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M8.33 7.67L2.83 13.17C2.5 13.5 2 13.5 1.67 13.17V13.17C1.33 12.83 1.33 12.33 1.67 12L7.17 6.5" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                  </Pressable>
                </View>
              </View>
              <JobStatusTimeline
                steps={getTimelineSteps()}
                onTapStep={handleTimelineStepTap}
              />
            </View>
          </View>
        )}

        {/* ── Verification Banner ── */}
        {showVerifyBanner && !verifyBannerDismissed && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
            <VerificationBanner
              level={verifyLevel}
              role="agent"
              onPress={() => navigation.dispatch(
                CommonActions.navigate({ name: 'Profile', params: { screen: 'Verification' } }),
              )}
              onDismiss={() => setVerifyBannerDismissed(true)}
            />
          </View>
        )}

        {/* Bids Section */}
        <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 12 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.headingText,
                lineHeight: 24,
              }}
            >
              {`Bids Received (${job.bids.length})`}
            </Text>
            <Pressable
              onPress={() => setShowSortDropdown(true)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingLeft: 12,
                paddingRight: 8,
                height: 33,
                backgroundColor: COLORS.background,
                borderRadius: 9999,
                borderWidth: 0.68,
                borderColor: COLORS.inputBorder,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '400',
                  color: COLORS.statText,
                  lineHeight: 20,
                }}
              >
                {selectedSort}
              </Text>
              <ChevronDownIcon />
            </Pressable>
          </View>

          {effectiveJobStatus === 'open' && sortedBids.length === 0 ? (
            /* ── Empty State — S149a — only when job is still open and has no bids ── */
            /* S171: zero-bid nearby-contractors nudge stacks below empty state when surfaced */
            <View style={{ gap: 12 }}>
              <EmptyState
                illustration="job_bids"
                title="No bids yet"
                body="Your job is live. Bids will appear here once contractors respond."
                compact
                style={{ flex: 0 }}
              />
              {showNearbyNudge && (
                <Pressable
                  onPress={handleOpenInviteModal}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: COLORS.backgroundInfo,
                    borderRadius: 10,
                    borderLeftWidth: 3,
                    borderLeftColor: COLORS.primary,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: COLORS.darkText,
                    lineHeight: 20,
                  }}>
                    {nearbyCount} contractor{nearbyCount !== 1 ? 's' : ''} work near this job
                  </Text>
                  <Text style={{
                    fontSize: 14,
                    color: COLORS.primary,
                    marginTop: 4,
                    lineHeight: 20,
                  }}>
                    Invite Contractors →
                  </Text>
                </Pressable>
              )}
            </View>
          ) : (
            sortedBids.map((bid) => (
              <BidCard
                key={bid.id}
                bid={bid}
                onAccept={() => openBidAction('accept', bid)}
                onCounter={() => openBidAction('counter', bid)}
                onReject={() => openBidAction('reject', bid)}
                onMessage={() => handleOpenRepairChat(bid)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Sort Dropdown Modal */}
      <Modal
        visible={showSortDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortDropdown(false)}
      >
        <Pressable
          onPress={() => setShowSortDropdown(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 280,
              backgroundColor: COLORS.background,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>
                Sort by
              </Text>
            </View>
            {SORT_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  setSelectedSort(option);
                  setShowSortDropdown(false);
                }}
                activeOpacity={0.7}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  backgroundColor: selectedSort === option ? '#F4F7FF' : COLORS.background,
                  borderBottomWidth: index < SORT_OPTIONS.length - 1 ? 1 : 0,
                  borderBottomColor: COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: selectedSort === option ? '600' : '400',
                    color: selectedSort === option ? COLORS.primary : COLORS.bodyText,
                  }}
                >
                  {option}
                </Text>
                {selectedSort === option && <CheckIcon />}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Action Menu Modal (three-dot) */}
      <Modal
        visible={showActionMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowActionMenu(false)}
      >
        <Pressable
          onPress={() => setShowActionMenu(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 280,
              backgroundColor: COLORS.background,
              borderRadius: 14,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={() => {
                setShowActionMenu(false);
                navigation.navigate('EditRepairJob', { jobId: job.id });
              }}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderBottomWidth: 0.69,
                borderBottomColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <EditIcon />
              <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.headingText, lineHeight: 24 }}>
                Edit Job
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowActionMenu(false);
                handleOpenInviteModal();
              }}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                borderBottomWidth: 0.69,
                borderBottomColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Path d="M10.67 14V12.67C10.67 11.96 10.39 11.28 9.89 10.78C9.39 10.28 8.71 10 8 10H4C3.29 10 2.61 10.28 2.11 10.78C1.61 11.28 1.33 11.96 1.33 12.67V14" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M6 7.33A2.67 2.67 0 1 0 6 2a2.67 2.67 0 0 0 0 5.33Z" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
                <Path d="M13.33 5.33V9.33" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" />
                <Path d="M11.33 7.33H15.33" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" />
              </Svg>
              <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.headingText, lineHeight: 24 }}>
                Invite Contractor
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowActionMenu(false);
                Alert.alert(
                  'Cancel Job',
                  'Are you sure you want to cancel this repair job? Contractors will be notified.',
                  [
                    { text: 'Keep Job', style: 'cancel' },
                    {
                      text: 'Cancel Job',
                      style: 'destructive',
                      onPress: () => {
                        console.log('Cancel job:', job.id);
                        navigation.goBack();
                      },
                    },
                  ]
                );
              }}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                <Path d="M4 4L12 12" stroke={COLORS.rejectRed} strokeWidth={1.33} strokeLinecap="round" />
                <Path d="M12 4L4 12" stroke={COLORS.rejectRed} strokeWidth={1.33} strokeLinecap="round" />
              </Svg>
              <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.rejectRed, lineHeight: 24 }}>
                Cancel Job
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <InviteContractorsModal
        visible={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        jobId={job.id}
        jobTitle={job.title}
        jobCategory={job.category ?? ''}
        jobTrades={job.trades}
        nearbyContractors={nearbyContractors}
      />

      {/* ═══════════════════════════════════════════════════════════════
          ACCEPT BID MODAL
          ═══════════════════════════════════════════════════════════════ */}
      <Modal
        visible={activeBidAction === 'accept'}
        transparent
        animationType="fade"
        onRequestClose={closeBidAction}
      >
        <Pressable
          onPress={closeBidAction}
          style={{
            flex: 1,
            backgroundColor: COLORS.overlayDark,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 360,
              backgroundColor: COLORS.background,
              borderRadius: 24,
              overflow: 'hidden',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.1,
              shadowRadius: 25,
              elevation: 10,
            }}
          >
            <View
              style={{
                height: 56,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24, textAlign: 'center' }}>
                Accept Bid
              </Text>
              <Pressable
                onPress={closeBidAction}
                hitSlop={8}
                style={({ pressed }) => ({
                  position: 'absolute',
                  right: 16,
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                  <Path d="M5 5L15 15" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
                  <Path d="M15 5L5 15" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>

            <View style={{ padding: 24, gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={selectedBid?.name || ''} color={selectedBid?.avatar_color || '#CCC'} size={56} />
                <View style={{ flex: 1, gap: 0 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
                    {selectedBid?.name}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: '400', color: '#666666', lineHeight: 20 }}>
                    {selectedBid?.company}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  backgroundColor: COLORS.tagBg,
                  borderRadius: 16,
                  paddingTop: 16,
                  paddingLeft: 16,
                  paddingRight: 16,
                  paddingBottom: 16,
                  gap: 4,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '400', color: '#666666', lineHeight: 20 }}>
                  Bid Amount
                </Text>
                <Text style={{ fontSize: 30, fontWeight: '700', color: COLORS.primary, lineHeight: 36, letterSpacing: 0.4 }}>
                  {selectedBid?.price}
                </Text>
              </View>

              <InfoBanner size="sm">
                By accepting this bid, you{"'"}ll mark this job as in progress and notify {selectedBid?.name} to begin work. You can continue to communicate through the job chat.
              </InfoBanner>
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingHorizontal: 24,
                paddingTop: 16,
                paddingBottom: 24,
              }}
            >
              <Pressable
                onPress={closeBidAction}
                disabled={isSubmitting}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 8,
                  borderWidth: 1.35,
                  borderColor: 'rgba(0, 0, 0, 0.1)',
                  backgroundColor: COLORS.background,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20, textAlign: 'center' }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleAcceptBid}
                disabled={isSubmitting}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  opacity: isSubmitting ? 0.7 : pressed ? 0.85 : 1,
                })}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20, textAlign: 'center' }}>
                    Accept Bid
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          COUNTER BID MODAL
          ═══════════════════════════════════════════════════════════════ */}
      <Modal
        visible={activeBidAction === 'counter'}
        transparent
        animationType="fade"
        onRequestClose={closeBidAction}
      >
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: COLORS.overlayDark }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={-40}
        >
          <Pressable
            onPress={closeBidAction}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 24,
            }}
          >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 340,
              backgroundColor: COLORS.background,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 56,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24, textAlign: 'center' }}>
                Counter Offer
              </Text>
              <Pressable
                onPress={closeBidAction}
                hitSlop={8}
                style={({ pressed }) => ({
                  position: 'absolute',
                  right: 16,
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                  <Path d="M5 5L15 15" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
                  <Path d="M15 5L5 15" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 24, paddingVertical: 20, gap: 16 }}>
              <View
                style={{
                  backgroundColor: COLORS.warningBg,
                  borderRadius: 10,
                  padding: 12,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.warningText, lineHeight: 18 }}>
                  Original bid
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.warningText, lineHeight: 24 }}>
                  {selectedBid?.price}
                </Text>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.headingText, lineHeight: 20 }}>
                  Your counter amount
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 48,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: counterError ? COLORS.rejectRed : COLORS.inputBorder,
                    paddingHorizontal: 14,
                    backgroundColor: COLORS.background,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.headingText, marginRight: 4 }}>
                    $
                  </Text>
                  <TextInput
                    ref={counterInputRef}
                    value={counterAmount}
                    onChangeText={(text) => {
                      setCounterAmount(text.replace(/[^0-9.]/g, ''));
                      setCounterError('');
                    }}
                    placeholder="0"
                    placeholderTextColor={COLORS.lightText}
                    keyboardType="numeric"
                    style={{
                      flex: 1,
                      fontSize: 18,
                      fontWeight: '600',
                      color: COLORS.headingText,
                      paddingVertical: 0,
                    }}
                    returnKeyType="done"
                    onSubmitEditing={handleCounterBid}
                  />
                </View>
                {counterError ? (
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.rejectRed, lineHeight: 16 }}>
                    {counterError}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>
                    Must be less than the original bid. Max 3 counters per bid.
                  </Text>
                )}
              </View>
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingHorizontal: 24,
                paddingBottom: 24,
                paddingTop: 4,
              }}
            >
              <Pressable
                onPress={closeBidAction}
                disabled={isSubmitting}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  borderWidth: 0.68,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.bodyText, lineHeight: 22 }}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                onPress={handleCounterBid}
                disabled={isSubmitting}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: COLORS.counterAmber,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  opacity: isSubmitting ? 0.7 : pressed ? 0.85 : 1,
                })}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', lineHeight: 24 }}>
                    Send Counter
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════
          REJECT BID MODAL
          ═══════════════════════════════════════════════════════════════ */}
      <Modal
        visible={activeBidAction === 'reject'}
        transparent
        animationType="fade"
        onRequestClose={closeBidAction}
      >
        <Pressable
          onPress={closeBidAction}
          style={{
            flex: 1,
            backgroundColor: COLORS.overlayDark,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 340,
              backgroundColor: COLORS.background,
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: 56,
                paddingHorizontal: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24, textAlign: 'center' }}>
                Reject Bid
              </Text>
              <Pressable
                onPress={closeBidAction}
                hitSlop={8}
                style={({ pressed }) => ({
                  position: 'absolute',
                  right: 16,
                  width: 32,
                  height: 32,
                  borderRadius: 9999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
                  <Path d="M5 5L15 15" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
                  <Path d="M15 5L5 15" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
                </Svg>
              </Pressable>
            </View>

            <View style={{ paddingHorizontal: 24, paddingVertical: 20, gap: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  backgroundColor: COLORS.screenBg,
                  borderRadius: 10,
                }}
              >
                <Avatar name={selectedBid?.name || ''} color={selectedBid?.avatar_color || '#CCC'} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.headingText, lineHeight: 20 }}>
                    {selectedBid?.name}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 18 }}>
                    {selectedBid?.company}
                  </Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, lineHeight: 24 }}>
                  {selectedBid?.price}
                </Text>
              </View>

              <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 18 }}>
                {selectedBid?.name} will be notified that their bid was not selected. This action cannot be undone.
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingHorizontal: 24,
                paddingBottom: 24,
                paddingTop: 4,
              }}
            >
              <Pressable
                onPress={closeBidAction}
                disabled={isSubmitting}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  borderWidth: 0.68,
                  borderColor: COLORS.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.bodyText, lineHeight: 22 }}>
                  Keep Bid
                </Text>
              </Pressable>
              <Pressable
                onPress={handleRejectBid}
                disabled={isSubmitting}
                style={({ pressed }) => ({
                  flex: 1,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: COLORS.rejectRed,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  opacity: isSubmitting ? 0.7 : pressed ? 0.85 : 1,
                })}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', lineHeight: 24 }}>
                    Reject Bid
                  </Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Photo Lightbox — full-screen swipeable viewer, mounted outside ScrollView */}
      <PhotoLightbox
        visible={lightboxVisible}
        photos={displayPhotos}
        initialIndex={lightboxIndex}
        onClose={() => setLightboxVisible(false)}
      />

      {/* E4: First bid received banner (S150) */}
      <MomentBanner
        visible={firstBidBannerConfig !== null}
        icon={firstBidBannerConfig?.icon ?? ''}
        message={firstBidBannerConfig?.message ?? ''}
        accentColor={firstBidBannerConfig?.accentColor}
        onDismiss={clearFirstBidBanner}
      />
      {/* S175 — invitation success toast (cross-screen signal from modal) */}
      {successMessage ? (
        <SuccessToast message={successMessage} onDismiss={clearSuccess} />
      ) : null}
    </View>
  );
};

export default RepairJobDetails;
