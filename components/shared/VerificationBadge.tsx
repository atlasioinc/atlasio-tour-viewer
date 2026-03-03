// VerificationBadge.tsx
// ═══════════════════════════════════════════════════════════════
// Small shield icon badge displayed next to verified user names.
// Returns null for 'none' level — safe to render unconditionally.
// Import: import { VerificationBadge } from './shared/VerificationBadge';
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../lib/tokens';
import type { VerificationLevel } from '../../types';

interface VerificationBadgeProps {
  level: VerificationLevel;
  size?: 'small' | 'default';
}

const SIZES = {
  small: 16,
  default: 20,
};

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  level,
  size = 'default',
}) => {
  if (level === 'none') return null;

  const dim = SIZES[size];
  const color = level === 'basic' ? COLORS.lightText : COLORS.primary;

  // Shield with checkmark
  if (level === 'basic') {
    // Outline shield — phone verified only
    return (
      <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.25C16.6 21.15 20 16.25 20 11V6l-8-4z"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M9 12l2 2 4-4"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  // Solid shield — verified or fully_verified
  return (
    <Svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.25C16.6 21.15 20 16.25 20 11V6l-8-4z"
        fill={color}
      />
      <Path
        d="M9 12l2 2 4-4"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

export default VerificationBadge;
