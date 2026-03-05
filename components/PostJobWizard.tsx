// ═══════════════════════════════════════════════════════════════
// components/PostJobWizard.tsx
// Post Repair Job — 3-Step Wizard (Agent View)
//
// Entry point: HomeTab → QuickActionsRow → "Repair & Maintenance" card
// Agent-only screen — contractors never see this.
//
// ─────────────────────────────────────────────
// STEP FLOW:
//   Step 1: Basics   — Job title*, address, due date, budget range
//   Step 2: Details  — Description*, photos, trade(s)*, bid window, invite toggle
//   Step 3: Review   — Summary card, info banner, post action
//
//   Validation gates: Step 1 requires title + address
//                     Step 2 requires description + ≥1 trade
//                     Step 3 always valid (review only)
// ─────────────────────────────────────────────
//
// FIGMA STRUCTURE (all 3 steps):
//   Header (61px): Back chevron | centered title 18/600/#003DC3 | progress bar
//   Body (#F7F7FC): subtitle 16/600/#666 + step indicator 14/400/#666 → form
//   Footer (81px): Primary button 48px r8 #003DC3, text 14/500/white
//
// @demo: handlePostJob uses 600ms setTimeout + mock ID generation.
//        See TODO block for TanStack Query wiring target.
// @backend: will wire to useCreateJob → supabase.rpc('rpc_create_job')
//           Payload: job_type='repair', title, address, due_date,
//           budget_min/max (cents), description, trades, bid_window_hours
//
// ARCHITECTURE: Single parent component, local state, inline steps.
// PATTERN MATCHES: EditRepairJob, CreateDealChat, OnboardingScreen1
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import InfoBanner from './InfoBanner';
// Simple progress bar matching Figma header spec (4px track, no label)
const WizardProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({ currentStep, totalSteps }) => {
  const progress = currentStep / totalSteps;
  return (
    <View style={{ height: 4, backgroundColor: '#E5E7EB', width: '100%' }}>
      <View style={{ height: 4, backgroundColor: '#003DC3', width: `${progress * 100}%` }} />
    </View>
  );
};
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// NAVIGATION TYPE
// ─────────────────────────────────────────────
type NavProp = NativeStackNavigationProp<any>;

// ─────────────────────────────────────────────
// FORM STATE — maps to Supabase `repair_jobs`
// ─────────────────────────────────────────────
export interface PostJobFormData {
  jobTitle: string;
  propertyAddress: string;
  dueDate: Date | null;
  budgetMin: string;
  budgetMax: string;
  description: string;
  photos: string[];
  selectedTrades: Set<string>;
  bidWindowHours: string;
  inviteSpecificPros: boolean;
}

// ─────────────────────────────────────────────
// TRADE OPTIONS (Figma Step 2)
// ─────────────────────────────────────────────
const TRADE_OPTIONS = [
  'General Contractor',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Carpentry / Handyman',
  'Painting',
  'Flooring',
  'Windows & Doors',
  'Foundation / Structural',
  'Drywall / Sheetrock',
  'Pest Control / Termite',
  'Mold Remediation',
  'Sewer / Septic',
  'Pool & Spa',
  'Chimney / Fireplace',
  'Garage Door',
  'Appliances',
  'Landscaping / Drainage',
  'Locksmith / Re-key',
  'Cleaning / Junk Removal',
  'Other',
] as const;

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

// Back chevron: 1.67px #101828 (Figma header)
const BackIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.5 15L7.5 10L12.5 5" stroke="#101828" strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Calendar label icon: 1.33px #003DC3 (Figma Due Date)
const CalendarLabelIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Rect x={2} y={2.67} width={12} height={12} rx={1.33} stroke="#003DC3" strokeWidth={1.33} />
    <Path d="M10.67 1.33V4" stroke="#003DC3" strokeWidth={1.33} strokeLinecap="round" />
    <Path d="M5.33 1.33V4" stroke="#003DC3" strokeWidth={1.33} strokeLinecap="round" />
    <Path d="M2 6.67H14" stroke="#003DC3" strokeWidth={1.33} strokeLinecap="round" />
  </Svg>
);

// Dollar label icon: 1.33px #003DC3 (Figma Budget)
const DollarLabelIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M8 1.33V14.67" stroke="#003DC3" strokeWidth={1.33} strokeLinecap="round" />
    <Path d="M11.33 3.33H6.33C5.27 3.33 4 4.07 4 5.67C4 7.27 5.27 8 6.33 8H9.67C10.73 8 12 8.73 12 10.33C12 11.93 10.73 12.67 9.67 12.67H4" stroke="#003DC3" strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CameraIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M4 8C4 7.45 4.45 7 5 7H7L8 5H16L17 7H19C19.55 7 20 7.45 20 8V18C20 18.55 19.55 19 19 19H5C4.45 19 4 18.55 4 18V8Z" stroke="#6A7282" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={12} cy={13} r={3} stroke="#6A7282" strokeWidth={1.5} />
  </Svg>
);

const CloseXIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M4 4L12 12" stroke="#FFFFFF" strokeWidth={1.33} strokeLinecap="round" />
    <Path d="M12 4L4 12" stroke="#FFFFFF" strokeWidth={1.33} strokeLinecap="round" />
  </Svg>
);

// Clock label: 1.33px #003DC3 (Figma Bid Window label icon)
const ClockLabelIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={8} cy={8} r={6.67} stroke="#003DC3" strokeWidth={1.33} />
    <Path d="M8 4V8L10.67 9.33" stroke="#003DC3" strokeWidth={1.33} strokeLinecap="round" />
  </Svg>
);

// Users icon: 1.67px #003DC3 (Figma invite toggle)
const UsersIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={7.5} cy={5.83} r={2.5} stroke="#003DC3" strokeWidth={1.67} />
    <Path d="M2.5 16.67V15C2.5 13.16 4 11.67 5.83 11.67H9.17C11 11.67 12.5 13.16 12.5 15V16.67" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
    <Circle cx={14.17} cy={6.67} r={2.08} stroke="#003DC3" strokeWidth={1.67} />
    <Path d="M15 11.67C16.38 11.67 17.5 12.79 17.5 14.17V16.67" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

// ── Review Icons (all 1.67px #003DC3) ──

const LocationIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 10.83C11.15 10.83 12.08 9.9 12.08 8.75C12.08 7.6 11.15 6.67 10 6.67C8.85 6.67 7.92 7.6 7.92 8.75C7.92 9.9 8.85 10.83 10 10.83Z" stroke="#003DC3" strokeWidth={1.67} />
    <Path d="M10 1.67C6.32 1.67 3.33 4.66 3.33 8.33C3.33 13.33 10 18.33 10 18.33C10 18.33 16.67 13.33 16.67 8.33C16.67 4.66 13.68 1.67 10 1.67Z" stroke="#003DC3" strokeWidth={1.67} />
  </Svg>
);

const CalendarReviewIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Rect x={2.5} y={3.33} width={15} height={15} rx={1.67} stroke="#003DC3" strokeWidth={1.67} />
    <Path d="M13.33 1.67V5" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M6.67 1.67V5" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M2.5 8.33H17.5" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const DollarReviewIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 1.67V18.33" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M14.17 4.17H7.92C6.58 4.17 5 5.08 5 7.08C5 9.08 6.58 10 7.92 10H12.08C13.42 10 15 10.92 15 12.92C15 14.92 13.42 15.83 12.08 15.83H5" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ClockReviewIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={10} r={8.33} stroke="#003DC3" strokeWidth={1.67} />
    <Path d="M10 5.83V10L11.67 11.67" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const DescriptionIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Rect x={3.33} y={1.67} width={13.33} height={16.67} rx={1.67} stroke="#003DC3" strokeWidth={1.67} />
    <Path d="M6.67 6.67H13.33" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M6.67 10H13.33" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M6.67 13.33H10" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const WrenchIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.5 2.5C10.43 2.5 8.75 4.18 8.75 6.25C8.75 6.72 8.84 7.17 9 7.58L2.92 13.67C2.43 14.16 2.43 14.95 2.92 15.43L4.58 17.08C5.07 17.57 5.85 17.57 6.34 17.08L12.42 11C12.83 11.16 13.28 11.25 13.75 11.25C15.82 11.25 17.5 9.57 17.5 7.5C17.5 6.83 17.33 6.2 17.03 5.65L14.58 8.1L12.5 7.5L11.9 5.42L14.35 2.97C13.8 2.67 13.17 2.5 12.5 2.5Z" stroke="#003DC3" strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// PHOTO THUMBNAIL (112×112)
// ─────────────────────────────────────────────
const PhotoThumbnail: React.FC<{ uri: string; onDelete: () => void }> = ({ uri, onDelete }) => (
  <View style={{ width: 112, height: 112, borderRadius: 14, backgroundColor: '#C4B5A0', overflow: 'hidden' }}>
    {/* TODO: Replace with <Image source={{ uri }} /> */}
    <View style={{ width: 112, height: 112, backgroundColor: '#C4B5A0' }} />
    <Pressable
      onPress={onDelete}
      hitSlop={8}
      style={({ pressed }) => ({
        position: 'absolute', top: 8, right: 8,
        width: 24, height: 24, borderRadius: 9999,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center', justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <CloseXIcon />
    </Pressable>
  </View>
);

// ─────────────────────────────────────────────
// ADD PHOTO BUTTON (112×112, Figma: #F9FAFB bg, 1.35px #D1D5DC)
// ─────────────────────────────────────────────
const AddPhotoButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      width: 112, height: 112, borderRadius: 14,
      borderWidth: 1.35, borderColor: '#D1D5DC',
      backgroundColor: '#F9FAFB',
      alignItems: 'center', justifyContent: 'center', gap: 8,
      opacity: pressed ? 0.7 : 1,
    })}
  >
    <CameraIcon />
    <Text style={{ fontSize: 12, fontWeight: '400', color: '#6A7282', lineHeight: 16, textAlign: 'center' }}>
      Add Photo
    </Text>
  </Pressable>
);

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const formatBudget = (min: string, max: string): string => {
  const fmtMin = min ? `$${Number(min).toLocaleString()}` : '';
  const fmtMax = max ? `$${Number(max).toLocaleString()}` : '';
  if (fmtMin && fmtMax) return `${fmtMin} – ${fmtMax}`;
  if (fmtMin) return `${fmtMin}+`;
  if (fmtMax) return `Up to ${fmtMax}`;
  return 'Not set';
};

// ═══════════════════════════════════════════════════════════════
// STEP 1 — BASICS
//
// Figma spec:
//   Inputs: 50px h, r14, 1.35px #D1D5DC, bg white, overflow hidden
//   Labels: 14/500/#364153  |  Placeholders: 16/400/rgba(10,10,10,0.5)
//   Helpers: 12/400/#999999  |  $ prefix: 16/400/#6A7282 absolute left:16
//   Budget input paddingLeft: 32  |  Dash: 16/400/#99A1AF
//   Field gap: 24  |  Body-to-form gap: 32
// ═══════════════════════════════════════════════════════════════

interface StepProps {
  form: PostJobFormData;
  setForm: React.Dispatch<React.SetStateAction<PostJobFormData>>;
  showErrors: boolean;
}

const StepBasics: React.FC<StepProps> = ({ form, setForm, showErrors }) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Job Title * ── */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#364153', lineHeight: 20 }}>
          Job Title <Text style={{ color: '#FB2C36' }}>*</Text>
        </Text>
        <View
          style={{
            height: 50, paddingHorizontal: 16,
            backgroundColor: '#FFFFFF', borderRadius: 14,
            borderWidth: 1.35,
            borderColor: showErrors && form.jobTitle.trim().length === 0 ? '#FB2C36' : '#D1D5DC',
            justifyContent: 'center', overflow: 'hidden',
          }}
        >
          <TextInput
            value={form.jobTitle}
            onChangeText={(t) => setForm((p) => ({ ...p, jobTitle: t }))}
            placeholder="e.g., Kitchen Reno, Roof Repair"
            placeholderTextColor="rgba(10,10,10,0.5)"
            style={{ flex: 1, fontSize: 16, fontWeight: '400', color: '#0A0A0A', textAlignVertical: 'center' }}
          />
        </View>
        {showErrors && form.jobTitle.trim().length === 0 && (
          <Text style={{ fontSize: 12, fontWeight: '400', color: '#FB2C36', lineHeight: 16 }}>
            Job title is required
          </Text>
        )}
      </View>

      {/* ── Property Address ── */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#364153', lineHeight: 20 }}>
          Property Address <Text style={{ color: '#FB2C36' }}>*</Text>
        </Text>
        <View
          style={{
            height: 50, paddingHorizontal: 16,
            backgroundColor: '#FFFFFF', borderRadius: 14,
            borderWidth: 1.35,
            borderColor: showErrors && form.propertyAddress.trim().length === 0 ? '#FB2C36' : '#D1D5DC',
            justifyContent: 'center', overflow: 'hidden',
          }}
        >
          <TextInput
            value={form.propertyAddress}
            onChangeText={(t) => setForm((p) => ({ ...p, propertyAddress: t }))}
            placeholder="123 Main St, Denver, CO"
            placeholderTextColor="rgba(10,10,10,0.5)"
            style={{ flex: 1, fontSize: 16, fontWeight: '400', color: '#0A0A0A', textAlignVertical: 'center' }}
          />
        </View>
        {showErrors && form.propertyAddress.trim().length === 0 && (
          <Text style={{ fontSize: 12, fontWeight: '400', color: '#FB2C36', lineHeight: 16 }}>
            Property address is required
          </Text>
        )}
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#999999', lineHeight: 16 }}>
          Helps pros estimate travel time
        </Text>
      </View>

      {/* ── Due Date ── */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CalendarLabelIcon />
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#364153', lineHeight: 20 }}>
            Due Date
          </Text>
        </View>
        <Pressable
          onPress={() => setShowDatePicker(!showDatePicker)}
          style={{
            height: 50, paddingHorizontal: 16,
            backgroundColor: '#FFFFFF', borderRadius: 14,
            borderWidth: 1.35, borderColor: '#D1D5DC',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '400', color: form.dueDate ? '#0A0A0A' : 'rgba(10,10,10,0.5)' }}>
            {form.dueDate ? formatDate(form.dueDate) : 'Select date'}
          </Text>
        </Pressable>
        {showDatePicker && (
          <View style={{ alignItems: 'center' }}>
            <DateTimePicker
              value={form.dueDate || new Date(Date.now() + 7 * 86400000)}
              mode="date"
              display="inline"
              themeVariant="light"
              minimumDate={new Date()}
              onChange={(event, date) => {
                if (Platform.OS === 'android') {
                  setShowDatePicker(false);
                }
                if (event.type === 'set' && date) {
                  setForm((p) => ({ ...p, dueDate: date }));
                  setShowDatePicker(false);
                } else if (event.type === 'dismissed') {
                  setShowDatePicker(false);
                }
              }}
            />
          </View>
        )}
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#999999', lineHeight: 16 }}>
          Default: 7 days from today
        </Text>
      </View>

      {/* ── Budget Range ── */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <DollarLabelIcon />
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#364153', lineHeight: 20 }}>
            Budget Range
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Min — Figma: paddingLeft 32, $ at left:16 absolute */}
          <View style={{ flex: 1, height: 50, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.35, borderColor: '#D1D5DC', justifyContent: 'center', overflow: 'hidden' }}>
            <Text style={{ position: 'absolute', left: 16, fontSize: 16, fontWeight: '400', color: '#6A7282', lineHeight: 24 }}>$</Text>
            <TextInput
              value={form.budgetMin}
              onChangeText={(t) => setForm((p) => ({ ...p, budgetMin: t.replace(/[^0-9]/g, '') }))}
              placeholder="Min"
              placeholderTextColor="rgba(10,10,10,0.5)"
              style={{ flex: 1, fontSize: 16, fontWeight: '400', color: '#0A0A0A', paddingLeft: 32, paddingRight: 16, textAlignVertical: 'center' }}
              keyboardType="numeric"
            />
          </View>
          {/* Dash: 16/400/#99A1AF */}
          <Text style={{ fontSize: 16, fontWeight: '400', color: '#99A1AF', lineHeight: 24, paddingHorizontal: 8 }}>–</Text>
          {/* Max */}
          <View style={{ flex: 1, height: 50, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1.35, borderColor: '#D1D5DC', justifyContent: 'center', overflow: 'hidden' }}>
            <Text style={{ position: 'absolute', left: 16, fontSize: 16, fontWeight: '400', color: '#6A7282', lineHeight: 24 }}>$</Text>
            <TextInput
              value={form.budgetMax}
              onChangeText={(t) => setForm((p) => ({ ...p, budgetMax: t.replace(/[^0-9]/g, '') }))}
              placeholder="Max"
              placeholderTextColor="rgba(10,10,10,0.5)"
              style={{ flex: 1, fontSize: 16, fontWeight: '400', color: '#0A0A0A', paddingLeft: 32, paddingRight: 16, textAlignVertical: 'center' }}
              keyboardType="numeric"
            />
          </View>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#999999', lineHeight: 16 }}>
          Optional – helps pros understand your expectations
        </Text>
      </View>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 2 — DETAILS
//
// Figma spec additions:
//   Trade heading: 17/600/#101828 (lineHeight 25.5)
//   Trade pills: 40px h, r20, 1.35px #D1D5DC, bg white
//     Text: 15/500/#333333, lineHeight 22.5, textAlign center
//     Active: bg #003DC3, text white, no border
//     paddingHorizontal: ~17 (Figma left:17.35 from edge)
//   Pill gap: ~8 (flex wrap)
//   Bid Window icon: clock 1.33px #003DC3
//   Invite card: r16, 1.35px #E5E7EB, p16, bg white
//     Toggle track off: #D1D5DC, on: #003DC3
//     Icon: users 1.67px #003DC3
// ═══════════════════════════════════════════════════════════════

const StepDetails: React.FC<StepProps> = ({ form, setForm, showErrors }) => {
  const toggleTrade = useCallback((trade: string) => {
    setForm((p) => {
      const next = new Set(p.selectedTrades);
      if (next.has(trade)) next.delete(trade);
      else next.add(trade);
      return { ...p, selectedTrades: next };
    });
  }, [setForm]);

  const handleAddPhoto = async () => {
    if (form.photos.length >= 6) {
      Alert.alert('Limit Reached', 'You can add up to 6 photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setForm((p) => ({ ...p, photos: [...p.photos, result.assets[0].uri] }));
    }
  };

  const removePhoto = (i: number) => {
    setForm((p) => ({ ...p, photos: p.photos.filter((_, idx) => idx !== i) }));
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Description * ── */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#364153', lineHeight: 20 }}>
          Description <Text style={{ color: '#FB2C36' }}>*</Text>
        </Text>
        <View
          style={{
            minHeight: 146, paddingHorizontal: 16, paddingVertical: 8,
            backgroundColor: '#FFFFFF', borderRadius: 14,
            borderWidth: 1.35,
            borderColor: showErrors && form.description.trim().length === 0 ? '#FB2C36' : '#D1D5DC',
            overflow: 'hidden',
          }}
        >
          <TextInput
            value={form.description}
            onChangeText={(t) => setForm((p) => ({ ...p, description: t }))}
            placeholder="Describe the repair or work needed in detail..."
            placeholderTextColor="rgba(10,10,10,0.5)"
            style={{ fontSize: 16, fontWeight: '400', color: '#0A0A0A', lineHeight: 24, textAlignVertical: 'top' }}
            multiline
          />
        </View>
        {showErrors && form.description.trim().length === 0 && (
          <Text style={{ fontSize: 12, fontWeight: '400', color: '#FB2C36', lineHeight: 16 }}>
            Description is required
          </Text>
        )}
      </View>

      {/* ── Photos ── */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#364153', lineHeight: 20 }}>
          Photos
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
          {form.photos.map((photo, idx) => (
            <PhotoThumbnail key={`photo-${idx}`} uri={photo} onDelete={() => removePhoto(idx)} />
          ))}
          {form.photos.length < 6 && <AddPhotoButton onPress={handleAddPhoto} />}
        </ScrollView>
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#999999', lineHeight: 16 }}>
          Up to 6 photos • Helps pros give accurate bids
        </Text>
      </View>

      {/* ── Trade(s) * ── */}
      <View style={{ gap: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#364153', lineHeight: 20 }}>
          Trade(s) <Text style={{ color: '#FB2C36' }}>*</Text>
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TRADE_OPTIONS.map((trade) => {
            const isActive = form.selectedTrades.has(trade);
            return (
              <Pressable
                key={trade}
                onPress={() => toggleTrade(trade)}
                style={({ pressed }) => ({
                  height: 40,
                  paddingHorizontal: 10,
                  backgroundColor: isActive ? '#003DC3' : '#FFFFFF',
                  borderRadius: 20,
                  borderWidth: 1.35,
                  borderColor: isActive ? '#003DC3' : '#D1D5DC',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: isActive ? '#FFFFFF' : '#333333',
                    lineHeight: 20,
                    textAlign: 'center',
                  }}
                >
                  {trade}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {showErrors && form.selectedTrades.size === 0 && (
          <Text style={{ fontSize: 12, fontWeight: '400', color: '#FB2C36', lineHeight: 16 }}>
            Select at least one trade
          </Text>
        )}
      </View>

      {/* ── Bid Window ── */}
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ClockLabelIcon />
          <Text style={{ fontSize: 14, fontWeight: '500', color: '#364153', lineHeight: 20 }}>
            Bid Window (hours)
          </Text>
        </View>
        <View
          style={{
            height: 50, paddingHorizontal: 16,
            backgroundColor: '#FFFFFF', borderRadius: 14,
            borderWidth: 1.35, borderColor: '#D1D5DC',
            justifyContent: 'center', overflow: 'hidden',
          }}
        >
          <TextInput
            value={form.bidWindowHours}
            onChangeText={(t) => setForm((p) => ({ ...p, bidWindowHours: t.replace(/[^0-9]/g, '') }))}
            placeholder="48"
            placeholderTextColor="rgba(10,10,10,0.5)"
            style={{ flex: 1, fontSize: 16, fontWeight: '400', color: '#0A0A0A', textAlignVertical: 'center' }}
            keyboardType="numeric"
          />
        </View>
        <Text style={{ fontSize: 12, fontWeight: '400', color: '#999999', lineHeight: 16 }}>
          How long pros have to submit bids (default: 48 hours)
        </Text>
      </View>

      {/* ── Invite Toggle — Figma: r16, 1.35px #E5E7EB, p16 ── */}
      <View
        style={{
          padding: 16, backgroundColor: '#FFFFFF',
          borderRadius: 16, borderWidth: 1.35, borderColor: '#E5E7EB',
          gap: 12,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <UsersIcon />
            <Text style={{ fontSize: 16, fontWeight: '500', color: '#1C1C1E', lineHeight: 24 }}>
              Invite Specific Pros?
            </Text>
          </View>
          <Switch
            value={form.inviteSpecificPros}
            onValueChange={(v) => setForm((p) => ({ ...p, inviteSpecificPros: v }))}
            trackColor={{ false: '#D1D5DC', true: '#003DC3' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#D1D5DC"
          />
        </View>
        <Text style={{ fontSize: 14, fontWeight: '400', color: '#666666', lineHeight: 20 }}>
          Notify specific pros from your network who match the selected trades
        </Text>
      </View>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 3 — REVIEW & POST
//
// Figma spec:
//   Card: r16, 1.35px #E5E7EB, shadow 0 1 3 rgba(0,0,0,0.1) + 0 1 2 -1
//   Title: 20/700/#1C1C1E  |  Labels: 14/400/#666  |  Values: 16/400/#1C1C1E
//   Section headers: 16/600/#1C1C1E  |  Description body: 16/400/#1C1C1E, lh26
//   Trade pills: r9999(full), bg #003DC3, 14/500/white, h~36, px12
//   Info banner: #EFF6FF bg, 1.35px #DBEAFE, bold 14/700/#003DC3 + body 14/400/#003DC3
// ═══════════════════════════════════════════════════════════════

const ReviewRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
    <View style={{ width: 20, height: 20, marginTop: 4 }}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: 14, fontWeight: '400', color: '#666666', lineHeight: 20 }}>{label}</Text>
      <Text style={{ fontSize: 16, fontWeight: '400', color: '#1C1C1E', lineHeight: 24 }}>{value}</Text>
    </View>
  </View>
);

const StepReview: React.FC<{ form: PostJobFormData }> = ({ form }) => {
  const tradesArray = Array.from(form.selectedTrades);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120, gap: 32 }}
    >
      {/* ── Summary Card ── */}
      <View
        style={{
          backgroundColor: '#FFFFFF', borderRadius: 16,
          borderWidth: 1.35, borderColor: '#E5E7EB',
          overflow: 'hidden',
          shadowColor: '#000', shadowOpacity: 0.1,
          shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
          elevation: 2,
        }}
      >
        {/* Top: title + detail rows */}
        <View style={{ padding: 24, borderBottomWidth: 1.35, borderBottomColor: '#E5E7EB', gap: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#1C1C1E', lineHeight: 28 }}>
            {form.jobTitle}
          </Text>
          <View style={{ gap: 12 }}>
            <ReviewRow icon={<LocationIcon />} label="Address" value={form.propertyAddress} />
            <ReviewRow
              icon={<CalendarReviewIcon />}
              label="Due Date"
              value={form.dueDate ? formatDate(form.dueDate) : '7 days from today'}
            />
            {(form.budgetMin || form.budgetMax) ? (
              <ReviewRow icon={<DollarReviewIcon />} label="Budget" value={formatBudget(form.budgetMin, form.budgetMax)} />
            ) : null}
            <ReviewRow
              icon={<ClockReviewIcon />}
              label="Bid Window"
              value={`${form.bidWindowHours || '48'} hours`}
            />
          </View>
        </View>

        {/* Description */}
        <View style={{ padding: 24, borderBottomWidth: 1.35, borderBottomColor: '#E5E7EB', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <DescriptionIcon />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1C1C1E', lineHeight: 24 }}>Description</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '400', color: '#1C1C1E', lineHeight: 26 }}>{form.description}</Text>
        </View>

        {/* Trades — pills: r9999, bg #003DC3, 14/500/white */}
        <View style={{ padding: 24, borderBottomWidth: 1.35, borderBottomColor: '#E5E7EB', gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <WrenchIcon />
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1C1C1E', lineHeight: 24 }}>Trades Needed</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {tradesArray.map((trade) => (
              <View
                key={trade}
                style={{
                  height: 36, paddingHorizontal: 12,
                  backgroundColor: '#003DC3', borderRadius: 9999,
                  alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 }}>{trade}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* ── Info Banner ── */}
      <InfoBanner bold="What happens next:">
        Your job will be visible to contractors matching the selected trades. You'll receive bids within {form.bidWindowHours || '48'} hours and can review, accept, or negotiate.
      </InfoBanner>
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP CONFIG
//
// KEY FIGMA FINDING — ALL 3 steps show a centered title in the header:
//   Step 1: "Post New Job"  (left: 132)
//   Step 2: "Job Details"   (left: 145)
//   Step 3: "Review & Post" (left: 132)
// All: 18/600/#003DC3, lineHeight 30
//
// Body area has NO title — only subtitle + step indicator.
// ═══════════════════════════════════════════════════════════════

const STEP_CONFIG = [
  { headerTitle: 'Post New Job',  subtitle: "Let's start with the basics", buttonLabel: 'Next' },
  { headerTitle: 'Job Details',   subtitle: 'Tell pros what you need',      buttonLabel: 'Next' },
  { headerTitle: 'Review & Post', subtitle: 'Everything looks good?',       buttonLabel: 'Post Job' },
] as const;

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const PostJobWizard: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newJobId, setNewJobId] = useState<string | null>(null);

  const [form, setForm] = useState<PostJobFormData>({
    jobTitle: '',
    propertyAddress: '',
    dueDate: null,
    budgetMin: '',
    budgetMax: '',
    description: '',
    photos: [],
    selectedTrades: new Set<string>(),
    bidWindowHours: '',
    inviteSpecificPros: false,
  });

  const stepConfig = STEP_CONFIG[currentStep];

  const validateStep = (): boolean => {
    if (currentStep === 0) return form.jobTitle.trim().length > 0 && form.propertyAddress.trim().length > 0;
    if (currentStep === 1) return form.description.trim().length > 0 && form.selectedTrades.size > 0;
    return true;
  };

  const handleBack = () => {
    if (currentStep > 0) { setCurrentStep((s) => s - 1); setShowErrors(false); }
    else navigation.goBack();
  };

  const handleNext = () => {
    if (!validateStep()) { setShowErrors(true); return; }
    setShowErrors(false);
    if (currentStep < 2) setCurrentStep((s) => s + 1);
    else handlePostJob();
  };

  const handlePostJob = () => {
    setIsSubmitting(true);
    const payload = {
      title: form.jobTitle.trim(),
      property_address: form.propertyAddress.trim(),
      due_date: form.dueDate?.toISOString() || new Date(Date.now() + 7 * 86400000).toISOString(),
      budget_min: form.budgetMin ? Number(form.budgetMin) : null,
      budget_max: form.budgetMax ? Number(form.budgetMax) : null,
      description: form.description.trim(),
      photos: form.photos,
      trades: Array.from(form.selectedTrades),
      bid_window_hours: form.bidWindowHours ? Number(form.bidWindowHours) : 48,
      invite_specific_pros: form.inviteSpecificPros,
      status: 'open' as const,
    };
    console.log('🚀 Post Job payload:', JSON.stringify(payload, null, 2));

    // @backend TODO: TanStack Query mutation → useCreateJob (hooks/useData.ts)
    // mutatePostJob(payload, {
    //   onSuccess: (job) => {
    //     setNewJobId(job.id);
    //     setIsSubmitting(false);
    //     setShowConfirmModal(true);
    //   },
    // });

    // @demo Simulated delay for demo — generate mock ID
    setTimeout(() => {
      setNewJobId(`job_${Date.now()}`);
      setIsSubmitting(false);
      setShowConfirmModal(true);
    }, 600);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ══════════════════════════════════════════
          HEADER — 61px total (56 nav + 4 progress)
          Figma: bg white, borderBottom 1.35px #E5E7EB
          Nav row: paddingLeft 8, paddingRight 16
          Back: 36×36 r10
          Title: ALWAYS centered, 18/600/#003DC3 lh30
          Progress: AnimatedProgressBar (matches Onboarding)
          ══════════════════════════════════════════ */}
      <View style={{ backgroundColor: '#FFFFFF', borderBottomWidth: 1.35, borderBottomColor: '#E5E7EB' }}>
        {/* Nav row — 48px, no top padding (standard header height) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 8, paddingRight: 16, height: 48 }}>
          {/* Back */}
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => ({
              width: 36, height: 36, borderRadius: 10,
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <BackIcon />
          </Pressable>

          {/* Centered title — visible on ALL steps */}
          <View style={{ flex: 1 }} />
          <Text style={{ fontSize: 16, fontWeight: '500', color: '#003DC3', lineHeight: 24 }}>
            {stepConfig.headerTitle}
          </Text>
          <View style={{ flex: 1 }} />
          {/* Spacer balances back button */}
          <View style={{ width: 36 }} />
        </View>

        {/* Progress bar — matches Figma: 4px track, px24, 8px bottom padding */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
          <WizardProgressBar currentStep={currentStep + 1} totalSteps={3} />
        </View>
      </View>

      {/* ══════════════════════════════════════════
          BODY — bg #F7F7FC
          ══════════════════════════════════════════ */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={{ flex: 1, backgroundColor: '#F7F7FC' }}>

          {/* ── Step header — subtitle + indicator ── */}
          <View style={{ paddingHorizontal: 24, paddingTop: 16, gap: 8, marginBottom: 20 }}>
            {/* Subtitle: matches section headers (18/600/darkText) */}
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1C1C1E', lineHeight: 24 }}>
              {stepConfig.subtitle}
            </Text>
            {/* Step indicator: 14/400/#666666 */}
            <Text style={{ fontSize: 14, fontWeight: '400', color: '#666666', lineHeight: 20 }}>
              Step {currentStep + 1} of 3
            </Text>
          </View>

          {/* ── Step content ── */}
          {currentStep === 0 && <StepBasics form={form} setForm={setForm} showErrors={showErrors} />}
          {currentStep === 1 && <StepDetails form={form} setForm={setForm} showErrors={showErrors} />}
          {currentStep === 2 && <StepReview form={form} />}
        </View>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════
          FOOTER — Figma: 81px, pt17, px16
          Button: 48px r8 #003DC3, text 14/500/white
          ══════════════════════════════════════════ */}
      <View style={{ backgroundColor: '#FFFFFF', borderTopWidth: 1.35, borderTopColor: '#E5E7EB', paddingHorizontal: 24, paddingTop: 17 }}>
        <SafeAreaView edges={['bottom']}>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => ({
              height: 48, backgroundColor: '#003DC3', borderRadius: 8,
              alignItems: 'center', justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20, textAlign: 'center' }}>
              {stepConfig.buttonLabel}
            </Text>
          </Pressable>
        </SafeAreaView>
      </View>
      {/* ═══════════════════════════════════════════════════════════════
          JOB POSTED — SUCCESS CONFIRMATION MODAL
          Figma spec: r16, p24, 64px icon, centered text, 2 CTAs
          ═══════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowConfirmModal(false); navigation.goBack(); }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              width: '100%',
              maxWidth: 360,
              padding: 24,
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              gap: 20,
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.1,
              shadowRadius: 25,
              elevation: 10,
            }}
          >
            {/* ── Icon — 64px blue circle with shield checkmark ── */}
            <View style={{ alignSelf: 'flex-start' }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 9999,
                  backgroundColor: '#003DC3',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
                  {/* Shield outline */}
                  <Path
                    d="M16 2.67L5.33 8V14.67C5.33 21.07 9.87 27.01 16 29.33C22.13 27.01 26.67 21.07 26.67 14.67V8L16 2.67Z"
                    stroke="#FFFFFF"
                    strokeWidth={2.67}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  {/* Checkmark inside shield */}
                  <Path
                    d="M12 16L14.67 18.67L20 13.33"
                    stroke="#FFFFFF"
                    strokeWidth={2.67}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              </View>
            </View>

            {/* ── Text Content ── */}
            <View style={{ gap: 8 }}>
              <Text style={{ color: '#1C1C1E', fontSize: 20, fontWeight: '600', lineHeight: 30 }}>
                Job Posted Successfully!
              </Text>
              <Text style={{ color: '#666666', fontSize: 16, fontWeight: '400', lineHeight: 24 }}>
                "{form.jobTitle}" is now live
              </Text>
              <Text style={{ color: '#666666', fontSize: 14, fontWeight: '400', lineHeight: 22.75, paddingHorizontal: 2 }}>
                Contractors matching the selected trades will start bidding within {form.bidWindowHours || '48'} hours. You can review, accept, or negotiate from the job details screen.
              </Text>
            </View>

            {/* ── Actions ── */}
            <View style={{ gap: 12 }}>
              {/* View Job — primary */}
              <Pressable
                onPress={() => {
                  setShowConfirmModal(false);
                  navigation.replace('RepairJobDetails', { jobId: newJobId });
                }}
                style={({ pressed }) => ({
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: '#003DC3',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500', lineHeight: 20, textAlign: 'center' }}>
                  View Job
                </Text>
              </Pressable>

              {/* Back to Home — outline */}
              <Pressable
                onPress={() => { setShowConfirmModal(false); navigation.goBack(); }}
                style={({ pressed }) => ({
                  height: 48,
                  borderRadius: 8,
                  backgroundColor: '#FFFFFF',
                  borderWidth: 1.35,
                  borderColor: '#D1D5DC',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <Text style={{ color: '#003DC3', fontSize: 14, fontWeight: '500', lineHeight: 20, textAlign: 'center' }}>
                  Back to Home
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default PostJobWizard;
