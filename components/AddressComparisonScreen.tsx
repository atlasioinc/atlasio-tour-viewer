// AddressComparisonScreen.tsx
// ═══════════════════════════════════════════════════════════════
// WHO:   Agent only
// WHERE: HomeStack → fullScreenModal from NeighborhoodMatchScreen
// WHAT:  Agent enters 1–2 additional addresses to compare against the first.
//        Shows ranked comparison with composite scores and category breakdowns.
// RECEIVES: { priorities, clientLabel, firstAddress, firstAnalysis }
//
// @demo  All scores from useAddressComparison mock data (offset per address)
// @backend Walk Score API + Google Places Nearby + AirNow per address (S57+)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from './HomeStack';
import { useAddressComparison } from '../hooks/useNeighborhoodAnalysis';
import { COLORS } from '../lib/tokens';

// ── State flow ────────────────────────────────────────────────────────────────
// addressInputs: string[] — up to 2 additional address text fields
// addressDisplays: string[] — confirmed addresses from autocomplete
// showAutocomplete: number | null — index of which field is showing suggestions
// canCompare: addressDisplays.filter(Boolean).length >= 1 (need at least 1 more)
//
// On mount: firstAddress + firstAnalysis are already available from route params.
// On 'Compare' tap: useAddressComparison.compare([firstAddress, ...addressDisplays], ...)
// After comparison: results rendered inline on this screen (no new screen needed)
// ─────────────────────────────────────────────────────────────────────────────

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

const CheckIcon = ({ size = 14, color = '#059669' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill="none">
    <Path d="M2.5 7L5.5 10L11.5 4" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Rank identity system — badge + pill colors per card position
// @tokens: add to tokens.ts in design system cleanup session
// ─────────────────────────────────────────────────────────────────────────────
const RANK_BADGE_COLORS = ['#F59E0B', '#9CA3AF', '#B45309'] as const; // gold, silver, bronze

// Score pill — neutral style, same for all cards
// Score meaning is communicated by the composite score color, not the pill
const SCORE_PILL_STYLE = {
  bg: COLORS.tagBg,
  border: COLORS.border,
  text: COLORS.darkText,
} as const;

// Composite score color thresholds — same logic as NeighborhoodMatchScreen
// @demo: scores are mock — thresholds apply to real scores too in production
function getScoreColor(score: number): string {
  if (score >= 85) return '#16A34A';
  if (score >= 70) return '#D97706';
  return '#DC2626';
}

// @demo: hardcoded mock suggestions per address slot
// @backend: Google Places Autocomplete (New) API — POST places.googleapis.com/v1/places:autocomplete
const MOCK_SUGGESTIONS: string[] = [
  '2490 W 26th Ave, Denver CO 80211',
  '1600 Glenarm Pl, Denver CO 80202',
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const AddressComparisonScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'AddressComparisonScreen'>>();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const { priorities, clientLabel, firstAddress } = route.params;
  // firstAnalysis available in route.params for Phase 2: pre-populate winner without re-analysis

  // ── Input phase state ──
  const [addressInputs, setAddressInputs] = useState<string[]>(['', '']);
  const [addressDisplays, setAddressDisplays] = useState<string[]>(['', '']);
  const [showAutocomplete, setShowAutocomplete] = useState<number | null>(null);

  // ── Comparison hook ──
  const { compare, comparison, isLoading, error, reset } = useAddressComparison();

  const canCompare = addressDisplays.filter(Boolean).length >= 1;

  // ── Handlers ──

  const handleAddressChange = (text: string, index: number) => {
    const next = [...addressInputs];
    next[index] = text;
    setAddressInputs(next);
    setShowAutocomplete(text.length >= 2 ? index : null);
    // Clear confirmed address when editing
    const nextDisplays = [...addressDisplays];
    nextDisplays[index] = '';
    setAddressDisplays(nextDisplays);
  };

  const handleSelectSuggestion = (index: number) => {
    const addr = MOCK_SUGGESTIONS[index];
    const nextInputs = [...addressInputs];
    nextInputs[index] = addr;
    setAddressInputs(nextInputs);
    const nextDisplays = [...addressDisplays];
    nextDisplays[index] = addr;
    setAddressDisplays(nextDisplays);
    setShowAutocomplete(null);
    Keyboard.dismiss();
  };

  const handleCompare = () => {
    const allAddresses = [firstAddress, ...addressDisplays.filter(Boolean)];
    compare(allAddresses, priorities, clientLabel);
  };

  const handleStartOver = () => {
    reset();
    setAddressInputs(['', '']);
    setAddressDisplays(['', '']);
    setShowAutocomplete(null);
  };

  // ── Phase check ──
  const showResults = comparison !== null && !isLoading;
  const showInput = !showResults && !isLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* ── Header (fullScreenModal — 3 element row) ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 48,
        borderBottomWidth: 0.69, borderBottomColor: COLORS.border,
      }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <CloseIcon size={20} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: COLORS.darkText }}>
          Compare Addresses
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {/* ── Loading state ── */}
      {isLoading && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ fontSize: 14, color: COLORS.secondaryText, marginTop: 12 }}>
            Comparing addresses…
          </Text>
        </View>
      )}

      {/* ── Phase 1 — Input ── */}
      {showInput && (
        <>
          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 120 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Client context pills */}
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{
                backgroundColor: COLORS.tagBg, borderRadius: 999,
                paddingHorizontal: 10, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.bodyText }}>
                  {'👤'} {clientLabel}
                </Text>
              </View>
              <View style={{
                backgroundColor: COLORS.tagBg, borderRadius: 999,
                paddingHorizontal: 10, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.bodyText }}>
                  {'📍'} {firstAddress.length > 28 ? firstAddress.slice(0, 28) + '…' : firstAddress}
                </Text>
              </View>
            </View>

            {/* Section label */}
            <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
              <Text style={{
                fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
              }}>
                Add Addresses to Compare
              </Text>
            </View>

            {/* ── Address 1 (read-only, confirmed) ── */}
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <Text style={{
                fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: 8,
              }}>
                Address 1
              </Text>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                backgroundColor: '#F0FDF4', borderRadius: 10,
                borderWidth: 1, borderColor: '#BBF7D0',
                paddingHorizontal: 14, paddingVertical: 12,
              }}>
                <PinIcon size={16} color="#059669" />
                <Text style={{ flex: 1, fontSize: 15, color: COLORS.darkText }} numberOfLines={1}>
                  {firstAddress}
                </Text>
                <CheckIcon />
              </View>
            </View>

            {/* ── Address 2 input ── */}
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={{
                fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: 8, marginTop: 20,
              }}>
                Address 2
              </Text>
              <View style={{ position: 'relative', zIndex: 10 }}>
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
                    value={addressInputs[0]}
                    onChangeText={(text) => handleAddressChange(text, 0)}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 300);
                    }}
                    style={{ flex: 1, fontSize: 15, color: COLORS.darkText, padding: 0 }}
                    returnKeyType="done"
                  />
                  {addressDisplays[0] ? <CheckIcon /> : null}
                </View>

                {/* @demo: hardcoded suggestion. @backend: Google Places Autocomplete (New) API */}
                {showAutocomplete === 0 && addressInputs[0].length >= 2 && (
                  <View style={{
                    position: 'absolute', top: 52, left: 0, right: 0, zIndex: 99,
                    backgroundColor: COLORS.background,
                    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
                    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
                  }}>
                    <Pressable
                      onPress={() => handleSelectSuggestion(0)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingHorizontal: 14 }}
                    >
                      <PinIcon size={16} color={COLORS.bodyText} />
                      <Text style={{ fontSize: 14, color: COLORS.darkText }}>{MOCK_SUGGESTIONS[0]}</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>

            {/* ── Address 3 input (shown only after Address 2 is confirmed) ── */}
            {addressDisplays[0].length > 0 && (
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={{
                  fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: 8, marginTop: 20,
                }}>
                  Address 3 (optional)
                </Text>
                <View style={{ position: 'relative', zIndex: 9 }}>
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
                      value={addressInputs[1]}
                      onChangeText={(text) => handleAddressChange(text, 1)}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 300);
                      }}
                      style={{ flex: 1, fontSize: 15, color: COLORS.darkText, padding: 0 }}
                      returnKeyType="done"
                    />
                    {addressDisplays[1] ? <CheckIcon /> : null}
                  </View>

                  {/* @demo: hardcoded suggestion. @backend: Google Places Autocomplete (New) API */}
                  {showAutocomplete === 1 && addressInputs[1].length >= 2 && (
                    <View style={{
                      position: 'absolute', top: 52, left: 0, right: 0, zIndex: 99,
                      backgroundColor: COLORS.background,
                      borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
                      shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1, shadowRadius: 4, elevation: 4,
                    }}>
                      <Pressable
                        onPress={() => handleSelectSuggestion(1)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingHorizontal: 14 }}
                      >
                        <PinIcon size={16} color={COLORS.bodyText} />
                        <Text style={{ fontSize: 14, color: COLORS.darkText }}>{MOCK_SUGGESTIONS[1]}</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Error display */}
            {error && (
              <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <Text style={{ fontSize: 14, color: COLORS.errorRed }}>{error}</Text>
              </View>
            )}
          </ScrollView>

          {/* ── Sticky CTA ── */}
          <View style={{
            backgroundColor: COLORS.background,
            borderTopWidth: 0.69, borderTopColor: COLORS.border,
            paddingHorizontal: 16, paddingTop: 12,
            paddingBottom: 16 + insets.bottom,
          }}>
            <Pressable
              onPress={handleCompare}
              disabled={!canCompare}
              style={{
                height: 52, borderRadius: 12,
                backgroundColor: canCompare ? COLORS.primary : '#C7D2FE',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                Compare Addresses
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {/* ── Phase 2 — Results ── */}
      {showResults && comparison && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Section label */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <Text style={{
              fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12,
            }}>
              Results for {clientLabel.toUpperCase()}
            </Text>
          </View>

          {/* Winner callout (only if 2+ entries) */}
          {comparison.entries.length >= 2 && (
            <View style={{
              marginHorizontal: 16, marginBottom: 16, padding: 14,
              backgroundColor: '#F0FDF4', borderRadius: 12,
              borderWidth: 1, borderColor: '#059669',
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#065F46' }}>
                {'✓'} Best match for {clientLabel}
              </Text>
            </View>
          )}

          {/* ── Ranked comparison cards ── */}
          {comparison.entries.map((entry, index) => {
            const isWinner = index === 0;

            return (
              <View key={entry.address} style={{
                marginHorizontal: 16, marginBottom: 12,
                borderRadius: 14, overflow: 'hidden',
                borderWidth: isWinner ? 1.5 : 0.68,
                borderColor: isWinner ? COLORS.primary : COLORS.cardBorder,
                backgroundColor: COLORS.background,
                position: isWinner ? 'relative' : undefined,
              }}>
                {/* Winner left accent bar */}
                {isWinner && (
                  <View style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
                    backgroundColor: COLORS.primary,
                  }} />
                )}

                {/* Card inner content */}
                <View style={{ padding: 14, paddingLeft: isWinner ? 20 : 14 }}>
                  {/* ── Card header: [rank badge] [address flex:1] [composite score] ── */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center',
                    gap: 10, marginBottom: 14,
                  }}>
                    {/* Rank badge */}
                    <View style={{
                      width: 30, height: 30, borderRadius: 15,
                      backgroundColor: RANK_BADGE_COLORS[index] ?? RANK_BADGE_COLORS[2],
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                        #{index + 1}
                      </Text>
                    </View>

                    {/* Address — shrinks, never wraps */}
                    <Text
                      numberOfLines={1}
                      style={{ flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.darkText }}
                    >
                      {entry.address.length > 28
                        ? entry.address.slice(0, 28) + '…'
                        : entry.address}
                    </Text>

                    {/* Composite score — vertically centered with address, no descriptor */}
                    <Text style={{
                      fontSize: 26, fontWeight: '700',
                      color: getScoreColor(entry.analysis.compositeScore),
                      flexShrink: 0, lineHeight: 30,
                    }}>
                      {entry.analysis.compositeScore}
                    </Text>
                  </View>

                  {/* ── 2-col category score grid ── */}
                  {/* @demo: categoryScores order reflects priority ranking from client setup */}
                  <View style={{
                    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14,
                  }}>
                    {entry.analysis.categoryScores.map((cat) => {
                      return (
                        <View
                          key={cat.category}
                          style={{
                            width: '47.5%',
                            flexDirection: 'row', alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: COLORS.tagBg, borderRadius: 8,
                            paddingHorizontal: 10, paddingVertical: 7,
                          }}
                        >
                          <Text style={{
                            fontSize: 13, color: COLORS.secondaryText,
                            flexShrink: 1, marginRight: 6,
                          }}>
                            {cat.label}
                          </Text>
                          <View style={{
                            backgroundColor: SCORE_PILL_STYLE.bg,
                            borderWidth: 1, borderColor: SCORE_PILL_STYLE.border,
                            borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2,
                            flexShrink: 0,
                          }}>
                            <Text style={{
                              fontSize: 13, fontWeight: '700', color: SCORE_PILL_STYLE.text,
                            }}>
                              {cat.score}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* ── Map chips — one per category with POIs ── */}
                  {/* @demo: poiCount is mock — chips navigate to CategoryMapScreen with */}
                  {/*        this card's own lat/lng, NOT firstAddress coordinates       */}
                  {/* @backend S57+: real poiCount from Places Nearby API response       */}
                  {(() => {
                    const mappable = entry.analysis.categoryScores.filter(
                      cat => (cat.poiCount ?? 0) > 0
                    );
                    if (mappable.length === 0) return null;
                    return (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {mappable.map(cat => (
                          <Pressable
                            key={`map-${cat.category}`}
                            onPress={() => {
                              // CRITICAL: this card's lat/lng, not firstAddress
                              navigation.navigate('CategoryMapScreen', {
                                category: cat.category,
                                label: cat.label,
                                emoji: cat.emoji,
                                pois: entry.analysis.pois.filter(p => p.category === cat.category),
                                addressLat: entry.lat,
                                addressLng: entry.lng,
                                address: entry.address,
                              });
                            }}
                            style={({ pressed }) => ({
                              flexDirection: 'row', alignItems: 'center', gap: 4,
                              borderWidth: 1, borderColor: COLORS.primary,
                              borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 5,
                              opacity: pressed ? 0.7 : 1,
                            })}
                          >
                            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.primary }}>
                              {cat.label} Map
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    );
                  })()}
                </View>
              </View>
            );
          })}

          {/* ── Start Over button ── */}
          {/* @demo: 'Start Over' resets address inputs only — lifestyle priorities cannot
              be changed from this screen. To change priorities, agent must close this
              screen and ClientLifestyleScreen to return to the lifestyle selection step.
              Phase 2 TODO: Add 'Edit priorities →' link in the Phase 2 results header
              that navigates back to ClientLifestyleScreen with current priorities pre-filled. */}
          <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 16 }}>
            <Pressable
              onPress={handleStartOver}
              style={{
                height: 44, borderRadius: 10,
                borderWidth: 1, borderColor: COLORS.primary,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.primary }}>
                Compare different addresses
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default AddressComparisonScreen;
