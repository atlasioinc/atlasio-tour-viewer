// ═══════════════════════════════════════════════════════════════
// components/shared/SuccessToast.tsx
// Success toast overlay — slides up from bottom, auto-dismisses after 3s (S149b).
//
// What: Animated success notification used after positive user actions.
// Who:  All roles, all screens.
// Where: Rendered at root level of any screen that fires a success-worthy
//        mutation. Companion to ErrorToast.tsx — same architectural pattern,
//        intentionally different visual treatment (light surface, accent bar,
//        check icon, manual dismiss). The "mirror ErrorToast exactly" line in
//        the S149b spec applies to architecture (state hook + fade timer +
//        default export), NOT visuals — the spec's visual section is the
//        source of truth and supersedes that one-liner.
//
// Wired consumers (S149b):
//   • PostJobWizard           — "Job posted — contractors will be notified"
//   • PostPhotoJobScreen      — "Photo job posted successfully"
//   • PostStagingJobScreen    — "Staging job posted successfully"
//   • BidSubmissionScreen     — "Bid submitted" / "Bid updated"
//   • EditProfileScreen       — "Profile saved" / "Photo updated"
//   • ProProfile / FindTab    — "Request sent"
//   • AgentDealDetailScreen   — "Link ready to share"
//   • JobCompletionScreen     — "Vouch sent — thanks for sharing your experience"
//
// Pairs with: hooks/useSuccessToast.ts (state) — render this inside the
// screen and pass the hook's successMessage + clearSuccess to it.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/tokens';

interface SuccessToastProps {
  message: string;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 3000;
const FADE_OUT_MS = 200;

const CheckCircleIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18">
    <Circle cx={9} cy={9} r={8} fill={COLORS.successGreen} />
    <Polyline
      points="5,9 8,12 13,6"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SuccessToast: React.FC<SuccessToastProps> = ({ message, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Slide up entrance — values per S149b visual spec.
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 14,
      bounciness: 6,
    }).start();

    // Auto-dismiss with fade out.
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_OUT_MS,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only
  }, []);

  // Manual dismiss — fade out then call onDismiss.
  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: FADE_OUT_MS,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: insets.bottom + 32,
        left: 24,
        right: 24,
        backgroundColor: COLORS.successToastBg,
        borderWidth: 1,
        borderColor: COLORS.successToastBorder,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        transform: [{ translateY: slideAnim }],
        opacity: fadeAnim,
        zIndex: 9999,
      }}
    >
      {/* Left accent bar */}
      <View
        style={{
          width: 4,
          alignSelf: 'stretch',
          backgroundColor: COLORS.successGreen,
        }}
      />

      {/* Icon */}
      <View style={{ paddingLeft: 14, paddingVertical: 14 }}>
        <CheckCircleIcon />
      </View>

      {/* Message */}
      <Animated.Text
        style={{
          flex: 1,
          marginLeft: 10,
          marginRight: 4,
          color: COLORS.successToastText,
          fontSize: 14,
          fontWeight: '500',
          lineHeight: 20,
        }}
        numberOfLines={2}
      >
        {message}
      </Animated.Text>

      {/* Dismiss button — 44×44 touch target */}
      <Pressable
        onPress={handleDismiss}
        accessibilityRole="button"
        accessibilityLabel="Dismiss notification"
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.5 : 1,
        })}
      >
        <Animated.Text
          style={{
            fontSize: 18,
            fontWeight: '500',
            color: COLORS.successToastText,
            lineHeight: 20,
          }}
        >
          ×
        </Animated.Text>
      </Pressable>
    </Animated.View>
  );
};

export default SuccessToast;
