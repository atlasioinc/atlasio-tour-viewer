// CategoryMapScreen.tsx
// ═══════════════════════════════════════════════════════════════
// WHO:   Agent
// WHERE: HomeStack → fullScreenModal from NeighborhoodMatchScreen / AddressComparisonScreen
// WHAT:  Interactive multi-category neighborhood exploration map.
//        Full-screen MapView + filter chip bar + animated POI pins + tap-to-preview sheet.
//        S148b redesign: all categories loaded at once, toggle chips to filter, tap pins
//        to see place details, "Open in Maps" deep link for turn-by-turn.
//
// RECEIVES (S148b multi-category mode — preferred):
//   { initialCategory, allResults: { categoryScores, pois }, addressLat, addressLng,
//     address, radiusMi, category, label, emoji, pois }  // legacy fields still passed
//
// RECEIVES (legacy single-category mode — AddressComparisonScreen):
//   { category, label, emoji, pois, addressLat, addressLng, address }
//
// The screen detects mode via route.params.allResults — when present, renders the
// redesigned interactive experience; otherwise falls back to the legacy single-category UI
// so AddressComparisonScreen keeps working unchanged.
//
// @demo  MapView renders with mock POI coordinates from MOCK_POIS (useNeighborhoodAnalysis)
//        No API key required for basic tiles in Expo Go
// @backend Add GOOGLE_MAPS_API_KEY to app.json / EAS secrets before native build
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Animated,
  PanResponder,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import MapView, { Marker } from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from './HomeStack';
import type { POIResult, LifestyleCategory } from '../types/neighborhood';
import { COLORS, SHADOWS } from '../lib/tokens';
import { CATEGORY_DISPLAY } from '../lib/neighborhoodScoring';

/*
 * STATE FLOW — CategoryMapScreen (S148b multi-category mode)
 *
 * activeCategories: Set<LifestyleCategory>
 *   — seeded from initialCategory ('all' = every category with poiCount > 0)
 *   — toggling a chip adds/removes from the set
 *   — 'all' chip: tapping sets every category-with-POIs active
 *   — toggling the only-remaining chip is a no-op (always show at least one)
 *
 * selectedPOI: POIResult | null
 *   — set when user taps a map pin
 *   — cleared on backdrop tap, drag-down, another pin tap, or category toggle
 *
 * visiblePOIs: derived from allResults.pois filtered by activeCategories
 *   — recomputed on activeCategories change
 *   — drives both Marker rendering and auto-fit camera bounds
 *
 * pinAnimations: Map<string, Animated.Value>
 *   — keyed by `${category}-${name}-${lat}-${lng}` (POIResult has no id field)
 *   — each new pin enters with a drop animation (translateY: -20 → 0, spring)
 *   — staggered by index * 40ms
 *
 * sheetTranslateY: Animated.Value
 *   — 300 when sheet is hidden, 0 when visible
 *   — animated spring on selectedPOI change; PanResponder drag follows finger
 *   — dismiss threshold: drag down > 60px
 */

// ─── ICONS ───
const CloseIcon = ({ size = 24, color = COLORS.darkText }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const BackIcon = ({ size = 20, color = COLORS.darkText }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18L9 12L15 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StarIcon = ({ size = 14, color = '#FFB900' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill={color}>
    <Path d="M7 1l1.76 3.57L12.5 5.2l-2.75 2.68.65 3.79L7 9.84 3.6 11.67l.65-3.79L1.5 5.2l3.74-.63L7 1z" />
  </Svg>
);

// Legacy pin color map (kept for single-category mode fallback only)
const LEGACY_PIN_COLORS: Partial<Record<LifestyleCategory, string>> = {
  coffee: '#78350F',
  yoga: '#6D28D9',
  parks: '#065F46',
  gym: '#1D4ED8',
  grocery: '#065F46',
};

const poiKey = (poi: POIResult) => `${poi.category}-${poi.name}-${poi.lat}-${poi.lng}`;

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const CategoryMapScreen: React.FC = () => {
  const route = useRoute<RouteProp<HomeStackParamList, 'CategoryMapScreen'>>();
  // Mode detection — new multi-category redesign when allResults is passed
  if (route.params.allResults) return <MultiCategoryMap />;
  return <LegacySingleCategoryMap />;
};

// ═══════════════════════════════════════════════════════════════
// S148b — Multi-category redesign
// ═══════════════════════════════════════════════════════════════

const MultiCategoryMap: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'CategoryMapScreen'>>();
  const insets = useSafeAreaInsets();
  const {
    allResults,
    initialCategory = 'all',
    addressLat,
    addressLng,
    address,
    radiusMi,
  } = route.params;

  // Defensive ?? guards (per tasks/lessons.md S104 — no `!` on nav-param data).
  // MultiCategoryMap only mounts when allResults is truthy, but keep the guards
  // so a stray re-mount with missing data cannot crash the screen.
  const categoryScores = allResults?.categoryScores ?? [];
  const allPois = allResults?.pois ?? [];

  // Categories that actually have POIs in this analysis
  const availableCategories = useMemo(
    () =>
      categoryScores
        .filter((c) => (c.poiCount ?? 0) > 0)
        .map((c) => c.category),
    [categoryScores],
  );

  // POI count per category (for chip badge)
  const poiCountsByCategory = useMemo(() => {
    const counts: Partial<Record<LifestyleCategory, number>> = {};
    for (const c of categoryScores) counts[c.category] = c.poiCount ?? 0;
    return counts;
  }, [categoryScores]);

  // ── active category state ──
  const [activeCategories, setActiveCategories] = useState<Set<LifestyleCategory>>(() => {
    if (initialCategory === 'all' || !initialCategory) {
      return new Set(availableCategories);
    }
    return new Set([initialCategory as LifestyleCategory]);
  });

  const [selectedPOI, setSelectedPOI] = useState<POIResult | null>(null);

  // ── derived visible POIs ──
  const visiblePOIs = useMemo(
    () => allPois.filter((p) => activeCategories.has(p.category)),
    [allPois, activeCategories],
  );

  // ── pin animations (persist across renders keyed by POI) ──
  const pinAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;
  const getPinAnim = useCallback(
    (poi: POIResult): Animated.Value => {
      const key = poiKey(poi);
      let av = pinAnimations.get(key);
      if (!av) {
        av = new Animated.Value(-20);
        pinAnimations.set(key, av);
      }
      return av;
    },
    [pinAnimations],
  );

  // Drop-in animation whenever visiblePOIs changes (new pins enter)
  useEffect(() => {
    visiblePOIs.forEach((poi, idx) => {
      const av = getPinAnim(poi);
      Animated.spring(av, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
        speed: 14,
        delay: idx * 40,
      }).start();
    });
    // Reset animations for pins that left the visible set so their next entry re-drops
    const visibleKeys = new Set(visiblePOIs.map(poiKey));
    for (const [key, av] of pinAnimations.entries()) {
      if (!visibleKeys.has(key)) av.setValue(-20);
    }
  }, [visiblePOIs, getPinAnim, pinAnimations]);

  // ── map ref + auto-fit camera ──
  const mapRef = useRef<MapView | null>(null);
  useEffect(() => {
    if (visiblePOIs.length === 0) return;
    const timer = setTimeout(() => {
      const coords = visiblePOIs.map((p) => ({ latitude: p.lat, longitude: p.lng }));
      coords.push({ latitude: addressLat, longitude: addressLng });
      mapRef.current?.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 220, left: 40 },
        animated: true,
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [visiblePOIs, addressLat, addressLng]);

  // ── chip toggle handler ──
  const toggleCategory = useCallback(
    (cat: LifestyleCategory) => {
      if ((poiCountsByCategory[cat] ?? 0) === 0) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setSelectedPOI(null);
      setActiveCategories((prev) => {
        const next = new Set(prev);
        if (next.has(cat)) {
          if (next.size === 1) return prev; // always show at least one
          next.delete(cat);
        } else {
          next.add(cat);
        }
        return next;
      });
    },
    [poiCountsByCategory],
  );

  const tapAllChip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSelectedPOI(null);
    setActiveCategories(new Set(availableCategories));
  }, [availableCategories]);

  const allChipActive =
    availableCategories.length > 0 &&
    availableCategories.every((c) => activeCategories.has(c));

  // ── place preview sheet animation ──
  const sheetTranslateY = useRef(new Animated.Value(300)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (selectedPOI) {
      Animated.parallel([
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 4,
          speed: 14,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0.35,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(sheetTranslateY, {
          toValue: 300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedPOI, sheetTranslateY, backdropOpacity]);

  // Drag-to-dismiss PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) sheetTranslateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 60) {
          setSelectedPOI(null);
        } else {
          Animated.spring(sheetTranslateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
            speed: 14,
          }).start();
        }
      },
    }),
  ).current;

  const openInMaps = (poi: POIResult) => {
    const url =
      Platform.OS === 'ios'
        ? `maps:?q=${encodeURIComponent(poi.name)}&ll=${poi.lat},${poi.lng}`
        : `geo:${poi.lat},${poi.lng}?q=${encodeURIComponent(poi.name)}`;
    Linking.openURL(url).catch(() => {});
  };

  // ── initial region ──
  const initialRegion = {
    latitude: addressLat,
    longitude: addressLng,
    latitudeDelta: 0.028,
    longitudeDelta: 0.028,
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* ─── MAP ─── */}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        onPress={() => setSelectedPOI(null)}
      >
        {/* Address pin */}
        <Marker
          coordinate={{ latitude: addressLat, longitude: addressLng }}
          zIndex={10}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.primary,
              borderWidth: 2,
              borderColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              ...SHADOWS.card,
            }}
          >
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' }} />
          </View>
        </Marker>

        {/* POI pins */}
        {visiblePOIs.map((poi) => {
          const display = CATEGORY_DISPLAY[poi.category];
          const translateY = getPinAnim(poi);
          return (
            <Marker
              key={poiKey(poi)}
              coordinate={{ latitude: poi.lat, longitude: poi.lng }}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedPOI(poi);
              }}
            >
              <Animated.View style={{ alignItems: 'center', transform: [{ translateY }] }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: display.color,
                    borderWidth: 1.5,
                    borderColor: '#FFFFFF',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...SHADOWS.card,
                  }}
                >
                  <Text style={{ fontSize: 18 }}>{display.emoji}</Text>
                </View>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 5,
                    borderRightWidth: 5,
                    borderTopWidth: 7,
                    borderLeftColor: 'transparent',
                    borderRightColor: 'transparent',
                    borderTopColor: display.color,
                    marginTop: -1,
                  }}
                />
              </Animated.View>
            </Marker>
          );
        })}
      </MapView>

      {/* ─── HEADER OVERLAY ─── */}
      <SafeAreaView
        edges={['top']}
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 8,
            gap: 12,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: COLORS.background,
              alignItems: 'center',
              justifyContent: 'center',
              ...SHADOWS.card,
            }}
          >
            <BackIcon size={20} />
          </Pressable>
          <View
            style={{
              flex: 1,
              backgroundColor: COLORS.background,
              borderRadius: 22,
              paddingHorizontal: 14,
              height: 44,
              justifyContent: 'center',
              ...SHADOWS.card,
            }}
          >
            <Text
              numberOfLines={1}
              style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}
            >
              {address}
            </Text>
          </View>
          {radiusMi != null && (
            <View
              style={{
                backgroundColor: COLORS.background,
                borderRadius: 22,
                paddingHorizontal: 12,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
                ...SHADOWS.card,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.bodyText }}>
                Within {radiusMi} mi
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ─── BACKDROP (behind sheet, in front of map) ─── */}
      {selectedPOI && (
        <Animated.View
          pointerEvents={selectedPOI ? 'auto' : 'none'}
          style={{
            ...StyleSheetAbsoluteFill,
            backgroundColor: '#000000',
            opacity: backdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setSelectedPOI(null)} />
        </Animated.View>
      )}

      {/* ─── FILTER BAR ─── */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: COLORS.background,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          ...SHADOWS.card,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4, gap: 8 }}
        >
          {/* "All" chip */}
          <FilterChip
            label={CATEGORY_DISPLAY.all.label}
            emoji={CATEGORY_DISPLAY.all.emoji}
            color={CATEGORY_DISPLAY.all.color}
            count={allPois.length}
            active={allChipActive}
            disabled={availableCategories.length === 0}
            onPress={tapAllChip}
          />
          {availableCategories.map((cat) => {
            const display = CATEGORY_DISPLAY[cat];
            const count = poiCountsByCategory[cat] ?? 0;
            return (
              <FilterChip
                key={cat}
                label={display.label}
                emoji={display.emoji}
                color={display.color}
                count={count}
                active={activeCategories.has(cat)}
                disabled={count === 0}
                onPress={() => toggleCategory(cat)}
              />
            );
          })}
        </ScrollView>
      </View>

      {/* ─── PLACE SHEET ─── */}
      {selectedPOI && (
        <Animated.View
          {...panResponder.panHandlers}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: COLORS.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 20,
            transform: [{ translateY: sheetTranslateY }],
            ...SHADOWS.modal,
          }}
        >
          {/* Drag handle */}
          <View
            style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: COLORS.border,
              marginBottom: 12,
            }}
          />

          {/* Header row: emoji + category label + close */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16 }}>{CATEGORY_DISPLAY[selectedPOI.category].emoji}</Text>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.secondaryText }}>
                {CATEGORY_DISPLAY[selectedPOI.category].label}
              </Text>
            </View>
            <Pressable
              onPress={() => setSelectedPOI(null)}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <CloseIcon size={20} color={COLORS.secondaryText} />
            </Pressable>
          </View>

          <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, marginBottom: 4 }}>
            {selectedPOI.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 14, color: COLORS.secondaryText }}>
              {selectedPOI.distanceMi.toFixed(1)} miles away
            </Text>
            {selectedPOI.rating != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 14, color: COLORS.bodyText }}>{selectedPOI.rating}</Text>
                <StarIcon />
              </View>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 14 }} />

          <Pressable
            onPress={() => openInMaps(selectedPOI)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 44,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.primary }}>
              Open in Maps
            </Text>
            <Text style={{ fontSize: 18, color: COLORS.primary }}>→</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
};

// ─── FILTER CHIP ───
interface FilterChipProps {
  label: string;
  emoji: string;
  color: string;
  count: number;
  active: boolean;
  disabled: boolean;
  onPress: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  emoji,
  color,
  count,
  active,
  disabled,
  onPress,
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, bounciness: 6, speed: 14 }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, bounciness: 6, speed: 14 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], opacity: disabled ? 0.4 : 1 }}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={disabled ? undefined : handlePressIn}
        onPressOut={disabled ? undefined : handlePressOut}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          minHeight: 36,
          paddingHorizontal: 12,
          borderRadius: 9999,
          borderWidth: 1.5,
          borderColor: color,
          backgroundColor: active ? color : 'transparent',
        }}
      >
        <Text style={{ fontSize: 14 }}>{emoji}</Text>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: active ? '#FFFFFF' : color,
          }}
        >
          {label} · {count}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

// Small inline helper — RN has no StyleSheet.absoluteFill import cost here
const StyleSheetAbsoluteFill = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

// ═══════════════════════════════════════════════════════════════
// Legacy single-category mode (AddressComparisonScreen compat)
// ═══════════════════════════════════════════════════════════════

const LegacySingleCategoryMap: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'CategoryMapScreen'>>();
  const insets = useSafeAreaInsets();
  const { label, emoji, pois, addressLat, addressLng, category } = route.params;

  const [selectedPOI, setSelectedPOI] = useState<POIResult | null>(null);

  const pinColor = LEGACY_PIN_COLORS[category] ?? COLORS.primary;
  const minDist = pois.length > 0 ? Math.min(...pois.map((p) => p.distanceMi)).toFixed(1) : '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          height: 48,
          borderBottomWidth: 0.69,
          borderBottomColor: COLORS.border,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <CloseIcon size={20} />
        </Pressable>
        <Text
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '600',
            color: COLORS.darkText,
          }}
        >
          {emoji} {label}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: addressLat,
            longitude: addressLng,
            latitudeDelta: 0.018,
            longitudeDelta: 0.018,
          }}
          onPress={() => setSelectedPOI(null)}
        >
          <Marker coordinate={{ latitude: addressLat, longitude: addressLng }} title="From here" zIndex={10}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' }} />
            </View>
          </Marker>

          {pois.map((poi, idx) => (
            <Marker
              key={`poi-${idx}`}
              coordinate={{ latitude: poi.lat, longitude: poi.lng }}
              pinColor={pinColor}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedPOI(poi);
              }}
            />
          ))}
        </MapView>

        {selectedPOI && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: COLORS.background,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingHorizontal: 20,
              paddingTop: 16,
              paddingBottom: 32 + insets.bottom,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <Pressable
              onPress={() => setSelectedPOI(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                width: 36,
                height: 36,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CloseIcon size={18} color={COLORS.secondaryText} />
            </Pressable>
            <Text
              style={{
                fontSize: 17,
                fontWeight: '600',
                color: COLORS.darkText,
                marginBottom: 4,
                paddingRight: 40,
              }}
            >
              {selectedPOI.name}
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.secondaryText, marginBottom: 4 }}>
              {selectedPOI.distanceMi.toFixed(1)} mi away
            </Text>
            {selectedPOI.rating != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 14, color: COLORS.bodyText }}>{selectedPOI.rating}</Text>
                <StarIcon />
              </View>
            )}
            <View
              style={{
                marginTop: 10,
                alignSelf: 'flex-start',
                backgroundColor: COLORS.tagBg,
                borderRadius: 999,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.bodyText }}>
                {emoji} {label}
              </Text>
            </View>
          </View>
        )}

        {!selectedPOI && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: COLORS.background,
              borderTopWidth: 0.69,
              borderTopColor: COLORS.border,
              padding: 16,
              paddingBottom: 16 + insets.bottom,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: COLORS.bodyText,
                textAlign: 'center',
              }}
            >
              {pois.length} {label} within 0.5mi  ·  Closest: {minDist}mi
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CategoryMapScreen;
