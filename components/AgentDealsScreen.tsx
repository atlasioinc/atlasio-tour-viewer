// AgentDealsScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Agent Deals Pipeline — Full deal list with filter chips (S66)
// Who: Agent role — views all active deals with status indicators
// Where: HomeStack → AgentDealsScreen (push from "View all deals →")
//
// Filter chips: All | Needs attention | Closing soon
// Cards: full-width, left accent bar colored by highest-priority status dot
//
// @demo mock data from useAgentDeals (hooks/useData.ts)
// @backend rpc_get_agent_deals — params: none (auth.uid() identifies agent)
// ═══════════════════════════════════════════════════════════════

// STATE FLOW:
// useAgentDeals() → AgentActiveDeal[]
// activeFilter state → filter deals for display
// per deal: compute highest-priority status dot across all partners → accent bar color
// deal tap → navigation.push('AgentDealDetail', { jobId })

import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './HomeStack';
import { ScreenHeader } from './ScreenHeader';
import { COLORS, DIMENSIONS, SHADOWS, TYPOGRAPHY } from '../lib/tokens';
import { useAgentDeals } from '../hooks/useData';
import { getSlotStatusDot, isMilestoneStale } from '../features/partners/lib/dealMilestones';
import type { AgentActiveDeal } from '../features/partners/types/partner.types';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

type DealFilter = 'all' | 'needs_attention' | 'closing_soon';

type Navigation = NativeStackNavigationProp<HomeStackParamList, 'AgentDealsScreen'>;

// ─────────────────────────────────────────────
// FILTER CONFIG
// ─────────────────────────────────────────────

const FILTER_OPTIONS: { key: DealFilter; label: string }[] = [
  { key: 'all',             label: 'All' },
  { key: 'needs_attention', label: 'Needs attention' },
  { key: 'closing_soon',    label: 'Closing soon' },
];

// ─────────────────────────────────────────────
// STATUS DOT COLORS — mirrors HomeTabAgent mapping
// ─────────────────────────────────────────────

const STATUS_DOT_COLORS: Record<string, string> = {
  red: COLORS.dangerText,
  amber: COLORS.warningAmber,
  green: COLORS.successGreen,
  gray: COLORS.secondaryText,
};

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/** Closing within 14 days from today */
const CLOSING_SOON_DAYS = 14;

function isClosingSoon(closingDate: string | null): boolean {
  if (!closingDate) return false;
  const closing = new Date(closingDate);
  const now = new Date();
  const diffDays = (closing.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= CLOSING_SOON_DAYS;
}

function dealNeedsAttention(deal: AgentActiveDeal): boolean {
  return deal.partners.some((p) => {
    const hasAlert = (p.alerts ?? []).some(a => !a.dismissed_at);
    if (hasAlert) return true;
    const hasStale = (p.milestones ?? []).some(m => isMilestoneStale(m, p.partner_role));
    return hasStale;
  });
}

/** Returns highest-priority status across all partners in a deal */
function getDealAccentStatus(deal: AgentActiveDeal): 'red' | 'amber' | 'green' | 'gray' {
  const PRIORITY: Record<string, number> = { red: 3, amber: 2, green: 1, gray: 0 };
  let highest = 'gray';
  for (const partner of deal.partners) {
    const dot = getSlotStatusDot(partner, partner.partner_role);
    if (PRIORITY[dot] > PRIORITY[highest]) highest = dot;
  }
  return highest as 'red' | 'amber' | 'green' | 'gray';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const AgentDealsScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { data: deals } = useAgentDeals();
  const [activeFilter, setActiveFilter] = useState<DealFilter>('all');

  // ── Filter logic ──
  const filteredDeals = useMemo(() => {
    if (!deals) return [];
    switch (activeFilter) {
      case 'needs_attention':
        return deals.filter(dealNeedsAttention);
      case 'closing_soon':
        return deals.filter(d => isClosingSoon(d.closing_date));
      default:
        return deals;
    }
  }, [deals, activeFilter]);

  const totalCount = deals?.length ?? 0;

  // ── Empty state messages per filter ──
  const emptyTitle = activeFilter === 'all'
    ? 'No active deals'
    : activeFilter === 'needs_attention'
      ? 'All deals on track'
      : 'No deals closing within 14 days';

  const emptySubtitle = activeFilter === 'all'
    ? 'Create your first deal to get started'
    : undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* ── Header ── */}
      <ScreenHeader
        title="Your Deals"
        showBack
        onBack={() => navigation.goBack()}
        rightElement={
          <Text style={{ fontSize: 14, color: COLORS.secondaryText }}>
            {totalCount} deal{totalCount !== 1 ? 's' : ''}
          </Text>
        }
      />

      {/* ── Filter Chips ── */}
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
            return (
              <Pressable
                key={key}
                onPress={() => setActiveFilter(key)}
                style={({ pressed }) => ({
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  backgroundColor: isActive ? COLORS.primary : COLORS.chipBg,
                  borderRadius: DIMENSIONS.pillRadius,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    ...TYPOGRAPHY.bodyM,
                    fontWeight: isActive ? '500' : '400',
                    color: isActive ? COLORS.background : COLORS.statText,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Deal List ── */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredDeals.length === 0 ? (
          /* ── Empty State ── */
          <View style={{ alignItems: 'center', paddingTop: 60 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText }}>
              {activeFilter === 'needs_attention' ? 'All deals on track ' : emptyTitle}
              {activeFilter === 'needs_attention' && (
                <Text style={{ color: COLORS.successGreen }}>✓</Text>
              )}
            </Text>
            {emptySubtitle && (
              <Text style={{ fontSize: 14, color: COLORS.secondaryText, marginTop: 4 }}>
                {emptySubtitle}
              </Text>
            )}
          </View>
        ) : (
          filteredDeals.map((deal) => (
            <DealCard
              key={deal.job_id}
              deal={deal}
              onPress={() => navigation.push('AgentDealDetail', { jobId: deal.job_id, transactionId: deal.transaction_id })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// ═══════════════════════════════════════════════════════════════
// DEAL CARD
// ═══════════════════════════════════════════════════════════════

interface DealCardProps {
  deal: AgentActiveDeal;
  onPress: () => void;
}

const DealCard: React.FC<DealCardProps> = ({ deal, onPress }) => {
  const accentStatus = getDealAccentStatus(deal);
  const accentColor = accentStatus === 'gray' ? COLORS.cardBorder : STATUS_DOT_COLORS[accentStatus];

  const totalAlerts = deal.partners.reduce(
    (sum, p) => sum + (p.alerts ?? []).filter(a => !a.dismissed_at).length, 0,
  );

  const closingLabel = deal.closing_date
    ? new Date(deal.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        borderRadius: DIMENSIONS.cardRadius,
        borderWidth: DIMENSIONS.cardBorderWidth,
        borderColor: COLORS.cardBorder,
        backgroundColor: COLORS.background,
        marginBottom: 10,
        ...SHADOWS.card,
        overflow: 'hidden',
        opacity: pressed ? 0.9 : 1,
      })}
    >
      {/* Left accent bar */}
      <View
        style={{
          width: 4,
          backgroundColor: accentColor,
        }}
      />

      {/* Card content */}
      <View style={{ flex: 1, padding: 14 }}>
        {/* Property address */}
        <Text
          style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}
          numberOfLines={1}
        >
          {deal.address}
        </Text>

        {/* Closing date */}
        {closingLabel && (
          <Text style={{ fontSize: 14, color: COLORS.secondaryText, marginTop: 4 }}>
            Closing {closingLabel}
          </Text>
        )}

        {/* Partner avatar row */}
        <View style={{ flexDirection: 'row', marginTop: 10, gap: 4 }}>
          {deal.partners.map((partner) => {
            const dot = getSlotStatusDot(partner, partner.partner_role);
            return (
              <View key={partner.partner_id} style={{ position: 'relative' }}>
                <View
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: DIMENSIONS.pillRadius,
                    backgroundColor: partner.partner_avatar_color ?? COLORS.secondaryText,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.background }}>
                    {(partner.name ?? '').charAt(0)}
                  </Text>
                </View>
                {/* Status dot — bottom-right on avatar */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: -1,
                    right: -1,
                    width: 8,
                    height: 8,
                    borderRadius: DIMENSIONS.pillRadius,
                    backgroundColor: STATUS_DOT_COLORS[dot],
                    borderWidth: 1.5,
                    borderColor: COLORS.background,
                  }}
                />
              </View>
            );
          })}
        </View>

        {/* Alert summary pill */}
        {totalAlerts > 0 && (
          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              backgroundColor: COLORS.mustHaveTileBg,
              borderRadius: DIMENSIONS.pillRadius,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.warningAmber }}>
              {totalAlerts} {totalAlerts === 1 ? 'needs attention' : 'alerts'}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
};

export default AgentDealsScreen;
