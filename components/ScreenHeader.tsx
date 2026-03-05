// ScreenHeader.tsx
// ═══════════════════════════════════════════════════════════════
// Shared Screen Header — Bookend centering pattern (228 lines)
// Equal-width left/right containers ensure mathematical centering
// @demo none  @backend none — pure UI component
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// TODO: Import from tokens.ts when wiring to live project
// ─────────────────────────────────────────────

const COLORS = {
  primary: '#003DC3',
  background: '#FFFFFF',
  border: '#E5E7EB',
  darkText: '#1C1C1E',
};

const DIMENSIONS = {
  headerHeight: 48,
  headerBorderWidth: 0.68,
  headerBookendWidth: 80,
};

// ─────────────────────────────────────────────
// DEFAULT BACK ARROW ICON
// ─────────────────────────────────────────────

const BackArrowIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M12.5 15L7.5 10L12.5 5"
      stroke={COLORS.darkText}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// SCREEN HEADER COMPONENT
// ─────────────────────────────────────────────

interface ScreenHeaderProps {
  /** Title text displayed in center */
  title: string;
  /** Title color (default: COLORS.primary) */
  titleColor?: string;
  /** Title font weight (default: '600') */
  titleWeight?: '400' | '500' | '600' | '700';
  /** Title font size (default: 16) */
  titleSize?: number;

  // ── Left action ──
  /** Show back arrow on left (default: true for pushed screens) */
  showBack?: boolean;
  /** Custom back handler (default: navigation.goBack) */
  onBack?: () => void;
  /** Custom left element (replaces back arrow) */
  leftElement?: React.ReactNode;

  // ── Right action ──
  /** Text button on right (e.g., "Save", "Done", "Edit") */
  rightLabel?: string;
  /** Right button handler */
  onRightPress?: () => void;
  /** Right button disabled state */
  rightDisabled?: boolean;
  /** Right button opacity when disabled (default: 0.4) */
  rightDisabledOpacity?: number;
  /** Custom right element (replaces text button) */
  rightElement?: React.ReactNode;

  // ── Styling ──
  /** Show bottom border (default: true) */
  showBorder?: boolean;
  /** Background color (default: COLORS.background) */
  backgroundColor?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  titleColor = COLORS.primary,
  titleWeight = '600',
  titleSize = 16,
  showBack = true,
  onBack,
  leftElement,
  rightLabel,
  onRightPress,
  rightDisabled = false,
  rightDisabledOpacity = 0.4,
  rightElement,
  showBorder = true,
  backgroundColor = COLORS.background,
}) => {
  return (
    <View
      style={{
        backgroundColor,
        ...(showBorder
          ? {
              borderBottomWidth: DIMENSIONS.headerBorderWidth,
              borderBottomColor: COLORS.border,
            }
          : {}),
      }}
    >
      <View
        style={{
          height: DIMENSIONS.headerHeight,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}
      >
        {/* Left bookend */}
        <View
          style={{
            width: DIMENSIONS.headerBookendWidth,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
        >
          {leftElement || (
            showBack && onBack ? (
              <Pressable
                onPress={onBack}
                hitSlop={12}
                style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
              >
                <BackArrowIcon />
              </Pressable>
            ) : null
          )}
        </View>

        {/* Center title */}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              fontSize: titleSize,
              fontWeight: titleWeight,
              color: titleColor,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
        </View>

        {/* Right bookend */}
        <View
          style={{
            width: DIMENSIONS.headerBookendWidth,
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {rightElement || (
            rightLabel && onRightPress ? (
              <Pressable
                onPress={onRightPress}
                disabled={rightDisabled}
                style={({ pressed }) => ({
                  height: DIMENSIONS.headerHeight,
                  justifyContent: 'center',
                  opacity: rightDisabled
                    ? rightDisabledOpacity
                    : pressed
                    ? 0.6
                    : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: titleSize,
                    fontWeight: '500',
                    color: titleColor,
                  }}
                >
                  {rightLabel}
                </Text>
              </Pressable>
            ) : null
          )}
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────
// USAGE EXAMPLES
// ─────────────────────────────────────────────
//
// Simple pushed screen with back arrow:
//   <ScreenHeader title="Edit Profile" onBack={() => navigation.goBack()} />
//
// With Save button:
//   <ScreenHeader
//     title="Edit Profile"
//     onBack={() => navigation.goBack()}
//     rightLabel={isSaving ? 'Saving...' : 'Save'}
//     onRightPress={handleSave}
//     rightDisabled={isSaving}
//   />
//
// Tab screen (no back arrow):
//   <ScreenHeader title="My Profile" showBack={false} />
//
// With custom right element (icon):
//   <ScreenHeader
//     title="My Profile"
//     showBack={false}
//     rightElement={<Pressable onPress={openSettings}><SettingsIcon /></Pressable>}
//   />
//
// For fullScreenModal screens, wrap with safe area:
//   <View style={{ paddingTop: insets.top }}>
//     <ScreenHeader title="Post Job" onBack={handleClose} />
//   </View>
