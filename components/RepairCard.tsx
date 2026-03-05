// RepairCard.tsx
// ═══════════════════════════════════════════════════════════════
// Repair Card — Shared data-driven card for repair jobs (357 lines)
// Used on: HomeTabAgent (Active Repairs horizontal scroll)
//
// State-adaptive layout — content shifts based on job lifecycle:
//   OPEN:        Title → Due date (14pt) → Budget + bid count (12pt)
//   IN PROGRESS: Title → Contractor + amount (14pt) → Due date (12pt)
//
// Rationale: once a bid is accepted, budget and bid count are resolved
// decisions. The agent's context shifts from "who's bidding" to
// "who's doing the work." Showing dead info creates scan noise.
//
// @backend — Job data comes from useJobs() hook (TanStack Query)
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import type { Job, JobStatus, BidWithProfile } from '../types';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// STATUS CHIP CONFIG
// Maps JobStatus → display label, background tint, text color
//
// UX decision: "awarded" displays as "In Progress" because from the
// agent's perspective, once a bid is accepted the work is underway.
// The distinction between awarded/in_progress/pending_completion
// matters on RepairJobDetails — on the card, agents just need to
// know it's active vs open vs done.
// ─────────────────────────────────────────────

interface StatusChipConfig {
  label: string;
  bgColor: string;
  textColor: string;
}

const STATUS_CHIP_MAP: Record<string, StatusChipConfig> = {
  open: {
    label: 'Open',
    bgColor: 'rgba(0, 61, 195, 0.08)',
    textColor: '#003DC3',
  },
  awarded: {
    label: 'In Progress',
    bgColor: 'rgba(22, 163, 74, 0.10)',
    textColor: '#15803D',
  },
  in_progress: {
    label: 'In Progress',
    bgColor: 'rgba(22, 163, 74, 0.10)',
    textColor: '#15803D',
  },
  pending_completion: {
    label: 'Pending Review',
    bgColor: 'rgba(234, 88, 12, 0.10)',
    textColor: '#C2410C',
  },
  completed: {
    label: 'Completed',
    bgColor: '#F3F4F6',
    textColor: '#6B7280',
  },
  draft: {
    label: 'Draft',
    bgColor: '#F3F4F6',
    textColor: '#6B7280',
  },
  cancelled: {
    label: 'Cancelled',
    bgColor: '#F3F4F6',
    textColor: '#9CA3AF',
  },
};

// ─────────────────────────────────────────────
// STATUS CHIP COMPONENT
// ─────────────────────────────────────────────

const JobStatusChip: React.FC<{ status: JobStatus }> = ({ status }) => {
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
      <Text
        style={{
          fontSize: 11,
          fontWeight: '500',
          color: config.textColor,
          lineHeight: 16,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CalendarIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path
      d="M4.67 1.17V3.5M9.33 1.17V3.5M1.75 5.83H12.25M2.33 2.33H11.67C11.99 2.33 12.25 2.59 12.25 2.92V11.67C12.25 11.99 11.99 12.25 11.67 12.25H2.33C2.01 12.25 1.75 11.99 1.75 11.67V2.92C1.75 2.59 2.01 2.33 2.33 2.33Z"
      stroke={COLORS.lightText}
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

// ─────────────────────────────────────────────
// REPAIR CARD COMPONENT
// ─────────────────────────────────────────────

interface RepairCardProps {
  job: Job & { bids: BidWithProfile[] };
  onPress?: () => void;
  width?: number;
}

const RepairCard: React.FC<RepairCardProps> = ({ job, onPress, width }) => {
  const bidCount = job.bids?.length ?? 0;

  // Derive awarded contractor info from the accepted bid
  const awardedBid = job.bids?.find(b => b.status === 'accepted') as BidWithProfile | undefined;
  const awardedContractorName = awardedBid?.name;
  const awardedAmount = awardedBid?.price;

  // Job is "active" once a bid has been accepted — different info hierarchy
  const isActive = job.status !== 'open' && job.status !== 'draft' && !!awardedContractorName;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: width || '100%',
        padding: 16,
        backgroundColor: COLORS.background,
        borderRadius: 14,
        borderWidth: 0.68,
        borderColor: COLORS.cardBorder,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
        gap: 12,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      {/* Top row: Category pill + Status chip */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Category Pill */}
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: COLORS.tagBg,
            borderRadius: 9999,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '400',
              color: COLORS.tagText,
              lineHeight: 16,
            }}
          >
            {job.category}
          </Text>
        </View>

        {/* Status Chip */}
        {job.status && <JobStatusChip status={job.status} />}
      </View>

      {/* Title */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: '600',
          color: COLORS.darkText,
          lineHeight: 22,
        }}
        numberOfLines={2}
      >
        {job.title}
      </Text>

      {isActive ? (
        /* ── ACTIVE LAYOUT (awarded / in_progress / pending_completion) ──
           Primary: contractor name + accepted amount (14pt)
           Secondary: due date (12pt)
           No budget range, no bid count — those are pre-decision data */
        <>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: COLORS.darkText,
              lineHeight: 20,
            }}
            numberOfLines={1}
          >
            {awardedContractorName}{awardedAmount ? ` · ${awardedAmount}` : ''}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarIcon />
            <Text
              style={{
                fontSize: 12,
                fontWeight: '400',
                color: COLORS.lightText,
                lineHeight: 16,
              }}
            >
              Due {job.due_date}
            </Text>
            {job.is_urgent && (
              <View
                style={{
                  marginLeft: 2,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  backgroundColor: 'rgba(220, 38, 38, 0.08)',
                  borderRadius: 9999,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: '#DC2626',
                    lineHeight: 14,
                  }}
                >
                  URGENT
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        /* ── OPEN LAYOUT (open / draft) ──
           Primary: due date + urgent badge (14pt)
           Secondary: budget + bid count (12pt) */
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarIcon />
            <Text
              style={{
                fontSize: 14,
                fontWeight: '400',
                color: COLORS.bodyText,
                lineHeight: 20,
              }}
            >
              Due {job.due_date}
            </Text>
            {job.is_urgent && (
              <View
                style={{
                  marginLeft: 2,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  backgroundColor: 'rgba(220, 38, 38, 0.08)',
                  borderRadius: 9999,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    color: '#DC2626',
                    lineHeight: 14,
                  }}
                >
                  URGENT
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '400',
                color: COLORS.secondaryText,
                lineHeight: 16,
              }}
            >
              Budget: {job.budget_range}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <BidIcon />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: COLORS.primary,
                  lineHeight: 16,
                }}
              >
                {bidCount} {bidCount === 1 ? 'bid' : 'bids'}
              </Text>
            </View>
          </View>
        </>
      )}
    </Pressable>
  );
};

export default RepairCard;
