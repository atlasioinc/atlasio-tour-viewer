// VerificationScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Profile Verification — Phone OTP, License, Insurance
// fullScreenModal in ProfileStack (slide_from_bottom)
// Safe area: useSafeAreaInsets() + manual padding (Dynamic Island)
//
// Verification tiers:
//   none → basic (phone verified) → verified (+ license) → fully_verified (+ insurance)
//
// Deferred integrations:
//   - ARELLO API for license verification (saves locally, shows "Pending")
//   - Insurance upload to Supabase Storage (mock flow)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView, StatusBar, TextInput,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import { useMyProfile, useUpdateProfile } from '../hooks/useData';
import type { ProfileStackParamList } from './ProfileStack';

type NavProp = NativeStackNavigationProp<ProfileStackParamList>;

// ─────────────────────────────────────────────
// ICONS (inline SVG)
// ─────────────────────────────────────────────

const PhoneIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const ShieldIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.25C16.6 21.15 20 16.25 20 11V6l-8-4z"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const FileIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
    <Path
      d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const CheckCircleIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke={COLORS.successGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 4L12 14.01l-3-3" stroke={COLORS.successGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CloseIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PendingIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke={COLORS.counterAmber} strokeWidth={2} />
    <Path d="M12 6v6l4 2" stroke={COLORS.counterAmber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// SECTION CARD
// ─────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: 'incomplete' | 'pending' | 'complete';
  ctaLabel: string;
  onPress: () => void;
  children?: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({
  icon, title, description, status, ctaLabel, onPress, children,
}) => (
  <View style={{
    backgroundColor: COLORS.background, borderRadius: 14,
    borderWidth: 0.68, borderColor: COLORS.cardBorder, padding: 16, gap: 12,
  }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: status === 'complete' ? '#ECFDF5' : status === 'pending' ? '#FFF8E1' : COLORS.tagBg,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}>{title}</Text>
          {status === 'complete' && <CheckCircleIcon />}
          {status === 'pending' && <PendingIcon />}
        </View>
        <Text style={{ fontSize: 13, color: COLORS.bodyText, marginTop: 2 }}>{description}</Text>
      </View>
    </View>
    {children}
    {status === 'incomplete' && !children && (
      <Pressable onPress={onPress} style={{
        backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center',
      }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>{ctaLabel}</Text>
      </Pressable>
    )}
  </View>
);

// ═══════════════════════════════════════════════════════════════
// VERIFICATION SCREEN
// ═══════════════════════════════════════════════════════════════

const VerificationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { data: profile, refetch, isRefetching } = useMyProfile();
  const updateProfile = useUpdateProfile();

  // License form state
  const [licenseNumber, setLicenseNumber] = useState(profile?.license_number ?? '');
  const [licenseState, setLicenseState] = useState(profile?.license_state ?? 'CO');
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [insuranceUploading, setInsuranceUploading] = useState(false);

  const phoneVerified = profile?.phone_verified ?? false;
  const licenseVerified = profile?.license_verified ?? false;
  const hasLicenseNumber = !!(profile?.license_number);
  const insuranceUploaded = profile?.insurance_uploaded ?? false;
  const role = profile?.role ?? 'agent';

  // Progress: phone + license (number present counts) + insurance
  const progressSteps = [
    phoneVerified,
    licenseVerified || hasLicenseNumber,
    insuranceUploaded,
  ];

  const handleSaveLicense = useCallback(async () => {
    if (!licenseNumber.trim()) {
      Alert.alert('License Number Required', 'Please enter your license number.');
      return;
    }
    setLicenseSaving(true);
    try {
      await updateProfile.mutateAsync({
        license_number: licenseNumber.trim(),
        license_state: licenseState,
      });
      Alert.alert('License Saved', 'Your license number has been saved. Verification is pending.');
    } catch {
      Alert.alert('Error', 'Failed to save license number. Please try again.');
    } finally {
      setLicenseSaving(false);
    }
  }, [licenseNumber, licenseState, updateProfile]);

  const handleUploadInsurance = useCallback(async () => {
    // TODO: PRODUCTION — wire to document picker + Supabase Storage upload to credentials bucket
    // For now: mock success after simulated delay
    setInsuranceUploading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await updateProfile.mutateAsync({ insurance_uploaded: true });
      Alert.alert('Insurance Uploaded', 'Your insurance documentation has been saved.');
    } catch {
      Alert.alert('Error', 'Failed to upload insurance. Please try again.');
    } finally {
      setInsuranceUploading(false);
    }
  }, [updateProfile]);

  const licenseStatus = licenseVerified ? 'complete' : hasLicenseNumber ? 'pending' : 'incomplete';

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.screenBg, paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.background,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.darkText }}>Verification</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* Progress summary */}
        <View style={{
          backgroundColor: COLORS.background, borderRadius: 14,
          borderWidth: 0.68, borderColor: COLORS.cardBorder, padding: 16,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}>
            Verification Progress
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.bodyText, marginTop: 4 }}>
            {profile?.verification_level === 'fully_verified'
              ? 'Your profile is fully verified.'
              : profile?.verification_level === 'verified'
                ? 'Almost there! Upload insurance to complete verification.'
                : profile?.verification_level === 'basic'
                  ? 'Phone verified. Add your license to get the verified badge.'
                  : 'Complete the steps below to verify your profile.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            {['Phone', 'License', 'Insurance'].map((step, i) => (
              <View key={step} style={{
                flex: 1, height: 4, borderRadius: 2,
                backgroundColor: progressSteps[i] ? COLORS.successGreen : COLORS.chipBg,
              }} />
            ))}
          </View>
        </View>

        {/* Phone Verification */}
        <SectionCard
          icon={<PhoneIcon color={phoneVerified ? COLORS.successGreen : COLORS.primary} />}
          title="Phone Verification"
          description={phoneVerified ? 'Phone number verified' : 'Verify your phone number via OTP'}
          status={phoneVerified ? 'complete' : 'incomplete'}
          ctaLabel="Verify Phone"
          onPress={() => navigation.navigate('PhoneVerification')}
        />

        {/* License Verification */}
        <SectionCard
          icon={<ShieldIcon color={licenseVerified ? COLORS.successGreen : hasLicenseNumber ? COLORS.counterAmber : COLORS.primary} />}
          title="License Verification"
          description={
            licenseVerified
              ? `License verified (${profile?.license_state ?? 'CO'})`
              : hasLicenseNumber
                ? `License #${profile?.license_number} — Pending verification`
                : role === 'agent'
                  ? 'Enter your CO real estate license number'
                  : 'Enter your trade license number'
          }
          status={licenseStatus}
          ctaLabel={role === 'agent' ? 'Verify License' : 'Add License'}
          onPress={() => {}}
        >
          {licenseStatus === 'incomplete' && (
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.statText, marginBottom: 6 }}>
                  License Number
                </Text>
                <TextInput
                  value={licenseNumber}
                  onChangeText={setLicenseNumber}
                  placeholder="e.g. FA100012345"
                  placeholderTextColor={COLORS.lightText}
                  style={{
                    height: 44, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 10,
                    paddingHorizontal: 12, fontSize: 15, color: COLORS.darkText,
                    backgroundColor: COLORS.background,
                  }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
              <View>
                <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.statText, marginBottom: 6 }}>
                  State
                </Text>
                <View style={{
                  height: 44, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 10,
                  paddingHorizontal: 12, justifyContent: 'center',
                  backgroundColor: COLORS.filterBg,
                }}>
                  <Text style={{ fontSize: 15, color: COLORS.darkText }}>{licenseState}</Text>
                </View>
              </View>
              <Pressable
                onPress={handleSaveLicense}
                disabled={licenseSaving || !licenseNumber.trim()}
                style={{
                  backgroundColor: licenseNumber.trim() ? COLORS.primary : COLORS.chipBg,
                  borderRadius: 10, paddingVertical: 10, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center', gap: 8,
                }}
              >
                {licenseSaving && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text style={{ fontSize: 14, fontWeight: '600', color: licenseNumber.trim() ? '#FFFFFF' : COLORS.lightText }}>
                  {licenseSaving ? 'Saving...' : 'Save License'}
                </Text>
              </Pressable>
              <Text style={{ fontSize: 11, color: COLORS.lightText, textAlign: 'center' }}>
                {/* TODO: PRODUCTION — wire to ARELLO API verify-license edge function */}
                License will be verified manually. This may take 1-2 business days.
              </Text>
            </View>
          )}
        </SectionCard>

        {/* Insurance Upload (contractors only) */}
        {role !== 'agent' && (
          <SectionCard
            icon={<FileIcon color={insuranceUploaded ? COLORS.successGreen : COLORS.primary} />}
            title="Insurance Documentation"
            description={
              insuranceUploaded
                ? 'Insurance document uploaded'
                : 'Upload proof of insurance to complete verification'
            }
            status={insuranceUploaded ? 'complete' : 'incomplete'}
            ctaLabel="Upload Insurance"
            onPress={handleUploadInsurance}
          >
            {!insuranceUploaded && (
              <Pressable
                onPress={handleUploadInsurance}
                disabled={insuranceUploading}
                style={{
                  backgroundColor: COLORS.primary, borderRadius: 10,
                  paddingVertical: 10, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center', gap: 8,
                }}
              >
                {insuranceUploading && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                  {insuranceUploading ? 'Uploading...' : 'Upload Insurance'}
                </Text>
              </Pressable>
            )}
          </SectionCard>
        )}
      </ScrollView>
    </View>
  );
};

export default VerificationScreen;
