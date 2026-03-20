// ═══════════════════════════════════════════════════════════════
// components/PostPhotoJobScreen.tsx
// Post Photography Job — Single-screen lightweight job posting
//
// Entry point: HomeTab → QuickActionsRow → "Listing Photographer" card
// Agent-only screen — photographers bid on these jobs.
//
// Fields:
//   - Property address (text input) *required
//   - Approx square footage (number input)
//   - Date needed (date selector) *required
//   - Service packages (multi-select chips: Photos, Drone, Video, 3D Tour) *required
//   - Turnaround preference (single-select: 24h, 48h, 1 week, Flexible)
//   - Special instructions (optional text area, 500 char max)
//
// Validation: address + date required, at least one package selected
//
// @demo: handleSubmit uses 800ms setTimeout + console.log + Alert.
//        No real job ID returned — "View Job" just calls goBack().
// @backend: will wire to useCreateJob → supabase.rpc('rpc_create_job')
//           Payload: job_type='photography', address, sqft, due_date,
//           service_packages, turnaround_preference, notes
//           RPC creates job row + auto-notifies photographers in area
//
// Platform fee: 3% captured on bid accept (same as repair jobs)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StatusBar,
  Platform,
  Alert,
  LayoutAnimation,
  UIManager,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '../lib/tokens';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface ServicePackage {
  key: string;
  label: string;
  description: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const SERVICE_PACKAGES: ServicePackage[] = [
  { key: 'photos', label: 'Interior + Exterior Photos', description: 'Standard listing package (15–25 photos)' },
  { key: 'drone', label: 'Drone / Aerial', description: 'Aerial shots of property and neighborhood' },
  { key: 'video', label: 'Video Walkthrough', description: '1–3 min cinematic walkthrough' },
  { key: 'tour_3d', label: '3D Virtual Tour', description: 'Interactive Matterport-style tour' },
  { key: 'twilight', label: 'Twilight / Dusk', description: 'Golden hour exterior shots' },
];

// 🔌 Turnaround options — maps to turnaround_preference field on jobs table
const TURNAROUND_OPTIONS = [
  { key: 'same_day', label: 'Same Day' },
  { key: 'next_day', label: 'Next Day' },
  { key: '48_hours', label: '48 Hours' },
  { key: 'flexible', label: 'Flexible' },
];

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackArrowIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M15 18L9 12L15 6" stroke={COLORS.darkText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CheckIcon: React.FC<{ color?: string }> = ({ color = '#FFFFFF' }) => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M2.33 7L5.83 10.5L11.67 4.67" stroke={color} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CameraIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3.33 6.67C3.33 5.75 4.08 5 5 5H6.18C6.58 5 6.95 4.79 7.15 4.45L7.85 3.22C8.05 2.88 8.42 2.67 8.82 2.67H11.18C11.58 2.67 11.95 2.88 12.15 3.22L12.85 4.45C13.05 4.79 13.42 5 13.82 5H15C15.92 5 16.67 5.75 16.67 6.67V14.17C16.67 15.08 15.92 15.83 15 15.83H5C4.08 15.83 3.33 15.08 3.33 14.17V6.67Z"
      stroke={COLORS.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

const PostPhotoJobScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();

  // ── Form state ──
  const [address, setAddress] = useState('');
  const [sqft, setSqft] = useState('');
  const [dateNeeded, setDateNeeded] = useState('');
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set(['photos']));
  const [turnaround, setTurnaround] = useState('next_day');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Handlers ──

  const togglePackage = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        // Don't allow deselecting all — at least one required
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isFormValid = address.trim().length > 0 && dateNeeded.trim().length > 0 && selectedPackages.size > 0;

  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);

    // @backend TODO: wire to useCreateJob → supabase.rpc('rpc_create_job')
    // @demo Current: mock delay + console.log
    console.log('📸 Submitting photography job:', {
      job_type: 'photography',
      address: address.trim(),
      sqft: sqft ? parseInt(sqft, 10) : null,
      due_date: dateNeeded.trim(),
      service_packages: Array.from(selectedPackages),
      turnaround_preference: turnaround,
      notes: notes.trim() || null,
    });

    await new Promise((resolve) => setTimeout(resolve, 800));

    setIsSubmitting(false);

    Alert.alert(
      'Job Posted!',
      'Photographers in your area will start bidding shortly.',
      [
        {
          text: 'View Job',
          onPress: () => {
            // @backend TODO: navigation.navigate('RepairJobDetails', { jobId: newJob.id })
            // @demo For now, just go back (no real jobId available)
            navigation.goBack();
          },
        },
      ]
    );
  };

  // ── Render helpers ──

  const renderSectionHeader = (title: string) => (
    <Text
      style={{
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.darkText,
        lineHeight: 20,
        marginBottom: 8,
        marginTop: 20,
      }}
    >
      {title}
    </Text>
  );

  const renderInput = (
    value: string,
    onChangeText: (t: string) => void,
    placeholder: string,
    options?: {
      keyboardType?: 'default' | 'numeric';
      multiline?: boolean;
      maxLength?: number;
    }
  ) => (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.bodyText}
      keyboardType={options?.keyboardType || 'default'}
      multiline={options?.multiline || false}
      maxLength={options?.maxLength}
      style={{
        backgroundColor: '#F9FAFB',
        borderWidth: 0.68,
        borderColor: value.length > 0 ? 'rgba(0, 61, 195, 0.25)' : '#E5E7EB',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        fontWeight: '400',
        color: COLORS.darkText,
        lineHeight: 20,
        ...(options?.multiline ? { minHeight: 80, textAlignVertical: 'top' as const } : {}),
      }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── Header — uses insets.top for Dynamic Island clearance ── */}
      <View
        style={{
          paddingTop: 8 + insets.top,
          paddingBottom: 8,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          borderBottomWidth: 0.69,
          borderBottomColor: COLORS.border,
        }}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, marginRight: 12 })}
        >
          <BackArrowIcon />
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: '#1A6B3C',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CameraIcon />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.darkText }}>
            Post Photo Job
          </Text>
        </View>
      </View>

      {/* ── Form ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Property Address */}
          {renderSectionHeader('Property Address *')}
          {renderInput(address, setAddress, '123 Main St, Denver, CO 80202')}

          {/* Square Footage */}
          {renderSectionHeader('Approx. Square Footage')}
          {renderInput(sqft, setSqft, '2,400', { keyboardType: 'numeric' })}

          {/* Date Needed */}
          {renderSectionHeader('Date Needed *')}
          {renderInput(dateNeeded, setDateNeeded, 'MM/DD/YYYY')}
          {/* 🔌 Wire to: DateTimePicker or calendar modal. For MVP, text input with validation. */}

          {/* Service Packages — multi-select chips */}
          {renderSectionHeader('Service Packages *')}
          <Text style={{ fontSize: 12, color: COLORS.bodyText, lineHeight: 16, marginBottom: 10, marginTop: -4 }}>
            Select all that apply — photographers will bid on your full package
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SERVICE_PACKAGES.map((pkg) => {
              const isSelected = selectedPackages.has(pkg.key);
              return (
                <Pressable
                  key={pkg.key}
                  onPress={() => togglePackage(pkg.key)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: isSelected ? COLORS.primary : '#F9FAFB',
                    borderWidth: isSelected ? 0 : 0.68,
                    borderColor: '#E5E7EB',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  {isSelected && <CheckIcon />}
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#FFFFFF' : COLORS.darkText,
                      lineHeight: 18,
                    }}
                  >
                    {pkg.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Turnaround Preference — single select chips */}
          {renderSectionHeader('Turnaround Preference')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TURNAROUND_OPTIONS.map((opt) => {
              const isSelected = turnaround === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setTurnaround(opt.key)}
                  style={({ pressed }) => ({
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 9999,
                    backgroundColor: isSelected ? COLORS.primary : COLORS.background,
                    borderWidth: isSelected ? 0 : 0.68,
                    borderColor: isSelected ? 'transparent' : COLORS.border,
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#FFFFFF' : COLORS.bodyText,
                      lineHeight: 18,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Special Instructions */}
          {renderSectionHeader('Special Instructions')}
          {renderInput(notes, setNotes, 'e.g. Focus on backyard, pool area. Vacant — no furniture.', {
            multiline: true,
            maxLength: 500,
          })}
          {notes.length > 0 && (
            <Text style={{ fontSize: 11, color: COLORS.bodyText, lineHeight: 14, marginTop: 4, textAlign: 'right' }}>
              {notes.length}/500
            </Text>
          )}

          {/* Info callout */}
          <View
            style={{
              marginTop: 24,
              padding: 14,
              borderRadius: 10,
              backgroundColor: 'rgba(0, 61, 195, 0.05)',
              borderWidth: 0.68,
              borderColor: 'rgba(0, 61, 195, 0.12)',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.darkText, lineHeight: 18, marginBottom: 4 }}>
              How it works
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.bodyText, lineHeight: 17 }}>
              Photographers in your area will bid on this job. You{"'"}ll see their portfolio, ratings, and price — then accept, counter, or pass. A 3% platform fee is applied when you accept a bid.
            </Text>
          </View>
        </ScrollView>

        {/* ── Sticky Submit Button ── */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 16,
            paddingVertical: 16,
            paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 16) : 16,
            backgroundColor: COLORS.background,
            borderTopWidth: 0.69,
            borderTopColor: COLORS.border,
          }}
        >
          <Pressable
            onPress={handleSubmit}
            disabled={!isFormValid || isSubmitting}
            style={({ pressed }) => ({
              backgroundColor: isFormValid ? COLORS.primary : '#D1D5DB',
              borderRadius: 12,
              paddingVertical: 15,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed && isFormValid ? 0.9 : 1,
            })}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', lineHeight: 20 }}>
                Post Job & Get Bids
              </Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default PostPhotoJobScreen;
