// ProProfile.tsx
// ═══════════════════════════════════════════════════════════════
// Pro Profile Screen — Reusable for Contractors, Partners, etc.
// Navigated from: FindTab cards, NetworkTab contacts, bid cards
// Conditional rendering:
//   - is_own_profile: shows "Edit Profile" gear, hides CTAs
//   - is_connected: shows "Message" instead of "Request to Connect"
//   - role-specific stats via performance_stats prop
//   - Portfolio Gallery: role-gated for Contractor, Home Stager,
//     Real Estate Photographer (appears after profile card,
//     before performance stats)
//
// Session 18: Skeleton profile detection — when navigated from
// vouch feed (minimal data), falls back to MOCK_PRO_PROFILE.
// Production: Replace with Supabase query using profile.id:
//   supabase.from('profiles').select('*, vouches(*), performance(*), portfolio_photos(*)').eq('id', proId)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import PortfolioGallery from './PortfolioGallery';
import RequestConnectModal from './RequestConnectModal';
import InviteToJobModal from './InviteToJobModal';
import type { InviteContractor } from './InviteToJobModal';

// ─────────────────────────────────────────────
// EXPORTED TYPES — Reusable across app
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
  /** Up to 2 secondary trade specialties — e.g., ['HVAC', 'Lighting']
   *  Additional capabilities beyond the primary trade.
   *  Displayed as highlighted tag pills on profile.
   *  Only applicable to job-eligible roles (Contractor, Home Stager, RE Photographer). */
  secondary_trades?: string[];
  licensed: string;
  distance: string;
  bio: string;
  avatarColor: string;
  performance_stats: PerformanceStats;
  tags: string[];
  recent_vouches: VouchEntry[];
  is_connected: boolean;
  is_own_profile: boolean;
  /** Portfolio photo URLs — max 8, used by PortfolioGallery */
  portfolio_photos: string[];
}

// ─────────────────────────────────────────────
// MOCK DATA (used for demo / dev)
// Production: fetched via route params or API call
// ─────────────────────────────────────────────

// Stock photos for demo portfolio — real contractor work images
const MOCK_PORTFOLIO_PHOTOS: string[] = [
  'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&h=600&fit=crop', // electrical panel
  'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=800&h=600&fit=crop', // wiring work
  'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=600&fit=crop', // renovation
  'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&h=600&fit=crop', // tools
  'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=600&fit=crop', // home interior
  'https://images.unsplash.com/photo-1523413363574-c30aa1c2a516?w=800&h=600&fit=crop', // construction
  'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&h=600&fit=crop', // living room
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop', // kitchen
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

const WrenchStatIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M12.25 5.25a.83.83 0 0 0 0 1.17l1.33 1.33a.83.83 0 0 0 1.17 0l3.14-3.14A5 5 0 0 1 11.27 11.23l-5.76 5.76a1.77 1.77 0 0 1-2.5-2.5l5.76-5.76a5 5 0 0 1 6.62-6.62l-3.14 3.14Z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ClockStatIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={8.33} stroke={COLORS.primary} strokeWidth={2} />
    <Path d="M10 5V10L13.33 11.67" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" />
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
// VOUCH ROW
// ─────────────────────────────────────────────

const VouchRow: React.FC<{ vouch: VouchEntry }> = ({ vouch }) => {
  const initial = vouch.name.charAt(0).toUpperCase();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
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
        <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.darkText, lineHeight: 20 }}>
          {vouch.name}
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '400', fontStyle: 'italic', color: COLORS.secondaryText, lineHeight: 20 }}>
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

  // Session 18: Detect skeleton profiles (e.g., from vouch feed tap)
  // and fall back to MOCK_PRO_PROFILE for demo purposes.
  // A skeleton profile has no bio — full profiles from FindTab/NetworkTab
  // always have bio populated via their respective mappers.
  // Production: fetch fresh data via useProfile(rawProfile.id) hook.
  const rawProfile: ProProfileData | undefined = (route.params as any)?.profile;
  const profile: ProProfileData = rawProfile?.bio ? rawProfile : MOCK_PRO_PROFILE;

  const {
    name,
    company,
    location,
    rating,
    vouches,
    active_since,
    role,
    trade,
    secondary_trades,
    licensed,
    distance,
    bio,
    avatarColor,
    performance_stats,
    tags,
    recent_vouches,
    is_connected,
    is_own_profile,
    portfolio_photos,
  } = profile;

  // ── Request to Connect modal state ──
  const [connectModalVisible, setConnectModalVisible] = useState<boolean>(false);

  // ── Invite to Job modal state ──
  const [inviteModalVisible, setInviteModalVisible] = useState<boolean>(false);

  const handleRequestConnect = () => {
    setConnectModalVisible(true);
  };

  const handleSendConnect = (message: string) => {
    console.log('📤 Connection request sent to:', name);
    console.log('Message:', message || '(no message)');
    // TODO: TanStack Query mutation → Supabase RPC rpc_send_connection_request
    setConnectModalVisible(false);
  };

  // Build InviteContractor from profile data — combine primary + secondary trades
  // for job matching in InviteToJobModal. Falls back to tags for non-contractor roles.
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          HEADER: Back ← Name → Gear/Share
          ══════════════════════════════════════════ */}
      <View
        style={{
          height: 48,
          paddingHorizontal: 16,
          backgroundColor: COLORS.background,
          borderBottomWidth: 0.68,
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
            width: 40,
            height: 40,
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
            style={{
              fontSize: 16,
              fontWeight: '500',
              color: COLORS.darkText,
              lineHeight: 36,
              letterSpacing: 0.07,
            }}
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
              width: 40,
              height: 40,
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
              } catch (e) {
                console.log('Share cancelled or failed');
              }
            }}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
      >
        <View style={{ paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, gap: 16 }}>

          {/* ── PROFILE CARD ── */}
          <View
            style={{
              padding: 24,
              backgroundColor: COLORS.background,
              borderRadius: 16,
              gap: 24,
            }}
          >
            {/* Avatar + Identity */}
            <View style={{ gap: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <AvatarPlaceholder name={name} color={avatarColor} size={120} />
              </View>

              <View style={{ gap: 12 }}>
                <View style={{ paddingHorizontal: 25, alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: '700',
                      color: COLORS.darkText,
                      lineHeight: 36,
                      letterSpacing: 0.07,
                      textAlign: 'center',
                    }}
                  >
                    {name}
                  </Text>
                </View>

                <View style={{ alignItems: 'center' }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '400',
                      color: COLORS.bodyText,
                      lineHeight: 20,
                      textAlign: 'center',
                    }}
                  >
                    {company} • {location}
                  </Text>
                </View>

                {/* Info pills */}
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 12 }}>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: COLORS.chipBg,
                        borderRadius: 9999,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.statText, lineHeight: 20 }}>
                        {rating} ★
                      </Text>
                      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.statText, lineHeight: 20 }}>
                        {vouches} Vouches
                      </Text>
                    </View>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: COLORS.chipBg,
                        borderRadius: 9999,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.statText, lineHeight: 20 }}>
                        Active Since {active_since}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                    {/* Primary Trade + License chip */}
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: COLORS.chipBg,
                        borderRadius: 9999,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>
                        {trade}
                      </Text>
                      {licensed ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <ShieldCheckIcon />
                          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.statText, lineHeight: 20 }}>
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
                          borderRadius: 9999,
                          borderWidth: 0.68,
                          borderColor: 'rgba(0, 61, 195, 0.35)',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.primary, lineHeight: 20 }}>
                          {st}
                        </Text>
                      </View>
                    ))}
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        backgroundColor: COLORS.chipBg,
                        borderRadius: 9999,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <LocationPinSmallIcon />
                      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.statText, lineHeight: 20 }}>
                        {distance}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Bio */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '400',
                color: COLORS.statText,
                lineHeight: 20,
                textAlign: 'center',
              }}
            >
              {bio}
            </Text>

            {/* ── CTAs ──
                - is_own_profile → "Edit Profile" button only
                - Job-eligible roles (Contractor, Home Stager, Real Estate Photographer):
                    → "Invite to Job" + "Request to Connect" (or "Message" if connected)
                - All other partner roles:
                    → "Message" + "Request to Connect" (or just "Message" if connected)
            */}
            {(() => {
              // Roles that participate in the job bidding flow
              const JOB_ELIGIBLE_ROLES = ['Contractor', 'Home Stager', 'Real Estate Photographer'];
              const isJobEligible = JOB_ELIGIBLE_ROLES.some(
                (r) => r.toLowerCase() === (role || '').toLowerCase()
              );

              if (is_own_profile) {
                return (
                  <View style={{ gap: 16 }}>
                    <Pressable
                      onPress={() => console.log('Navigate to Edit Profile')}
                      style={({ pressed }) => ({
                        height: 48,
                        paddingHorizontal: 16,
                        backgroundColor: COLORS.primary,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20, textAlign: 'center' }}>
                        Edit Profile
                      </Text>
                    </Pressable>
                  </View>
                );
              }

              return (
                <View style={{ gap: 16 }}>
                  {/* Top button: "Invite to Job" for job-eligible roles, "Message" for partners */}
                  {isJobEligible ? (
                    <Pressable
                      onPress={handleInviteToJob}
                      style={({ pressed }) => ({
                        height: 48,
                        paddingHorizontal: 16,
                        backgroundColor: COLORS.background,
                        borderRadius: 8,
                        borderWidth: 0.69,
                        borderColor: COLORS.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20, textAlign: 'center' }}>
                        Invite to Job
                      </Text>
                    </Pressable>
                  ) : (
                    is_connected && (
                      <Pressable
                        onPress={() => console.log('Navigate to chat with:', name)}
                        style={({ pressed }) => ({
                          height: 48,
                          paddingHorizontal: 16,
                          backgroundColor: COLORS.background,
                          borderRadius: 8,
                          borderWidth: 0.69,
                          borderColor: COLORS.primary,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.85 : 1,
                        })}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20, textAlign: 'center' }}>
                          Message
                        </Text>
                      </Pressable>
                    )
                  )}

                  {/* Bottom button: "Message" (if connected + job-eligible) or "Request to Connect" */}
                  <Pressable
                    onPress={() =>
                      is_connected
                        ? console.log('Navigate to chat with:', name)
                        : handleRequestConnect()
                    }
                    style={({ pressed }) => ({
                      height: 48,
                      paddingHorizontal: 16,
                      backgroundColor: COLORS.primary,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20, textAlign: 'center' }}>
                      {is_connected ? 'Message' : 'Request to Connect'}
                    </Text>
                  </Pressable>
                </View>
              );
            })()}
          </View>

          {/* ══════════════════════════════════════════
              PORTFOLIO GALLERY — Role-gated
              Only renders for: Contractor, Home Stager,
              Real Estate Photographer
              Placement: after profile card, before stats
              ══════════════════════════════════════════ */}
          <PortfolioGallery
            photos={portfolio_photos}
            isOwnProfile={is_own_profile}
            role={role}
            onAddPhoto={() => {
              // Production: Launch image picker → upload to Supabase Storage
              // → insert URL into portfolio_photos table
              console.log('Open image picker for portfolio upload');
            }}
            onRemovePhoto={(index) => {
              // Production: Delete from Supabase Storage + DB
              console.log('Remove portfolio photo at index:', index);
            }}
          />

          {/* ── PERFORMANCE STATS ── */}
          <View style={{ gap: 12 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.darkText,
                lineHeight: 24,
                paddingLeft: 24,
              }}
            >
              Performance Stats
            </Text>

            <View
              style={{
                padding: 16,
                backgroundColor: COLORS.background,
                borderRadius: 16,
                gap: 12,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <WrenchStatIcon />
                    <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.primary, lineHeight: 28, textAlign: 'center' }}>
                      {performance_stats.completed_jobs}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16, textAlign: 'center' }}>
                    Repair Jobs{'\n'}Won
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <ClockStatIcon />
                    <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.primary, lineHeight: 28, textAlign: 'center' }}>
                      {performance_stats.on_time_rate}%
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16, textAlign: 'center' }}>
                    On Time{'\n'}Completion Rate
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <LightningStatIcon />
                    <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.primary, lineHeight: 28, textAlign: 'center' }}>
                      {performance_stats.avg_response}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16, textAlign: 'center' }}>
                    Avg. Response{'\n'}Time
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── TAGS + RECENT VOUCHES ── */}
          <View
            style={{
              padding: 24,
              backgroundColor: COLORS.background,
              borderRadius: 16,
              borderBottomWidth: 0.68,
              borderBottomColor: COLORS.border,
              gap: 16,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {tags.map((tag) => (
                <View
                  key={tag}
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    backgroundColor: COLORS.background,
                    borderRadius: 9999,
                    borderWidth: 0.68,
                    borderColor: COLORS.primary,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.primary, lineHeight: 16, textAlign: 'center' }}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>

            <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.darkText, lineHeight: 24 }}>
              Recent Vouches
            </Text>

            <View style={{ gap: 16 }}>
              {recent_vouches.map((vouch) => (
                <VouchRow key={vouch.id} vouch={vouch} />
              ))}
            </View>
          </View>

        </View>
      </ScrollView>

      {/* ── Request to Connect Modal ── */}
      <RequestConnectModal
        visible={connectModalVisible}
        name={name}
        company={company}
        role={role || trade}
        avatarColor={avatarColor}
        onClose={() => setConnectModalVisible(false)}
        onSend={handleSendConnect}
      />

      {/* ── Invite to Job Modal ── */}
      <InviteToJobModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        contractor={inviteContractor}
        onCreateNewJob={() => {
          // TODO: Navigate to PostJobWizard with contractor pre-attached
          // navigation.navigate('PostJob', { inviteContractor });
          console.log('Navigate to PostJobWizard for', name);
        }}
        onInviteSent={(jobId, contractorId, message) => {
          // TODO: Invalidate TanStack queries after invite
          console.log('Invite sent from ProProfile:', { jobId, contractorId, message });
        }}
      />
    </SafeAreaView>
  );
};

export default ProProfile;
