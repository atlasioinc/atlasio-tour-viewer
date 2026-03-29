// ProfileTab.tsx
// ═══════════════════════════════════════════════════════════════
// Profile Tab — Own Profile View (7-Zone Layout)
// Merged: ContractorProfileTab.tsx → ProfileTab.tsx (S44)
//   Role-conditional content within a single layout tree.
//   Contractor-specific: detailed Z3 (License & Insurance), headline, mock data.
// Zones:
//   Z1: Hero card (avatar, name, role pill, company, location)
//   Z2: Trust bar (rating + vouch pill — tappable, vouches sheet)
//   Z3: Credentials card (VerificationBadge + VerifyNudge)
//   Z4: Specialties card (DisplayTag chips)
//   Z5: Portfolio card (contractors only, PortfolioGallery)
//   Z6: Your Stats card (3 stat tiles, "Visible only to you" pill)
//   Z7: Controls card (visibility toggle + Edit Profile button)
//
// Verification: VerificationBanner at top of scroll (soft nudge).
// Business rule: NEVER hard-gate ProfileTab — trust-building upsell.
//
// @demo  Mock specialties + languages via FEATURE_FLAGS.USE_MOCK_DATA
// @backend useMyProfile (wired) — profiles.id = auth.uid()
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Modal,
  Animated,
  Dimensions,
  Easing,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SHADOWS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useMyProfile, useProfileVouches } from '../hooks/useData';
import { VerificationBanner, VerificationBadge } from './shared';
import { DisplayTag } from './DisplayTag';
import PortfolioGallery from './PortfolioGallery';
import { useDemoRole } from '../lib/demoRoleContext';

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const SettingsIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      stroke={COLORS.headingText}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16.17 12.5a1.38 1.38 0 0 0 .28 1.52l.05.05a1.67 1.67 0 1 1-2.36 2.36l-.05-.05a1.38 1.38 0 0 0-1.52-.28 1.38 1.38 0 0 0-.84 1.27v.13a1.67 1.67 0 0 1-3.33 0v-.07A1.38 1.38 0 0 0 7.5 16.17a1.38 1.38 0 0 0-1.52.28l-.05.05a1.67 1.67 0 1 1-2.36-2.36l.05-.05a1.38 1.38 0 0 0 .28-1.52A1.38 1.38 0 0 0 2.63 11.73h-.13a1.67 1.67 0 0 1 0-3.33h.07A1.38 1.38 0 0 0 3.83 7.5a1.38 1.38 0 0 0-.28-1.52l-.05-.05a1.67 1.67 0 1 1 2.36-2.36l.05.05a1.38 1.38 0 0 0 1.52.28h.07a1.38 1.38 0 0 0 .83-1.27v-.13a1.67 1.67 0 0 1 3.33 0v.07a1.38 1.38 0 0 0 .84 1.27 1.38 1.38 0 0 0 1.52-.28l.05-.05a1.67 1.67 0 1 1 2.36 2.36l-.05.05a1.38 1.38 0 0 0-.28 1.52v.07a1.38 1.38 0 0 0 1.27.83h.13a1.67 1.67 0 0 1 0 3.33h-.07a1.38 1.38 0 0 0-1.27.84Z"
      stroke={COLORS.headingText}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ChevronRightIcon: React.FC<{ color?: string; size?: number }> = ({
  color = COLORS.mutedText,
  size = 16,
}) => (
  <Svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <Path d="M6 12L10 8L6 4" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Shield check icon for license/insurance section (contractor Z3)
const ShieldIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
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

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{ name: string; color: string; size?: number }> = ({
  name,
  color,
  size = 120,
}) => {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.3, fontWeight: '600', color: '#FFFFFF' }}>
        {initials}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// VOUCH CARD (for bottom sheet)
// ─────────────────────────────────────────────

interface VouchCardProps {
  name: string;
  role?: string;
  quote: string;
}

const VouchCard: React.FC<VouchCardProps> = ({ name, role, quote }) => (
  <View style={{ gap: 0 }}>
    {/* Row 1: name left, role/company right */}
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText }}>{name}</Text>
      {role ? (
        <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.secondaryText }}>{role}</Text>
      ) : null}
    </View>
    {/* Row 2: comment text */}
    <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.bodyText, marginTop: 8 }}>
      {quote}
    </Text>
  </View>
);

// ─────────────────────────────────────────────
// ROLE DISPLAY HELPERS
// ─────────────────────────────────────────────

const ROLE_DISPLAY: Record<string, string> = {
  agent: 'Real Estate Agent',
  mortgage_pro: 'Mortgage Pro',
  title_escrow: 'Title & Escrow',
  home_inspector: 'Home Inspector',
  contractor: 'Contractor',
  appraiser: 'Appraiser',
  transaction_coordinator: 'Transaction Coordinator',
  attorney: 'Attorney',
  warranty: 'Home Warranty',
  home_stager: 'Home Stager',
  real_estate_photographer: 'Real Estate Photographer',
  other: 'Professional',
};

// ─────────────────────────────────────────────
// @demo MOCK CONTRACTOR PROFILE
// Merged from ContractorProfileTab.tsx (S44)
// Gated by FEATURE_FLAGS.USE_MOCK_DATA
// @backend: rpc_get_my_profile — profiles table, id = auth.uid()
// ─────────────────────────────────────────────

const MOCK_CONTRACTOR_PROFILE = {
  name: 'Marcus Johnson',
  company: 'Johnson Plumbing Co.',
  role: 'contractor' as const,
  trade: 'Plumbing',
  headline: 'Licensed master plumber · Denver Metro',
  location: 'Denver, CO',
  avatar_color: '#4A90D9',
  rating: 4.8,
  vouch_count: 6,
  is_visible: true,
  verification_level: 'basic' as const,
  specialties: ['Licensed', 'Insured', 'Emergency Service', 'Water Heaters', 'Drain Cleaning'],
  license_number: 'CO-PLM-2847',
  license_state: 'CO',
  license_verified: true, // @demo hardcoded — strongest demo state
  insurance_uploaded: true,
  insurance_status: 'approved' as const, // @demo hardcoded — strongest demo state
  insurance_expiry: '12/2026', // @demo hardcoded — 9 months from now
  display_role: 'Contractor',
};

// ─────────────────────────────────────────────
// @demo MOCK PARTNER PROFILE
// @backend: replace with useMyProfile() when LIVE
// ─────────────────────────────────────────────

const MOCK_PARTNER_PROFILE = {
  name: 'Sarah Chen',
  company: 'First American Title',
  role: 'partner' as const,
  partnerType: 'title_escrow' as const,
  bio: 'Title & escrow specialist with 12 years closing real estate transactions across Denver Metro.',
  headline: 'Title & Escrow · First American',
  location: 'Denver, CO',
  avatar_color: '#8B5CF6',
  rating: 4.9,
  vouch_count: 23,
  is_visible: true,
  verification_level: 'basic' as const,
  specialties: ['Title Insurance', 'Escrow Management', 'Closing Coordination', '1031 Exchanges'],
  display_role: 'Title & Escrow',
  dealsClosedCount: 47,
  avgClosingDays: 18,
  acceptingClients: true,
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ProfileTab: React.FC = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  // ── Live profile hook ──
  const { data: liveProfile } = useMyProfile();
  const { demoRole } = useDemoRole();

  // ── Mock gating: use role-specific mock when USE_MOCK_DATA + demo role ──
  // demoRole comes from DemoRoleContext (BottomTabNavigator), NOT liveProfile.role
  // (useMyProfile mock fallback always returns role:'agent' regardless of demo role)
  const isMockContractor = FEATURE_FLAGS.USE_MOCK_DATA && demoRole === 'contractor';
  const isMockPartner = FEATURE_FLAGS.USE_MOCK_DATA && demoRole === 'partner';
  const mockSource = isMockContractor ? MOCK_CONTRACTOR_PROFILE
    : isMockPartner ? MOCK_PARTNER_PROFILE
    : null;

  // ── Profile data ──
  const profileName = mockSource?.name ?? liveProfile?.name ?? 'Loading...';
  const profileCompany = mockSource?.company ?? liveProfile?.company ?? '';
  const profileServiceArea = (mockSource as any)?.service_area ?? liveProfile?.service_area ?? liveProfile?.location ?? null;
  const profileRating = mockSource?.rating ?? liveProfile?.rating ?? 0;
  const profileVouchCount = mockSource?.vouch_count ?? liveProfile?.vouch_count ?? 0;
  const profileVisible = mockSource?.is_visible ?? liveProfile?.is_visible ?? true;
  const profileAvatarColor = mockSource?.avatar_color ?? liveProfile?.avatar_color ?? COLORS.primary;
  const profileRole = mockSource?.role ?? liveProfile?.role ?? 'agent';
  const profileDisplayRole = mockSource?.display_role ?? liveProfile?.display_role ?? ROLE_DISPLAY[profileRole] ?? 'Professional';
  const profileTrade = (mockSource as any)?.trade ?? liveProfile?.trade ?? null;
  const profileHeadline = mockSource?.headline ?? liveProfile?.headline ?? null;
  const profileLicensed = liveProfile?.licensed ?? '';
  const verificationLevel = mockSource?.verification_level ?? liveProfile?.verification_level ?? 'none';
  const licenseVerified = (mockSource as any)?.license_verified ?? liveProfile?.license_verified ?? false;
  const insuranceStatus = (mockSource as any)?.insurance_status ?? (liveProfile as any)?.insurance_status ?? 'none';
  const insuranceExpiry = (mockSource as any)?.insurance_expiry ?? (liveProfile as any)?.insurance_expiry ?? '';
  const insuranceDocName = (liveProfile as any)?.insurance_doc_name ?? 'Certificate of Insurance';
  const licenseNumber = (mockSource as any)?.license_number ?? liveProfile?.license_number ?? '';

  // ── Specialties ──
  const specialties = FEATURE_FLAGS.USE_MOCK_DATA
    ? (mockSource?.specialties ?? ['Residential', 'First-Time Buyers', 'Investment'])
    : (liveProfile?.specialties ?? ['Residential', 'First-Time Buyers', 'Investment']);

  // ── Languages ──
  // @backend liveProfile?.languages — profiles.languages text[] (wired S119c)
  const profileLanguages: string[] = FEATURE_FLAGS.USE_MOCK_DATA
    ? ['English', 'Spanish']
    : (liveProfile?.languages ?? []);

  // ── Vouches (live data) ──
  const resolvedProfileId = liveProfile?.id ?? '';
  const { data: liveVouches } = useProfileVouches(
    !FEATURE_FLAGS.USE_MOCK_DATA && resolvedProfileId ? resolvedProfileId : '',
  );

  // @demo Mock vouches — role-specific, count matches profile.vouch_count
  const MOCK_AGENT_VOUCHES = [
    { id: 'v-1', name: 'Sarah Mitchell', role: 'Agent · Keller Williams', quote: '"Closed three deals together this quarter — always responsive and fights for the best terms."' },
    { id: 'v-2', name: 'Mike Reeves', role: 'Agent · RE/MAX', quote: '"Fast and professional. My go-to referral partner in the Denver Metro."' },
    { id: 'v-3', name: 'Linda Chen', role: 'Agent · Compass', quote: '"Helped my buyer client navigate a tricky inspection — saved the deal."' },
    { id: 'v-4', name: 'James Torres', role: 'Mortgage Pro · First Choice', quote: '"Smooth closings every time. Great communication with the lending team."' },
    { id: 'v-5', name: 'Rachel Kim', role: 'Agent · eXp Realty', quote: '"Referred two clients and both had excellent experiences. Highly recommend."' },
    { id: 'v-6', name: 'Tom Bradley', role: 'Inspector · Front Range', quote: '"Always schedules inspections quickly and follows up. A pleasure to work with."' },
  ];

  const MOCK_CONTRACTOR_VOUCHES = [
    { id: 'vc-1', name: 'Sarah Mitchell', role: 'Agent · Keller Williams', quote: '"Marcus fixed a major pipe burst the day before closing. Saved the deal."' },
    { id: 'vc-2', name: 'James Torres', role: 'Agent · RE/MAX', quote: '"On time, clean work, and communicated every step. Highly recommend."' },
    { id: 'vc-3', name: 'Linda Park', role: 'Agent · Compass', quote: '"Completed a full water heater replacement in under 3 hours. Clients were thrilled."' },
    { id: 'vc-4', name: 'Rachel Kim', role: 'Agent · eXp Realty', quote: '"Called him for an emergency leak on a Sunday and he showed up within the hour."' },
    { id: 'vc-5', name: 'Tom Bradley', role: 'Agent · Coldwell Banker', quote: '"Handled plumbing for three of my listings. Always on budget, always on time."' },
    { id: 'vc-6', name: 'Emma Davis', role: 'Agent · Sotheby\'s', quote: '"Professional, licensed, insured — exactly what you want before a closing."' },
  ];

  // @demo Partner vouches — replace with useProfileVouches when LIVE
  const MOCK_PARTNER_VOUCHES = [
    { id: 'vp-1', name: 'Priya Patel', role: 'Agent · Keller Williams', quote: '"Closed on time every single deal. Communication is top-notch."' },
    { id: 'vp-2', name: 'Marcus Webb', role: 'Agent · RE/MAX', quote: '"Best title company in Denver. Always responsive and thorough."' },
    { id: 'vp-3', name: 'Emma Davis', role: 'Agent · Compass', quote: '"Sarah made a complex 1031 exchange feel simple. Incredible service."' },
  ];

  const mockVouches = profileRole === 'partner' ? MOCK_PARTNER_VOUCHES
    : profileRole === 'contractor' ? MOCK_CONTRACTOR_VOUCHES
    : MOCK_AGENT_VOUCHES;

  const vouches = (liveVouches && liveVouches.length > 0)
    ? liveVouches
    : mockVouches;

  // ── Vouches bottom sheet state ──
  const [vouchSheetVisible, setVouchSheetVisible] = useState(false);
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const { height: screenHeight } = Dimensions.get('window');

  const openVouchSheet = () => {
    setVouchSheetVisible(true);
    Animated.spring(sheetAnim, {
      toValue: 1,
      damping: 24,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeVouchSheet = () => {
    Animated.timing(sheetAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => setVouchSheetVisible(false));
  };

  const sheetTranslateY = sheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  // ── Role-conditional flags ──
  const isContractor = profileRole === 'contractor';
  const isPartner = profileRole === 'partner';
  const isGalleryRole = ['contractor', 'home_stager', 'real_estate_photographer'].includes(profileRole);

  // ── Portfolio photos (mock for demo) ──
  const portfolioPhotos = FEATURE_FLAGS.USE_MOCK_DATA && isGalleryRole
    ? [
        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop',
        'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
      ]
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── Header ── */}
      <View
        style={{
          height: DIMENSIONS.headerHeight,
          backgroundColor: COLORS.background,
          justifyContent: 'center',
          borderBottomWidth: DIMENSIONS.headerBorderWidth,
          borderBottomColor: COLORS.border,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
          <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.primary }}>My Profile</Text>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={12}
            style={({ pressed }) => ({
              position: 'absolute',
              right: 16,
              width: 44,
              height: 44,
              borderRadius: 9999,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <SettingsIcon />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, paddingHorizontal: 16, gap: 16 }}
      >
        {/* Soft verification nudge — returns null if already verified */}
        <VerificationBanner
          level={verificationLevel}
          role={profileRole === 'contractor' ? 'contractor' : 'agent'}
          onPress={() => navigation.navigate('Verification')}
        />

        {/* ══════════════════════════════════════════
            Z1: HERO CARD
            Avatar, name, role pill, company, location
            ══════════════════════════════════════════ */}
        <View
          style={{
            padding: 24,
            backgroundColor: COLORS.background,
            borderRadius: DIMENSIONS.cardRadius,
            borderWidth: DIMENSIONS.cardBorderWidth,
            borderColor: COLORS.cardBorder,
            ...SHADOWS.card,
            gap: 12,
            alignItems: 'center',
          }}
        >
          <AvatarPlaceholder name={profileName} color={profileAvatarColor} size={DIMENSIONS.avatarHero} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ ...TYPOGRAPHY.displayM, color: COLORS.darkText, textAlign: 'center' }}>
              {profileName}
            </Text>
            <VerificationBadge level={verificationLevel} />
          </View>

          {/* Role pill */}
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              backgroundColor: COLORS.tagBg,
              borderRadius: DIMENSIONS.pillRadius,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.bodyM, fontWeight: '500', color: COLORS.primary }}>
              {profileTrade || profileDisplayRole}
            </Text>
          </View>

          {/* Company + Service Area */}
          <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.bodyText, textAlign: 'center' }}>
            {[profileCompany, profileLicensed].filter(Boolean).join(' · ')}{profileServiceArea ? `\n${profileServiceArea}` : ''}
          </Text>

          {/* Headline (all roles, conditional on profile.headline existing) */}
          {profileHeadline ? (
            <View
              style={{
                backgroundColor: COLORS.tagBg,
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
                <Path
                  d="M7.5 1.5L3 7.5h4l-2 4 6-7H7.5l1-3z"
                  fill={COLORS.primary}
                  strokeWidth={0.5}
                  stroke={COLORS.primary}
                />
              </Svg>
              <Text
                numberOfLines={1}
                style={{
                  ...TYPOGRAPHY.bodyM,
                  fontWeight: '500',
                  color: COLORS.primary,
                  flex: 1,
                }}
              >
                {profileHeadline}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ══════════════════════════════════════════
            Z2: TRUST BAR
            Rating + vouch pill — tappable with chevron
            ══════════════════════════════════════════ */}
        <Pressable
          onPress={openVouchSheet}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: COLORS.background,
            borderRadius: DIMENSIONS.cardRadius,
            borderWidth: DIMENSIONS.cardBorderWidth,
            borderColor: COLORS.cardBorder,
            ...SHADOWS.card,
            gap: 12,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: COLORS.chipBg,
              borderRadius: DIMENSIONS.pillRadius,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.statText }}>
              {profileRating.toFixed(1)} ★
            </Text>
            <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.statText }}>
              {profileVouchCount} Vouches
            </Text>
          </View>
          <ChevronRightIcon />
        </Pressable>

        {/* ══════════════════════════════════════════
            Z3: CREDENTIALS CARD
            iOS Settings-style tappable credential rows
            Agent: License row only
            Contractor: License row + divider + Insurance row
            All rows tappable (own profile) with ChevronRight
            @backend rpc_get_my_profile → license fields, insurance_status, insurance_expiry
            ══════════════════════════════════════════ */}
        <View
          style={{
            padding: 16,
            backgroundColor: COLORS.background,
            borderRadius: DIMENSIONS.cardRadius,
            borderWidth: DIMENSIONS.cardBorderWidth,
            borderColor: COLORS.cardBorder,
            ...SHADOWS.card,
            gap: 12,
          }}
        >
          <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.headingText }}>
            Credentials
          </Text>

          {/* License row — tappable → VerificationScreen */}
          <Pressable
            onPress={() => navigation.navigate('Verification')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              gap: 12,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <ShieldIcon
              size={20}
              color={licenseVerified ? COLORS.successGreen : COLORS.secondaryText}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.darkText }}>
                License
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.secondaryText, marginTop: 2 }}>
                {isContractor
                  ? licenseVerified
                    ? `${licenseNumber ? `CO-${licenseNumber}` : 'License'} · Verified`
                    : licenseNumber
                      ? 'Pending Review'
                      : 'Not added · Tap to add'
                  : licenseVerified
                    ? 'CO License · Verified'
                    : 'Not added · Tap to verify'}
              </Text>
            </View>
            <ChevronRightIcon size={16} color={COLORS.secondaryText} />
          </Pressable>

          {/* Contractor-only: divider + insurance row */}
          {isContractor && (
            <>
              {/* Divider */}
              <View style={{ height: 1, backgroundColor: COLORS.border }} />

              {/* Insurance row — tappable → InsuranceUploadScreen */}
              {/* @demo insuranceStatus drives icon color + status text */}
              <Pressable
                onPress={() => {
                  if (insuranceStatus === 'none' || insuranceStatus === 'expired') {
                    navigation.push('InsuranceUpload', { status: 'none' });
                  } else if (insuranceStatus === 'pending_review') {
                    navigation.push('InsuranceUpload', {
                      status: 'pending_review',
                      documentName: insuranceDocName,
                    });
                  } else if (insuranceStatus === 'approved') {
                    Alert.alert(
                      'Insurance Verified',
                      `Your certificate of insurance is active and expires ${insuranceExpiry}.`,
                      [{ text: 'OK' }]
                    );
                  }
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  gap: 12,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <ShieldIcon
                  size={20}
                  color={
                    insuranceStatus === 'approved'
                      ? COLORS.successGreen
                      : insuranceStatus === 'pending_review'
                        ? COLORS.warningAmber
                        : insuranceStatus === 'expired'
                          ? COLORS.warningAmber
                          : COLORS.secondaryText
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.darkText }}>
                    Insurance
                  </Text>
                  <Text style={{ fontSize: 13, color: COLORS.secondaryText, marginTop: 2 }}>
                    {insuranceStatus === 'approved'
                      ? `Insured · Exp ${insuranceExpiry}`
                      : insuranceStatus === 'pending_review'
                        ? 'Pending Review'
                        : insuranceStatus === 'expired'
                          ? 'Expired · Tap to renew'
                          : 'Not added · Tap to upload'}
                  </Text>
                </View>
                <ChevronRightIcon size={16} color={COLORS.secondaryText} />
              </Pressable>
            </>
          )}
        </View>

        {/* ══════════════════════════════════════════
            Z4: SPECIALTIES CARD
            DisplayTag chips
            ══════════════════════════════════════════ */}
        {specialties.length > 0 && (
          <View
            style={{
              padding: 16,
              backgroundColor: COLORS.background,
              borderRadius: DIMENSIONS.cardRadius,
              borderWidth: DIMENSIONS.cardBorderWidth,
              borderColor: COLORS.cardBorder,
              ...SHADOWS.card,
              gap: 12,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.headingText }}>Specialties</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {specialties.map((item) => (
                <DisplayTag key={item} label={item} />
              ))}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════
            Z4b: LANGUAGES CARD
            Hidden if user only speaks English (single language)
            @backend liveProfile?.languages — string[] from profiles table
            ══════════════════════════════════════════ */}
        {profileLanguages.length > 1 && (
          <View
            style={{
              padding: 16,
              backgroundColor: COLORS.background,
              borderRadius: DIMENSIONS.cardRadius,
              borderWidth: DIMENSIONS.cardBorderWidth,
              borderColor: COLORS.cardBorder,
              ...SHADOWS.card,
              gap: 12,
            }}
          >
            <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.headingText }}>Languages</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {profileLanguages.map((lang) => (
                <DisplayTag key={lang} label={lang} />
              ))}
            </View>
          </View>
        )}

        {/* ══════════════════════════════════════════
            Z5: PORTFOLIO CARD (contractors only)
            ══════════════════════════════════════════ */}
        <PortfolioGallery
          photos={portfolioPhotos}
          isOwnProfile={true}
          role={isGalleryRole ? profileDisplayRole : profileRole}
          onAddPhoto={() => console.log('Open image picker for portfolio upload')}
          onRemovePhoto={(index) => console.log('Remove portfolio photo at index:', index)}
        />

        {/* ══════════════════════════════════════════
            Z6: YOUR STATS CARD
            3 stat tiles, "Visible only to you" pill
            ══════════════════════════════════════════ */}
        <View
          style={{
            padding: 16,
            backgroundColor: COLORS.background,
            borderRadius: DIMENSIONS.cardRadius,
            borderWidth: DIMENSIONS.cardBorderWidth,
            borderColor: COLORS.cardBorder,
            ...SHADOWS.card,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.headingText }}>Your Stats</Text>
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                backgroundColor: COLORS.chipBg,
                borderRadius: DIMENSIONS.pillRadius,
              }}
            >
              <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.mutedText }}>Visible only to you</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {isPartner ? (
              <>
                {/* @demo Partner stats — replace with useMyProfile() live data */}
                <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>47</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                    Deals{'\n'}Closed
                  </Text>
                </View>
                <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>18</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                    Avg Close{'\n'}Days
                  </Text>
                </View>
                <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>23</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                    {'\n'}Vouches
                  </Text>
                </View>
              </>
            ) : isContractor ? (
              <>
                <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>27</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                    Jobs{'\n'}Completed
                  </Text>
                </View>
                <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>96%</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                    On-Time{'\n'}Rate
                  </Text>
                </View>
                <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>$42K</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                    Total{'\n'}Earnings
                  </Text>
                </View>
              </>
            ) : (
              <>
                <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>14</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                    Jobs{'\n'}Posted
                  </Text>
                </View>
                <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>14</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                    Jobs{'\n'}Completed
                  </Text>
                </View>
                <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>4</Text>
                  <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                    Avg Bids{'\n'}Per Job
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════
            Z7: CONTROLS CARD
            Visibility toggle + Edit Profile button
            ══════════════════════════════════════════ */}
        <View
          style={{
            padding: 16,
            backgroundColor: COLORS.background,
            borderRadius: DIMENSIONS.cardRadius,
            borderWidth: DIMENSIONS.cardBorderWidth,
            borderColor: COLORS.cardBorder,
            ...SHADOWS.card,
            gap: 16,
          }}
        >
          {/* Visibility toggle */}
          <View
            style={{
              height: 52,
              paddingHorizontal: 16,
              backgroundColor: COLORS.filterBg,
              borderRadius: DIMENSIONS.inputRadius,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.statText }}>
              Profile Visible to: <Text style={{ fontWeight: '500' }}>{profileVisible ? 'All Agents' : 'Hidden'}</Text>
            </Text>
            <Switch
              value={profileVisible}
              onValueChange={() => {/* TODO: wire useUpdateProfile to toggle is_visible */}}
              trackColor={{ false: '#D1D5DC', true: COLORS.primary }}
              thumbColor="#FFFFFF"
              ios_backgroundColor="#D1D5DC"
            />
          </View>

          {/* Edit Profile button */}
          <Pressable
            onPress={() => navigation.navigate('EditProfile', { role: profileRole })}
            style={({ pressed }) => ({
              height: DIMENSIONS.buttonModalHeight,
              backgroundColor: COLORS.primary,
              borderRadius: DIMENSIONS.buttonRadius,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ ...TYPOGRAPHY.bodyMBold, color: '#FFFFFF', textAlign: 'center' }}>
              Edit Profile
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════
          VOUCHES BOTTOM SHEET
          Spring animation (damping:24, stiffness:220)
          ══════════════════════════════════════════ */}
      <Modal visible={vouchSheetVisible} transparent animationType="none" onRequestClose={closeVouchSheet}>
        <Pressable
          style={{ flex: 1, backgroundColor: COLORS.overlayDark }}
          onPress={closeVouchSheet}
        />
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: COLORS.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 24,
            transform: [{ translateY: sheetTranslateY }],
            ...SHADOWS.modal,
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border }} />
          </View>

          {/* Header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ gap: 2 }}>
              <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.headingText }}>Vouches</Text>
              <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText }}>
                {profileVouchCount} vouches · {profileRating.toFixed(1)} avg rating
              </Text>
            </View>
            <Pressable
              onPress={closeVouchSheet}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 9999,
                backgroundColor: COLORS.chipBg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <Text style={{ fontSize: 16, color: COLORS.mutedText }}>✕</Text>
            </Pressable>
          </View>

          {/* Vouch list */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: screenHeight * 0.55 }}
          >
            <View style={{ gap: 12 }}>
              {vouches.map((v) => (
                <VouchCard
                  key={v.id}
                  name={v.name}
                  role={'role' in v ? (v as { role?: string }).role : undefined}
                  quote={v.quote}
                />
              ))}
              {vouches.length === 0 && (
                <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText, textAlign: 'center', paddingVertical: 24 }}>
                  No vouches yet
                </Text>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

export default ProfileTab;
