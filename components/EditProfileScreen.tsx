// EditProfileScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Edit Profile — Shared across Agent, Contractor, Partner roles
// Role-conditional field sets via route param { role: string }
//
// Entry points:
//   - ProfileTab "Edit Profile" button → role: 'agent'
//   - ProProfile "Edit Profile" button → role: profile.role
//
// Architecture:
//   - fullScreenModal in ProfileStack (slide_from_bottom)
//   - Safe area: useSafeAreaInsets() + manual padding (Dynamic Island)
//   - Uses shared components: FormField, ChipGroup, SingleSelectChipGroup
//   - Input/chip styling matches PostJobWizard exactly
//
// TODO (Production):
//   - Replace console.log save with useUpdateProfile() mutation
//   - Wire image picker → Supabase Storage upload
//   - Wire license/insurance upload → document picker + Storage
//   - Replace service area TextInput with Google Places autocomplete
//   - Pre-populate from Supabase profiles query instead of mock data
//   - Add loading state during save mutation
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, DIMENSIONS } from '../lib/tokens';
import FormField from './FormField';
import { ChipGroup, SingleSelectChipGroup } from './SelectableChip';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface EditProfileRouteParams {
  role: string;
}

interface FormData {
  fullName: string;
  bio: string;
  company: string;
  licenseNumber: string;
  serviceArea: string;
  languages: string[];
  specialties: string[];
  // Contractor-specific
  primaryTrade: string;
  secondaryTrades: string[];
  availability: boolean;
  ratePreferences: string;
}

interface FormErrors {
  fullName?: string;
  company?: string;
  bio?: string;
  primaryTrade?: string;
}

// ─────────────────────────────────────────────
// CONSTANTS — Chip Options
// ─────────────────────────────────────────────

const LANGUAGE_OPTIONS = ['English', 'Spanish', 'Mandarin', 'Vietnamese', 'Korean'];

const AGENT_SPECIALTIES = ['Residential', 'Commercial', 'Luxury', 'First-Time Buyers', 'Investment'];

const TRADE_OPTIONS = [
  'Electrician', 'Plumber', 'Roofer', 'General Contractor',
  'HVAC', 'Painter', 'Landscaper', 'Driveway/Paving',
];

/** Role-specific specialty chip sets for partner roles */
const PARTNER_SPECIALTIES: Record<string, string[]> = {
  'Mortgage Pro': ['FHA', 'VA', 'Conventional', 'Jumbo', 'USDA', 'Reverse'],
  'Title/Escrow': ['Residential', 'Commercial', 'Refinance', 'Cash Deals'],
  'Home Inspector': ['Foundation', 'Roof', 'Plumbing', 'Electrical', 'Whole House', 'Thermal Imaging'],
  'Appraiser': ['FHA/VA Certified', 'Commercial', 'Luxury', 'Rush Available'],
  'Transaction Coordinator': ['Residential', 'Commercial', 'REO', 'Short Sale'],
  'Warranty': ['Comprehensive', 'Basic', 'Premium', 'New Construction'],
  'Attorney': ['Contract Review', 'Closing', 'Litigation', 'Commercial'],
};

/** Roles eligible for contractor-specific fields */
const CONTRACTOR_ROLES = ['Contractor', 'Home Stager', 'Real Estate Photographer'];

/** Roles eligible for partner-specific specialty sets */
const PARTNER_ROLES = Object.keys(PARTNER_SPECIALTIES);

// ─────────────────────────────────────────────
// MOCK DATA — Pre-populated for demo
// TODO: Replace with Supabase profiles query
// ─────────────────────────────────────────────

const MOCK_AGENT_DATA: FormData = {
  fullName: 'John Doe',
  bio: 'Specializing in first-time buyers and investor flips. Fast closings, bilingual Spanish/English. Known for strong local connections and helping clients navigate complex deals with ease.',
  company: 'Keller Williams',
  licenseNumber: 'MLS #123456',
  serviceArea: 'Denver Metro',
  languages: ['English', 'Spanish'],
  specialties: ['Residential', 'First-Time Buyers', 'Investment'],
  primaryTrade: '',
  secondaryTrades: [],
  availability: true,
  ratePreferences: '',
};

const MOCK_CONTRACTOR_DATA: FormData = {
  fullName: 'Brian Cooper',
  bio: 'Licensed electrician servicing the Denver area since 2015. Free quotes and available M-Sat by appointment.',
  company: 'ProBuild Contractors',
  licenseNumber: 'CO-EL-2015-4821',
  serviceArea: 'Denver Metro',
  languages: ['English', 'Spanish'],
  specialties: [],
  primaryTrade: 'Electrician',
  secondaryTrades: ['HVAC'],
  availability: true,
  ratePreferences: 'Starting at $85/hr',
};

const MOCK_PARTNER_DATA: Record<string, Partial<FormData>> = {
  'Mortgage Pro': {
    fullName: 'Rachel Williams',
    bio: 'Helping Denver families find the best loan options since 2018. VA and FHA specialist with fast closings.',
    company: 'First Choice Lending',
    licenseNumber: 'NMLS #987654',
    serviceArea: 'Denver Metro',
    languages: ['English', 'Spanish'],
    specialties: ['VA', 'FHA', 'Conventional'],
  },
  'Title/Escrow': {
    fullName: 'Emma Thompson',
    bio: 'Efficient closings with clear communication. Specializing in residential and cash deals.',
    company: 'Elite Title Services',
    licenseNumber: 'CO-TITLE-2019',
    serviceArea: 'Denver Metro',
    languages: ['English'],
    specialties: ['Residential', 'Cash Deals'],
  },
};

/** Returns mock data based on role */
const getMockData = (role: string): FormData => {
  if (role === 'agent') return { ...MOCK_AGENT_DATA };
  if (CONTRACTOR_ROLES.includes(role)) return { ...MOCK_CONTRACTOR_DATA };
  const partnerData = MOCK_PARTNER_DATA[role];
  return {
    ...MOCK_AGENT_DATA,
    ...partnerData,
    primaryTrade: '',
    secondaryTrades: [],
    availability: true,
    ratePreferences: '',
  };
};

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackArrowIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 19L5 12L12 5" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CameraIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M19.17 15.83C19.17 16.29 18.99 16.72 18.66 17.05C18.34 17.38 17.9 17.5 17.5 17.5H2.5C2.04 17.5 1.6 17.38 1.34 17.05C1.01 16.72 0.83 16.29 0.83 15.83V6.67C0.83 6.21 1.01 5.78 1.34 5.45C1.6 5.12 2.04 5 2.5 5H5.83L7.5 2.5H12.5L14.17 5H17.5C17.9 5 18.34 5.12 18.66 5.45C18.99 5.78 19.17 6.21 19.17 6.67V15.83Z" stroke="#FFFFFF" strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={10} cy={10.83} r={3.33} stroke="#FFFFFF" strokeWidth={1.67} />
  </Svg>
);

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{ name: string; size?: number }> = ({ name, size = 100 }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: DIMENSIONS.pillRadius,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// SECTION HEADER (matches PostJobWizard label style)
// ─────────────────────────────────────────────

const SectionHeader: React.FC<{ title: string; required?: boolean; description?: string }> = ({ title, required, description }) => (
  <View style={{ gap: 4 }}>
    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>
      {title}
      {required && <Text style={{ color: '#FB2C36' }}> *</Text>}
    </Text>
    {description && (
      <Text style={{ fontSize: 12, fontWeight: '400', color: '#999999', lineHeight: 16 }}>
        {description}
      </Text>
    )}
  </View>
);

// ─────────────────────────────────────────────
// TOGGLE ROW (matches PostJobWizard switch style)
// ─────────────────────────────────────────────

const ToggleRow: React.FC<{
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}> = ({ label, description, value, onValueChange }) => (
  <View
    style={{
      height: 52,
      paddingHorizontal: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 14,
      borderWidth: 1.35,
      borderColor: COLORS.inputBorder,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
  >
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>{label}</Text>
      {description && (
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#999999', lineHeight: 16 }}>{description}</Text>
      )}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#D1D5DC', true: COLORS.primary }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#D1D5DC"
    />
  </View>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const BIO_LIMIT = 250;

const EditProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute();
  const { role } = (route.params as EditProfileRouteParams) || { role: 'agent' };

  // ── Determine field visibility ──
  const isContractor = CONTRACTOR_ROLES.includes(role);
  const isPartner = PARTNER_ROLES.includes(role);
  const isAgent = role === 'agent';

  // ── Get specialty options based on role ──
  const specialtyOptions = useMemo(() => {
    if (isAgent) return AGENT_SPECIALTIES;
    if (isPartner) return PARTNER_SPECIALTIES[role] || AGENT_SPECIALTIES;
    return [];
  }, [role, isAgent, isPartner]);

  // ── Form State ──
  const [form, setForm] = useState<FormData>(() => getMockData(role));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // ── Field Updaters ──
  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const toggleArrayField = (key: 'languages' | 'specialties' | 'secondaryTrades', option: string) => {
    setForm((prev) => {
      const current = prev[key] as string[];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  };

  const selectPrimaryTrade = (trade: string) => {
    setForm((prev) => ({
      ...prev,
      primaryTrade: trade,
      secondaryTrades: prev.secondaryTrades.filter((t) => t !== trade),
    }));
    if (errors.primaryTrade) {
      setErrors((prev) => ({ ...prev, primaryTrade: undefined }));
    }
  };

  // ── Validation ──
  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!form.company.trim()) newErrors.company = 'Company name is required';
    if (form.bio.length > BIO_LIMIT) newErrors.bio = `Bio must be ${BIO_LIMIT} characters or less`;
    if (isContractor && !form.primaryTrade) newErrors.primaryTrade = 'Please select your primary trade';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Save Handler ──
  const handleSave = () => {
    if (!validate()) {
      Alert.alert('Missing Required Fields', 'Please fill in all required fields before saving.');
      return;
    }
    setIsSaving(true);

    // TODO: Replace with useUpdateProfile() mutation
    // await updateProfile.mutateAsync({
    //   id: currentUser.id,
    //   full_name: form.fullName,
    //   bio: form.bio,
    //   company: form.company,
    //   license_number: form.licenseNumber,
    //   service_area: form.serviceArea,
    //   languages: form.languages,
    //   specialties: form.specialties,
    //   primary_trade: form.primaryTrade,
    //   secondary_trades: form.secondaryTrades,
    //   availability: form.availability,
    //   rate_preferences: form.ratePreferences,
    // });

    console.log('──── SAVE PROFILE ────');
    console.log('Role:', role);
    console.log('Data:', JSON.stringify(form, null, 2));
    console.log('──────────────────────');

    setTimeout(() => {
      setIsSaving(false);
      navigation.goBack();
    }, 300);
  };

  // ── Available secondary trades (exclude primary) ──
  const secondaryTradeOptions = TRADE_OPTIONS.filter((t) => t !== form.primaryTrade);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ═══════════════════════════════════════
          HEADER (48px, manual safe area)
          ═══════════════════════════════════════ */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: COLORS.background,
          borderBottomWidth: DIMENSIONS.headerBorderWidth,
          borderBottomColor: COLORS.border,
        }}
      >
        <View
          style={{
            height: DIMENSIONS.headerHeight,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
          }}
        >
          {/* Left bookend — 80px (matches right for true centering) */}
          <View style={{ width: 80, alignItems: 'flex-start', justifyContent: 'center' }}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <BackArrowIcon />
            </Pressable>
          </View>

          {/* Center title */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary }}>
              Edit Profile
            </Text>
          </View>

          {/* Right bookend — 80px to fit "Saving..." */}
          <View style={{ width: 80, alignItems: 'flex-end', justifyContent: 'center' }}>
            <Pressable
              onPress={handleSave}
              disabled={isSaving}
              style={({ pressed }) => ({
                height: DIMENSIONS.headerHeight,
                justifyContent: 'center',
                opacity: isSaving ? 0.4 : pressed ? 0.6 : 1,
              })}
            >
              <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.primary, textAlign: 'right' }}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* ═══════════════════════════════════════
          SCROLLABLE FORM
          ═══════════════════════════════════════ */}
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: Math.max(insets.bottom, 16) + 24,
          gap: 24,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* ── PROFILE PHOTO ── */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          <View style={{ position: 'relative' }}>
            <AvatarPlaceholder name={form.fullName || 'User'} size={DIMENSIONS.avatarProfile} />
            <Pressable
              onPress={() => {
                // TODO: Wire to expo-image-picker → Supabase Storage upload
                console.log('Change photo tapped');
                Alert.alert('Coming Soon', 'Photo upload will be available in the next update.');
              }}
              style={({ pressed }) => ({
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 36,
                height: 36,
                borderRadius: DIMENSIONS.pillRadius,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: COLORS.background,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <CameraIcon />
            </Pressable>
          </View>
          <Pressable
            onPress={() => {
              console.log('Change photo tapped');
              Alert.alert('Coming Soon', 'Photo upload will be available in the next update.');
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>
              Change Photo
            </Text>
          </Pressable>
        </View>

        {/* ═══════════════════════════════════════
            BASIC INFORMATION
            ═══════════════════════════════════════ */}
        <FormField
          label="Full Name"
          value={form.fullName}
          onChangeText={(text) => updateField('fullName', text)}
          placeholder="Your full name"
          required
          error={errors.fullName}
        />

        <FormField
          label="Bio"
          value={form.bio}
          onChangeText={(text) => updateField('bio', text.slice(0, BIO_LIMIT))}
          placeholder="Tell others about yourself..."
          multiline
          maxLength={BIO_LIMIT}
          error={errors.bio}
        />

        <FormField
          label={isContractor ? 'Company Name' : 'Brokerage / Company'}
          value={form.company}
          onChangeText={(text) => updateField('company', text)}
          placeholder={isContractor ? 'Your company name' : 'Your brokerage or company'}
          required
          error={errors.company}
        />

        <FormField
          label="License Number"
          value={form.licenseNumber}
          onChangeText={(text) => updateField('licenseNumber', text)}
          placeholder="e.g., MLS #123456"
        />

        <FormField
          label="Service Area"
          value={form.serviceArea}
          onChangeText={(text) => updateField('serviceArea', text)}
          placeholder="e.g., Denver Metro"
          helperText="Helps clients and pros find you by location"
        />

        {/* ═══════════════════════════════════════
            LANGUAGES
            ═══════════════════════════════════════ */}
        <View style={{ gap: 12 }}>
          <SectionHeader title="Languages" />
          <ChipGroup
            options={LANGUAGE_OPTIONS}
            selected={form.languages}
            onToggle={(option) => toggleArrayField('languages', option)}
          />
        </View>

        {/* ═══════════════════════════════════════
            SPECIALTIES (Agent + Partner only)
            ═══════════════════════════════════════ */}
        {(isAgent || isPartner) && specialtyOptions.length > 0 && (
          <View style={{ gap: 12 }}>
            <SectionHeader title="Specialties" />
            <ChipGroup
              options={specialtyOptions}
              selected={form.specialties}
              onToggle={(option) => toggleArrayField('specialties', option)}
            />
          </View>
        )}

        {/* ═══════════════════════════════════════
            CONTRACTOR-SPECIFIC FIELDS
            ═══════════════════════════════════════ */}
        {isContractor && (
          <>
            {/* Primary Trade */}
            <View style={{ gap: 12 }}>
              <SectionHeader title="Primary Trade" required />
              <SingleSelectChipGroup
                options={TRADE_OPTIONS}
                selected={form.primaryTrade}
                onSelect={selectPrimaryTrade}
                error={errors.primaryTrade}
              />
            </View>

            {/* Secondary Trades */}
            {form.primaryTrade !== '' && (
              <View style={{ gap: 12 }}>
                <SectionHeader
                  title="Secondary Trades"
                  description="Select up to 2 additional specialties"
                />
                <ChipGroup
                  options={secondaryTradeOptions}
                  selected={form.secondaryTrades}
                  onToggle={(option) => toggleArrayField('secondaryTrades', option)}
                  maxSelect={2}
                />
              </View>
            )}

            {/* License & Insurance Upload */}
            <View style={{ gap: 12 }}>
              <SectionHeader title="License & Insurance" />
              <Pressable
                onPress={() => {
                  // TODO: Wire to document picker → Supabase Storage upload
                  console.log('Upload license/insurance tapped');
                  Alert.alert('Coming Soon', 'Document upload will be available in the next update.');
                }}
                style={({ pressed }) => ({
                  height: 50,
                  paddingHorizontal: 16,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1.35,
                  borderColor: COLORS.inputBorder,
                  borderStyle: 'dashed',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                  <Path d="M8 3.33V12.67" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" />
                  <Path d="M3.33 8H12.67" stroke={COLORS.primary} strokeWidth={1.33} strokeLinecap="round" />
                </Svg>
                <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.primary }}>
                  Upload Documents
                </Text>
              </Pressable>
            </View>

            {/* Portfolio Photos */}
            <View style={{ gap: 12 }}>
              <SectionHeader title="Portfolio Photos" description="Showcase your work — up to 8 photos" />
              {/* TODO: Import and use PortfolioGallery in edit mode */}
              <Pressable
                onPress={() => {
                  console.log('Add portfolio photo tapped');
                  Alert.alert('Coming Soon', 'Portfolio upload will be available in the next update.');
                }}
                style={({ pressed }) => ({
                  height: 80,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1.35,
                  borderColor: COLORS.inputBorder,
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 5V19" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
                  <Path d="M5 12H19" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
                </Svg>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>
                  Add Photos
                </Text>
              </Pressable>
            </View>

            {/* Availability */}
            <View style={{ gap: 12 }}>
              <SectionHeader title="Availability" />
              <ToggleRow
                label="Available for new jobs"
                description={form.availability ? 'Visible in search results' : 'Hidden from search results'}
                value={form.availability}
                onValueChange={(val) => updateField('availability', val)}
              />
            </View>

            {/* Rate Preferences */}
            <FormField
              label="Rate Preferences"
              value={form.ratePreferences}
              onChangeText={(text) => updateField('ratePreferences', text)}
              placeholder='e.g., "Starting at $85/hr" or "Project-based"'
            />
          </>
        )}

      </ScrollView>
    </View>
  );
};

export default EditProfileScreen;
