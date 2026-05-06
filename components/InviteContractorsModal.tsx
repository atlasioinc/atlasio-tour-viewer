// ═══════════════════════════════════════════════════════════════
// components/InviteContractorsModal.tsx
// Invite Contractors Modal — Agent View
//
// Searchable list of network contractors with optional Near-This-Job section.
// Multi-select up to 5 contractors with optional note.
// Triggered from RepairJobDetails → "Invite Pros" button (S175).
//
// @backend useNetworkContacts('contractors') → connections + profiles join (S175)
// @backend useInviteContractors → append_invited_contractors RPC + job_invitations upsert
// @backend TODO: extend rpc_invite_contractors with p_note param (ATL-LOCATION-04)
// @backend TODO: useNetworkContacts is requester-only — extend to bidirectional
//          (matches NetworkTab behavior; misses contractors who connected to the agent)
// On success: emits DeviceEventEmitter 'atlasio.job.contractorsInvited' { jobId, count }
//             — RepairJobDetails listens to surface SuccessToast.
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
  DeviceEventEmitter,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import { Avatar, SkeletonBlock } from './shared';
import { DisplayTag } from './DisplayTag';
import SearchField from './SearchField';
import type { ContractorForJob, NetworkContact, TradeEnum } from '../types';
import { useNetworkContacts, useInviteContractors } from '../hooks/useData';
import { TRADE_ENUM_TO_LABEL } from '../lib/tradesMap';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

const MAX_INVITES = 5;

// S175 — sentinel ID prefix for skeleton rows. renderItem branches on this prefix.
const SKELETON_ID_PREFIX = '__skeleton_';

// ─────────────────────────────────────────────
// CONTRACTOR TYPE
// @cleanup — local NetworkContractor type shadows types/index.ts NetworkContractor.
//            Migrate to canonical type when modal is refactored (ATL-LOCATION-04).
// ─────────────────────────────────────────────

export interface NetworkContractor {
  id: string;
  name: string;
  company: string;
  trades: string[]; // e.g., ['Electrical', 'HVAC']
  rating: number;
  avatarColor: string;
  // S177 — bug fix pass: trade label subtitle + nearby distance + service-area label
  tradeLabel?: string | null;       // display label from TRADE_ENUM_TO_LABEL
  distanceMi?: number | null;       // @backend rpc_get_contractors_for_job distance_mi
  serviceAreaLabel?: string | null; // @backend rpc_get_contractors_for_job service_area_label
}

// S175 — three skeleton placeholder rows shown while useNetworkContacts loads.
// Loading-flash trap rule (lessons.md S163-S164): never render an empty list
// while live data is loading.
const SKELETON_ROWS: NetworkContractor[] = [
  { id: `${SKELETON_ID_PREFIX}1`, name: '', company: '', trades: [], rating: 0, avatarColor: '' },
  { id: `${SKELETON_ID_PREFIX}2`, name: '', company: '', trades: [], rating: 0, avatarColor: '' },
  { id: `${SKELETON_ID_PREFIX}3`, name: '', company: '', trades: [], rating: 0, avatarColor: '' },
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

// @backend mode='post-job' (default): wires to useInviteContractors mutation
//   (append_invited_contractors + job_invitations.upsert with note).
// @demo mode='pre-job': returns selected contractors to parent via onConfirm —
//   no RPC call, no Alert (job not yet created).
interface InviteContractorsModalProps {
  visible: boolean;
  onClose: () => void;
  // S175 — required for post-job mode (passes jobId to invite RPC + job_invitations).
  // Optional in pre-job mode (job not yet created — onConfirm returns selection).
  jobId?: string;
  jobTitle: string;
  jobCategory: string; // currently used in subtitle copy + Alert; trade filter dropped S175
  // S175 — passed for future trade filtering when useNetworkContacts
  // joins contractor trades (ATL-LOCATION-04).
  // Currently unused — no per-contact trade data available to match against.
  jobTrades?: TradeEnum[] | null;
  mode?: 'post-job' | 'pre-job'; // default: 'post-job'
  onConfirm?: (contractors: NetworkContractor[]) => void; // required when mode='pre-job'
  // S171 — ATL-LOCATION-03: contractors whose service area covers the job point.
  // Adapted to NetworkContractor shape internally so the row component is shared.
  nearbyContractors?: ContractorForJob[];
}

const InviteContractorsModal: React.FC<InviteContractorsModalProps> = ({
  visible,
  onClose,
  jobId,
  jobTitle,
  jobCategory,
  jobTrades: _jobTrades, // S175 — unused; kept for ATL-LOCATION-04 trade-filter wiring
  mode = 'post-job',
  onConfirm,
  nearbyContractors,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [note, setNote] = useState(`Check this ${jobCategory.toLowerCase()} job?`);
  const [noteIsFocused, setNoteIsFocused] = useState(false);

  // S175 — live network hook (replaces MOCK_NETWORK_CONTRACTORS).
  // @backend useNetworkContacts('contractors') → connections + profiles join.
  // Limitation: requester-only (matches NetworkTab); doesn't return contractors
  // who connected TO the agent. Tracked for ATL-LOCATION-04 follow-up.
  const { data: networkContacts, isLoading: isLoadingNetwork } =
    useNetworkContacts('contractors');

  // Adapter: NetworkContact → local NetworkContractor (the shape the row renders).
  // id = contractor profile UUID (not connections.id) — required by
  // rpc_invite_contractors and permanent arch rule.
  // @backend S177: NetworkContact.trade (snake_case trades_enum) → tradeLabel via
  //   TRADE_ENUM_TO_LABEL. Used as the Line-2 subtitle on Your Network rows.
  const networkAsLocal: NetworkContractor[] = useMemo(() => {
    return (networkContacts ?? []).map((c: NetworkContact) => ({
      id: c.profile_id, // id = contractor profile UUID (not connections.id) — required by rpc_invite_contractors and permanent arch rule
      name: c.name,
      company: c.company,
      trades: [], // legacy — pill row dropped on Your Network rows S177
      rating: 0, // hidden by row when 0 (same gate used by nearby section)
      avatarColor: c.avatar_color,
      tradeLabel: c.trade ? (TRADE_ENUM_TO_LABEL[c.trade] ?? null) : null,
    }));
  }, [networkContacts]);

  // Search-text filter only.
  // @backend TODO (ATL-LOCATION-04): filter networkAsLocal by jobTrades when
  // useNetworkContacts returns contractor trades. Pattern:
  //   .filter(c => !jobTrades?.length || c.trades.some(t => jobTrades.includes(t)))
  // Currently no-ops — NetworkContact carries no trades array.
  const filteredContractors = useMemo(() => {
    if (searchText.length === 0) return networkAsLocal;
    const q = searchText.toLowerCase();
    return networkAsLocal.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q),
    );
  }, [networkAsLocal, searchText]);

  // S171 — ATL-LOCATION-03: adapt ContractorForJob → NetworkContractor shape
  // so the existing row component renders both lists identically.
  // Field mapping (lossy, intentional):
  //   service_area_label → company (shown as subtitle in row)
  //   vouch_count        → rating  (hidden when 0 — see row render below)
  //   trade              → trades  (singleton array or empty)
  //   avatar_color       → avatarColor (fallback: COLORS.primary)
  // Dedup: contractors already in the live "Your Network" list are excluded
  // (S175 — was MOCK_NETWORK_CONTRACTORS pre-S175).
  const nearbyAsNetwork: NetworkContractor[] = useMemo(() => {
    const networkIds = new Set(networkAsLocal.map((c) => c.id));
    return (nearbyContractors ?? [])
      .filter((c) => !networkIds.has(c.id))
      .map((c) => ({
        id: c.id,
        name: c.name,
        company: c.service_area_label ?? '', // legacy — preserved for back-compat (S177: not rendered, locationLine uses serviceAreaLabel directly)
        trades: c.trade ? [c.trade] : [],    // legacy — pill row dropped on Near This Job rows S177 (DisplayTag used instead)
        rating: c.vouch_count,
        avatarColor: c.avatar_color ?? COLORS.primary,
        // @backend rpc_get_contractors_for_job — trade + distance_mi + service_area_label S177
        tradeLabel: c.trade ? (TRADE_ENUM_TO_LABEL[c.trade] ?? null) : null,
        distanceMi: c.distance_mi ?? null,
        serviceAreaLabel: c.service_area_label ?? null,
      }));
  }, [nearbyContractors, networkAsLocal]);

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

  // S175 — invite mutation. Hook handles invalidateQueries(repairJob) on success.
  const inviteContractors = useInviteContractors();

  // ── Handle send invites / confirm selection ──
  const handleSendInvites = useCallback(async () => {
    if (selectedIds.size === 0) return;

    // S171 — selection pool spans both Your Network (live) and Near This Job lists.
    const selectedContractors = [...networkAsLocal, ...nearbyAsNetwork].filter(
      (c) => selectedIds.has(c.id),
    );

    // Pre-job mode: return selected contractors to parent — no RPC, no Alert.
    if (mode === 'pre-job' && onConfirm) {
      onConfirm(selectedContractors);
      setSelectedIds(new Set());
      setSearchText('');
      return;
    }

    // Post-job mode: invoke real RPC.
    if (!jobId) {
      console.warn('[InviteContractorsModal] post-job mode but no jobId provided');
      return;
    }

    // @backend useInviteContractors → append_invited_contractors(p_job_id, p_contractor_ids)
    //   + job_invitations upsert with note. invited_by uses auth.uid() (S175 fix).
    // contractorIds are profile UUIDs (NetworkContact.profile_id, ContractorForJob.id).
    try {
      await inviteContractors.mutateAsync({
        jobId,
        contractorIds: selectedContractors.map((c) => c.id),
        note: note.trim() || undefined,
      });
      // Success: emit cross-screen signal so RepairJobDetails surfaces a toast.
      DeviceEventEmitter.emit('atlasio.job.contractorsInvited', {
        jobId,
        count: selectedContractors.length,
      });
      setSelectedIds(new Set());
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Failed to send invitations', message);
    }
  }, [selectedIds, jobId, note, onClose, mode, onConfirm, networkAsLocal, nearbyAsNetwork, inviteContractors]);

  // ── Reset state when modal closes ──
  const handleClose = useCallback(() => {
    setSearchText('');
    setSelectedIds(new Set());
    setNote(`Check this ${jobCategory.toLowerCase()} job?`);
    setNoteIsFocused(false);
    onClose();
  }, [onClose, jobCategory]);

  // S175 — skeleton row matching the same row layout (44px avatar + 2 text lines).
  const renderSkeletonRow = (key: string) => (
    <View
      key={key}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.background,
        borderBottomWidth: 0.69,
        borderBottomColor: COLORS.border,
      }}
    >
      <SkeletonBlock width={44} height={44} borderRadius={9999} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBlock width={'60%'} height={16} />
        <SkeletonBlock width={'40%'} height={14} />
      </View>
    </View>
  );

  // ── Render contractor row ──
  // S177 — layout branches by section:
  //   Your Network    : name + tradeLabel subtitle
  //   Near This Job   : name + (location · distance) + bottom row [DisplayTag] [vouch ★]
  // Avatar is non-interactive in both sections — no profile routing from this modal.
  const renderContractor = ({ item, sectionTitle }: { item: NetworkContractor; sectionTitle: string }) => {
    const isSelected = selectedIds.has(item.id);
    const isDisabled = !isSelected && selectedIds.size >= MAX_INVITES;
    const isNearby = sectionTitle === 'Near This Job';

    // Near This Job — compose "City, ST · 3.4 mi away" from the new RPC fields.
    const locationLine = isNearby
      ? [
          item.serviceAreaLabel,
          item.distanceMi != null ? `${item.distanceMi} mi away` : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : '';

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

        {/* Avatar — non-interactive (S177): no onPress, no profile routing from this modal */}
        <Avatar uri={null} name={item.name} size={44} color={item.avatarColor} />

        {/* Info */}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.headingText, lineHeight: 24 }}>
            {item.name}
          </Text>

          {isNearby ? (
            <>
              {/* Line 2 — location + distance, render only if non-empty */}
              {locationLine.length > 0 && (
                <Text
                  style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20 }}
                  numberOfLines={1}
                >
                  {locationLine}
                </Text>
              )}

              {/* Bottom row — DisplayTag (left) + vouch count (right) */}
              {(item.tradeLabel || item.rating > 0) && (
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 4,
                  }}
                >
                  {item.tradeLabel ? (
                    <DisplayTag label={item.tradeLabel} variant="default" fontSize={12} />
                  ) : (
                    <View />
                  )}
                  {item.rating > 0 && (
                    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.starText, lineHeight: 20 }}>
                      {item.rating} ★
                    </Text>
                  )}
                </View>
              )}
            </>
          ) : (
            // Your Network — Line 2: plain trade label subtitle (rendered only if non-null)
            item.tradeLabel && (
              <Text
                style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20 }}
                numberOfLines={1}
              >
                {item.tradeLabel}
              </Text>
            )
          )}
        </View>
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
            // S175 — skeleton placeholders during initial network fetch.
            // Loading-flash trap rule (lessons.md S163-S164): never render an
            // empty/mock list while live data is loading.
            ...(isLoadingNetwork && !networkContacts
              ? [{ title: 'Your Network', data: SKELETON_ROWS }]
              : filteredContractors.length > 0
                ? [{ title: 'Your Network', data: filteredContractors }]
                : []),
            ...(nearbyFiltered.length > 0
              ? [{ title: 'Near This Job', data: nearbyFiltered }]
              : []),
          ]}
          keyExtractor={(item) => item.id}
          renderItem={({ item, section }) =>
            item.id.startsWith(SKELETON_ID_PREFIX)
              ? renderSkeletonRow(item.id)
              : renderContractor({ item, sectionTitle: section.title })
          }
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
            isLoadingNetwork ? null : (
              <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.bodyText }}>
                  No contractors yet
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.lightText, textAlign: 'center' }}>
                  Connect with contractors in your network to invite them to jobs.
                </Text>
              </View>
            )
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