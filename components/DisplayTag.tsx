// DisplayTag.tsx
// ═══════════════════════════════════════════════════════════════
// Shared Display Tag — Read-only tag pills for profiles and cards (274 lines)
// Exports: DisplayTag, DisplayTagRow, StatPill
// Ghost variant is tappable (for own-profile "Add" actions).
//
// @demo  No mock data — pure UI component
// @backend none — stateless presenter
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, Pressable, ViewStyle } from 'react-native';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// VARIANT STYLES
// ─────────────────────────────────────────────

type DisplayTagVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'ghost';

const VARIANT_STYLES: Record<DisplayTagVariant, { bg: string; text: string; borderColor?: string; borderStyle?: 'solid' | 'dashed' }> = {
  default:  { bg: COLORS.tagBg,      text: COLORS.tagText },
  primary:  { bg: '#E8EEFF',         text: COLORS.primary },
  success:  { bg: '#ECFDF5',         text: COLORS.successGreen },
  warning:  { bg: '#FFF8E1',         text: COLORS.counterAmber },
  error:    { bg: '#FEF2F2',         text: COLORS.errorRed },
  ghost:    { bg: 'transparent',     text: COLORS.lightText, borderColor: COLORS.border, borderStyle: 'dashed' },
};

// ─────────────────────────────────────────────
// DISPLAY TAG
// Light bg pill, non-interactive (except ghost variant)
// Use on: ProCard, ProProfile, ProfileTab
// ─────────────────────────────────────────────

interface DisplayTagProps {
  label: string;
  /** Semantic variant (default: 'default') */
  variant?: DisplayTagVariant;
  /** Background color override — takes precedence over variant */
  bgColor?: string;
  /** Text color override — takes precedence over variant */
  textColor?: string;
  /** Font size (default: 12) */
  fontSize?: number;
  /** onPress handler — wraps in Pressable when provided (used by ghost variant) */
  onPress?: () => void;
}

export const DisplayTag: React.FC<DisplayTagProps> = ({
  label,
  variant = 'default',
  bgColor,
  textColor,
  fontSize = 14,
  onPress,
}) => {
  const variantStyle = VARIANT_STYLES[variant];
  const bg = bgColor ?? variantStyle.bg;
  const text = textColor ?? variantStyle.text;

  const tagView = (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 5,
        backgroundColor: bg,
        borderRadius: 10,
        ...(variantStyle.borderColor ? {
          borderWidth: 1,
          borderColor: variantStyle.borderColor,
          borderStyle: variantStyle.borderStyle ?? 'solid',
        } : {}),
      }}
    >
      <Text style={{ fontSize, fontWeight: '400', color: text, lineHeight: 16 }}>
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={4}>
        {tagView}
      </Pressable>
    );
  }

  return tagView;
};

// ─────────────────────────────────────────────
// DISPLAY TAG ROW
// Wrapping row of tags with optional max + overflow indicator
// ─────────────────────────────────────────────

interface DisplayTagRowProps {
  tags: string[];
  /** Max visible tags before "+N more" (default: no limit) */
  maxVisible?: number;
  /** Gap between tags (default: 6) */
  gap?: number;
  /** Tag background override */
  bgColor?: string;
  /** Tag text color override */
  textColor?: string;
  /** Row style override */
  style?: ViewStyle;
}

export const DisplayTagRow: React.FC<DisplayTagRowProps> = ({
  tags,
  maxVisible,
  gap = 6,
  bgColor,
  textColor,
  style,
}) => {
  const visibleTags = maxVisible ? tags.slice(0, maxVisible) : tags;
  const overflow = maxVisible && tags.length > maxVisible ? tags.length - maxVisible : 0;

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap, ...style }}>
      {visibleTags.map((tag) => (
        <DisplayTag key={tag} label={tag} bgColor={bgColor} textColor={textColor} />
      ))}
      {overflow > 0 && (
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 5,
            backgroundColor: bgColor || COLORS.tagBg,
            borderRadius: 10,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: textColor || COLORS.tagText,
              lineHeight: 16,
            }}
          >
            +{overflow} more
          </Text>
        </View>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────
// STAT PILL
// Blue-tinted pill with icon + text (lightning stat on ProCard)
// ─────────────────────────────────────────────

interface StatPillProps {
  label: string;
  icon?: React.ReactNode;
  /** Background color (default: COLORS.statBg) */
  bgColor?: string;
  /** Text color (default: COLORS.statText) */
  textColor?: string;
}

export const StatPill: React.FC<StatPillProps> = ({
  label,
  icon,
  bgColor = COLORS.statBg,
  textColor = COLORS.statText,
}) => (
  <View
    style={{
      height: 32,
      paddingHorizontal: 12,
      paddingVertical: 4,
      backgroundColor: bgColor,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    }}
  >
    {icon}
    <Text style={{ fontSize: 12, fontWeight: '500', color: textColor, lineHeight: 16 }}>
      {label}
    </Text>
  </View>
);

// ─────────────────────────────────────────────
// PROFILE PILL
// Rounded pill for profile display (specialties, languages)
// Used on ProfileTab under bio
// ─────────────────────────────────────────────

interface ProfilePillProps {
  label: string;
  /** Background color (default: COLORS.tagBg) */
  bgColor?: string;
  /** Text color (default: COLORS.statText) */
  textColor?: string;
}

export const ProfilePill: React.FC<ProfilePillProps> = ({
  label,
  bgColor = COLORS.tagBg,
  textColor = COLORS.statText,
}) => (
  <View
    style={{
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 9999,
      backgroundColor: bgColor,
    }}
  >
    <Text style={{ fontSize: 13, fontWeight: '400', color: textColor, lineHeight: 18 }}>
      {label}
    </Text>
  </View>
);

// ─────────────────────────────────────────────
// PROFILE PILL ROW
// Centered wrapping row of ProfilePills
// ─────────────────────────────────────────────

interface ProfilePillRowProps {
  items: string[];
  /** Gap between pills (default: 8) */
  gap?: number;
  /** Center the row (default: true) */
  centered?: boolean;
}

export const ProfilePillRow: React.FC<ProfilePillRowProps> = ({
  items,
  gap = 8,
  centered = true,
}) => {
  if (items.length === 0) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
        ...(centered ? { justifyContent: 'center' } : {}),
      }}
    >
      {items.map((item) => (
        <ProfilePill key={item} label={item} />
      ))}
    </View>
  );
};

// ─────────────────────────────────────────────
// USAGE EXAMPLES
// ─────────────────────────────────────────────
//
// Tags on a ProCard:
//   <DisplayTagRow tags={pro.tags} maxVisible={3} />
//
// Single tag:
//   <DisplayTag label="VA Certified" />
//
// Ghost tag on own profile (tappable):
//   <DisplayTag label="+ Add License" variant="ghost" onPress={() => navigate('Verification')} />
//
// Stat pill with lightning icon:
//   <StatPill label="Closes in 19 days" icon={<LightningIcon />} />
//
// Profile specialties + languages:
//   <ProfilePillRow items={[...specialties, ...languages]} />
