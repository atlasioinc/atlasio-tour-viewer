// ClientLifestyleScreen.tsx
// ═══════════════════════════════════════════════════════════════
// WHO:   Agent only
// WHERE: HomeStack → fullScreenModal from HomeTabAgent 'Client Tools' card
// WHAT:  Client name input + lifestyle tile selection + address autocomplete
// NEXT:  navigation.navigate('NeighborhoodMatchScreen', { priorities, clientLabel, address, lat, lng })
//
// @demo  All address suggestions are hardcoded (1700 Lincoln St, Denver CO 80203)
// @backend Google Places Autocomplete (New) API — POST places.googleapis.com/v1/places:autocomplete
//          Google Places Details — GET places.googleapis.com/v1/places/{placeId}?fields=location,formattedAddress
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  Animated,
  Dimensions,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './HomeStack';
import type { LifestyleCategory, PriorityLevel } from '../types/neighborhood';
import { CATEGORY_META } from '../lib/neighborhoodScoring';
import { COLORS } from '../lib/tokens';
import { GOOGLE_MAPS_API_KEY } from '../lib/config';
import { LIVE_NEIGHBORHOOD_HOOKS } from '../hooks/useNeighborhoodAnalysis';

// ── State flow ────────────────────────────────────────────────────────────────
// route.params?.initialPriorities: LifestylePriority[] | undefined
//   — S58: passed when navigating back from "← Edit priorities" in AddressComparisonScreen
//   — undefined on first entry (tiles start blank)
//   — when present, pre-populates selectedTiles on mount + re-navigation
// clientLabel:        string — client name field value (travels to results screen)
// selectedTiles:      Map<LifestyleCategory, PriorityLevel>
//                       Tap unselected → add as 'nice_to_have'. Visual change in place.
//                       Tap selected → remove from Map. Visual change in place.
//                       Long-press nice_to_have → upgrade to 'must_have'. Haptic + scale pulse.
//                       Long-press must_have → downgrade to 'nice_to_have'. Haptic.
//                       Long-press unselected → add as 'must_have'. Haptic + scale pulse.
// addressText:        string — raw typed text in address field
// addressDisplay:     string — confirmed address from autocomplete selection
// showAutocomplete:   boolean — shows suggestion dropdown
// geocodedLat/Lng:    number | null — geocoded coordinates (live path only)
// suggestions:        Array<{ placeId, description }> — live autocomplete results
// isFetchingSuggestions: boolean — loading state for live autocomplete
// addressError:       string | null — geocoding failure message
// canAnalyze:         selectedTiles.size >= 1 && addressDisplay.length > 0
//                     (live path also requires geocodedLat/Lng !== null)
//
// All tiles render in a single flat flexWrap row in fixed order (ALL_CATEGORIES).
// Selection changes visual state in place — no tile movement or layout shift.
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ALL_CATEGORIES: LifestyleCategory[] = [
  'coffee', 'yoga', 'parks', 'walkability',
  'gym', 'grocery', 'transit', 'bike', 'air_quality',
];

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CloseIcon = ({ size = 24, color = COLORS.darkText }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PinIcon = ({ size = 16, color = COLORS.secondaryText }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 1.33C5.42 1.33 3.33 3.42 3.33 6C3.33 9.5 8 14.67 8 14.67C8 14.67 12.67 9.5 12.67 6C12.67 3.42 10.58 1.33 8 1.33Z"
      stroke={color} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M10 6C10 7.10457 9.10457 8 8 8C6.89543 8 6 7.10457 6 6C6 4.89543 6.89543 4 8 4C9.10457 4 10 4.89543 10 6Z"
      stroke={color} strokeWidth={1.33}
    />
  </Svg>
);

// ─────────────────────────────────────────────
// LIFESTYLE TILE COMPONENT
// ─────────────────────────────────────────────

interface LifestyleTileProps {
  category: LifestyleCategory;
  state: 'unselected' | 'selected' | 'must_have';
  onTap: (cat: LifestyleCategory) => void;
  onLongPress: (cat: LifestyleCategory) => void;
}

const TILE_MIN_WIDTH = Math.floor((SCREEN_WIDTH - 32 - 20) / 3);

const LifestyleTile = ({ category, state, onTap, onLongPress }: LifestyleTileProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const meta = CATEGORY_META[category];

  const triggerPulse = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 1.06, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleLongPress = () => {
    triggerPulse();
    onLongPress(category);
  };

  const bgColor = state === 'must_have' ? '#FEF3C7' : state === 'selected' ? COLORS.tagBg : '#F3F4F6';
  const borderColor = state === 'must_have' ? '#D97706' : state === 'selected' ? COLORS.primary : '#E5E7EB';
  const borderWidth = state === 'unselected' ? 1 : 1.5;
  const textColor = state === 'must_have' ? '#92400E' : state === 'selected' ? COLORS.primary : COLORS.darkText;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={() => onTap(category)}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={{
          minWidth: TILE_MIN_WIDTH,
          padding: 12,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: bgColor,
          borderWidth,
          borderColor,
        }}
      >
        {state === 'must_have' && (
          <Text style={{
            position: 'absolute', top: 6, right: 8,
            fontSize: 11, color: '#D97706',
          }}>★</Text>
        )}
        <Text style={{ fontSize: 20 }}>
          {meta.emoji}{' '}
          <Text style={{ fontSize: 14, fontWeight: '500', color: textColor }}>{meta.label}</Text>
        </Text>
      </Pressable>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ClientLifestyleScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'ClientLifestyleScreen'>>();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // @backend S58: initialPriorities passed when navigating back from Edit priorities
  // @demo: initialPriorities is undefined on first entry — tiles start blank
  const initialPriorities = route.params?.initialPriorities;

  const [clientLabel, setClientLabel] = useState('');
  // Pre-populate tile selections if returning from Edit priorities flow
  const [selectedTiles, setSelectedTiles] = useState<Map<LifestyleCategory, PriorityLevel>>(() => {
    if (!initialPriorities || initialPriorities.length === 0) return new Map();
    return new Map(initialPriorities.map(p => [p.category, p.priority]));
  });

  // Re-apply when navigating back — component is already mounted so useState init won't re-fire
  useEffect(() => {
    if (initialPriorities && initialPriorities.length > 0) {
      setSelectedTiles(new Map(initialPriorities.map(p => [p.category, p.priority])));
    }
  }, [initialPriorities]);
  const [addressText, setAddressText] = useState('');
  const [addressDisplay, setAddressDisplay] = useState('');
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Geocoded coordinates — populated on autocomplete selection (live path only)
  // @demo: null — mock path uses DEMO_LAT/LNG hardcoded in the hook
  // @backend: passed to analyze() to skip geocoding inside the hook
  const [geocodedLat, setGeocodedLat] = useState<number | null>(null);
  const [geocodedLng, setGeocodedLng] = useState<number | null>(null);

  // Live path autocomplete suggestions from Google Places API
  // @demo: not used — mock path renders hardcoded suggestion
  const [suggestions, setSuggestions] = useState<
    Array<{ placeId: string; description: string }>
  >([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Debounce timer ref for autocomplete
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live path requires geocoded coordinates before enabling the CTA
  const canAnalyze =
    selectedTiles.size >= 1 &&
    addressDisplay.length > 0 &&
    (LIVE_NEIGHBORHOOD_HOOKS ? (geocodedLat !== null && geocodedLng !== null) : true);

  // ── Tile handlers ──

  const handleTileTap = (cat: LifestyleCategory) => {
    setSelectedTiles(prev => {
      const next = new Map(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.set(cat, 'nice_to_have');
      }
      return next;
    });
  };

  const handleTileLongPress = (cat: LifestyleCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTiles(prev => {
      const next = new Map(prev);
      if (!next.has(cat)) {
        next.set(cat, 'must_have');
      } else if (next.get(cat) === 'nice_to_have') {
        next.set(cat, 'must_have');
      } else {
        next.set(cat, 'nice_to_have');
      }
      return next;
    });
  };

  const getTileState = (cat: LifestyleCategory): 'unselected' | 'selected' | 'must_have' => {
    const priority = selectedTiles.get(cat);
    if (!priority) return 'unselected';
    return priority === 'must_have' ? 'must_have' : 'selected';
  };

  // ── Autocomplete functions (live path) ──

  // @backend S57: Google Places Autocomplete (New)
  // POST https://places.googleapis.com/v1/places:autocomplete
  // Called with 400ms debounce after 3+ chars typed
  const fetchAutocompleteSuggestions = async (input: string) => {
    setIsFetchingSuggestions(true);
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        },
        body: JSON.stringify({ input, includedRegionCodes: ['us'] }),
      });
      const data = await response.json();
      const mapped = (data.suggestions ?? []).map((s: any) => ({
        placeId: s.placePrediction?.placeId ?? '',
        description: s.placePrediction?.text?.text ?? '',
      })).filter((s: { placeId: string; description: string }) => s.placeId && s.description);
      setSuggestions(mapped);
    } catch {
      console.warn('[ClientLifestyleScreen] Autocomplete failed');
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  // @backend S57: Google Places Details — geocodes selected placeId to lat/lng
  // GET https://places.googleapis.com/v1/places/{placeId}?fields=location,formattedAddress
  const geocodePlaceId = async (placeId: string) => {
    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${placeId}?fields=location,formattedAddress`,
        { headers: { 'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY } }
      );
      const data = await response.json();
      return {
        formattedAddress: data.formattedAddress as string,
        lat: data.location?.latitude as number,
        lng: data.location?.longitude as number,
      };
    } catch {
      return null;
    }
  };

  // ── Address input handlers ──

  const handleAddressTextChange = (text: string) => {
    setAddressText(text);
    setAddressDisplay('');
    setGeocodedLat(null);
    setGeocodedLng(null);
    setAddressError(null);

    // Clear previous debounce
    if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);

    // Trigger threshold: 3 chars (both mock and live paths)
    if (text.length < 3) {
      setSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    setShowAutocomplete(true);

    if (LIVE_NEIGHBORHOOD_HOOKS) {
      // Debounced live fetch
      autocompleteTimerRef.current = setTimeout(() => {
        fetchAutocompleteSuggestions(text);
      }, 400);
    }
    // @demo: mock path — showAutocomplete = true is enough, hardcoded suggestion renders below
  };

  // @demo: mock path selection — single hardcoded suggestion
  const handleMockSuggestionSelect = () => {
    const addr = '1700 Lincoln St, Denver CO 80203';
    setAddressDisplay(addr);
    setAddressText(addr);
    setShowAutocomplete(false);
    Keyboard.dismiss();
  };

  // @backend S57: geocode selected place and store coordinates
  const handleLiveSuggestionSelect = async (placeId: string, description: string) => {
    setAddressText(description);
    setSuggestions([]);
    setShowAutocomplete(false);
    Keyboard.dismiss();

    const result = await geocodePlaceId(placeId);
    if (result) {
      setAddressDisplay(result.formattedAddress || description);
      setGeocodedLat(result.lat);
      setGeocodedLng(result.lng);
      setAddressError(null);
    } else {
      setAddressDisplay('');
      setGeocodedLat(null);
      setGeocodedLng(null);
      setAddressError('Could not resolve this address. Please try another.');
    }
  };

  const handleAnalyze = () => {
    const priorities = Array.from(selectedTiles.entries())
      .map(([category, priority]) => ({ category, priority }));
    navigation.navigate('NeighborhoodMatchScreen', {
      priorities,
      clientLabel: clientLabel || 'My Client',
      address: addressDisplay,
      lat: geocodedLat ?? undefined,   // @backend: geocoded in live path, undefined in mock
      lng: geocodedLng ?? undefined,   // @backend: geocoded in live path, undefined in mock
    });
  };

  // ── Render ──

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderBottomWidth: 0.69, borderBottomColor: COLORS.border,
      }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <CloseIcon size={20} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{
            fontSize: 16, fontWeight: '600', color: COLORS.darkText, textAlign: 'center',
          }} numberOfLines={2}>
            What did your client say they love?
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.secondaryText, textAlign: 'center', paddingBottom: 2, marginTop: 4 }}>
            Tap to add  ·  Hold to mark as Must Have
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 300 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Client name input ── */}
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Text style={{
              fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: 8,
            }}>
              Client name or label
            </Text>
            <TextInput
              placeholder="e.g. Sarah & Mike"
              placeholderTextColor={COLORS.lightText}
              value={clientLabel}
              onChangeText={setClientLabel}
              returnKeyType="done"
              style={{
                backgroundColor: COLORS.screenBg,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: COLORS.border,
                paddingVertical: 12,
                paddingHorizontal: 14,
                fontSize: 15,
                color: COLORS.darkText,
              }}
            />
          </View>

          {/* ── Lifestyle tiles — single flat grid ── */}
          <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
            <Text style={{
              fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: 8,
            }}>
              {selectedTiles.size > 0 ? 'Your client loves' : 'Lifestyle'}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {ALL_CATEGORIES.map(cat => (
                <LifestyleTile
                  key={cat}
                  category={cat}
                  state={getTileState(cat)}
                  onTap={handleTileTap}
                  onLongPress={handleTileLongPress}
                />
              ))}
            </View>
          </View>

          {/* ── Address input ── */}
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={{
              fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: 8, marginTop: 20,
            }}>
              Property address
            </Text>
            <View style={{ position: 'relative' }}>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: COLORS.background,
                borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
                paddingHorizontal: 14, paddingVertical: 12,
              }}>
                <PinIcon />
                <TextInput
                  placeholder="Enter a property address"
                  placeholderTextColor={COLORS.lightText}
                  value={addressText}
                  onChangeText={handleAddressTextChange}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollToEnd({ animated: true });
                    }, 300);
                  }}
                  style={{ flex: 1, fontSize: 15, color: COLORS.darkText, padding: 0 }}
                  returnKeyType="done"
                />
              </View>

              {/* Autocomplete dropdown — mock or live path */}
              {showAutocomplete && addressText.length >= 3 && (
                <View style={{
                  position: 'absolute', top: 52, left: 0, right: 0, zIndex: 99,
                  backgroundColor: COLORS.background,
                  borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
                  shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
                }}>
                  {LIVE_NEIGHBORHOOD_HOOKS ? (
                    // Live path — dynamic suggestions from Google Places Autocomplete
                    isFetchingSuggestions && suggestions.length === 0 ? (
                      <View style={{ padding: 12, paddingHorizontal: 14 }}>
                        <Text style={{ fontSize: 14, color: COLORS.lightText }}>
                          Searching...
                        </Text>
                      </View>
                    ) : (
                      suggestions.map((s) => (
                        <Pressable
                          key={s.placeId}
                          onPress={() => handleLiveSuggestionSelect(s.placeId, s.description)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingHorizontal: 14 }}
                        >
                          <PinIcon size={16} color={COLORS.bodyText} />
                          <Text style={{ fontSize: 14, color: COLORS.darkText }}>{s.description}</Text>
                        </Pressable>
                      ))
                    )
                  ) : (
                    // @demo: Mock path — single hardcoded suggestion
                    <Pressable
                      onPress={handleMockSuggestionSelect}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingHorizontal: 14 }}
                    >
                      <PinIcon size={16} color={COLORS.bodyText} />
                      <Text style={{ fontSize: 14, color: COLORS.darkText }}>1700 Lincoln St, Denver CO 80203</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>

            {/* Address error display */}
            {addressError && (
              <Text style={{ fontSize: 13, color: COLORS.errorRed, marginTop: 6, paddingHorizontal: 2 }}>
                {addressError}
              </Text>
            )}
          </View>
      </ScrollView>

      {/* ── Sticky CTA — always pinned, never moves ── */}
      <View style={{
        backgroundColor: COLORS.background,
        borderTopWidth: 0.69, borderTopColor: COLORS.border,
        paddingHorizontal: 16, paddingTop: 12,
        paddingBottom: 16 + insets.bottom,
      }}>
        <Pressable
          onPress={handleAnalyze}
          disabled={!canAnalyze}
          style={{
            height: 52, borderRadius: 12,
            backgroundColor: canAnalyze ? COLORS.primary : '#C7D2FE',
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
            Analyze Match →
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
};

export default ClientLifestyleScreen;
