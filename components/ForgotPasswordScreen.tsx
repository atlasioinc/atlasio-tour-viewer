// ═══════════════════════════════════════════════════════════════
// ForgotPasswordScreen.tsx
// Auth — pre-auth password reset request screen.
// Rendered by AuthStack when user taps "Forgot password" on LoginScreen.
//
// Flow:
//   1. User enters email
//   2. Tap "Send Reset Link" → supabase.auth.resetPasswordForEmail
//   3. Success → "Check your email" confirmation
//   4. Failure → inline error
//
// Reset email contains a link to atlasio://reset-password — final
// password-set screen is out of scope for ATL-AUTH-02 (TODO future
// session: ResetPasswordScreen + deep link handler in App.tsx).
//
// @backend: supabase.auth.resetPasswordForEmail(email, { redirectTo })
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

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const trimmedEmail = email.trim().toLowerCase();
  const isEmailValid = /^\S+@\S+\.\S+$/.test(trimmedEmail);
  const canSubmit = !loading && isEmailValid;

  // ─────────────────────────────────────────────
  // RESET REQUEST
  // @backend: supabase.auth.resetPasswordForEmail — password reset (LIVE)
  // ─────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    if (!isEmailValid) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      trimmedEmail,
      { redirectTo: 'atlasio://reset-password' }
    );

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────
  if (sent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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
        <View style={styles.sentContent}>
          <Text style={styles.logo}>ATLASIO</Text>
          <Text style={styles.tagline}>The network that gets the job done.</Text>

          <View style={styles.sentCard}>
            <Text style={styles.sentTitle}>Check your email</Text>
            <Text style={styles.sentMessage}>
              We sent a password reset link to{'\n'}
              <Text style={styles.emailHighlight}>{trimmedEmail}</Text>.
              {'\n\n'}Tap it to choose a new password.
            </Text>
            <Pressable style={styles.linkRow} onPress={onBack} accessibilityRole="button">
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

          <View style={styles.headingBlock}>
            <Text style={styles.heading}>Reset your password</Text>
            <Text style={styles.body}>
              Enter your email and we&rsquo;ll send you a reset link.
            </Text>
          </View>

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
              required
              error={error || undefined}
            />

            <Pressable
              style={[styles.primaryButton, !canSubmit && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="Send reset link"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.onPrimary} />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Link</Text>
              )}
            </Pressable>

            <View style={styles.footerRow}>
              <Pressable onPress={onBack} accessibilityRole="button">
                <Text style={styles.linkText}>Back to sign in</Text>
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
  headingBlock: {
    marginBottom: SPACING['2xl'],
    gap: SPACING.md,
  },
  heading: {
    ...TYPOGRAPHY.displayM,
    color: COLORS.darkText,
  },
  body: {
    ...TYPOGRAPHY.bodyL,
    color: COLORS.bodyText,
  },
  form: {
    gap: SPACING.md,
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
