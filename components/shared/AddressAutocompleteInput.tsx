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
// ─── S154: DROPDOWN PATTERN ─────────────────────────────────────
// Inline absolute dropdown, zIndex:99, sibling of TextInput inside a
// position:relative wrapper. Mirrors the working pattern in
// ClientLifestyleScreen.tsx. Do NOT switch back to a React Native Modal
// overlay with measureInWindow — that path raced on first focus and
// never settled. See tasks/bug-history.md BUG-001.
//
// Consumers must give their outer ScrollView enough paddingBottom to
// render the 240px max-height dropdown without clipping when the field
// is near the bottom of the form (all 4 consumers verified S154).
// ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, SHADOWS } from '../../lib/tokens';
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

const PinIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 1.33C5.42 1.33 3.33 3.42 3.33 6C3.33 9.5 8 14.67 8 14.67C8 14.67 12.67 9.5 12.67 6C12.67 3.42 10.58 1.33 8 1.33Z"
      stroke={COLORS.bodyText}
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export const AddressAutocompleteInput: React.FC<AddressAutocompleteInputProps> = ({
  value,
  onSelect,
  placeholder = 'Enter property address',
  label,
}) => {
  const [addressQuery, setAddressQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for loading indicator
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local query in sync if parent resets value (e.g. form clear)
  useEffect(() => {
    if (value !== addressQuery && value === '') {
      setAddressQuery('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    return () => {
      if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);
    };
  }, []);

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
      const mapped = (data.suggestions ?? [])
        .map((s: any) => ({
          placeId: s.placePrediction?.placeId ?? '',
          description: s.placePrediction?.text?.text ?? '',
        }))
        .filter((s: PlaceSuggestion) => s.placeId && s.description);
      setSuggestions(mapped);
    } catch {
      console.warn('[AddressAutocompleteInput] Autocomplete failed');
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const handleTextChange = (text: string) => {
    setAddressQuery(text);
    // S152 Bug 2: do NOT clear parent value on keystroke. Parent commit
    // happens onBlur (below) so partial strings never pass validation, but
    // edit-after-select also no longer silently wipes parent state.

    if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);

    if (text.length < 3) {
      setSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    setShowAutocomplete(true);
    autocompleteTimerRef.current = setTimeout(() => {
      fetchAutocompleteSuggestions(text);
    }, 400);
  };

  const handleSuggestionSelect = (description: string) => {
    setAddressQuery(description);
    onSelect(description);
    setSuggestions([]);
    setShowAutocomplete(false);
  };

  const dropdownVisible = showAutocomplete && suggestions.length > 0;

  return (
    <View style={{ gap: label ? 8 : 0 }}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
          {label}
        </Text>
      )}
      <View style={{ position: 'relative' }}>
        <TextInput
          value={addressQuery}
          onChangeText={handleTextChange}
          onBlur={() => {
            // S152 Bug 2: commit typed text to parent on blur so form
            // validation sees the value even when the user doesn't pick a
            // dropdown suggestion (iOS QuickType / autofill / Places API
            // failure / manual entry). Selection still wins via
            // handleSuggestionSelect → onSelect(description).
            if (addressQuery.trim().length > 0 && addressQuery !== value) {
              onSelect(addressQuery);
            }
          }}
          placeholder={placeholder}
          placeholderTextColor={COLORS.bodyText}
          style={{
            backgroundColor: COLORS.inputBackground,
            borderWidth: 0.68,
            borderColor: addressQuery.length > 0 ? COLORS.inputActiveBorder : COLORS.border,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            fontSize: 15,
            fontWeight: '400',
            color: COLORS.darkText,
            lineHeight: 20,
          }}
        />

        {/* S154: inline absolute dropdown — sibling of TextInput inside a
            position:relative wrapper. Mirrors ClientLifestyleScreen pattern.
            `top` anchors just below the 44-ish input height. */}
        {dropdownVisible && (
          <View
            style={{
              position: 'absolute',
              top: 52,
              left: 0,
              right: 0,
              zIndex: 99,
              maxHeight: 240,
              backgroundColor: COLORS.background,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.border,
              ...SHADOWS.card,
              overflow: 'hidden',
            }}
          >
            {suggestions.map((s) => (
              <Pressable
                key={s.placeId}
                onPress={() => handleSuggestionSelect(s.description)}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  padding: 12,
                  paddingHorizontal: 14,
                  backgroundColor: pressed ? COLORS.screenBg : COLORS.background,
                })}
              >
                <PinIcon />
                <Text
                  style={{ fontSize: 14, color: COLORS.darkText, flex: 1 }}
                  numberOfLines={1}
                >
                  {s.description}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

export default AddressAutocompleteInput;
