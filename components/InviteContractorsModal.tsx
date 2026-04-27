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
  SectionList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import { Avatar } from './shared';
import SearchField from './SearchField';
import type { ContractorForJob } from '../types';

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

// @demo hardcoded — 10 Denver contractors covering all TRADE_OPTIONS from PostJobWizard
// Every trade in PostJobWizard (General Contractor, Electrical, Plumbing, HVAC, Roofing,
// Carpentry / Handyman, Painting, Flooring) has ≥2 contractors so the list is never empty.
// @backend TODO: replace with useNetworkContractors query (connections + profiles)
const MOCK_NETWORK_CONTRACTORS: NetworkContractor[] = [
  { id: 'nc-1', name: 'Mike Torres', company: 'Torres Electric', trades: ['Electrical', 'General Contractor'], rating: 4.9, avatarColor: '#E8D5B7' },
  { id: 'nc-2', name: 'Sarah Chen', company: 'ProBuild Contractors', trades: ['Electrical', 'Plumbing', 'General Contractor'], rating: 4.8, avatarColor: '#A8C5DA' },
  { id: 'nc-3', name: 'David Park', company: 'Park & Sons Electric', trades: ['Electrical', 'HVAC'], rating: 4.7, avatarColor: '#B5D4A8' },
  { id: 'nc-4', name: 'James Wilson', company: 'Wilson Home Services', trades: ['General Contractor', 'Plumbing', 'HVAC'], rating: 4.6, avatarColor: '#D4A8B5' },
  { id: 'nc-5', name: 'Carlos Rivera', company: 'Rivera Roofing', trades: ['Roofing', 'Carpentry / Handyman'], rating: 4.9, avatarColor: '#C4A882' },
  { id: 'nc-6', name: 'Tom Anderson', company: 'Anderson HVAC', trades: ['HVAC', 'Plumbing'], rating: 4.8, avatarColor: '#C5D4A8' },
  { id: 'nc-7', name: 'Brian Cooper', company: 'Summit Roofing', trades: ['Roofing', 'General Contractor'], rating: 4.7, avatarColor: '#7BA3C9' },
  { id: 'nc-8', name: 'Lisa Martinez', company: 'Precision Plumbing', trades: ['Plumbing', 'General Contractor'], rating: 5.0, avatarColor: '#B8A8D4' },
  { id: 'nc-9', name: 'Jake Thompson', company: 'Thompson Handyman', trades: ['Carpentry / Handyman', 'Painting', 'Flooring'], rating: 4.8, avatarColor: '#A8C4B8' },
  { id: 'nc-10', name: 'Angela Kim', company: 'Denver Electric Pros', trades: ['Electrical', 'Painting', 'Flooring'], rating: 4.9, avatarColor: '#D4C5A8' },
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

// Avatar placeholder replaced by shared Avatar component (S132)

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

// @demo mode='post-job' (default): logs invites to console + shows Alert (existing behavior from RepairJobDetails)
// @demo mode='pre-job': returns selected contractors to parent via onConfirm — no RPC call, no Alert
// @backend mode='post-job': will wire to useInviteContractors mutation (append_invited_contractors RPC)
// @backend mode='pre-job': parent collects IDs and passes them to rpc_create_job → rpc_invite_contractors
interface InviteContractorsModalProps {
  visible: boolean;
  onClose: () => void;
  jobTitle: string;
  jobCategory: string; // trade to filter by
  mode?: 'post-job' | 'pre-job'; // default: 'post-job'
  onConfirm?: (contractors: NetworkContractor[]) => void; // required when mode='pre-job'
  // S171 — ATL-LOCATION-03: contractors whose service area covers the job point.
  // Adapted to NetworkContractor shape internally so the row component is shared.
  nearbyContractors?: ContractorForJob[];
}

const InviteContractorsModal: React.FC<InviteContractorsModalProps> = ({
  visible,
  onClose,
  jobTitle,
  jobCategory,
  mode = 'post-job',
  onConfirm,
  nearbyContractors,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState(`Check this ${jobCategory.toLowerCase()} job?`);
  const [noteIsFocused, setNoteIsFocused] = useState(false);

  // ── Filter contractors by trade match + search text ──
  // Production: this filtering happens server-side via query params
  const filteredContractors = useMemo(() => {
    const tradeFiltered = MOCK_NETWORK_CONTRACTORS.filter((c) =>
      c.trades.some((t) => t.toLowerCase() === jobCategory.toLowerCase())
    );
    // Fallback: if no contractors match the selected trade, show all
    // (handles pre-job mode where agent may not have picked a trade yet)
    const baseList = tradeFiltered.length > 0 ? tradeFiltered : MOCK_NETWORK_CONTRACTORS;

    if (searchText.length === 0) return baseList;
    return baseList.filter((c) =>
      c.name.toLowerCase().includes(searchText.toLowerCase()) ||
      c.company.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, jobCategory]);

  // S171 — ATL-LOCATION-03: adapt ContractorForJob → NetworkContractor shape
  // so the existing row component renders both lists identically.
  // Field mapping (lossy, intentional):
  //   service_area_label → company (shown as subtitle in row)
  //   vouch_count        → rating  (hidden when 0 — see row render below)
  //   trade              → trades  (singleton array or empty)
  //   avatar_color       → avatarColor (fallback: COLORS.primary)
  // Dedup: contractors already in MOCK_NETWORK_CONTRACTORS are excluded.
  const nearbyAsNetwork: NetworkContractor[] = useMemo(() => {
    const networkIds = new Set(MOCK_NETWORK_CONTRACTORS.map(c => c.id));
    return (nearbyContractors ?? [])
      .filter(c => !networkIds.has(c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        company: c.service_area_label ?? '',
        trades: c.trade ? [c.trade] : [],
        rating: c.vouch_count,
        avatarColor: c.avatar_color ?? COLORS.primary,
      }));
  }, [nearbyContractors]);

  const nearbyFiltered: NetworkContractor[] = useMemo(() => {
    if (searchText.length === 0) return nearbyAsNetwork;
    const q = searchText.toLowerCase();
    return nearbyAsNetwork.filter(
      c =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q),
    );
  }, [nearbyAsNetwork, searchText]);

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

  // ── Handle send invites / confirm selection ──
  const handleSendInvites = useCallback(() => {
    if (selectedIds.size === 0) return;

    // S171 — selection pool now spans both Your Network and Near This Job lists.
    const selectedContractors = [...MOCK_NETWORK_CONTRACTORS, ...nearbyAsNetwork].filter(
      (c) => selectedIds.has(c.id),
    );

    // Pre-job mode: return selected contractors to parent — no RPC, no Alert
    if (mode === 'pre-job' && onConfirm) {
      onConfirm(selectedContractors);
      setSelectedIds(new Set());
      setSearchText('');
      return;
    }

    // Post-job mode: existing behavior — log + Alert + close
    // @backend TODO: wire to useInviteContractors mutation:
    //   1. RPC append_invited_contractors(p_job_id, p_contractor_ids)
    //   2. Insert job_invitations rows for tracking
    //   3. Auto-notification: "[Agent] invited you to bid on [Job]"
    console.log('Invites sent:', {
      contractors: selectedContractors.map((c) => c.name),
      jobTitle,
      note: note.trim(),
    });

    Alert.alert(
      'Invites Sent!',
      `${selectedIds.size} contractor${selectedIds.size > 1 ? 's' : ''} invited to "${jobTitle}"`,
      [{ text: 'OK', onPress: () => { setSelectedIds(new Set()); onClose(); } }]
    );
  }, [selectedIds, jobTitle, note, onClose, mode, onConfirm, nearbyAsNetwork]);

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

        {/* Avatar — no avatar_url on NetworkContractor type yet, initials fallback */}
        <Avatar uri={null} name={item.name} size={44} color={item.avatarColor} />

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

        {/* Rating — hidden when 0 (S171: nearby rows pass vouch_count, may be 0) */}
        {item.rating > 0 && (
          <Text style={{ fontSize: 14, fontWeight: '400', color: '#D08700', lineHeight: 20 }}>
            {item.rating} ★
          </Text>
        )}
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
            CONTRACTOR LIST — S171: SectionList with Your Network + Near This Job
            Section headers only render when nearby section exists, preserving
            the pre-S171 single-list look when nearbyContractors is absent/empty.
            ══════════════════════════════════════════ */}
        <SectionList
          sections={[
            { title: 'Your Network', data: filteredContractors },
            ...(nearbyFiltered.length > 0
              ? [{ title: 'Near This Job', data: nearbyFiltered }]
              : []),
          ].filter(s => s.data.length > 0)}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderContractor({ item })}
          renderSectionHeader={({ section: { title } }) =>
            nearbyFiltered.length > 0 ? (
              <View style={{
                paddingVertical: 8,
                paddingHorizontal: 16,
                backgroundColor: COLORS.screenBg,
              }}>
                <Text style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: COLORS.textTertiary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                }}>
                  {title}
                </Text>
              </View>
            ) : null
          }
          stickySectionHeadersEnabled={false}
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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
                ? mode === 'pre-job'
                  ? `Select ${selectedIds.size} Pro${selectedIds.size > 1 ? 's' : ''}`
                  : `Send ${selectedIds.size} Invite${selectedIds.size > 1 ? 's' : ''}`
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