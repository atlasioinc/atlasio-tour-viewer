// ═══════════════════════════════════════════════════════════════
// SignUpScreen.tsx
// Auth — pre-auth registration screen.
// Rendered by AuthStack when user taps "Sign up" on LoginScreen.
//
// Flow:
//   1. User enters first/last name, email, password, confirm password
//   2. Local validation: all fields present, password ≥ 8 chars, passwords match
//   3. Tap "Sign Up" → supabase.auth.signUp with options.data.{first_name,last_name,full_name}
//   4. Success → "Check your email" confirmation state
//   5. Failure → inline error
//
// Supabase will email a confirmation link. Tapping it opens the app
// via the existing atlasio:// deep link handler in App.tsx, which
// triggers onAuthStateChange → routes to onboarding (no onboarded_at).
//
// @backend: supabase.auth.signUp({ email, password, options: { data: {...} } })
// @demo: Apple JWT secret expires ~November 6 2026 — regenerate in
//        Supabase Apple provider before expiry (applies to LoginScreen too)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SPACING } from '../lib/tokens';
import FormField from './FormField';

interface SignUpScreenProps {
  onBack: () => void;
  onSignIn: () => void;
}

export default function SignUpScreen({ onBack, onSignIn }: SignUpScreenProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const trimmedEmail = email.trim().toLowerCase();
  const isEmailValid = /^\S+@\S+\.\S+$/.test(trimmedEmail);

  const canSubmit =
    !loading &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    isEmailValid &&
    password.length >= 8 &&
    confirmPassword === password;

  // ─────────────────────────────────────────────
  // SIGN UP
  // @backend: supabase.auth.signUp — registration (LIVE)
  // ─────────────────────────────────────────────
  const handleSignUp = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isEmailValid) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { error: authError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          full_name: fullName,
        },
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSubmitted(true);
    }
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  if (submitted) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.headerBar}>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.sentContent}>
          <Text style={styles.logo}>ATLASIO</Text>
          <Text style={styles.tagline}>The network that gets the job done.</Text>

          <View style={styles.sentCard}>
            <Text style={styles.sentTitle}>Check your email</Text>
            <Text style={styles.sentMessage}>
              We sent a confirmation link to{'\n'}
              <Text style={styles.emailHighlight}>{trimmedEmail}</Text>.
              {'\n\n'}Tap it to activate your account.
            </Text>
            <Pressable style={styles.linkRow} onPress={onSignIn} accessibilityRole="button">
              <Text style={styles.linkText}>Back to sign in</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kavFlex}
      >
        <View style={styles.headerBar}>
          <Pressable
            onPress={onBack}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoBlock}>
            <Text style={styles.logo}>ATLASIO</Text>
            <Text style={styles.tagline}>The network that gets the job done.</Text>
          </View>

          <View style={styles.form}>
            <FormField
              label="First name"
              value={firstName}
              onChangeText={(t) => {
                setFirstName(t);
                setError('');
              }}
              placeholder="First name"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
              required
            />

            <FormField
              label="Last name"
              value={lastName}
              onChangeText={(t) => {
                setLastName(t);
                setError('');
              }}
              placeholder="Last name"
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
              required
            />

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
              required
            />

            <FormField
              label="Password"
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                setError('');
              }}
              placeholder="At least 8 characters"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              required
            />

            <FormField
              label="Confirm password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                setError('');
              }}
              placeholder="Re-enter password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              required
              error={
                confirmPassword.length > 0 && confirmPassword !== password
                  ? 'Passwords do not match'
                  : undefined
              }
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Create account"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign Up</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Pressable onPress={onSignIn} accessibilityRole="button">
                <Text style={styles.linkText}>Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
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
  kavFlex: {
    flex: 1,
  },
  headerBar: {
    height: DIMENSIONS.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 32,
    fontWeight: '300',
    color: COLORS.darkText,
    marginTop: -4,
  },
  scrollContent: {
    paddingHorizontal: SPACING['3xl'],
    paddingBottom: SPACING['4xl'],
  },
  logoBlock: {
    alignItems: 'center',
    marginTop: SPACING.lg,
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
  form: {
    gap: SPACING.md,
  },
  errorText: {
    ...TYPOGRAPHY.bodyM,
    color: COLORS.errorRed,
    marginTop: SPACING.xs,
  },
  primaryButton: {
    height: DIMENSIONS.buttonModalHeight,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.lg,
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
    textAlign: 'center',
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
