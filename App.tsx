import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { supabase } from './lib/supabase';
import { COLORS } from './lib/tokens';
import LoginScreen from './components/LoginScreen';
import OnboardingScreen1 from './components/OnboardingScreen1';
import OnboardingScreen2 from './components/OnboardingScreen2';
import OnboardingScreen3 from './components/OnboardingScreen3';
import OnboardingScreen4 from './components/OnboardingScreen4';
import OnboardingComplete from './components/OnboardingComplete';
import BottomTabNavigator from './components/BottomTabNavigator';

import type { Session } from '@supabase/supabase-js';

export type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Onboarding4: { role: string };
  OnboardingComplete: { role: string };
  MainApp: { role: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

type AuthState = 'loading' | 'unauthenticated' | 'onboarding' | 'authenticated';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [userRole, setUserRole] = useState<string>('real_estate_agent');

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
            <Stack.Screen name="Onboarding2" component={OnboardingScreen2} />
            <Stack.Screen name="Onboarding3" component={OnboardingScreen3} />
            <Stack.Screen name="Onboarding4" component={OnboardingScreen4} />
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
