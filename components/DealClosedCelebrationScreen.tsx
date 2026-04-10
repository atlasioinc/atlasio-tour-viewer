// What: Full-screen celebration overlay shown when agent marks a deal as closed
// Who: Agent role only
// Where: Pushed as fullScreenModal from AgentDealDetailScreen on deal close

// STATE FLOW — DealClosedCelebrationScreen
// Entry: navigated from AgentDealDetailScreen when "Mark Deal Closed" tapped
// On mount:
//   1. trophyScale springs in (Animated.spring, bounciness 14)
//   2. confettiDots burst outward (Animated.stagger 40ms, 12 dots)
//   3. shareCard fades in after 400ms delay
// Share CTA: react-native-view-shot captures ShareableClosedDealCard → native share sheet
// Exit: user taps Done → navigates back to HomeTabAgent
// Flag gate: DEAL_CREATION_ENABLED — entire screen hidden behind this flag
// @demo: all deal data is mock until DEAL_CREATION_ENABLED=true + live rpc_mark_deal_closed

// @demo: mock deal data passed via route params, share uses Alert fallback
// @backend: when DEAL_CREATION_ENABLED=true, deal data comes from rpc_mark_deal_closed response

import React, { useRef, useEffect } from 'react';
import { View, Text, Share, Alert, Animated } from 'react-native';
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
// CONFETTI DOT CONFIG — 12 dots, radial burst
// Animation: core RN Animated only — Reanimated/animatable crash on RN 0.83 Bridgeless
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

const DealClosedCelebrationScreen: React.FC = () => {
  const route = useRoute<RouteProp<HomeStackParamList, 'DealClosedCelebration'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { deal } = route.params;
  const cardRef = useRef<View>(null);

  // ── Animation 1: Trophy bounce entrance ──
  const trophyScale = useRef(new Animated.Value(0)).current;

  // ── Animation 2: Confetti burst (12 dots) ──
  const confettiTranslateX = useRef(CONFETTI_DOTS.map(() => new Animated.Value(0))).current;
  const confettiTranslateY = useRef(CONFETTI_DOTS.map(() => new Animated.Value(0))).current;
  const confettiOpacity = useRef(CONFETTI_DOTS.map(() => new Animated.Value(1))).current;

  // ── Animation 3: Shareable deal card fade-in ──
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(16)).current;

  // Haptic on mount + trigger animations
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // 1. Trophy bounce in
    Animated.spring(trophyScale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 14,
      speed: 6,
    }).start();

    // 2. Confetti burst — staggered 40ms
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

    // 3. Card fade-in after 400ms delay
    Animated.parallel([
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 350,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.spring(cardTranslateY, {
        toValue: 0,
        delay: 400,
        useNativeDriver: true,
        bounciness: 4,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- animated refs are stable
  }, []);

  const handleShareWin = async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1.0 });
      await Share.share({ url: uri, message: 'Just closed a deal with Atlasio!' });
    } catch {
      // @demo: mock deal data — replace with live rpc_mark_deal_closed when DEAL_CREATION_ENABLED=true
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        Alert.alert('Share', 'Your deal card is ready to share!');
      }
    }
  };

  const handleDone = () => {
    navigation.dispatch(
      CommonActions.navigate({ name: 'AgentDealsScreen', params: { initialFilter: 'closed' } }),
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
        {/* Trophy + confetti container */}
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          {/* Confetti dots — position: absolute centered on trophy */}
          {CONFETTI_DOTS.map((_, i) => (
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

          {/* Animation: core RN Animated only — Reanimated/animatable crash on RN 0.83 Bridgeless */}
          <Animated.View style={{ transform: [{ scale: trophyScale }] }}>
            <Text style={{ fontSize: 56, textAlign: 'center' }}>🏆</Text>
          </Animated.View>
        </View>

        <Text style={{ fontSize: 28, fontWeight: '700', color: COLORS.darkText, textAlign: 'center', marginTop: 16 }}>
          Congratulations!
        </Text>
        <Text style={{ fontSize: 16, color: COLORS.lightText, textAlign: 'center', marginTop: 4 }}>
          You closed the deal.
        </Text>

        {/* Shareable deal card — fades in after trophy animation */}
        <Animated.View style={{
          marginTop: 32,
          width: '100%',
          opacity: cardOpacity,
          transform: [{ translateY: cardTranslateY }],
        }}>
          {/* @demo: mock deal data — replace with live rpc_mark_deal_closed when DEAL_CREATION_ENABLED=true */}
          <ShareableClosedDealCard
            address={deal.address}
            buyerName={deal.buyerName}
            salePrice={deal.salePrice}
            closingDate={deal.closingDate}
            cardRef={cardRef}
          />
        </Animated.View>
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 34 }}>
        <PrimaryButton label="Share Your Win" onPress={handleShareWin} />
        <View style={{ height: 12 }} />
        <SecondaryButton label="Done" onPress={handleDone} />
      </View>
    </SafeAreaView>
  );
};

export default DealClosedCelebrationScreen;
