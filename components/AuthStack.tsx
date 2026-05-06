// ═══════════════════════════════════════════════════════════════
// AuthStack.tsx
// Pre-auth navigation wrapper — rendered by App.tsx when
// authState === 'unauthenticated' (outside NavigationContainer).
//
// Local state machine for the 3 pre-auth screens. We can't use
// React Navigation here because LoginScreen renders outside
// NavigationContainer; instead we drive screen state with a
// useState hook and pass callbacks as props.
//
// Flow:
//   login ──onSignUp───────▶ signup ──onSignIn / onBack──▶ login
//        ──onForgotPassword▶ forgot-password ──onBack──▶ login
//
// On successful auth (any provider), supabase.auth.onAuthStateChange
// fires inside App.tsx and routes to onboarding/MainApp — AuthStack
// itself never sees the post-auth transition.
//
// @backend: none — pure UI wrapper
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import LoginScreen from './LoginScreen';
import SignUpScreen from './SignUpScreen';
import ForgotPasswordScreen from './ForgotPasswordScreen';

type AuthScreen = 'login' | 'signup' | 'forgot-password';

export default function AuthStack() {
  const [screen, setScreen] = useState<AuthScreen>('login');

  if (screen === 'signup') {
    return (
      <SignUpScreen
        onBack={() => setScreen('login')}
        onSignIn={() => setScreen('login')}
      />
    );
  }

  if (screen === 'forgot-password') {
    return <ForgotPasswordScreen onBack={() => setScreen('login')} />;
  }

  return (
    <LoginScreen
      onSignUp={() => setScreen('signup')}
      onForgotPassword={() => setScreen('forgot-password')}
    />
  );
}
