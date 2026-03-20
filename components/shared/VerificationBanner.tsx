// VerificationBanner.tsx
// ═══════════════════════════════════════════════════════════════
// Persistent amber banner encouraging profile verification (165 lines)
// Not shown when fully_verified. Contextual messaging by level + role.
// @demo none  @backend none — reads verification_level from props
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, Pressable, LayoutAnimation } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../lib/tokens';
import type { VerificationLevel } from '../../types';

// ─────────────────────────────────────────────
// MESSAGING
// ─────────────────────────────────────────────

type BannerLevel = 'none' | 'basic' | 'verified';

const MESSAGES: Record<BannerLevel, Record<'agent' | 'contractor', { message: string; cta: string }>> = {
  none: {
    agent: { message: 'Verify your profile to build trust with contractors', cta: 'Verify Now' },
    contractor: { message: 'Verify your profile to build trust with agents', cta: 'Verify Now' },
  },
  basic: {
    agent: { message: 'Add your license to get the verified badge', cta: 'Add License' },
    contractor: { message: 'Add your license to get the verified badge', cta: 'Add License' },
  },
  verified: {
    agent: { message: 'Your profile is verified', cta: 'View' },
    contractor: { message: 'Upload insurance to complete your profile', cta: 'Add Insurance' },
  },
};

// ─────────────────────────────────────────────
// SHIELD ICON (inline SVG)
// ─────────────────────────────────────────────

const ShieldIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.25C16.6 21.15 20 16.25 20 11V6l-8-4z"
      stroke={COLORS.warningAmber}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <Path
      d="M12 8v4M12 16h.01"
      stroke={COLORS.warningAmber}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// CLOSE ICON (inline SVG)
// ─────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path
      d="M18 6L6 18M6 6l12 12"
      stroke={COLORS.warningText}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// VERIFICATION BANNER
// ─────────────────────────────────────────────

interface VerificationBannerProps {
  level: VerificationLevel;
  role: 'agent' | 'contractor';
  onPress: () => void;
  onDismiss?: () => void;
}

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  level,
  role,
  onPress,
  onDismiss,
}) => {
  // Hooks must be called before any early return (rules-of-hooks)
  const shouldHide =
    level === 'fully_verified' || (level === 'verified' && role === 'agent');

  React.useEffect(() => {
    if (!shouldHide) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [shouldHide]);

  if (shouldHide) return null;

  const bannerLevel = level as BannerLevel;
  const { message, cta } = MESSAGES[bannerLevel][role];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.warningBg,
        borderWidth: 1,
        borderColor: COLORS.counterAmber,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        gap: 12,
      }}
    >
      <ShieldIcon />

      <Text
        style={{
          flex: 1,
          fontSize: 14,
          fontWeight: '400',
          color: COLORS.warningText,
          lineHeight: 20,
        }}
        numberOfLines={2}
      >
        {message}
      </Text>

      <Pressable
        onPress={onPress}
        style={{ height: 44, justifyContent: 'center', paddingHorizontal: 4 }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: COLORS.warningAmber,
          }}
        >
          {cta}
        </Text>
      </Pressable>

      {onDismiss && (
        <Pressable
          onPress={onDismiss}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <CloseIcon />
        </Pressable>
      )}
    </View>
  );
};

export default VerificationBanner;
