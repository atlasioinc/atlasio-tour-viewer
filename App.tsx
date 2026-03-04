import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { queryClient } from './lib/queryClient';
import { supabase } from './lib/supabase';
import { COLORS } from './lib/tokens';
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

type AuthState = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userRole, setUserRole] = useState<string>('Agent');

  useEffect(() => {
    // Check profile to determine if onboarding is complete
    const checkProfile = async (userId: string) => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, display_role')
          .eq('id', userId)
          .single();

        if (profile && profile.display_role) {
          // User has completed onboarding (display_role is set during onboarding)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: Session | null) => {
        if (!session) {
          setAuthState('unauthenticated');
          return;
        }

        if (event === 'SIGNED_OUT') {
          setAuthState('unauthenticated');
          queryClient.clear();
          return;
        }

        // SIGNED_IN, INITIAL_SESSION, TOKEN_REFRESHED
        checkProfile(session.user.id);
      },
    );

    return () => {
      subscription.unsubscribe();
    };
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

  // Loading state
  if (authState === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  // Unauthenticated → show login
  if (authState === 'unauthenticated') {
    return (
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <LoginScreen />
        </SafeAreaProvider>
      </QueryClientProvider>
    );
  }

  // Authenticated or onboarding → show navigator
  return (
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
