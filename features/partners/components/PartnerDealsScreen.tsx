// PartnerDealsScreen.tsx
// What: Full deal pipeline for partner — all active deals sorted by closing date, expanded by default
// Who: Partner role users — role-agnostic layout, milestone data differs by role
// Where: BottomTabNavigator → Deals tab (replaces Find tab for partner role)
// @demo PARTNER_TRACK_ENABLED must be false before any commit

// STATE FLOW:
// usePartnerActiveDeals() → allDeals → sorted by closing_date ASC nulls last
// activeFilter → 'all' | 'needs_attention' | 'closing_soon' → filters displayed deals
// closingSoonDeals → deals closing within 14 days
// needsAttentionDeals → deals with undismissed alerts or stale milestones
// useUpdateMilestoneStatus() → optimistic cycle on milestone tap
// usePostDealAlert() → fires on composer Send tap

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, DIMENSIONS } from '../../../lib/tokens';
import { isMilestoneStale } from '../lib/dealMilestones';
import ActiveDealCard from './ActiveDealCard';
import {
  usePartnerActiveDeals,
  useUpdateMilestoneStatus,
  usePostDealAlert,
  useDismissDealAlert,
} from '../hooks/usePartnerData';
import type { PartnerRole, PartnerActiveDeal, MilestoneStatus, AlertType } from '../types/partner.types';

// ─────────────────────────────────────────────────────────────────
// PROPS & CONSTANTS
// ─────────────────────────────────────────────────────────────────

interface PartnerDealsScreenProps {
  partnerRole?: PartnerRole;
}

type FilterType = 'all' | 'needs_attention' | 'closing_soon';
const CLOSING_SOON_DAYS = 14;

// @demo — hardcoded partner ID for mock data
const DEMO_PARTNER_ID = 'partner-1';

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

const PartnerDealsScreen: React.FC<PartnerDealsScreenProps> = ({ partnerRole = 'Mortgage Pro' }) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // ── Hooks ──
  const { data: allDeals = [] } = usePartnerActiveDeals(DEMO_PARTNER_ID);
  const updateMilestone = useUpdateMilestoneStatus();
  const postAlert = usePostDealAlert();
  const dismissAlert = useDismissDealAlert();

  // ── Derived data ──
  const now = useMemo(() => new Date(), []);

  const closingSoonDeals = useMemo(() =>
    allDeals.filter(d => {
      if (!d.closing_date) return false;
      const daysUntil = Math.ceil((new Date(d.closing_date).getTime() - now.getTime()) / 86400000);
      return daysUntil <= CLOSING_SOON_DAYS && daysUntil > 0;
    }),
  [allDeals, now]);

  const needsAttentionDeals = useMemo(() =>
    allDeals.filter(d =>
      d.alerts.length > 0 ||
      d.milestones.some(ms => isMilestoneStale(ms, partnerRole)),
    ),
  [allDeals, partnerRole]);

  const filteredDeals = useMemo(() => {
    switch (activeFilter) {
      case 'needs_attention': return needsAttentionDeals;
      case 'closing_soon': return closingSoonDeals;
      default: return allDeals;
    }
  }, [activeFilter, allDeals, needsAttentionDeals, closingSoonDeals]);

  // ── Group deals for "all" filter ──
  const closingSoonGroup = useMemo(() =>
    filteredDeals.filter(d => {
      if (!d.closing_date) return false;
      const daysUntil = Math.ceil((new Date(d.closing_date).getTime() - now.getTime()) / 86400000);
      return daysUntil <= CLOSING_SOON_DAYS && daysUntil > 0;
    }),
  [filteredDeals, now]);

  const activeGroup = useMemo(() =>
    filteredDeals.filter(d => !closingSoonGroup.includes(d)),
  [filteredDeals, closingSoonGroup]);

  // ── Handlers ──
  const handleMilestoneTap = useCallback((milestoneId: string, currentStatus: MilestoneStatus) => {
    const nextStatus: MilestoneStatus =
      currentStatus === 'pending' ? 'in_progress'
      : currentStatus === 'in_progress' ? 'complete'
      : 'pending';
    const completedAt = nextStatus === 'complete' ? new Date().toISOString() : null;
    updateMilestone.mutate({ milestoneId, status: nextStatus, completedAt, partnerId: DEMO_PARTNER_ID });
  }, [updateMilestone]);

  const handlePostAlert = useCallback((jobId: string, alertType: AlertType, message: string, expiresAt: string | null, transactionId?: string) => {
    // @backend rpc_post_deal_alert — S88: transaction_id forwarded from ActiveDealCard when available
    postAlert.mutate({ jobId, alertType, message, expiresAt, partnerId: DEMO_PARTNER_ID, transactionId });
  }, [postAlert]);

  const handleDismissAlert = useCallback((alertId: string) => {
    dismissAlert.mutate({ alertId, partnerId: DEMO_PARTNER_ID });
  }, [dismissAlert]);

  // ── Filter chip counts ──
  const filterChips: { key: FilterType; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: allDeals.length },
    { key: 'needs_attention', label: 'Needs attention', count: needsAttentionDeals.length },
    { key: 'closing_soon', label: 'Closing soon', count: closingSoonDeals.length },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={{
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.lg,
        paddingBottom: SPACING.lg,
        borderBottomWidth: DIMENSIONS.headerBorderWidth,
        borderBottomColor: COLORS.border,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.darkText }}>Deals</Text>
        <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, marginTop: 2 }}>
          {allDeals.length} active {'\u00B7'} sorted by closing date
        </Text>
      </View>

      {/* ── Filter Chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: SPACING.xl,
          paddingVertical: SPACING.lg,
          gap: SPACING.md,
        }}
      >
        {filterChips.map(chip => {
          const isActive = activeFilter === chip.key;
          return (
            <Pressable
              key={chip.key}
              onPress={() => setActiveFilter(chip.key)}
              style={{
                height: 32,
                paddingHorizontal: 14,
                justifyContent: 'center',
                borderRadius: DIMENSIONS.pillRadius,
                backgroundColor: isActive ? COLORS.accentBlue : COLORS.chipBg,
              }}
            >
              <Text style={{
                fontSize: 14,
                fontWeight: '500',
                color: isActive ? COLORS.background : COLORS.darkText,
              }}>
                {chip.label} ({chip.count})
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ── Deal List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {filteredDeals.length === 0 ? (
          /* Empty state per filter */
          <View style={{
            padding: SPACING['3xl'],
            alignItems: 'center',
            marginTop: SPACING['4xl'],
          }}>
            {activeFilter === 'needs_attention' ? (
              <View style={{
                padding: SPACING.xl,
                borderRadius: DIMENSIONS.cardRadius,
                backgroundColor: COLORS.cardGreen,
                borderWidth: DIMENSIONS.cardBorderWidth,
                borderColor: COLORS.cardGreenBorder,
                alignItems: 'center',
                alignSelf: 'stretch',
                marginHorizontal: SPACING.xl,
              }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.addedGreen }}>
                  All deals on track
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.scoreGreen, marginTop: SPACING.sm }}>
                  Nothing needs your attention right now
                </Text>
              </View>
            ) : (
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText }}>
                No deals closing within 14 days
              </Text>
            )}
          </View>
        ) : activeFilter === 'all' ? (
          /* Grouped view: Closing Soon + Active */
          <>
            {closingSoonGroup.length > 0 && (
              <View style={{ paddingHorizontal: SPACING.xl }}>
                <View style={{
                  paddingVertical: SPACING.lg,
                  borderBottomWidth: 0.5,
                  borderBottomColor: COLORS.border,
                  marginBottom: SPACING.lg,
                }}>
                  <Text style={{
                    fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    Closing within 14 days ({closingSoonGroup.length})
                  </Text>
                </View>
                {closingSoonGroup.map(deal => (
                  <ActiveDealCard
                    key={deal.job_id}
                    deal={deal}
                    partnerRole={partnerRole}
                    onMilestoneTap={handleMilestoneTap}
                    onPostAlert={handlePostAlert}
                    onDismissAlert={handleDismissAlert}
                  />
                ))}
              </View>
            )}

            {activeGroup.length > 0 && (
              <View style={{ paddingHorizontal: SPACING.xl }}>
                <View style={{
                  paddingVertical: SPACING.lg,
                  borderBottomWidth: 0.5,
                  borderBottomColor: COLORS.border,
                  marginBottom: SPACING.lg,
                }}>
                  <Text style={{
                    fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
                    textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>
                    Active ({activeGroup.length})
                  </Text>
                </View>
                {activeGroup.map(deal => (
                  <ActiveDealCard
                    key={deal.job_id}
                    deal={deal}
                    partnerRole={partnerRole}
                    onMilestoneTap={handleMilestoneTap}
                    onPostAlert={handlePostAlert}
                    onDismissAlert={handleDismissAlert}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          /* Flat list for filtered views */
          <View style={{ paddingHorizontal: SPACING.xl }}>
            {filteredDeals.map(deal => (
              <ActiveDealCard
                key={deal.job_id}
                deal={deal}
                partnerRole={partnerRole}
                onMilestoneTap={handleMilestoneTap}
                onPostAlert={handlePostAlert}
                onDismissAlert={handleDismissAlert}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default PartnerDealsScreen;
