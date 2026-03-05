// JobTrackerTab.tsx
// ═══════════════════════════════════════════════════════════════
// Job Tracker — Contractor pipeline view (511 lines)
// Filtered list of all jobs the contractor is involved with,
// grouped by pipeline stage: Invited → Bid Sent → Active → Completed
//
// Filter chips (5): All, Invited, Bid Sent, Active, Completed
//   → useMemo filters MOCK_TRACKER_JOBS by stage
//   → Stage counts shown as badge on each chip
//
// @demo  9 mock jobs across all 4 pipeline stages (lines ~62–197)
//        2 invited, 2 bid_sent, 3 active, 2 completed
// @backend TODO: useContractorJobs() hook with status grouping
//   → supabase.from('jobs')
//     .select('*, bids!inner(*)')
//     .eq('bids.contractor_id', auth.uid())
//     .order('updated_at', { ascending: false })
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import { View, Text, StatusBar, ScrollView, Pressable, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SHADOWS } from '../lib/tokens';

// ─────────────────────────────────────────────
// NAVIGATION TYPES
// ─────────────────────────────────────────────

type ContractorJobsStackParamList = {
  ContractorJobsMain: undefined;
  ContractorJobDetails: { jobId: string };
  BidSubmission: { jobId: string };
};

type Nav = NativeStackNavigationProp<ContractorJobsStackParamList>;

// ─────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────

type PipelineStage = 'invited' | 'bid_sent' | 'active' | 'completed';
type FilterOption = 'all' | PipelineStage;

interface TrackerJob {
  id: string;
  title: string;
  address: string;
  trade: string;
  budgetRange: string;
  dueDate: string;
  agentName: string;
  agentAvatar: string;
  stage: PipelineStage;
  /** Detailed status label shown on card */
  statusLabel: string;
  /** Amount of accepted/submitted bid (if any) */
  bidAmount?: string;
  /** Time context: "2h ago", "Mar 1", etc. */
  timeLabel: string;
  isUrgent?: boolean;
}

// ─────────────────────────────────────────────
// MOCK DATA
// @demo — covers all 4 pipeline stages
// ─────────────────────────────────────────────

const MOCK_JOBS: TrackerJob[] = [
  // ── Invited (2) ──
  {
    id: 'inv1',
    title: 'Hot Water Heater Repair',
    address: '331 Oak Boulevard, Denver CO',
    trade: 'Plumber',
    budgetRange: '$300–$600',
    dueDate: 'Mar 10',
    agentName: 'Rachel Williams',
    agentAvatar: '#C4A882',
    stage: 'invited',
    statusLabel: 'Invitation',
    timeLabel: '5h ago',
    isUrgent: true,
  },
  {
    id: 'inv2',
    title: 'Pipe Insulation',
    address: '1847 Elm Street, Denver CO',
    trade: 'Plumber',
    budgetRange: '$200–$400',
    dueDate: 'Mar 15',
    agentName: 'Tom Anderson',
    agentAvatar: '#C5D4A8',
    stage: 'invited',
    statusLabel: 'Invitation',
    timeLabel: '5h ago',
  },
  // ── Bid Sent (2) ──
  {
    id: 'bid1',
    title: 'Bathroom Faucet Replacement',
    address: '920 Cedar Lane, Aurora CO',
    trade: 'Plumber',
    budgetRange: '$250–$500',
    dueDate: 'Mar 8',
    agentName: 'Sarah Chen',
    agentAvatar: '#A8B5D4',
    stage: 'bid_sent',
    statusLabel: 'Bid Pending',
    bidAmount: '$380',
    timeLabel: '1d ago',
  },
  {
    id: 'bid2',
    title: 'Dishwasher Installation',
    address: '2105 Pine Road, Lakewood CO',
    trade: 'Plumber',
    budgetRange: '$400–$700',
    dueDate: 'Mar 12',
    agentName: 'Marcus Lee',
    agentAvatar: '#B5C4A8',
    stage: 'bid_sent',
    statusLabel: 'Counter Received',
    bidAmount: '$520',
    timeLabel: '3h ago',
  },
  // ── Active (3) — awarded + in_progress ──
  {
    id: 'act1',
    title: 'Fix Leaking Kitchen Faucet',
    address: '4521 Elm Street, Denver CO',
    trade: 'Plumber',
    budgetRange: '$350–$550',
    dueDate: 'Mar 6',
    agentName: 'Rachel Williams',
    agentAvatar: '#C4A882',
    stage: 'active',
    statusLabel: 'In Progress',
    bidAmount: '$450',
    timeLabel: 'Started Feb 28',
  },
  {
    id: 'act2',
    title: 'Bathroom Pipe Replacement',
    address: '782 Maple Drive, Lakewood CO',
    trade: 'Plumber',
    budgetRange: '$600–$900',
    dueDate: 'Mar 5',
    agentName: 'Marcus Lee',
    agentAvatar: '#B5C4A8',
    stage: 'active',
    statusLabel: 'Pending Review',
    bidAmount: '$750',
    timeLabel: 'Submitted Mar 2',
  },
  {
    id: 'act3',
    title: 'Install Water Heater',
    address: '1150 Pine Court, Aurora CO',
    trade: 'Plumber',
    budgetRange: '$800–$1,200',
    dueDate: 'Mar 14',
    agentName: 'Emma Thompson',
    agentAvatar: '#A8C5DA',
    stage: 'active',
    statusLabel: 'Awarded',
    bidAmount: '$950',
    timeLabel: 'Awarded Mar 1',
  },
  // ── Completed (2) ──
  {
    id: 'done1',
    title: 'Garbage Disposal Install',
    address: '912 Cedar Road, Denver CO',
    trade: 'Plumber',
    budgetRange: '$200–$350',
    dueDate: 'Feb 20',
    agentName: 'Sarah Chen',
    agentAvatar: '#A8B5D4',
    stage: 'completed',
    statusLabel: 'Completed',
    bidAmount: '$280',
    timeLabel: 'Feb 20',
  },
  {
    id: 'done2',
    title: 'Water Line Repair',
    address: '2340 Birch Way, Centennial CO',
    trade: 'Plumber',
    budgetRange: '$500–$800',
    dueDate: 'Feb 15',
    agentName: 'Lisa Martinez',
    agentAvatar: '#B8A8D4',
    stage: 'completed',
    statusLabel: 'Completed',
    bidAmount: '$650',
    timeLabel: 'Feb 15',
  },
];

// ─────────────────────────────────────────────
// STATUS CHIP COLORS
// ─────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  Invitation:        { bg: COLORS.infoBg,    text: COLORS.primary },
  'Bid Pending':     { bg: COLORS.warningBg, text: COLORS.warningText },
  'Counter Received':{ bg: COLORS.warningBg, text: COLORS.counterAmber },
  'In Progress':     { bg: COLORS.feeBg,     text: COLORS.feeText },
  'Pending Review':  { bg: COLORS.warningBg, text: COLORS.warningText },
  Awarded:           { bg: COLORS.feeBg,     text: COLORS.feeText },
  Completed:         { bg: COLORS.chipBg,    text: COLORS.secondaryText },
};

// ─────────────────────────────────────────────
// FILTER CHIP CONFIG
// ─────────────────────────────────────────────

const FILTER_OPTIONS: { key: FilterOption; label: string }[] = [
  { key: 'all',       label: 'All' },
  { key: 'invited',   label: 'Invited' },
  { key: 'bid_sent',  label: 'Bid Sent' },
  { key: 'active',    label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────

const CalendarIcon: React.FC<{ color?: string }> = ({ color = COLORS.bodyText }) => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path d="M16 2V6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M8 2V6" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M3 10H21" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const AvatarPlaceholder: React.FC<{ name: string; color: string; size: number }> = ({ name, color, size }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
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
      <Text style={{ fontSize: size * 0.38, fontWeight: '600', color: '#FFFFFF' }}>
        {initials}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// JOB CARD
// ─────────────────────────────────────────────

const JobCard: React.FC<{ job: TrackerJob; onPress: () => void }> = ({ job, onPress }) => {
  const statusStyle = STATUS_STYLE[job.statusLabel] ?? { bg: COLORS.chipBg, text: COLORS.secondaryText };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: COLORS.background,
        borderRadius: DIMENSIONS.cardRadius,
        borderWidth: DIMENSIONS.cardBorderWidth,
        borderColor: COLORS.cardBorder,
        marginHorizontal: 16,
        opacity: pressed ? 0.85 : 1,
        ...SHADOWS.card,
      })}
    >
      {/* Row 1: Trade pill + Status chip */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingTop: 14,
        }}
      >
        {/* Trade pill */}
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: COLORS.tagBg,
            borderRadius: 9999,
            borderWidth: 0.68,
            borderColor: COLORS.infoBorder,
          }}
        >
          <Text style={{ ...TYPOGRAPHY.bodyS, color: COLORS.primary }}>
            {job.trade}
          </Text>
        </View>
        {/* Status chip */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {job.isUrgent && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 3,
                backgroundColor: COLORS.urgentBg,
                borderRadius: 9999,
              }}
            >
              <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '600', color: COLORS.urgentText }}>
                URGENT
              </Text>
            </View>
          )}
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: statusStyle.bg,
              borderRadius: 9999,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.bodyS, fontWeight: '500', color: statusStyle.text }}>
              {job.statusLabel}
            </Text>
          </View>
        </View>
      </View>

      {/* Row 2: Address + Budget header */}
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
          style={{ ...TYPOGRAPHY.headingM, color: COLORS.darkText, flex: 1 }}
          numberOfLines={2}
        >
          {job.address}
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.primary, lineHeight: 22 }}>
          {job.bidAmount ?? job.budgetRange}
        </Text>
      </View>

      {/* Row 3: Details */}
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 14, gap: 8 }}>
        {/* Title */}
        <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.bodyText }} numberOfLines={1}>
          {job.title}
        </Text>

        {/* Agent + Due date row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AvatarPlaceholder name={job.agentName} color={job.agentAvatar} size={24} />
            <Text style={{ ...TYPOGRAPHY.bodyS, color: COLORS.secondaryText }}>
              {job.agentName}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <CalendarIcon />
            <Text style={{ ...TYPOGRAPHY.bodyS, color: COLORS.bodyText }}>
              {job.dueDate}
            </Text>
          </View>
        </View>

        {/* Time label */}
        <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.lightText }}>
          {job.timeLabel}
        </Text>
      </View>
    </Pressable>
  );
};

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const JobTrackerTab: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');

  // Compute filtered list + counts
  const stageCounts = useMemo(() => {
    const counts: Record<PipelineStage, number> = { invited: 0, bid_sent: 0, active: 0, completed: 0 };
    MOCK_JOBS.forEach((j) => counts[j.stage]++);
    return counts;
  }, []);

  const filteredJobs = useMemo(() => {
    if (activeFilter === 'all') return MOCK_JOBS;
    return MOCK_JOBS.filter((j) => j.stage === activeFilter);
  }, [activeFilter]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View
        style={{
          height: DIMENSIONS.headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottomWidth: DIMENSIONS.headerBorderWidth,
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.background,
        }}
      >
        <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.primary }}>
          Job Tracker
        </Text>
      </View>

      {/* Filter chips */}
      <View
        style={{
          paddingVertical: 12,
          borderBottomWidth: DIMENSIONS.headerBorderWidth,
          borderBottomColor: COLORS.cardBorder,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {FILTER_OPTIONS.map(({ key, label }) => {
            const isActive = activeFilter === key;
            const count = key === 'all' ? MOCK_JOBS.length : stageCounts[key];
            return (
              <Pressable
                key={key}
                onPress={() => setActiveFilter(key)}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  backgroundColor: isActive ? COLORS.primary : COLORS.chipBg,
                  borderRadius: 9999,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    ...TYPOGRAPHY.bodyS,
                    fontWeight: isActive ? '500' : '400',
                    color: isActive ? '#FFFFFF' : COLORS.statText,
                  }}
                >
                  {label} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Job list */}
      <FlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24, gap: 12 }}
        renderItem={({ item }) => (
          <JobCard
            job={item}
            onPress={() => navigation.navigate('ContractorJobDetails', { jobId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 }}>
            <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.darkText }}>
              No jobs found
            </Text>
            <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, textAlign: 'center', paddingHorizontal: 40 }}>
              {activeFilter === 'all'
                ? 'You don\'t have any jobs yet. Browse matching jobs from the Home tab.'
                : `No jobs in the "${FILTER_OPTIONS.find((f) => f.key === activeFilter)?.label}" stage.`}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

export default JobTrackerTab;
