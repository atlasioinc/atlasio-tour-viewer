// Button.tsx
// ═══════════════════════════════════════════════════════════════
// Shared Button Component — Single source of truth for all CTAs
// Variants: primary (filled blue), secondary (outlined), card (compact)
// Import: import { PrimaryButton, SecondaryButton, CardButton } from './Button';
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { Pressable, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

// ─────────────────────────────────────────────
// DESIGN TOKENS (inline to keep component self-contained)
// TODO: Import from tokens.ts when wiring to live project
// ─────────────────────────────────────────────

const COLORS = {
  primary: '#003DC3',
  background: '#FFFFFF',
  disabledBg: '#E5E7EB',
  disabledText: '#99A1AF',
};

const DIMENSIONS = {
  buttonPrimaryHeight: 48,
  buttonCardHeight: 36,
  buttonRadius: 8,
};

// ─────────────────────────────────────────────
// SHARED PROPS
// ─────────────────────────────────────────────

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  /** Makes button fill its container width */
  fullWidth?: boolean;
  /** Override minimum width */
  style?: ViewStyle;
}

// ─────────────────────────────────────────────
// PRIMARY BUTTON
// Filled blue, 48px height, borderRadius 8
// Use for: main CTAs (Post Job, Send, Save, Confirm)
// ─────────────────────────────────────────────

export const PrimaryButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    style={({ pressed }) => ({
      height: DIMENSIONS.buttonPrimaryHeight,
      paddingHorizontal: 16,
      backgroundColor: disabled ? COLORS.disabledBg : COLORS.primary,
      borderRadius: DIMENSIONS.buttonRadius,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      opacity: loading ? 0.6 : pressed ? 0.85 : 1,
      ...(fullWidth ? { width: '100%' as any } : {}),
      ...style,
    })}
  >
    {loading ? (
      <ActivityIndicator color="#FFFFFF" size="small" />
    ) : (
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: disabled ? COLORS.disabledText : '#FFFFFF',
          lineHeight: 20,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    )}
  </Pressable>
);

// ─────────────────────────────────────────────
// SECONDARY BUTTON
// Outlined, 48px height, primary border & text
// Use for: secondary actions (Message, Cancel, Back)
// ─────────────────────────────────────────────

export const SecondaryButton: React.FC<ButtonProps> = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  fullWidth = true,
  style,
}) => (
  <Pressable
    onPress={onPress}
    disabled={disabled || loading}
    style={({ pressed }) => ({
      height: DIMENSIONS.buttonPrimaryHeight,
      paddingHorizontal: 16,
      backgroundColor: COLORS.background,
      borderRadius: DIMENSIONS.buttonRadius,
      borderWidth: 1.35,
      borderColor: disabled ? COLORS.disabledBg : COLORS.primary,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      opacity: pressed ? 0.7 : 1,
      ...(fullWidth ? { width: '100%' as any } : {}),
      ...style,
    })}
  >
    {loading ? (
      <ActivityIndicator color={COLORS.primary} size="small" />
    ) : (
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: disabled ? COLORS.disabledText : COLORS.primary,
          lineHeight: 20,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    )}
  </Pressable>
);

// ─────────────────────────────────────────────
// CARD BUTTON (compact)
// 36px height, used inside cards (ProCard, BidCard)
// variant: 'filled' (blue bg) or 'outlined' (blue border)
// ─────────────────────────────────────────────

interface CardButtonProps extends ButtonProps {
  variant?: 'filled' | 'outlined';
  /** flex:1 to share row space with sibling buttons */
  flex?: boolean;
}

export const CardButton: React.FC<CardButtonProps> = ({
  label,
  onPress,
  disabled = false,
  variant = 'filled',
  flex = false,
  fullWidth = false,
  style,
}) => {
  const isFilled = variant === 'filled';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: DIMENSIONS.buttonCardHeight,
        paddingHorizontal: 16,
        backgroundColor: isFilled ? COLORS.primary : COLORS.background,
        borderRadius: DIMENSIONS.buttonRadius,
        borderWidth: isFilled ? 0 : 0.69,
        borderColor: COLORS.primary,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        opacity: pressed ? 0.7 : 1,
        ...(flex ? { flex: 1 } : {}),
        ...(fullWidth ? { width: '100%' as any } : {}),
        ...style,
      })}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: isFilled ? '#FFFFFF' : COLORS.primary,
          lineHeight: 20,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

// ─────────────────────────────────────────────
// DANGER BUTTON
// Red variant for destructive actions (Delete, Reject)
// ─────────────────────────────────────────────

interface DangerButtonProps extends ButtonProps {
  variant?: 'filled' | 'outlined';
}

export const DangerButton: React.FC<DangerButtonProps> = ({
  label,
  onPress,
  disabled = false,
  variant = 'outlined',
  fullWidth = true,
  style,
}) => {
  const isFilled = variant === 'filled';
  const dangerRed = '#E7000B';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        height: DIMENSIONS.buttonPrimaryHeight,
        paddingHorizontal: 16,
        backgroundColor: isFilled ? dangerRed : COLORS.background,
        borderRadius: DIMENSIONS.buttonRadius,
        borderWidth: isFilled ? 0 : 1.35,
        borderColor: dangerRed,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        opacity: pressed ? 0.7 : 1,
        ...(fullWidth ? { width: '100%' as any } : {}),
        ...style,
      })}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: '500',
          color: isFilled ? '#FFFFFF' : dangerRed,
          lineHeight: 20,
          textAlign: 'center',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
};
