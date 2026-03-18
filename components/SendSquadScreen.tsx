// SendSquadScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Send Squad to Client — Email + SMS Delivery Flow (S51)
// Agent reviews their closing squad, can swap members,
// write a personal message, and send via Email or Text.
// Entry: "Send to Client" CTA on HomeTabAgent squad section
// Stack: HomeStack → SendSquadScreen (fullScreenModal, slide_from_bottom)
//
// Agent only — contractors and partners never access SendSquadScreen
//
// @demo  Mock squad members, LIVE_SQUAD_SHARE: false → 1500ms mock delay
// @backend send-squad-email Edge Function (Resend — HTML email)
// @backend send-squad-sms Edge Function (PDF gen → Storage → Twilio SMS)
//
// Fix: Uses useSafeAreaInsets() instead of SafeAreaView edges
// because fullScreenModal presentation on iOS doesn't reliably
// respect SafeAreaView insets on Dynamic Island devices.
// ═══════════════════════════════════════════════════════════════

/**
 * SendSquadScreen
 *
 * WHAT: Delivery screen for sharing an agent's Closing Squad with a client.
 * WHO: Agents only. Accessed from HomeTabAgent squad section header "Send to Client" button.
 * WHERE: Presented as fullScreenModal (slide_from_bottom) from HomeStack.
 *
 * STATE FLOW:
 * idle → [user selects medium + enters recipient] → ready → [tap Send] →
 * sending → success | error
 *
 * MEDIUM PATHS:
 * Email → useSquadShare.sendViaEmail() → Edge Function → Resend API → client inbox
 * Text  → useSquadShare.sendViaSms() → Edge Function → PDF generation →
 *         Supabase Storage upload → Twilio SMS → client phone
 *
 * DEMO MODE (LIVE_SQUAD_SHARE: false):
 * Both paths → 1500ms setTimeout → { success: true }
 * Medium selector, form validation, and success/error states all work normally.
 * No actual emails or texts are sent.
 *
 * PRODUCTION WIRE:
 * @backend: send-squad-email (Resend — HTML email with squad cards)
 * @backend: send-squad-sms (PDF gen → Storage → Twilio SMS with link)
 * @demo: Replace mock delay with real supabase.functions.invoke() calls
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import { useSquadShare } from '../hooks/useData';
import SquadSlotPicker from './SquadSlotPicker';
import type { SquadProCandidate } from './SquadSlotPicker';
import type { SquadShareMember } from '../types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── SECTION: Types & Constants ──────────────────────────────────────────────

type SendMedium = 'email' | 'sms';
type SendState = 'idle' | 'sending' | 'success' | 'error';

const MAX_MESSAGE_LENGTH = 300;

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

// ─── Validation helpers ──────────────────────────────────────────────────────

const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPhone = (phone: string): boolean => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
};

const formatPhoneE164 = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('1') ? `+${digits}` : `+1${digits}`;
};

// ─── SVG Icons ───────────────────────────────────────────────────────────────

const CloseXIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M6 6L18 18" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" />
    <Path d="M18 6L6 18" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const SwapIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Path d="M13.5 2.25L16.5 5.25L13.5 8.25" stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M1.5 5.25H16.5" stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M4.5 15.75L1.5 12.75L4.5 9.75" stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16.5 12.75H1.5" stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const AddRoleIcon: React.FC = () => (
  <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
    <Path d="M16 10V22" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M10 16H22" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
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
    <Path d="M6 4L10 8L6 12" stroke={COLORS.lightText} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const EmailIcon: React.FC<{ color?: string }> = ({ color = COLORS.primary }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M22 6L12 13L2 6" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PhoneIcon: React.FC<{ color?: string }> = ({ color = COLORS.primary }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M17 2H7C5.9 2 5 2.9 5 4V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V4C19 2.9 18.1 2 17 2Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 18H12.01" stroke={color} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

const CheckCircleIcon: React.FC = () => (
  <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
    <Path d="M32 58C46.3594 58 58 46.3594 58 32C58 17.6406 46.3594 6 32 6C17.6406 6 6 17.6406 6 32C6 46.3594 17.6406 58 32 58Z" fill={COLORS.successGreen} />
    <Path d="M22 32L28 38L42 24" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─── Avatar Placeholder ──────────────────────────────────────────────────────

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

// ─── Squad Member Card ───────────────────────────────────────────────────────

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
          color: COLORS.headingText,
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

// ─── Empty Slot Card ─────────────────────────────────────────────────────────

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
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 17.5,
      }}
    >
      Tap to add
    </Text>
  </Pressable>
);

// ─── Add Role Card (dashed border) ───────────────────────────────────────────

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

// ─── Role Label Mapping ──────────────────────────────────────────────────────

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

// ─── Additional Roles (matches HomeTabAgent) ─────────────────────────────────

const ADDITIONAL_ROLES = [
  { id: 'appraiser', label: 'Appraiser', role: 'Appraiser' },
  { id: 'contractor', label: 'Contractor', role: 'Contractor' },
  { id: 'warranty', label: 'Warranty', role: 'Warranty' },
  { id: 'attorney', label: 'Attorney', role: 'Attorney' },
];

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const SendSquadScreen: React.FC<SendSquadScreenProps> = ({
  navigation,
  route,
}) => {
  const insets = useSafeAreaInsets();

  // ─── SECTION: State & Hooks ─────────────────────────────────────────────────

  // Squad state (from nav params)
  const [squadMembers, setSquadMembers] = useState<Record<string, SquadProCandidate>>(
    route.params.squadMembers
  );
  const [additionalSlots, setAdditionalSlots] = useState<SquadSlot[]>(
    route.params.additionalSlots
  );
  const defaultSlots = route.params.defaultSlots;

  // Closing tracker toggle
  // @demo Toggle state is functional — URL append is visual only in demo.
  // Wire to send-squad-email and send-squad-sms Edge Functions when LIVE_SQUAD_SHARE=true.
  // @backend Pass url to send-squad-email / send-squad-sms — add closing_url?: string param to both Edge Functions.
  const [includeClosingTracker, setIncludeClosingTracker] = useState(false);

  // Delivery form state
  const [medium, setMedium] = useState<SendMedium | null>(null);
  const [recipient, setRecipient] = useState('');
  const [personalMessage, setPersonalMessage] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Hook
  const { sendViaEmail, sendViaSms, isLoading, error: hookError, reset: resetHook } = useSquadShare();

  // SquadSlotPicker state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerRole, setPickerRole] = useState('');
  const [pickerSlotId, setPickerSlotId] = useState('');
  const [pickerCurrentProId, setPickerCurrentProId] = useState<string | undefined>();
  const [pickerIsAdditional, setPickerIsAdditional] = useState(false);

  // Add Another Role modal state + animation
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

  const filledCount = filledSlots.length;

  // ─── SECTION: Handlers ──────────────────────────────────────────────────────

  // Swap handler
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

  // Empty slot handler
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

  // Picker callbacks
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

  // Add Another Role handler (matches HomeTabAgent)
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

  // Medium selection — clears recipient + validation when switching
  const handleMediumSelect = (selected: SendMedium) => {
    setMedium(selected);
    setRecipient('');
    setValidationError(null);
    setSendState('idle');
    resetHook();
  };

  // Build squad members payload — only filled slots
  const getFilledSquadMembers = (): SquadShareMember[] =>
    filledSlots.map((slot) => {
      const member = squadMembers[slot.id];
      return {
        name: member.name,
        company: member.company,
        role: ROLE_SHORT_LABELS[slot.role] || slot.role,
        avatar_url: member.avatar_url,         // pass through — may be undefined
        avatar_color: member.avatarColor,       // camelCase in app → snake_case in payload
      };
    });

  // Send handler — validates then calls hook
  const handleSend = async () => {
    if (!medium || !recipient.trim()) return;

    // Validate recipient
    if (medium === 'email' && !isValidEmail(recipient.trim())) {
      setValidationError('Please enter a valid email address');
      return;
    }
    if (medium === 'sms' && !isValidPhone(recipient.trim())) {
      setValidationError('Please enter a valid US phone number');
      return;
    }

    setValidationError(null);
    setSendState('sending');

    // @demo hardcoded — replace with real agent profile data from useMyProfile()
    // @backend rpc_get_my_profile — params: none (uses auth.uid())
    const agentName = 'Sarah Chen';
    const agentCompany = 'Keller Williams Denver';
    const members = getFilledSquadMembers();

    let result;
    if (medium === 'email') {
      result = await sendViaEmail({
        squadMembers: members,
        agentName,
        agentCompany,
        recipientEmail: recipient.trim(),
        personalMessage: personalMessage.trim() || undefined,
      });
    } else {
      result = await sendViaSms({
        squadMembers: members,
        agentName,
        agentCompany,
        recipientPhone: formatPhoneE164(recipient.trim()),
        personalMessage: personalMessage.trim() || undefined,
      });
    }

    setSendState(result.success ? 'success' : 'error');
  };

  // Try again after error
  const handleTryAgain = () => {
    setSendState('idle');
    resetHook();
  };

  // Dismiss modal
  const handleDismiss = () => {
    navigation.goBack();
  };

  // CTA disabled logic
  const canSend = filledCount > 0 && medium !== null && recipient.trim().length > 0 && sendState !== 'sending';

  // CTA label
  const ctaLabel = medium === 'email' ? 'Send via Email' : medium === 'sms' ? 'Send via Text' : 'Send to Client';

  // ─── SECTION: Render Helpers ────────────────────────────────────────────────

  // Medium selector cards
  const renderMediumSelector = () => (
    <View style={{ paddingHorizontal: 16, gap: 8 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: COLORS.secondaryText,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginBottom: 4,
        }}
      >
        Send via
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {/* Email card */}
        <Pressable
          onPress={() => handleMediumSelect('email')}
          style={({ pressed }) => ({
            flex: 1,
            padding: 14,
            borderRadius: 12,
            borderWidth: medium === 'email' ? 1.5 : 1,
            borderColor: medium === 'email' ? COLORS.primary : COLORS.border,
            backgroundColor: medium === 'email' ? COLORS.infoBg : COLORS.background,
            opacity: pressed ? 0.8 : 1,
            gap: 4,
          })}
        >
          <EmailIcon color={medium === 'email' ? COLORS.primary : COLORS.bodyText} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, marginTop: 4 }}>
            Email
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText }}>
            Arrives in inbox
          </Text>
        </Pressable>

        {/* Text card */}
        <Pressable
          onPress={() => handleMediumSelect('sms')}
          style={({ pressed }) => ({
            flex: 1,
            padding: 14,
            borderRadius: 12,
            borderWidth: medium === 'sms' ? 1.5 : 1,
            borderColor: medium === 'sms' ? COLORS.primary : COLORS.border,
            backgroundColor: medium === 'sms' ? COLORS.infoBg : COLORS.background,
            opacity: pressed ? 0.8 : 1,
            gap: 4,
          })}
        >
          <PhoneIcon color={medium === 'sms' ? COLORS.primary : COLORS.bodyText} />
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, marginTop: 4 }}>
            Text Message
          </Text>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText }}>
            SMS with PDF link
          </Text>
        </Pressable>
      </View>
    </View>
  );

  // Recipient input
  const renderRecipientInput = () => {
    if (!medium) return null;

    const isEmail = medium === 'email';
    return (
      <View style={{ paddingHorizontal: 16, gap: 8 }}>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '500',
            color: COLORS.darkText,
          }}
        >
          {isEmail ? "Client's email address" : "Client's phone number"}
        </Text>
        <View
          style={{
            paddingHorizontal: 12,
            backgroundColor: '#F3F3F5',
            borderRadius: 8,
            borderWidth: 1.35,
            borderColor: validationError ? COLORS.errorRed : 'transparent',
            height: 48,
            justifyContent: 'center',
          }}
        >
          <TextInput
            value={recipient}
            onChangeText={(text) => {
              setRecipient(text);
              if (validationError) setValidationError(null);
            }}
            placeholder={isEmail ? 'client@email.com' : '(303) 555-0100'}
            placeholderTextColor={COLORS.lightText}
            keyboardType={isEmail ? 'email-address' : 'phone-pad'}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              fontSize: 14,
              fontWeight: '400',
              color: COLORS.darkText,
              padding: 0,
            }}
          />
        </View>
        {validationError && (
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.errorRed }}>
            {validationError}
          </Text>
        )}
      </View>
    );
  };

  // Personal message textarea
  const renderPersonalMessage = () => (
    <View style={{ paddingHorizontal: 16, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>
          Personal message
        </Text>
        <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText }}>
          (optional)
        </Text>
      </View>
      <View
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: '#F3F3F5',
          borderRadius: 8,
          borderWidth: 1.35,
          borderColor: 'transparent',
          minHeight: 80,
        }}
      >
        <TextInput
          value={personalMessage}
          onChangeText={(text) => {
            if (text.length <= MAX_MESSAGE_LENGTH) setPersonalMessage(text);
          }}
          placeholder="Hi Sarah! Here's your trusted team for your upcoming closing..."
          placeholderTextColor={COLORS.lightText}
          multiline
          textAlignVertical="top"
          style={{
            fontSize: 14,
            fontWeight: '400',
            color: COLORS.darkText,
            lineHeight: 24,
            minHeight: 60,
            padding: 0,
          }}
        />
      </View>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '400',
          color: COLORS.secondaryText,
          textAlign: 'right',
        }}
      >
        {personalMessage.length}/{MAX_MESSAGE_LENGTH}
      </Text>
    </View>
  );

  // Success state — replaces ScrollView content
  const renderSuccessState = () => {
    const mediumLabel = medium === 'email' ? 'email' : 'text';
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: 48 }}>
        <CheckCircleIcon />
        <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.darkText, marginTop: 16, textAlign: 'center' }}>
          Sent!
        </Text>
        <Text style={{ fontSize: 15, fontWeight: '400', color: COLORS.bodyText, marginTop: 8, textAlign: 'center', lineHeight: 22 }}>
          Your squad has been sent to {recipient} via {mediumLabel}.
        </Text>
        {medium === 'sms' && (
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, marginTop: 4, textAlign: 'center' }}>
            PDF link expires in 30 days
          </Text>
        )}
        <Pressable
          onPress={handleDismiss}
          style={({ pressed }) => ({
            marginTop: 32,
            height: 48,
            paddingHorizontal: 48,
            backgroundColor: COLORS.background,
            borderRadius: 8,
            borderWidth: 1.35,
            borderColor: COLORS.border,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>
            Done
          </Text>
        </Pressable>
      </View>
    );
  };

  // ─── SECTION: Main Render ───────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* ═══ HEADER ═══ */}
        {/* fullScreenModal header: [44px spacer][Title flex:1 center][44px X button] */}
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
            backgroundColor: COLORS.background,
          }}
        >
          {/* 44px spacer (left) */}
          <View style={{ width: 44, height: 44 }} />

          {/* Title — centered */}
          <Text
            style={{
              flex: 1,
              color: COLORS.headingText,
              fontSize: 18,
              fontWeight: '500',
              lineHeight: 36,
              letterSpacing: 0.07,
              textAlign: 'center',
            }}
          >
            Send to Client
          </Text>

          {/* X dismiss button (right) — 44x44 touch target */}
          <Pressable
            onPress={handleDismiss}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <CloseXIcon />
          </Pressable>
        </View>

        {/* ═══ CONTENT ═══ */}
        {sendState === 'success' ? (
          renderSuccessState()
        ) : (
          <>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingTop: 24, paddingBottom: 100, gap: 24 }}
              style={{ flex: 1, backgroundColor: COLORS.screenBg }}
            >
              {/* ── Section: Your Squad ── */}
              <View style={{ paddingHorizontal: 16, gap: 16 }}>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: COLORS.secondaryText,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
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

              {/* ── Section: Medium Selector ── */}
              {renderMediumSelector()}

              {/* ── Section: Closing Tracker Toggle ── */}
              <View style={{ paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Switch
                  value={includeClosingTracker}
                  onValueChange={setIncludeClosingTracker}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  ios_backgroundColor={COLORS.border}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>
                    Include closing tracker link
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.secondaryText }}>
                    Let your client track progress
                  </Text>
                </View>
              </View>

              {/* ── Section: Recipient Input (conditional on medium) ── */}
              {renderRecipientInput()}

              {/* ── Section: Personal Message ── */}
              {renderPersonalMessage()}
            </ScrollView>

            {/* ═══ STICKY CTA BAR ═══ */}
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
                  paddingTop: 16,
                  paddingHorizontal: 16,
                  paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 24) : 24,
                  gap: 8,
                }}
              >
                {/* Error message — shown above CTA */}
                {(sendState === 'error' || hookError) && (
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.errorRed, textAlign: 'center' }}>
                    {hookError || 'Something went wrong. Please try again.'}
                  </Text>
                )}

                {/* Send Button */}
                <Pressable
                  onPress={sendState === 'error' ? handleTryAgain : handleSend}
                  disabled={sendState === 'error' ? false : !canSend}
                  style={({ pressed }) => ({
                    height: 48,
                    backgroundColor: (sendState === 'error' || canSend) ? COLORS.primary : COLORS.disabledBg,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: sendState === 'sending' ? 0.7 : pressed && (sendState === 'error' || canSend) ? 0.85 : (!canSend && sendState !== 'error') ? 0.4 : 1,
                  })}
                >
                  {sendState === 'sending' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text
                      style={{
                        textAlign: 'center',
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: '500',
                        lineHeight: 20,
                      }}
                    >
                      {sendState === 'error' ? 'Try Again' : ctaLabel}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </>
        )}
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
