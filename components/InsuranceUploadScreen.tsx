// InsuranceUploadScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Insurance Upload — Contractor COI upload flow
// Who: Contractors (from VerificationScreen insurance section CTA)
// Where: ProfileStack → InsuranceUpload (fullScreenModal)
//
// State flow:
//   idle → documentSelected → submitting → success
//   selectedFile tracks real DocumentPicker result (uri, name, size, mimeType)
//   Month/Year inputs track policy expiry date with inline validation.
//   Submit enabled only when selectedFile is set.
//
// Feature flags:
//   LIVE_INSURANCE_HOOKS = false (@demo) → mock picker toggle + setTimeout success
//   LIVE_INSURANCE_HOOKS = true  → expo-document-picker → credentials bucket → RPC
//
// @demo  Mock document selection (LIVE_INSURANCE_HOOKS = false)
// @backend expo-document-picker → supabase.storage 'credentials' bucket
//          → rpc_upload_insurance_document
//          params: { document_url: string, expiry_month: number, expiry_year: number }
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SHADOWS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useUploadInsuranceDocument } from '../hooks/useData';
import { PrimaryButton } from './Button';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface SelectedFile {
  uri: string;
  name: string;
  size: number; // bytes
  mimeType: string;
}

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.secondaryText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShieldIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L3 7V12C3 16.4 7 20.6 12 22C17 20.6 21 16.4 21 12V7L12 2Z"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M9 12L11 14L15 10"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const UploadIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M12 18v-6M9 15l3-3 3 3"
      stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const FileSelectedIcon: React.FC = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke={COLORS.successGreen} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6"
      stroke={COLORS.successGreen} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M9 15l2 2 4-4"
      stroke={COLORS.successGreen} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const LargeShieldIcon: React.FC = () => (
  <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L3 7V12C3 16.4 7 20.6 12 22C17 20.6 21 16.4 21 12V7L12 2Z"
      stroke={COLORS.successGreen} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      fill="#F0FDF4"
    />
    <Path
      d="M9 12L11 14L15 10"
      stroke={COLORS.successGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const formatFileSize = (bytes: number): string => {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
//
// State:
//   selectedFile   — DocumentPicker result { uri, name, size, mimeType } or null
//   expiryMonth    — MM string input
//   expiryYear     — YYYY string input
//   submitting     — loading state during upload
//   submitted      — success state after upload
//   submitError    — inline error message below CTA (null = no error)
//   expiryError    — inline validation error for expiry fields
// ═══════════════════════════════════════════════════════════════

const InsuranceUploadScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const uploadMutation = useUploadInsuranceDocument();

  // ── State ──
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [expiryError, setExpiryError] = useState<string | null>(null);

  const documentSelected = selectedFile !== null;

  // ─────────────────────────────────────────────
  // DOCUMENT SELECT HANDLER
  // ─────────────────────────────────────────────

  const handleDocumentSelect = useCallback(async () => {
    if (FEATURE_FLAGS.LIVE_INSURANCE_HOOKS) {
      // @backend expo-document-picker → select PDF/image
      try {
        const DocumentPicker = require('expo-document-picker');
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
        });
        if (!result.canceled && result.assets && result.assets.length > 0) {
          const asset = result.assets[0];
          setSelectedFile({
            uri: asset.uri,
            name: asset.name,
            size: asset.size ?? 0,
            mimeType: asset.mimeType ?? 'application/pdf',
          });
        }
      } catch (err) {
        console.warn('[InsuranceUploadScreen] DocumentPicker error', err);
        Alert.alert('Error', 'Could not open document picker.');
      }
    } else {
      // @demo — toggle mock file selected state
      if (selectedFile) {
        setSelectedFile(null);
      } else {
        // @demo hardcoded — replace with real DocumentPicker result
        setSelectedFile({
          uri: 'file:///mock/insurance_certificate.pdf',
          name: 'insurance_certificate.pdf',
          size: 245760, // 240 KB
          mimeType: 'application/pdf',
        });
      }
    }
    setSubmitError(null);
  }, [selectedFile]);

  // ─────────────────────────────────────────────
  // INPUT HANDLERS
  // ─────────────────────────────────────────────

  const handleMonthChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
    setExpiryMonth(cleaned);
    setExpiryError(null);
  };

  const handleYearChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setExpiryYear(cleaned);
    setExpiryError(null);
  };

  // ─────────────────────────────────────────────
  // SUBMIT HANDLER
  // ─────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!selectedFile) return;

    // Validate expiry
    const month = parseInt(expiryMonth, 10);
    const year = parseInt(expiryYear, 10);
    const currentYear = new Date().getFullYear();

    if (!expiryMonth || isNaN(month) || month < 1 || month > 12) {
      setExpiryError('Enter a valid month (01–12)');
      return;
    }
    if (!expiryYear || isNaN(year) || expiryYear.length !== 4 || year < currentYear) {
      setExpiryError(`Enter a valid year (${currentYear} or later)`);
      return;
    }

    setExpiryError(null);
    setSubmitError(null);
    setSubmitting(true);

    try {
      if (FEATURE_FLAGS.LIVE_INSURANCE_HOOKS) {
        // @backend rpc_upload_insurance_document
        //   params: { p_document_url, p_expiry_month, p_expiry_year }
        const result = await uploadMutation.mutateAsync({
          fileUri: selectedFile.uri,
          fileName: selectedFile.name,
          mimeType: selectedFile.mimeType,
          expiryMonth: month,
          expiryYear: year,
        });
        if (!result.success) {
          setSubmitError(result.message);
          return;
        }
      } else {
        // @demo — simulates upload delay then shows success
        console.log('[InsuranceUploadScreen] handleSubmit (mock)', {
          file: selectedFile.name,
          expiryMonth: month,
          expiryYear: year,
        });
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
      setSubmitted(true);
    } catch {
      setSubmitError('Failed to upload insurance document. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedFile, expiryMonth, expiryYear, uploadMutation]);

  // ─────────────────────────────────────────────
  // NAVIGATION
  // ─────────────────────────────────────────────

  const handleBackToProfile = () => {
    // @backend navigate back to ProfileTab or VerificationScreen
    navigation.navigate('ProfileMain');
  };

  // ── Success State ──
  if (submitted) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: insets.top }}>
        <StatusBar barStyle="dark-content" />
        <View style={{
          flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 16,
          borderBottomWidth: 0.68, borderBottomColor: COLORS.border, backgroundColor: COLORS.background,
        }}>
          <View style={{ width: 44 }} />
          <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.primary, textAlign: 'center' }}>
            Insurance Upload
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <CloseIcon />
          </Pressable>
        </View>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
            gap: 16,
          }}
        >
          <LargeShieldIcon />
          <Text
            style={{
              fontSize: 20,
              fontWeight: '700',
              color: COLORS.darkText,
              textAlign: 'center',
              marginTop: 8,
            }}
          >
            Submitted for Review
          </Text>
          <Text
            style={{
              ...TYPOGRAPHY.bodyM,
              color: COLORS.secondaryText,
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            We'll review your insurance certificate and notify you within 24-48 hours.
          </Text>
          <View style={{ width: '100%', marginTop: 16 }}>
            <PrimaryButton label="Back to Profile" onPress={handleBackToProfile} />
          </View>
        </View>
      </View>
    );
  }

  // ── Main Upload Form ──
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />
      <View style={{
        flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 16,
        borderBottomWidth: 0.68, borderBottomColor: COLORS.border, backgroundColor: COLORS.background,
      }}>
        <View style={{ width: 44 }} />
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.primary, textAlign: 'center' }}>
          Insurance Upload
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={({ pressed }) => ({
            width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <CloseIcon />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ backgroundColor: COLORS.screenBg }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 120,
            gap: 20,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ──────────────────────────────────────
              SECTION 1 — Info Card
              ────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: COLORS.backgroundInfo,
              borderRadius: 12,
              borderLeftWidth: 4,
              borderLeftColor: COLORS.primary,
              padding: 16,
              flexDirection: 'row',
              gap: 12,
            }}
          >
            <View style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <ShieldIcon color={COLORS.primary} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText }}>
                Certificate of Insurance
              </Text>
              <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, lineHeight: 20 }}>
                Upload your COI to earn the Insured badge on your profile. Verified contractors rank higher in search.
              </Text>
            </View>
          </View>

          {/* ──────────────────────────────────────
              SECTION 2 — Document Upload
              ────────────────────────────────────── */}
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: COLORS.secondaryText,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 2,
              }}
            >
              Upload Document
            </Text>

            <Pressable
              onPress={handleDocumentSelect}
              style={({ pressed }) => ({
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: COLORS.cardBorder,
                borderRadius: 12,
                padding: 24,
                alignItems: 'center',
                backgroundColor: COLORS.filterBg,
                opacity: pressed ? 0.85 : 1,
                gap: 8,
              })}
            >
              {!documentSelected ? (
                <>
                  <UploadIcon color={COLORS.lightText} />
                  <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.darkText, marginTop: 4 }}>
                    Tap to upload your COI
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.secondaryText }}>
                    PDF, JPG, or PNG · Max 10MB
                  </Text>
                </>
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <FileSelectedIcon />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>
                    {selectedFile!.name}
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.secondaryText }}>
                    {formatFileSize(selectedFile!.size)} · Tap to replace
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ──────────────────────────────────────
              SECTION 3 — Expiry Date
              ────────────────────────────────────── */}
          <View style={{ gap: 10 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: COLORS.secondaryText,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 2,
              }}
            >
              Policy Expiry Date
            </Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={expiryMonth}
                  onChangeText={handleMonthChange}
                  placeholder="MM"
                  placeholderTextColor={COLORS.lightText}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={{
                    height: DIMENSIONS.formInputHeight,
                    borderWidth: 1,
                    borderColor: expiryError ? COLORS.errorRed : COLORS.inputBorder,
                    borderRadius: DIMENSIONS.inputRadius,
                    paddingHorizontal: 14,
                    fontSize: 15,
                    color: COLORS.darkText,
                    backgroundColor: COLORS.background,
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={expiryYear}
                  onChangeText={handleYearChange}
                  placeholder="YYYY"
                  placeholderTextColor={COLORS.lightText}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={{
                    height: DIMENSIONS.formInputHeight,
                    borderWidth: 1,
                    borderColor: expiryError ? COLORS.errorRed : COLORS.inputBorder,
                    borderRadius: DIMENSIONS.inputRadius,
                    paddingHorizontal: 14,
                    fontSize: 15,
                    color: COLORS.darkText,
                    backgroundColor: COLORS.background,
                  }}
                />
              </View>
            </View>

            {expiryError ? (
              <Text style={{ fontSize: 14, color: COLORS.errorRed }}>
                {expiryError}
              </Text>
            ) : (
              <Text style={{ fontSize: 14, color: COLORS.secondaryText }}>
                When does your current policy expire?
              </Text>
            )}
          </View>

          {/* ──────────────────────────────────────
              SECTION 4 — What happens next
              ────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: COLORS.background,
              borderRadius: DIMENSIONS.cardRadius,
              borderWidth: DIMENSIONS.cardBorderWidth,
              borderColor: COLORS.cardBorder,
              ...SHADOWS.card,
              padding: 16,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: COLORS.darkText,
                marginBottom: 8,
              }}
            >
              What happens next?
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: COLORS.secondaryText,
                lineHeight: 20,
              }}
            >
              After uploading, our team reviews your document within 24-48 hours.
              You'll receive a notification when approved.
            </Text>
          </View>
        </ScrollView>

        {/* ──────────────────────────────────────
            STICKY BOTTOM CTA
            ────────────────────────────────────── */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: COLORS.background,
            borderTopWidth: DIMENSIONS.headerBorderWidth,
            borderTopColor: COLORS.border,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: insets.bottom + 16,
          }}
        >
          <PrimaryButton
            label={submitting ? 'Submitting...' : 'Submit for Review'}
            onPress={handleSubmit}
            disabled={!documentSelected}
            loading={submitting}
          />
          {submitError && (
            <Text style={{ fontSize: 14, color: COLORS.errorRed, textAlign: 'center', marginTop: 8 }}>
              {submitError}
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default InsuranceUploadScreen;
