// ═══════════════════════════════════════════════════════════════
// LoginScreen.tsx (225 lines)
// Auth — rendered when authState === 'unauthenticated' (outside NavigationContainer)
//
// Magic link login screen. No password — user enters email, receives
// a magic link, taps it to open the app and authenticate.
//
// Key behaviors:
// - Calls supabase.auth.signInWithOtp with emailRedirectTo: atlasio://login-callback
// - After send: shows "Check your email" confirmation with retry option
// - Deep link handling is in App.tsx (expo-linking URL listener)
// - On successful auth, App.tsx onAuthStateChange routes to onboarding or MainApp
//
// ─────────────────────────────────────────────────
// STATE FLOW:
// 1. User enters email → taps "Send Magic Link"
// 2. signInWithOtp sends email with magic link pointing to atlasio://login-callback
// 3. UI flips to "Check your email" confirmation
// 4. User taps magic link in email → app opens → App.tsx deep link handler fires
// 5. Token extracted → supabase.auth.setSession() → onAuthStateChange → routing
// ─────────────────────────────────────────────────
//
// @backend: supabase.auth.signInWithOtp({ email, emailRedirectTo })
//
// @demo DEV_SHOW_PASSWORD_LOGIN — password sign-in block (dev testing only)
//        Remove entire block before production launch
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SPACING } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handlePasswordSignIn = async () => {
    // @demo — dev testing only. Remove DEV_SHOW_PASSWORD_LOGIN block before launch.
    // @backend: supabase.auth.signInWithPassword
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      if (error) Alert.alert('Sign In Failed', error.message);
    } catch {
      Alert.alert('Error', 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: {
        emailRedirectTo: 'atlasio://login-callback',
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>atlasio</Text>
          <Text style={styles.tagline}>Your real estate network</Text>
        </View>

        {sent ? (
          <View style={styles.sentContainer}>
            <Text style={styles.sentTitle}>Check your email</Text>
            <Text style={styles.sentMessage}>
              We sent a magic link to{'\n'}
              <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setSent(false)}
            >
              <Text style={styles.retryText}>Use a different email</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Email address</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.lightText}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!loading}
            />

            {FEATURE_FLAGS.DEV_SHOW_PASSWORD_LOGIN && (
              <TextInput
                style={styles.input}
                placeholder="Password (dev only)"
                placeholderTextColor={COLORS.lightText}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSendMagicLink}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={styles.buttonText}>Send Magic Link</Text>
              )}
            </TouchableOpacity>

            {FEATURE_FLAGS.DEV_SHOW_PASSWORD_LOGIN && (
              <>
                <TouchableOpacity
                  style={[styles.devPasswordButton, loading && styles.buttonDisabled]}
                  onPress={handlePasswordSignIn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.counterAmber} />
                  ) : (
                    <Text style={styles.devPasswordButtonText}>Sign In with Password (Dev)</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.devDisclaimer}>Dev testing only — not for production</Text>
              </>
            )}
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING['5xl'],
  },
  logo: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },
  tagline: {
    ...TYPOGRAPHY.bodyL,
    color: COLORS.bodyText,
    marginTop: SPACING.md,
  },
  formContainer: {
    gap: SPACING.lg,
  },
  inputLabel: {
    ...TYPOGRAPHY.bodyMBold,
    color: COLORS.darkText,
  },
  input: {
    height: DIMENSIONS.formInputHeight,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: DIMENSIONS.inputRadius,
    paddingHorizontal: SPACING.xl,
    ...TYPOGRAPHY.bodyL,
    color: COLORS.darkText,
  },
  errorText: {
    ...TYPOGRAPHY.bodyS,
    color: COLORS.errorRed,
  },
  button: {
    height: DIMENSIONS.buttonModalHeight,
    backgroundColor: COLORS.primary,
    borderRadius: DIMENSIONS.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  buttonDisabled: {
    backgroundColor: COLORS.disabledBg,
  },
  buttonText: {
    ...TYPOGRAPHY.bodyLMedium,
    color: COLORS.background,
  },
  sentContainer: {
    alignItems: 'center',
    gap: SPACING.xl,
  },
  sentTitle: {
    ...TYPOGRAPHY.displayM,
    color: COLORS.darkText,
  },
  sentMessage: {
    ...TYPOGRAPHY.bodyL,
    color: COLORS.bodyText,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    fontWeight: '600',
    color: COLORS.darkText,
  },
  retryButton: {
    marginTop: SPACING.lg,
  },
  retryText: {
    ...TYPOGRAPHY.bodyMBold,
    color: COLORS.accentBlue,
  },
  devPasswordButton: {
    height: DIMENSIONS.buttonModalHeight,
    borderWidth: 1.5,
    borderColor: COLORS.counterAmber,
    borderRadius: DIMENSIONS.buttonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devPasswordButtonText: {
    ...TYPOGRAPHY.bodyLMedium,
    color: COLORS.counterAmber,
  },
  devDisclaimer: {
    fontSize: 11,
    color: COLORS.secondaryText,
    textAlign: 'center' as const,
  },
});
