// InsuranceUploadScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Insurance Upload — Contractor COI upload flow
// Who: Contractors (from ProfileTab Z3 insurance CTA)
// Where: ProfileStack → InsuranceUpload (fullScreenModal)
//
// State flow:
//   idle (no doc) → documentSelected → submitting → success
//   Month/Year inputs track policy expiry date.
//   Submit enabled only when document is selected.
//
// @demo  Mock document selection + success state (no real picker)
// @backend expo-document-picker → Supabase credentials bucket
//          rpc_upload_insurance_document
//          params: { document_url: string, expiry_month: number, expiry_year: number }
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SHADOWS } from '../lib/tokens';
import { PrimaryButton } from './Button';

const CloseIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.secondaryText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const ShieldIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 24 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L3 7V12C3 16.4 7 20.6 12 22C17 20.6 21 16.4 21 12V7L12 2Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 12L11 14L15 10"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const UploadIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M12 18v-6M9 15l3-3 3 3"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FileSelectedIcon: React.FC = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke={COLORS.successGreen}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6"
      stroke={COLORS.successGreen}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 15l2 2 4-4"
      stroke={COLORS.successGreen}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const LargeShieldIcon: React.FC = () => (
  <Svg width={64} height={64} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L3 7V12C3 16.4 7 20.6 12 22C17 20.6 21 16.4 21 12V7L12 2Z"
      stroke={COLORS.successGreen}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="#F0FDF4"
    />
    <Path
      d="M9 12L11 14L15 10"
      stroke={COLORS.successGreen}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const InsuranceUploadScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // ── State ──
  // @demo — mock document selection, no real picker
  const [documentSelected, setDocumentSelected] = useState(false);
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ── Handlers ──

  const handleDocumentSelect = () => {
    // @demo — toggles mock file selected state
    // @backend expo-document-picker to select PDF/image,
    //          then upload to Supabase credentials bucket
    setDocumentSelected(!documentSelected);
  };

  const handleMonthChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
    setExpiryMonth(cleaned);
  };

  const handleYearChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
    setExpiryYear(cleaned);
  };

  const handleSubmit = async () => {
    // @demo — simulates upload delay then shows success
    // @backend rpc_upload_insurance_document
    //   params: { document_url: string, expiry_month: number, expiry_year: number }
    //   on success: sets insurance_status = 'pending_review'
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setSubmitting(false);
    setSubmitted(true);
  };

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
                  {/* @demo hardcoded filename — replace with real file name */}
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>
                    insurance_certificate.pdf
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.secondaryText }}>
                    Tap to replace
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
                    borderColor: COLORS.inputBorder,
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
                    borderColor: COLORS.inputBorder,
                    borderRadius: DIMENSIONS.inputRadius,
                    paddingHorizontal: 14,
                    fontSize: 15,
                    color: COLORS.darkText,
                    backgroundColor: COLORS.background,
                  }}
                />
              </View>
            </View>

            <Text style={{ fontSize: 14, color: COLORS.secondaryText }}>
              When does your current policy expire?
            </Text>
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
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default InsuranceUploadScreen;
