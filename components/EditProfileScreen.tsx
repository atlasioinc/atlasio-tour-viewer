// EditProfileScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Edit Profile — Shared across all roles (715 lines)
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
//   - Wire image picker → Supabase Storage upload
//   - Wire license/insurance upload → document picker + Storage
//   - Replace service area TextInput with Google Places autocomplete
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { COLORS, DIMENSIONS, SHADOWS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { GOOGLE_MAPS_API_KEY } from '../lib/config';
import { useMyProfile, useUpdateProfile } from '../hooks/useData';
import { useUploadAvatar } from '../hooks/useUploadAvatar';
import { Avatar } from './shared';
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
  headline: string;
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
// AUTOCOMPLETE TYPES
// ─────────────────────────────────────────────

interface PlaceSuggestion {
  placeId: string;
  description: string;
}

// ─────────────────────────────────────────────
// MOCK DATA — Pre-populated for demo
// TODO: Replace with Supabase profiles query
// ─────────────────────────────────────────────

const MOCK_AGENT_DATA: FormData = {
  fullName: 'John Doe',
  headline: 'Fast closings, strong local connections',
  bio: 'Specializing in first-time buyers and investor flips. Fast closings, bilingual Spanish/English. Known for strong local connections and helping clients navigate complex deals with ease.',
  company: 'Keller Williams',
  licenseNumber: '', // @demo always blank — license managed via VerificationScreen
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
  headline: '24hr response, licensed & insured',
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

// CameraIcon + AvatarPlaceholder replaced by shared Avatar component (S132)

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

  // ── Live profile data ──
  const { data: myProfile } = useMyProfile();
  const updateProfile = useUpdateProfile();
  const { pickAndUpload, isUploading: isAvatarUploading } = useUploadAvatar();

  // ── Form State ──
  const [form, setForm] = useState<FormData>(() => getMockData(role));
  const [errors, setErrors] = useState<FormErrors>({});
  const isSaving = updateProfile.isPending;

  // ── Service area autocomplete state (mirrors PostJobWizard) ──
  const [serviceAreaQuery, setServiceAreaQuery] = useState(form.serviceArea);
  const [citySuggestions, setCitySuggestions] = useState<PlaceSuggestion[]>([]);
  const [showCityAutocomplete, setShowCityAutocomplete] = useState(false);
  const cityAutocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // @backend Google Places (New) API — autocomplete restricted to (cities)
  // @demo Falls back silently on API failure — city can still be typed manually
  const fetchCitySuggestions = async (input: string) => {
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        },
        body: JSON.stringify({
          input,
          includedPrimaryTypes: ['(cities)'],
        }),
      });
      const data = await response.json();
      const mapped = (data.suggestions ?? [])
        .map((s: any) => ({
          placeId: s.placePrediction?.placeId ?? '',
          description: s.placePrediction?.text?.text ?? '',
        }))
        .filter((s: PlaceSuggestion) => s.placeId && s.description);
      setCitySuggestions(mapped);
    } catch {
      console.warn('[EditProfileScreen] City autocomplete failed');
      setCitySuggestions([]);
    }
  };

  const handleCityTextChange = (text: string) => {
    setServiceAreaQuery(text);
    updateField('serviceArea', ''); // clear confirmed selection while typing

    if (cityAutocompleteTimerRef.current) clearTimeout(cityAutocompleteTimerRef.current);

    if (text.length < 3) {
      setCitySuggestions([]);
      setShowCityAutocomplete(false);
      return;
    }

    setShowCityAutocomplete(true);
    cityAutocompleteTimerRef.current = setTimeout(() => {
      fetchCitySuggestions(text);
    }, 400);
  };

  const handleCitySelect = (description: string) => {
    setServiceAreaQuery(description);
    updateField('serviceArea', description);
    setCitySuggestions([]);
    setShowCityAutocomplete(false);
  };

  // Cleanup autocomplete timer
  useEffect(() => {
    return () => {
      if (cityAutocompleteTimerRef.current) clearTimeout(cityAutocompleteTimerRef.current);
    };
  }, []);

  // ── Pre-fill form from live profile when available ──
  const [hasPreFilled, setHasPreFilled] = useState(false);
  useEffect(() => {
    if (FEATURE_FLAGS.LIVE_PROFILE_HOOKS && myProfile && !hasPreFilled) {
      setForm((prev) => ({
        ...prev,
        fullName: myProfile.name || prev.fullName,
        headline: myProfile.headline || prev.headline,
        bio: myProfile.bio || prev.bio,
        company: myProfile.company || prev.company,
        licenseNumber: myProfile.licensed || prev.licenseNumber,
        serviceArea: myProfile.service_area || prev.serviceArea,  // also synced to serviceAreaQuery below
        specialties: myProfile.specialties?.length ? myProfile.specialties : prev.specialties,
        languages: myProfile.languages?.length ? myProfile.languages : prev.languages,
        primaryTrade: myProfile.trade || prev.primaryTrade,
        secondaryTrades: myProfile.trades?.length > 1 ? myProfile.trades.slice(1) : prev.secondaryTrades,
      }));
      setHasPreFilled(true);
      if (myProfile.service_area) setServiceAreaQuery(myProfile.service_area);
    }
  }, [myProfile, hasPreFilled]);

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
    if (isContractor && !form.primaryTrade) newErrors.primaryTrade = 'Please select your primary trade';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Save Handler ──
  const handleSave = async () => {
    if (!validate()) {
      Alert.alert('Missing Required Fields', 'Please fill in all required fields before saving.');
      return;
    }
    try {
      await updateProfile.mutateAsync({
        name: form.fullName.trim(),
        headline: form.headline.trim() || null, // @backend profiles.headline — max 50 chars
        // bio field hidden — omitted to avoid overwriting real Supabase bio
        // @demo restore bio param here when bio field is re-enabled in UI
        company: form.company.trim(),
        // license_number managed in VerificationScreen — not saved from EditProfile
        service_area: form.serviceArea.trim() || null,
        specialties: form.specialties,
        languages: form.languages, // @backend profiles.languages text[] (S143)
        trade: form.primaryTrade || null,
        // @backend sends null (not []) so COALESCE preserves existing trades row value
        trades: form.primaryTrade
          ? [form.primaryTrade as any, ...form.secondaryTrades]
          : null as any,
        is_visible: form.availability,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
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
          <Avatar
            uri={myProfile?.avatar_url}
            name={form.fullName || 'User'}
            size={DIMENSIONS.avatarProfile}
            color={myProfile?.avatar_color ?? COLORS.primary}
            onPress={() => pickAndUpload(myProfile?.avatar_url)}
            showCameraOverlay={true}
            isUploading={isAvatarUploading}
          />
          <Pressable onPress={() => pickAndUpload(myProfile?.avatar_url)}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>
              Change Photo
            </Text>
          </Pressable>
          <Text style={{ fontSize: 13, color: COLORS.secondaryText, textAlign: 'center', marginTop: 6 }}>
            {myProfile?.role === 'agent' ? 'Add a professional headshot' : 'Add your photo or company logo'}
          </Text>
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

        {/* @demo bio field hidden — re-enable in v2 profile completion flow (S119b) */}

        <FormField
          label="Headline"
          value={form.headline}
          onChangeText={(text) => updateField('headline', text.slice(0, 50))}
          placeholder="Professional tagline (e.g., 'Fast closings, no surprises')"
          maxLength={50}
          helperText="50 chars max — one punchy line agents remember"
        />

        <FormField
          label={isContractor ? 'Company Name' : 'Brokerage / Company'}
          value={form.company}
          onChangeText={(text) => updateField('company', text.slice(0, 25))}
          placeholder={isContractor ? 'Your company name' : 'Your brokerage or company'}
          required
          maxLength={25}
          helperText="25 chars max"
          error={errors.company}
        />

        {/* License — read-only, managed in VerificationScreen */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>
            License
          </Text>
          <Pressable
            onPress={() => (navigation as any).navigate('Verification')}
            style={({ pressed }) => ({
              height: 50,
              paddingHorizontal: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              borderWidth: 1.35,
              borderColor: COLORS.inputBorder,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 15, fontWeight: '400', color: (myProfile?.license_number || myProfile?.licensed) ? COLORS.darkText : COLORS.lightText }}>
              {myProfile?.license_number || myProfile?.licensed || 'Not added'}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary }}>
              {(myProfile?.license_number || myProfile?.licensed) ? 'Update →' : 'Add License →'}
            </Text>
          </Pressable>
        </View>

        {/* ── Service Area — Google Places city autocomplete (mirrors PostJobWizard) ── */}
        <View style={{ gap: 8, zIndex: 999 }}>
          <View style={{ position: 'relative', zIndex: 999 }}>
            <FormField
              label="Service Area"
              value={serviceAreaQuery}
              onChangeText={handleCityTextChange}
              placeholder="e.g., Denver, CO"
              helperText="City where you primarily work"
            />

            {/* Autocomplete dropdown */}
            {showCityAutocomplete && citySuggestions.length > 0 && (
              <View style={{
                position: 'absolute', top: 52, left: 0, right: 0, zIndex: 999,
                backgroundColor: COLORS.background,
                borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
                ...SHADOWS.card,
              }}>
                {citySuggestions.map((s) => (
                  <Pressable
                    key={s.placeId}
                    onPress={() => handleCitySelect(s.description)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14, paddingVertical: 12,
                      borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
                      flexDirection: 'row', alignItems: 'center', gap: 8,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 15, fontWeight: '400', color: COLORS.darkText, flex: 1 }} numberOfLines={1}>
                      {s.description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        </View>

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
