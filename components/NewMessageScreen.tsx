// NewMessageScreen.tsx
// ═══════════════════════════════════════════════════════════════
// New Message Screen — Contact picker for 1:1 and deal chats (252 lines)
// Tapping a contact → ChatScreen (1:1)
// Tapping "New Deal Chat" → CreateDealChat (deal flow)
// Business rule: Contractors hidden from contact list (Closing Partners only)
//
// Sections: Design Tokens, Navigation Type, SVG Icons,
//           Data Types, Mock Data, Avatar, Contact Row, Main Screen
//
// @demo  SUGGESTED_CONTACTS used when USE_MOCK_DATA=true
//        Live: useChatRecipients() — accepted connections, real profile UUIDs
// @backend useChatRecipients (wired S119d) — connections table bidirectional join
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Circle } from 'react-native-svg';
import SearchField from './SearchField';
import type { InboxStackParamList } from './InboxStack';
import { COLORS } from '../lib/tokens';
import { useChatRecipients } from '../hooks/useData';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { Avatar } from './shared';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// NAVIGATION TYPE
// ─────────────────────────────────────────────
type NewMessageNavProp = NativeStackNavigationProp<InboxStackParamList, 'NewMessage'>;

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

// S151: bottom-sheet modal dismisses via right-aligned X (was left chevron)
const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M15 5L5 15M5 5l10 10" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const NewDealChatIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M13.33 16.67V15C13.33 14.12 12.98 13.27 12.35 12.64C11.73 12.02 10.88 11.67 10 11.67H5C4.12 11.67 3.27 12.02 2.64 12.64C2.02 13.27 1.67 14.12 1.67 15V16.67" stroke={COLORS.primary} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={7.5} cy={5.83} r={3.33} stroke={COLORS.primary} strokeWidth={1.67} />
    <Path d="M16.67 6.67V11.67" stroke={COLORS.primary} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M14.17 9.17H19.17" stroke={COLORS.primary} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────

interface SuggestedContact {
  id: string;
  name: string;
  company: string;
  role: string;
  avatarColor: string;
}

// ─────────────────────────────────────────────
// @demo MOCK DATA — 5 Closing Partners only (no Contractors)
// ─────────────────────────────────────────────

const SUGGESTED_CONTACTS: SuggestedContact[] = [
  { id: 's1', name: 'Mike Rodriguez', company: 'First National Bank', role: 'Lender', avatarColor: '#7BA3C9' },
  { id: 's2', name: 'Jennifer Lee', company: 'Premier Title', role: 'Title', avatarColor: '#D4A8B5' },
  { id: 's3', name: 'Carlos Martinez', company: 'Precision Inspections', role: 'Inspector', avatarColor: '#A8D4C5' },
  { id: 's5', name: 'Robert Johnson', company: 'Accurate Appraisals', role: 'Appraiser', avatarColor: '#A8B5D4' },
  { id: 's6', name: 'Sarah Williams', company: 'Elite Mortgage Group', role: 'Lender', avatarColor: '#D4C5A8' },
  { id: 's7', name: 'David Torres', company: 'Secure Title Co', role: 'Title', avatarColor: '#B5C4A8' },
  { id: 's8', name: 'Lisa Park', company: 'HomeCheck Pro', role: 'Inspector', avatarColor: '#D4A8C5' },
  { id: 's10', name: 'Emma Wilson', company: 'Prestige Title Services', role: 'Title', avatarColor: '#B8A8D4' },
];

// ─────────────────────────────────────────────
// CONTACT ROW
// ─────────────────────────────────────────────

const ContactRow: React.FC<{
  contact: SuggestedContact;
  onPress: (contact: SuggestedContact) => void;
}> = ({ contact, onPress }) => (
  <Pressable
    onPress={() => onPress(contact)}
    style={({ pressed }) => ({
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      height: 72,
      backgroundColor: COLORS.background,
      borderBottomWidth: 0.68,
      borderBottomColor: COLORS.cardBorder,
      gap: 12,
      opacity: pressed ? 0.9 : 1,
    })}
  >
    <Avatar uri={null} name={contact.name} color={contact.avatarColor} size={48} />
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.darkText, lineHeight: 24 }} numberOfLines={1}>
        {contact.name}
      </Text>
      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20 }} numberOfLines={1}>
        {contact.company} • {contact.role}
      </Text>
    </View>
  </Pressable>
);

// ═══════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════

const NewMessageScreen: React.FC = () => {
  const navigation = useNavigation<NewMessageNavProp>();
  const insets = useSafeAreaInsets();
  const [searchText, setSearchText] = useState('');
  const { data: liveRecipients = [] } = useChatRecipients();

  // @backend useChatRecipients — queries connections table both directions
  // Returns real profile UUIDs as id field (S115d bidirectional join fix applied)
  const contacts: SuggestedContact[] = FEATURE_FLAGS.USE_MOCK_DATA
    ? SUGGESTED_CONTACTS
    : liveRecipients.map((r) => ({
        id: r.id,
        name: r.name,
        company: r.company,
        role: r.role,
        avatarColor: r.avatar_color,
      }));

  const filteredContacts = useMemo(() => {
    if (searchText.length === 0) return contacts;
    const q = searchText.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q)
    );
  }, [searchText, contacts]);

  const handleContactPress = (contact: SuggestedContact) => {
    navigation.navigate('ChatScreen', {
      recipientId: contact.id, // user UUID — ChatScreen creates thread on first send
      contactName: contact.name,
      contactCompany: contact.company,
      contactRole: contact.role,
      contactAvatarColor: contact.avatarColor,
    });
  };

  const handleNewDealChat = () => {
    navigation.navigate('CreateDealChat');
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header — S151: X on right, title left-aligned (bottom-sheet modal pattern) */}
      <View style={{ backgroundColor: COLORS.background, borderBottomWidth: 0.68, borderBottomColor: COLORS.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 8, paddingTop: 12 + insets.top, paddingBottom: 4 }}>
          <Text style={{ flex: 1, fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28 }}>
            New Message
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <CloseIcon />
          </Pressable>
        </View>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row' }}>
          <SearchField
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search contacts..."
          />
        </View>
      </View>

      {/* Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        keyboardShouldPersistTaps="handled"
      >
        {/* New Deal Chat */}
        <Pressable
          onPress={handleNewDealChat}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            height: 72,
            backgroundColor: COLORS.background,
            borderBottomWidth: 0.7,
            borderBottomColor: COLORS.border,
            gap: 12,
            opacity: pressed ? 0.9 : 1,
          })}
        >
          <View style={{ width: 48, height: 48, borderRadius: 9999, backgroundColor: 'rgba(0, 61, 195, 0.10)', alignItems: 'center', justifyContent: 'center' }}>
            <NewDealChatIcon />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.darkText, lineHeight: 24 }}>New Deal Chat</Text>
            <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>For transaction coordination with closing partners</Text>
          </View>
        </Pressable>

        {/* Suggested header */}
        <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 8, backgroundColor: COLORS.screenBg, borderBottomWidth: 0.7, borderBottomColor: COLORS.border }}>
          <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '400', textTransform: 'uppercase', lineHeight: 16, letterSpacing: 0.3 }}>Suggested</Text>
        </View>

        {/* Contact list — Closing Partners only */}
        <View style={{ backgroundColor: COLORS.background }}>
          {filteredContacts.length > 0 ? (
            filteredContacts.map((contact) => (
              <ContactRow key={contact.id} contact={contact} onPress={handleContactPress} />
            ))
          ) : (
            <View style={{ padding: 48, alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.bodyText }}>No contacts found</Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, textAlign: 'center' }}>Try a different search</Text>
            </View>
          )}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

export default NewMessageScreen;
