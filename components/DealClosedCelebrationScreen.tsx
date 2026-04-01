// What: Full-screen celebration overlay shown when agent marks a deal as closed
// Who: Agent role only
// Where: Pushed as fullScreenModal from AgentDealDetailScreen on deal close

// STATE FLOW:
// Screen mounts -> haptic -> confetti -> staggered animations (trophy -> headline -> card -> CTAs)
// handleShareWin: capture card ref as PNG -> Share.share() native sheet
// handleDone: CommonActions navigate to Deals tab -> ClosedDealsScreen
// @demo: mock deal data passed via route params, share uses Alert fallback
// @backend: when DEAL_CREATION_ENABLED=true, deal data comes from rpc_mark_deal_closed response

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Dimensions, Share, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import ReanimatedAnimated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import type { HomeStackParamList } from './HomeStack';
import { COLORS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { PrimaryButton, SecondaryButton } from './Button';
import ShareableClosedDealCard from './ShareableClosedDealCard';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Confetti colors: Atlasio primary blues + white + gold accent
const CONFETTI_COLORS = [
  COLORS.primary,
  COLORS.accentBlue,
  COLORS.confettiBlue,
  COLORS.background,
  COLORS.border,
  COLORS.starColor,
];

const PARTICLE_COUNT = 80;

// ─────────────────────────────────────────────────────────────
// CONFETTI — Pure Reanimated implementation
// No native modules — fully compatible with RN 0.83 Bridgeless
// ─────────────────────────────────────────────────────────────

interface ConfettiParticleProps {
  startX: number;
  endX: number;
  duration: number;
  delay: number;
  size: number;
  isCircle: boolean;
  color: string;
  rotationEnd: number;
}

const ConfettiParticle: React.FC<ConfettiParticleProps> = ({
  startX,
  endX,
  duration,
  delay,
  size,
  isCircle,
  color,
  rotationEnd,
}) => {
  // All initial values are plain pre-computed numbers — worklet-safe
  const translateY = useSharedValue(-20);
  const translateX = useSharedValue(startX);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 20, { duration, easing: Easing.in(Easing.quad) })
    );
    translateX.value = withDelay(delay, withTiming(endX, { duration }));
    opacity.value = withDelay(
      delay + duration * 0.7,
      withTiming(0, { duration: duration * 0.3 })
    );
    rotate.value = withDelay(
      delay,
      withTiming(rotationEnd, { duration })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: 0,
    left: 0,
    width: size,
    height: isCircle ? size : size * 2.5,
    backgroundColor: color,
    borderRadius: isCircle ? size / 2 : 2,
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return <ReanimatedAnimated.View style={animatedStyle} />;
};

// Pre-compute ALL random values on JS thread at module level — never inside hooks or worklets
const PARTICLE_PROPS: ConfettiParticleProps[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const startX = Math.random() * SCREEN_WIDTH;
  return {
    startX,
    endX: startX + (Math.random() - 0.5) * 200,
    duration: 2000 + Math.random() * 1500,
    delay: Math.random() * 600,
    size: 6 + Math.random() * 8,
    isCircle: Math.random() > 0.5,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rotationEnd: Math.random() * 720 - 360,
  };
});

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const DealClosedCelebrationScreen: React.FC = () => {
  const route = useRoute<RouteProp<HomeStackParamList, 'DealClosedCelebration'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { deal } = route.params;

  // ── Refs ──
  const cardRef = useRef<View>(null);

  // ── Trophy animation values (core RN Animated — avoids Reanimated worklet issues) ──
  const trophyScale = useRef(new Animated.Value(0)).current;
  const trophyOpacity = useRef(new Animated.Value(0)).current;

  // ── Staggered animation values ──
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const headlineTranslateY = useRef(new Animated.Value(20)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(30)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  // ── Mount: haptic + staggered animations ──
  useEffect(() => {
    // 1. Heavy haptic immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // 2. Trophy bounceIn (400ms delay)
    Animated.sequence([
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(trophyScale, { toValue: 1, useNativeDriver: true, tension: 150, friction: 10 }),
        Animated.timing(trophyOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    // 3. Headline fade up (600ms delay)
    Animated.parallel([
      Animated.timing(headlineOpacity, {
        toValue: 1,
        duration: 400,
        delay: 600,
        useNativeDriver: true,
      }),
      Animated.timing(headlineTranslateY, {
        toValue: 0,
        duration: 400,
        delay: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // 3. Card slide up (700ms delay)
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        delay: 700,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 0,
        duration: 400,
        delay: 700,
        useNativeDriver: true,
      }),
    ]).start();

    // 4. CTAs appear (1000ms delay)
    Animated.timing(ctaOpacity, {
      toValue: 1,
      duration: 300,
      delay: 1000,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Share handler ──
  const handleShareWin = async () => {
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1.0,
      });
      await Share.share({
        url: uri,
        message: 'Just closed a deal with Atlasio! 🏆',
      });
    } catch {
      // @demo: Show mock share alert in demo mode
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        Alert.alert('🏆 Share', 'Your deal card is ready to share!');
      }
      // Fail silently in production — never crash on share failure
    }
  };

  // ── Done handler ──
  const handleDone = () => {
    // Navigate to AgentDealsScreen with initialFilter: 'closed'
    // Pop celebration modal first, then push to deals with closed filter
    navigation.dispatch(
      CommonActions.navigate({
        name: 'AgentDealsScreen',
        params: { initialFilter: 'closed' },
      }),
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* ── Confetti (pure Reanimated, fires once on mount) ── */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {PARTICLE_PROPS.map((props, i) => (
          <ConfettiParticle key={i} {...props} />
        ))}
      </View>

      {/* ── Centered Content Column ── */}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        {/* Trophy — bounceIn via core RN Animated spring */}
        <Animated.Text style={{ fontSize: 56, textAlign: 'center', opacity: trophyOpacity, transform: [{ scale: trophyScale }] }}>
          🏆
        </Animated.Text>

        {/* Headline — fade up */}
        <Animated.View style={{ opacity: headlineOpacity, transform: [{ translateY: headlineTranslateY }] }}>
          <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.darkText, textAlign: 'center', marginTop: 16 }}>
            Congratulations!
          </Text>
          <Text style={{ fontSize: 16, color: COLORS.lightText, textAlign: 'center', marginTop: 4 }}>
            You closed the deal.
          </Text>
        </Animated.View>

        {/* Shareable Deal Card — slide up */}
        <Animated.View style={{
          opacity: cardOpacity,
          transform: [{ translateY: cardTranslateY }],
          marginTop: 32,
          width: '100%',
        }}>
          <ShareableClosedDealCard
            address={deal.address}
            buyerName={deal.buyerName}
            salePrice={deal.salePrice}
            closingDate={deal.closingDate}
            cardRef={cardRef}
          />
        </Animated.View>
      </View>

      {/* ── Bottom CTAs ── */}
      <Animated.View style={{
        opacity: ctaOpacity,
        paddingHorizontal: 16,
        paddingBottom: 34,
      }}>
        <PrimaryButton label="Share Your Win" onPress={handleShareWin} />
        <View style={{ height: 12 }} />
        <SecondaryButton label="Done" onPress={handleDone} />
      </Animated.View>
    </SafeAreaView>
  );
};

export default DealClosedCelebrationScreen;
