// ═══════════════════════════════════════════════════════════════
// components/shared/CelebrationScreen.tsx
// Tier 1 full-screen delight moment overlay (S150).
//
// What: A reusable full-screen celebration surface for major positive
//       moments — "you got the job", "onboarding complete", "deal closed
//       milestone" (future). Replaces ad-hoc celebration UIs.
// Who:  All roles. Role-branching lives in the consumer — this component
//       only renders the content it's handed.
// Where: Rendered either as a Modal overlay (e.g. inside ContractorJobDetails
//        when a bid is accepted) or inline as a whole screen (e.g. the final
//        OnboardingComplete step).
//
// Wired consumers (S150):
//   • ContractorJobDetails   — "You got the job!" on bid-accepted (Modal)
//   • OnboardingComplete     — role-branched welcome moment (inline)
//   (DealClosedCelebrationScreen is NOT migrated in S150 — it keeps its own
//    bespoke implementation pending a future cleanup session.)
//
// Animation sequence (all useNativeDriver: true, core RN Animated only
// — Reanimated/animatable crash on RN 0.83 Bridgeless per S123):
//   0ms     — mount
//   0–      — confetti stagger 40ms per dot (if showConfetti=true), replicates
//             the DealClosedCelebrationScreen pattern: 12 dots, 30° radial,
//             spring bounciness 4 speed 8, opacity 1→0 timing 600ms delay 200
//   200ms   — icon circle springs in: scale 0→1, spring bounciness 14 speed 6
//   350ms   — headline fades + translates in (opacity 0→1, translateY 12→0, 400ms)
//   450ms   — subtext fades + translates in (same pattern)
//   550ms   — primary CTA fades in (opacity 0→1, 300ms)
//   600ms   — secondary CTA fades in (only if provided)
//
// @demo none  @backend none — pure presentational component
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../lib/tokens';
import { PrimaryButton } from '../Button';

// ─────────────────────────────────────────────
// Confetti config — replicates DealClosedCelebrationScreen exactly
// ─────────────────────────────────────────────

const CONFETTI_DOTS = [
  { angle: 0,   distance: 80 },
  { angle: 30,  distance: 90 },
  { angle: 60,  distance: 75 },
  { angle: 90,  distance: 85 },
  { angle: 120, distance: 90 },
  { angle: 150, distance: 80 },
  { angle: 180, distance: 85 },
  { angle: 210, distance: 75 },
  { angle: 240, distance: 80 },
  { angle: 270, distance: 90 },
  { angle: 300, distance: 85 },
  { angle: 330, distance: 80 },
];

const CONFETTI_COLORS = [
  COLORS.primary,
  COLORS.successGreen,
  COLORS.warningAmber,
  COLORS.errorRed,
  COLORS.lightText,
  COLORS.primary,
  COLORS.successGreen,
  COLORS.warningAmber,
  COLORS.errorRed,
  COLORS.lightText,
  COLORS.primary,
  COLORS.successGreen,
];

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────

export interface CelebrationScreenProps {
  // Content
  icon: React.ReactNode;
  headline: string;
  subtext: string;
  ctaLabel: string;
  onCta: () => void;
  secondaryCta?: string;
  onSecondaryCta?: () => void;

  // Config
  showConfetti?: boolean;
  accentColor?: string;
  /** Show a loading spinner on the primary CTA and disable taps. Use when
   *  onCta fires an async mutation (e.g. rpc_complete_onboarding) and you
   *  want to prevent double-submission + give visible feedback. */
  ctaLoading?: boolean;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

const CelebrationScreen: React.FC<CelebrationScreenProps> = ({
  icon,
  headline,
  subtext,
  ctaLabel,
  onCta,
  secondaryCta,
  onSecondaryCta,
  showConfetti = false,
  accentColor = COLORS.primary,
  ctaLoading = false,
}) => {
  // Icon scale (springs in at 200ms)
  const iconScale = useRef(new Animated.Value(0)).current;

  // Headline + subtext fade+translate
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineTranslate = useRef(new Animated.Value(12)).current;
  const subtextOpacity = useRef(new Animated.Value(0)).current;
  const subtextTranslate = useRef(new Animated.Value(12)).current;

  // CTA fades
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const secondaryOpacity = useRef(new Animated.Value(0)).current;

  // Confetti (only used when showConfetti=true)
  const confettiTranslateX = useRef(CONFETTI_DOTS.map(() => new Animated.Value(0))).current;
  const confettiTranslateY = useRef(CONFETTI_DOTS.map(() => new Animated.Value(0))).current;
  const confettiOpacity = useRef(CONFETTI_DOTS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Confetti burst — stagger 40ms, matches DealClosedCelebrationScreen
    if (showConfetti) {
      const confettiAnimations = CONFETTI_DOTS.map((dot, i) => {
        const rad = (dot.angle * Math.PI) / 180;
        const targetX = Math.cos(rad) * dot.distance;
        const targetY = Math.sin(rad) * dot.distance;

        return Animated.parallel([
          Animated.spring(confettiTranslateX[i], {
            toValue: targetX,
            useNativeDriver: true,
            bounciness: 4,
            speed: 8,
          }),
          Animated.spring(confettiTranslateY[i], {
            toValue: targetY,
            useNativeDriver: true,
            bounciness: 4,
            speed: 8,
          }),
          Animated.timing(confettiOpacity[i], {
            toValue: 0,
            duration: 600,
            delay: 200,
            useNativeDriver: true,
          }),
        ]);
      });
      Animated.stagger(40, confettiAnimations).start();
    }

    // Icon springs in at 200ms
    Animated.spring(iconScale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 14,
      speed: 6,
      delay: 200,
    }).start();

    // Headline at 350ms
    Animated.parallel([
      Animated.timing(headlineOpacity, {
        toValue: 1,
        duration: 400,
        delay: 350,
        useNativeDriver: true,
      }),
      Animated.timing(headlineTranslate, {
        toValue: 0,
        duration: 400,
        delay: 350,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtext at 450ms
    Animated.parallel([
      Animated.timing(subtextOpacity, {
        toValue: 1,
        duration: 400,
        delay: 450,
        useNativeDriver: true,
      }),
      Animated.timing(subtextTranslate, {
        toValue: 0,
        duration: 400,
        delay: 450,
        useNativeDriver: true,
      }),
    ]).start();

    // Primary CTA at 550ms
    Animated.timing(ctaOpacity, {
      toValue: 1,
      duration: 300,
      delay: 550,
      useNativeDriver: true,
    }).start();

    // Secondary CTA at 600ms
    if (secondaryCta) {
      Animated.timing(secondaryOpacity, {
        toValue: 1,
        duration: 300,
        delay: 600,
        useNativeDriver: true,
      }).start();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- animated refs are stable, mount-only
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 24,
        }}
      >
        {/* Icon + confetti burst container */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {/* Confetti dots — position: absolute centered on icon */}
          {showConfetti &&
            CONFETTI_DOTS.map((_, i) => (
              <Animated.View
                key={i}
                style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: CONFETTI_COLORS[i],
                  opacity: confettiOpacity[i],
                  transform: [
                    { translateX: confettiTranslateX[i] },
                    { translateY: confettiTranslateY[i] },
                  ],
                }}
              />
            ))}

          {/* Icon circle — 96×96, accentColor at 15% opacity bg */}
          <Animated.View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              backgroundColor: accentColor + '26', // ~15% opacity hex
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: iconScale }],
            }}
          >
            {icon}
          </Animated.View>
        </View>

        {/* Headline */}
        <Animated.Text
          style={{
            fontSize: 26,
            fontWeight: '600',
            color: COLORS.darkText,
            textAlign: 'center',
            marginTop: 24,
            opacity: headlineOpacity,
            transform: [{ translateY: headlineTranslate }],
          }}
        >
          {headline}
        </Animated.Text>

        {/* Subtext */}
        <Animated.Text
          style={{
            fontSize: 15,
            fontWeight: '400',
            color: COLORS.secondaryText,
            textAlign: 'center',
            lineHeight: 24,
            marginTop: 12,
            opacity: subtextOpacity,
            transform: [{ translateY: subtextTranslate }],
          }}
        >
          {subtext}
        </Animated.Text>

        {/* Primary CTA */}
        <Animated.View
          style={{ width: '100%', marginTop: 40, opacity: ctaOpacity }}
        >
          <PrimaryButton label={ctaLabel} onPress={onCta} loading={ctaLoading} />
        </Animated.View>

        {/* Secondary CTA — text-only Pressable */}
        {secondaryCta && onSecondaryCta ? (
          <Animated.View style={{ marginTop: 16, opacity: secondaryOpacity }}>
            <Pressable
              onPress={onSecondaryCta}
              accessibilityRole="button"
              accessibilityLabel={secondaryCta}
              style={({ pressed }) => ({
                height: 44,
                paddingHorizontal: 16,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '500',
                  color: COLORS.primary,
                  lineHeight: 20,
                }}
              >
                {secondaryCta}
              </Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

export default CelebrationScreen;
