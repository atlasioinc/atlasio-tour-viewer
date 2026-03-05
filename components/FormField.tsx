// FormField.tsx
// ═══════════════════════════════════════════════════════════════
// Shared Form Input — Single source of truth for text inputs (163 lines)
//
// Matches PostJobWizard pattern:
//   - Height: 50px (single-line), auto-expand (multiline)
//   - Border: 1.35px, borderRadius 14, #D1D5DC default / #FB2C36 error
//   - Background: #FFFFFF
//   - Label: 14/500/#364153, required asterisk in red
//   - Placeholder: rgba(10,10,10,0.5)
//   - Text: 16/400/#0A0A0A
//   - Error text: 12/400/#FB2C36
//   - Helper text: 12/400/#999999
//
// Usage:
//   <FormField
//     label="Job Title"
//     value={form.jobTitle}
//     onChangeText={(t) => updateField('jobTitle', t)}
//     placeholder="e.g., Kitchen Reno"
//     required
//     error={errors.jobTitle}
//   />
//
// Screens using this pattern:
//   PostJobWizard, EditRepairJob, PostPhotoJobScreen,
//   PostStagingJobScreen, EditProfileScreen
//
// TODO: Migrate PostJobWizard and other screens to use this component
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────

export interface FormFieldProps {
  /** Field label displayed above the input */
  label: string;
  /** Current value */
  value: string;
  /** Value change handler */
  onChangeText: (text: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Show red asterisk on label */
  required?: boolean;
  /** Error message — also turns border red */
  error?: string;
  /** Helper text below the input (e.g., "Helps pros estimate travel time") */
  helperText?: string;
  /** Enable multiline mode — auto-expands, min 146px height */
  multiline?: boolean;
  /** Max character count — shows counter in label row */
  maxLength?: number;
  /** Disable editing (read-only display) */
  editable?: boolean;
  /** Keyboard type */
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  /** Optional icon component to render before label */
  labelIcon?: React.ReactNode;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  error,
  helperText,
  multiline = false,
  maxLength,
  editable = true,
  keyboardType = 'default',
  labelIcon,
}) => {
  const hasError = !!error;

  return (
    <View style={{ gap: 8 }}>
      {/* Label row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {labelIcon}
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>
            {label}
            {required && <Text style={{ color: '#FB2C36' }}> *</Text>}
          </Text>
        </View>
        {maxLength !== undefined && (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '400',
              color: value.length > maxLength * 0.9 ? '#FB2C36' : '#999999',
              lineHeight: 16,
            }}
          >
            {value.length}/{maxLength}
          </Text>
        )}
      </View>

      {/* Input container */}
      <View
        style={{
          minHeight: multiline ? 146 : 50,
          paddingHorizontal: 16,
          paddingVertical: multiline ? 8 : 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 14,
          borderWidth: 1.35,
          borderColor: hasError ? '#FB2C36' : COLORS.inputBorder,
          justifyContent: multiline ? 'flex-start' : 'center',
          overflow: 'hidden',
        }}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(10, 10, 10, 0.5)"
          style={{
            flex: multiline ? undefined : 1,
            fontSize: 16,
            fontWeight: '400',
            color: editable ? '#0A0A0A' : COLORS.secondaryText,
            lineHeight: multiline ? 24 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
          keyboardType={keyboardType}
        />
      </View>

      {/* Error text */}
      {hasError && (
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#FB2C36', lineHeight: 16 }}>
          {error}
        </Text>
      )}

      {/* Helper text */}
      {helperText && !hasError && (
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#999999', lineHeight: 16 }}>
          {helperText}
        </Text>
      )}
    </View>
  );
};

export default FormField;
