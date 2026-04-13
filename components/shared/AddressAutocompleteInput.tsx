// ═══════════════════════════════════════════════════════════════
// components/shared/AddressAutocompleteInput.tsx
// What:  Reusable Google Places address autocomplete input with dropdown
// Who:   All roles — used in job posting flows
// Where: Shared component — PostPhotoJobScreen, PostStagingJobScreen, PostJobWizard
//
// @backend Google Places (New) API — POST places.googleapis.com/v1/places:autocomplete
//          Key in GOOGLE_MAPS_API_KEY (lib/config.ts)
// @demo    Falls back silently on API failure — address can still be typed manually
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, SHADOWS } from '../../lib/tokens';
import { GOOGLE_MAPS_API_KEY } from '../../lib/config';

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
    // Clear committed parent value while typing — forces re-selection
    if (value.length > 0) onSelect('');

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

  return (
    <View style={{ gap: label ? 8 : 0 }}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
          {label}
        </Text>
      )}
      <View style={{ position: 'relative', zIndex: 99 }}>
        <TextInput
          value={addressQuery}
          onChangeText={handleTextChange}
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

        {showAutocomplete && suggestions.length > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 52,
              left: 0,
              right: 0,
              zIndex: 99,
              backgroundColor: COLORS.background,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.border,
              ...SHADOWS.card,
            }}
          >
            {suggestions.map((s) => (
              <Pressable
                key={s.placeId}
                onPress={() => handleSuggestionSelect(s.description)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  padding: 12,
                  paddingHorizontal: 14,
                }}
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
