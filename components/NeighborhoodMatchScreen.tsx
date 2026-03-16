// NeighborhoodMatchScreen.tsx
// ═══════════════════════════════════════════════════════════════
// WHO:   Agent
// WHERE: HomeStack → push from ClientLifestyleScreen
// WHAT:  Composite score ring (animated) + priority score bars (animated) + nearby POI summary
// NEXT:  navigation.navigate('CategoryMapScreen', { category, pois, addressLat, addressLng })
// RECEIVES: { priorities: LifestylePriority[], clientLabel: string, address: string }
//
// @demo  All scores from useNeighborhoodAnalysis mock data
// @backend Walk Score API + Google Places Nearby + AirNow (S50)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle as SvgCircle, Path } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from './HomeStack';
import { useNeighborhoodAnalysis } from '../hooks/useNeighborhoodAnalysis';
import { COLORS } from '../lib/tokens';

// ── State flow ────────────────────────────────────────────────────────────────
// On mount: call analyze(priorities, clientLabel, address) from hook
// analysis: NeighborhoodAnalysis | null (null while loading)
// scoreAnim: Animated.Value(0) — animates to compositeScore on analysis arrival (800ms)
// barAnims:  Animated.Value[] — one per categoryScore, staggered 80ms, 600ms each
// isLoading: true while hook is running → shows loading state
// ─────────────────────────────────────────────────────────────────────────────

const AnimatedSvgCircle = Animated.createAnimatedComponent(SvgCircle);

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackIcon = ({ size = 24, color = COLORS.darkText }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRightIcon = ({ size = 16, color = COLORS.primary }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M6 3L11 8L6 13" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// SCORE COLOR HELPER
// ─────────────────────────────────────────────

function getScoreColor(score: number): string {
  if (score >= 75) return '#059669';
  if (score >= 50) return '#D97706';
  return '#DC2626';
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const CIRCLE_RADIUS = 65;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

const NeighborhoodMatchScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'NeighborhoodMatchScreen'>>();
  const { priorities, clientLabel, address, lat, lng } = route.params;

  const { analyze, analysis, isLoading, loadingMessage } = useNeighborhoodAnalysis();

  const scoreAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useRef<Animated.Value[]>([]).current;

  // ── Trigger analysis on mount ──
  useEffect(() => {
    analyze(priorities, clientLabel, address, lat, lng);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ensure barAnims has enough entries BEFORE render reads them —
  // if populated only inside useEffect, JSX sees undefined on first render
  // and falls to the static '0%' branch (ref mutation won't re-render).
  if (analysis) {
    while (barAnims.length < analysis.categoryScores.length) {
      barAnims.push(new Animated.Value(0));
    }
  }

  // ── Animate when analysis arrives ──
  useEffect(() => {
    if (!analysis) return;

    // Reset values before re-animating (important if screen is revisited)
    scoreAnim.setValue(0);
    barAnims.forEach(av => av.setValue(0));

    // Score ring animation
    Animated.timing(scoreAnim, {
      toValue: analysis.compositeScore,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    // Bar animations — staggered
    analysis.categoryScores.forEach((cat, i) => {
      Animated.timing(barAnims[i], {
        toValue: cat.score,
        duration: 600,
        delay: i * 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start();
    });
  }, [analysis, scoreAnim, barAnims]);

  const scoreColor = analysis ? getScoreColor(analysis.compositeScore) : COLORS.primary;

  // Animated offset for stroke-dashoffset
  const dashOffset = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [CIRCUMFERENCE, 0],
    extrapolate: 'clamp',
  });

  // Animated integer display
  const displayScore = scoreAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 100],
    extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 48,
        borderBottomWidth: 0.69, borderBottomColor: COLORS.border,
      }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <BackIcon size={20} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: COLORS.darkText }}>
          Neighborhood Match
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Loading state ── */}
      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ fontSize: 14, color: COLORS.secondaryText, marginTop: 12 }}>
            Analyzing match…
          </Text>
          {/* @demo: loadingMessage is null in mock path — only spinner shown */}
          {/* @backend: shows per-step progress text during live analysis */}
          {loadingMessage && (
            <Text style={{
              fontSize: 14,
              color: COLORS.secondaryText,
              marginTop: 8,
              textAlign: 'center',
            }}>
              {loadingMessage}
            </Text>
          )}
        </View>
      )}

      {/* ── Results ── */}
      {!isLoading && analysis && (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {/* ── Client + Address badges ── */}
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 12 }}>
            <View style={{
              backgroundColor: COLORS.tagBg, borderRadius: 999,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.bodyText }}>
                👤 {clientLabel}
              </Text>
            </View>
            <View style={{
              backgroundColor: COLORS.tagBg, borderRadius: 999,
              paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.bodyText }}>
                📍 {address.length > 28 ? address.slice(0, 28) + '…' : address}
              </Text>
            </View>
          </View>

          {/* ── Score ring ── */}
          <View style={{ alignItems: 'center', paddingVertical: 36 }}>
            <View style={{ width: 160, height: 160, alignItems: 'center', justifyContent: 'center' }}>
              <Svg width={160} height={160}>
                {/* Track */}
                <SvgCircle
                  cx={80} cy={80} r={CIRCLE_RADIUS}
                  stroke={COLORS.border} strokeWidth={12} fill="none"
                />
                {/* Progress arc */}
                <AnimatedSvgCircle
                  cx={80} cy={80} r={CIRCLE_RADIUS}
                  stroke={scoreColor} strokeWidth={12} fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90, 80, 80)"
                />
              </Svg>
              {/* Score number overlay */}
              <View style={{
                position: 'absolute', alignItems: 'center', justifyContent: 'center',
              }}>
                <Text style={{ fontSize: 36, fontWeight: '700', color: COLORS.darkText }}>
                  {analysis?.compositeScore ?? 0}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: COLORS.secondaryText, marginTop: 8 }}>
              Lifestyle Fit Score
            </Text>

            {/* Descriptor badge */}
            <View style={{
              marginTop: 12, borderRadius: 999,
              paddingHorizontal: 14, paddingVertical: 5,
              backgroundColor: scoreColor + '1F', // ~12% opacity
              borderWidth: 1, borderColor: scoreColor,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: scoreColor }}>
                {analysis.scoreDescriptor}
              </Text>
            </View>
          </View>

          {/* ── Priority scores section ── */}
          <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
            <Text style={{
              fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
              letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 16,
            }}>
              Your Priorities
            </Text>

            {analysis.categoryScores.map((cat, i) => (
              <View key={cat.category} style={{ marginBottom: 20 }}>
                {/* Line 1 — label + score */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>
                    {cat.emoji}  {cat.label}
                  </Text>
                  <Text style={{ minWidth: 28, textAlign: 'right', fontSize: 15, fontWeight: '700', color: COLORS.darkText }}>
                    {cat.score}
                  </Text>
                </View>

                {/* Line 2 — full-width bar */}
                <View style={{ height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' }}>
                  <Animated.View style={{
                    height: 6,
                    backgroundColor: cat.priority === 'must_have' ? COLORS.primary : COLORS.accentBlue,
                    borderRadius: 3,
                    width: barAnims[i]
                      ? barAnims[i].interpolate({
                          inputRange: [0, 100],
                          outputRange: ['0%', '100%'],
                        })
                      : '0%',
                  }} />
                </View>

                {/* Line 3 — ★ Must Have only (Nice to Have implied by absence) */}
                {cat.priority === 'must_have' && (
                  <Text style={{ fontSize: 12, color: '#D97706', marginTop: 4 }}>★ Must Have</Text>
                )}
              </View>
            ))}
          </View>

          {/* ── COMPARE ADDRESSES SECTION ──────────────────────────────────────────
              Entry point for multi-address comparison (S56).
              Agent can compare this address against 1–2 more to find the best fit.
              Passes current analysis + priorities so comparison screen has full context.
              ──────────────────────────────────────────────────────────────────────── */}
          {analysis && (
            <View style={{ paddingHorizontal: 16, marginTop: 24, marginBottom: 8 }}>
              {/* Section label */}
              <Text style={{
                fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
              }}>
                Compare Addresses
              </Text>

              {/* CTA card */}
              <Pressable
                onPress={() => navigation.navigate('AddressComparisonScreen', {
                  priorities,
                  clientLabel,
                  firstAddress: address,
                  firstAnalysis: analysis,
                  firstLat: lat,       // @backend: geocoded in live path, undefined in mock
                  firstLng: lng,       // @backend: geocoded in live path, undefined in mock
                })}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  backgroundColor: COLORS.tagBg, borderRadius: 12,
                  padding: 16, opacity: pressed ? 0.7 : 1,
                  borderWidth: 1, borderColor: COLORS.border,
                })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText, marginBottom: 2 }}>
                    Compare with other addresses
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.secondaryText, lineHeight: 18 }}>
                    See how 2–3 listings score for {clientLabel}
                  </Text>
                </View>
                <ChevronRightIcon size={16} color={COLORS.primary} />
              </Pressable>
            </View>
          )}

          {/* ── Nearby section ── */}
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Text style={{
              fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
              letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12,
            }}>
              Nearby
            </Text>

            {analysis.categoryScores
              .filter(cat => (cat.poiCount ?? 0) > 0)
              .map(cat => (
                <View key={`nearby-${cat.category}`} style={{ marginBottom: 12 }}>
                  {/* Header row */}
                  <View style={{
                    flexDirection: 'row', justifyContent: 'space-between',
                    alignItems: 'center', marginBottom: 8,
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText }}>
                      {cat.emoji} {cat.label}
                    </Text>
                    <View style={{
                      backgroundColor: COLORS.tagBg, borderWidth: 1, borderColor: COLORS.border,
                      borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3,
                    }}>
                      <Text style={{ fontSize: 12, color: COLORS.bodyText }}>
                        {cat.poiCount} within 0.5mi
                      </Text>
                    </View>
                  </View>

                  {/* See on map */}
                  <Pressable
                    onPress={() => {
                      navigation.navigate('CategoryMapScreen', {
                        category: cat.category,
                        label: cat.label,
                        emoji: cat.emoji,
                        pois: analysis.pois.filter(p => p.category === cat.category),
                        addressLat: analysis.lat,
                        addressLng: analysis.lng,
                        address: analysis.address,
                      });
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: COLORS.tagBg, borderRadius: 10, padding: 12, paddingHorizontal: 14,
                    }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary }}>
                      📍 See {cat.label} on map
                    </Text>
                    <ChevronRightIcon size={16} color={COLORS.primary} />
                  </Pressable>
                </View>
              ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────
// ANIMATED SCORE TEXT
// Uses Animated listener to update integer display
// ─────────────────────────────────────────────

const AnimatedScoreText = ({ value, color }: { value: Animated.AnimatedInterpolation<number>; color: string }) => {
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    const id = value.addListener(({ value: v }) => {
      setDisplay(Math.round(v));
    });
    return () => value.removeListener(id);
  }, [value]);

  return (
    <Text style={{ fontSize: 36, fontWeight: '700', color }}>
      {display}
    </Text>
  );
};

export default NeighborhoodMatchScreen;
