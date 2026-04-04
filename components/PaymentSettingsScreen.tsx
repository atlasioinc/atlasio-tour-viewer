// PaymentSettingsScreen.tsx
// ═══════════════════════════════════════════════════════════════
// What: Stripe Connect payment setup for contractors
// Who: Contractor only — agents and partners never see this screen
// Where: ProfileStack → SettingsScreen → PaymentSettingsScreen (pushed screen)
//
// STATE FLOW:
// useMyProfile() → reads stripe_account_id → derives isConnected boolean
// handleSetupPayments → useGetStripeOnboardingUrl → opens URL in browser (Linking.openURL)
// On screen focus (useFocusEffect) → refetch useMyProfile → banner/status card updates
// Edge Function writes stripe_account_id to profile directly → useFocusEffect picks up the change
//
// @demo: USE_MOCK_DATA returns mock URLs / simulated success
// @backend: stripe-connect-onboarding Edge Function, rpc_save_stripe_account_id
// ═══════════════════════════════════════════════════════════════

import React, { useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { COLORS, DIMENSIONS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useMyProfile, useGetStripeOnboardingUrl, queryKeys } from '../hooks/useData';
import { ScreenHeader } from './ScreenHeader';
import { PrimaryButton, SecondaryButton } from './Button';

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const PaymentSettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { data: profile } = useMyProfile();
  const getOnboardingUrl = useGetStripeOnboardingUrl();

  // @backend: profile.stripe_account_id read from useMyProfile → rpc_get_my_profile
  const isConnected = profile?.stripe_account_id != null;

  // ── Refresh profile on screen focus (detects Stripe onboarding return) ──
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.myProfile });
    }, [queryClient]),
  );

  // ── Handle setup payments ──
  const handleSetupPayments = async () => {
    // @demo: opens mock URL — Alert.alert('Demo mode', 'Stripe onboarding would open here.')
    if (FEATURE_FLAGS.USE_MOCK_DATA) {
      Alert.alert('Demo mode', 'Stripe onboarding would open here.');
      return;
    }

    try {
      // @backend: stripe-connect-onboarding Edge Function
      const result = await getOnboardingUrl.mutateAsync();
      await Linking.openURL(result.url);
    } catch {
      Alert.alert('Unable to connect', 'Please try again.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <ScreenHeader
        title="Payment Setup"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* ══════════════════════════════════════════
            SECTION 1 — STATUS CARD
            ══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          {isConnected ? (
            // ── Connected state ──
            <View
              style={{
                backgroundColor: COLORS.feeBg,
                borderLeftWidth: 4,
                borderLeftColor: COLORS.successGreen,
                borderRadius: DIMENSIONS.cardRadius,
                borderWidth: DIMENSIONS.cardBorderWidth,
                borderColor: COLORS.cardBorder,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
                {'\u2713'}  Payments Connected
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20, marginTop: 8 }}>
                Your payment method is on file. Atlasio will automatically collect the platform fee when each job is confirmed complete.
              </Text>
              <View style={{ marginTop: 16 }}>
                <SecondaryButton
                  label="Update payment method"
                  onPress={handleSetupPayments}
                  loading={getOnboardingUrl.isPending}
                  fullWidth={false}
                  style={{ alignSelf: 'flex-start', height: 36, paddingHorizontal: 14 }}
                />
              </View>
            </View>
          ) : (
            // ── Not connected state ──
            <View
              style={{
                backgroundColor: COLORS.warningBg,
                borderLeftWidth: 4,
                borderLeftColor: COLORS.warningAmber,
                borderRadius: DIMENSIONS.cardRadius,
                borderWidth: DIMENSIONS.cardBorderWidth,
                borderColor: COLORS.cardBorder,
                padding: 16,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
                {'\uD83D\uDCB3'}  Payment Setup Required
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20, marginTop: 8 }}>
                Connect a payment method so Atlasio can collect the platform fee when you complete jobs.
              </Text>
              <View style={{ marginTop: 16 }}>
                <PrimaryButton
                  label="Set up payments"
                  onPress={handleSetupPayments}
                  loading={getOnboardingUrl.isPending}
                  disabled={getOnboardingUrl.isPending}
                />
              </View>
            </View>
          )}
        </View>

        {/* ══════════════════════════════════════════
            SECTION 2 — HOW IT WORKS
            ══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 16, paddingTop: 32 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, marginBottom: 20 }}>
            How it works
          </Text>

          {/* Step 1 */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.darkText, lineHeight: 22 }}>
                Win a job
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20, marginTop: 2 }}>
                Submit a bid, get accepted, complete the work.
              </Text>
            </View>
          </View>

          {/* Step 2 */}
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.darkText, lineHeight: 22 }}>
                Agent confirms
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20, marginTop: 2 }}>
                Once the agent confirms the job is done, the platform fee is automatically charged.
              </Text>
            </View>
          </View>

          {/* Step 3 */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.darkText, lineHeight: 22 }}>
                Keep the rest
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20, marginTop: 2 }}>
                The fee is a small percentage of the job value. You keep everything else.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PaymentSettingsScreen;
