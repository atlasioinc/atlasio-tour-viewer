// JobTrackerTab.tsx
// ═══════════════════════════════════════════════════════════════
// Job Tracker — Contractor View (Placeholder)
// Future: Kanban-style or list view for job pipeline stages:
//   Invited → Bid Submitted → Active → Completed
// 
// @demo  Placeholder screen — build full implementation in Session 23+
// @backend Will use: useContractorJobs() hook with status grouping
//   → supabase.from('jobs')
//     .select('*, bids!inner(*)')
//     .eq('bids.contractor_id', auth.uid())
//     .order('updated_at', { ascending: false })
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { COLORS, TYPOGRAPHY } from '../lib/tokens';

// ─────────────────────────────────────────────
// ICON
// ─────────────────────────────────────────────

const KanbanIcon: React.FC = () => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={3} width={5} height={18} rx={1} stroke={COLORS.border} strokeWidth={1.5} />
    <Rect x={9.5} y={3} width={5} height={12} rx={1} stroke={COLORS.primary} strokeWidth={1.5} />
    <Rect x={16} y={3} width={5} height={15} rx={1} stroke={COLORS.border} strokeWidth={1.5} />
  </Svg>
);

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

const JobTrackerTab: React.FC = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View
        style={{
          height: 48,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottomWidth: 0.68,
          borderBottomColor: COLORS.border,
          backgroundColor: COLORS.background,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary }}>
          Job Tracker
        </Text>
      </View>

      {/* Placeholder content */}
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 40,
          gap: 16,
        }}
      >
        <KanbanIcon />
        <Text style={{ fontSize: 20, fontWeight: '600', color: COLORS.darkText, textAlign: 'center' }}>
          Job Tracker
        </Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '400',
            color: COLORS.secondaryText,
            textAlign: 'center',
            lineHeight: 20,
          }}
        >
          Track your jobs across every stage — from invited to completed. Coming in the next update.
        </Text>

        {/* Pipeline preview pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
          {['Invited', 'Bid Submitted', 'Active', 'Completed'].map((stage) => (
            <View
              key={stage}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 7,
                backgroundColor: COLORS.tagBg,
                borderRadius: 9999,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.tagText, lineHeight: 18 }}>
                {stage}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default JobTrackerTab;
