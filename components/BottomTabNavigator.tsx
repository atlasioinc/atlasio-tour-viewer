// ═══════════════════════════════════════════════════════════════
// components/BottomTabNavigator.tsx
// Bottom Tab Navigation — role-branching tab bar for main app
//
// Receives { role } via route params from App.tsx after auth.
// Renders different tab configurations based on user role.
//
// ─────────────────────────────────────────────
// TAB LAYOUT BY ROLE:
//   Agent:      Home | Find | Network | Inbox | Profile
//   Contractor: Home | Jobs | Inbox | Profile
//
//   Home     — agent: HomeStack (repair jobs, posting)
//              contractor: ContractorHomeStackScreen (job feed, bid)
//   Find     — agent only: FindStack (search pros)
//   Network  — agent only: NetworkStack (connections, squads)
//   Jobs     — contractor only: ContractorJobsStackScreen (job tracker)
//   Inbox    — agent: InboxStack (chat threads)
//              contractor: ContractorInboxStackScreen (chat)
//   Profile  — both roles: ProfileStack (7-zone layout, role-conditional content)
// ─────────────────────────────────────────────
//
// TAB BAR HIDING:
//   Certain nested screens (e.g., SendSquad) hide the tab bar.
//   Uses getFocusedRouteNameFromRoute() to detect nested route.
//
// @demo ROLE TOGGLE — Long-press (1s) on Inbox tab icon to switch
//       between Agent and Contractor views. Swaps Home + Inbox screens.
//       Remove DemoRoleContext, DemoRoleProvider, and all @demo blocks
//       when wiring to real auth role from Supabase profiles table.
//
// @backend: supabase.auth.getUser() for realtime subscription userId
// @backend: useRealtimeNotifications keeps notification cache fresh
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef } from 'react';
import { DemoRoleContext, useDemoRole, type DemoRole } from '../lib/demoRoleContext';
import { View, Text, Platform, Pressable, Animated, Vibration } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import HomeStack from './HomeStack';
import type { RouteProp } from '@react-navigation/native';
import FindStack from './FindStack';
import NetworkStack from './NetworkStack';
import InboxStack from './InboxStack';
import ProfileTab from './ProfileTab';
import ProfileStack from './ProfileStack';
import { COLORS } from '../lib/tokens';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useRealtimeNotifications } from '../hooks/useRealtime';
import { supabase } from '../lib/supabase';

// @demo — Import contractor screens for role toggle
// Remove these imports when wiring to real auth role
import ContractorHomeTab from './ContractorHomeTab';
// ContractorProfileTab retired in S43 — contractors now use ProfileStack (7-zone layout)
import ContractorInboxList from './ContractorInboxList';
import ContractorJobDetails from './ContractorJobDetails';
import BidSubmissionScreen from './BidSubmissionScreen';
import ProProfile from './ProProfile';
import ChatScreen from './ChatScreen';
import JobTrackerTab from './JobTrackerTab';
import JobCompletionScreen from './JobCompletionScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// @demo — Import partner screens for role toggle (S62)
// @backend PARTNER_TRACK_ENABLED gates entire partner tab branch
// @demo false by default — flip true only when partner onboarding is live
import { PARTNER_TRACK_ENABLED } from '../lib/config';
import HomeTabPartner from '../features/partners/components/HomeTabPartner';
import PartnerDealsScreen from '../features/partners/components/PartnerDealsScreen';

// ─────────────────────────────────────────────
// @demo ROLE TOGGLE CONTEXT
// Shares current demo role across all tabs.
// Production: Replace with auth context role from
//   const { data: profile } = useProfile(auth.uid());
//   const role = profile.role; // 'agent' | 'contractor'
// ─────────────────────────────────────────────

// DemoRole, DemoRoleContext, useDemoRole extracted to lib/demoRoleContext.ts
// to break circular import: ProfileTab → BottomTabNavigator → ProfileStack → ProfileTab

// ─────────────────────────────────────────────
// @demo CONTRACTOR STACKS
// Minimal stack wrappers for contractor screens.
// Production: Build full ContractorHomeStack + ContractorInboxStack
//   with proper navigation routes (BidSubmission, RepairChat, etc.)
// ─────────────────────────────────────────────

const ContractorHomeStackNav = createNativeStackNavigator();

const ContractorHomeStackScreen: React.FC = () => (
  <ContractorHomeStackNav.Navigator screenOptions={{ headerShown: false }}>
    <ContractorHomeStackNav.Screen name="ContractorHomeMain" component={ContractorHomeTab} />
    <ContractorHomeStackNav.Screen
      name="ContractorJobDetails"
      component={ContractorJobDetails}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <ContractorHomeStackNav.Screen
      name="BidSubmission"
      component={BidSubmissionScreen}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <ContractorHomeStackNav.Screen name="ProProfile" component={ProProfile} />
    <ContractorHomeStackNav.Screen
      name="JobCompletion"
      component={JobCompletionScreen as React.ComponentType<any>}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <ContractorHomeStackNav.Screen
      name="ChatScreen"
      component={ChatScreen}
      options={{ presentation: 'fullScreenModal' }}
    />
  </ContractorHomeStackNav.Navigator>
);

const ContractorJobsStackNav = createNativeStackNavigator();

const ContractorJobsStackScreen: React.FC = () => (
  <ContractorJobsStackNav.Navigator screenOptions={{ headerShown: false }}>
    <ContractorJobsStackNav.Screen name="ContractorJobsMain" component={JobTrackerTab} />
    <ContractorJobsStackNav.Screen
      name="ContractorJobDetails"
      component={ContractorJobDetails}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <ContractorJobsStackNav.Screen
      name="BidSubmission"
      component={BidSubmissionScreen}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <ContractorJobsStackNav.Screen
      name="JobCompletion"
      component={JobCompletionScreen as React.ComponentType<any>}
      options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
    />
    <ContractorJobsStackNav.Screen
      name="ChatScreen"
      component={ChatScreen}
      options={{ presentation: 'fullScreenModal' }}
    />
  </ContractorJobsStackNav.Navigator>
);

const ContractorInboxStackNav = createNativeStackNavigator();

const ContractorInboxStackScreen: React.FC = () => (
  <ContractorInboxStackNav.Navigator screenOptions={{ headerShown: false }}>
    <ContractorInboxStackNav.Screen name="ContractorInboxMain" component={ContractorInboxList} />
    <ContractorInboxStackNav.Screen name="ChatScreen" component={ChatScreen} />
  </ContractorInboxStackNav.Navigator>
);

// ─────────────────────────────────────────────
// PLACEHOLDER SCREENS
// Replace these with real screens as you build them
// ─────────────────────────────────────────────

const PlaceholderScreen: React.FC<{ title: string }> = ({ title }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: COLORS.background,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Text
      style={{
        fontSize: 24,
        fontWeight: '600',
        color: COLORS.primary,
      }}
    >
      {title}
    </Text>
    <Text
      style={{
        fontSize: 16,
        color: COLORS.bodyText,
        marginTop: 8,
      }}
    >
      Coming soon
    </Text>
  </View>
);

const FindScreen: React.FC = () => <PlaceholderScreen title="Find" />;
const NetworkScreen: React.FC = () => <PlaceholderScreen title="Network" />;
const ProfileScreen: React.FC = () => <PlaceholderScreen title="Profile" />;

// ─────────────────────────────────────────────
// TAB ICONS
// ─────────────────────────────────────────────

const ACTIVE_COLOR = COLORS.accentBlue;
const INACTIVE_COLOR = COLORS.lightText;

const HomeIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 22V12H15V22"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FindIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle
      cx={11}
      cy={11}
      r={8}
      stroke={color}
      strokeWidth={2}
    />
    <Path
      d="M21 21L16.65 16.65"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const NetworkIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle
      cx={9}
      cy={7}
      r={4}
      stroke={color}
      strokeWidth={2}
    />
    <Path
      d="M2 21V19C2 17.9391 2.42143 16.9217 3.17157 16.1716C3.92172 15.4214 4.93913 15 6 15H12C13.0609 15 14.0783 15.4214 14.8284 16.1716C15.5786 16.9217 16 17.9391 16 19V21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M19 8V14"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
    <Path
      d="M22 11H16"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

const JobsIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path d="M9 12H15" stroke={color} strokeWidth={2} strokeLinecap="round" />
    <Path d="M9 16H13" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const InboxIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 6L12 13L2 6"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const ProfileIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle
      cx={12}
      cy={7}
      r={4}
      stroke={color}
      strokeWidth={2}
    />
    <Path
      d="M5 21V19C5 17.9391 5.42143 16.9217 6.17157 16.1716C6.92172 15.4214 7.93913 15 9 15H15C16.0609 15 17.0783 15.4214 17.8284 16.1716C18.5786 16.9217 19 17.9391 19 19V21"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// @demo ROLE BADGE
// Small indicator on Inbox tab icon showing current role.
// Blue "A" = Agent, Green "C" = Contractor.
// Production: Remove entirely.
// ─────────────────────────────────────────────

const RoleBadge: React.FC<{ role: DemoRole }> = ({ role }) => {
  // @demo — badge color: blue=Agent, green=Contractor, amber=Partner (S62)
  const badgeColor = role === 'agent' ? COLORS.primary : role === 'contractor' ? '#16A34A' : COLORS.warningAmber;
  const badgeLabel = role === 'agent' ? 'A' : role === 'contractor' ? 'C' : 'P';

  return (
    <View
      style={{
        position: 'absolute',
        top: -4,
        right: -10,
        minWidth: 16,
        height: 16,
        borderRadius: 9999,
        backgroundColor: badgeColor,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: COLORS.background,
      }}
    >
      <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFFFFF' }}>
        {badgeLabel}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// @demo LONG-PRESS TAB BUTTON
// Custom tabBarButton wrapper that intercepts long-press (1s)
// on the Inbox tab to toggle role. Normal tap still navigates.
// Haptic feedback on toggle via Vibration API.
// Production: Remove this component. Use default tabBarButton.
// ─────────────────────────────────────────────

const LongPressTabButton: React.FC<{
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress: () => void;
  accessibilityRole?: any;
  accessibilityState?: any;
  style?: any;
}> = ({ children, onPress, onLongPress, style, ...rest }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.85,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={() => {
        Vibration.vibrate(50);
        onLongPress();
      }}
      delayLongPress={1000}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}
      {...rest}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

// ─────────────────────────────────────────────
// TAB NAVIGATOR
// ─────────────────────────────────────────────

const Tab = createBottomTabNavigator();

type RootStackParamList = {
  MainApp: { role: string };
};

type Props = {
  route: RouteProp<RootStackParamList, 'MainApp'>;
};

const BottomTabNavigator: React.FC<Props> = ({ route }) => {
  const { role } = route.params;

  // ── Realtime: keep notification cache fresh app-wide ──
  const [rtUserId, setRtUserId] = React.useState<string | undefined>();
  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setRtUserId(data.user.id);
    });
  }, []);
  useRealtimeNotifications(rtUserId);

  // ── @demo Role toggle state ──
  // Production: Remove entirely. Derive role from auth context:
  //   const role = useAuthProfile().role; // 'agent' | 'contractor'
  const [demoRole, setDemoRole] = useState<DemoRole>('agent');

  // @demo Role cycle: agent → contractor (→ partner only when PARTNER_TRACK_ENABLED)
  // When PARTNER_TRACK_ENABLED is false (default), partner is completely invisible
  const toggleRole = useCallback(() => {
    setDemoRole((prev) => {
      if (prev === 'agent') return 'contractor';
      if (prev === 'contractor' && PARTNER_TRACK_ENABLED) return 'partner';
      return 'agent';
    });
  }, []);

  // ── @demo Choose screen stacks based on demo role ──
  // Production: Route to correct stack based on auth role
  // Partner role (S62): uses HomeTabPartner for Home, PartnerDealsScreen for Deals (replaces Find)
  const HomeComponent = demoRole === 'partner' ? HomeTabPartner
    : demoRole === 'agent' ? HomeStack
    : ContractorHomeStackScreen;
  const InboxComponent = demoRole === 'agent' ? InboxStack : ContractorInboxStackScreen;

  return (
    // @demo Wrap in context provider so child screens can read role
    <DemoRoleContext.Provider value={{ demoRole, toggleRole }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: COLORS.background,
            borderTopWidth: 0.71,
            borderTopColor: COLORS.cardBorder,
            height: Platform.OS === 'ios' ? 84 : 64,
            paddingTop: 4,
            paddingBottom: Platform.OS === 'ios' ? 24 : 8,
          },
          tabBarActiveTintColor: ACTIVE_COLOR,
          tabBarInactiveTintColor: INACTIVE_COLOR,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '400',
            lineHeight: 16,
            marginTop: 4,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeComponent}
          options={({ route }) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? 'HomeMain';
            const hideOnScreens = ['SendSquad'];
            return {
              tabBarIcon: ({ color }) => <HomeIcon color={color} />,
              tabBarStyle: hideOnScreens.includes(routeName)
              ? { display: 'none', height: 0, overflow: 'hidden' as const }
              : {
                  backgroundColor: COLORS.background,
                  borderTopWidth: 0.71,
                  borderTopColor: COLORS.cardBorder,
                  height: Platform.OS === 'ios' ? 84 : 64,
                  paddingTop: 4,
                  paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                },
            };
          }}
        />

        {/* Find — agent only; Deals — partner only (replaces Find tab, S62) */}
        <Tab.Screen
          name={demoRole === 'partner' ? 'Deals' : 'Find'}
          component={demoRole === 'partner' ? PartnerDealsScreen : FindStack}
          options={{
            tabBarIcon: ({ color }) => demoRole === 'partner' ? <JobsIcon color={color} /> : <FindIcon color={color} />,
            tabBarButton: (demoRole !== 'agent' && demoRole !== 'partner') ? () => null : undefined,
            tabBarItemStyle: (demoRole !== 'agent' && demoRole !== 'partner') ? { display: 'none' } : undefined,
          }}
        />

        {/* Network — agent only (hidden for contractor and partner) */}
        <Tab.Screen
          name="Network"
          component={NetworkStack}
          options={{
            tabBarIcon: ({ color }) => <NetworkIcon color={color} />,
            tabBarButton: demoRole !== 'agent' ? () => null : undefined,
            tabBarItemStyle: demoRole !== 'agent' ? { display: 'none' } : undefined,
          }}
        />

        {/* Jobs — contractor only */}
        <Tab.Screen
          name="Jobs"
          component={ContractorJobsStackScreen}
          options={{
            tabBarIcon: ({ color }) => <JobsIcon color={color} />,
            tabBarButton: demoRole !== 'contractor' ? () => null : undefined,
            tabBarItemStyle: demoRole !== 'contractor' ? { display: 'none' } : undefined,
          }}
        />

        {/* Inbox — both roles, long-press toggles role */}
        <Tab.Screen
          name="Inbox"
          component={InboxComponent}
          options={{
            tabBarIcon: ({ color }) => (
              <View>
                <InboxIcon color={color} />
                <RoleBadge role={demoRole} />
              </View>
            ),
            tabBarButton: (props) => (
              <LongPressTabButton
                onPress={props.onPress as () => void}
                onLongPress={toggleRole}
                style={props.style}
                accessibilityRole={props.accessibilityRole}
                accessibilityState={props.accessibilityState}
              >
                {props.children}
              </LongPressTabButton>
            ),
          }}
        />

        {/* Profile — both roles, same ProfileStack (7-zone layout handles role branching internally) */}
        {/* @backend: production removes @demo demoRole entirely — role sourced from profiles.role via auth */}
        <Tab.Screen
          name="Profile"
          component={ProfileStack}
          options={{
            tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
          }}
        />
      </Tab.Navigator>
    </DemoRoleContext.Provider>
  );
};

export default BottomTabNavigator;
