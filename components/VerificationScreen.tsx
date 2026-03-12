// VerificationScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Profile Verification — Phone OTP, License (with state picker), Insurance nav
// fullScreenModal in ProfileStack (slide_from_bottom)
// Safe area: useSafeAreaInsets() + manual padding (Dynamic Island)
//
// Verification tiers:
//   none → basic (phone verified) → verified (+ license) → fully_verified (+ insurance)
//
// License section states:
//   incomplete → show editable form (license number input + state picker)
//   pending    → show read-only row (license #, state, amber "Pending" pill)
//   verified   → show read-only row (license #, state, green "Verified" pill)
//
// Feature flags:
//   LIVE_VERIFICATION_HOOKS = false (@demo) → console.log + mock Alert
//   LIVE_VERIFICATION_HOOKS = true  → calls rpc_submit_license_verification
//
// @demo  Mock verification state from profile hook
// @backend rpc_submit_license_verification (S47)
//          ARELLO API license verify: edge function (deferred, pre-launch)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, ScrollView, StatusBar, TextInput,
  Alert, ActivityIndicator, RefreshControl, Modal, FlatList,
  Animated, Easing, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useMyProfile, useSubmitLicenseVerification } from '../hooks/useData';
import type { ProfileStackParamList } from './ProfileStack';

type NavProp = NativeStackNavigationProp<ProfileStackParamList>;

// ─────────────────────────────────────────────
// US STATES — 50 states for picker
// ─────────────────────────────────────────────

const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' }, { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

const SCREEN_HEIGHT = Dimensions.get('window').height;

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
    <Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.secondaryText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PendingIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M12 2a10 10 0 100 20 10 10 0 000-20z" stroke={COLORS.counterAmber} strokeWidth={2} />
    <Path d="M12 6v6l4 2" stroke={COLORS.counterAmber} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronDownIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M20 6L9 17l-5-5" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
        <Text style={{ fontSize: 14, color: COLORS.bodyText, marginTop: 2 }}>{description}</Text>
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
//
// State:
//   licenseNumber       — text input for license number
//   licenseState        — 2-char state code (default 'CO')
//   licenseSaving       — loading state during save
//   statePickerVisible  — controls state picker bottom sheet
//   backdropOpacity     — Animated.Value for backdrop fade
//   sheetTranslateY     — Animated.Value for sheet spring
// ═══════════════════════════════════════════════════════════════

const VerificationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { data: profile, refetch, isRefetching } = useMyProfile();
  const submitLicense = useSubmitLicenseVerification();

  // ── License form state ──
  const [licenseNumber, setLicenseNumber] = useState(profile?.license_number ?? '');
  const [licenseState, setLicenseState] = useState(profile?.license_state ?? 'CO');
  const [licenseSaving, setLicenseSaving] = useState(false);

  // ── State picker bottom sheet ──
  const [statePickerVisible, setStatePickerVisible] = useState(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(300)).current;

  // ── Derived values ──
  const phoneVerified = profile?.phone_verified ?? false;
  const insuranceUploaded = profile?.insurance_uploaded ?? false;
  const role = profile?.role ?? 'agent';

  // licenseStatus derived from profile?.license_status (S47)
  const licenseStatus: 'incomplete' | 'pending' | 'complete' =
    profile?.license_status === 'verified' ? 'complete'
    : profile?.license_status === 'pending' ? 'pending'
    : 'incomplete';

  // Progress: phone + license (pending counts as progress) + insurance
  const progressSteps = [
    phoneVerified,
    profile?.license_status === 'verified' || profile?.license_status === 'pending',
    insuranceUploaded,
  ];

  // ─────────────────────────────────────────────
  // STATE PICKER HANDLERS
  // ─────────────────────────────────────────────

  const handleStatePickerOpen = useCallback(() => {
    setStatePickerVisible(true);
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(300);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0.5, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 0, damping: 24, stiffness: 220, useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, sheetTranslateY]);

  const handleStatePickerClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0, duration: 300, easing: Easing.out(Easing.ease), useNativeDriver: true,
      }),
      Animated.spring(sheetTranslateY, {
        toValue: 300, damping: 24, stiffness: 220, useNativeDriver: true,
      }),
    ]).start(() => {
      setStatePickerVisible(false);
    });
  }, [backdropOpacity, sheetTranslateY]);

  const handleStateSelect = useCallback((code: string) => {
    setLicenseState(code);
    handleStatePickerClose();
  }, [handleStatePickerClose]);

  // ─────────────────────────────────────────────
  // LICENSE SAVE HANDLER
  // ─────────────────────────────────────────────

  const handleLicenseSave = useCallback(async () => {
    if (!licenseNumber.trim()) {
      Alert.alert('License Number Required', 'Please enter your license number.');
      return;
    }
    setLicenseSaving(true);
    try {
      if (FEATURE_FLAGS.LIVE_VERIFICATION_HOOKS) {
        // @backend: rpc_submit_license_verification
        //   params: { p_license_number, p_license_state }
        const result = await submitLicense.mutateAsync({
          licenseNumber: licenseNumber.trim(),
          licenseState: licenseState.toUpperCase(),
        });
        if (!result.success) {
          Alert.alert('Error', result.message);
          return;
        }
        Alert.alert('License Submitted', 'Your license has been submitted for verification.');
      } else {
        // @demo — console.log payload + mock success Alert
        console.log('[VerificationScreen] handleLicenseSave (mock)', {
          licenseNumber: licenseNumber.trim(),
          licenseState: licenseState.toUpperCase(),
        });
        await new Promise((r) => setTimeout(r, 500));
        Alert.alert('License Saved', 'Your license number has been saved. Verification is pending.');
      }
    } catch {
      Alert.alert('Error', 'Failed to save license. Please try again.');
    } finally {
      setLicenseSaving(false);
    }
  }, [licenseNumber, licenseState, submitLicense]);

  // ─────────────────────────────────────────────
  // INSURANCE NAVIGATION
  // ─────────────────────────────────────────────

  const handleInsuranceUpload = useCallback(() => {
    navigation.navigate('InsuranceUpload');
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      {/* Header — 3-element centered pattern */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        height: 48,
        paddingHorizontal: 16,
        borderBottomWidth: 0.68, borderBottomColor: COLORS.border, backgroundColor: COLORS.background,
      }}>
        <View style={{ width: 44 }} />
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.primary, textAlign: 'center' }}>
          Verification
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

      <ScrollView
        style={{ backgroundColor: COLORS.screenBg }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 16 }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={COLORS.primary} />}
      >
        {/* ──────────────────────────────────────
            Progress summary
            ────────────────────────────────────── */}
        <View style={{
          backgroundColor: COLORS.background, borderRadius: 14,
          borderWidth: 0.68, borderColor: COLORS.cardBorder, padding: 16,
        }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}>
            Verification Progress
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.bodyText, marginTop: 4 }}>
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

        {/* ──────────────────────────────────────
            Phone Verification
            ────────────────────────────────────── */}
        <SectionCard
          icon={<PhoneIcon color={phoneVerified ? COLORS.successGreen : COLORS.primary} />}
          title="Phone Verification"
          description={phoneVerified ? 'Phone number verified' : 'Verify your phone number via OTP'}
          status={phoneVerified ? 'complete' : 'incomplete'}
          ctaLabel="Verify Phone"
          onPress={() => navigation.navigate('PhoneVerification')}
        />

        {/* ──────────────────────────────────────
            License Verification
            ────────────────────────────────────── */}
        <SectionCard
          icon={<ShieldIcon color={licenseStatus === 'complete' ? COLORS.successGreen : licenseStatus === 'pending' ? COLORS.counterAmber : COLORS.primary} />}
          title="License Verification"
          description={
            licenseStatus === 'complete'
              ? `License verified (${profile?.license_state ?? 'CO'})`
              : licenseStatus === 'pending'
                ? `License #${profile?.license_number} — Pending verification`
                : role === 'agent'
                  ? 'Enter your CO real estate license number'
                  : 'Enter your trade license number'
          }
          status={licenseStatus}
          ctaLabel={role === 'agent' ? 'Verify License' : 'Add License'}
          onPress={() => {}}
        >
          {/* Pending read-only gate */}
          {licenseStatus === 'pending' && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: COLORS.filterBg, borderRadius: 10, padding: 12,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>
                  {profile?.license_number}
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.secondaryText, marginTop: 2 }}>
                  {profile?.license_state ?? 'CO'}
                </Text>
              </View>
              <View style={{
                backgroundColor: COLORS.warningBg, borderRadius: 9999,
                paddingHorizontal: 10, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.warningAmber }}>
                  Pending Review
                </Text>
              </View>
            </View>
          )}

          {/* Verified read-only gate */}
          {licenseStatus === 'complete' && (
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: COLORS.filterBg, borderRadius: 10, padding: 12,
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>
                  {profile?.license_number}
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.secondaryText, marginTop: 2 }}>
                  {profile?.license_state ?? 'CO'}
                </Text>
              </View>
              <View style={{
                backgroundColor: '#ECFDF5', borderRadius: 9999,
                paddingHorizontal: 10, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.successGreen }}>
                  Verified
                </Text>
              </View>
            </View>
          )}

          {/* Editable form — only when incomplete */}
          {licenseStatus === 'incomplete' && (
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, marginBottom: 6 }}>
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
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, marginBottom: 6 }}>
                  State
                </Text>
                <Pressable
                  onPress={handleStatePickerOpen}
                  style={({ pressed }) => ({
                    height: 44, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 10,
                    paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: COLORS.background,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text style={{ fontSize: 15, color: COLORS.darkText }}>
                    {licenseState} — {US_STATES.find(s => s.code === licenseState)?.name ?? licenseState}
                  </Text>
                  <ChevronDownIcon color={COLORS.secondaryText} />
                </Pressable>
              </View>
              <Pressable
                onPress={handleLicenseSave}
                disabled={licenseSaving || !licenseNumber.trim()}
                style={{
                  backgroundColor: licenseNumber.trim() ? COLORS.primary : COLORS.chipBg,
                  borderRadius: 10, paddingVertical: 10, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center', gap: 8,
                }}
              >
                {licenseSaving && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text style={{ fontSize: 14, fontWeight: '600', color: licenseNumber.trim() ? '#FFFFFF' : COLORS.lightText }}>
                  {licenseSaving ? 'Submitting...' : 'Submit License'}
                </Text>
              </Pressable>
              <Text style={{ fontSize: 14, color: COLORS.secondaryText, textAlign: 'center', lineHeight: 20 }}>
                {/* @backend: ARELLO API verify-license edge function (deferred, pre-launch) */}
                License will be verified manually. This may take 1-2 business days.
              </Text>
            </View>
          )}
        </SectionCard>

        {/* ──────────────────────────────────────
            Insurance Upload (non-agent roles)
            ────────────────────────────────────── */}
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
            onPress={handleInsuranceUpload}
          />
        )}
      </ScrollView>

      {/* ──────────────────────────────────────
          STATE PICKER BOTTOM SHEET
          animationType="none" + custom Animated
          ────────────────────────────────────── */}
      <Modal
        visible={statePickerVisible}
        transparent
        animationType="none"
        onRequestClose={handleStatePickerClose}
      >
        {/* Backdrop */}
        <Animated.View
          style={{
            ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
            backgroundColor: '#000000',
            opacity: backdropOpacity,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={handleStatePickerClose} />
        </Animated.View>

        {/* Sheet */}
        <Animated.View
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: SCREEN_HEIGHT * 0.6,
            backgroundColor: COLORS.background,
            borderTopLeftRadius: 24, borderTopRightRadius: 24,
            transform: [{ translateY: sheetTranslateY }],
          }}
        >
          {/* Sheet header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', height: 56,
            paddingHorizontal: 16,
            borderBottomWidth: 0.68, borderBottomColor: COLORS.border,
          }}>
            <View style={{ width: 44 }} />
            <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.darkText, textAlign: 'center' }}>
              Select State
            </Text>
            <Pressable
              onPress={handleStatePickerClose}
              style={({ pressed }) => ({
                width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <CloseIcon />
            </Pressable>
          </View>

          {/* State list */}
          <FlatList
            data={US_STATES}
            keyExtractor={(item) => item.code}
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleStateSelect(item.code)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 14,
                  backgroundColor: pressed ? COLORS.filterBg : COLORS.background,
                  borderBottomWidth: 0.5, borderBottomColor: COLORS.cardBorder,
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText, width: 36 }}>
                  {item.code}
                </Text>
                <Text style={{ flex: 1, fontSize: 15, color: COLORS.bodyText }}>
                  {item.name}
                </Text>
                {licenseState === item.code && <CheckIcon />}
              </Pressable>
            )}
          />
        </Animated.View>
      </Modal>
    </View>
  );
};

export default VerificationScreen;
