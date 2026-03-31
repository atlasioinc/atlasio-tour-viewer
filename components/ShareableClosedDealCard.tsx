// What: Capturable deal card rendered inside DealClosedCelebrationScreen
// Who: Agent role only — rendered inside celebration overlay
// Where: Captured as PNG by react-native-view-shot for native Share sheet
// @demo: All values are passed from mock deal data
// @backend: Replace with live deal data from rpc_mark_deal_closed response

import React from 'react';
import { View, Text } from 'react-native';
import { COLORS, SHADOWS } from '../lib/tokens';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface ShareableClosedDealCardProps {
  address: string;
  buyerName: string | null;
  salePrice: number | null;
  closingDate: string | null;
  cardRef: React.RefObject<View | null>;
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const formatPrice = (price: number): string => {
  return '$' + price.toLocaleString('en-US');
};

const formatClosingDate = (isoDate: string): string => {
  const date = new Date(isoDate);
  return 'Closed ' + date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// ═══════════════════════════════════════════════════════════════
// SHAREABLE CLOSED DEAL CARD
// ═══════════════════════════════════════════════════════════════

const ShareableClosedDealCard: React.FC<ShareableClosedDealCardProps> = ({
  address,
  buyerName,
  salePrice,
  closingDate,
  cardRef,
}) => {
  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={{
        width: '100%',
        backgroundColor: COLORS.background,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.cardBorder,
        padding: 24,
        ...SHADOWS.card,
      }}
    >
      {/* ── Top Row: Atlasio wordmark + Closed pill ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.primary }}>
          atlasio
        </Text>
        <View style={{
          backgroundColor: COLORS.primary,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 4,
        }}>
          <Text style={{ fontSize: 12, color: COLORS.background, fontWeight: '600' }}>
            {'🏆 Closed'}
          </Text>
        </View>
      </View>

      {/* ── Divider ── */}
      <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 20 }} />

      {/* ── Main Content ── */}
      <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.darkText, marginBottom: 8 }}>
        {address}
      </Text>

      {buyerName ? (
        <Text style={{ fontSize: 14, color: COLORS.lightText, marginBottom: 4 }}>
          Buyer: {buyerName}
        </Text>
      ) : null}

      {salePrice ? (
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.primary, marginBottom: 4 }}>
          {formatPrice(salePrice)}
        </Text>
      ) : null}

      {closingDate ? (
        <Text style={{ fontSize: 14, color: COLORS.lightText }}>
          {formatClosingDate(closingDate)}
        </Text>
      ) : null}

      {/* ── Bottom Divider + Footer ── */}
      <View style={{ height: 1, backgroundColor: COLORS.border, marginTop: 20, marginBottom: 12 }} />
      <Text style={{ fontSize: 12, color: COLORS.lightText, textAlign: 'center' }}>
        Powered by Atlasio · Real Estate, Simplified
      </Text>
    </View>
  );
};

export default ShareableClosedDealCard;
