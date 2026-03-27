// EditDealScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Edit Deal — fullScreenModal for editing top-level deal fields (S116)
// Who: Agent role — edits buyer name, contract price, closing date
// Where: HomeStack → AgentDealDetail → 3-dot menu → Edit Deal
//
// @backend rpc_update_transaction({ p_transaction_id, p_buyer_name, p_contract_price, p_closing_date, p_clear_closing_date })
// NOTE: rpc_update_closing_details handles closing_details JSONB separately.
// ═══════════════════════════════════════════════════════════════

// STATE FLOW:
// route.params → pre-fill form state (buyerName, contractPrice, closingDate)
// user edits fields → local state
// "Save Changes" → useUpdateTransaction mutation → on success → navigate back

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from './HomeStack';
import FormField from './FormField';
import { PrimaryButton } from './Button';
import { COLORS, DIMENSIONS, SPACING } from '../lib/tokens';
import { useUpdateTransaction } from '../hooks/useData';
import DateTimePicker from '@react-native-community/datetimepicker';

// ─── Helpers ──────────────────────────────────────────────────

// @backend raw numeric value is what gets sent to rpc_update_transaction (p_contract_price)
// Same pattern as DealCreationSheet.tsx
const formatCurrencyDisplay = (raw: string): string => {
  if (!raw) return '';
  const num = Number(raw);
  if (isNaN(num) || num === 0) return raw ? `$${raw}` : '';
  return `$${num.toLocaleString()}`;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const EditDealScreen: React.FC = () => {
  const route = useRoute<RouteProp<HomeStackParamList, 'EditDeal'>>();
  const navigation = useNavigation();
  const { transactionId, buyerName, contractPrice, closingDate } = route.params;

  // ── Form state ──
  const [name, setName] = useState(buyerName ?? '');
  const [priceRaw, setPriceRaw] = useState(
    contractPrice ? String(contractPrice) : '',
  );
  const [closingDateObj, setClosingDateObj] = useState<Date | null>(
    closingDate ? new Date(closingDate) : null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateWasCleared, setDateWasCleared] = useState(false);

  // ── Mutation ──
  // @backend rpc_update_transaction({ p_transaction_id, p_buyer_name, p_contract_price, p_closing_date, p_clear_closing_date })
  const updateTransaction = useUpdateTransaction();
  const insets = useSafeAreaInsets();

  const handlePriceChange = (text: string) => {
    // @backend raw numeric value is what gets sent to rpc_update_transaction (p_contract_price)
    const stripped = text.replace(/\D/g, '');
    setPriceRaw(stripped);
  };

  const handleSave = () => {
    const parsedPrice = priceRaw ? Number(priceRaw) : null;
    const formattedDate = closingDateObj
      ? closingDateObj.toISOString().split('T')[0] // YYYY-MM-DD
      : null;

    updateTransaction.mutate(
      {
        transactionId,
        buyerName: name.trim() || null,
        contractPrice: parsedPrice,
        closingDate: formattedDate,
        clearClosingDate: dateWasCleared,
      },
      {
        onSuccess: () => {
          Alert.alert('Saved', 'Deal updated successfully.');
          navigation.goBack();
        },
        onError: (err: any) => {
          Alert.alert('Error', err?.message ?? 'Failed to update deal.');
        },
      },
    );
  };

  const closingDateLabel = closingDateObj
    ? closingDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* ── fullScreenModal Header ── */}
      {/* [44px spacer][Title centered][44px X button] */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: DIMENSIONS.headerHeight,
        borderBottomWidth: DIMENSIONS.headerBorderWidth,
        borderBottomColor: COLORS.border,
      }}>
        <View style={{ width: 44 }} />
        <Text style={{
          flex: 1, textAlign: 'center',
          fontSize: 17, fontWeight: '600', color: COLORS.darkText,
        }}>
          Edit Deal
        </Text>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
            <Path d="M18 6L6 18M6 6L18 18" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>

      {/* ── Form Body ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: SPACING.xl, paddingBottom: 120, gap: SPACING['2xl'] }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Buyer Name */}
          <FormField
            label="Buyer Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. James & Sarah Thornton"
            autoCapitalize="words"
          />

          {/* Contract Price */}
          <FormField
            label="Contract Price"
            value={formatCurrencyDisplay(priceRaw)}
            onChangeText={handlePriceChange}
            placeholder="$0"
            keyboardType="numeric"
          />

          {/* Closing Date */}
          <View>
            <Text style={{
              fontSize: 14, fontWeight: '600', color: COLORS.darkText,
              lineHeight: 20, marginBottom: 8,
            }}>
              Closing Date
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={{
                height: DIMENSIONS.formInputHeight,
                paddingHorizontal: 14,
                backgroundColor: COLORS.inputBackground,
                borderRadius: DIMENSIONS.inputRadius,
                borderWidth: DIMENSIONS.cardBorderWidth,
                borderColor: closingDateLabel ? COLORS.inputActiveBorder : COLORS.border,
                justifyContent: 'center',
              }}
            >
              <Text style={{
                fontSize: 15, fontWeight: '400',
                color: closingDateLabel ? COLORS.darkText : COLORS.bodyText,
              }}>
                {closingDateLabel || 'Select date'}
              </Text>
            </Pressable>

            {showDatePicker && (
              <View style={{ alignItems: 'center', marginTop: SPACING.md }}>
                {/* @demo default value 7 days from today when no date selected */}
                <DateTimePicker
                  value={closingDateObj || new Date(Date.now() + 7 * 86400000)}
                  mode="date"
                  display="inline"
                  themeVariant="light"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (event.type === 'set' && date) {
                      setClosingDateObj(date);
                      setDateWasCleared(false);
                      setShowDatePicker(false);
                    } else if (event.type === 'dismissed') {
                      setShowDatePicker(false);
                    }
                  }}
                />
              </View>
            )}

            {closingDateObj && (
              <Pressable
                onPress={() => { setClosingDateObj(null); setDateWasCleared(true); setShowDatePicker(false); }}
                style={{ marginTop: SPACING.sm }}
              >
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.primary }}>Clear date</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Sticky CTA ── */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16,
        backgroundColor: COLORS.background,
        borderTopWidth: 0.69, borderTopColor: COLORS.border,
      }}>
        <PrimaryButton
          label="Save Changes"
          onPress={handleSave}
          loading={updateTransaction.isPending}
        />
      </View>
    </SafeAreaView>
  );
};

export default EditDealScreen;
