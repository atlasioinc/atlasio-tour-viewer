// ═══════════════════════════════════════════════════════════════
// components/shared/MomentBanner.tsx
// Tier 2 delight moment banner — slides down from the top, auto-dismisses (S150).
//
// What: A branded, zero-friction banner for small positive moments — "first
//       bid submitted", "closing squad complete", "license submitted for
//       review", etc. No dismiss button, no tap target. Pure delight.
// Who:  All roles.
// Where: Rendered absolutely at the top of any screen that fires a Tier 2
//        moment. Companion to SuccessToast — different visual, different
//        purpose (SuccessToast = confirmation of user action, MomentBanner =
//        celebration of a milestone).
//
// zIndex hierarchy (critical — never collide):
//   SuccessToast   9999  — bottom of screen, confirms mutations
//   MomentBanner   9998  — top of screen, celebrates milestones
// The two should NEVER fire simultaneously — consumer screens branch between
// them (e.g. BidSubmissionScreen fires the banner on first bid OR the toast
// on subsequent bids, never both).
//
// Auto-dismiss timing: 2500ms (intentionally shorter than SuccessToast's
// 3000ms — MomentBanner is pure flavor, the user doesn't need to read it).
//
// Animation (all useNativeDriver: true, core RN Animated only):
//   In:  translateY -80 → 0, spring bounciness 4 speed 14
//   Out: translateY 0 → -80, timing 250ms ease-in, then onDismiss()
//
// Wired consumers (S150):
//   • BidSubmissionScreen     — first bid submitted (AsyncStorage-gated)
//   • HomeTabAgent            — closing squad complete (useRef transition)
//   • VerificationScreen      — license submitted for review
//   • InsuranceUploadScreen   — insurance submitted for review
//   • RepairJobDetails        — first bid received on agent's job (0→1 transition)
//   • PartnerDealsScreen      — all milestones complete on a deal
//
// Pairs with: hooks/useMomentBanner.ts — mirrors useSuccessToast pattern.
// @demo none  @backend none — pure presentational component
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, Easing } from 'react-native';
import { COLORS, SHADOWS } from '../../lib/tokens';

const AUTO_DISMISS_MS = 2500;
const SLIDE_OUT_MS = 250;
const HIDDEN_TRANSLATE_Y = -80;

export interface MomentBannerProps {
  icon: string;
  message: string;
  visible: boolean;
  onDismiss: () => void;
  accentColor?: string;
}

const MomentBanner: React.FC<MomentBannerProps> = ({
  icon,
  message,
  visible,
  onDismiss,
  accentColor = COLORS.primary,
}) => {
  const translateY = useRef(new Animated.Value(HIDDEN_TRANSLATE_Y)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    // Slide down entrance
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
      speed: 14,
    }).start();

    // Auto-dismiss
    timerRef.current = setTimeout(() => {
      Animated.timing(translateY, {
        toValue: HIDDEN_TRANSLATE_Y,
        duration: SLIDE_OUT_MS,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, AUTO_DISMISS_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- onDismiss is stable from hook
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9998,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        transform: [{ translateY }],
        ...SHADOWS.card,
      }}
    >
      {/* Left accent bar — 3px wide, full height */}
      <View
        style={{
          width: 3,
          alignSelf: 'stretch',
          borderRadius: 2,
          backgroundColor: accentColor,
          marginRight: 12,
        }}
      />

      {/* Icon */}
      <Text style={{ fontSize: 22, marginRight: 12 }}>{icon}</Text>

      {/* Message */}
      <Text
        style={{
          flex: 1,
          color: COLORS.darkText,
          fontSize: 15,
          fontWeight: '500',
          lineHeight: 20,
        }}
        numberOfLines={1}
      >
        {message}
      </Text>
    </Animated.View>
  );
};

export default MomentBanner;
