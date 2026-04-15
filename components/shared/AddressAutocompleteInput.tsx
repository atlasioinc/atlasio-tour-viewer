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
// ─── S155: DROPDOWN PATTERN ─────────────────────────────────────
// Screen-level transparent <Modal> overlay positioned via coordinates
// captured from `measure()` (NOT measureInWindow) called inside the
// wrapper's `onLayout` callback. This is the ONLY reliable path on iOS
// when the input lives inside a ScrollView.
//
// Why not measureInWindow:
//   measureInWindow is async and returns {0,0,0,0} before the ScrollView
//   has committed its layout. measure() called from onLayout returns
//   coordinates relative to the root view at a point where layout is
//   already stable. See tasks/atlasio-bug-history.md BUG-001 attempts
//   1–3 for full history. measureInWindow is PERMANENTLY BANNED here.
//
// Why not absolute-in-ScrollView (S146/S154):
//   iOS ScrollView clips or paints under absolute children regardless
//   of zIndex. Platform constraint — not a styling issue.
// ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet, Keyboard } from 'react-native';
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
  const [dropdownLayout, setDropdownLayout] = useState<{ x: number; y: number; width: number } | null>(null);
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<View>(null);

  // S155: measure() (root-relative coords) from onLayout/focus/keyboard.
  // Do NOT substitute measureInWindow — it returns 0,0,0,0 inside ScrollViews.
  const measureWrapper = () => {
    wrapperRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      if (width > 0) {
        setDropdownLayout({ x: pageX, y: pageY + height + 4, width });
      }
    });
  };

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', measureWrapper);
    return () => sub.remove();
  }, []);

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

  return (
    <View style={{ gap: label ? 8 : 0 }}>
      {label && (
        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
          {label}
        </Text>
      )}
      <View ref={wrapperRef} onLayout={measureWrapper}>
        <TextInput
          value={addressQuery}
          onChangeText={handleTextChange}
          onFocus={measureWrapper}
          onBlur={() => {
            // S152 Bug 2: commit typed text to parent on blur so form
            // validation sees the value even when the user doesn't pick a
            // dropdown suggestion (iOS QuickType / autofill / Places API
            // failure / manual entry). Selection still wins via
            // handleSuggestionSelect → onSelect(description).
            if (addressQuery.trim().length > 0 && addressQuery !== value) {
              onSelect(addressQuery);
            }
            setShowAutocomplete(false);
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
      </View>

      {/* S155: screen-level Modal — renders at root view, positioned via
          pageX/pageY captured through measure() in onLayout. See header. */}
      <Modal
        visible={showAutocomplete && dropdownLayout !== null}
        transparent
        animationType="none"
        onRequestClose={() => setShowAutocomplete(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShowAutocomplete(false)}
        >
          {suggestions.length > 0 && dropdownLayout && (
            <View
              style={{
                position: 'absolute',
                top: dropdownLayout.y,
                left: dropdownLayout.x,
                width: dropdownLayout.width,
                backgroundColor: COLORS.background,
                borderRadius: 12,
                borderWidth: 0.68,
                borderColor: COLORS.cardBorder,
                ...SHADOWS.card,
                maxHeight: 240,
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
        </Pressable>
      </Modal>
    </View>
  );
};

export default AddressAutocompleteInput;
