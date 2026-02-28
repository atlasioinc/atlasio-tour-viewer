// SquadSlotPicker.tsx
// ═══════════════════════════════════════════════════════════════
// Squad Slot Picker — Bottom Sheet Modal
// Shows connected pros filtered by role for filling squad slots
// Single-select: tap a pro → slot fills → sheet dismisses
// Entry: agent taps an empty squad slot on HomeTabAgent
// ═══════════════════════════════════════════════════════════════

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Dimensions,
  Animated,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import SearchField from './SearchField';

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

const StarIcon: React.FC = () => (
  <Svg width={12} height={12} viewBox="0 0 14 14" fill="none">
    <Path
      d="M7 1.17L8.82 4.87L12.88 5.46L9.94 8.32L10.64 12.36L7 10.44L3.36 12.36L4.06 8.32L1.12 5.46L5.18 4.87L7 1.17Z"
      fill="#FFB900"
      stroke="#FFB900"
      strokeWidth={1.17}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FindIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={9.17} cy={9.17} r={6.67} stroke={COLORS.primary} strokeWidth={1.67} />
    <Path d="M14.17 14.17L17.5 17.5" stroke={COLORS.primary} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M9.17 6.67V11.67" stroke={COLORS.primary} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M6.67 9.17H11.67" stroke={COLORS.primary} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────

export interface SquadProCandidate {
  id: string;
  name: string;
  company: string;
  role: string;
  rating: number;
  vouches: number;
  avatarColor: string;
}

// ─────────────────────────────────────────────
// MOCK DATA — Connected pros in agent's network
// In production: fetched via useData hook filtered by role
// ─────────────────────────────────────────────

const CONNECTED_PROS: SquadProCandidate[] = [
  { id: 'sp1', name: 'Mike Rodriguez', company: 'First National Bank', role: 'Mortgage Pro', rating: 4.9, vouches: 127, avatarColor: '#7BA3C9' },
  { id: 'sp2', name: 'Sarah Williams', company: 'Elite Mortgage Group', role: 'Mortgage Pro', rating: 4.8, vouches: 98, avatarColor: '#D4C5A8' },
  { id: 'sp3', name: 'Tom Anderson', company: 'VA Loan Pros', role: 'Mortgage Pro', rating: 4.9, vouches: 89, avatarColor: '#C5D4A8' },
  { id: 'sp4', name: 'Jennifer Lee', company: 'Premier Title', role: 'Title/Escrow', rating: 4.9, vouches: 104, avatarColor: '#D4A8B5' },
  { id: 'sp5', name: 'David Torres', company: 'Secure Title Co', role: 'Title/Escrow', rating: 4.8, vouches: 93, avatarColor: '#B5C4A8' },
  { id: 'sp6', name: 'Emma Wilson', company: 'Prestige Title Services', role: 'Title/Escrow', rating: 4.7, vouches: 76, avatarColor: '#B8A8D4' },
  { id: 'sp7', name: 'Carlos Martinez', company: 'Precision Inspections', role: 'Home Inspector', rating: 5.0, vouches: 156, avatarColor: '#A8D4C5' },
  { id: 'sp8', name: 'Lisa Park', company: 'HomeCheck Pro', role: 'Home Inspector', rating: 4.8, vouches: 112, avatarColor: '#D4A8C5' },
  { id: 'sp9', name: 'Angela Rivera', company: 'DetailCheck Inspections', role: 'Home Inspector', rating: 4.9, vouches: 88, avatarColor: '#C4A882' },
  { id: 'sp10', name: 'Kevin Park', company: 'Smooth Close TC', role: 'Transaction Coordinator', rating: 4.9, vouches: 71, avatarColor: '#C9B87B' },
  { id: 'sp11', name: 'Maria Santos', company: 'DealFlow Coordination', role: 'Transaction Coordinator', rating: 4.8, vouches: 64, avatarColor: '#A8B5D4' },
  // Appraisers
  { id: 'sp12', name: 'Sarah Chen', company: 'Mountain View Appraisals', role: 'Appraiser', rating: 4.9, vouches: 89, avatarColor: '#A8B5D4' },
  { id: 'sp13', name: 'Robert Hayes', company: 'Front Range Valuations', role: 'Appraiser', rating: 4.8, vouches: 72, avatarColor: '#C5A8B5' },
  { id: 'sp14', name: 'Diana Flores', company: 'Peak Appraisal Group', role: 'Appraiser', rating: 4.7, vouches: 58, avatarColor: '#D4C5B5' },
  // Contractors
  { id: 'sp15', name: 'Brian Cooper', company: 'ProBuild Contractors', role: 'Contractor', rating: 5.0, vouches: 67, avatarColor: '#7BA3C9' },
  { id: 'sp16', name: 'James Foster', company: 'Summit Roofing', role: 'Contractor', rating: 4.7, vouches: 52, avatarColor: '#D4C5A8' },
  { id: 'sp17', name: 'Jake Thompson', company: 'Thompson Plumbing', role: 'Contractor', rating: 4.9, vouches: 94, avatarColor: '#B5D4A8' },
  { id: 'sp18', name: 'Miguel Hernandez', company: 'Hernandez Drywall', role: 'Contractor', rating: 4.8, vouches: 61, avatarColor: '#A8C4D4' },
  // Warranty
  { id: 'sp19', name: 'Lisa Martinez', company: 'Denver Home Warranty', role: 'Warranty', rating: 4.8, vouches: 76, avatarColor: '#B8A8D4' },
  { id: 'sp20', name: 'Paul Greene', company: 'Shield Home Protection', role: 'Warranty', rating: 4.6, vouches: 43, avatarColor: '#C4D4A8' },
  // Attorneys
  { id: 'sp21', name: 'David Kim', company: 'RE Law Group', role: 'Attorney', rating: 5.0, vouches: 64, avatarColor: '#A8D4B5' },
  { id: 'sp22', name: 'Rachel Nguyen', company: 'Denver Property Law', role: 'Attorney', rating: 4.8, vouches: 51, avatarColor: '#D4B5A8' },
];

// ─────────────────────────────────────────────
// AVATAR
// ─────────────────────────────────────────────

const SingleAvatar: React.FC<{ color: string; name: string; size?: number }> = ({
  color,
  name,
  size = 48,
}) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .substring(0, 2);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.34, fontWeight: '600', color: '#FFFFFF' }}>
        {initials}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// CONTACT ROW — Single pro in the list
// Shows avatar, name, company, rating + vouches
// ─────────────────────────────────────────────

const ProRow: React.FC<{
  pro: SquadProCandidate;
  onPress: (pro: SquadProCandidate) => void;
}> = ({ pro, onPress }) => (
  <Pressable
    onPress={() => onPress(pro)}
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
    <SingleAvatar color={pro.avatarColor} name={pro.name} />
    <View style={{ flex: 1 }}>
      <Text
        style={{ fontSize: 16, fontWeight: '500', color: COLORS.darkText, lineHeight: 24 }}
        numberOfLines={1}
      >
        {pro.name}
      </Text>
      <Text
        style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20 }}
        numberOfLines={1}
      >
        {pro.company}
      </Text>
    </View>
    <View style={{ alignItems: 'flex-end', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
        <StarIcon />
        <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.darkText, lineHeight: 18 }}>
          {pro.rating}
        </Text>
      </View>
      <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>
        {pro.vouches} vouches
      </Text>
    </View>
  </Pressable>
);

// ═══════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════

interface SquadSlotPickerProps {
  /** Whether the picker is visible */
  visible: boolean;
  /** The role to filter by (e.g., 'Mortgage Pro', 'Title/Escrow') */
  role: string;
  /** Called when a pro is selected — parent fills the slot */
  onSelect: (pro: SquadProCandidate) => void;
  /** Called when the picker is dismissed without selection */
  onClose: () => void;
  /** Navigate to Find tab to discover new pros */
  onFindNewPro?: () => void;
  /** Called when user removes the current pro from this slot */
  onRemove?: () => void;
  /** ID of a pro already in this slot (to show "Change" context) */
  currentProId?: string;
  /** Whether this slot is an additional (non-default) role that can be removed entirely */
  isAdditionalRole?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SquadSlotPicker: React.FC<SquadSlotPickerProps> = ({
  visible,
  role,
  onSelect,
  onClose,
  onFindNewPro,
  onRemove,
  currentProId,
  isAdditionalRole = false,
}) => {
  const [searchText, setSearchText] = useState('');

  // ── Fade backdrop + slide sheet animation ──
  const [modalMounted, setModalMounted] = useState(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

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

  // Filter connected pros by role + search text
  const filteredPros = useMemo(() => {
    let pros = CONNECTED_PROS.filter((p) => p.role === role);

    // Exclude the currently selected pro if changing
    if (currentProId) {
      pros = pros.filter((p) => p.id !== currentProId);
    }

    if (searchText.length > 0) {
      const q = searchText.toLowerCase();
      pros = pros.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q)
      );
    }

    // Sort by vouches (most trusted first)
    return pros.sort((a, b) => b.vouches - a.vouches);
  }, [role, searchText, currentProId]);

  // Reset search when modal opens/closes
  const handleClose = () => {
    setSearchText('');
    onClose();
  };

  const handleSelect = (pro: SquadProCandidate) => {
    setSearchText('');
    onSelect(pro);
  };

  const handleFindNew = () => {
    setSearchText('');
    onClose();
    onFindNewPro?.();
  };

  const handleRemove = () => {
    setSearchText('');
    onClose();
    onRemove?.();
  };

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
        <Pressable
          onPress={handleClose}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Sheet — slides up from bottom */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: SCREEN_HEIGHT * 0.85,
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
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: '#D1D5DC',
              }}
            />
          </View>

          {/* ── Header: Title + Close ── */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 12,
            }}
          >
            <View style={{ flex: 1, gap: 2, paddingRight: 16 }}>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: '600',
                  color: COLORS.darkText,
                  lineHeight: 28,
                }}
              >
                {currentProId ? `Change ${role}` : `Add ${role}`}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '400',
                  color: COLORS.secondaryText,
                  lineHeight: 20,
                }}
              >
                From your connections
              </Text>
            </View>
            <Pressable
              onPress={handleClose}
              hitSlop={12}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 9999,
                backgroundColor: '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.5 : 1,
              })}
            >
              <CloseIcon />
            </Pressable>
          </View>

          {/* ── Search Field ── */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 8, height: 52 }}>
            <SearchField
              value={searchText}
              onChangeText={setSearchText}
              placeholder={`Search ${role.toLowerCase()}s...`}
            />
          </View>

          {/* ── Count + Sort Label ── */}
          <View
            style={{
              paddingHorizontal: 16,
              paddingTop: 4,
              paddingBottom: 8,
              borderBottomWidth: 0.68,
              borderBottomColor: COLORS.border,
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '400',
                color: COLORS.secondaryText,
                lineHeight: 16,
                textTransform: 'uppercase',
                letterSpacing: 0.3,
              }}
            >
              {filteredPros.length} {filteredPros.length === 1 ? 'connection' : 'connections'} · Sorted by vouches
            </Text>
          </View>

          {/* ── Pro List ── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
          >
            {filteredPros.length > 0 ? (
              filteredPros.map((pro) => (
                <ProRow key={pro.id} pro={pro} onPress={handleSelect} />
              ))
            ) : (
              /* ── Empty State ── */
              <View style={{ padding: 40, alignItems: 'center', gap: 12 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: COLORS.bodyText,
                    textAlign: 'center',
                  }}
                >
                  {searchText.length > 0
                    ? 'No matching connections'
                    : `No ${role.toLowerCase()}s in your network yet`}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: COLORS.secondaryText,
                    textAlign: 'center',
                    lineHeight: 20,
                  }}
                >
                  {searchText.length > 0
                    ? 'Try a different search'
                    : `Find and connect with ${role.toLowerCase()}s to add them to your squad`}
                </Text>
              </View>
            )}

            {/* ── Bottom CTAs ── */}
            {(onRemove && (currentProId || isAdditionalRole)) || onFindNewPro ? (
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: filteredPros.length > 0 ? 16 : 0,
                  paddingBottom: 24,
                  gap: 12,
                }}
              >
                {/* Remove from Squad / Remove Role */}
                {onRemove && (currentProId || isAdditionalRole) && (
                  <Pressable
                    onPress={handleRemove}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 48,
                      borderRadius: 10,
                      borderWidth: 0.68,
                      borderColor: COLORS.errorRed,
                      backgroundColor: COLORS.background,
                      gap: 8,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                      <Path d="M2 4H14" stroke={COLORS.errorRed} strokeWidth={1.33} strokeLinecap="round" />
                      <Path d="M5.33 4V2.67C5.33 2.3 5.63 2 6 2H10C10.37 2 10.67 2.3 10.67 2.67V4" stroke={COLORS.errorRed} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
                      <Path d="M3.33 4L4 13.33C4 13.7 4.3 14 4.67 14H11.33C11.7 14 12 13.7 12 13.33L12.67 4" stroke={COLORS.errorRed} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: COLORS.errorRed,
                        lineHeight: 20,
                      }}
                    >
                      {isAdditionalRole && !currentProId
                        ? 'Remove role from squad'
                        : isAdditionalRole
                        ? 'Remove role and pro'
                        : 'Remove from squad'}
                    </Text>
                  </Pressable>
                )}

                {/* Find New Pro */}
                {onFindNewPro && (
                  <Pressable
                    onPress={handleFindNew}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: 48,
                      borderRadius: 10,
                      borderWidth: 0.68,
                      borderColor: COLORS.primary,
                      backgroundColor: COLORS.background,
                      gap: 8,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <FindIcon />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: COLORS.primary,
                        lineHeight: 20,
                      }}
                    >
                      Find a new {role.toLowerCase()}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}
          </ScrollView>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

export default SquadSlotPicker;
