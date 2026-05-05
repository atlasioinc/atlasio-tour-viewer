// ═══════════════════════════════════════════════════════════════
// App.tsx
// Root component — auth state machine + navigation container
//
// Controls the entire app lifecycle: loading → login → onboarding → main app.
// All auth routing flows through a single onAuthStateChange listener.
// Deep link handler captures magic link tokens from atlasio://login-callback.
//
// Key behaviors:
// - Auth state machine determines which screen tree to render
// - Profile check (onboarded_at) distinguishes new users from onboarded users
// - Deep link listener extracts access_token/refresh_token from URL fragment
// - OnboardingFormData accumulates through route params across onboarding screens
// - Role-branching: contractors get 6-step flow, agents/partners get 5-step flow
//
// ─────────────────────────────────────────────────
// STATE FLOW:
// 1. App mounts → authState = 'loading', shows spinner
// 2. supabase.auth.onAuthStateChange fires:
//    - No session → authState = 'unauthenticated' → LoginScreen
//    - SIGNED_OUT → authState = 'unauthenticated', queryClient cleared
//    - SIGNED_IN / INITIAL_SESSION / TOKEN_REFRESHED → checkProfile(userId)
// 3. checkProfile queries profiles.onboarded_at:
//    - onboarded_at set → authState = 'authenticated' → MainApp (BottomTabNavigator)
//    - onboarded_at null or profile missing → authState = 'onboarding' → Onboarding1
// 4. Deep link (separate useEffect):
//    - atlasio://login-callback#access_token=...&refresh_token=...
//    - Extracts tokens → supabase.auth.setSession() → triggers onAuthStateChange
// ─────────────────────────────────────────────────
//
// ROUTES REGISTERED:
//   Onboarding1           — Splash / welcome screen (step 1)
//   OnboardingRoleSelect  — Role card picker (step 2)
//   Onboarding3           — Agent/partner profile form (step 3/5)
//   Onboarding4           — Agent/partner credentials (step 4/5)
//   ContractorProfileBasics — Contractor name/company (step 3/6)
//   ContractorTradeStep     — Contractor trade chips (step 4/6)
//   ContractorDetailsStep   — Contractor service area + license (step 5/6)
//   OnboardingComplete      — Role-specific completion + CTA (final step)
//   MainApp                 — BottomTabNavigator (role passed via params)
//
// @backend: supabase.auth.onAuthStateChange, profiles.onboarded_at query
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, TextInput } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { queryClient } from './lib/queryClient';
import { supabase } from './lib/supabase';
import { COLORS } from './lib/tokens';
import { FEATURE_FLAGS } from './lib/featureFlags';
import LoginScreen from './components/LoginScreen';
import OnboardingScreen1 from './components/OnboardingScreen1';
// OnboardingScreen2 retired — role selection moved to OnboardingRoleSelect
// import OnboardingScreen2 from './components/OnboardingScreen2';
import OnboardingRoleSelect from './components/OnboardingRoleSelect';
import OnboardingScreen3 from './components/OnboardingScreen3';
import OnboardingScreen4 from './components/OnboardingScreen4';
import ContractorProfileBasics from './components/ContractorProfileBasics';
import ContractorTradeStep from './components/ContractorTradeStep';
import ContractorDetailsStep from './components/ContractorDetailsStep';
import OnboardingComplete from './components/OnboardingComplete';
import BottomTabNavigator from './components/BottomTabNavigator';

import type { Session } from '@supabase/supabase-js';

// Global keyboard appearance — light keyboard across all screens (S159 BUG-011)
// Prevents dark keyboard flash during screen transitions on iOS.
// Set once here so no per-screen keyboardAppearance props are needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TI = TextInput as any;
if (TI.defaultProps === undefined) {
  TI.defaultProps = {};
}
TI.defaultProps.keyboardAppearance = 'light';

// ─────────────────────────────────────────────
// TYPES — OnboardingFormData accumulates through route params.
// formData.role is ALWAYS a backend enum value (single-value principle).
// See OnboardingRoleSelect.tsx for the role card definitions.
// ─────────────────────────────────────────────

type OnboardingFormData = {
  role: string;
  fullName: string;
  company?: string;
  serviceArea?: string;
  primaryTrade?: string;
  secondaryTrades?: string[];
  serviceRadius?: string;
  hasLicense?: boolean;
  hasInsurance?: boolean;
};

export type RootStackParamList = {
  Onboarding1: undefined;
  OnboardingRoleSelect: undefined;
  // Onboarding2 retired — file preserved, route removed
  Onboarding3: { formData: OnboardingFormData };
  Onboarding4: { formData: OnboardingFormData };
  ContractorProfileBasics: { formData: OnboardingFormData };
  ContractorTradeStep: { formData: OnboardingFormData };
  ContractorDetailsStep: { formData: OnboardingFormData };
  OnboardingComplete: { formData: OnboardingFormData };
  MainApp: { role: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─────────────────────────────────────────────
// AUTH STATE MACHINE
// loading          → initial state, shows spinner while checking session
// unauthenticated  → no session, renders LoginScreen (outside NavigationContainer)
// onboarding       → session exists but onboarded_at is null, starts onboarding flow
// authenticated    → session + onboarded_at present, renders MainApp
// ─────────────────────────────────────────────
type AuthState = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated';

export default function App() {
  // @demo — controlled via lib/featureFlags.ts (centralized flag management)
  const DEV_BYPASS_AUTH = FEATURE_FLAGS.DEV_BYPASS_AUTH;

  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userRole, setUserRole] = useState<string>('Agent');

  // ─────────────────────────────────────────────
  // AUTH LISTENER — single listener handles all auth events.
  // @backend: supabase.auth.onAuthStateChange + profiles table query
  // ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      // Check profile to determine if onboarding is complete
      const checkProfile = async (userId: string) => {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role, onboarded_at')
            .eq('id', userId)
            .single();

          if (profile && profile.onboarded_at) {
            // User has completed onboarding (onboarded_at set atomically by rpc_complete_onboarding)
            setUserRole(profile.role);
            setAuthState('authenticated');
          } else {
            setAuthState('onboarding');
          }
        } catch {
          // Profile doesn't exist yet → needs onboarding
          setAuthState('onboarding');
        }
      };

      // ── Initial session check ──
      // supabase.auth.onAuthStateChange does not fire on cold start when there
      // is no existing session — only on subsequent auth events (SIGNED_IN, SIGNED_OUT etc).
      // Without this check, authState stays stuck in 'loading' forever on first launch
      // when DEV_BYPASS_AUTH = false and no session exists.
      // @backend: supabase.auth.getSession
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      if (!initialSession) {
        setAuthState('unauthenticated');
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event: string, session: Session | null) => {
          // SIGNED_OUT must be checked BEFORE !session guard —
          // sign-out sends session=null, so the null guard would return
          // before queryClient.clear() runs (S111 fix)
          if (event === 'SIGNED_OUT') {
            queryClient.clear();
            setUserRole('Agent');
            setAuthState('unauthenticated');
            return;
          }

          if (!session) {
            setAuthState('unauthenticated');
            return;
          }

          // SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED
          checkProfile(session.user.id);
        },
      );

      return () => {
        subscription.unsubscribe();
      };
    })();
  }, []);

  // ─────────────────────────────────────────────
  // DEEP LINK HANDLER — captures magic link callback from email.
  // When user taps magic link, the app opens at atlasio://login-callback#access_token=...
  // This extracts the tokens from the URL and passes them to Supabase auth.
  // The existing onAuthStateChange listener then handles routing.
  // @backend: Supabase magic link auth
  // ─────────────────────────────────────────────
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      if (!url.includes('login-callback')) return;

      // Extract tokens from URL fragment (after the #)
      const fragment = url.split('#')[1];
      if (!fragment) return;

      const params = new URLSearchParams(fragment);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        // onAuthStateChange listener handles navigation from here
      }
    };

    // Handle cold launch (app was closed, user taps magic link)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    // Handle warm launch (app was in background, user taps magic link)
    const linkSubscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => linkSubscription.remove();
  }, []);

  // ─────────────────────────────────────────────
  // RENDER — three branches based on auth state
  // ─────────────────────────────────────────────

  // @demo TEMP: skip login for device testing — bypasses auth entirely
  // Must come FIRST before loading check so it never waits for Supabase auth
  if (DEV_BYPASS_AUTH) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="MainApp"
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="MainApp" component={BottomTabNavigator} initialParams={{ role: userRole }} />
              </Stack.Navigator>
            </NavigationContainer>
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    );
  }

  // Loading state
  if (authState === 'loading') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  // Unauthenticated → show login
  if (authState === 'unauthenticated') {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <LoginScreen />
          </SafeAreaProvider>
        </QueryClientProvider>
      </GestureHandlerRootView>
    );
  }

  // Authenticated or onboarding → show navigator
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName={authState === 'onboarding' ? 'Onboarding1' : 'MainApp'}
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="Onboarding1" component={OnboardingScreen1} />
              <Stack.Screen name="OnboardingRoleSelect" component={OnboardingRoleSelect} />
              {/* Onboarding2 retired — role selection moved to OnboardingRoleSelect */}
              <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
              <Stack.Screen name="Onboarding4" component={OnboardingScreen4} />
              <Stack.Screen name="ContractorProfileBasics" component={ContractorProfileBasics} />
              <Stack.Screen name="ContractorTradeStep" component={ContractorTradeStep} />
              <Stack.Screen name="ContractorDetailsStep" component={ContractorDetailsStep} />
              <Stack.Screen name="OnboardingComplete" component={OnboardingComplete} />
              <Stack.Screen name="MainApp" component={BottomTabNavigator} initialParams={{ role: userRole }}/>
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
});
