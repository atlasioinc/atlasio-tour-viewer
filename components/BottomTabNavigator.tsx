// BottomTabNavigator.tsx
// ═══════════════════════════════════════════════════════════════
// Bottom Tab Navigation — visible on all main app screens
// Tabs: Home, Find, Network, Inbox, Profile
//
// @demo ROLE TOGGLE — Long-press (1s) on Inbox tab icon to switch
//       between Agent and Contractor views. Swaps Home + Inbox screens.
//       Remove DemoRoleContext, DemoRoleProvider, and all @demo blocks
//       when wiring to real auth role from Supabase profiles table.
// ═══════════════════════════════════════════════════════════════

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
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

// @demo — Import contractor screens for role toggle
// Remove these imports when wiring to real auth role
import ContractorHomeTab from './ContractorHomeTab';
import ContractorInboxList from './ContractorInboxList';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// ─────────────────────────────────────────────
// @demo ROLE TOGGLE CONTEXT
// Shares current demo role across all tabs.
// Production: Replace with auth context role from
//   const { data: profile } = useProfile(auth.uid());
//   const role = profile.role; // 'agent' | 'contractor'
// ─────────────────────────────────────────────

type DemoRole = 'agent' | 'contractor';

interface DemoRoleContextType {
  demoRole: DemoRole;
  toggleRole: () => void;
}

const DemoRoleContext = createContext<DemoRoleContextType>({
  demoRole: 'agent',
  toggleRole: () => {},
});

/** @demo Hook to read current demo role in any child screen */
export const useDemoRole = () => useContext(DemoRoleContext);

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
  </ContractorHomeStackNav.Navigator>
);

const ContractorInboxStackNav = createNativeStackNavigator();

const ContractorInboxStackScreen: React.FC = () => (
  <ContractorInboxStackNav.Navigator screenOptions={{ headerShown: false }}>
    <ContractorInboxStackNav.Screen name="ContractorInboxMain" component={ContractorInboxList} />
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

const RoleBadge: React.FC<{ role: DemoRole }> = ({ role }) => (
  <View
    style={{
      position: 'absolute',
      top: -4,
      right: -10,
      minWidth: 16,
      height: 16,
      borderRadius: 9999,
      backgroundColor: role === 'agent' ? COLORS.primary : '#16A34A',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
      borderWidth: 1.5,
      borderColor: COLORS.background,
    }}
  >
    <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFFFFF' }}>
      {role === 'agent' ? 'A' : 'C'}
    </Text>
  </View>
);

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

  // ── @demo Role toggle state ──
  // Production: Remove entirely. Derive role from auth context:
  //   const role = useAuthProfile().role; // 'agent' | 'contractor'
  const [demoRole, setDemoRole] = useState<DemoRole>('agent');

  const toggleRole = useCallback(() => {
    setDemoRole((prev) => (prev === 'agent' ? 'contractor' : 'agent'));
  }, []);

  // ── @demo Choose screen stacks based on demo role ──
  // Production: Route to correct stack based on auth role
  const HomeComponent = demoRole === 'agent' ? HomeStack : ContractorHomeStackScreen;
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
              ? { display: 'none' }
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
        
        <Tab.Screen
          name="Find"
          component={FindStack}
          options={{
            tabBarIcon: ({ color }) => <FindIcon color={color} />,
          }}
        />
        <Tab.Screen
          name="Network"
          component={NetworkStack}
          options={{
          tabBarIcon: ({ color }) => <NetworkIcon color={color} />,
          }}
          />
        <Tab.Screen
          name="Inbox"
          component={InboxComponent}
          options={{
            // @demo Role badge overlaid on Inbox icon
            tabBarIcon: ({ color }) => (
              <View>
                <InboxIcon color={color} />
                <RoleBadge role={demoRole} />
              </View>
            ),
            // @demo Custom tab button with 1s long-press to toggle
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
        <Tab.Screen name="Profile" component={ProfileStack}
          options={{
            tabBarIcon: ({ color }) => <ProfileIcon color={color} />,
          }}
        />
      </Tab.Navigator>
    </DemoRoleContext.Provider>
  );
};

export default BottomTabNavigator;
