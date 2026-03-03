// PhoneVerificationScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Phone OTP Verification — MOCK FLOW
// fullScreenModal in ProfileStack (slide_from_bottom)
// Safe area: useSafeAreaInsets() + manual padding (Dynamic Island)
//
// MOCK MODE: Accepts any phone, any 6-digit code. Simulated delays.
// TODO: PRODUCTION — swap mockSendOtp/mockVerifyOtp with real Supabase calls:
//   supabase.auth.signInWithOtp({ phone })
//   supabase.auth.verifyOtp({ phone, token, type: 'sms' })
// Requires Twilio configured in Supabase Dashboard → Auth → Providers → Phone
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, StatusBar,
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import { useUpdateProfile } from '../hooks/useData';

// ─────────────────────────────────────────────
// ICONS
// ─────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon: React.FC = () => (
  <Svg width={48} height={48} viewBox="0 0 24 24" fill="none">
    <Path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke={COLORS.successGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 4L12 14.01l-3-3" stroke={COLORS.successGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// MOCK OTP FUNCTIONS
// ─────────────────────────────────────────────

// TODO: PRODUCTION — replace with real Supabase auth calls
const mockSendOtp = async (_phone: string): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 2000));
};

const mockVerifyOtp = async (_phone: string, _code: string): Promise<boolean> => {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return true; // Accept any 6-digit code
};

// TODO: PRODUCTION — uncomment and use when Twilio is configured:
// const realSendOtp = async (phone: string): Promise<void> => {
//   const { error } = await supabase.auth.signInWithOtp({ phone });
//   if (error) throw error;
// };
// const realVerifyOtp = async (phone: string, code: string): Promise<boolean> => {
//   const { error } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' });
//   if (error) throw error;
//   return true;
// };

// TODO: PRODUCTION — swap mockSendOtp/mockVerifyOtp with realSendOtp/realVerifyOtp
const sendOtp = mockSendOtp;
const verifyOtp = mockVerifyOtp;

// ─────────────────────────────────────────────
// OTP INPUT (6 digits, border-bottom style)
// ─────────────────────────────────────────────

const OTP_LENGTH = 6;

const OtpInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => {
  const inputRef = useRef<TextInput>(null);
  const digits = value.split('').concat(Array(OTP_LENGTH - value.length).fill(''));

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {digits.map((d, i) => (
          <View
            key={i}
            style={{
              width: 44, height: 56, justifyContent: 'flex-end', alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: i === value.length ? COLORS.primary : d ? COLORS.darkText : COLORS.border,
              paddingBottom: 8,
            }}
          >
            <Text style={{
              fontSize: 28, fontWeight: '600', color: COLORS.darkText,
              fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            }}>
              {d}
            </Text>
          </View>
        ))}
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(text) => {
          const cleaned = text.replace(/\D/g, '').slice(0, OTP_LENGTH);
          onChange(cleaned);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoFocus={false}
        maxLength={OTP_LENGTH}
        editable={!disabled}
        style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
      />
    </Pressable>
  );
};

// ═══════════════════════════════════════════════════════════════
// PHONE VERIFICATION SCREEN
// ═══════════════════════════════════════════════════════════════

type Step = 'phone' | 'otp' | 'success';

const PhoneVerificationScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const updateProfile = useUpdateProfile();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const successScale = useRef(new Animated.Value(0)).current;
  const cooldownRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Start cooldown timer
  const startCooldown = useCallback(() => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const handleSendCode = useCallback(async () => {
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await sendOtp(`+1${phone.replace(/\D/g, '')}`);
      setStep('otp');
      startCooldown();
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [phone, startCooldown]);

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    try {
      await sendOtp(`+1${phone.replace(/\D/g, '')}`);
      startCooldown();
    } catch {
      setError('Failed to resend code.');
    } finally {
      setLoading(false);
    }
  }, [phone, resendCooldown, startCooldown]);

  const handleVerify = useCallback(async () => {
    if (otp.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const success = await verifyOtp(`+1${phone.replace(/\D/g, '')}`, otp);
      if (success) {
        await updateProfile.mutateAsync({
          phone_verified: true,
          phone_verified_at: new Date().toISOString(),
        });
        setStep('success');
        Animated.spring(successScale, {
          toValue: 1,
          friction: 4,
          tension: 50,
          useNativeDriver: true,
        }).start();
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch {
      setError('Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  }, [otp, phone, updateProfile, navigation, successScale]);

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otp.length === OTP_LENGTH && step === 'otp' && !loading) {
      handleVerify();
    }
  }, [otp, step, loading, handleVerify]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: insets.top }}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: COLORS.border,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.darkText }}>
          Phone Verification
        </Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <CloseIcon />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 40 }}>

          {/* STEP: Phone Input */}
          {step === 'phone' && (
            <View style={{ gap: 24 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.darkText, textAlign: 'center' }}>
                  Enter your phone number
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.bodyText, textAlign: 'center' }}>
                  We'll send a verification code via SMS
                </Text>
              </View>

              <View style={{
                flexDirection: 'row', alignItems: 'center',
                borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 12,
                height: 52, paddingHorizontal: 16, gap: 12,
              }}>
                <Text style={{ fontSize: 16, color: COLORS.darkText }}>🇺🇸 +1</Text>
                <View style={{ width: 1, height: 28, backgroundColor: COLORS.border }} />
                <TextInput
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text.replace(/[^0-9()-\s]/g, ''));
                    setError(null);
                  }}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={COLORS.lightText}
                  keyboardType="phone-pad"
                  style={{ flex: 1, fontSize: 16, color: COLORS.darkText }}
                  autoFocus
                />
              </View>

              {error && (
                <Text style={{ fontSize: 13, color: COLORS.errorRed, textAlign: 'center' }}>{error}</Text>
              )}

              <Pressable
                onPress={handleSendCode}
                disabled={loading || !phone.trim()}
                style={{
                  backgroundColor: phone.trim() ? COLORS.primary : COLORS.chipBg,
                  borderRadius: 12, height: 48,
                  alignItems: 'center', justifyContent: 'center',
                  flexDirection: 'row', gap: 8,
                }}
              >
                {loading && <ActivityIndicator size="small" color="#FFFFFF" />}
                <Text style={{
                  fontSize: 16, fontWeight: '600',
                  color: phone.trim() ? '#FFFFFF' : COLORS.lightText,
                }}>
                  {loading ? 'Sending...' : 'Send Code'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* STEP: OTP Input */}
          {step === 'otp' && (
            <View style={{ gap: 32 }}>
              <View style={{ alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.darkText, textAlign: 'center' }}>
                  Enter verification code
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.bodyText, textAlign: 'center' }}>
                  Sent to +1 {phone}
                </Text>
              </View>

              <OtpInput value={otp} onChange={setOtp} disabled={loading} />

              {error && (
                <Text style={{ fontSize: 13, color: COLORS.errorRed, textAlign: 'center' }}>{error}</Text>
              )}

              {loading && (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 8 }} />
              )}

              {/* Resend timer */}
              <Pressable
                onPress={handleResend}
                disabled={resendCooldown > 0 || loading}
                style={{ alignItems: 'center', marginTop: 16 }}
              >
                <Text style={{
                  fontSize: 14, color: resendCooldown > 0 ? COLORS.lightText : COLORS.primary,
                  fontWeight: resendCooldown > 0 ? '400' : '600',
                }}>
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : 'Resend code'}
                </Text>
              </Pressable>
            </View>
          )}

          {/* STEP: Success */}
          {step === 'success' && (
            <Animated.View style={{
              alignItems: 'center', gap: 16, paddingTop: 60,
              transform: [{ scale: successScale }],
            }}>
              <CheckIcon />
              <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.darkText }}>
                Phone Verified!
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.bodyText }}>
                Redirecting...
              </Text>
            </Animated.View>
          )}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default PhoneVerificationScreen;
