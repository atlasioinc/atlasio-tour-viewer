// ═══════════════════════════════════════════════════════════════
// components/shared/EmptyState.tsx
// Shared empty-state component (S149a).
//
// One reusable component used across all 10 list/feed screens.
// No screen should implement its own empty-state UI inline.
//
// Consumers (S149a wiring):
//   • InboxList            — illustration="inbox"
//   • FindTab              — illustration="find" (only when search/filter active)
//   • NetworkTab           — illustration="network"
//   • JobTrackerTab        — illustration="job_tracker" (per-filter copy)
//   • ContractorHomeTab    — illustration="contractor_home"
//   • AgentDealsScreen     — illustration="agent_deals" (CTA gated on DEAL_CREATION_ENABLED)
//   • NotificationsTab     — illustration="notifications"
//   • RepairJobDetails     — illustration="job_bids" (only when status==='open' && bids empty)
//   • VouchFeedSection     — illustration="vouch_feed" (CTA role-branched)
//   • ProfileTab           — illustration="profile_vouches"
//
// To add a new illustration:
//   1. Add a new key to the EmptyStateIllustration union below
//   2. Implement the SVG in EmptyStateIllustrations.tsx
//   3. Add a case in renderIllustration() below
//
// @backend none — purely presentational
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { COLORS } from '../../lib/tokens';
import {
  AgentDealsIllustration,
  ContractorHomeIllustration,
  FindIllustration,
  InboxIllustration,
  JobBidsIllustration,
  JobTrackerIllustration,
  NetworkIllustration,
  NotificationsIllustration,
  ProfileVouchesIllustration,
  VouchFeedIllustration,
} from './EmptyStateIllustrations';

// ─── TYPES ───
export type EmptyStateIllustration =
  | 'inbox'
  | 'find'
  | 'network'
  | 'job_tracker'
  | 'contractor_home'
  | 'agent_deals'
  | 'notifications'
  | 'job_bids'
  | 'vouch_feed'
  | 'profile_vouches';

export interface EmptyStateProps {
  illustration: EmptyStateIllustration;
  title: string;
  body: string;
  ctaLabel?: string;          // optional — some states have no CTA
  onCta?: () => void;         // required if ctaLabel provided
  style?: ViewStyle;          // outer container override
}

// ─── ILLUSTRATIONS ───
const renderIllustration = (key: EmptyStateIllustration): React.ReactElement => {
  switch (key) {
    case 'inbox':            return <InboxIllustration />;
    case 'find':             return <FindIllustration />;
    case 'network':          return <NetworkIllustration />;
    case 'job_tracker':      return <JobTrackerIllustration />;
    case 'contractor_home':  return <ContractorHomeIllustration />;
    case 'agent_deals':      return <AgentDealsIllustration />;
    case 'notifications':    return <NotificationsIllustration />;
    case 'job_bids':         return <JobBidsIllustration />;
    case 'vouch_feed':       return <VouchFeedIllustration />;
    case 'profile_vouches':  return <ProfileVouchesIllustration />;
  }
};

// ─── LAYOUT ───
const EmptyState: React.FC<EmptyStateProps> = ({
  illustration, title, body, ctaLabel, onCta, style,
}) => {
  const showCta = !!ctaLabel && !!onCta;
  return (
    <View style={[styles.container, style]}>
      <View style={styles.illustration}>{renderIllustration(illustration)}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {showCta && (
        <Pressable
          onPress={onCta}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  illustration: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 17,
    fontWeight: '500',
    color: COLORS.darkText,
    textAlign: 'center',
  },
  body: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.secondaryText,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  cta: {
    marginTop: 20,
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primary,
  },
});

export default EmptyState;
