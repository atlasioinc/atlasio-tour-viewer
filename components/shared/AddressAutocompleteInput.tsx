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
  placeholder?: string;
  label?: string;
}

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onSelect,
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

  const handleSuggestionSelect = (description: string) => {
    onSelect(description);
    setSuggestions([]);
    setShowDropdown(false);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (fetchControllerRef.current) fetchControllerRef.current.abort();
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
                  onPress={() => handleSuggestionSelect(s.description)}
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
