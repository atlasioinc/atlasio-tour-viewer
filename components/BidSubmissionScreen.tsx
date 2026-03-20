// BidSubmissionScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Bid Submission Form — fullScreenModal (slide_from_bottom) (408 lines)
// Sections: Header, Job Context Mini Card, Amount Input,
//           Timeline Pills (5 options), Notes, Fee Receipt, Sticky Submit Bar
//
// Navigated from: ContractorJobDetails "Submit Bid" / "Edit Bid" / "Counter"
// Route params: { jobId, prefillAmount?, prefillTimeline?, prefillNotes?, isEdit? }
//
// Fee tier calculation (revenue model):
//   launch_promo  = 0%  (first 3 accepted bids)
//   early_adopter = 5%  (months 4-9)
//   standard      = 10% (month 10+)
//   Receipt shows: bid amount − fee = take-home
//   @demo Uses MOCK_FEE_TIER (launch_promo, 0%) — swap for
//         useMyProfile().fee_tier when wired to Supabase.
//
// @backend useSubmitBid (wired) — rpc_submit_bid(p_job_id, p_amount, p_timeline, p_notes)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { COLORS, DIMENSIONS } from '../lib/tokens';
import { useSubmitBid } from '../hooks/useData';

// ─────────────────────────────────────────────
// ROUTE PARAMS
// ─────────────────────────────────────────────

type BidSubmissionParams = {
  BidSubmission: {
    jobId: string;
    prefillAmount?: number;
    prefillTimeline?: number;
    prefillNotes?: string;
    isEdit?: boolean;
  };
};

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// TIMELINE OPTIONS
// ─────────────────────────────────────────────

const TIMELINE_OPTIONS = [
  { label: '1 day', days: 1 },
  { label: '2–3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: 'Flexible', days: 0 },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const centsToDisplay = (cents: number): string => {
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
};

/**
 * @demo Mock fee tier — replace with useMyProfile().fee_tier
 * launch_promo = 0% (first 3 accepted bids)
 * early_adopter = 5% (months 4-9)
 * standard = 10% (month 10+)
 */
const MOCK_FEE_TIER = {
  tier: 'launch_promo' as const,
  label: 'Launch Promo',
  percent: 0,
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const BidSubmissionScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<BidSubmissionParams, 'BidSubmission'>>();

  const insets = useSafeAreaInsets();
  const { jobId, prefillAmount, prefillTimeline, prefillNotes, isEdit } = route.params;
  const submitBid = useSubmitBid();

  // ── Form state ──
  const [amountText, setAmountText] = useState(() =>
    prefillAmount ? (prefillAmount / 100).toString() : '',
  );
  const [selectedTimeline, setSelectedTimeline] = useState<number>(() => {
    if (prefillTimeline !== undefined) {
      const match = TIMELINE_OPTIONS.findIndex((t) => t.days === prefillTimeline);
      return match >= 0 ? match : 0;
    }
    return -1; // none selected
  });
  const [notes, setNotes] = useState(prefillNotes ?? '');

  // ── Derived values ──
  const amountCents = Math.round((parseFloat(amountText) || 0) * 100);
  const isAmountValid = amountCents >= 100; // minimum $1
  const isTimelineSelected = selectedTimeline >= 0;
  const isFormValid = isAmountValid && isTimelineSelected;

  const feeAmount = Math.round(amountCents * (MOCK_FEE_TIER.percent / 100));
  const takeHome = amountCents - feeAmount;
  const timelineLabel = isTimelineSelected ? TIMELINE_OPTIONS[selectedTimeline].label : '';

  // ── Format amount input ──
  const handleAmountChange = (text: string) => {
    // Allow only digits and one decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return; // reject multiple dots
    if (parts[1] && parts[1].length > 2) return; // max 2 decimal places
    setAmountText(cleaned);
  };

  // ── Submit handler ──
  const handleSubmit = () => {
    if (!isFormValid) return;

    submitBid.mutate(
      {
        jobId,
        amount: amountCents,
        timeline: timelineLabel,
        notes,
      },
      {
        onSuccess: () => {
          Alert.alert(
            isEdit ? 'Bid Updated' : 'Bid Submitted',
            isEdit ? 'Your bid has been updated.' : 'Your bid has been submitted to the agent.',
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
        },
        onError: () => {
          Alert.alert('Error', 'Something went wrong. Please try again.');
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── Header ── */}
      <View style={{
        paddingTop: 8 + insets.top,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 12,
        borderBottomWidth: DIMENSIONS.headerBorderWidth,
        borderBottomColor: COLORS.border,
      }}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <CloseIcon />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.primary, lineHeight: 24 }}>
            {isEdit ? 'Edit Bid' : 'Submit Bid'}
          </Text>
        </View>
        {/* Spacer to balance close button */}
        <View style={{ width: 20 }} />
      </View>

      {/* ── Body ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── 1. Amount Input ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
              Your Bid Amount
            </Text>
            {/* @design custom — bid amount input intentionally differs from FormField pattern
               Large prominent input suits the bid-entry UX context */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              height: 56,
              backgroundColor: COLORS.filterBg,
              borderRadius: DIMENSIONS.inputRadius,
              borderWidth: 1,
              borderColor: amountText ? COLORS.primary : COLORS.inputBorder,
              paddingHorizontal: 16,
            }}>
              <Text style={{ fontSize: 24, fontWeight: '700', color: COLORS.darkText, marginRight: 4 }}>$</Text>
              <TextInput
                value={amountText}
                onChangeText={handleAmountChange}
                placeholder="0"
                placeholderTextColor={COLORS.placeholderText}
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  fontSize: 24,
                  fontWeight: '700',
                  color: COLORS.darkText,
                  padding: 0,
                }}
              />
            </View>
            {amountText !== '' && !isAmountValid && (
              <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.errorRed, lineHeight: 16 }}>
                Minimum bid amount is $1.00
              </Text>
            )}
          </View>

          {/* ── 2. Timeline Pills ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
              Estimated Timeline
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {TIMELINE_OPTIONS.map((opt, i) => {
                const isSelected = selectedTimeline === i;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => setSelectedTimeline(i)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 9999,
                      backgroundColor: isSelected ? COLORS.primary : COLORS.filterBg,
                      borderWidth: 1,
                      borderColor: isSelected ? COLORS.primary : COLORS.inputBorder,
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#FFFFFF' : COLORS.bodyText,
                      lineHeight: 20,
                    }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── 3. Notes ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 24 }}>
              Notes to Agent
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Describe your approach, materials needed, availability..."
              placeholderTextColor={COLORS.placeholderText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{
                minHeight: 100,
                backgroundColor: COLORS.filterBg,
                borderRadius: DIMENSIONS.inputRadius,
                borderWidth: 1,
                borderColor: COLORS.inputBorder,
                padding: 14,
                fontSize: 14,
                fontWeight: '400',
                color: COLORS.darkText,
                lineHeight: 20,
              }}
            />
            <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.lightText, lineHeight: 16, textAlign: 'right' }}>
              {notes.length}/500
            </Text>
          </View>

          {/* ── 4. Fee Transparency Receipt ── */}
          {isAmountValid && (
            <View style={{
              backgroundColor: COLORS.feeBg,
              borderRadius: DIMENSIONS.cardRadius,
              padding: 16,
              gap: 10,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.feeText, lineHeight: 20 }}>
                Fee Breakdown
              </Text>

              {/* Bid amount row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                  Your bid
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                  {centsToDisplay(amountCents)}
                </Text>
              </View>

              {/* Platform fee row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                    Platform fee
                  </Text>
                  <View style={{
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    backgroundColor: 'rgba(22, 163, 74, 0.15)',
                    borderRadius: 9999,
                  }}>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.feeText }}>
                      {MOCK_FEE_TIER.percent}% · {MOCK_FEE_TIER.label}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.bodyText, lineHeight: 20 }}>
                  –{centsToDisplay(feeAmount)}
                </Text>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: 'rgba(22, 163, 74, 0.20)' }} />

              {/* Take home row */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.feeText, lineHeight: 20 }}>
                  Your take-home
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.feeText, lineHeight: 22 }}>
                  {centsToDisplay(takeHome)}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── 5. Sticky Submit Bar ── */}
        <View style={{
          backgroundColor: COLORS.background,
          borderTopWidth: DIMENSIONS.headerBorderWidth,
          borderTopColor: COLORS.border,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 24),
        }}>
          <Pressable
            onPress={handleSubmit}
            disabled={!isFormValid || submitBid.isPending}
            style={({ pressed }) => ({
              height: DIMENSIONS.buttonModalHeight,
              backgroundColor: isFormValid && !submitBid.isPending ? COLORS.primary : COLORS.disabledBg,
              borderRadius: DIMENSIONS.buttonRadius,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed && isFormValid ? 0.85 : 1,
            })}
          >
            {submitBid.isPending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{
                fontSize: 16,
                fontWeight: '600',
                color: isFormValid ? '#FFFFFF' : COLORS.disabledText,
                lineHeight: 24,
              }}>
                {isEdit ? 'Update Bid' : 'Submit Bid'}
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default BidSubmissionScreen;
