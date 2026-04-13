// ═══════════════════════════════════════════════════════════════
// InviteToJobModal.tsx — Invite Contractor to Repair Job (706 lines)
// 2-step flow:
//   Step 1: Bottom sheet — contractor card + Invite to Existing / Create New
//   Step 2: Full-screen job selector — search, selectable job cards, message, send
//
// Entry points: FindTab, NetworkTab, ProProfile (contractor cards)
//
// @demo  Mock job list for selector, console.log on send
// @backend TODO: rpc_invite_to_job(jobId, contractorId, message?)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchField from './SearchField';
import ConfirmationModal from './ConfirmationModal';
import { Avatar } from './shared';

// ─────────────────────────────────────────────
// DESIGN TOKENS (Figma-exact)
// ─────────────────────────────────────────────
const COLORS = {
  primary: '#003DC3',
  darkText: '#1C1C1E',
  secondaryText: '#666666',
  metaText: '#707070',
  bodyText: '#54545A',
  border: '#E5E7EB',
  cardBorder: '#F3F4F6',
  inputBg: '#F9FAFB',
  screenBg: '#F7F7FC',
  background: '#FFFFFF',
  pillBg: '#F4F7FF',
  overlay: 'rgba(0,0,0,0.5)',
  // Status colors
  statusOpen: '#16A34A',
  statusOpenBg: '#ECFDF5',
  statusBidding: '#F59E0B',
  statusBiddingBg: '#FFF7ED',
  statusInProgress: '#003DC3',
  statusInProgressBg: '#F4F7FF',
  // Invite capacity
  inviteFull: '#E7000B',
  progressTrack: '#E5E7EB',
  // Selection ring
  selectionRing: 'rgba(0, 61, 195, 0.10)',
} as const;

// ─────────────────────────────────────────────
// TYPES — backend-ready interfaces
// ─────────────────────────────────────────────
export interface InviteContractor {
  id: string;
  name: string;
  company: string;
  role: string;
  avatarColor: string;
  /** Contractor's trade specialties — used to highlight matching trades on job cards */
  trades?: string[];
}

export interface InviteJob {
  id: string;
  title: string;
  status: 'open' | 'bidding' | 'in_progress';
  dueDate: string;
  trades: string[];
  invitesSent: number;
  maxInvites: number;
  bidCount: number;
}

interface InviteToJobModalProps {
  visible: boolean;
  onClose: () => void;
  contractor: InviteContractor;
  /** Agent's active jobs — TODO: replace with TanStack Query hook */
  jobs?: InviteJob[];
  /** Navigate to PostJobWizard with contractor pre-attached */
  onCreateNewJob?: () => void;
  /** Callback after successful invite — invalidate queries, show toast, etc. */
  onInviteSent?: (jobId: string, contractorId: string, message?: string) => void;
}

// ─────────────────────────────────────────────
// MOCK DATA — remove when wiring backend
// ─────────────────────────────────────────────
const MOCK_JOBS: InviteJob[] = [
  { id: 'j1', title: 'Kitchen Renovation – 456 Oak St', status: 'bidding', dueDate: 'Mar 15, 2026', trades: ['Electrical', 'Plumbing', 'Carpentry'], invitesSent: 2, maxInvites: 5, bidCount: 3 },
  { id: 'j2', title: 'Roof Repair – 789 Maple Ave', status: 'open', dueDate: 'Mar 22, 2026', trades: ['Roofing', 'HVAC'], invitesSent: 0, maxInvites: 5, bidCount: 0 },
  { id: 'j3', title: 'Bathroom Remodel – 123 Pine Dr', status: 'in_progress', dueDate: 'Apr 5, 2026', trades: ['Plumbing', 'Electrical'], invitesSent: 4, maxInvites: 5, bidCount: 5 },
  { id: 'j4', title: 'HVAC Install – 321 Elm Blvd', status: 'open', dueDate: 'Apr 12, 2026', trades: ['HVAC'], invitesSent: 5, maxInvites: 5, bidCount: 0 },
];

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackArrowIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
    <Path d="M11 4.58L4.58 11L11 17.42" stroke="#1C1C1E" strokeWidth={1.83} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CloseIcon: React.FC<{ color?: string; size?: number }> = ({ color = '#54545A', size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M4 4L12 12M12 4L4 12" stroke={color} strokeWidth={1.33} strokeLinecap="round" />
  </Svg>
);

const ClockIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Circle cx={6} cy={6} r={5} stroke="#707070" strokeWidth={1} />
    <Path d="M6 3V7L8 8" stroke="#707070" strokeWidth={1} strokeLinecap="round" />
  </Svg>
);

const CheckboxCheckedIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Rect x={1.67} y={1.67} width={16.66} height={16.66} rx={3} fill="#F4F7FF" stroke="#003DC3" strokeWidth={1.67} />
    <Path d="M7.5 10L9.17 11.67L12.5 6.67" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Invite icons (from Figma bottom sheet)
const InviteExistingIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M16.5 1.5L8.25 9.75" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16.5 1.5L11.25 16.5L8.25 9.75L1.5 6.75L16.5 1.5Z" stroke="white" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CreateNewIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Rect x={1.5} y={1.5} width={15} height={15} rx={2} stroke="#003DC3" strokeWidth={1.5} />
    <Path d="M9 5V13M5 9H13" stroke="#003DC3" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const SendInviteIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Rect x={1.33} y={1.33} width={13.33} height={13.33} rx={2} stroke="white" strokeWidth={1.33} />
    <Path d="M7.27 1.43L14.56 1.43L14.56 8.72" stroke="white" strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Close button for bottom sheet (Figma: X icon inside circle)
const SheetCloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 5L15 15M15 5L5 15" stroke="#4A5565" strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// STATUS PILL — Figma-exact colors per status
// ─────────────────────────────────────────────
const StatusPill: React.FC<{ status: InviteJob['status'] }> = ({ status }) => {
  const config = {
    open: { label: 'Open', bg: COLORS.statusOpenBg, color: COLORS.statusOpen },
    bidding: { label: 'Bidding', bg: COLORS.statusBiddingBg, color: COLORS.statusBidding },
    in_progress: { label: 'In Progress', bg: COLORS.statusInProgressBg, color: COLORS.statusInProgress },
  }[status];

  return (
    <View style={{ backgroundColor: config.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ fontSize: 12, fontWeight: '500', color: config.color, lineHeight: 16, letterSpacing: 0.06 }}>{config.label}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// INVITE PROGRESS BAR — shows invite capacity
// ─────────────────────────────────────────────
const InviteProgressBar: React.FC<{ sent: number; max: number }> = ({ sent, max }) => {
  const isFull = sent >= max;
  const fillWidth = max > 0 ? (sent / max) * 80 : 0;
  const barColor = isFull ? COLORS.inviteFull : COLORS.primary;
  const textColor = isFull ? COLORS.inviteFull : COLORS.bodyText;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 80, height: 4, backgroundColor: COLORS.progressTrack, borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ width: fillWidth, height: 4, backgroundColor: barColor, borderRadius: 2 }} />
      </View>
      <Text style={{ fontSize: 12, fontWeight: '500', color: textColor, lineHeight: 16 }}>
        {`Invites: ${sent}/${max}`}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// JOB CARD — selectable card for Step 2
// ─────────────────────────────────────────────
const JobCard: React.FC<{
  job: InviteJob;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
  contractorTrades?: string[];
}> = ({ job, isSelected, isDisabled, onSelect, contractorTrades = [] }) => {
  const isFull = job.invitesSent >= job.maxInvites;
  const contractorTradesLower = contractorTrades.map((t) => t.toLowerCase());

  return (
    <Pressable
      onPress={isDisabled ? undefined : onSelect}
      style={({ pressed }) => ({
        opacity: isDisabled ? 0.5 : pressed ? 0.95 : 1,
        backgroundColor: COLORS.background,
        borderRadius: 14,
        padding: 15,
        gap: 12,
        borderWidth: 1.35,
        borderColor: isSelected ? COLORS.primary : COLORS.cardBorder,
        // Selection ring shadow
        ...(isSelected ? {
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        } : {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
        }),
      })}
    >
      {/* Row 1: Title + checkbox */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }} numberOfLines={1}>
          {job.title}
        </Text>
        {isSelected && <CheckboxCheckedIcon />}
      </View>

      {/* Row 2: Status pill + due date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <StatusPill status={job.status} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <ClockIcon />
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.metaText, lineHeight: 16 }}>
            {`Due ${job.dueDate}`}
          </Text>
        </View>
      </View>

      {/* Row 3: Trade pills — matching trades get highlight border */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {job.trades.map((trade) => {
          const isMatch = contractorTradesLower.length > 0 && contractorTradesLower.includes(trade.toLowerCase());
          return (
            <View
              key={trade}
              style={{
                backgroundColor: COLORS.pillBg,
                borderRadius: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderWidth: isMatch ? 1.35 : 0,
                borderColor: isMatch ? COLORS.primary : 'transparent',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: isMatch ? '500' : '400', color: COLORS.primary, lineHeight: 16, letterSpacing: 0.06 }}>{trade}</Text>
            </View>
          );
        })}
      </View>

      {/* Row 4: Progress bar + bid count */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <InviteProgressBar sent={job.invitesSent} max={job.maxInvites} />
        {isFull ? (
          <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.inviteFull, lineHeight: 16 }}>Full</Text>
        ) : job.bidCount > 0 ? (
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.metaText, lineHeight: 16 }}>{`${job.bidCount} bids`}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const InviteToJobModal: React.FC<InviteToJobModalProps> = ({
  visible,
  onClose,
  contractor,
  jobs,
  onCreateNewJob,
  onInviteSent,
}) => {
  // ── State ──
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'choose' | 'select_job'>('choose');
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [sentJobTitle, setSentJobTitle] = useState('');

  // ── Bottom sheet slide-up animation ──
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible && step === 'choose') {
      slideAnim.setValue(400);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 200,
      }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- slideAnim is an animated ref, stable
  }, [visible, step]);

  const activeJobs = jobs ?? MOCK_JOBS;

  // ── Reset on close ──
  const handleClose = useCallback(() => {
    setStep('choose');
    setSelectedJobId(null);
    setMessage('');
    setSearchQuery('');
    setIsSubmitting(false);
    setShowConfirmModal(false);
    setSentJobTitle('');
    onClose();
  }, [onClose]);

  // ── Filtered jobs by search ──
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) return activeJobs;
    const q = searchQuery.toLowerCase();
    return activeJobs.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.trades.some((t) => t.toLowerCase().includes(q))
    );
  }, [activeJobs, searchQuery]);

  // ── Send invite handler ──
  const handleSendInvite = useCallback(async () => {
    if (!selectedJobId) return;
    const job = activeJobs.find((j) => j.id === selectedJobId);
    if (!job || job.invitesSent >= job.maxInvites) return;

    setIsSubmitting(true);
    try {
      // TODO: Replace with TanStack mutation
      // await mutateAsync({ jobId: selectedJobId, contractorId: contractor.id, message: message.trim() || undefined });
      console.log('Invite sent:', { jobId: selectedJobId, contractorId: contractor.id, message: message.trim() || undefined });

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 600));

      onInviteSent?.(selectedJobId, contractor.id, message.trim() || undefined);

      // Store job title for confirmation modal, then show it
      setSentJobTitle(job.title);
      setShowConfirmModal(true);
    } catch {
      Alert.alert('Error', 'Failed to send invite. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedJobId, activeJobs, contractor, message, onInviteSent]);

  // ── Handle Create New Job ──
  const handleCreateNewJob = useCallback(() => {
    handleClose();
    onCreateNewJob?.();
  }, [handleClose, onCreateNewJob]);

  // ═══════════════════════════════════════════
  // STEP 1: BOTTOM SHEET — Choose action
  // ═══════════════════════════════════════════
  if (step === 'choose') {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
        <Pressable style={{ flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' }} onPress={handleClose}>
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: COLORS.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              gap: 12,
              paddingBottom: 40,
              position: 'relative',
            }}
          >
            {/* Drag handle */}
            <View style={{ alignItems: 'center', paddingTop: 4 }}>
              <View style={{ width: 36, height: 4, backgroundColor: '#D1D5DC', borderRadius: 2 }} />
            </View>

            {/* Close X — 16px from top and right of sheet */}
            <Pressable
              onPress={handleClose}
              hitSlop={8}
              style={({ pressed }) => ({
                position: 'absolute',
                right: 16,
                top: 16,
                width: 32,
                height: 32,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.5 : 1,
                zIndex: 10,
              })}
            >
              <SheetCloseIcon />
            </Pressable>

            {/* Header: Title + subtitle */}
            <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16, paddingRight: 56 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28 }}>
                {`Invite ${contractor.name} to Job`}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20, marginTop: 4 }}>
                Invite from your network to get more bids fast.
              </Text>
            </View>

            {/* Contractor identity card */}
            <View style={{ marginHorizontal: 20, backgroundColor: COLORS.inputBg, borderRadius: 12, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar name={contractor.name} color={contractor.avatarColor} size={44} />
                <View style={{ gap: 0 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>{contractor.name}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>
                    {`${contractor.company} · ${contractor.role}`}
                  </Text>
                </View>
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ paddingHorizontal: 24, gap: 12, flex: 0 }}>
              {/* Invite to Existing Job */}
              <Pressable
                onPress={() => setStep('select_job')}
                style={({ pressed }) => ({
                  height: 52,
                  backgroundColor: COLORS.primary,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <InviteExistingIcon />
                <Text style={{ fontSize: 16, fontWeight: '500', color: '#FFFFFF', lineHeight: 24, textAlign: 'center' }}>
                  Invite to Existing Job
                </Text>
              </Pressable>

              {/* Create New Job */}
              <Pressable
                onPress={handleCreateNewJob}
                style={({ pressed }) => ({
                  height: 52,
                  backgroundColor: COLORS.background,
                  borderRadius: 12,
                  borderWidth: 1.35,
                  borderColor: COLORS.primary,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <CreateNewIcon />
                <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.primary, lineHeight: 24, textAlign: 'center' }}>
                  Create New Job
                </Text>
              </Pressable>
            </View>
          </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  }

  // ═══════════════════════════════════════════
  // STEP 2: FULL-SCREEN — Select a Job
  // ═══════════════════════════════════════════
  const selectedJob = activeJobs.find((j) => j.id === selectedJobId);
  const canSend = selectedJobId !== null && selectedJob && selectedJob.invitesSent < selectedJob.maxInvites && !isSubmitting;

  return (
    <>
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={handleClose}>
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: COLORS.background }}>
        <KeyboardAvoidingView
          style={{ flex: 1, backgroundColor: COLORS.screenBg }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            {/* ── HEADER (white, sticky) ── */}
            <View style={{ backgroundColor: COLORS.background, borderBottomWidth: 1.35, borderBottomColor: COLORS.border }}>
              {/* Row 1: Back + Title + Close — 48px header */}
              <View style={{ height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
                <Pressable onPress={() => setStep('choose')} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
                  <BackArrowIcon />
                </Pressable>
                <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>Select a Job</Text>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => ({
                    width: 32,
                    height: 32,
                    backgroundColor: '#F3F4F6',
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <CloseIcon />
                </Pressable>
              </View>

              {/* Row 2: Contractor mini-avatar + name */}
              <View style={{ height: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 }}>
                <Avatar name={contractor.name} color={contractor.avatarColor} size={28} />
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.bodyText, lineHeight: 20 }}>
                  {`Inviting ${contractor.name}`}
                </Text>
              </View>

              {/* Row 3: Search bar — shared SearchField component */}
              <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14 }}>
                <SearchField
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder="Search jobs by title or trade..."
                />
              </View>
            </View>

        {/* ── SCROLLABLE JOB LIST ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Section label */}
          <Text style={{
            fontSize: 12,
            fontWeight: '500',
            color: COLORS.metaText,
            lineHeight: 16,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 2,
          }}>
            {`Active Jobs (${filteredJobs.length})`}
          </Text>

          {filteredJobs.map((job) => {
            const isFull = job.invitesSent >= job.maxInvites;
            return (
              <JobCard
                key={job.id}
                job={job}
                isSelected={selectedJobId === job.id}
                isDisabled={isFull}
                onSelect={() => setSelectedJobId(job.id)}
                contractorTrades={contractor.trades}
              />
            );
          })}

          {filteredJobs.length === 0 && (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.metaText, lineHeight: 20 }}>
                No matching jobs found.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── BOTTOM ACTION BAR (white, sticky) ── */}
        <View style={{
          backgroundColor: COLORS.background,
          borderTopWidth: 1.35,
          borderTopColor: COLORS.border,
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: Platform.OS === 'ios' ? 34 : 16,
          gap: 12,
        }}>
          {/* Optional message input */}
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder='Add a message (e.g., "Check this electrical job?")'
            placeholderTextColor="rgba(28, 28, 30, 0.50)"
            style={{
              backgroundColor: COLORS.inputBg,
              borderRadius: 10,
              borderWidth: 1.35,
              borderColor: COLORS.border,
              paddingHorizontal: 12,
              paddingVertical: 12,
              fontSize: 14,
              fontWeight: '400',
              color: COLORS.darkText,
              lineHeight: 20,
            }}
          />

          {/* Send Invite button */}
          <Pressable
            onPress={handleSendInvite}
            disabled={!canSend}
            style={({ pressed }) => ({
              height: 48,
              backgroundColor: canSend ? COLORS.primary : '#99A1AF',
              borderRadius: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: pressed && canSend ? 0.7 : 1,
            })}
          >
            <SendInviteIcon />
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#FFFFFF', lineHeight: 24, textAlign: 'center' }}>
              {isSubmitting ? 'Sending...' : 'Send Invite'}
            </Text>
          </Pressable>
        </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>

    {/* ── Invite Sent — Confirmation ── */}
    <ConfirmationModal
      visible={showConfirmModal}
      icon={
        <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
          <Path d="M29.33 2.67L14.67 17.33" stroke="#FFFFFF" strokeWidth={2.67} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M29.33 2.67L20 29.33L14.67 17.33L2.67 12L29.33 2.67Z" stroke="#FFFFFF" strokeWidth={2.67} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      }
      title="Invite Sent!"
      subtitle={`${contractor.name} has been invited to bid on "${sentJobTitle}"`}
      body="They'll be notified and can submit a bid within the job's bid window. You can track their response from the job details screen."
      primaryLabel="View Job"
      onPrimary={() => {
        // TODO: Navigate to RepairJobDetails for selected job
        // navigation.navigate('RepairJobDetails', { jobId: selectedJobId });
        console.log('Navigate to job:', selectedJobId);
        handleClose();
      }}
      secondaryLabel="Done"
      onSecondary={handleClose}
      onClose={handleClose}
    />
    </>
  );
};

export default InviteToJobModal;
