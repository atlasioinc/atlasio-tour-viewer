// ═══════════════════════════════════════════════════════════════
// LoginScreen.tsx
// Auth — pre-auth sign-in screen.
// Rendered by AuthStack (which is rendered by App.tsx when
// authState === 'unauthenticated', outside NavigationContainer).
//
// Conversion-optimised auth: Apple, Google, email+password — with
// magic-link as a tertiary fallback. Replaces the magic-link-only
// LoginScreen from S110.
//
// ─────────────────────────────────────────────────
// STATE FLOW:
// 1. Mount → GoogleSignin.configure({ iosClientId })
// 2. User taps Apple/Google/Email Sign In → supabase auth call
// 3. On success → onAuthStateChange in App.tsx → routing handled there
// 4. On magic link tap → flips to "Check your email" sent state
// 5. On Sign Up / Forgot password tap → AuthStack swaps screens via props
// ─────────────────────────────────────────────────
//
// @backend supabase.auth.signInWithIdToken — Apple provider (LIVE)
// @backend supabase.auth.signInWithIdToken — Google provider (LIVE)
// @backend supabase.auth.signInWithPassword — email/password (LIVE)
// @backend supabase.auth.signInWithOtp — magic link fallback (LIVE)
// @demo GOOGLE_CLIENT_ID — '1083228224051-evac6li6a938mh2demlimmnb302e7slt.apps.googleusercontent.com'
//        Hardcoded iOS client ID — move to EAS env var pre-launch.
// @demo Apple JWT secret expires ~November 6 2026 — regenerate in
//        Supabase Apple provider before expiry.
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Svg, { Path } from 'react-native-svg';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SPACING } from '../lib/tokens';
import FormField from './FormField';

const GOOGLE_IOS_CLIENT_ID =
  '1083228224051-evac6li6a938mh2demlimmnb302e7slt.apps.googleusercontent.com';

interface LoginScreenProps {
  onSignUp: () => void;
  onForgotPassword: () => void;
}

export default function LoginScreen({ onSignUp, onForgotPassword }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState('');

  // ─────────────────────────────────────────────
  // GOOGLE SIGN IN — one-time configure on mount
  // ─────────────────────────────────────────────
  useEffect(() => {
    GoogleSignin.configure({
      iosClientId: GOOGLE_IOS_CLIENT_ID,
    });
  }, []);

  // ─────────────────────────────────────────────
  // APPLE SIGN IN
  // @backend: supabase.auth.signInWithIdToken — Apple provider (LIVE)
  // ─────────────────────────────────────────────
  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        Alert.alert('Apple Sign In Failed', 'No identity token received.');
        return;
      }

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (authError) {
        Alert.alert('Apple Sign In Failed', authError.message);
        return;
      }

      // Capture Apple name — only returned on first sign-in ever
      // Must be persisted immediately or it is permanently lost
      // @backend supabase.auth.updateUser — writes to raw_user_meta_data
      const givenName = credential.fullName?.givenName ?? '';
      const familyName = credential.fullName?.familyName ?? '';
      const fullName = [givenName, familyName].filter(Boolean).join(' ').trim();
      if (fullName) {
        await supabase.auth.updateUser({
          data: { full_name: fullName },
        });
        // BUG-2 (S179): Give Supabase ~300ms to propagate the user_metadata write
        // before onAuthStateChange routes us into the contractor onboarding stack,
        // where ContractorProfileBasics will read user_metadata.full_name on mount.
        // Only delay when there is actually a name to write.
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
      // Success → onAuthStateChange in App.tsx handles routing
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Error', 'Apple sign in failed. Please try again.');
      }
      // ERR_REQUEST_CANCELED = user closed the sheet — silent
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // GOOGLE SIGN IN
  // v16 returns a discriminated union — cancellation is a returned
  // response ({ type: 'cancelled' }), NOT a thrown error with code.
  // @backend: supabase.auth.signInWithIdToken — Google provider (LIVE)
  // ─────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type === 'cancelled') {
        return;
      }

      const idToken = response.data.idToken;
      if (!idToken) {
        Alert.alert('Google Sign In Failed', 'No ID token returned.');
        return;
      }

      const { error: authError } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (authError) {
        Alert.alert('Google Sign In Failed', authError.message);
      }
    } catch {
      Alert.alert('Error', 'Google sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // EMAIL + PASSWORD SIGN IN
  // @backend: supabase.auth.signInWithPassword — email/password (LIVE)
  // ─────────────────────────────────────────────
  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password.trim(),
    });

    setLoading(false);
    if (authError) setError(authError.message);
  };

  // ─────────────────────────────────────────────
  // MAGIC LINK FALLBACK (kept for beta)
  // @backend: supabase.auth.signInWithOtp — magic link (LIVE)
  // @demo magic link fallback — keep for beta
  // ─────────────────────────────────────────────
  const handleSendMagicLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Enter your email to receive a sign-in link');
      return;
    }
    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { emailRedirectTo: 'atlasio://login-callback' },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  // ─────────────────────────────────────────────
  // RENDER — magic link sent confirmation
  // ─────────────────────────────────────────────
  if (magicLinkSent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.sentContent}>
          <Text style={styles.logo}>ATLASIO</Text>
          <Text style={styles.tagline}>The network that gets the job done.</Text>

          <View style={styles.sentCard}>
            <Text style={styles.sentTitle}>Check your email</Text>
            <Text style={styles.sentMessage}>
              We sent a sign-in link to{'\n'}
              <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
            </Text>
            <Pressable
              style={styles.linkRow}
              onPress={() => setMagicLinkSent(false)}
              accessibilityRole="button"
            >
              <Text style={styles.linkText}>Use a different email</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER — primary login
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavFlex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoBlock}>
            <Text style={styles.logo}>ATLASIO</Text>
            <Text style={styles.tagline}>The network that gets the job done.</Text>
          </View>

          {/* ─── Social auth ─── */}
          <View style={styles.socialBlock}>
            {Platform.OS === 'ios' && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.appleButton}
                onPress={handleAppleSignIn}
              />
            )}

            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                pressed && styles.googleButtonPressed,
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Continue with Google"
            >
              <View style={styles.googleIconWrap}>
                <GoogleGLogo />
              </View>
              <Text style={styles.googleLabel}>Continue with Google</Text>
              <View style={styles.googleIconSpacer} />
            </Pressable>
          </View>

          {/* ─── Divider ─── */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* ─── Email + password ─── */}
          <View style={styles.form}>
            <FormField
              label="Email address"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setError('');
              }}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />

            <FormField
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError('');
              }}
              placeholder="Your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              error={error || undefined}
            />

            <View style={styles.forgotRow}>
              <Pressable
                onPress={onForgotPassword}
                accessibilityRole="button"
                hitSlop={8}
              >
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleEmailSignIn}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign In</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don&rsquo;t have an account? </Text>
              <Pressable onPress={onSignUp} accessibilityRole="button">
                <Text style={styles.linkText}>Sign up</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.magicLinkRow}
              onPress={handleSendMagicLink}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Sign in with email link instead"
            >
              <Text style={styles.magicLinkText}>Sign in with email link instead</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// GOOGLE "G" LOGO — official 4-color brand mark
// @design Google brand colors — do not replace with tokens
// ─────────────────────────────────────────────
function GoogleGLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18c-.44-1.32-.69-2.73-.69-4.18s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  kavFlex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING['3xl'],
    paddingTop: SPACING['3xl'],
    paddingBottom: SPACING['4xl'],
    justifyContent: 'center',
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: SPACING['4xl'],
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 7.2,
    color: COLORS.primary,
  },
  tagline: {
    ...TYPOGRAPHY.bodyL,
    color: COLORS.bodyText,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  socialBlock: {
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  appleButton: {
    width: '100%',
    height: 50,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: SPACING.xl,
  },
  googleButtonPressed: {
    backgroundColor: COLORS.filterBg,
  },
  googleIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconSpacer: {
    width: 20,
    height: 20,
  },
  googleLabel: {
    flex: 1,
    textAlign: 'center',
    ...TYPOGRAPHY.bodyLMedium,
    color: COLORS.darkText,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    ...TYPOGRAPHY.bodyM,
    color: COLORS.secondaryText,
  },
  form: {
    gap: SPACING.md,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -SPACING.sm,
  },
  primaryButton: {
    height: DIMENSIONS.buttonModalHeight,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabledBg,
  },
  primaryButtonText: {
    ...TYPOGRAPHY.bodyLMedium,
    color: COLORS.onPrimary,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  footerText: {
    ...TYPOGRAPHY.bodyM,
    color: COLORS.bodyText,
  },
  linkText: {
    ...TYPOGRAPHY.bodyMBold,
    color: COLORS.accentBlue,
  },
  magicLinkRow: {
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  magicLinkText: {
    ...TYPOGRAPHY.caption,
    color: COLORS.secondaryText,
  },
  sentContent: {
    flex: 1,
    paddingHorizontal: SPACING['3xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sentCard: {
    marginTop: SPACING['4xl'],
    alignItems: 'center',
    gap: SPACING.lg,
  },
  sentTitle: {
    ...TYPOGRAPHY.displayM,
    color: COLORS.darkText,
  },
  sentMessage: {
    ...TYPOGRAPHY.bodyL,
    color: COLORS.bodyText,
    textAlign: 'center',
  },
  emailHighlight: {
    fontWeight: '600',
    color: COLORS.darkText,
  },
  linkRow: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
  },
});
