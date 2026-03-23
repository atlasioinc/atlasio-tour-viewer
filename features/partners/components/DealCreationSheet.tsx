// DealCreationSheet.tsx
// ═══════════════════════════════════════════════════════════════
// What: New Deal creation form — agent creates a transaction and assigns partners
// Who: Agent role only
// Where: HomeStack → DealCreation (fullScreenModal, slide_from_bottom)
// Gated behind DEAL_CREATION_ENABLED flag (in HomeTabAgent)
//
// 4 fields:
//   1. Property address (Google Places Autocomplete)
//   2. Closing date (optional, native DateTimePicker — S79)
//   3. Assign partners (multi-select from mock connected partners)
//   4. Contract price (optional, currency-formatted — S79)
//
// State flow:
//   navigate → fill fields → Create Deal → mutation →
//   success → showSuccess in-place swap (S79) → View Deal / Done
//
// @demo All partner data is hardcoded mock — replace with usePartnerConnections()
// @backend rpc_create_transaction — entry point for deal creation
// NOTE: anchors to transaction_id (S64+). job_id preserved for backward compat only.
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SHADOWS } from '../../../lib/tokens';
import { GOOGLE_MAPS_API_KEY } from '../../../lib/config';
import { useCreateTransaction, useAgentPartnerConnections } from '../../../hooks/useData';

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 5L15 15" stroke={COLORS.secondaryText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M15 5L5 15" stroke={COLORS.secondaryText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const CheckIcon: React.FC<{ checked: boolean }> = ({ checked }) => (
  <View style={{
    width: 22, height: 22, borderRadius: 6,
    borderWidth: 1.5,
    borderColor: checked ? COLORS.primary : COLORS.border,
    backgroundColor: checked ? COLORS.primary : COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  }}>
    {checked && (
      <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
        <Path d="M3 7L6 10L11 4" stroke={COLORS.background} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    )}
  </View>
);

const PinIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 1.33C5.42 1.33 3.33 3.42 3.33 6C3.33 9.5 8 14.67 8 14.67C8 14.67 12.67 9.5 12.67 6C12.67 3.42 10.58 1.33 8 1.33Z"
      stroke={COLORS.bodyText}
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// Success state checkmark — matches SendSquadScreen pattern (64×64, filled green circle + white check)
const CheckCircleIcon: React.FC = () => (
  <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
    <Path d="M32 58C46.3594 58 58 46.3594 58 32C58 17.6406 46.3594 6 32 6C17.6406 6 6 17.6406 6 32C6 46.3594 17.6406 58 32 58Z" fill={COLORS.successGreen} />
    <Path d="M22 32L28 38L42 24" stroke={COLORS.background} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

// Date formatting — matches PostJobWizard pattern (readable string, e.g. "April 14, 2026")
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

// Currency formatting — strips non-digits, adds comma separators
const formatCurrencyDisplay = (raw: string): string => {
  if (!raw) return '';
  const num = Number(raw);
  if (isNaN(num) || num === 0) return raw ? `$${raw}` : '';
  return `$${num.toLocaleString()}`;
};

// ─────────────────────────────────────────────
// PARTNER DATA — Connected partners for multi-select
// @backend useAgentPartnerConnections() — queries connections table (RLS)
// @demo mock fallback: 3 hardcoded partners (via hook, not inline)
// ─────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  title_escrow: 'Title/Escrow',
  mortgage_pro: 'Mortgage Pro',
  home_inspector: 'Home Inspector',
  appraiser: 'Appraiser',
  warranty: 'Warranty',
};

// ─────────────────────────────────────────────
// AUTOCOMPLETE TYPES
// ─────────────────────────────────────────────

interface PlaceSuggestion {
  placeId: string;
  description: string;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

export default function DealCreationSheet() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const createTransaction = useCreateTransaction();
  // @backend useAgentPartnerConnections — queries connections table for accepted partners
  const { data: connectedPartners = [] } = useAgentPartnerConnections();

  // ── Form state ──
  const [addressText, setAddressText] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [closingDateObj, setClosingDateObj] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [contractPrice, setContractPrice] = useState(''); // raw digits only (e.g. "100000")
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  // ── Success state (S79 — in-place swap pattern from SendSquadScreen) ──
  const [showSuccess, setShowSuccess] = useState(false);
  // @demo hardcoded fallback 'mock-transaction-001' — never undefined
  // @backend rpc_create_transaction returns transaction_id on success
  const [newDealId, setNewDealId] = useState<string>('mock-transaction-001');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ── Autocomplete state ──
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Dismiss — reset form and navigate back ──
  const handleDismiss = useCallback(() => {
    setAddressText('');
    setSelectedAddress('');
    setClosingDateObj(null);
    setShowDatePicker(false);
    setContractPrice('');
    setSelectedPartnerIds([]);
    setSuggestions([]);
    setShowAutocomplete(false);
    setShowSuccess(false);
    setNewDealId('mock-transaction-001');
    navigation.goBack();
  }, [navigation]);

  // ── Google Places Autocomplete (reused from ClientLifestyleScreen) ──
  const fetchAutocompleteSuggestions = async (input: string) => {
    setIsFetchingSuggestions(true);
    try {
      const response = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        },
        body: JSON.stringify({ input, includedRegionCodes: ['us'] }),
      });
      const data = await response.json();
      const mapped = (data.suggestions ?? [])
        .map((s: any) => ({
          placeId: s.placePrediction?.placeId ?? '',
          description: s.placePrediction?.text?.text ?? '',
        }))
        .filter((s: PlaceSuggestion) => s.placeId && s.description);
      setSuggestions(mapped);
    } catch {
      console.warn('[DealCreationSheet] Autocomplete failed');
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const handleAddressTextChange = (text: string) => {
    setAddressText(text);
    setSelectedAddress(''); // clear selection when typing

    if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);

    if (text.length < 3) {
      setSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    setShowAutocomplete(true);
    autocompleteTimerRef.current = setTimeout(() => {
      fetchAutocompleteSuggestions(text);
    }, 400);
  };

  const handleSuggestionSelect = (description: string) => {
    setAddressText(description);
    setSelectedAddress(description);
    setSuggestions([]);
    setShowAutocomplete(false);
  };

  // ── Partner toggle ──
  const togglePartner = (partnerId: string) => {
    setSelectedPartnerIds(prev =>
      prev.includes(partnerId)
        ? prev.filter(id => id !== partnerId)
        : [...prev, partnerId],
    );
  };

  // ── Contract price handler — stores raw digits only ──
  const handleContractPriceChange = (text: string) => {
    // @backend raw numeric value is what gets sent to rpc_create_transaction (p_contract_price)
    const stripped = text.replace(/\D/g, '');
    setContractPrice(stripped);
  };

  // ── Form validation ──
  const isFormValid = selectedAddress.length > 0;

  // ── Submit ──
  const handleCreateDeal = async () => {
    if (!isFormValid) return;
    setErrorMessage(null);

    // Safety filter — strip any mock IDs before sending to live RPC
    const livePartnerIds = selectedPartnerIds.filter(id => !id.startsWith('mock-'));
    const partnerAssignments = livePartnerIds.map(id => {
      const partner = connectedPartners.find(p => p.id === id);
      return {
        partner_id: id,
        partner_role: partner?.role ?? 'title_escrow',
      };
    });

    try {
      // @backend rpc_create_transaction — p_property_address, p_closing_date, p_contract_price, p_partner_assignments
      // @backend p_closing_date: ISO date string (YYYY-MM-DD) or null
      // @backend p_contract_price: raw number or null
      // NOTE: anchors to transaction_id (S64+). job_id preserved for backward compat only.
      const result = await createTransaction.mutateAsync({
        propertyAddress: selectedAddress,
        closingDate: closingDateObj ? closingDateObj.toISOString().split('T')[0] : null,
        contractPrice: contractPrice ? Number(contractPrice) : null,
        partnerAssignments,
      });

      // @backend result.transaction_id — real ID from rpc_create_transaction
      // @demo mock returns transaction_id: `mock-txn-${Date.now()}` — always has a value
      const dealId = result?.transaction_id ?? 'mock-transaction-001';
      setNewDealId(dealId);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('[DealCreationSheet] rpc_create_transaction error:', err);
      setErrorMessage(err?.message ?? 'Failed to create deal. Please try again.');
    }
  };

  // ── Cleanup autocomplete timer ──
  useEffect(() => {
    return () => {
      if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);
    };
  }, []);

  // ─────────────────────────────────────────────
  // SUCCESS VIEW — in-place swap (SendSquadScreen pattern)
  // ─────────────────────────────────────────────

  const renderSuccessView = () => (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
      <CheckCircleIcon />

      <Text style={{
        fontSize: 22, fontWeight: '700', color: COLORS.darkText,
        textAlign: 'center', marginTop: 20,
      }}>
        Deal Created
      </Text>

      <Text style={{
        fontSize: 15, fontWeight: '400', color: COLORS.secondaryText,
        textAlign: 'center', marginTop: 8,
      }} numberOfLines={2}>
        {selectedAddress}
      </Text>

      <Text style={{
        fontSize: 14, fontWeight: '400', color: COLORS.secondaryText,
        textAlign: 'center', marginTop: 4,
      }}>
        Your partners have been notified.
      </Text>

      {/* ── Primary CTA: View Deal ── */}
      <Pressable
        onPress={() => {
          // @backend rpc_create_transaction returns transaction_id → used as jobId + transactionId
          // Step 1: dismiss fullScreenModal
          navigation.goBack();
          // Step 2: push to deal detail after modal dismiss completes
          // @demo dealData passed via route params — deal is not yet in useAgentActiveDeals cache
          // @s100-todo remove dealData passthrough once useAgentActiveDeals is wired to live RPC
          setTimeout(() => {
            navigation.push('AgentDealDetail', {
              jobId: newDealId,
              transactionId: newDealId,
              dealData: {
                job_id: newDealId,
                transaction_id: newDealId,
                address: selectedAddress,
                closing_date: closingDateObj ? closingDateObj.toISOString().split('T')[0] : null,
                partners: [], // empty — no milestones exist yet for a just-created deal
              },
            });
          }, 0);
        }}
        style={({ pressed }) => ({
          marginTop: 40,
          height: 48, borderRadius: 10,
          backgroundColor: COLORS.primary,
          alignItems: 'center', justifyContent: 'center',
          alignSelf: 'stretch',
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.background, lineHeight: 20 }}>
          View Deal
        </Text>
      </Pressable>

      {/* ── Secondary CTA: Done ── */}
      <Pressable
        onPress={handleDismiss}
        style={({ pressed }) => ({
          marginTop: 12,
          height: 48, borderRadius: 10,
          backgroundColor: COLORS.background,
          borderWidth: 1.35, borderColor: COLORS.border,
          alignItems: 'center', justifyContent: 'center',
          alignSelf: 'stretch',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
          Done
        </Text>
      </Pressable>
    </View>
  );

  // ─────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>

      {/* ── Header — fullScreenModal standard ── */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        paddingHorizontal: 8,
        backgroundColor: COLORS.background,
        borderBottomWidth: 0.68,
        borderBottomColor: COLORS.border,
      }}>
        <View style={{ width: 44 }} />
        <Text style={{
          flex: 1, textAlign: 'center',
          fontSize: 16, fontWeight: '600', color: COLORS.primary,
        }}>
          New Deal
        </Text>
        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => ({
            width: 44, height: 44,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <CloseIcon />
        </Pressable>
      </View>

      {/* ── Content: success state OR form ── */}
      {showSuccess ? renderSuccessView() : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* ── Field 1: Property Address ── */}
            <Text style={{
              fontSize: 14, fontWeight: '600', color: COLORS.darkText,
              lineHeight: 20, marginBottom: 8, marginTop: 20,
            }}>
              Property Address
            </Text>
            <View style={{ position: 'relative', zIndex: 99 }}>
              <TextInput
                value={addressText}
                onChangeText={handleAddressTextChange}
                placeholder="Search address..."
                placeholderTextColor={COLORS.bodyText}
                style={{
                  backgroundColor: COLORS.inputBackground,
                  borderWidth: 0.68,
                  borderColor: addressText.length > 0 ? COLORS.inputActiveBorder : COLORS.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15, fontWeight: '400', color: COLORS.darkText, lineHeight: 20,
                }}
              />

              {/* Autocomplete dropdown */}
              {showAutocomplete && suggestions.length > 0 && (
                <View style={{
                  position: 'absolute', top: 52, left: 0, right: 0, zIndex: 99,
                  backgroundColor: COLORS.background,
                  borderRadius: 8, borderWidth: 1, borderColor: COLORS.border,
                  ...SHADOWS.card,
                }}>
                  {suggestions.map((s) => (
                    <Pressable
                      key={s.placeId}
                      onPress={() => handleSuggestionSelect(s.description)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingHorizontal: 14 }}
                    >
                      <PinIcon />
                      <Text style={{ fontSize: 14, color: COLORS.darkText, flex: 1 }} numberOfLines={1}>
                        {s.description}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {/* ── Field 2: Closing Date — native DateTimePicker (PostJobWizard pattern, S79) ── */}
            <Text style={{
              fontSize: 14, fontWeight: '600', color: COLORS.darkText,
              lineHeight: 20, marginBottom: 8, marginTop: 20,
            }}>
              Closing Date
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={{
                paddingHorizontal: 14, paddingVertical: 12,
                backgroundColor: COLORS.inputBackground, borderRadius: 10,
                borderWidth: 0.68,
                borderColor: closingDateObj ? COLORS.inputActiveBorder : COLORS.border,
              }}
            >
              <Text style={{
                fontSize: 15, fontWeight: '400',
                color: closingDateObj ? COLORS.darkText : COLORS.bodyText,
              }}>
                {closingDateObj ? formatDate(closingDateObj) : 'Select date (optional)'}
              </Text>
            </Pressable>
            {showDatePicker && (
              <View style={{ alignItems: 'center' }}>
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
                      setShowDatePicker(false);
                    } else if (event.type === 'dismissed') {
                      setShowDatePicker(false);
                    }
                  }}
                />
              </View>
            )}

            {/* ── Field 3: Assign Partners ── */}
            <Text style={{
              fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
              textTransform: 'uppercase', letterSpacing: 0.5,
              marginTop: 24, marginBottom: 12,
            }}>
              Add to Deal
            </Text>
            {connectedPartners.map((partner) => {
              const isSelected = selectedPartnerIds.includes(partner.id);
              return (
                <Pressable
                  key={partner.id}
                  onPress={() => togglePartner(partner.id)}
                  style={({ pressed }) => ({
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 10, opacity: pressed ? 0.7 : 1,
                  })}
                >
                  {/* Avatar */}
                  <View style={{
                    width: 28, height: 28, borderRadius: 9999,
                    backgroundColor: partner.avatar_color,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.background }}>
                      {partner.name.charAt(0)}
                    </Text>
                  </View>

                  {/* Name + role */}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>
                      {partner.name}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText }}>
                      {ROLE_LABELS[partner.role] ?? partner.role}
                    </Text>
                  </View>

                  {/* Checkbox — 44×44 touch target */}
                  <View style={{
                    width: 44, height: 44,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckIcon checked={isSelected} />
                  </View>
                </Pressable>
              );
            })}

            {/* ── Field 4: Contract Price — currency formatted (S79) ── */}
            <Text style={{
              fontSize: 14, fontWeight: '600', color: COLORS.darkText,
              lineHeight: 20, marginBottom: 8, marginTop: 20,
            }}>
              Contract Price
            </Text>
            <TextInput
              value={formatCurrencyDisplay(contractPrice)}
              onChangeText={handleContractPriceChange}
              placeholder="$0 (optional)"
              placeholderTextColor={COLORS.bodyText}
              keyboardType="numeric"
              style={{
                backgroundColor: COLORS.inputBackground,
                borderWidth: 0.68,
                borderColor: contractPrice.length > 0 ? COLORS.inputActiveBorder : COLORS.border,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15, fontWeight: '400', color: COLORS.darkText, lineHeight: 20,
              }}
            />
          </ScrollView>

          {/* ── Sticky CTA — inside KeyboardAvoidingView, outside ScrollView ── */}
          <View style={{
            paddingHorizontal: 16, paddingVertical: 16,
            backgroundColor: COLORS.background,
            borderTopWidth: 0.69, borderTopColor: COLORS.border,
          }}>
            {errorMessage && (
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.errorRed, marginBottom: 12 }}>
                {errorMessage}
              </Text>
            )}
            <Pressable
              onPress={handleCreateDeal}
              disabled={!isFormValid || createTransaction.isPending}
              style={({ pressed }) => ({
                height: 48, borderRadius: 10,
                backgroundColor: isFormValid ? COLORS.primary : COLORS.disabledBg,
                alignItems: 'center', justifyContent: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              {createTransaction.isPending ? (
                <ActivityIndicator color={COLORS.background} />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.background, lineHeight: 20 }}>
                  Create Deal
                </Text>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
