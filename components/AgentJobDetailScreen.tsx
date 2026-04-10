// AgentJobDetailScreen.tsx
// ═══════════════════════════════════════════════════════════════
// What: Agent read-only view of an active job — shows status,
//       contractor, job details, and confirm-complete CTA
// Who: Agents only
// Where: HomeStack → AgentJobDetail (pushed from Active Jobs
//        card on HomeTabAgent)
//
// @demo All job data from useAgentActiveJobs mock fallback
// @backend rpc_get_agent_active_jobs (deployed S135b)
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SHADOWS } from '../lib/tokens';
import { ScreenHeader } from './ScreenHeader';
import { Avatar } from './shared';
import { DisplayTag } from './DisplayTag';
import { useAgentActiveJobs } from '../hooks/useData';
import type { AgentActiveJob } from '../types';
import type { HomeStackParamList } from './HomeStack';

// ─────────────────────────────────────────────
// STATUS DISPLAY CONFIG
// ─────────────────────────────────────────────

const JOB_STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  awarded: {
    label: 'Scheduled',
    color: COLORS.primary,
    pulse: false,
  },
  in_progress: {
    label: 'In Progress',
    color: COLORS.successGreen,
    pulse: true,
  },
  pending_completion: {
    label: 'Review Required',
    color: COLORS.warningAmber,
    pulse: false,
  },
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const formatDate = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

// ─────────────────────────────────────────────
// SECTION CARD WRAPPER
// ─────────────────────────────────────────────

const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <View
    style={{
      borderRadius: 14,
      borderWidth: 0.68,
      borderColor: COLORS.cardBorder,
      backgroundColor: COLORS.background,
      padding: 16,
      ...SHADOWS.card,
    }}
  >
    {children}
  </View>
);

const SectionEyebrow: React.FC<{ label: string }> = ({ label }) => (
  <Text
    style={{
      fontSize: 12,
      fontWeight: '600',
      color: COLORS.secondaryText,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 12,
    }}
  >
    {label}
  </Text>
);

// ─────────────────────────────────────────────
// STATUS DOT — pulses for in_progress
// ─────────────────────────────────────────────

const StatusDot: React.FC<{ color: string; pulse: boolean }> = ({ color, pulse }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (pulse) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [pulse, pulseAnim]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: color,
        opacity: pulse ? pulseAnim : 1,
      }}
    />
  );
};

// ─────────────────────────────────────────────
// DETAIL ROW — label + value
// ─────────────────────────────────────────────

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
    <Text style={{ fontSize: 14, color: COLORS.bodyText }}>{label}</Text>
    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>{value}</Text>
  </View>
);

// STATE FLOW:
// jobId (route param) → find in useAgentActiveJobs cache → render job details
// Entrance: fade + slide-up animation on mount (280ms)
// Status dot: pulses when in_progress (Animated.loop)
// CTA visible only when pending_completion → Alert confirm → @demo for now

const AgentJobDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'AgentJobDetail'>>();
  const { jobId } = route.params;

  const { data: activeJobs = [] } = useAgentActiveJobs();
  const job = activeJobs.find((j: AgentActiveJob) => j.id === jobId) ?? null;

  // ── Entrance animation ──
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  // ── CTA handler ──
  // @demo — replace with useConfirmJobComplete mutation when ready
  // @backend rpc_confirm_job_complete — params: { p_job_id: jobId }
  const handleConfirmComplete = () => {
    Alert.alert(
      'Confirm Job Complete',
      'Are you sure you want to mark this job as complete?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success', 'Job marked as complete.');
            navigation.goBack();
          },
        },
      ]
    );
  };

  // ── Loading state ──
  if (!job) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
        <ScreenHeader title="Job Details" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  const config = JOB_STATUS_CONFIG[job.status] ?? {
    label: job.status,
    color: COLORS.secondaryText,
    pulse: false,
  };

  const budgetDisplay =
    job.budget_range ??
    (job.budget_min != null && job.budget_max != null
      ? `$${job.budget_min.toLocaleString()}–$${job.budget_max.toLocaleString()}`
      : 'Not set');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <ScreenHeader
        title={job.title}
        onBack={() => navigation.goBack()}
      />

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <ScrollView
          contentContainerStyle={{
            padding: 16,
            paddingBottom: insets.bottom + 32,
            gap: 16,
          }}
        >
          {/* ── 1. Status Card ── */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <StatusDot color={config.color} pulse={config.pulse} />
              <Text style={{ fontSize: 15, fontWeight: '600', color: config.color }}>
                {config.label}
              </Text>
            </View>

            {job.status === 'pending_completion' && (
              <View
                style={{
                  marginTop: 12,
                  backgroundColor: COLORS.warningBg,
                  borderRadius: 10,
                  padding: 12,
                }}
              >
                <Text style={{ fontSize: 14, color: COLORS.warningText, lineHeight: 20 }}>
                  {job.contractor?.name ?? 'The contractor'} has marked this job complete. Review the work and confirm.
                </Text>
              </View>
            )}
          </Card>

          {/* ── 2. Contractor Card ── */}
          <Card>
            <SectionEyebrow label="Contractor" />
            {job.contractor ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Avatar
                  size={48}
                  uri={null}
                  color={job.contractor.avatar_color}
                  name={job.contractor.name}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText }}>
                    {job.contractor.name}
                  </Text>
                  {job.contractor.company && (
                    <Text style={{ fontSize: 14, color: COLORS.secondaryText, marginTop: 2 }}>
                      {job.contractor.company}
                    </Text>
                  )}
                </View>
              </View>
            ) : (
              <Text style={{ fontSize: 14, color: COLORS.secondaryText }}>
                No contractor assigned yet
              </Text>
            )}
          </Card>

          {/* ── 3. Job Details Card ── */}
          <Card>
            <SectionEyebrow label="Job Details" />

            {job.is_urgent && (
              <View style={{ marginBottom: 12 }}>
                <DisplayTag variant="ghost" label="Urgent" />
              </View>
            )}

            <DetailRow label="Address" value={job.address} />
            <DetailRow label="Type" value={capitalize(job.job_type)} />
            <DetailRow label="Due Date" value={formatDate(job.due_date)} />
            <DetailRow label="Budget" value={budgetDisplay} />
          </Card>

          {/* ── 4. CTA — only when pending_completion ── */}
          {/* @demo — replace with useConfirmJobComplete mutation */}
          {/* @backend rpc_confirm_job_complete — params: { p_job_id: jobId } */}
          {job.status === 'pending_completion' && (
            <Pressable
              onPress={handleConfirmComplete}
              style={({ pressed }) => ({
                backgroundColor: COLORS.warningAmber,
                opacity: pressed ? 0.85 : 1,
                borderRadius: 12,
                height: 52,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 8,
              })}
            >
              <Text style={{ color: COLORS.background, fontSize: 16, fontWeight: '600' }}>
                Confirm Job Complete
              </Text>
            </Pressable>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
};

export default AgentJobDetailScreen;
