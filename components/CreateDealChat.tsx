// CreateDealChat.tsx
// ═══════════════════════════════════════════════════════════════
// Create New Deal Chat — Single screen (592 lines)
// Header: Back + title + search field for closing partners
// Body: Deal name (required), Property Address, Closing Date,
//       info banner, selected participant chips
// Footer: "Create Chat" button (disabled until name entered)
// Searching shows contact list overlay in body area
//
// @demo  Mock contacts list, console.log on create
// @backend TODO: rpc_create_deal_thread — create thread + add participants
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { InboxStackParamList } from './InboxStack';
import { COLORS } from '../lib/tokens';

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

const BackIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.5 15L7.5 10L12.5 5" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
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
// ─────────────────────────────────────────────

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
// AVATAR
// ─────────────────────────────────────────────

const SingleAvatar: React.FC<{ color: string; name: string; size?: number }> = ({
  color,
  name,
  size = 40,
}) => {
  const initials = name.split(' ').slice(0, 2).map((n) => n[0]).join('').substring(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.34, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};

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
    <SingleAvatar color={contact.avatarColor} name={contact.name} size={40} />
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Format date to abbreviated "Dec 1" style
  const formatDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  const handleDateConfirm = (date: Date) => {
    setClosingDate(formatDate(date));
    setShowDatePicker(false);
  };
  const [showError, setShowError] = useState(false);
  const [participants, setParticipants] = useState<Contact[]>([]);
  const [highlightedChip, setHighlightedChip] = useState<string | null>(null);
  const searchInputRef = useRef<TextInput>(null);

  // Filter contacts: exclude already-added + match search
  const availableContacts = useMemo(() => {
    const addedIds = new Set(participants.map((p) => p.id));
    let filtered = DEAL_CONTACTS.filter((c) => !addedIds.has(c.id));
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
  }, [participants, searchText]);

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

  const canCreate = dealName.trim().length > 0;

  const handleCreateChat = () => {
    if (!canCreate) {
      setShowError(true);
      return;
    }
    console.log('Deal Chat created:', {
      dealName: dealName.trim(),
      propertyAddress: propertyAddress.trim(),
      closingDate: closingDate.trim(),
      participants: participants.map((p) => `${p.name} (${p.role})`),
    });
    navigation.navigate('DealChatScreen', {
      dealName: dealName.trim(),
      propertyAddress: propertyAddress.trim(),
      closingDate: closingDate.trim(),
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ══════════════════════════════════════════
            HEADER
            Row 1: Back + "Create New Deal Chat"
            Row 2: Search field with participant chips
            ══════════════════════════════════════════ */}
        <View style={{ backgroundColor: COLORS.background, borderBottomWidth: 0.68, borderBottomColor: COLORS.border }}>
          {/* Title row */}
          <Pressable
            onPress={handleDismissSearch}
            style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, height: 48 }}
          >
            <Pressable
              onPress={() => {
                if (isSearching) {
                  handleDismissSearch();
                } else {
                  navigation.goBack();
                }
              }}
              hitSlop={12}
              style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.5 : 1 })}
            >
              <BackIcon />
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28, marginLeft: 12 }}>
              Create New Deal Chat
            </Text>
          </Pressable>

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
                <Pressable onPress={() => setSearchText('')}>
                  <Text style={{ fontSize: 16, color: COLORS.lightText }}>✕</Text>
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
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, gap: 24 }}
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
                />
              </View>
              {showError && dealName.trim().length === 0 && (
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.errorRed, lineHeight: 16 }}>
                  Deal name is required
                </Text>
              )}
            </View>

            {/* Property Address — Optional */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                Property Address
              </Text>
              <View
                style={{
                  height: 45,
                  paddingHorizontal: 16,
                  backgroundColor: COLORS.background,
                  borderRadius: 10,
                  borderWidth: 0.68,
                  borderColor: COLORS.border,
                  justifyContent: 'center',
                }}
              >
                <TextInput
                  value={propertyAddress}
                  onChangeText={setPropertyAddress}
                  placeholder="e.g., 123 Main Street, City, State 12345"
                  placeholderTextColor={COLORS.lightText}
                  style={{ fontSize: 14, fontWeight: '400', color: COLORS.darkText }}
                />
              </View>
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
                      <SingleAvatar color={p.avatarColor} name={p.name} size={28} />
                      <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.darkText, lineHeight: 18 }}>
                        {p.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}

        {/* ══════════════════════════════════════════
            FOOTER — Create Chat button
            ══════════════════════════════════════════ */}
        <View style={{ backgroundColor: COLORS.background, borderTopWidth: 0.68, borderTopColor: COLORS.border, paddingHorizontal: 16, paddingTop: 17 }}>
          <SafeAreaView edges={['bottom']}>
            <Pressable
              onPress={handleCreateChat}
              style={({ pressed }) => ({
                height: 52,
                backgroundColor: canCreate ? COLORS.primary : COLORS.disabledBg,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed && canCreate ? 0.85 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: canCreate ? '#FFFFFF' : COLORS.disabledText,
                  lineHeight: 24,
                  textAlign: 'center',
                }}
              >
                Create Chat
              </Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default CreateDealChat;
