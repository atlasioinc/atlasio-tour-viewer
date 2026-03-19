// DealCreationSheet.tsx
// ═══════════════════════════════════════════════════════════════
// Deal Creation — Bottom Sheet Modal
// Who: Agent role — creates a new transaction and invites partners
// Where: Rendered in HomeTabAgent, opened via "New Deal +" CTA
// Gated behind DEAL_CREATION_ENABLED flag
//
// 4 fields:
//   1. Property address (Google Places Autocomplete)
//   2. Closing date (optional, MM/DD/YYYY)
//   3. Assign partners (multi-select from mock connected partners)
//   4. Contract price (optional, numeric)
//
// State flow:
//   visible → animate in → fill fields → Create Deal → mutation →
//   success → dismiss sheet → invalidate agent_active_deals
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
  Modal,
  Dimensions,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS } from '../../../lib/tokens';
import { GOOGLE_MAPS_API_KEY } from '../../../lib/config';
import { useCreateTransaction } from '../../../hooks/useData';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 5L15 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M15 5L5 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
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

// ─────────────────────────────────────────────
// MOCK DATA — Connected partners for multi-select
// @demo hardcoded — replace with usePartnerConnections() in production
// @backend usePartnerConnections() — future hook, not built this session
// ─────────────────────────────────────────────

interface MockPartner {
  id: string;
  name: string;
  role: string;
  avatar_color: string;
}

// @demo hardcoded — replace with real data in production
const MOCK_CONNECTED_PARTNERS: MockPartner[] = [
  { id: 'mock-partner-001', name: 'Lisa Nguyen', role: 'title_escrow', avatar_color: '#10B981' },
  { id: 'mock-partner-002', name: 'David Park', role: 'mortgage_pro', avatar_color: '#6366F1' },
  { id: 'mock-partner-003', name: 'Sarah Kim', role: 'title_escrow', avatar_color: '#F59E0B' },
];

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

interface DealCreationSheetProps {
  visible: boolean;
  onClose: () => void;
}

export default function DealCreationSheet({ visible, onClose }: DealCreationSheetProps) {
  const insets = useSafeAreaInsets();
  const createTransaction = useCreateTransaction();

  // ── Animation state ──
  const [modalMounted, setModalMounted] = useState(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // ── Form state ──
  const [addressText, setAddressText] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [contractPrice, setContractPrice] = useState('');
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);

  // ── Autocomplete state ──
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Animation — open/close ──
  useEffect(() => {
    if (visible) {
      setModalMounted(true);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalMounted) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => setModalMounted(false));
    }
  }, [visible]);

  // ── Reset form on close ──
  const handleClose = useCallback(() => {
    setAddressText('');
    setSelectedAddress('');
    setClosingDate('');
    setContractPrice('');
    setSelectedPartnerIds([]);
    setSuggestions([]);
    setShowAutocomplete(false);
    onClose();
  }, [onClose]);

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

  // ── Form validation ──
  const isFormValid = selectedAddress.length > 0;

  // ── Submit ──
  const handleCreateDeal = async () => {
    if (!isFormValid) return;

    const partnerAssignments = selectedPartnerIds.map(id => {
      const partner = MOCK_CONNECTED_PARTNERS.find(p => p.id === id);
      return {
        partner_id: id,
        partner_role: partner?.role ?? 'title_escrow',
      };
    });

    // @backend rpc_create_transaction — p_property_address, p_closing_date, p_contract_price, p_partner_assignments
    // NOTE: anchors to transaction_id (S64+). job_id preserved for backward compat only.
    await createTransaction.mutateAsync({
      propertyAddress: selectedAddress,
      closingDate: closingDate || null,
      contractPrice: contractPrice ? Number(contractPrice) : null,
      partnerAssignments,
    });

    handleClose();
  };

  // ── Cleanup autocomplete timer ──
  useEffect(() => {
    return () => {
      if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);
    };
  }, []);

  return (
    <Modal
      visible={modalMounted}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      {/* Backdrop — fades in/out */}
      <Animated.View
        style={{
          ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          opacity: backdropAnim,
        }}
      >
        <Pressable onPress={handleClose} style={{ flex: 1 }} />
      </Animated.View>

      {/* Sheet — slides up from bottom */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: SCREEN_HEIGHT * 0.75,
          transform: [{ translateY: slideAnim }],
        }}
      >
        {/* Prevents tap-through */}
        <Pressable
          onPress={() => {}}
          style={{
            flex: 1,
            backgroundColor: COLORS.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            overflow: 'hidden',
          }}
        >
          {/* ── Handle Bar ── */}
          <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
            <View style={{
              width: 36, height: 4, borderRadius: 2,
              backgroundColor: COLORS.inputBorder,
            }} />
          </View>

          {/* ── Header: Title + Close ── */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
          }}>
            <View style={{ width: 44 }} />
            <Text style={{
              flex: 1, textAlign: 'center',
              fontSize: 17, fontWeight: '600', color: COLORS.darkText,
            }}>
              New Deal
            </Text>
            <Pressable
              onPress={handleClose}
              style={{
                width: 44, height: 44,
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CloseIcon />
            </Pressable>
          </View>

          {/* ── Form Content ── */}
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* ── Field 1: Property Address ── */}
              <Text style={{
                fontSize: 14, fontWeight: '600', color: COLORS.darkText,
                lineHeight: 20, marginBottom: 8,
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

              {/* ── Field 2: Closing Date ── */}
              <Text style={{
                fontSize: 14, fontWeight: '600', color: COLORS.darkText,
                lineHeight: 20, marginBottom: 8, marginTop: 20,
              }}>
                Closing Date
              </Text>
              <TextInput
                value={closingDate}
                onChangeText={setClosingDate}
                placeholder="MM/DD/YYYY (optional)"
                placeholderTextColor={COLORS.bodyText}
                keyboardType="numbers-and-punctuation"
                style={{
                  backgroundColor: COLORS.inputBackground,
                  borderWidth: 0.68,
                  borderColor: closingDate.length > 0 ? COLORS.inputActiveBorder : COLORS.border,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15, fontWeight: '400', color: COLORS.darkText, lineHeight: 20,
                }}
              />

              {/* ── Field 3: Assign Partners ── */}
              <Text style={{
                fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
                textTransform: 'uppercase', letterSpacing: 0.5,
                marginTop: 24, marginBottom: 12,
              }}>
                Add to Deal
              </Text>
              {MOCK_CONNECTED_PARTNERS.map((partner) => {
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

              {/* ── Field 4: Contract Price ── */}
              <Text style={{
                fontSize: 14, fontWeight: '600', color: COLORS.darkText,
                lineHeight: 20, marginBottom: 8, marginTop: 20,
              }}>
                Contract Price
              </Text>
              <TextInput
                value={contractPrice}
                onChangeText={setContractPrice}
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
          </KeyboardAvoidingView>

          {/* ── Sticky CTA — outside KeyboardAvoidingView ── */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            paddingHorizontal: 16, paddingVertical: 16,
            paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16,
            backgroundColor: COLORS.background,
            borderTopWidth: 0.69, borderTopColor: COLORS.border,
          }}>
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
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
