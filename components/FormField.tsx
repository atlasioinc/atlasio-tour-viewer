// What: Reusable labeled text input — single source of truth for all label+input fields
// Who: All roles (job posting, onboarding, edit flows, verification)
// Where: Used app-wide — import from components/FormField.tsx
// Design: Matches Photo/Staging job pattern (S69 standardisation)
// Token deps: COLORS.inputBackground, COLORS.inputActiveBorder, COLORS.border,
//             COLORS.darkText, COLORS.bodyText
// ═══════════════════════════════════════════════════════════════
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
//   // With prefix (e.g. budget fields):
//   <FormField label="Min" value={min} onChangeText={setMin} prefix="$" keyboardType="numeric" />
//
// Screens using this component:
//   PostJobWizard, EditRepairJob, PostPhotoJobScreen, PostStagingJobScreen,
//   EditProfileScreen, AgentDealDetailScreen, VerificationScreen, LoginScreen
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
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
  /** Enable multiline mode — auto-expands, min 80px height */
  multiline?: boolean;
  /** Max character count — shows counter in label row */
  maxLength?: number;
  /** Disable editing (read-only display) */
  editable?: boolean;
  /** Keyboard type */
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  /** Optional icon component to render before label */
  labelIcon?: React.ReactNode;
  /** Inline prefix rendered before the TextInput (e.g. "$") */
  prefix?: string;
  /** Auto-capitalize mode */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Disable auto-correct */
  autoCorrect?: boolean;
  /** Secure text entry (passwords) */
  secureTextEntry?: boolean;
  /** Text alignment inside the input (e.g. 'center' for budget fields) */
  textAlign?: 'left' | 'center' | 'right';
  /** Optional placeholder text color override. Defaults to COLORS.bodyText. */
  placeholderTextColor?: string;
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
  prefix,
  autoCapitalize,
  autoCorrect,
  secureTextEntry,
  textAlign,
  placeholderTextColor,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasError = !!error;

  return (
    <View style={{ gap: label ? 8 : 0 }}>
      {/* Label row — skipped when label is empty (e.g. inline budget min/max fields) */}
      {label ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {labelIcon}
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
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
      ) : null}

      {/* Input container */}
      <View
        style={{
          ...(multiline
            ? { minHeight: 80, paddingVertical: 12 }
            : { paddingVertical: 12 }),
          paddingHorizontal: 14,
          backgroundColor: COLORS.inputBackground,
          borderRadius: 10,
          borderWidth: 0.68,
          borderColor: hasError
            ? '#FB2C36'
            : (isFocused || value.length > 0)
              ? COLORS.inputActiveBorder
              : COLORS.border,
          ...(prefix ? { flexDirection: 'row' as const, alignItems: 'center' as const } : {}),
        }}
      >
        {prefix && (
          <Text style={{ fontSize: 15, fontWeight: '400', color: COLORS.darkText, lineHeight: 20, marginRight: 4 }}>
            {prefix}
          </Text>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor ?? COLORS.bodyText}
          style={{
            flex: prefix ? 1 : undefined,
            fontSize: 15,
            fontWeight: '400',
            color: editable ? COLORS.darkText : COLORS.secondaryText,
            lineHeight: 20,
            ...(multiline ? { textAlignVertical: 'top' as const } : {}),
            ...(prefix ? { paddingVertical: 0 } : {}),
            ...(textAlign ? { textAlign } : {}),
          }}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          multiline={multiline}
          maxLength={maxLength}
          editable={editable}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry}
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
