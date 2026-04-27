// CreateDealChat.tsx
// ═══════════════════════════════════════════════════════════════
// Create New Deal Chat — Single screen
// Header: Back + title + search field for closing partners
// Body: Deal name (required), Property Address, Closing Date,
//       info banner, selected participant chips
// Footer: "Create Chat" button (disabled until name entered)
// Searching shows contact list overlay in body area
//
// @backend — rpc_create_deal_thread deployed S160. Returns { success, thread_id }.
//            Participants must be valid profile UUIDs with thread_members INSERT rights.
//            Closing date passed as YYYY-MM-DD string, Postgres casts to DATE.
// @backend — Participants sourced from useConnections() (S160 follow-up) — real
//            profile UUIDs from accepted connections, bidirectional per S115d.
//            DEAL_CONTACTS kept below for reference only; no longer referenced.
// @demo    — isSaving state shows 'Creating…' during RPC. Alert on failure.
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { InboxStackParamList } from './InboxStack';
import { COLORS } from '../lib/tokens';
import { roleLabel } from '../lib/roleDisplay';
import { Avatar, AddressAutocompleteInput } from './shared';
import { useCreateDealThread, useConnections } from '../hooks/useData';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// NAVIGATION TYPE
// ─────────────────────────────────────────────
type NavProp = NativeStackNavigationProp<InboxStackParamList, 'CreateDealChat'>;

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

// S155: X dismiss icon — CreateDealChat is a sheet-like entry point inside the
// New Message fullScreenModal flow (InboxStack.tsx:62 registers NewMessageScreen
// as fullScreenModal). S154's back chevron was reverted because chevron implies
// a pushed parent — the modal-flow mental model calls for X.
const CloseIcon: React.FC = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path d="M6 6L18 18" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" />
    <Path d="M18 6L6 18" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SearchIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={9.17} cy={9.17} r={6.67} stroke={COLORS.lightText} strokeWidth={1.67} />
    <Path d="M14.17 14.17L17.5 17.5" stroke={COLORS.lightText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const CalendarIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Rect x={2.5} y={3.33} width={15} height={15} rx={1.67} stroke={COLORS.secondaryText} strokeWidth={1.67} />
    <Path d="M13.33 1.67V5" stroke={COLORS.secondaryText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M6.67 1.67V5" stroke={COLORS.secondaryText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M2.5 8.33H17.5" stroke={COLORS.secondaryText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const CloseChipIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M5 5L11 11" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M11 5L5 11" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────

interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  avatarColor: string;
}

// ─────────────────────────────────────────────
// MOCK CONTACTS — All roles (Deal Chats include Contractors)
// @demo — replaced by liveContacts from useConnections() in S160.
//         Kept here for reference / fallback demo reel. Do not reference in code.
// ─────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const DEAL_CONTACTS: Contact[] = [
  { id: 'd1', name: 'Mike Rodriguez', company: 'First National Bank', role: 'Lender', avatarColor: '#7BA3C9' },
  { id: 'd2', name: 'Jennifer Lee', company: 'Premier Title', role: 'Title', avatarColor: '#D4A8B5' },
  { id: 'd3', name: 'Carlos Martinez', company: 'Precision Inspections', role: 'Inspector', avatarColor: '#A8D4C5' },
  { id: 'd4', name: 'Amy Chen', company: 'BuildRight Contractors', role: 'Contractor', avatarColor: '#C9B87B' },
  { id: 'd5', name: 'Robert Johnson', company: 'Accurate Appraisals', role: 'Appraiser', avatarColor: '#A8B5D4' },
  { id: 'd6', name: 'Sarah Williams', company: 'Elite Mortgage Group', role: 'Lender', avatarColor: '#D4C5A8' },
  { id: 'd7', name: 'David Torres', company: 'Secure Title Co', role: 'Title', avatarColor: '#B5C4A8' },
  { id: 'd8', name: 'Lisa Park', company: 'HomeCheck Pro', role: 'Inspector', avatarColor: '#D4A8C5' },
  { id: 'd9', name: 'Marcus Brown', company: 'ProBuild Contractors', role: 'Contractor', avatarColor: '#C4A882' },
  { id: 'd10', name: 'Emma Wilson', company: 'Prestige Title Services', role: 'Title', avatarColor: '#B8A8D4' },
];

// ─────────────────────────────────────────────
// CONTACT ROW (for search results)
// ─────────────────────────────────────────────

const ContactRow: React.FC<{
  contact: Contact;
  onPress: (contact: Contact) => void;
}> = ({ contact, onPress }) => (
  <Pressable
    onPress={() => onPress(contact)}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: 48,
      backgroundColor: COLORS.background,
      borderBottomWidth: 0.68,
      borderBottomColor: COLORS.cardBorder,
      gap: 12,
      opacity: pressed ? 0.9 : 1,
    })}
  >
    <Avatar uri={null} name={contact.name} color={contact.avatarColor} size={40} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }} numberOfLines={1}>
        {contact.name}
      </Text>
      <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }} numberOfLines={1}>
        {contact.company} • {contact.role}
      </Text>
    </View>
  </Pressable>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const CreateDealChat: React.FC = () => {
  const navigation = useNavigation<NavProp>();

  // ── State ──
  const [searchText, setSearchText] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [dealName, setDealName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [closingDate, setClosingDate] = useState('');
  // S160: closingDate is the display string ("Dec 1") and loses year info.
  // closingDateISO stores YYYY-MM-DD for the RPC; set in lockstep below.
  const [closingDateISO, setClosingDateISO] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format date to abbreviated "Dec 1" style
  const formatDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const handleDateConfirm = (date: Date) => {
    setClosingDate(formatDate(date));
    // S160: keep ISO in lockstep so the RPC receives a real YYYY-MM-DD.
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setClosingDateISO(`${yyyy}-${mm}-${dd}`);
    setShowDatePicker(false);
  };
  const [showError, setShowError] = useState(false);
  const [participants, setParticipants] = useState<Contact[]>([]);
  const [highlightedChip, setHighlightedChip] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);
  const createDealThread = useCreateDealThread();
  const [isSaving, setIsSaving] = useState(false);

  // S160: accepted connections (bidirectional via useConnections — handles both
  // requester and responder sides per S115d). Profile UUIDs here are real and
  // accepted by rpc_create_deal_thread. Memoized so downstream availableContacts
  // useMemo has a stable reference and doesn't recompute every render.
  const { data: connections = [] } = useConnections();
  const liveContacts: Contact[] = useMemo(
    () =>
      connections.map((conn) => ({
        id: conn.profile.id,
        name: conn.profile.name ?? '',
        company: conn.profile.company ?? '',
        role: roleLabel(conn.profile.role ?? ''),
        avatarColor: conn.profile.avatar_color ?? COLORS.primary,
      })),
    [connections],
  );

  // Filter contacts: exclude already-added + match search
  const availableContacts = useMemo(() => {
    const addedIds = new Set(participants.map((p) => p.id));
    let filtered = liveContacts.filter((c) => !addedIds.has(c.id));
    if (searchText.length > 0) {
      const q = searchText.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [participants, searchText, liveContacts]);

  // ── Handlers ──
  const handleAddParticipant = (contact: Contact) => {
    setParticipants((prev) => [...prev, contact]);
    setSearchText('');
    setIsSearching(false);
    searchInputRef.current?.blur();
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDismissSearch = () => {
    setIsSearching(false);
    setSearchText('');
    searchInputRef.current?.blur();
  };

  const canCreate = dealName.trim().length > 0 && participants.length > 0;

  const handleCreateChat = async () => {
    if (!canCreate) {
      setShowError(true);
      return;
    }
    if (isSaving) return;
    // Participant IDs are real profile UUIDs from useConnections() — RPC accepts them in live mode
    const participantIds = participants
      .map((p) => p.id)
      .filter((id): id is string => Boolean(id));

    setIsSaving(true);
    try {
      const result = await createDealThread.mutateAsync({
        dealName: dealName.trim(),
        propertyAddress: propertyAddress.trim() || undefined,
        closingDate: closingDateISO || undefined,
        participantIds,
      });

      // S155: CommonActions.reset rebuilds the stack as [InboxList, DealChatScreen].
      // Prior approach (navigation.replace, S151b/S152) did NOT escape the
      // fullScreenModal ancestor established by NewMessageScreen (InboxStack.tsx:62).
      // On iOS native-stack, replace keeps the ancestor's modal presentation active,
      // so DealChatScreen inherited the sheet look. reset() clears the entire stack
      // and mounts DealChatScreen clean, outside any modal layer. Back from
      // DealChatScreen → InboxList (index: 1 places DealChatScreen as the active
      // route with InboxList as its parent).
      // S160: threadId from RPC is now passed through for future useThreadMessages wiring.
      //       closingDate param keeps the display string ("Dec 15") so the banner reads clean.
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [
            { name: 'InboxList' },
            {
              name: 'DealChatScreen',
              params: {
                threadId: result.thread_id,
                dealName: dealName.trim(),
                propertyAddress: propertyAddress.trim(),
                closingDate: closingDate.trim(),
                // S160: viewer is the agent who just created the deal — hide
                // the "Agent added you to this chat" system pill.
                isCreator: true,
                // S161: pass real participant data so DealChatScreen header
                // shows member tiles with real colors and initials.
                members: participants
                  .filter((p) => Boolean(p.avatarColor))
                  .map((p) => ({ name: p.name ?? '', color: p.avatarColor! })),
              },
            },
          ],
        }),
      );
    } catch (err) {
      console.error('[CreateDealChat] handleCreateChat failed:', err);
      Alert.alert('Error', 'Could not create deal chat. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}
      >
        {/* ══════════════════════════════════════════
            HEADER — S155: sheet-entry pattern (reverted from S154 chevron)
            Row 1: [X 44×44][Title flex:1 centered][44×44 spacer]
            Row 2: Search field with participant chips
            ══════════════════════════════════════════ */}
        <View style={{ backgroundColor: COLORS.background, borderBottomWidth: 0.68, borderBottomColor: COLORS.border }}>
          {/* Title row — S155: X dismiss left, title centered, spacer right */}
          <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 4 }}>
            <Pressable
              onPress={() => {
                if (isSearching) {
                  handleDismissSearch();
                } else {
                  navigation.goBack();
                }
              }}
              style={({ pressed }) => ({ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
            >
              <CloseIcon />
            </Pressable>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '600', color: COLORS.darkText, textAlign: 'center' }}>
              Create New Deal Chat
            </Text>
            <View style={{ width: 44, height: 44 }} />
          </View>

          {/* Search field */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View
              style={{
                minHeight: 45,
                backgroundColor: COLORS.filterBg,
                borderRadius: 9999,
                borderWidth: 0.68,
                borderColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                paddingLeft: 16,
                paddingRight: 12,
                paddingVertical: 6,
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              <SearchIcon />

              {/* Participant chips inside search */}
              {participants.map((p) => (
                <View
                  key={p.id}
                  style={{
                    height: 30,
                    paddingLeft: 10,
                    paddingRight: 6,
                    backgroundColor: highlightedChip === p.id ? '#6B9BF2' : COLORS.primary,
                    borderRadius: 9999,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '400', color: '#FFFFFF', lineHeight: 18 }}>
                    {p.name}
                  </Text>
                  <Pressable
                    onPress={() => handleRemoveParticipant(p.id)}
                    hitSlop={6}
                    style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                  >
                    <CloseChipIcon />
                  </Pressable>
                </View>
              ))}

              {/* Search input */}
              <TextInput
                ref={searchInputRef}
                value={searchText}
                onChangeText={(text) => {
                  setSearchText(text);
                  setHighlightedChip(null);
                  if (!isSearching) setIsSearching(true);
                }}
                onFocus={() => setIsSearching(true)}
                onKeyPress={({ nativeEvent }) => {
                  if (nativeEvent.key === 'Backspace' && searchText.length === 0 && participants.length > 0) {
                    const lastParticipant = participants[participants.length - 1].id;
                    if (highlightedChip === lastParticipant) {
                      setParticipants((prev) => prev.slice(0, -1));
                      setHighlightedChip(null);
                    } else {
                      setHighlightedChip(lastParticipant);
                    }
                  } else {
                    setHighlightedChip(null);
                  }
                }}
                placeholder="Search closing partners..."
                placeholderTextColor={COLORS.placeholderText}
                keyboardAppearance="light"
                style={{
                  flex: 1,
                  minWidth: 120,
                  height: 32,
                  fontSize: 14,
                  fontWeight: '400',
                  color: COLORS.darkText,
                  paddingVertical: 0,
                }}
              />

              {/* Clear search */}
              {searchText.length > 0 && (
                <Pressable
                  onPress={() => setSearchText('')}
                  style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 20, lineHeight: 24, color: COLORS.lightText }}>✕</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        {/* ══════════════════════════════════════════
            BODY — switches between form and search results
            ══════════════════════════════════════════ */}
        {isSearching ? (
          /* ── Contact search results ── */
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, backgroundColor: COLORS.background }}
            keyboardShouldPersistTaps="handled"
          >
            {availableContacts.length > 0 ? (
              availableContacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  onPress={handleAddParticipant}
                />
              ))
            ) : (
              <View style={{ padding: 48, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.lightText, textAlign: 'center' }}>
                  No more contacts to add
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          /* ── Form fields ── */
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flex: 1, backgroundColor: COLORS.screenBg }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 24, gap: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Deal / Chat Name — Required */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                Deal/Chat Name <Text style={{ color: COLORS.errorRed }}>*</Text>
              </Text>
              <View
                style={{
                  height: 45,
                  paddingHorizontal: 16,
                  backgroundColor: COLORS.background,
                  borderRadius: 10,
                  borderWidth: 0.68,
                  borderColor: showError && dealName.trim().length === 0 ? COLORS.errorRed : COLORS.border,
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  value={dealName}
                  onChangeText={(text) => { setDealName(text); setShowError(false); }}
                  placeholder="e.g., 123 Main St – Smith Buyer"
                  placeholderTextColor={COLORS.placeholderText}
                  style={{ fontSize: 14, fontWeight: '400', color: COLORS.darkText }}
                  keyboardAppearance="light"
                />
              </View>
              {showError && dealName.trim().length === 0 && (
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.errorRed, lineHeight: 16 }}>
                  Deal name is required
                </Text>
              )}
            </View>

            {/* Property Address — Optional */}
            {/* S151b: swapped inline TextInput for shared AddressAutocompleteInput so CreateDealChat
                actually hits Google Places (Bug A — autocomplete never fired on this screen).
                @demo    — address stored as string only; lat/lng stubbed until live wiring
                @backend — rpc_create_deal_thread will need (p_property_address, p_lat, p_lng).
                           AddressAutocompleteInput returns only the description string today;
                           resolve lat/lng via a Places Details call (or extend the shared component)
                           when the RPC is wired. */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                Property Address
              </Text>
              <AddressAutocompleteInput
                value={propertyAddress}
                onSelect={setPropertyAddress}
                placeholder="e.g., 123 Main Street, City, State 12345"
              />
            </View>

            {/* Closing Date — Optional */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                Closing Date
              </Text>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={{
                  height: 45,
                  paddingHorizontal: 16,
                  backgroundColor: COLORS.background,
                  borderRadius: 10,
                  borderWidth: 0.68,
                  borderColor: COLORS.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ flex: 1, fontSize: 14, fontWeight: '400', color: closingDate ? COLORS.darkText : COLORS.lightText }}>
                  {closingDate || 'Select date'}
                </Text>
                <CalendarIcon />
              </Pressable>
              {showDatePicker && (
                <View style={{ alignItems: 'center' }}>
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="inline"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                      if (event.type === 'set' && date) {
                        handleDateConfirm(date);
                      } else if (event.type === 'dismissed') {
                        setShowDatePicker(false);
                      }
                    }}
                  />
                </View>
              )}
            </View>

            {/* Info banner */}
            <View
              style={{
                paddingHorizontal: 17,
                paddingTop: 17,
                paddingBottom: 17,
                backgroundColor: COLORS.infoBg,
                borderRadius: 10,
                borderWidth: 0.68,
                borderColor: COLORS.infoBorder,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.primary, lineHeight: 16 }}>
                Deal chats are for coordinating closings with your trusted partners (lenders, title companies, inspectors, etc.). Keep all transaction communication in one place.
              </Text>
            </View>

            {/* Selected participants preview */}
            {participants.length > 0 && (
              <View style={{ gap: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                  Participants ({participants.length})
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {participants.map((p) => (
                    <View
                      key={p.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        height: 36,
                        paddingLeft: 4,
                        paddingRight: 12,
                        backgroundColor: COLORS.background,
                        borderRadius: 9999,
                        borderWidth: 0.68,
                        borderColor: COLORS.border,
                        gap: 8,
                      }}
                    >
                      <Avatar uri={null} name={p.name} color={p.avatarColor} size={28} />
                      <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.darkText, lineHeight: 18 }}>
                        {p.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

          </ScrollView>
        )}

        {/* ══════════════════════════════════════════
            FOOTER — Create Chat button
            ══════════════════════════════════════════ */}
        {/* S159: root SAV edges={['top']} only. KAV behavior='padding' owns ALL
            keyboard + safe-area spacing. Footer paddingBottom:16 is fixed — iOS
            handles the home indicator automatically when the keyboard is visible.
            Do NOT add insets.bottom here, do NOT wrap in SafeAreaView edges={['bottom']}.
            See tasks/lessons.md KAV rule. */}
        <View style={{
          backgroundColor: COLORS.background,
          borderTopWidth: 0.68,
          borderTopColor: COLORS.border,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 32,
        }}>
          <Pressable
            onPress={handleCreateChat}
            disabled={!canCreate || isSaving}
            style={({ pressed }) => ({
              backgroundColor: canCreate && !isSaving ? COLORS.primary : COLORS.disabledBg,
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed && canCreate && !isSaving ? 0.9 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: canCreate && !isSaving ? COLORS.onPrimary : COLORS.disabledText,
                lineHeight: 20,
              }}
            >
              {isSaving ? 'Creating…' : 'Create Chat'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateDealChat;
