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
import { View, Text, Animated, Dimensions, Share, Alert, StyleSheet, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, CommonActions } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
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

// ─────────────────────────────────────────────────────────────
// CONFETTI — Core RN Animated only (zero Reanimated / zero worklets)
// 30 particles, fall + fade + horizontal drift
// ─────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 30;

interface ParticleConfig {
  startX: number;
  endX: number;
  duration: number;
  delay: number;
  size: number;
  isCircle: boolean;
  color: string;
}

// Pre-compute all random values at module level
const PARTICLE_CONFIGS: ParticleConfig[] = Array.from({ length: PARTICLE_COUNT }, (_, i) => {
  const startX = Math.random() * SCREEN_WIDTH;
  return {
    startX,
    endX: startX + (Math.random() - 0.5) * 200,
    duration: 2000 + Math.random() * 1500,
    delay: Math.random() * 600,
    size: 6 + Math.random() * 8,
    isCircle: Math.random() > 0.5,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  };
});

const ConfettiParticle: React.FC<{ config: ParticleConfig }> = ({ config }) => {
  const { startX, endX, duration, delay, size, isCircle, color } = config;

  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(startX)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fall down
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT + 20,
      duration,
      delay,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start();

    // Horizontal drift
    Animated.timing(translateX, {
      toValue: endX,
      duration,
      delay,
      useNativeDriver: true,
    }).start();

    // Fade out in last 30%
    Animated.timing(opacity, {
      toValue: 0,
      duration: duration * 0.3,
      delay: delay + duration * 0.7,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: size,
        height: isCircle ? size : size * 2.5,
        backgroundColor: color,
        borderRadius: isCircle ? size / 2 : 2,
        opacity,
        transform: [{ translateX }, { translateY }],
      }}
    />
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const DealClosedCelebrationScreen: React.FC = () => {
  const route = useRoute<RouteProp<HomeStackParamList, 'DealClosedCelebration'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { deal } = route.params;

  // ── Refs ──
  const cardRef = useRef<View>(null);

  // ── Trophy animation values ──
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

    // 4. Card slide up (700ms delay)
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

    // 5. CTAs appear (1000ms delay)
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
      {/* ── Confetti (core RN Animated, fires once on mount) ── */}
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {PARTICLE_CONFIGS.map((config, i) => (
          <ConfettiParticle key={i} config={config} />
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
