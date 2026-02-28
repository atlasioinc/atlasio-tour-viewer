// SearchField.tsx
// ═══════════════════════════════════════════════════════════════
// Shared Search Field — Atlasio
// Reusable search input used across Find Tab, Network Tab, etc.
// Flex-fills horizontally, consistent height/padding everywhere.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, TextInput, Pressable, Text } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const SEARCH_HEIGHT = 44;
const HORIZONTAL_PADDING = 12;
const ICON_GAP = 8;
const BORDER_RADIUS = 9999;
const BORDER_WIDTH = 0.69;
const FONT_SIZE = 14;


// ─────────────────────────────────────────────
// SEARCH ICON
// ─────────────────────────────────────────────

const SearchIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={9.17} cy={9.17} r={6.67} stroke={COLORS.lightText} strokeWidth={1.67} />
    <Path d="M14.17 14.17L17.5 17.5" stroke={COLORS.lightText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder = 'Search…',
}) => (
  <View
    style={{
      flex: 1,
      height: SEARCH_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: HORIZONTAL_PADDING,
      backgroundColor: COLORS.background,
      borderRadius: BORDER_RADIUS,
      borderWidth: BORDER_WIDTH,
      borderColor: COLORS.inputBorder,
      gap: ICON_GAP,
    }}
  >
    <SearchIcon />
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.placeholderText}
      style={{
        flex: 1,
        height: SEARCH_HEIGHT,
        fontSize: FONT_SIZE,
        fontWeight: '400',
        color: COLORS.darkText,
        paddingVertical: 0,
        textAlignVertical: 'center',
        includeFontPadding: false,
      }}
    />
    {value.length > 0 && (
      <Pressable onPress={() => onChangeText('')} hitSlop={8}>
        <Text style={{ fontSize: 16, color: COLORS.lightText }}>✕</Text>
      </Pressable>
    )}
  </View>
);

export default SearchField;
