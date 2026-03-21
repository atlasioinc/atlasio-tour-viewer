// ═══════════════════════════════════════════════════════════════
// components/JobCompletionScreen.tsx
// Job Completion — Shared Screen (Contractor + Agent Views)
//
// Two-sided handshake: contractor marks complete → agent confirms.
// Role-conditional behavior controlled by `userRole` nav param.
//
// ─────────────────────────────────────────────
// ROLE BRANCHING:
//   Contractor: upload proof photos, add notes → "Mark Complete"
//               status: in_progress → pending_confirmation
//   Agent:      review proof + notes → "Confirm Complete" or "Request Revision"
//               status: pending_confirmation → completed | under_review
//   Both:       VouchPromptModal fires after agent confirms (mutual vouch)
// ─────────────────────────────────────────────
//
// Triggers on completion: 3% fee capture, mutual vouch prompts, deals_closed stat
// Stack: HomeStack (agent) + ContractorHomeStack (contractor)
// Presentation: fullScreenModal, slide_from_bottom
//
// @demo: all 3 handlers (markComplete, confirmComplete, requestRevision)
//        use 800ms setTimeout — no backend calls. Mock data for job/photos.
//        DEV role toggle at bottom of screen for testing both views.
// @backend TODO: wire to useMarkJobComplete, useConfirmJobComplete,
//                useRequestJobRevision (all exist in useData.ts)
// @backend TODO: wire vouch submit to useCreateReview mutation (not yet in useData.ts)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StatusBar,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import VouchPromptModal from './VouchPromptModal';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type JobStatus = 'in_progress' | 'pending_confirmation' | 'under_review' | 'completed';

interface AwardedBid {
  amount: number;
  contractorId: string;
  contractorName: string;
  contractorCompany: string;
  contractorAvatar: string;
  contractorRating: number;
  contractorVouches: number;
}

interface JobAgent {
  id: string;
  name: string;
  company: string;
  avatar: string;
}

interface CompletionJobData {
  id: string;
  title: string;
  address: string;
  trade: string;
  status: JobStatus;
  postedDate: string;
  dueDate: string;
  awardedBid: AwardedBid;
  agent: JobAgent;
  proofPhotos: string[];
  completionNotes: string;
  revisionNotes: string;
}

interface JobCompletionScreenProps {
  navigation: any;
  route: {
    params: {
      jobId: string;
      userRole: 'agent' | 'contractor';
    };
  };
}

// ─────────────────────────────────────────────
// @demo MOCK DATA — replace with useJob(jobId) hook
// ─────────────────────────────────────────────

const MOCK_JOB: CompletionJobData = {
  id: 'job-001',
  title: 'Kitchen Faucet Replacement',
  address: '1847 Pearl St, Denver, CO 80203',
  trade: 'Plumber',
  status: 'in_progress',
  postedDate: '2026-02-20',
  dueDate: '2026-02-28',
  awardedBid: {
    amount: 850,
    contractorId: 'contractor-001',
    contractorName: 'Brian Cooper',
    contractorCompany: 'ProBuild Contractors',
    contractorAvatar: '#7BA3C9',
    contractorRating: 5.0,
    contractorVouches: 67,
  },
  agent: {
    id: 'agent-001',
    name: 'Tony Martinez',
    company: 'Keller Williams Denver',
    avatar: '#C4A882',
  },
  proofPhotos: [],
  completionNotes: '',
  revisionNotes: '',
};

// Pre-filled mock for agent demo (contractor already submitted)
const MOCK_JOB_PENDING: CompletionJobData = {
  ...MOCK_JOB,
  status: 'pending_confirmation',
  proofPhotos: [
    'https://placeholder.co/400x300/E8F0FE/003DC3?text=Before',
    'https://placeholder.co/400x300/E8F0FE/003DC3?text=After+1',
    'https://placeholder.co/400x300/E8F0FE/003DC3?text=After+2',
    'https://placeholder.co/400x300/E8F0FE/003DC3?text=Faucet+Close',
  ],
  completionNotes:
    'Replaced kitchen faucet with Moen Arbor model as discussed. Tested water pressure and checked for leaks — all clear. Old faucet disposed. Noticed minor corrosion on the supply line connector; replaced it at no extra charge.',
};

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

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

const CameraIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M23 19C23 19.53 22.79 20.04 22.41 20.41C22.04 20.79 21.53 21 21 21H3C2.47 21 1.96 20.79 1.59 20.41C1.21 20.04 1 19.53 1 19V8C1 7.47 1.21 6.96 1.59 6.59C1.96 6.21 2.47 6 3 6H7L9 3H15L17 6H21C21.53 6 22.04 6.21 22.41 6.59C22.79 6.96 23 7.47 23 8V19Z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={12} cy={13} r={4} stroke={COLORS.primary} strokeWidth={2} />
  </Svg>
);

const TrashIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M2 4H14" stroke="#FFFFFF" strokeWidth={1.33} strokeLinecap="round" />
    <Path
      d="M5.33 4V2.67C5.33 2.3 5.63 2 6 2H10C10.37 2 10.67 2.3 10.67 2.67V4"
      stroke="#FFFFFF"
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12.67 4V13.33C12.67 13.7 12.37 14 12 14H4C3.63 14 3.33 13.7 3.33 13.33V4"
      stroke="#FFFFFF"
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const StarIcon: React.FC<{ filled?: boolean; size?: number }> = ({ filled = false, size = 14 }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path
      d="M7 1.17L8.82 4.87L12.88 5.46L9.94 8.32L10.64 12.36L7 10.44L3.36 12.36L4.06 8.32L1.12 5.46L5.18 4.87L7 1.17Z"
      fill={filled ? COLORS.starColor : 'transparent'}
      stroke={COLORS.starColor}
      strokeWidth={1.17}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LocationPinIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M7 1.17C4.75 1.17 2.92 2.99 2.92 5.25C2.92 8.31 7 12.83 7 12.83C7 12.83 11.08 8.31 11.08 5.25C11.08 2.99 9.25 1.17 7 1.17Z"
      stroke={COLORS.lightText}
      strokeWidth={1.17}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={7} cy={5.25} r={1.75} stroke={COLORS.lightText} strokeWidth={1.17} />
  </Svg>
);

const AlertTriangleIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M8.57 3.22L1.51 15C1.35 15.27 1.27 15.58 1.27 15.89C1.28 16.2 1.37 16.51 1.53 16.77C1.69 17.04 1.92 17.25 2.2 17.4C2.47 17.55 2.78 17.63 3.09 17.63H17.21C17.52 17.63 17.83 17.55 18.1 17.4C18.38 17.25 18.61 17.04 18.77 16.77C18.93 16.51 19.02 16.2 19.03 15.89C19.03 15.58 18.95 15.27 18.79 15L11.73 3.22C11.56 2.96 11.33 2.75 11.06 2.6C10.78 2.45 10.47 2.38 10.15 2.38C9.83 2.38 9.52 2.45 9.24 2.6C8.97 2.75 8.74 2.96 8.57 3.22Z"
      stroke={COLORS.counterAmber}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M10.15 7.63V10.96" stroke={COLORS.counterAmber} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M10.15 14.3H10.16" stroke={COLORS.counterAmber} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const SuccessCheckIcon: React.FC = () => (
  <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
    <Circle cx={32} cy={32} r={30} fill={COLORS.successGreen} opacity={0.12} />
    <Circle cx={32} cy={32} r={22} fill={COLORS.successGreen} opacity={0.2} />
    <Circle cx={32} cy={32} r={15} fill={COLORS.successGreen} />
    <Path d="M23 32L29 38L41 26" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ImagePlaceholderIcon: React.FC = () => (
  <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
    <Rect x={4} y={6} width={24} height={20} rx={3} stroke={COLORS.lightText} strokeWidth={1.67} />
    <Circle cx={11} cy={13} r={2.5} stroke={COLORS.lightText} strokeWidth={1.67} />
    <Path d="M4 22L11 15L16 20L20 16L28 24" stroke={COLORS.lightText} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER (matches existing pattern)
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
      <Text style={{ fontSize: size * 0.32, fontWeight: '600', color: '#FFFFFF' }}>
        {initials}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// STATUS TIMELINE
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
              <CheckCircleIcon size={20} color={COLORS.successGreen} />
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

// ─────────────────────────────────────────────
// PROOF PHOTO THUMBNAIL
// ─────────────────────────────────────────────

const ProofPhotoThumb: React.FC<{
  uri: string;
  index: number;
  onRemove?: () => void;
  readOnly?: boolean;
}> = ({ uri, index, onRemove, readOnly = false }) => (
  <View
    style={{
      width: 88,
      height: 88,
      borderRadius: 10,
      backgroundColor: '#F3F4F6',
      overflow: 'hidden',
      position: 'relative',
    }}
  >
    {/* Placeholder since we can't load remote images in demo */}
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: index % 2 === 0 ? '#E8F0FE' : '#EFF6FF',
      }}
    >
      <ImagePlaceholderIcon />
      <Text style={{ fontSize: 10, color: COLORS.lightText, marginTop: 2 }}>
        {index === 0 ? 'Before' : `After ${index}`}
      </Text>
    </View>

    {/* Remove button — only for contractor edit mode */}
    {!readOnly && onRemove && (
      <Pressable
        onPress={onRemove}
        hitSlop={6}
        style={({ pressed }) => ({
          position: 'absolute',
          top: 4,
          right: 4,
          width: 22,
          height: 22,
          borderRadius: 9999,
          backgroundColor: 'rgba(0,0,0,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <TrashIcon />
      </Pressable>
    )}
  </View>
);

// ─────────────────────────────────────────────
// ADD PHOTO BUTTON
// ─────────────────────────────────────────────

const AddPhotoButton: React.FC<{ onPress: () => void; count: number }> = ({ onPress, count }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      width: 88,
      height: 88,
      borderRadius: 10,
      borderWidth: 1.35,
      borderColor: COLORS.border,
      borderStyle: 'dashed' as any,
      backgroundColor: COLORS.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      opacity: pressed ? 0.6 : 1,
    })}
  >
    <CameraIcon />
    <Text style={{ fontSize: 11, fontWeight: '400', color: COLORS.bodyText, lineHeight: 14 }}>
      {count}/5
    </Text>
  </Pressable>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const JobCompletionScreen: React.FC<JobCompletionScreenProps> = ({ navigation, route }) => {
  const { userRole } = route.params;
  const isAgent = userRole === 'agent';

  // @demo Job data (mock fallback) — @backend TODO: wire to useJob(jobId)
  // Agent sees the pending version (contractor already submitted)
  const [job] = useState<CompletionJobData>(
    isAgent ? MOCK_JOB_PENDING : MOCK_JOB
  );

  // ── Screen state ──
  const [jobStatus, setJobStatus] = useState<JobStatus>(job.status);
  const [proofPhotos, setProofPhotos] = useState<string[]>(job.proofPhotos);
  const [completionNotes, setCompletionNotes] = useState(job.completionNotes);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRevisionInput, setShowRevisionInput] = useState(false);

  // ── Success overlay ──
  const [showSuccess, setShowSuccess] = useState(false);
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0.8)).current;

  // ── Vouch modal (fires after agent confirms) ──
  const [showVouchModal, setShowVouchModal] = useState(false);
  const pendingVouchRef = useRef(false);

  // ── Role derived from route param ──
  const activeIsContractor = !isAgent;
  const activeIsAgent = isAgent;

  // Reset state on mount based on role
  useEffect(() => {
    if (activeIsAgent) {
      setJobStatus('pending_confirmation');
      setProofPhotos(MOCK_JOB_PENDING.proofPhotos);
      setCompletionNotes(MOCK_JOB_PENDING.completionNotes);
      setShowRevisionInput(false);
      setRevisionNotes('');
    } else {
      setJobStatus('in_progress');
      setProofPhotos([]);
      setCompletionNotes('');
      setShowRevisionInput(false);
      setRevisionNotes('');
    }
    setShowSuccess(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once on mount; role is static from route param
  }, []);

  // ── Timeline steps (computed from status + role) ──
  const getTimelineSteps = (): TimelineStep[] => {
    const steps: TimelineStep[] = [
      {
        label: 'Job Awarded',
        status: 'completed',
        sublabel: `$${job.awardedBid.amount} · ${job.awardedBid.contractorName}`,
      },
      {
        label: 'Work In Progress',
        status: 'completed',
        sublabel: `Due ${formatDate(job.dueDate)}`,
      },
      {
        label: 'Completion Submitted',
        status:
          jobStatus === 'in_progress'
            ? activeIsContractor
              ? 'active'
              : 'pending'
            : jobStatus === 'pending_confirmation' || jobStatus === 'under_review'
            ? 'completed'
            : 'completed',
        sublabel:
          jobStatus === 'in_progress' && activeIsContractor
            ? 'Upload proof & submit'
            : undefined,
      },
      {
        label: 'Agent Confirmed',
        status:
          jobStatus === 'completed'
            ? 'completed'
            : jobStatus === 'pending_confirmation'
            ? activeIsAgent
              ? 'active'
              : 'pending'
            : jobStatus === 'under_review'
            ? 'active'
            : 'pending',
        sublabel:
          jobStatus === 'under_review'
            ? 'Revision requested — awaiting update'
            : jobStatus === 'pending_confirmation' && activeIsAgent
            ? 'Review & confirm'
            : undefined,
      },
    ];
    return steps;
  };

  // ── Handlers ──

  const handleAddPhoto = useCallback(() => {
    // Future: open AttachSheet for camera/gallery
    // Demo: add a placeholder
    if (proofPhotos.length >= 5) {
      Alert.alert('Maximum Photos', 'You can upload up to 5 proof photos.');
      return;
    }
    const newPhotos = [...proofPhotos, `demo-photo-${proofPhotos.length + 1}`];
    setProofPhotos(newPhotos);
  }, [proofPhotos]);

  const handleRemovePhoto = useCallback(
    (index: number) => {
      const updated = proofPhotos.filter((_, i) => i !== index);
      setProofPhotos(updated);
    },
    [proofPhotos]
  );

  const showSuccessOverlay = useCallback(
    (message: string, onComplete?: () => void) => {
      setShowSuccess(true);
      Animated.parallel([
        Animated.timing(successOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(successScale, {
          toValue: 1,
          damping: 15,
          stiffness: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-dismiss after 2s
      setTimeout(() => {
        Animated.timing(successOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccess(false);
          successScale.setValue(0.8);
          onComplete?.();
        });
      }, 2000);
    },
    [successOpacity, successScale]
  );

  // ── CONTRACTOR: Mark Complete ──
  // @backend TODO: wire to useMarkJobComplete(jobId, proofPhotos, completionNotes)
  const handleMarkComplete = useCallback(() => {
    Keyboard.dismiss();

    if (proofPhotos.length === 0) {
      Alert.alert('Photos Required', 'Please upload at least one proof photo before marking complete.');
      return;
    }
    if (!completionNotes.trim()) {
      Alert.alert('Notes Required', 'Please add completion notes describing the work performed.');
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      setJobStatus('pending_confirmation');

      showSuccessOverlay('Completion Submitted!', () => {
        // In production: navigate back or stay on screen with updated status
      });
    }, 800);
  }, [proofPhotos, completionNotes, showSuccessOverlay]);

  // ── AGENT: Confirm Complete ──
  // @backend TODO: wire to useConfirmJobComplete(jobId)
  const handleConfirmComplete = useCallback(() => {
    Alert.alert(
      'Confirm Job Complete',
      'This will mark the job as completed and close it out. Both parties will be prompted to leave a review. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            setIsSubmitting(true);
            setTimeout(() => {
              setIsSubmitting(false);
              setJobStatus('completed');
              pendingVouchRef.current = true;

              showSuccessOverlay('Job Completed! 🎉', () => {
                // Open vouch modal after success overlay (sequential modal pattern)
                if (pendingVouchRef.current) {
                  pendingVouchRef.current = false;
                  setTimeout(() => {
                    setShowVouchModal(true);
                  }, 100);
                }
              });
            }, 800);
          },
        },
      ]
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps -- job ref intentionally included for staleness check
  }, [job, showSuccessOverlay]);

  // ── AGENT: Request Revision ──
  // @backend TODO: wire to useRequestJobRevision(jobId, revisionNotes)
  const handleRequestRevision = useCallback(() => {
    if (!showRevisionInput) {
      setShowRevisionInput(true);
      return;
    }

    if (!revisionNotes.trim()) {
      Alert.alert('Notes Required', 'Please describe what needs to be revised.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setJobStatus('under_review');
      setShowRevisionInput(false);

      showSuccessOverlay('Revision Requested');
    }, 800);
  }, [showRevisionInput, revisionNotes, showSuccessOverlay]);

  // ── Vouch submit ──
  const handleVouchSubmit = useCallback(
    (data: { rating: number; comment: string; tags: string[]; isVouch: boolean; isAnonymous?: boolean }) => {
      console.log('Vouch submitted:', data);
      setShowVouchModal(false);
      // @backend TODO: create review + vouch rows via TanStack mutation
    },
    []
  );

  // ── Helpers ──
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getStatusBadge = () => {
    switch (jobStatus) {
      case 'in_progress':
        return { label: 'In Progress', bg: COLORS.infoBg, color: COLORS.primary, border: COLORS.infoBorder };
      case 'pending_confirmation':
        return { label: 'Pending Confirmation', bg: COLORS.warningBg, color: COLORS.warningText, border: '#FDE68A' };
      case 'under_review':
        return { label: 'Under Review', bg: '#FEF2F2', color: COLORS.errorRed, border: '#FECACA' };
      case 'completed':
        return { label: 'Completed', bg: COLORS.feeBg, color: COLORS.feeText, border: '#BBF7D0' };
    }
  };

  const statusBadge = getStatusBadge();
  const otherPartyName = activeIsContractor ? job.agent.name : job.awardedBid.contractorName;
  const otherPartyAvatar = activeIsContractor ? job.agent.avatar : job.awardedBid.contractorAvatar;
  const otherPartyRole = activeIsContractor ? 'Real Estate Agent' : job.trade;

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ═══ HEADER ═══ */}
        <View
          style={{
            height: 48,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            borderBottomWidth: 0.68,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.background,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={{ width: 60 }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary }}>Close</Text>
          </Pressable>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: COLORS.darkText,
              textAlign: 'center',
            }}
          >
            Job Completion
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* ═══ SCROLLABLE CONTENT ═══ */}
        <ScrollView
          style={{ flex: 1, backgroundColor: COLORS.background }}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── JOB SUMMARY CARD ── */}
          <View style={{ padding: 16 }}>
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
                gap: 12,
              }}
            >
              {/* Status badge + trade */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 9999,
                    backgroundColor: statusBadge.bg,
                    borderWidth: 0.68,
                    borderColor: statusBadge.border,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '500', color: statusBadge.color, lineHeight: 16 }}>
                    {statusBadge.label}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.lightText, lineHeight: 16 }}>
                  {job.trade}
                </Text>
              </View>

              {/* Title + address */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28 }}>
                  {job.title}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <LocationPinIcon />
                  <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.lightText, lineHeight: 18, flex: 1 }}>
                    {job.address}
                  </Text>
                </View>
              </View>

              {/* Contractor / Agent info row */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingTop: 8,
                  borderTopWidth: 0.68,
                  borderTopColor: COLORS.cardBorder,
                  gap: 10,
                }}
              >
                <AvatarPlaceholder
                  name={job.awardedBid.contractorName}
                  color={job.awardedBid.contractorAvatar}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                    {job.awardedBid.contractorName}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>
                    {job.awardedBid.contractorCompany}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
                    ${job.awardedBid.amount.toLocaleString()}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <StarIcon filled size={12} />
                    <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>
                      {job.awardedBid.contractorRating} · {job.awardedBid.contractorVouches} vouches
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* ── STATUS TIMELINE ── */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.darkText,
                lineHeight: 24,
                marginBottom: 12,
              }}
            >
              Progress
            </Text>
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
              <StatusTimeline steps={getTimelineSteps()} />
            </View>
          </View>

          {/* ── PROOF PHOTOS ── */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
                Proof Photos
              </Text>
            </View>

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
              {proofPhotos.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {proofPhotos.map((photo, index) => (
                    <ProofPhotoThumb
                      key={`${photo}-${index}`}
                      uri={photo}
                      index={index}
                      readOnly={activeIsAgent}
                      onRemove={
                        activeIsContractor ? () => handleRemovePhoto(index) : undefined
                      }
                    />
                  ))}
                  {/* Add button if contractor and under limit */}
                  {activeIsContractor && proofPhotos.length < 5 && (
                    <AddPhotoButton onPress={handleAddPhoto} count={proofPhotos.length} />
                  )}
                </ScrollView>
              ) : activeIsContractor ? (
                <Pressable
                  onPress={handleAddPhoto}
                  style={({ pressed }) => ({
                    paddingVertical: 28,
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    borderWidth: 1.35,
                    borderColor: COLORS.border,
                    borderStyle: 'dashed' as any,
                    borderRadius: 10,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <CameraIcon />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>
                    Upload Proof Photos
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.lightText, lineHeight: 16 }}>
                    Max 5 photos · 10MB each
                  </Text>
                </Pressable>
              ) : (
                <View style={{ paddingVertical: 20, alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.lightText, lineHeight: 20 }}>
                    No proof photos uploaded yet
                  </Text>
                </View>
              )}

              {/* Photo count helper */}
              {proofPhotos.length > 0 && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '400',
                    color: COLORS.lightText,
                    lineHeight: 16,
                    marginTop: 8,
                  }}
                >
                  {proofPhotos.length} of 5 photos
                  {activeIsAgent ? ' uploaded by contractor' : ' uploaded'}
                </Text>
              )}
            </View>
          </View>

          {/* ── COMPLETION NOTES ── */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.darkText,
                lineHeight: 24,
                marginBottom: 12,
              }}
            >
              Completion Notes
            </Text>

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
              {activeIsContractor && jobStatus === 'in_progress' ? (
                // Editable TextInput for contractor — only during in_progress
                <TextInput
                  value={completionNotes}
                  onChangeText={setCompletionNotes}
                  placeholder="Describe the work completed, materials used, and any additional notes..."
                  placeholderTextColor={COLORS.lightText}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: COLORS.darkText,
                    lineHeight: 22,
                    minHeight: 100,
                    padding: 0,
                  }}
                />
              ) : (
                // Read-only display — agent view OR contractor post-submission
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: completionNotes ? COLORS.bodyText : COLORS.lightText,
                    lineHeight: 22,
                  }}
                >
                  {completionNotes || 'No completion notes provided'}
                </Text>
              )}

              {/* Character counter — only when editing */}
              {activeIsContractor && jobStatus === 'in_progress' && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '400',
                    color: COLORS.lightText,
                    lineHeight: 16,
                    textAlign: 'right',
                    marginTop: 4,
                  }}
                >
                  {completionNotes.length}/1000
                </Text>
              )}
            </View>
          </View>

          {/* ── REVISION NOTES (Agent requesting revision) ── */}
          {activeIsAgent && showRevisionInput && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: COLORS.darkText,
                  lineHeight: 24,
                  marginBottom: 12,
                }}
              >
                Revision Notes
              </Text>

              {/* Warning banner */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: 12,
                  backgroundColor: COLORS.warningBg,
                  borderRadius: 10,
                  borderWidth: 0.68,
                  borderColor: '#FDE68A',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <AlertTriangleIcon />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontWeight: '400',
                    color: COLORS.warningText,
                    lineHeight: 18,
                  }}
                >
                  This will send the job back to the contractor for revision. They&apos;ll be notified
                  and can resubmit once addressed.
                </Text>
              </View>

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
                <TextInput
                  value={revisionNotes}
                  onChangeText={setRevisionNotes}
                  placeholder="Describe what needs to be revised or corrected..."
                  placeholderTextColor={COLORS.lightText}
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  autoFocus
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: COLORS.darkText,
                    lineHeight: 22,
                    minHeight: 80,
                    padding: 0,
                  }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '400',
                    color: COLORS.lightText,
                    lineHeight: 16,
                    textAlign: 'right',
                    marginTop: 4,
                  }}
                >
                  {revisionNotes.length}/500
                </Text>
              </View>
            </View>
          )}

          {/* ── UNDER REVIEW INFO BANNER ── */}
          {jobStatus === 'under_review' && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  padding: 12,
                  backgroundColor: '#FEF2F2',
                  borderRadius: 10,
                  borderWidth: 0.68,
                  borderColor: '#FECACA',
                  gap: 8,
                }}
              >
                <AlertTriangleIcon />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.errorRed, lineHeight: 20 }}>
                    Revision Requested
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.bodyText, lineHeight: 18, marginTop: 2 }}>
                    {activeIsContractor
                      ? 'The agent has requested revisions. Please review the notes and resubmit.'
                      : 'You requested a revision. Waiting for the contractor to update.'}
                  </Text>
                </View>
              </View>
            </View>
          )}


        </ScrollView>

        {/* ═══ BOTTOM CTA BAR ═══ */}
        {jobStatus !== 'completed' && (
          <View
            style={{
              backgroundColor: COLORS.background,
              borderTopWidth: 0.68,
              borderTopColor: COLORS.border,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <View
              style={{
                paddingTop: 16,
                paddingHorizontal: 16,
                paddingBottom: Platform.OS === 'ios' ? 36 : 24,
                gap: 10,
              }}
            >
              {/* ── CONTRACTOR CTAs ── */}
              {activeIsContractor && jobStatus === 'in_progress' && (
                <Pressable
                  onPress={handleMarkComplete}
                  disabled={isSubmitting}
                  style={({ pressed }) => ({
                    height: 48,
                    backgroundColor:
                      proofPhotos.length > 0 && completionNotes.trim()
                        ? COLORS.primary
                        : '#A0AEC0',
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: pressed && !isSubmitting ? 0.85 : 1,
                  })}
                >
                  <CheckCircleIcon size={18} color="#FFFFFF" />
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color: '#FFFFFF',
                      lineHeight: 20,
                    }}
                  >
                    {isSubmitting ? 'Submitting...' : 'Mark Complete'}
                  </Text>
                </Pressable>
              )}

              {/* Contractor: waiting state */}
              {activeIsContractor && jobStatus === 'pending_confirmation' && (
                <View
                  style={{
                    height: 48,
                    backgroundColor: COLORS.warningBg,
                    borderRadius: 10,
                    borderWidth: 0.68,
                    borderColor: '#FDE68A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.warningText, lineHeight: 20 }}>
                    ⏳ Waiting for Agent Confirmation
                  </Text>
                </View>
              )}

              {/* ── AGENT CTAs ── */}
              {activeIsAgent && jobStatus === 'pending_confirmation' && !showRevisionInput && (
                <>
                  <Pressable
                    onPress={handleConfirmComplete}
                    disabled={isSubmitting}
                    style={({ pressed }) => ({
                      height: 48,
                      backgroundColor: COLORS.successGreen,
                      borderRadius: 10,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed && !isSubmitting ? 0.85 : 1,
                    })}
                  >
                    <CheckCircleIcon size={18} color="#FFFFFF" />
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 }}>
                      {isSubmitting ? 'Confirming...' : 'Confirm Complete'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleRequestRevision}
                    disabled={isSubmitting}
                    style={({ pressed }) => ({
                      height: 48,
                      borderWidth: 1.35,
                      borderColor: COLORS.border,
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: COLORS.background,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.bodyText, lineHeight: 20 }}>
                      Request Revision
                    </Text>
                  </Pressable>
                </>
              )}

              {/* Agent: revision input submit */}
              {activeIsAgent && showRevisionInput && (
                <>
                  <Pressable
                    onPress={handleRequestRevision}
                    disabled={isSubmitting || !revisionNotes.trim()}
                    style={({ pressed }) => ({
                      height: 48,
                      backgroundColor:
                        revisionNotes.trim() ? COLORS.counterAmber : '#A0AEC0',
                      borderRadius: 10,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed && !isSubmitting ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 }}>
                      {isSubmitting ? 'Submitting...' : 'Submit Revision Request'}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setShowRevisionInput(false);
                      setRevisionNotes('');
                    }}
                    style={({ pressed }) => ({
                      height: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.5 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.bodyText, lineHeight: 20 }}>
                      Cancel
                    </Text>
                  </Pressable>
                </>
              )}

              {/* Agent: under review waiting state */}
              {activeIsAgent && jobStatus === 'under_review' && !showRevisionInput && (
                <View
                  style={{
                    height: 48,
                    backgroundColor: '#FEF2F2',
                    borderRadius: 10,
                    borderWidth: 0.68,
                    borderColor: '#FECACA',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.errorRed, lineHeight: 20 }}>
                    Revision in Progress
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Completed state bottom bar */}
        {jobStatus === 'completed' && (
          <View
            style={{
              backgroundColor: COLORS.background,
              borderTopWidth: 0.68,
              borderTopColor: COLORS.border,
            }}
          >
            <View
              style={{
                paddingTop: 16,
                paddingHorizontal: 16,
                paddingBottom: Platform.OS === 'ios' ? 36 : 24,
                gap: 10,
              }}
            >
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => ({
                  height: 48,
                  backgroundColor: COLORS.primary,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 }}>
                  Done
                </Text>
              </Pressable>
              {!showVouchModal && (
                <Pressable
                  onPress={() => setShowVouchModal(true)}
                  style={({ pressed }) => ({
                    height: 48,
                    borderWidth: 1.35,
                    borderColor: COLORS.border,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: COLORS.background,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>
                    ⭐ Leave a Review
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ═══ SUCCESS OVERLAY ═══ */}
      {showSuccess && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255,255,255,0.95)',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: successOpacity,
            zIndex: 100,
          }}
        >
          <Animated.View
            style={{
              transform: [{ scale: successScale }],
              alignItems: 'center',
              gap: 16,
            }}
          >
            <SuccessCheckIcon />
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: COLORS.darkText,
                textAlign: 'center',
              }}
            >
              {jobStatus === 'completed'
                ? 'Job Completed! 🎉'
                : jobStatus === 'pending_confirmation'
                ? 'Completion Submitted!'
                : jobStatus === 'under_review'
                ? 'Revision Requested'
                : 'Success'}
            </Text>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '400',
                color: COLORS.secondaryText,
                textAlign: 'center',
                paddingHorizontal: 48,
              }}
            >
              {jobStatus === 'completed'
                ? 'Both parties will be prompted to leave a review.'
                : jobStatus === 'pending_confirmation'
                ? 'The agent has been notified and will review your submission.'
                : jobStatus === 'under_review'
                ? 'The contractor has been notified of your revision notes.'
                : ''}
            </Text>
          </Animated.View>
        </Animated.View>
      )}

      {/* ═══ VOUCH PROMPT MODAL ═══ */}
      <VouchPromptModal
        visible={showVouchModal}
        onClose={() => setShowVouchModal(false)}
        recipientName={otherPartyName}
        recipientAvatar={{ name: otherPartyName, color: otherPartyAvatar }}
        recipientRole={otherPartyRole}
        jobTitle={job.title}
        onSubmitVouch={handleVouchSubmit}
        showAnonymityOption={activeIsContractor}
      />
    </SafeAreaView>
  );
};

export default JobCompletionScreen;
