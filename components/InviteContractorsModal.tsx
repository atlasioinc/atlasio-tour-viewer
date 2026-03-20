// ═══════════════════════════════════════════════════════════════
// components/InviteContractorsModal.tsx
// Invite Contractors Modal — Agent View
//
// Searchable list of network contractors filtered by job trade.
// Multi-select up to 5 contractors with optional note.
// Triggered from RepairJobDetails → "Invite Pros" button.
//
// @demo: uses MOCK_NETWORK_CONTRACTORS hardcoded array (10 contractors).
//        handleSendInvites logs to console + shows Alert (no backend call).
// @backend TODO: replace mock data with useInviteContractors hook
//   Query: supabase.from('connections').select('*, profiles(*)')
//          .eq('status', 'accepted').eq('profiles.role', 'contractor')
//   Mutation: useInviteContractors → append_invited_contractors RPC
//             + create job_invitations + send notifications
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import SearchField from './SearchField';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

const MAX_INVITES = 5;

// ─────────────────────────────────────────────
// CONTRACTOR TYPE
// ─────────────────────────────────────────────

export interface NetworkContractor {
  id: string;
  name: string;
  company: string;
  trades: string[]; // e.g., ['Electrical', 'HVAC']
  rating: number;
  avatarColor: string;
}

// ─────────────────────────────────────────────
// @demo MOCK NETWORK CONTRACTORS
// @backend TODO: Replace with useNetworkContractors or similar query:
//   supabase.from('connections').select('*, profiles(*)')
//     .eq('status', 'accepted').eq('profiles.role', 'contractor')
// ─────────────────────────────────────────────

const MOCK_NETWORK_CONTRACTORS: NetworkContractor[] = [
  { id: 'nc-1', name: 'Mike Torres', company: 'Torres Electric', trades: ['Electrical'], rating: 4.9, avatarColor: '#E8D5B7' },
  { id: 'nc-2', name: 'Sarah Chen', company: 'ProBuild Contractors', trades: ['Electrical', 'Plumbing'], rating: 4.8, avatarColor: '#A8C5DA' },
  { id: 'nc-3', name: 'David Park', company: 'Park & Sons Electric', trades: ['Electrical', 'HVAC'], rating: 4.7, avatarColor: '#B5D4A8' },
  { id: 'nc-4', name: 'James Wilson', company: 'Wilson Home Services', trades: ['Electrical', 'Plumbing', 'HVAC'], rating: 4.6, avatarColor: '#D4A8B5' },
  { id: 'nc-5', name: 'Carlos Rivera', company: 'Rivera Roofing', trades: ['Roofing', 'Carpentry / Handyman'], rating: 4.9, avatarColor: '#C4A882' },
  { id: 'nc-6', name: 'Tom Anderson', company: 'Anderson HVAC', trades: ['HVAC', 'Plumbing'], rating: 4.8, avatarColor: '#C5D4A8' },
  { id: 'nc-7', name: 'Brian Cooper', company: 'Summit Roofing', trades: ['Roofing'], rating: 4.7, avatarColor: '#7BA3C9' },
  { id: 'nc-8', name: 'Lisa Martinez', company: 'Precision Plumbing', trades: ['Plumbing'], rating: 5.0, avatarColor: '#B8A8D4' },
  { id: 'nc-9', name: 'Jake Thompson', company: 'Thompson Handyman', trades: ['Carpentry / Handyman', 'Painting', 'Flooring'], rating: 4.8, avatarColor: '#A8C4B8' },
  { id: 'nc-10', name: 'Angela Kim', company: 'Denver Electric Pros', trades: ['Electrical'], rating: 4.9, avatarColor: '#D4C5A8' },
];

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 5L15 15" stroke={COLORS.headingText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M15 5L5 15" stroke={COLORS.headingText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);


const CheckboxEmpty: React.FC = () => (
  <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: COLORS.inputBorder }} />
);

const CheckboxFilled: React.FC = () => (
  <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <Path d="M2.5 7L5.5 10L11.5 4" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  </View>
);

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{ name: string; color: string; size?: number }> = ({ name, color, size = 44 }) => {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.3, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

interface InviteContractorsModalProps {
  visible: boolean;
  onClose: () => void;
  jobTitle: string;
  jobCategory: string; // trade to filter by
}

const InviteContractorsModal: React.FC<InviteContractorsModalProps> = ({
  visible,
  onClose,
  jobTitle,
  jobCategory,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState(`Check this ${jobCategory.toLowerCase()} job?`);
  const [noteIsFocused, setNoteIsFocused] = useState(false);

  // ── Filter contractors by trade match + search text ──
  // Production: this filtering happens server-side via query params
  const filteredContractors = useMemo(() => {
    return MOCK_NETWORK_CONTRACTORS.filter((c) => {
      // Trade match: show contractors whose trades include the job category
      const matchesTrade = c.trades.some(
        (t) => t.toLowerCase() === jobCategory.toLowerCase()
      );

      // Search filter
      const matchesSearch =
        searchText.length === 0 ||
        c.name.toLowerCase().includes(searchText.toLowerCase()) ||
        c.company.toLowerCase().includes(searchText.toLowerCase());

      return matchesTrade && matchesSearch;
    });
  }, [searchText, jobCategory]);

  // ── Toggle contractor selection ──
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_INVITES) {
          Alert.alert(
            'Invite Limit Reached',
            `You can invite up to ${MAX_INVITES} contractors per job.`
          );
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }, []);

  // ── Handle send invites ──
  const handleSendInvites = useCallback(() => {
    if (selectedIds.size === 0) return;

    const selectedNames = MOCK_NETWORK_CONTRACTORS
      .filter((c) => selectedIds.has(c.id))
      .map((c) => c.name);

    // @backend TODO: wire to useInviteContractors mutation:
    //   1. RPC append_invited_contractors(p_job_id, p_contractor_ids)
    //   2. Insert job_invitations rows for tracking
    //   3. Auto-notification: "[Agent] invited you to bid on [Job]"
    console.log('Invites sent:', {
      contractors: selectedNames,
      jobTitle,
      note: note.trim(),
    });

    Alert.alert(
      'Invites Sent!',
      `${selectedIds.size} contractor${selectedIds.size > 1 ? 's' : ''} invited to "${jobTitle}"`,
      [{ text: 'OK', onPress: () => { setSelectedIds(new Set()); onClose(); } }]
    );
  }, [selectedIds, jobTitle, note, onClose]);

  // ── Reset state when modal closes ──
  const handleClose = useCallback(() => {
    setSearchText('');
    setSelectedIds(new Set());
    setNote(`Check this ${jobCategory.toLowerCase()} job?`);
    setNoteIsFocused(false);
    onClose();
  }, [onClose, jobCategory]);

  // ── Render contractor row ──
  const renderContractor = ({ item }: { item: NetworkContractor }) => {
    const isSelected = selectedIds.has(item.id);
    const isDisabled = !isSelected && selectedIds.size >= MAX_INVITES;

    return (
      <Pressable
        onPress={() => !isDisabled && toggleSelect(item.id)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: isSelected ? COLORS.selectedBg : COLORS.background,
          borderBottomWidth: 0.69,
          borderBottomColor: COLORS.border,
          opacity: isDisabled ? 0.4 : pressed ? 0.7 : 1,
        })}
      >
        {/* Checkbox */}
        {isSelected ? <CheckboxFilled /> : <CheckboxEmpty />}

        {/* Avatar */}
        <AvatarPlaceholder name={item.name} color={item.avatarColor} />

        {/* Info */}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.headingText, lineHeight: 24 }}>
            {item.name}
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }} numberOfLines={1}>
            {item.company}
          </Text>
          {/* Trade pills */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 }}>
            {item.trades.map((trade) => (
              <View
                key={trade}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  backgroundColor: trade.toLowerCase() === jobCategory.toLowerCase() ? COLORS.selectedBg : COLORS.chipBg,
                  borderRadius: 9999,
                  borderWidth: trade.toLowerCase() === jobCategory.toLowerCase() ? 0.68 : 0,
                  borderColor: COLORS.primary,
                }}
              >
                <Text style={{
                  fontSize: 11,
                  fontWeight: '400',
                  color: trade.toLowerCase() === jobCategory.toLowerCase() ? COLORS.primary : COLORS.statText,
                  lineHeight: 16,
                }}>
                  {trade}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Rating */}
        <Text style={{ fontSize: 14, fontWeight: '400', color: '#D08700', lineHeight: 20 }}>
          {item.rating} ★
        </Text>
      </Pressable>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, paddingTop: 4 }} edges={['top']}>
        {/* ══════════════════════════════════════════
            HEADER
            ══════════════════════════════════════════ */}
        <View
          style={{
            height: 48,
            paddingHorizontal: 16,
            backgroundColor: COLORS.background,
            borderBottomWidth: 0.68,
            borderBottomColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 1,
          }}
        >
          {/* Close */}
          <Pressable onPress={handleClose} hitSlop={12} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <CloseIcon />
          </Pressable>

          {/* Title — center */}
          <View style={{ position: 'absolute', left: 0, right: 0, alignItems: 'center', pointerEvents: 'none' }}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.primary, lineHeight: 24 }} numberOfLines={1}>
              Invite Contractors
            </Text>
          </View>

          {/* Counter badge */}
          <View style={{ backgroundColor: selectedIds.size > 0 ? COLORS.primary : COLORS.chipBg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 }}>
            <Text style={{ fontSize: 13, fontWeight: '400', color: selectedIds.size > 0 ? '#FFFFFF' : COLORS.lightText, lineHeight: 18 }}>
              {selectedIds.size}/{MAX_INVITES}
            </Text>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            SUBTITLE
            ══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, backgroundColor: COLORS.screenBg }}>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }} numberOfLines={2}>
            Invite contractors from your network to bid on{' '}
            <Text style={{ fontWeight: '500', color: COLORS.headingText }}>{'"'}{jobTitle}{'"'}</Text>
          </Text>
        </View>

        {/* ══════════════════════════════════════════
            SEARCH BAR
            ══════════════════════════════════════════ */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.screenBg, flexDirection: 'row' }}>
          <SearchField
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search contractors..."
          />
        </View>

        {/* ══════════════════════════════════════════
            CONTRACTOR LIST
            ══════════════════════════════════════════ */}
        <FlatList
          data={filteredContractors}
          keyExtractor={(item) => item.id}
          renderItem={renderContractor}
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.bodyText }}>
                No matching contractors
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.lightText, textAlign: 'center' }}>
                No contractors in your network match {'"'}{jobCategory}{'"'}. Try broadening your search.
              </Text>
            </View>
          }
        />

        {/* ══════════════════════════════════════════
            BOTTOM: Note field + Send button
            ══════════════════════════════════════════ */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={noteIsFocused}
        >
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 32,
            backgroundColor: COLORS.background,
            borderTopWidth: 0.68,
            borderTopColor: COLORS.border,
            gap: 12,
          }}
        >
          {/* Optional note */}
          <View
            style={{
              height: 44,
              paddingHorizontal: 16,
              backgroundColor: COLORS.background,
              borderRadius: 10,
              borderWidth: 0.68,
              borderColor: COLORS.inputBorder,
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={note}
              onChangeText={setNote}
              onFocus={() => setNoteIsFocused(true)}
              onBlur={() => setNoteIsFocused(false)}
              placeholder="Add a note (optional)"
              placeholderTextColor={COLORS.lightText}
              style={{ fontSize: 14, fontWeight: '400', color: COLORS.headingText }}
            />
          </View>

          {/* Send Invites button */}
          <Pressable
            onPress={selectedIds.size > 0 ? handleSendInvites : undefined}
            style={({ pressed }) => ({
              height: 48,
              backgroundColor: selectedIds.size > 0 ? COLORS.primary : COLORS.chipBg,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed && selectedIds.size > 0 ? 0.85 : 1,
            })}
          >
            <Text style={{
              fontSize: 16,
              fontWeight: '500',
              color: selectedIds.size > 0 ? '#FFFFFF' : COLORS.lightText,
              lineHeight: 24,
            }}>
              {selectedIds.size > 0
                ? `Send ${selectedIds.size} Invite${selectedIds.size > 1 ? 's' : ''}`
                : 'Select contractors to invite'}
            </Text>
          </Pressable>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

export default InviteContractorsModal;