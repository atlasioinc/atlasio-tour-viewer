// SelectableChip.tsx
// ═══════════════════════════════════════════════════════════════
// Shared Selectable Chip + ChipGroup — Single source of truth
//
// Matches PostPhotoJobScreen turnaround preference pill pattern:
//   - Padding: 16px horizontal, 9px vertical
//   - Border: borderRadius 9999 (full round)
//   - Active: solid #003DC3 bg, no border, white text (13/600)
//   - Inactive: white bg, 0.68px #E5E7EB border, bodyText (13/400)
//   - No checkmark icon — clean pill style
//
// Variants:
//   - SelectableChip: individual pill with active/inactive/disabled states
//   - ChipGroup: wrapping row with multi-select + optional max
//   - SingleSelectChipGroup: wrapping row with radio behavior
//
// Usage:
//   <ChipGroup
//     options={['English', 'Spanish', 'Mandarin']}
//     selected={form.languages}
//     onToggle={(option) => toggleArrayField('languages', option)}
//   />
//
//   <SingleSelectChipGroup
//     options={TRADE_OPTIONS}
//     selected={form.primaryTrade}
//     onSelect={(trade) => updateField('primaryTrade', trade)}
//     error={errors.primaryTrade}
//   />
//
// Screens using this pattern:
//   PostPhotoJobScreen (turnaround), PostStagingJobScreen,
//   EditProfileScreen (languages, specialties, trades)
//
// TODO: Migrate PostPhotoJobScreen and PostStagingJobScreen to use
//       these shared components (drop-in replacement)
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// INDIVIDUAL CHIP
// ─────────────────────────────────────────────

export interface SelectableChipProps {
  /** Chip label text */
  label: string;
  /** Whether this chip is currently selected */
  isActive: boolean;
  /** Tap handler */
  onPress: () => void;
  /** Visually disabled (reduced opacity, non-interactive) */
  disabled?: boolean;
}

export const SelectableChip: React.FC<SelectableChipProps> = ({
  label,
  isActive,
  onPress,
  disabled = false,
}) => (
  <Pressable
    onPress={() => !disabled && onPress()}
    style={({ pressed }) => ({
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 9999,
      backgroundColor: isActive ? COLORS.primary : COLORS.background,
      borderWidth: isActive ? 0 : 0.68,
      borderColor: isActive ? 'transparent' : COLORS.border,
      opacity: disabled ? 0.35 : pressed ? 0.85 : 1,
    })}
  >
    <Text
      style={{
        fontSize: 13,
        fontWeight: isActive ? '600' : '400',
        color: isActive ? '#FFFFFF' : COLORS.bodyText,
        lineHeight: 18,
      }}
    >
      {label}
    </Text>
  </Pressable>
);

// ─────────────────────────────────────────────
// MULTI-SELECT CHIP GROUP
// ─────────────────────────────────────────────

export interface ChipGroupProps {
  /** Array of option labels */
  options: string[];
  /** Currently selected options */
  selected: string[];
  /** Toggle handler — called with the option label */
  onToggle: (option: string) => void;
  /** Maximum number of selections (undefined = unlimited) */
  maxSelect?: number;
  /** Error message displayed below chips */
  error?: string;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({
  options,
  selected,
  onToggle,
  maxSelect,
  error,
}) => (
  <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => {
        const isActive = selected.includes(option);
        const isDisabled = !isActive && maxSelect !== undefined && selected.length >= maxSelect;
        return (
          <SelectableChip
            key={option}
            label={option}
            isActive={isActive}
            onPress={() => onToggle(option)}
            disabled={isDisabled}
          />
        );
      })}
    </View>
    {error && (
      <Text style={{ fontSize: 12, fontWeight: '400', color: '#FB2C36', lineHeight: 16 }}>
        {error}
      </Text>
    )}
  </View>
);

// ─────────────────────────────────────────────
// SINGLE-SELECT CHIP GROUP (radio behavior)
// ─────────────────────────────────────────────

export interface SingleSelectChipGroupProps {
  /** Array of option labels */
  options: string[];
  /** Currently selected option (empty string = none) */
  selected: string;
  /** Select handler — called with the option label */
  onSelect: (option: string) => void;
  /** Error message displayed below chips */
  error?: string;
}

export const SingleSelectChipGroup: React.FC<SingleSelectChipGroupProps> = ({
  options,
  selected,
  onSelect,
  error,
}) => (
  <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((option) => (
        <SelectableChip
          key={option}
          label={option}
          isActive={selected === option}
          onPress={() => onSelect(option)}
        />
      ))}
    </View>
    {error && (
      <Text style={{ fontSize: 12, fontWeight: '400', color: '#FB2C36', lineHeight: 16 }}>
        {error}
      </Text>
    )}
  </View>
);

export default SelectableChip;
