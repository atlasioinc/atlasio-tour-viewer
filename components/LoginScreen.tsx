// components/LoginScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Login Screen — Magic Link Authentication
//
// Simple email-based login using Supabase Auth magic links.
// User enters email → receives a magic link → taps to sign in.
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, DIMENSIONS, SPACING } from '../lib/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

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
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
});
