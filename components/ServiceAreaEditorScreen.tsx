// ═══════════════════════════════════════════════════════════════
// components/ServiceAreaEditorScreen.tsx
// What:  Service Area editor — sets agent's geocoded service center + radius.
// Who:   Agents only (FindTab chip is the sole entry point in S163).
// Where: FindStack ServiceAreaEditor, fullScreenModal.
//
// @demo  None — live-only feature. Requires USE_MOCK_DATA=false to hit the RPC.
// @backend rpc_update_service_area — see sql/schema.sql (S163)
//
// Architecture:
//   - Reads current service area from useMyProfile + getServiceArea (single cast point).
//   - City field: AddressAutocompleteInput with onSelectWithCoords (Places Details).
//     Geocode failure renders inline red error — user picks another address.
//   - Radius slider: @react-native-community/slider, 5..100 mi, step=1.
//     Graduated haptics (Light every 5, Medium at 25/50/75, Rigid at 5/100 edges).
//   - Save CTA: disabled until coords + radius present AND form differs from profile.
//     On success: emits atlasio.serviceArea.updated via DeviceEventEmitter and
//     dismisses instantly. FindTab's listener renders the SuccessToast.
//
// KAV pattern (per S159 lessons): SafeAreaView edges={['top']} only, KAV padding
// behavior with keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}, Save row
// sibling of ScrollView with fixed paddingBottom: 16. No insets.bottom on Save row.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  DeviceEventEmitter,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { FindStackParamList } from './FindStack';

import { COLORS } from '../lib/tokens';
import { AddressAutocompleteInput } from './shared';
import { useMyProfile, useUpdateServiceArea } from '../hooks/useData';
import { getServiceArea } from '../lib/typeAdapters';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const RADIUS_MIN = 5;
const RADIUS_MAX = 100;
const RADIUS_DEFAULT = 25;

// S163 — cross-screen event for modal-to-parent success signal.
// Namespace pattern: atlasio.<domain>.<verb>. Parent (FindTab) listens in
// a useEffect and calls showSuccess with its local useSuccessToast state.
const EVENT_SERVICE_AREA_UPDATED = 'atlasio.serviceArea.updated';

// ─────────────────────────────────────────────
// X ICON (header dismiss — matches 44×44 touch-target rule)
// ─────────────────────────────────────────────

const XIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M6 6L18 18M18 6L6 18"
      stroke={COLORS.darkText}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const PinIcon: React.FC<{ color?: string }> = ({ color = COLORS.primary }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 1.33C5.42 1.33 3.33 3.42 3.33 6C3.33 9.5 8 14.67 8 14.67C8 14.67 12.67 9.5 12.67 6C12.67 3.42 10.58 1.33 8 1.33Z"
      stroke={color}
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M8 8C9.10457 8 10 7.10457 10 6C10 4.89543 9.10457 4 8 4C6.89543 4 6 4.89543 6 6C6 7.10457 6.89543 8 8 8Z"
      stroke={color}
      strokeWidth={1.33}
    />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ServiceAreaEditorScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<FindStackParamList>>();
  const insets = useSafeAreaInsets();
  const { data: myProfile } = useMyProfile();
  const initial = useMemo(() => getServiceArea(myProfile), [myProfile]);

  // ── Form state ──
  const [cityLabel, setCityLabel] = useState<string>(initial?.label ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    initial ? { lat: initial.lat, lng: initial.lng } : null,
  );
  const [radius, setRadius] = useState<number>(initial?.radius ?? RADIUS_DEFAULT);

  // ── Error state (inline, per field) ──
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Haptic bookkeeping ──
  const lastHapticValueRef = useRef<number>(radius);

  // ── Mutation ──
  const updateServiceArea = useUpdateServiceArea();
  const isSaving = updateServiceArea.isPending;

  // On cold profile cache (rare), form flashes empty for ~200ms before hydration.
  // Accept for S163; revisit if QA flags it. myProfile is hot-cached in typical
  // Find-tab entry flow.
  //
  // Hydrate once myProfile loads (initial is useMemo'd on myProfile ref)
  useEffect(() => {
    if (initial && cityLabel === '' && !coords) {
      setCityLabel(initial.label);
      setCoords({ lat: initial.lat, lng: initial.lng });
      setRadius(initial.radius);
      lastHapticValueRef.current = initial.radius;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once when profile first resolves
  }, [initial]);

  // ─────────────────────────────────────────────
  // HANDLERS
  // ─────────────────────────────────────────────

  const handleAddressTextChange = (text: string) => {
    setCityLabel(text);
    // Typing invalidates any previously-resolved coords — user must pick from
    // the dropdown again to get fresh lat/lng.
    if (coords) setCoords(null);
    if (geocodeError) setGeocodeError(null);
  };

  const handleAddressCoords = (
    description: string,
    c: { lat: number; lng: number } | null,
  ) => {
    if (c) {
      setCityLabel(description);
      setCoords(c);
      setGeocodeError(null);
    } else {
      // Places Details failed or missing location — don't clobber label; surface error.
      setCoords(null);
      setGeocodeError("Couldn't geocode that address. Try another.");
    }
  };

  const handleRadiusChange = (value: number) => {
    const rounded = Math.round(value);
    setRadius(rounded);

    const last = lastHapticValueRef.current;
    if (rounded === last) return;

    // Three-tier haptics per S163 spec. Rigid at 5/100 edges, Medium at
    // 25/50/75 thresholds, Light on every 5-mi boundary in between.
    if (rounded === RADIUS_MIN || rounded === RADIUS_MAX) {
      // Rigid added iOS 13+; expo-haptics forwards it safely.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid).catch(() => {});
    } else if (rounded === 25 || rounded === 50 || rounded === 75) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else if (rounded % 5 === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      return; // no haptic between 5-mi boundaries — value still updates visually
    }

    lastHapticValueRef.current = rounded;
  };

  const handleSave = () => {
    if (!coords || !cityLabel || isSaving) return;
    setSaveError(null);

    // No-op save: identical to current profile → dismiss without RPC
    if (
      initial &&
      initial.lat === coords.lat &&
      initial.lng === coords.lng &&
      initial.radius === radius &&
      initial.label === cityLabel
    ) {
      navigation.goBack();
      return;
    }

    updateServiceArea.mutate(
      { lat: coords.lat, lng: coords.lng, radius, label: cityLabel },
      {
        onSuccess: () => {
          // Emit first, dismiss immediately. FindTab's listener (Step 13)
          // picks up the event and shows the toast — perceived speed beats
          // a 400ms in-modal fade. Chip already re-renders from the
          // optimistic cache patch in useUpdateServiceArea.onSuccess.
          DeviceEventEmitter.emit(EVENT_SERVICE_AREA_UPDATED, { label: cityLabel });
          navigation.goBack();
        },
        onError: (err: any) => {
          setSaveError(
            err?.message
              ? `Couldn't save: ${err.message}`
              : "Couldn't save. Try again.",
          );
        },
      },
    );
  };

  const handleDismiss = () => {
    if (isSaving) return;
    navigation.goBack();
  };

  // ─────────────────────────────────────────────
  // DERIVED
  // ─────────────────────────────────────────────

  const isSaveEnabled = !!coords && cityLabel.trim().length > 0 && !isSaving;

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
      >
        {/* ── Header — 44×44 spacer + centered title + 44×44 X button ── */}
        <View
          style={{
            paddingTop: 8 + insets.top,
            paddingBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 4,
            borderBottomWidth: 0.68,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.background,
          }}
        >
          <View style={{ width: 44, height: 44 }} />
          <Text
            style={{
              fontSize: 17,
              fontWeight: '600',
              color: COLORS.darkText,
              lineHeight: 22,
            }}
          >
            Service Area
          </Text>
          <Pressable
            onPress={handleDismiss}
            disabled={isSaving}
            accessibilityLabel="Close"
            accessibilityRole="button"
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : isSaving ? 0.4 : 1,
            })}
          >
            <XIcon />
          </Pressable>
        </View>

        {/* ── Scrollable form ── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Field 1: City / Area ── */}
          <View style={{ gap: 8 }}>
            <AddressAutocompleteInput
              label="City or area"
              placeholder="Search a city or area"
              value={cityLabel}
              onSelect={handleAddressTextChange}
              onSelectWithCoords={handleAddressCoords}
            />
            {geocodeError ? (
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.errorRed,
                  lineHeight: 18,
                }}
                accessibilityLiveRegion="polite"
              >
                {geocodeError}
              </Text>
            ) : null}
          </View>

          {/* ── Field 2: Radius ── */}
          <View style={{ marginTop: 24, gap: 12 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
              Service radius
            </Text>

            {/* Centered numeric readout */}
            <View style={{ alignItems: 'center', paddingVertical: 8 }}>
              <Text
                style={{
                  fontSize: 32,
                  fontWeight: '700',
                  color: COLORS.darkText,
                  lineHeight: 40,
                  // tabular-nums keeps digit widths fixed so readout doesn't
                  // jitter as user drags between "9 mi" and "10 mi".
                  fontVariant: ['tabular-nums'],
                }}
              >
                {radius} mi
              </Text>
            </View>

            <Slider
              style={{ width: '100%', height: 40 }}
              minimumValue={RADIUS_MIN}
              maximumValue={RADIUS_MAX}
              step={1}
              value={radius}
              onValueChange={handleRadiusChange}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.disabledBg}
              thumbTintColor={COLORS.primary}
              accessibilityLabel="Service radius"
              accessibilityHint="Adjust your service area radius"
              accessibilityValue={{
                min: RADIUS_MIN,
                max: RADIUS_MAX,
                now: radius,
                text: `${radius} miles`,
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: COLORS.secondaryText, lineHeight: 16 }}>
                {RADIUS_MIN} mi
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.secondaryText, lineHeight: 18 }}>
                Distance you&apos;ll serve
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.secondaryText, lineHeight: 16 }}>
                {RADIUS_MAX} mi
              </Text>
            </View>
          </View>

          {/* Hint — explains the purpose of the two fields above; sits before the
              save error so it doesn't read as an explanation of an error. */}
          <View style={{ marginTop: 24, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ paddingTop: 2 }}>
              <PinIcon color={COLORS.secondaryText} />
            </View>
            <Text
              style={{
                flex: 1,
                fontSize: 13,
                color: COLORS.secondaryText,
                lineHeight: 18,
              }}
            >
              Your service area filters who you see on Find. You&apos;ll still see anyone who searches
              for you directly.
            </Text>
          </View>

          {/* ── Save error (inline, above CTA) ── */}
          {saveError ? (
            <View style={{ marginTop: 24 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: COLORS.errorRed,
                  lineHeight: 18,
                }}
                accessibilityLiveRegion="polite"
              >
                {saveError}
              </Text>
            </View>
          ) : null}
        </ScrollView>

        {/* ── Sticky Save CTA (S159 canonical pattern — sibling of ScrollView) ── */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: Math.max(insets.bottom, 16),
            backgroundColor: COLORS.background,
            // 0.69 matches PostPhotoJobScreen sticky-CTA canonical per S159.
            // Header uses 0.68 (CLAUDE.md spec for headers/cards) — values
            // differ by 0.01 intentionally across the two reference patterns.
            borderTopWidth: 0.69,
            borderTopColor: COLORS.border,
          }}
        >
          <Pressable
            onPress={handleSave}
            disabled={!isSaveEnabled}
            style={({ pressed }) => ({
              backgroundColor: isSaveEnabled ? COLORS.primary : COLORS.disabledBg,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed && isSaveEnabled ? 0.9 : 1,
            })}
          >
            {isSaving ? (
              <ActivityIndicator color={COLORS.onPrimary} size="small" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: isSaveEnabled ? COLORS.onPrimary : COLORS.disabledText,
                  lineHeight: 20,
                }}
              >
                Save service area
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ServiceAreaEditorScreen;
