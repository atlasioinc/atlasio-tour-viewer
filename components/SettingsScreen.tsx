// SettingsScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Settings — Account management, notifications, preferences (434 lines)
//
// Entry point: ProfileTab gear icon → navigation.navigate('Settings')
//
// Architecture:
//   - Pushed screen in ProfileStack (slide_from_right)
//   - Header: 48px, "Settings" centered title, back arrow left
//   - Sections separated by screenBg gaps
//   - Toggle rows for notification preferences
//   - Placeholder rows for future features
//
// TODO (Production):
//   - Wire notification toggles to Supabase user_preferences table
//   - Log Out wired to supabase.auth.signOut() (S48) — App.tsx handles routing
//   - Wire Delete Account to Supabase RPC with cascade + auth delete
//   - Wire Change Password to Supabase auth.updateUser()
//   - Wire Help/Support/Terms/Privacy to WebView or deep links
//   - Wire profile visibility to Supabase profiles.is_visible
//   - Wire default sort to Supabase user_preferences.default_sort
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SHADOWS } from '../lib/tokens';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackArrowIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M19 12H5" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 19L5 12L12 5" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRightIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M6 4L10 8L6 12" stroke={COLORS.lightText} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// SORT OPTIONS (mirrors FindTab)
// ─────────────────────────────────────────────

const SORT_OPTIONS = ['Most Vouched', 'Highest Rated', 'Nearest'];

// ─────────────────────────────────────────────
// REUSABLE ROW COMPONENTS
// ─────────────────────────────────────────────

/** Section header */
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 }}>
    <Text style={{ ...TYPOGRAPHY.sectionB, color: COLORS.bodyText }}>
      {title}
    </Text>
  </View>
);

/** Toggle row — switch on the right */
const ToggleRow: React.FC<{
  label: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  isLast?: boolean;
}> = ({ label, value, onValueChange, isLast = false }) => (
  <View
    style={{
      height: 52,
      paddingHorizontal: 16,
      backgroundColor: COLORS.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: isLast ? 0 : DIMENSIONS.headerBorderWidth,
      borderBottomColor: COLORS.cardBorder,
    }}
  >
    <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.darkText, flex: 1 }}>{label}</Text>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#D1D5DC', true: COLORS.primary }}
      thumbColor="#FFFFFF"
      ios_backgroundColor="#D1D5DC"
    />
  </View>
);

/** Pressable row — chevron on the right */
const NavRow: React.FC<{
  label: string;
  value?: string;
  onPress: () => void;
  isLast?: boolean;
  textColor?: string;
}> = ({ label, value, onPress, isLast = false, textColor = COLORS.darkText }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      height: 52,
      paddingHorizontal: 16,
      backgroundColor: COLORS.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: isLast ? 0 : DIMENSIONS.headerBorderWidth,
      borderBottomColor: COLORS.cardBorder,
      opacity: pressed ? 0.6 : 1,
    })}
  >
    <Text style={{ ...TYPOGRAPHY.bodyM, color: textColor }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      {value && (
        <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText }}>{value}</Text>
      )}
      <ChevronRightIcon />
    </View>
  </Pressable>
);

/** Info row — non-interactive, displays a value */
const InfoRow: React.FC<{
  label: string;
  value: string;
  isLast?: boolean;
}> = ({ label, value, isLast = false }) => (
  <View
    style={{
      height: 52,
      paddingHorizontal: 16,
      backgroundColor: COLORS.background,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: isLast ? 0 : DIMENSIONS.headerBorderWidth,
      borderBottomColor: COLORS.cardBorder,
    }}
  >
    <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.darkText }}>{label}</Text>
    <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.secondaryText }}>{value}</Text>
  </View>
);

/** Sort pill selector */
const SortPills: React.FC<{
  options: string[];
  selected: string;
  onSelect: (option: string) => void;
}> = ({ options, selected, onSelect }) => (
  <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 }}>
    {options.map((option) => {
      const isActive = selected === option;
      return (
        <Pressable
          key={option}
          onPress={() => onSelect(option)}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: DIMENSIONS.pillRadius,
            backgroundColor: isActive ? COLORS.primary : COLORS.chipBg,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text
            style={{
              ...TYPOGRAPHY.bodyS,
              fontWeight: isActive ? '500' : '400',
              color: isActive ? '#FFFFFF' : COLORS.bodyText,
            }}
          >
            {option}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();

  // ── Notification Preferences ──
  // TODO: Wire to Supabase user_preferences table
  const [notifNewBid, setNotifNewBid] = useState(true);
  const [notifBidAccepted, setNotifBidAccepted] = useState(true);
  const [notifConnectionRequest, setNotifConnectionRequest] = useState(true);
  const [notifNewVouch, setNotifNewVouch] = useState(true);
  const [notifDealChat, setNotifDealChat] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  // ── Preferences ──
  // TODO: Wire to Supabase profiles.is_visible and user_preferences.default_sort
  const [profileVisible, setProfileVisible] = useState(true);
  const [defaultSort, setDefaultSort] = useState('Most Vouched');

  // ── Auth Email ──
  // @backend reads from live Supabase auth session (supabase.auth.getUser)
  // Replaces hardcoded mock 'tony@atlasio.com'
  const [userEmail, setUserEmail] = useState<string>('—');

  useEffect(() => {
    const fetchEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setUserEmail(user.email);
    };
    fetchEmail();
  }, []);

  // ── Handlers ──
  const handleLogOut = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            // @backend: supabase.auth.signOut
            // App.tsx onAuthStateChange handles routing to LoginScreen automatically
            await supabase.auth.signOut();
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data, connections, jobs, and vouches will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete My Account',
          style: 'destructive',
          onPress: () => {
            // TODO: Wire to Supabase RPC with cascading deletes + auth deletion
            console.log('──── DELETE ACCOUNT ────');
            console.log('Account deletion requested');
            console.log('────────────────────────');
            Alert.alert('Account Scheduled for Deletion', 'Your account will be deleted within 30 days. Contact support to cancel.');
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ═══════════════════════════════════════
          HEADER
          ═══════════════════════════════════════ */}
      <View
        style={{
          height: DIMENSIONS.headerHeight,
          backgroundColor: COLORS.background,
          borderBottomWidth: DIMENSIONS.headerBorderWidth,
          borderBottomColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
        }}
      >
        {/* Left bookend — 60px */}
        <View style={{ width: 60, alignItems: 'flex-start' }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <BackArrowIcon />
          </Pressable>
        </View>

        {/* Center title */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ ...TYPOGRAPHY.headingM, color: COLORS.primary }}>
            Settings
          </Text>
        </View>

        {/* Right bookend — 60px */}
        <View style={{ width: 60 }} />
      </View>

      {/* ═══════════════════════════════════════
          SCROLLABLE CONTENT
          ═══════════════════════════════════════ */}
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ── ACCOUNT ── */}
        <SectionHeader title="Account" />
        <View style={{ backgroundColor: COLORS.background }}>
          {/* @backend email read from supabase.auth.getUser() on mount */}
          <InfoRow label="Email" value={userEmail} />
          <NavRow
            label="Change Password"
            onPress={() => {
              // TODO: Wire to Supabase auth.updateUser() flow
              console.log('Change Password tapped');
              Alert.alert('Coming Soon', 'Password change will be available in the next update.');
            }}
            isLast
          />
        </View>

        {/* ── NOTIFICATIONS ── */}
        <SectionHeader title="Notifications" />
        <View style={{ backgroundColor: COLORS.background }}>
          <ToggleRow label="New bid received" value={notifNewBid} onValueChange={setNotifNewBid} />
          <ToggleRow label="Bid accepted / countered" value={notifBidAccepted} onValueChange={setNotifBidAccepted} />
          <ToggleRow label="New connection request" value={notifConnectionRequest} onValueChange={setNotifConnectionRequest} />
          <ToggleRow label="New vouch received" value={notifNewVouch} onValueChange={setNotifNewVouch} />
          <ToggleRow label="Deal chat messages" value={notifDealChat} onValueChange={setNotifDealChat} />
          <ToggleRow label="Marketing & updates" value={notifMarketing} onValueChange={setNotifMarketing} isLast />
        </View>

        {/* ── PREFERENCES ── */}
        <SectionHeader title="Preferences" />
        <View style={{ backgroundColor: COLORS.background }}>
          <ToggleRow
            label="Profile visible to all"
            value={profileVisible}
            onValueChange={setProfileVisible}
            isLast
          />
        </View>

        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text style={{ ...TYPOGRAPHY.bodyMBold, color: COLORS.darkText, paddingBottom: 8 }}>Default Sort</Text>
        </View>
        <View style={{ backgroundColor: COLORS.background, paddingVertical: 4 }}>
          <SortPills options={SORT_OPTIONS} selected={defaultSort} onSelect={setDefaultSort} />
        </View>

        {/* ── SUPPORT ── */}
        <SectionHeader title="Support" />
        <View style={{ backgroundColor: COLORS.background }}>
          <NavRow
            label="Help Center"
            onPress={() => {
              // TODO: Wire to WebView or deep link
              console.log('Help Center tapped');
            }}
          />
          <NavRow
            label="Contact Support"
            onPress={() => {
              // TODO: Wire to email or in-app support
              console.log('Contact Support tapped');
            }}
          />
          <NavRow
            label="Terms of Service"
            onPress={() => {
              // TODO: Wire to WebView
              console.log('Terms of Service tapped');
            }}
          />
          <NavRow
            label="Privacy Policy"
            onPress={() => {
              // TODO: Wire to WebView
              console.log('Privacy Policy tapped');
            }}
            isLast
          />
        </View>

        {/* ── DANGER ZONE ── */}
        <SectionHeader title="Danger Zone" />
        <View style={{ backgroundColor: COLORS.background, gap: 0 }}>
          {/* Log Out Button */}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Pressable
              onPress={handleLogOut}
              style={({ pressed }) => ({
                height: DIMENSIONS.buttonModalHeight,
                borderRadius: DIMENSIONS.buttonRadius,
                borderWidth: 1,
                borderColor: COLORS.errorRed,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ ...TYPOGRAPHY.bodyLMedium, color: COLORS.errorRed }}>
                Log Out
              </Text>
            </Pressable>
          </View>

          {/* Delete Account */}
          <Pressable
            onPress={handleDeleteAccount}
            style={({ pressed }) => ({
              paddingVertical: 12,
              alignItems: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Text style={{ ...TYPOGRAPHY.bodyM, color: COLORS.errorRed }}>
              Delete Account
            </Text>
          </Pressable>
        </View>

        {/* App Version */}
        <View style={{ alignItems: 'center', paddingTop: 24, paddingBottom: 16 }}>
          <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.lightText }}>
            Atlasio v1.0.0 (Build 1)
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SettingsScreen;
