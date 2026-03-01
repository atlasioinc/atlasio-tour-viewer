// ProfileTab.tsx
// ═══════════════════════════════════════════════════════════════
// Profile Tab — Agent View
// Sections: Profile Card, Performance Stats
// Edit modal: Change photo + edit bio (400 char limit)
// Designed as reusable base — Partner/Contractor variants
// will extend with different performance metrics
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useMyProfile } from '../hooks/useData';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const COLORS = {
  primary: '#003DC3',
  background: '#FFFFFF',
  screenBg: '#F7F7FC',
  darkText: '#1C1C1E',
  headingText: '#101828',
  bodyText: '#4A5565',
  statText: '#364153',
  secondaryText: '#666666',
  mutedText: '#6A7282',
  border: '#E5E7EB',
  cardBorder: '#F3F4F6',
  tagBg: '#F3F4F6',
  inputBg: '#F9FAFB',
  errorRed: '#FB2C36',
} as const;

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const SettingsIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke={COLORS.bodyText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.258 9.77251 19.9887C9.5799 19.7194 9.31074 19.5143 9 19.4C8.69838 19.2669 8.36381 19.2272 8.03941 19.286C7.71502 19.3448 7.41568 19.4995 7.18 19.73L7.12 19.79C6.93425 19.976 6.71368 20.1235 6.47088 20.2241C6.22808 20.3248 5.96783 20.3766 5.705 20.3766C5.44217 20.3766 5.18192 20.3248 4.93912 20.2241C4.69632 20.1235 4.47575 19.976 4.29 19.79C4.10405 19.6043 3.95653 19.3837 3.85588 19.1409C3.75523 18.8981 3.70343 18.6378 3.70343 18.375C3.70343 18.1122 3.75523 17.8519 3.85588 17.6091C3.95653 17.3663 4.10405 17.1457 4.29 16.96L4.35 16.9C4.58054 16.6643 4.73519 16.365 4.794 16.0406C4.85282 15.7162 4.81312 15.3816 4.68 15.08C4.55324 14.7842 4.34276 14.532 4.07447 14.3543C3.80618 14.1766 3.49179 14.0813 3.17 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08C1 11.5496 1.21071 11.0409 1.58579 10.6658C1.96086 10.2907 2.46957 10.08 3 10.08H3.09C3.42099 10.0723 3.74197 9.96512 4.01118 9.77251C4.28038 9.5799 4.48571 9.31074 4.6 9C4.73312 8.69838 4.77282 8.36381 4.714 8.03941C4.65519 7.71502 4.50054 7.41568 4.27 7.18L4.21 7.12C4.02405 6.93425 3.87653 6.71368 3.77588 6.47088C3.67523 6.22808 3.62343 5.96783 3.62343 5.705C3.62343 5.44217 3.67523 5.18192 3.77588 4.93912C3.87653 4.69632 4.02405 4.47575 4.21 4.29C4.39575 4.10405 4.61632 3.95653 4.85912 3.85588C5.10192 3.75523 5.36217 3.70343 5.625 3.70343C5.88783 3.70343 6.14808 3.75523 6.39088 3.85588C6.63368 3.95653 6.85425 4.10405 7.04 4.29L7.1 4.35C7.33568 4.58054 7.63502 4.73519 7.95941 4.794C8.28381 4.85282 8.61838 4.81312 8.92 4.68H9C9.29577 4.55324 9.54802 4.34276 9.72569 4.07447C9.90337 3.80618 9.99872 3.49179 10 3.17V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73312 15.6362 4.77282 15.9606 4.714C16.285 4.65519 16.5843 4.50054 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke={COLORS.bodyText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShareIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M2.67 8V13.33C2.67 13.69 2.81 14.03 3.07 14.27C3.33 14.51 3.67 14.67 4 14.67H12C12.35 14.67 12.69 14.51 12.93 14.27C13.17 14.03 13.33 13.69 13.33 13.33V8" stroke={COLORS.primary} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M10.67 4L8 1.33L5.33 4" stroke={COLORS.primary} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M8 1.33V10" stroke={COLORS.primary} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// PROFILE AVATAR (with optional photo)
// ─────────────────────────────────────────────

const ProfileAvatar: React.FC<{ photoUri?: string; size?: number }> = ({ photoUri, size = 120 }) => {
  if (photoUri) {
    return (
      <View style={{ width: size, height: size, borderRadius: 9999, overflow: 'hidden', backgroundColor: COLORS.primary }}>
        {/* In production, use <Image source={{ uri: photoUri }} /> */}
        <View style={{ width: size, height: size, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: '#FFFFFF' }}>JD</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.35, fontWeight: '700', color: '#FFFFFF' }}>JD</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// MOCK SPARKLINE (simple network growth chart)
// ─────────────────────────────────────────────

const Sparkline: React.FC = () => (
  <View style={{ height: 60 }}>
    <Svg width="100%" height={40} viewBox="0 0 329 20" preserveAspectRatio="none">
      <Path
        d="M5 18 L82 14 L164 10 L246 6 L324 2"
        stroke={COLORS.primary}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
    <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 4 }}>
      {['Aug', 'Sep', 'Oct', 'Nov'].map((m) => (
        <Text key={m} style={{ fontSize: 10, fontWeight: '400', color: COLORS.secondaryText, textAlign: 'center' }}>{m}</Text>
      ))}
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ProfileTab: React.FC = () => {
  const navigation = useNavigation<any>();

  // Live profile hook (runs even in mock mode to keep cache warm)
  const { data: liveProfile } = useMyProfile();

  // ── Profile State ──
  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(undefined);
  const mockBio = 'Specializing in first-time buyers and investor flips. Fast closings, bilingual Spanish/English. Known for strong local connections and helping clients navigate complex deals with ease.';
  const [bio, setBio] = useState(mockBio);
  const [profileVisible, setProfileVisible] = useState(true);

  // ── Specialties & Languages ──
  const specialties = FEATURE_FLAGS.USE_MOCK_DATA
    ? ['Residential', 'First-Time Buyers', 'Investment']
    : (liveProfile?.specialties ?? ['Residential', 'First-Time Buyers', 'Investment']);
  const languages = FEATURE_FLAGS.USE_MOCK_DATA ? ['English', 'Spanish'] : ['English', 'Spanish'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── Header ── */}
      <View style={{ height: 48, backgroundColor: COLORS.background, justifyContent: 'center', borderBottomWidth: 0.68, borderBottomColor: COLORS.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, lineHeight: 28 }}>My Profile</Text>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={12}
            style={({ pressed }) => ({ position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
          >
            <SettingsIcon />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32, paddingHorizontal: 16, gap: 16 }}
      >
        {/* ══════════════════════════════════════════
            PROFILE CARD
            ══════════════════════════════════════════ */}
        <View
          style={{
            padding: 24,
            backgroundColor: COLORS.background,
            borderRadius: 16,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 3,
            elevation: 2,
            gap: 12,
          }}
        >
          {/* Avatar */}
          <View style={{ alignItems: 'center' }}>
            <ProfileAvatar photoUri={profilePhoto} />
          </View>

          {/* Name */}
          <Text style={{ textAlign: 'center', color: COLORS.darkText, fontSize: 24, fontWeight: '700', lineHeight: 36, letterSpacing: 0.07 }}>
            John Doe – REALTOR®
          </Text>

          {/* Company + Location */}
          <Text style={{ textAlign: 'center', color: COLORS.bodyText, fontSize: 14, fontWeight: '400', lineHeight: 20 }}>
            {'Keller Williams • MLS #123456\nDenver, CO'}
          </Text>

          {/* Stats pills */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
            <View style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.tagBg, borderRadius: 9999, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: COLORS.statText, fontSize: 14, fontWeight: '400', lineHeight: 20 }}>4.9 ★</Text>
              <Text style={{ color: COLORS.statText, fontSize: 14, fontWeight: '400', lineHeight: 20 }}>128 Vouches</Text>
            </View>
            <View style={{ paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.tagBg, borderRadius: 9999 }}>
              <Text style={{ color: COLORS.statText, fontSize: 14, fontWeight: '400', lineHeight: 20 }}>Active Since 2022</Text>
            </View>
          </View>

          {/* Bio */}
          <Text style={{ textAlign: 'center', color: COLORS.statText, fontSize: 14, fontWeight: '400', lineHeight: 22.75 }}>
            {bio}
          </Text>

          {/* Specialties & Languages pills */}
          {(specialties.length > 0 || languages.length > 0) && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
              {specialties.map((item) => (
                <View
                  key={item}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 9999,
                    backgroundColor: COLORS.tagBg,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.statText, lineHeight: 18 }}>
                    {item}
                  </Text>
                </View>
              ))}
              {languages.map((item) => (
                <View
                  key={item}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 7,
                    borderRadius: 9999,
                    backgroundColor: COLORS.tagBg,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.statText, lineHeight: 18 }}>
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Visibility toggle */}
          <View style={{ height: 52, paddingLeft: 16, paddingRight: 16, backgroundColor: COLORS.inputBg, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.statText, lineHeight: 20 }}>
              Profile Visible to: <Text style={{ fontWeight: '500' }}>All Agents</Text>
            </Text>
            <View style={{ width: 51, height: 31, alignItems: 'center', justifyContent: 'center' }}>
              <Switch
                value={profileVisible}
                onValueChange={setProfileVisible}
                trackColor={{ false: '#D1D5DC', true: COLORS.primary }}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#D1D5DC"
              />
            </View>
          </View>

          {/* Edit Profile button */}
          <Pressable
            onPress={() => navigation.navigate('EditProfile', { role: 'agent' })}
            style={({ pressed }) => ({
              height: 48,
              backgroundColor: COLORS.primary,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500', lineHeight: 20, textAlign: 'center' }}>
              Edit Profile
            </Text>
          </Pressable>

          {/* Share Profile */}
          <Pressable
            onPress={() => console.log('Share profile tapped')}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <ShareIcon />
            <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '500', lineHeight: 20, textAlign: 'center' }}>
              Share Profile
            </Text>
          </Pressable>
        </View>

        {/* ══════════════════════════════════════════
            PERFORMANCE STATS
            ══════════════════════════════════════════ */}
        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.darkText, lineHeight: 24 }}>
            Performance Stats
          </Text>

          {/* Repair Jobs card */}
          <View
            style={{
              padding: 16,
              backgroundColor: COLORS.background,
              borderRadius: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.headingText, lineHeight: 20 }}>
              Repair Jobs
            </Text>
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                Repair Jobs Posted: <Text style={{ fontWeight: '500', color: COLORS.headingText }}>14</Text>
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                Repair Jobs Completed: <Text style={{ fontWeight: '500', color: COLORS.headingText }}>14</Text>
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                Avg Bids: <Text style={{ fontWeight: '500', color: COLORS.headingText }}>4 per job</Text>
              </Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.mutedText, lineHeight: 16 }}>
            Visible only to you
          </Text>

          {/* Top Partners card */}
          <View
            style={{
              padding: 16,
              backgroundColor: COLORS.background,
              borderRadius: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.headingText, lineHeight: 20 }}>
              Top Partners
            </Text>
            <View style={{ gap: 12 }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.headingText, lineHeight: 20 }}>Alex Chen</Text>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.bodyText, lineHeight: 16 }}>Lender, 22 deals</Text>
              </View>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.headingText, lineHeight: 20 }}>Sarah Miller</Text>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.bodyText, lineHeight: 16 }}>Title, 18 deals</Text>
              </View>
            </View>
          </View>

          {/* Network Growth card */}
          <View
            style={{
              padding: 16,
              backgroundColor: COLORS.background,
              borderRadius: 16,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 3,
              elevation: 2,
              gap: 12,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.headingText, lineHeight: 20 }}>Network Growth</Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>+12 connections this month</Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 16 }}>45% from Find tab</Text>
            </View>
            <Sparkline />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileTab;