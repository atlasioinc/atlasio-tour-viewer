// ═══════════════════════════════════════════════════════════════
// components/shared/AddressAutocompleteInput.tsx
// What:  Reusable Google Places address autocomplete input with dropdown
// Who:   All roles — used in job posting flows + deal chat creation
// Where: Shared component — PostPhotoJobScreen, PostStagingJobScreen,
//        PostJobWizard, CreateDealChat
//
// @backend Google Places (New) API — POST places.googleapis.com/v1/places:autocomplete
//          Key in GOOGLE_MAPS_API_KEY (lib/config.ts)
// @demo    Falls back silently on API failure — address can still be typed manually
//
// ─── S156: INLINE ABSOLUTE-SIBLING PATTERN ──────────────────────
// Dropdown is an `absolute`-positioned sibling View inside a `relative`
// wrapper. No Modal, no measure(), no onLayout, no Keyboard listener,
// no onBlur auto-close. This matches ClientLifestyleScreen which has
// been shipping successfully since S57.
//
// Why not Modal (the S155 approach):
//   Mounting a <Modal> while a sibling <TextInput> is focused causes
//   iOS to steal keyboard focus on every keystroke. Every character
//   felt like a submit. Dropdown never stayed visible.
//
// Why response.ok check is required:
//   Without it, Google 4xx/5xx errors parse as JSON, data.suggestions
//   is undefined, ?? [] gives empty, UI silently shows "No matches".
//   This masked the real root cause of BUG-001 across 6 fix attempts.
//   Build 46 added the check and the fix was immediate.
//
// See tasks/atlasio-bug-history.md BUG-001 attempts 1–7 for full history.
// ════════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { COLORS } from '../../lib/tokens';
import { GOOGLE_MAPS_API_KEY } from '../../lib/config';

// S151: surface missing API key in dev — silent failure masked Bug 2+4 during QA
if (__DEV__ && !GOOGLE_MAPS_API_KEY) {
  console.warn('[AddressAutocompleteInput] GOOGLE_MAPS_API_KEY is empty — autocomplete will fail silently');
}

interface PlaceSuggestion {
  placeId: string;
  description: string;
}

interface AddressAutocompleteInputProps {
  value: string;
  onSelect: (address: string) => void;
  /**
   * Optional — if provided, a Places Details call fires after a suggestion is
   * tapped and coords are returned alongside the description. On fetch error
   * or missing `location`, coords is `null` and the consumer decides how to
   * surface the error (never swallowed silently). Added S163 for ServiceArea
   * editor — `onSelect` is still always called first so existing consumers
   * (PostPhotoJob, PostStagingJob, EditProfile, CreateDealChat) are unaffected.
   */
  onSelectWithCoords?: (
    description: string,
    coords: { lat: number; lng: number } | null,
  ) => void;
  placeholder?: string;
  label?: string;
}

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onSelect,
  onSelectWithCoords,
  placeholder = 'Enter property address',
  label,
}) => {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AbortController guard — prevents stale fetch responses from overwriting fresh ones
  // when the user types faster than the network resolves.
  const fetchControllerRef = useRef<AbortController | null>(null);
  // Separate controller for the Places Details call — runs independently of
  // autocomplete fetch and gets aborted on unmount or a second suggestion tap.
  const detailsControllerRef = useRef<AbortController | null>(null);

  const fetchSuggestions = async (input: string) => {
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
    }
    const controller = new AbortController();
    fetchControllerRef.current = controller;

    setIsFetching(true);
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        },
        body: JSON.stringify({ input, includedRegionCodes: ['us'] }),
        signal: controller.signal,
      });

      // Critical: Google returns 4xx/5xx with a JSON error body. Without this check
      // the error parses cleanly, data.suggestions is undefined, ?? [] gives empty,
      // UI silently shows "No matches". This was the S151–S155 silent-failure trap.
      if (!response.ok) {
        const errorBody = await response.text();
        console.warn('[AddressAutocompleteInput] Places API non-OK', {
          status: response.status,
          body: errorBody.slice(0, 500),
        });
        if (!controller.signal.aborted) setSuggestions([]);
        return;
      }

      const data = await response.json();
      if (controller.signal.aborted) return;

      const mapped = (data.suggestions ?? [])
        .map((s: any) => ({
          placeId: s.placePrediction?.placeId ?? '',
          description: s.placePrediction?.text?.text ?? '',
        }))
        .filter((s: PlaceSuggestion) => s.placeId && s.description);
      setSuggestions(mapped);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.warn('[AddressAutocompleteInput] Places autocomplete threw', {
        name: err?.name,
        message: err?.message,
      });
      if (!controller.signal.aborted) setSuggestions([]);
    } finally {
      if (!controller.signal.aborted) setIsFetching(false);
    }
  };

  // S163 — Places Details fetch for lat/lng. Fields restricted to `location`
  // via X-Goog-FieldMask (tight budget + fewer permissions required).
  // Returns null on non-OK, missing location, or abort — caller decides UX.
  const fetchPlaceCoords = async (
    placeId: string,
  ): Promise<{ lat: number; lng: number } | null> => {
    if (detailsControllerRef.current) detailsControllerRef.current.abort();
    const controller = new AbortController();
    detailsControllerRef.current = controller;

    try {
      const response = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
        {
          method: 'GET',
          headers: {
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask': 'location',
          },
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        const errorBody = await response.text();
        console.warn('[AddressAutocompleteInput] Places Details non-OK', {
          status: response.status,
          body: errorBody.slice(0, 500),
        });
        return null;
      }
      const data = await response.json();
      if (controller.signal.aborted) return null;
      const lat = data?.location?.latitude;
      const lng = data?.location?.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number') {
        console.warn('[AddressAutocompleteInput] Places Details missing location', { data });
        return null;
      }
      return { lat, lng };
    } catch (err: any) {
      if (err?.name === 'AbortError') return null;
      console.warn('[AddressAutocompleteInput] Places Details threw', {
        name: err?.name,
        message: err?.message,
      });
      return null;
    }
  };

  const handleTextChange = (text: string) => {
    onSelect(text);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (text.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    setShowDropdown(true);
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 400);
  };

  const handleSuggestionSelect = async (suggestion: PlaceSuggestion) => {
    // onSelect always fires first — preserves existing consumer contract
    onSelect(suggestion.description);
    setSuggestions([]);
    setShowDropdown(false);

    // Note: onSelectWithCoords captured at call time. If parent re-renders with
    // a new callback reference during the Details fetch (100-500ms), the
    // originally-captured reference still fires. Usually fine — if weird edge
    // cases emerge, refactor to a ref pattern that tracks latest callback.
    //
    // S163 — opt-in coords callback. Error and "no location" both surface as
    // coords=null; caller (ServiceAreaEditor) renders an inline error state.
    if (onSelectWithCoords) {
      const coords = await fetchPlaceCoords(suggestion.placeId);
      onSelectWithCoords(suggestion.description, coords);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
      if (detailsControllerRef.current) detailsControllerRef.current.abort();
    };
  }, []);

  return (
    <View style={{ gap: label ? 8 : 0 }}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
          {label}
        </Text>
      )}
      <View style={{ position: 'relative', zIndex: 50 }}>
        <TextInput
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={COLORS.bodyText}
          returnKeyType="done"
          style={{
            backgroundColor: COLORS.inputBackground,
            borderWidth: 0.68,
            borderColor: value.length > 0 ? COLORS.inputActiveBorder : COLORS.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            fontWeight: '400',
            color: COLORS.darkText,
            lineHeight: 20,
          }}
        />
        {showDropdown && value.length >= 3 && (
          <View
            style={{
              position: 'absolute',
              top: 52,
              left: 0,
              right: 0,
              zIndex: 99,
              backgroundColor: COLORS.background,
              borderRadius: 10,
              borderWidth: 0.68,
              borderColor: COLORS.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 4,
              overflow: 'hidden',
            }}
          >
            {isFetching && suggestions.length === 0 ? (
              <View style={{ padding: 12, paddingHorizontal: 14 }}>
                <Text style={{ fontSize: 14, color: COLORS.lightText }}>Searching…</Text>
              </View>
            ) : suggestions.length === 0 ? (
              <View style={{ padding: 12, paddingHorizontal: 14 }}>
                <Text style={{ fontSize: 14, color: COLORS.lightText }}>No matches</Text>
              </View>
            ) : (
              suggestions.map((s) => (
                <Pressable
                  key={s.placeId}
                  onPress={() => handleSuggestionSelect(s)}
                  style={({ pressed }) => ({
                    padding: 12,
                    paddingHorizontal: 14,
                    backgroundColor: pressed ? COLORS.chipBg : COLORS.background,
                  })}
                >
                  <Text style={{ fontSize: 14, color: COLORS.darkText }} numberOfLines={1}>
                    {s.description}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        )}
      </View>
    </View>
  );
};

export default AddressAutocompleteInput;
