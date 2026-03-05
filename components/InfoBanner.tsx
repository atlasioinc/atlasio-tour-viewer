// InfoBanner.tsx
// ═══════════════════════════════════════════════════════════════
// Info Banner — Atlasio Design System (95 lines)
// Light blue callout used for contextual info, next-step
// guidance, and confirmation details across modals and screens.
//
// Tokens: bg #EFF6FF, border 1.35px #DBEAFE, text #003DC3, r14
//
// Usage:
//   <InfoBanner>Your job is now live…</InfoBanner>
//   <InfoBanner bold="What happens next:">Details here…</InfoBanner>
//   <InfoBanner size="sm">Compact modal text…</InfoBanner>
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text } from 'react-native';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

const BANNER_TOKENS = {
  bg: '#EFF6FF',
  border: '#DBEAFE',
  borderWidth: 1.35,
  borderRadius: 14,
  padding: 16,
  textColor: '#003DC3',
};

const SIZE_MAP = {
  sm: { fontSize: 12, lineHeight: 16 },
  md: { fontSize: 14, lineHeight: 22.75 },
} as const;

// ─────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────

interface InfoBannerProps {
  /** Main body text — or pass as children */
  children: React.ReactNode;
  /** Optional bold prefix (e.g. "What happens next:") */
  bold?: string;
  /** Text size: 'sm' for modals (12/16), 'md' for screens (14/22.75). Default: 'md' */
  size?: 'sm' | 'md';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const InfoBanner: React.FC<InfoBannerProps> = ({
  children,
  bold,
  size = 'md',
}) => {
  const textStyle = SIZE_MAP[size];

  return (
    <View
      style={{
        padding: BANNER_TOKENS.padding,
        backgroundColor: BANNER_TOKENS.bg,
        borderRadius: BANNER_TOKENS.borderRadius,
        borderWidth: BANNER_TOKENS.borderWidth,
        borderColor: BANNER_TOKENS.border,
      }}
    >
      {bold ? (
        <Text style={{ fontSize: textStyle.fontSize, lineHeight: textStyle.lineHeight }}>
          <Text style={{ fontWeight: '700', color: BANNER_TOKENS.textColor }}>
            {bold}
          </Text>
          <Text style={{ fontWeight: '400', color: BANNER_TOKENS.textColor }}>
            {' '}{children}
          </Text>
        </Text>
      ) : (
        <Text
          style={{
            fontSize: textStyle.fontSize,
            fontWeight: '400',
            color: BANNER_TOKENS.textColor,
            lineHeight: textStyle.lineHeight,
          }}
        >
          {children}
        </Text>
      )}
    </View>
  );
};

export default InfoBanner;
