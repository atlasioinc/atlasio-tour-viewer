// UnreadIndicator.tsx
// ═══════════════════════════════════════════════════════════════
// Shared Unread Indicator — single source of truth for "new content"
// visual cues across Inbox surfaces.
//
// S162c-patch — design contract (permanent):
//   variant="count" → "volume matters"   (agent triage, contractor action queue)
//   variant="dot"   → "attention needed" (partner deal_chat, future presence)
//   tone="primary"  → conversational     (blue,  COLORS.primary)
//   tone="danger"   → action urgency     (red,   COLORS.notificationRed)
//
// Used by:
//   InboxList (agent)            — variant="count" tone="primary" OR variant="dot"
//   ContractorInboxList job      — variant="count" tone="danger" position="absolute"
//   ContractorInboxList deal_chat— variant="dot"   (count deliberately hidden)
//
// Not used by (different semantic):
//   Tab bar badges, alert banners, notifications screen — out of scope S162c-patch.
//
// @demo  No mock data — pure UI primitive
// @backend none — stateless presenter
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../lib/tokens';

export interface UnreadIndicatorProps {
  variant: 'dot' | 'count';
  /** Required when variant='count'; ignored for 'dot'. */
  count?: number;
  /** Defaults true; false renders null. */
  show?: boolean;
  /** Defaults 'inline'. 'absolute' applies top:-4,right:-4 — parent must be position:'relative'. */
  position?: 'absolute' | 'inline';
  /** Defaults 'md'. */
  size?: 'sm' | 'md';
  /** Defaults 'danger' on count variant. Ignored for dot (always primary). */
  tone?: 'primary' | 'danger';
  /** Overrides auto label. Auto: 'Unread' for dot, `${count} unread` for count. */
  accessibilityLabel?: string;
}

const UnreadIndicator: React.FC<UnreadIndicatorProps> = ({
  variant,
  count,
  show = true,
  position = 'inline',
  size = 'md',
  tone = 'danger',
  accessibilityLabel,
}) => {
  // Early returns — guards for render=null cases
  if (show === false) return null;
  if (variant === 'count' && (count === undefined || count <= 0)) return null;

  // ── DOT variant ──────────────────────────────────────────────
  if (variant === 'dot') {
    const dotSize = size === 'sm' ? 8 : 10;
    const absoluteStyle =
      position === 'absolute'
        ? ({ position: 'absolute' as const, top: -4, right: -4 })
        : null;

    return (
      <View
        accessible
        accessibilityLabel={accessibilityLabel ?? 'Unread'}
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: 9999,
          backgroundColor: COLORS.primary,
          ...absoluteStyle,
        }}
      />
    );
  }

  // ── COUNT variant ────────────────────────────────────────────
  const displayCount = (count as number) > 99 ? '99+' : String(count);
  const minWidth = size === 'sm' ? 16 : 18;
  const height = size === 'sm' ? 16 : 20;
  const backgroundColor = tone === 'primary' ? COLORS.primary : COLORS.notificationRed;
  const needsBorder = position === 'absolute';
  const absoluteStyle =
    position === 'absolute'
      ? ({ position: 'absolute' as const, top: -4, right: -4 })
      : null;

  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? `${count} unread`}
      style={{
        minWidth,
        height,
        paddingHorizontal: 6,
        borderRadius: 9999,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: needsBorder ? 2 : 0,
        borderColor: needsBorder ? COLORS.background : 'transparent',
        ...absoluteStyle,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.onPrimary, textAlign: 'center' }}>
        {displayCount}
      </Text>
    </View>
  );
};

export default UnreadIndicator;
