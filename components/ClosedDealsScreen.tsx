// What: Closed deals history list for agent role
// Who: Agent role only
// Where: Navigated to from DealClosedCelebrationScreen "Done" CTA or Deals tab Closed chip
// @demo: Uses MOCK_CLOSED_DEALS from useClosedDeals — replace with rpc_get_closed_deals when deployed

// STATE FLOW:
// useClosedDeals() -> ClosedDeal[]
// Stats row: total deals + total volume
// FlatList of closed deal cards with left accent bar
// Empty state when no closed deals

import React, { useMemo } from 'react';
import { View, Text, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './HomeStack';
import { ScreenHeader } from './ScreenHeader';
import { COLORS, DIMENSIONS, SHADOWS } from '../lib/tokens';
import { useClosedDeals } from '../hooks/useData';
import type { ClosedDeal } from '../types';

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const formatPrice = (price: number): string => {
  return '$' + price.toLocaleString('en-US');
};

const formatClosingDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ClosedDealsScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { data: closedDeals } = useClosedDeals();
  const deals = useMemo(() => closedDeals ?? [], [closedDeals]);

  // ── Stats ──
  const totalVolume = useMemo(() => {
    return deals.reduce((sum, d) => sum + (d.salePrice ?? 0), 0);
  }, [deals]);

  // ── Render closed deal card ──
  const renderDealCard = ({ item }: { item: ClosedDeal }) => (
    <View style={{
      flexDirection: 'row',
      borderRadius: DIMENSIONS.cardRadius,
      borderWidth: DIMENSIONS.cardBorderWidth,
      borderColor: COLORS.cardBorder,
      backgroundColor: COLORS.background,
      marginBottom: 10,
      overflow: 'hidden',
      ...SHADOWS.card,
    }}>
      {/* Left accent bar — primary blue for closed deals */}
      <View style={{ width: 4, backgroundColor: COLORS.primary }} />

      {/* Card content */}
      <View style={{ flex: 1, padding: 14 }}>
        {/* Address */}
        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }} numberOfLines={1}>
          {item.address}
        </Text>

        {/* Buyer + sale price row */}
        <Text style={{ fontSize: 14, color: COLORS.lightText, marginTop: 4 }} numberOfLines={1}>
          {[
            item.buyerName,
            item.salePrice ? formatPrice(item.salePrice) : null,
          ].filter(Boolean).join(' · ')}
        </Text>

        {/* Closing date */}
        {item.closingDate ? (
          <Text style={{ fontSize: 14, color: COLORS.lightText, marginTop: 2 }}>
            Closed {formatClosingDate(item.closingDate)}
          </Text>
        ) : null}
      </View>

      {/* Trophy emoji */}
      <View style={{ justifyContent: 'center', paddingRight: 14 }}>
        <Text style={{ fontSize: 20 }}>🏆</Text>
      </View>
    </View>
  );

  // ── Empty state ──
  const renderEmptyState = () => (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 48 }}>🏆</Text>
      <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, marginTop: 16 }}>
        No closed deals yet
      </Text>
      <Text style={{ fontSize: 14, color: COLORS.lightText, marginTop: 8 }}>
        Your closed deals will appear here.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScreenHeader
        title="Closed Deals"
        showBack
        onBack={() => navigation.goBack()}
      />

      {/* ── Stats Row ── */}
      {deals.length > 0 ? (
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: DIMENSIONS.headerBorderWidth,
          borderBottomColor: COLORS.border,
        }}>
          <Text style={{ fontSize: 14, color: COLORS.lightText }}>
            {deals.length} deal{deals.length !== 1 ? 's' : ''} closed
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.lightText }}>
            Total Volume: {formatPrice(totalVolume)}
          </Text>
        </View>
      ) : null}

      {/* ── Deal List ── */}
      <FlatList
        data={deals}
        keyExtractor={(item) => item.id}
        renderItem={renderDealCard}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />
    </SafeAreaView>
  );
};

export default ClosedDealsScreen;
