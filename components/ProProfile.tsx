// ProProfile.tsx
// ═══════════════════════════════════════════════════════════════
// Pro Profile Screen — Public View (7-Zone Layout)
// Navigated from: FindTab cards, NetworkTab contacts, bid cards
// Zones (public view shows Z1–Z5 + vouches section, NO Z6/Z7):
//   Z1: Hero card (avatar, name, verification badge, role pill,
//       company, location, headline)
//   Z2: Trust bar (rating + vouch pill — NOT tappable on public view)
//   Z3: Credentials card (Licensed & Insured tags)
//   Z4: Specialties card (self-selected tags)
//   Z5: Portfolio card (role-gated, PortfolioGallery)
//   Vouches section: header row + VouchCards
//   CTAs inside Hero card (below trust bar)
//
// Session 9: Dual-param navigation — accepts profileId (preferred,
// fetches via useProfile hook) or profile object (legacy mappers).
//
// @backend useProfile (wired) — profiles.id = profileId
// @demo  Mock fallback in useProfile if Supabase fails
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SHADOWS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useProfile, useConnectionStatus, useProfileVouches, useProfileStats, useSendConnectionRequest } from '../hooks/useData';
import { Avatar, VerificationBadge, VerificationBanner } from './shared';
import type { VerificationLevel } from '../types';
import { mapProfileToProProfileData } from './proProfileHelpers';
import PortfolioGallery from './PortfolioGallery';
import RequestConnectModal from './RequestConnectModal';
import InviteToJobModal from './InviteToJobModal';
import type { InviteContractor } from './InviteToJobModal';
import { useVerificationGate } from '../hooks/useVerificationGate';
import { DisplayTag } from './DisplayTag';

// ─────────────────────────────────────────────
// EXPORTED TYPES — Reusable across app
// proProfileHelpers.ts imports these — keep exports stable
// ─────────────────────────────────────────────

export interface PerformanceStats {
  completed_jobs: number;
  on_time_rate: number;  // 0–100 (percentage)
  avg_response: string;  // e.g., '<2h'
}

export interface VouchEntry {
  id: string;
  name: string;
  quote: string;
  avatarColor?: string;
}

export interface ProProfileData {
  id: string;
  name: string;
  company: string;
  location: string;
  rating: number;
  vouches: number;
  active_since: string;
  /** Primary role category — e.g., 'Contractor', 'Mortgage Pro', 'Home Stager'
   *  Used for role-gating features like Portfolio Gallery */
  role: string;
  /** Primary trade/specialty — e.g., 'Electrician', 'Plumber', 'General Contractor'
   *  The contractor's main identity. Displayed prominently on profile + cards.
   *  For non-contractor roles, this mirrors the role (e.g., 'Mortgage Pro'). */
  trade: string;
  /** Up to 2 secondary trade specialties — e.g., ['HVAC', 'Lighting'] */
  secondary_trades?: string[];
  licensed: string;
  distance: string;
  bio: string;
  /** Short punchy tagline — max 35 chars, displayed with lightning icon.
   *  @backend wire to profiles.headline */
  headline: string | null;
  avatarColor: string;
  performance_stats: PerformanceStats;
  tags: string[];
  recent_vouches: VouchEntry[];
  is_connected: boolean;
  is_own_profile: boolean;
  /** Portfolio photo URLs — max 8, used by PortfolioGallery */
  portfolio_photos: string[];
  /** Verification level — renders badge next to name */
  verification_level?: VerificationLevel;
  /** Whether viewed profile has a verified license */
  license_verified?: boolean;
  /** Whether viewed profile has uploaded insurance */
  insurance_uploaded?: boolean;
}

// ─────────────────────────────────────────────
// MOCK DATA (used for demo / dev)
// ─────────────────────────────────────────────

const MOCK_PORTFOLIO_PHOTOS: string[] = [
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1523413363574-c30aa1c2a516?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=600&fit=crop',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
];

export const MOCK_PRO_PROFILE: ProProfileData = {
  id: 'pro-1',
  name: 'John Doe',
  company: 'Company Name',
  location: 'Denver, CO',
  rating: 4.9,
  vouches: 30,
  active_since: '2022',
  role: 'Contractor',
  trade: 'Electrician',
  secondary_trades: ['HVAC', 'Lighting'],
  licensed: 'Licensed CO',
  distance: '12 mi',
  bio: 'Licensed Electrician servicing the Denver Area since 2015. Free quotes and available M-Sat by appointment. Feel free to connect.',
  headline: 'Response in under 2 hours',
  avatarColor: '#003DC3',
  performance_stats: {
    completed_jobs: 14,
    on_time_rate: 100,
    avg_response: '<2h',
  },
  tags: ['Licensed & Insured', 'Fast Response', 'Spanish-Speaking'],
  recent_vouches: [
    { id: 'v-1', name: 'Sarah J.', quote: '"Was available on holiday weekend"' },
    { id: 'v-2', name: 'Mike R.', quote: '"Completed job quickly situations"' },
    { id: 'v-3', name: 'Lisa K.', quote: '"Always available, super responsive"' },
    { id: 'v-4', name: 'David L.', quote: '"Fair pricing and excellent communication"' },
    { id: 'v-5', name: 'Angela R.', quote: '"Fixed a complex wiring issue others couldn\'t"' },
  ],
  is_connected: false,
  is_own_profile: false,
  portfolio_photos: MOCK_PORTFOLIO_PHOTOS,
};

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.5 15L7.5 10L12.5 5" stroke={COLORS.headingText} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const GearIcon: React.FC = () => (
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

const ShareIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3.33 10V16.67C3.33 17.11 3.51 17.53 3.82 17.85C4.14 18.16 4.56 18.33 5 18.33H15C15.44 18.33 15.86 18.16 16.18 17.85C16.49 17.53 16.67 17.11 16.67 16.67V10"
      stroke={COLORS.headingText}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M13.33 5L10 1.67L6.67 5" stroke={COLORS.headingText} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10 1.67V12.5" stroke={COLORS.headingText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const ShieldCheckIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M6 1L2 3V5.5C2 8.15 3.71 10.63 6 11.25C8.29 10.63 10 8.15 10 5.5V3L6 1Z"
      stroke={COLORS.primary}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M4.5 6L5.5 7L7.5 5" stroke={COLORS.primary} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LocationPinSmallIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
    <Path
      d="M6 1C4.07 1 2.5 2.57 2.5 4.5C2.5 7.12 6 11 6 11C6 11 9.5 7.12 9.5 4.5C9.5 2.57 7.93 1 6 1Z"
      stroke={COLORS.primary}
      strokeWidth={1}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle cx={6} cy={4.5} r={1.5} stroke={COLORS.primary} strokeWidth={1} />
  </Svg>
);

const LightningStatIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10.83 1.67L3.33 11.67H10L9.17 18.33L16.67 8.33H10L10.83 1.67Z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Avatar placeholder replaced by shared Avatar component (S132)

// ─────────────────────────────────────────────
// VOUCH CARD
// ─────────────────────────────────────────────

const VouchCard: React.FC<{ vouch: VouchEntry }> = ({ vouch }) => {
  const initial = vouch.name.charAt(0).toUpperCase();
  return (
    <View
      style={{
        padding: 16,
        backgroundColor: COLORS.quoteBg,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 9999,
          backgroundColor: vouch.avatarColor || COLORS.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#FFFFFF', lineHeight: 16 }}>
          {initial}
        </Text>
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={{ ...TYPOGRAPHY.bodyMBold, color: COLORS.darkText }}>
          {vouch.name}
        </Text>
        <Text style={{ ...TYPOGRAPHY.bodyM, fontStyle: 'italic', color: COLORS.secondaryText }}>
          {vouch.quote}
        </Text>
      </View>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ProProfile: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();

  // ── Route params: dual-param approach ──
  const params = route.params as { profileId?: string; profile?: ProProfileData } | undefined;
  const profileId = params?.profileId;
  const passedProfile = params?.profile;

  // Fetch profile by ID when profileId is provided
  const { data: fetchedProfile, isLoading } = useProfile(
    !FEATURE_FLAGS.USE_MOCK_DATA && profileId ? profileId : '',
  );

  // Resolve profile: fetched > passed (with bio) > mock fallback
  const profile: ProProfileData = useMemo(() => {
    if (fetchedProfile?.id) return mapProfileToProProfileData(fetchedProfile);
    if (passedProfile?.bio) return passedProfile;
    return MOCK_PRO_PROFILE;
  }, [fetchedProfile, passedProfile]);

  // ── Live relationship + vouches queries ──
  const resolvedProfileId = profile.id || profileId || '';
  const { data: connectionStatus } = useConnectionStatus(
    !FEATURE_FLAGS.USE_MOCK_DATA && resolvedProfileId ? resolvedProfileId : '',
  );
  const { data: liveVouches } = useProfileVouches(
    !FEATURE_FLAGS.USE_MOCK_DATA && resolvedProfileId ? resolvedProfileId : '',
  );
  // @backend useProfileStats — gated by LIVE_PROFILE_HOOKS, mock fallback when false
  const { data: profileStats } = useProfileStats(resolvedProfileId);
  const sendConnectionRequest = useSendConnectionRequest();
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const { showBanner: showVerifyBanner, level: verifyLevel } = useVerificationGate();

  // Override hardcoded values with live data
  const is_own_profile = connectionStatus === 'self' || profile.is_own_profile;
  const is_connected = connectionStatus === 'connected' || profile.is_connected;
  const connectionPending = connectionStatus === 'pending';
  const recent_vouches = (liveVouches && liveVouches.length > 0) ? liveVouches : profile.recent_vouches;

  const {
    name,
    company,
    location,
    rating,
    vouches,
    role,
    trade,
    secondary_trades,
    licensed,
    distance,
    headline,
    avatarColor,
    performance_stats,
    tags,
    portfolio_photos,
    verification_level,
    license_verified,
    insurance_uploaded,
  } = profile;

  // ── Request to Connect modal state ──
  const [connectModalVisible, setConnectModalVisible] = useState<boolean>(false);
  const [connectSent, setConnectSent] = useState<boolean>(false);

  // ── Invite to Job modal state ──
  const [inviteModalVisible, setInviteModalVisible] = useState<boolean>(false);

  const [showConnectNudge, setShowConnectNudge] = useState(false);

  const handleRequestConnect = () => {
    if (!verifyLevel || verifyLevel === 'none') {
      setShowConnectNudge(true);
    }
    setConnectModalVisible(true);
  };

  const handleSendConnect = async (message: string) => {
    try {
      await sendConnectionRequest.mutateAsync({
        targetId: resolvedProfileId,
        note: message || undefined,
      });
      setConnectSent(true);
      setConnectModalVisible(false);
    } catch {
      setConnectModalVisible(false);
    }
  };

  const handleEditProfile = () => {
    (navigation as any).navigate('Profile', {
      screen: 'EditProfile',
      params: { role: role || 'agent' },
    });
  };

  // Build InviteContractor from profile data
  const inviteContractor: InviteContractor = {
    id: profile.id,
    name,
    company,
    role: role || trade,
    avatarColor,
    trades: [trade, ...(secondary_trades || [])],
  };

  const handleInviteToJob = () => {
    setInviteModalVisible(true);
  };

  // Roles that participate in the job bidding flow
  const JOB_ELIGIBLE_ROLES = ['Contractor', 'Home Stager', 'Real Estate Photographer'];
  const isJobEligible = JOB_ELIGIBLE_ROLES.some(
    (r) => r.toLowerCase() === (role || '').toLowerCase()
  );

  // Credentials available
  const hasCredentials = license_verified || insurance_uploaded;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          HEADER: Back ← Name → Gear/Share
          ══════════════════════════════════════════ */}
      <View
        style={{
          height: DIMENSIONS.headerHeight,
          paddingHorizontal: 16,
          backgroundColor: COLORS.background,
          borderBottomWidth: DIMENSIONS.headerBorderWidth,
          borderBottomColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <BackIcon />
        </Pressable>

        <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }}>
          <Text
            style={{ ...TYPOGRAPHY.bodyLMedium, color: COLORS.darkText, lineHeight: 36, letterSpacing: 0.07 }}
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>

        {is_own_profile ? (
          <Pressable
            onPress={() => console.log('Edit profile')}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <GearIcon />
          </Pressable>
        ) : (
          <Pressable
            onPress={async () => {
              try {
                await Share.share({
                  message: `Check out ${name} on Atlasio — ${trade} at ${company}, ${location}. ${rating} ★ with ${vouches} vouches.`,
                });
              } catch {
                console.log('Share cancelled or failed');
              }
            }}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <ShareIcon />
          </Pressable>
        )}
      </View>

      {/* ══════════════════════════════════════════
          SCROLLABLE CONTENT
          ══════════════════════════════════════════ */}
      {isLoading && !passedProfile?.bio ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
      >
        <View style={{ paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, gap: 16 }}>

          {/* ══════════════════════════════════════════
              Z1: HERO CARD
              Avatar, name, verification badge, role pill,
              company, location, headline
              ══════════════════════════════════════════ */}
          <View
            style={{
              padding: 24,
              backgroundColor: COLORS.background,
              borderRadius: DIMENSIONS.cardRadius,
              borderWidth: DIMENSIONS.cardBorderWidth,
              borderColor: COLORS.cardBorder,
              ...SHADOWS.card,
              gap: 16,
              alignItems: 'center',
            }}
          >
            {/* Avatar — @backend fetch full profile by profileId — avatar_url comes from live profiles table */}
            <Avatar
              uri={fetchedProfile?.avatar_url ?? null}
              name={name}
              size={DIMENSIONS.avatarHero}
              color={avatarColor}
            />

            {/* Name + Badge */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ ...TYPOGRAPHY.displayM, color: COLORS.darkText, textAlign: 'center' }}>
                {name}
              </Text>
              <VerificationBadge level={verification_level ?? 'none'} />
            </View>

            {/* Role pill with trade + license */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: COLORS.chipBg,
                  borderRadius: DIMENSIONS.pillRadius,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <Text style={{ ...TYPOGRAPHY.bodyMBold, color: COLORS.statText }}>
                  {trade}
                </Text>
                {licensed ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ShieldCheckIcon />
                    <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.statText }}>
                      {licensed}
                    </Text>
                  </View>
                ) : null}
              </View>
              {/* Secondary Trade chips (max 2) */}
              {secondary_trades?.slice(0, 2).map((st) => (
                <View
                  key={st}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: COLORS.tagBg,
                    borderRadius: DIMENSIONS.pillRadius,
                    borderWidth: 0.68,
                    borderColor: 'rgba(0, 61, 195, 0.35)',
                  }}
                >
                  <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.primary }}>
                    {st}
                  </Text>
                </View>
              ))}
            </View>

            {/* Company + Location */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.bodyText, textAlign: 'center' }}>
                {company} · {location}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <LocationPinSmallIcon />
                <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.statText }}>
                  {distance}
                </Text>
              </View>
            </View>

            {/* Headline */}
            {headline ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: COLORS.tagBg,
                  borderRadius: 6,
                  alignSelf: 'stretch',
                }}
              >
                <LightningStatIcon />
                <Text numberOfLines={1} style={{ ...TYPOGRAPHY.bodyMBold, color: COLORS.primary, flex: 1 }}>
                  {headline}
                </Text>
              </View>
            ) : null}

            {/* ── Verification Banner (viewing others only) ── */}
            {!is_own_profile && showVerifyBanner && !verifyBannerDismissed && (
              <View style={{ alignSelf: 'stretch' }}>
                <VerificationBanner
                  level={verifyLevel}
                  role="agent"
                  onPress={() => navigation.dispatch(
                    CommonActions.navigate({ name: 'Profile', params: { screen: 'Verification' } }),
                  )}
                  onDismiss={() => setVerifyBannerDismissed(true)}
                />
              </View>
            )}

            {/* ── CTAs ──
                - is_own_profile → "Edit Profile" button only
                - Job-eligible: "Invite to Job" + "Request to Connect"/"Message"
                - Partners: "Message" + "Request to Connect"
            */}
            {is_own_profile ? (
              <View style={{ gap: 16, alignSelf: 'stretch' }}>
                <Pressable
                  onPress={handleEditProfile}
                  style={({ pressed }) => ({
                    height: DIMENSIONS.buttonModalHeight,
                    paddingHorizontal: 16,
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
            ) : (
              <View style={{ gap: 16, alignSelf: 'stretch' }}>
                {/* Top button: "Invite to Job" for job-eligible roles, "Message" for partners */}
                {isJobEligible ? (
                  <Pressable
                    onPress={handleInviteToJob}
                    style={({ pressed }) => ({
                      height: DIMENSIONS.buttonModalHeight,
                      paddingHorizontal: 16,
                      backgroundColor: COLORS.background,
                      borderRadius: DIMENSIONS.buttonRadius,
                      borderWidth: 0.69,
                      borderColor: COLORS.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ ...TYPOGRAPHY.bodyMBold, color: COLORS.primary, textAlign: 'center' }}>
                      Invite to Job
                    </Text>
                  </Pressable>
                ) : (
                  is_connected && (
                    <Pressable
                      onPress={() => console.log('Navigate to chat with:', name)}
                      style={({ pressed }) => ({
                        height: DIMENSIONS.buttonModalHeight,
                        paddingHorizontal: 16,
                        backgroundColor: COLORS.background,
                        borderRadius: DIMENSIONS.buttonRadius,
                        borderWidth: 0.69,
                        borderColor: COLORS.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ ...TYPOGRAPHY.bodyMBold, color: COLORS.primary, textAlign: 'center' }}>
                        Message
                      </Text>
                    </Pressable>
                  )
                )}

                {/* Bottom button: "Message" / "Request Pending" / "Request to Connect" */}
                <Pressable
                  onPress={() =>
                    is_connected
                      ? console.log('Navigate to chat with:', name)
                      : (connectionPending || connectSent)
                        ? undefined
                        : handleRequestConnect()
                  }
                  disabled={connectionPending || connectSent}
                  style={({ pressed }) => ({
                    height: DIMENSIONS.buttonModalHeight,
                    paddingHorizontal: 16,
                    backgroundColor: (connectionPending || connectSent) ? COLORS.sortBg : COLORS.primary,
                    borderRadius: DIMENSIONS.buttonRadius,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: (connectionPending || connectSent) ? 0.7 : pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      ...TYPOGRAPHY.bodyMBold,
                      color: (connectionPending || connectSent) ? COLORS.secondaryText : '#FFFFFF',
                      textAlign: 'center',
                    }}
                  >
                    {is_connected ? 'Message' : (connectionPending || connectSent) ? 'Request Pending' : 'Request to Connect'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* ══════════════════════════════════════════
              Z2: TRUST BAR
              Rating + vouch pill — plain View (NOT tappable)
              ══════════════════════════════════════════ */}
          <View
            style={{
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
            }}
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
                {rating} ★
              </Text>
              <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.statText }}>
                {vouches} Vouches
              </Text>
            </View>
          </View>

          {/* ══════════════════════════════════════════
              Z3: CREDENTIALS CARD
              Licensed & Insured tags
              ══════════════════════════════════════════ */}
          {is_own_profile ? (
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
              <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.headingText }}>Credentials</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {license_verified ? (
                  <DisplayTag label="Licensed" variant="success" />
                ) : (
                  <DisplayTag
                    label="+ Add License"
                    variant="ghost"
                    onPress={() => navigation.dispatch(
                      CommonActions.navigate({ name: 'Profile', params: { screen: 'Verification' } }),
                    )}
                  />
                )}
                {insurance_uploaded ? (
                  <DisplayTag label="Insured" variant="success" />
                ) : (
                  <DisplayTag
                    label="+ Add Insurance"
                    variant="ghost"
                    onPress={() => navigation.dispatch(
                      CommonActions.navigate({ name: 'Profile', params: { screen: 'Verification' } }),
                    )}
                  />
                )}
              </View>
            </View>
          ) : hasCredentials ? (
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
              <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.headingText }}>Credentials</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {license_verified && insurance_uploaded ? (
                  <DisplayTag label="Licensed & Insured" variant="success" />
                ) : (
                  <>
                    {license_verified && <DisplayTag label="Licensed" variant="success" />}
                    {insurance_uploaded && <DisplayTag label="Insured" variant="success" />}
                  </>
                )}
              </View>
            </View>
          ) : null}

          {/* ══════════════════════════════════════════
              Z4: SPECIALTIES CARD
              Self-selected tags
              ══════════════════════════════════════════ */}
          {tags.length > 0 && (
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
                {tags.map((tag) => (
                  <DisplayTag key={tag} label={tag} />
                ))}
              </View>
            </View>
          )}

          {/* ══════════════════════════════════════════
              Z5: PORTFOLIO CARD — Role-gated
              ══════════════════════════════════════════ */}
          <PortfolioGallery
            photos={portfolio_photos}
            isOwnProfile={is_own_profile}
            role={role}
            onAddPhoto={() => console.log('Open image picker for portfolio upload')}
            onRemovePhoto={(index) => console.log('Remove portfolio photo at index:', index)}
          />

          {/* ══════════════════════════════════════════
              PERFORMANCE STATS (3 tiles — no icons)
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
            <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.headingText }}>Performance</Text>
            {/* @backend useProfileStats — live when LIVE_PROFILE_HOOKS: true, mock fallback otherwise */}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.primary }}>
                  {profileStats?.completed_jobs ?? performance_stats.completed_jobs}
                </Text>
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                  Jobs{'\n'}Won
                </Text>
              </View>
              <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.primary }}>
                  {profileStats?.on_time_rate ?? performance_stats.on_time_rate}%
                </Text>
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                  On-Time{'\n'}Rate
                </Text>
              </View>
              <View style={{ flex: 1, padding: 12, backgroundColor: COLORS.screenBg, borderRadius: 10, alignItems: 'center', gap: 4 }}>
                <Text style={{ ...TYPOGRAPHY.headingL, color: COLORS.primary }}>
                  {profileStats?.avg_response_hours != null ? `<${profileStats.avg_response_hours}h` : performance_stats.avg_response}
                </Text>
                <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.secondaryText, textAlign: 'center' }}>
                  Avg{'\n'}Response
                </Text>
              </View>
            </View>
          </View>

          {/* ══════════════════════════════════════════
              VOUCHES SECTION
              Header row + 2 preview VouchCards
              ══════════════════════════════════════════ */}
          {recent_vouches.length > 0 && (
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
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.headingText }}>
                  Vouches ({vouches})
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {recent_vouches.slice(0, 2).map((vouch) => (
                  <VouchCard key={vouch.id} vouch={vouch} />
                ))}
              </View>

              {recent_vouches.length > 2 && (
                <Pressable
                  onPress={() => console.log('View all vouches')}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingVertical: 4 })}
                >
                  <Text style={{ ...TYPOGRAPHY.bodyMBold, color: COLORS.primary, textAlign: 'center' }}>
                    View all {vouches} vouches
                  </Text>
                </Pressable>
              )}
            </View>
          )}

        </View>
      </ScrollView>
      )}

      {/* ── Request to Connect Modal ── */}
      <RequestConnectModal
        visible={connectModalVisible}
        name={name}
        company={company}
        role={role || trade}
        avatarColor={avatarColor}
        nudgeText={showConnectNudge ? 'Verified profiles get 3x more connection accepts' : undefined}
        onClose={() => setConnectModalVisible(false)}
        onSend={handleSendConnect}
      />

      {/* ── Invite to Job Modal ── */}
      <InviteToJobModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        contractor={inviteContractor}
        onCreateNewJob={() => {
          console.log('Navigate to PostJobWizard for', name);
        }}
        onInviteSent={(jobId, contractorId, message) => {
          console.log('Invite sent from ProProfile:', { jobId, contractorId, message });
        }}
      />
    </SafeAreaView>
  );
};

export default ProProfile;
