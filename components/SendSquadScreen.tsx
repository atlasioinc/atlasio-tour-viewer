// SendSquadScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Send Squad to Client — Full Screen Flow
// Agent reviews their closing squad, can swap members,
// add a personal intro message, and share via native share sheet.
// Entry: "Send to Client" CTA on HomeTabAgent squad section
// Stack: HomeStack → SendSquadScreen
//
// Fix: Uses useSafeAreaInsets() instead of SafeAreaView edges
// because fullScreenModal presentation on iOS doesn't reliably
// respect SafeAreaView insets on Dynamic Island devices.
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StatusBar,
  Share,
  Alert,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import SquadSlotPicker from './SquadSlotPicker';
import type { SquadProCandidate } from './SquadSlotPicker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackChevronIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M15 18L9 12L15 6"
      stroke={COLORS.lightText}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SwapIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path
      d="M13.5 2.25L16.5 5.25L13.5 8.25"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M1.5 5.25H16.5"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M4.5 15.75L1.5 12.75L4.5 9.75"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16.5 12.75H1.5"
      stroke={COLORS.primary}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const SendIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M14.67 1.33L7.33 8.67"
      stroke="#FFFFFF"
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M14.67 1.33L10 14.67L7.33 8.67L1.33 6L14.67 1.33Z"
      stroke="#FFFFFF"
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const AddRoleIcon: React.FC = () => (
  <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
    <Path
      d="M16 10V22"
      stroke={COLORS.bodyText}
      strokeWidth={1.67}
      strokeLinecap="round"
    />
    <Path
      d="M10 16H22"
      stroke={COLORS.bodyText}
      strokeWidth={1.67}
      strokeLinecap="round"
    />
  </Svg>
);

const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 5L15 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M15 5L5 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const ChevronRightIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M6 4L10 8L6 12"
      stroke={COLORS.lightText}
      strokeWidth={1.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER (matches existing pattern)
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{
  name: string;
  color: string;
  size?: number;
}> = ({ name, color, size = 64 }) => {
  const initials = name
    .split(' ')
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
        borderWidth: 1.35,
        borderColor: COLORS.accentBlue,
      }}
    >
      <Text style={{ fontSize: size * 0.32, fontWeight: '600', color: '#FFFFFF' }}>
        {initials}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// SQUAD MEMBER CARD
// ─────────────────────────────────────────────

interface SquadMemberCardProps {
  member: SquadProCandidate;
  roleLabel: string;
  onSwap: () => void;
}

const SquadMemberCard: React.FC<SquadMemberCardProps> = ({
  member,
  roleLabel,
  onSwap,
}) => (
  <View
    style={{
      width: 172,
      padding: 17,
      borderRadius: 14,
      borderWidth: 1.35,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      position: 'relative',
    }}
  >
    {/* Swap button — top-right corner */}
    <Pressable
      onPress={onSwap}
      hitSlop={8}
      style={({ pressed }) => ({
        position: 'absolute',
        top: 10,
        right: 10,
        width: 32,
        height: 32,
        borderRadius: 9999,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.5 : 1,
        zIndex: 1,
      })}
    >
      <SwapIcon />
    </Pressable>

    <AvatarPlaceholder
      name={member.name}
      color={member.avatarColor}
      size={64}
    />

    <Text
      style={{
        textAlign: 'center',
        color: COLORS.bodyText,
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 15,
      }}
    >
      {roleLabel}
    </Text>

    <View
      style={{
        alignSelf: 'stretch',
        paddingHorizontal: 4,
        overflow: 'hidden',
      }}
    >
      <Text
        style={{
          textAlign: 'center',
          color: '#101828',
          fontSize: 14,
          fontWeight: '400',
          lineHeight: 17.5,
        }}
        numberOfLines={1}
      >
        {member.name}
      </Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// EMPTY SLOT CARD
// ─────────────────────────────────────────────

interface EmptySlotCardProps {
  roleLabel: string;
  onPress: () => void;
}

const EmptySlotCard: React.FC<EmptySlotCardProps> = ({ roleLabel, onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      width: 172,
      height: 140,
      padding: 17,
      borderRadius: 14,
      borderWidth: 1.35,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      opacity: pressed ? 0.7 : 1,
    })}
  >
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 9999,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 24, color: COLORS.lightText }}>+</Text>
    </View>
    <Text
      style={{
        textAlign: 'center',
        color: COLORS.bodyText,
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 15,
      }}
    >
      {roleLabel}
    </Text>
    <Text
      style={{
        textAlign: 'center',
        color: COLORS.secondaryText,
        fontSize: 13,
        fontWeight: '400',
        lineHeight: 17.5,
      }}
    >
      Tap to add
    </Text>
  </Pressable>
);

// ─────────────────────────────────────────────
// ADD ROLE CARD (dashed border)
// ─────────────────────────────────────────────

const AddRoleCard: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      width: 172,
      height: 140,
      borderRadius: 14,
      borderWidth: 1.35,
      borderColor: COLORS.border,
      borderStyle: 'dashed' as any,
      backgroundColor: COLORS.background,
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      opacity: pressed ? 0.5 : 1,
    })}
  >
    <AddRoleIcon />
    <Text
      style={{
        textAlign: 'center',
        color: COLORS.bodyText,
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
      }}
    >
      Add Role
    </Text>
  </Pressable>
);

// ─────────────────────────────────────────────
// ROLE LABEL MAPPING
// ─────────────────────────────────────────────

const ROLE_SHORT_LABELS: Record<string, string> = {
  'Mortgage Pro': 'Lender',
  'Title/Escrow': 'Title',
  'Home Inspector': 'Inspector',
  'Transaction Coordinator': 'TC',
  Appraiser: 'Appraiser',
  Contractor: 'Contractor',
  Warranty: 'Warranty',
  Attorney: 'Attorney',
};

// ─────────────────────────────────────────────
// ADDITIONAL ROLES (matches HomeTabAgent)
// ─────────────────────────────────────────────

const ADDITIONAL_ROLES = [
  { id: 'appraiser', label: 'Appraiser', role: 'Appraiser' },
  { id: 'contractor', label: 'Contractor', role: 'Contractor' },
  { id: 'warranty', label: 'Warranty', role: 'Warranty' },
  { id: 'attorney', label: 'Attorney', role: 'Attorney' },
];

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface SquadSlot {
  id: string;
  label: string;
  role: string;
  isAddNew?: boolean;
}

interface SendSquadScreenProps {
  navigation: any;
  route: {
    params: {
      squadMembers: Record<string, SquadProCandidate>;
      defaultSlots: SquadSlot[];
      additionalSlots: SquadSlot[];
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SendSquadScreen: React.FC<SendSquadScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();

  // Initialize state from navigation params
  const [squadMembers, setSquadMembers] = useState<Record<string, SquadProCandidate>>(
    route.params.squadMembers
  );
  const [additionalSlots, setAdditionalSlots] = useState<SquadSlot[]>(
    route.params.additionalSlots
  );
  const defaultSlots = route.params.defaultSlots;

  const [introMessage, setIntroMessage] = useState('');

  // ── SquadSlotPicker state ──
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerRole, setPickerRole] = useState('');
  const [pickerSlotId, setPickerSlotId] = useState('');
  const [pickerCurrentProId, setPickerCurrentProId] = useState<string | undefined>();
  const [pickerIsAdditional, setPickerIsAdditional] = useState(false);

  // ── Add Another Role modal state + animation ──
  const [rolePickerVisible, setRolePickerVisible] = useState(false);
  const [roleModalMounted, setRoleModalMounted] = useState(false);
  const roleBackdropAnim = useRef(new Animated.Value(0)).current;
  const roleSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const pendingPickerRef = useRef<{ role: string; slotId: string } | null>(null);

  // Animate the Add Another Role modal (matches HomeTabAgent pattern)
  useEffect(() => {
    if (rolePickerVisible) {
      setRoleModalMounted(true);
      Animated.parallel([
        Animated.timing(roleBackdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(roleSlideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (roleModalMounted) {
      Animated.parallel([
        Animated.timing(roleBackdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(roleSlideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setRoleModalMounted(false);
        // Sequential modal opening: open picker after role modal fully unmounts
        if (pendingPickerRef.current) {
          const { role, slotId } = pendingPickerRef.current;
          pendingPickerRef.current = null;
          setTimeout(() => {
            setPickerRole(role);
            setPickerSlotId(slotId);
            setPickerCurrentProId(undefined);
            setPickerIsAdditional(true);
            setPickerVisible(true);
          }, 100);
        }
      });
    }
  }, [rolePickerVisible]);

  // Combine all slots (excluding "Add New" placeholder)
  const allSlots = [...defaultSlots.filter((s) => !s.isAddNew), ...additionalSlots.filter((s) => !s.isAddNew)];
  const filledSlots = allSlots.filter((slot) => squadMembers[slot.id]);
  const emptyAdditionalSlots = additionalSlots.filter(
    (s) => !s.isAddNew && !squadMembers[s.id]
  );

  // Available roles = ones not yet added as additional slots
  const availableRoles = ADDITIONAL_ROLES.filter(
    (r) => !additionalSlots.some((s) => s.id === r.id)
  );

  // ── Swap handler ──
  const handleSwap = useCallback(
    (slot: SquadSlot) => {
      const currentPro = squadMembers[slot.id];
      setPickerRole(slot.role);
      setPickerSlotId(slot.id);
      setPickerCurrentProId(currentPro?.id);
      setPickerIsAdditional(
        additionalSlots.some((s) => s.id === slot.id)
      );
      setPickerVisible(true);
    },
    [squadMembers, additionalSlots]
  );

  // ── Empty slot handler ──
  const handleEmptySlotPress = useCallback(
    (slot: SquadSlot) => {
      setPickerRole(slot.role);
      setPickerSlotId(slot.id);
      setPickerCurrentProId(undefined);
      setPickerIsAdditional(true);
      setPickerVisible(true);
    },
    []
  );

  // ── Picker callbacks ──
  const handlePickerSelect = useCallback(
    (pro: SquadProCandidate) => {
      setSquadMembers((prev) => ({ ...prev, [pickerSlotId]: pro }));
      setPickerVisible(false);
    },
    [pickerSlotId]
  );

  const handlePickerRemove = useCallback(() => {
    setSquadMembers((prev) => {
      const next = { ...prev };
      delete next[pickerSlotId];
      return next;
    });
    if (pickerIsAdditional) {
      setAdditionalSlots((prev) => prev.filter((s) => s.id !== pickerSlotId));
    }
    setPickerVisible(false);
  }, [pickerSlotId, pickerIsAdditional]);

  const handlePickerClose = useCallback(() => {
    setPickerVisible(false);
  }, []);

  // ── Add Another Role handler (matches HomeTabAgent) ──
  const handleAddRole = (role: { id: string; label: string; role: string }) => {
    const newSlot: SquadSlot = {
      id: role.id,
      label: role.label,
      role: role.role,
    };
    setAdditionalSlots((prev) => [...prev, newSlot]);

    // Queue the picker to open after the role modal finishes closing
    pendingPickerRef.current = { role: role.role, slotId: role.id };
    setRolePickerVisible(false);
  };

  // ── Send to Client via native Share ──
  const handleSendToClient = async () => {
    const memberLines = filledSlots.map((slot) => {
      const member = squadMembers[slot.id];
      const label = ROLE_SHORT_LABELS[slot.role] || slot.role;
      return `${label}: ${member.name} — ${member.company} (★ ${member.rating}, ${member.vouches} vouches)`;
    });

    const message = [
      '🏠 My Recommended Squad',
      '',
      ...memberLines,
      '',
      introMessage ? `Note: ${introMessage}` : '',
      '',
      'Sent via Atlasio — the trusted pro network for real estate.',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { message }
          : { message, title: 'My Recommended Squad' }
      );
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Error', 'Unable to share. Please try again.');
      }
    }
  };

  const filledCount = filledSlots.length;
  const canSend = filledCount > 0;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ═══ HEADER ═══ */}
        <View
          style={{
            paddingTop: 8 + insets.top,
            paddingBottom: 8,
            paddingLeft: 16,
            paddingRight: 16,
            borderBottomWidth: 1.35,
            borderBottomColor: COLORS.border,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: COLORS.background,
          }}
        >
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 24,
              height: 24,
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <BackChevronIcon />
          </Pressable>
          <Text
            style={{
              flex: 1,
              color: '#101828',
              fontSize: 18,
              fontWeight: '500',
              lineHeight: 36,
              letterSpacing: 0.07,
            }}
          >
            Send Squad to Client
          </Text>
        </View>

        {/* ═══ SCROLLABLE CONTENT ═══ */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 24, paddingBottom: 40 }}
          style={{ flex: 1 }}
        >
          {/* ── Section: Your Squad ── */}
          <View style={{ paddingHorizontal: 16, gap: 16 }}>
            <Text
              style={{
                color: '#101828',
                fontSize: 16,
                fontWeight: '500',
                lineHeight: 24,
              }}
            >
              Your Squad
            </Text>

            {/* Squad grid — 2-column layout */}
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              {/* Filled slots — show member card with swap button */}
              {filledSlots.map((slot) => {
                const member = squadMembers[slot.id];
                if (!member) return null;
                return (
                  <SquadMemberCard
                    key={slot.id}
                    member={member}
                    roleLabel={ROLE_SHORT_LABELS[slot.role] || slot.role}
                    onSwap={() => handleSwap(slot)}
                  />
                );
              })}

              {/* Empty additional slots — tap to pick a pro or remove the role */}
              {emptyAdditionalSlots.map((slot) => (
                <EmptySlotCard
                  key={slot.id}
                  roleLabel={ROLE_SHORT_LABELS[slot.role] || slot.role}
                  onPress={() => handleEmptySlotPress(slot)}
                />
              ))}

              {/* Add Role card — opens the Add Another Role modal */}
              <AddRoleCard onPress={() => setRolePickerVisible(true)} />
            </View>
          </View>
        </ScrollView>

        {/* ═══ BOTTOM ACTION BAR ═══ */}
        <View
          style={{
            backgroundColor: COLORS.background,
            borderTopWidth: 1.35,
            borderTopColor: COLORS.border,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 15,
            elevation: 10,
          }}
        >
          <View
            style={{
              paddingTop: 24,
              paddingHorizontal: 16,
              paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 24) : 24,
              gap: 16,
            }}
          >
            {/* Introduction Message */}
            <View style={{ gap: 8 }}>
              <Text
                style={{
                  color: '#0A0A0A',
                  fontSize: 16,
                  fontWeight: '500',
                  lineHeight: 14,
                }}
              >
                Introduction Message
              </Text>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  backgroundColor: '#F3F3F5',
                  borderRadius: 8,
                  borderWidth: 1.35,
                  borderColor: 'transparent',
                  minHeight: 66,
                }}
              >
                <TextInput
                  value={introMessage}
                  onChangeText={setIntroMessage}
                  placeholder="Add a personal message..."
                  placeholderTextColor="#717182"
                  multiline
                  textAlignVertical="top"
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: COLORS.darkText,
                    lineHeight: 24,
                    minHeight: 50,
                    padding: 0,
                  }}
                />
              </View>
            </View>

            {/* Send Button */}
            <Pressable
              onPress={handleSendToClient}
              disabled={!canSend}
              style={({ pressed }) => ({
                height: 48,
                backgroundColor: canSend ? COLORS.primary : '#A0AEC0',
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed && canSend ? 0.85 : 1,
              })}
            >
              <SendIcon />
              <Text
                style={{
                  textAlign: 'center',
                  color: '#FFFFFF',
                  fontSize: 14,
                  fontWeight: '500',
                  lineHeight: 20,
                }}
              >
                Send to Client
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* ── SquadSlotPicker Modal ── */}
      <SquadSlotPicker
        visible={pickerVisible}
        role={pickerRole}
        onSelect={handlePickerSelect}
        onClose={handlePickerClose}
        onRemove={handlePickerRemove}
        currentProId={pickerCurrentProId}
        isAdditionalRole={pickerIsAdditional}
        onFindNewPro={() => {
          setPickerVisible(false);
          navigation.navigate('FindStack', { screen: 'FindMain' });
        }}
      />

      {/* ── ADD ANOTHER ROLE MODAL ──
          Matches HomeTabAgent pattern exactly:
          - animationType="none" on Modal
          - Separate Animated.View for backdrop (opacity fade) and sheet (translateY spring)
          - Sequential modal opening via pendingPickerRef + 100ms setTimeout
      */}
      <Modal
        visible={roleModalMounted}
        transparent
        animationType="none"
        onRequestClose={() => setRolePickerVisible(false)}
      >
        {/* Backdrop — fades in/out */}
        <Animated.View
          style={{
            ...({ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const),
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            opacity: roleBackdropAnim,
          }}
        >
          <Pressable
            onPress={() => setRolePickerVisible(false)}
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
            transform: [{ translateY: roleSlideAnim }],
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              backgroundColor: COLORS.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: 40,
            }}
          >
            {/* Handle bar */}
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

            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                paddingHorizontal: 16,
                paddingTop: 8,
                paddingBottom: 16,
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
                  Add Another Role
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: COLORS.secondaryText,
                    lineHeight: 20,
                  }}
                >
                  Choose a role to add to your squad
                </Text>
              </View>
              <Pressable
                onPress={() => setRolePickerVisible(false)}
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

            {/* Role List */}
            {availableRoles.length > 0 ? (
              availableRoles.map((role) => (
                <Pressable
                  key={role.id}
                  onPress={() => handleAddRole(role)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    borderTopWidth: 0.68,
                    borderTopColor: COLORS.border,
                    backgroundColor: pressed ? '#F9FAFB' : COLORS.background,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '400',
                      color: COLORS.darkText,
                      lineHeight: 24,
                    }}
                  >
                    {role.label}
                  </Text>
                  <ChevronRightIcon />
                </Pressable>
              ))
            ) : (
              <View style={{ padding: 32, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: COLORS.secondaryText,
                    textAlign: 'center',
                    lineHeight: 20,
                  }}
                >
                  All available roles have been added to your squad
                </Text>
              </View>
            )}
          </Pressable>
        </Animated.View>
      </Modal>
    </View>
  );
};

export default SendSquadScreen;
