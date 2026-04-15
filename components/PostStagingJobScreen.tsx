// ═══════════════════════════════════════════════════════════════
// components/PostStagingJobScreen.tsx
// Post Staging Job — Single-screen lightweight job posting
//
// Entry point: HomeTab → QuickActionsRow → "Stage to Sell" card
// Agent-only screen — home stagers bid on these jobs.
//
// Fields:
//   - Property address (text input) *required
//   - Approx square footage (number input)
//   - Occupied or Vacant (toggle, default: Vacant)
//   - Number of rooms to stage (stepper, 1–15, default: 3)
//   - Staging scope (multi-select: Full Stage, Partial, Consultation, Virtual) *required
//   - Timeline (single-select chips: 1 week, 2 weeks, 1 month, Flexible)
//   - Special instructions (optional text area, 500 char max)
//
// Validation: address required, at least one scope selected
//
// @demo: handleSubmit uses 800ms setTimeout + console.log + Alert.
//        No real job ID returned — "View Job" just calls goBack().
// @backend: will wire to useCreateJob → supabase.rpc('rpc_create_job')
//           Payload: job_type='staging', address, sqft, occupied_or_vacant,
//           rooms_count, staging_scope, due_date, notes
//
// Platform fee: 3% captured on bid accept (same as repair/photography)
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
import Svg, { Path, Line } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../lib/tokens';
import { useCreateJob } from '../hooks/useData';
import { AddressAutocompleteInput, SuccessToast } from './shared';
import { useSuccessToast } from '../hooks/useSuccessToast';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface StagingScope {
  key: string;
  label: string;
  description: string;
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const STAGING_SCOPES: StagingScope[] = [
  { key: 'full', label: 'Full Staging', description: 'Complete furnishing + decor for all rooms' },
  { key: 'partial', label: 'Partial Staging', description: 'Key rooms only (living, primary, kitchen)' },
  { key: 'consultation', label: 'Consultation Only', description: 'Expert walkthrough with recommendations' },
  { key: 'virtual', label: 'Virtual Staging', description: 'Digital furniture added to listing photos' },
];

const TIMELINE_OPTIONS = [
  { key: '3_days', label: '3 Days' },
  { key: '1_week', label: '1 Week' },
  { key: '2_weeks', label: '2 Weeks' },
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

const MinusIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Line x1={4} y1={9} x2={14} y2={9} stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const PlusIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
    <Line x1={4} y1={9} x2={14} y2={9} stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
    <Line x1={9} y1={4} x2={9} y2={14} stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const ChairIcon: React.FC<{ color?: string }> = ({ color = COLORS.primary }) => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 11.67V5C5 3.62 6.12 2.5 7.5 2.5H12.5C13.88 2.5 15 3.62 15 5V11.67" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M3.33 11.67H16.67V14.17C16.67 15.08 15.92 15.83 15 15.83H5C4.08 15.83 3.33 15.08 3.33 14.17V11.67Z" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

const PostStagingJobScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();

  // ── Form state ──
  const [address, setAddress] = useState('');
  const [sqft, setSqft] = useState('');
  const [isOccupied, setIsOccupied] = useState(false);
  const [roomsCount, setRoomsCount] = useState(3);
  const [selectedScopes, setSelectedScopes] = useState<Set<string>>(new Set(['full']));
  const [timeline, setTimeline] = useState('1_week');
  const [specificDate, setSpecificDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // @ux success feedback — SuccessToast wired S149b
  const { successMessage, showSuccess, clearSuccess } = useSuccessToast();
  // @backend WIRED: useCreateJob → rpc_create_job({ p_job_type: 'staging', ... })
  const createJob = useCreateJob();

  // ── Handlers ──

  const toggleScope = useCallback((key: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const adjustRooms = (delta: number) => {
    const next = roomsCount + delta;
    if (next >= 1 && next <= 15) {
      setRoomsCount(next);
    }
  };

  const isFormValid = address.trim().length > 0 && selectedScopes.size > 0;

  // @backend WIRED: rpc_create_job({ p_job_type: 'staging', p_title, p_address,
  //   p_due_date, p_staging_scope, p_sqft, p_occupied_or_vacant, p_rooms_count, p_description })
  const handleSubmit = async () => {
    if (!isFormValid) return;

    setIsSubmitting(true);
    try {
      const jobId = await createJob.mutateAsync({
        p_job_type: 'staging',
        // @demo p_title auto-generated — add TextInput title field to screen before launch
        // Business rule: title displays on contractor job cards and tracker
        p_title: 'Staging Job',
        p_address: address.trim(),
        // @demo specificDate overrides timeline when set — confirm RPC behavior post-launch
        // When specificDate is null, the timeline key (e.g. '1_week') is sent as before
        p_due_date: specificDate ? specificDate.toISOString().split('T')[0] : timeline,
        p_staging_scope: Array.from(selectedScopes),
        p_sqft: sqft ? parseInt(sqft, 10) : undefined,
        p_occupied_or_vacant: isOccupied ? 'occupied' : 'vacant',
        p_rooms_count: roomsCount,
        p_description: notes.trim() || undefined,
      });

      setIsSubmitting(false);

      // @ux success feedback — SuccessToast wired S149b (replaces Alert.alert; nav delayed 400ms so toast is visible)
      showSuccess('Staging job posted successfully');
      setTimeout(() => navigation.goBack(), 400);
    } catch (err) {
      // @demo fallback — remove when LIVE flag is permanent
      console.warn('[PostStagingJobScreen] createJob failed, falling back to mock:', err);
      setIsSubmitting(false);

      Alert.alert(
        'Job Posted!',
        'Stagers in your area will start bidding shortly.',
        [
          {
            text: 'View Job',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
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
              backgroundColor: COLORS.jobPurple,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ChairIcon color={COLORS.onPrimary} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.darkText }}>
            Post Staging Job
          </Text>
        </View>
      </View>

      {/* ── Form ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Property Address — shared Google Places autocomplete (S156 rewrite) */}
          {renderSectionHeader('Property Address *')}
          <AddressAutocompleteInput
            value={address}
            onSelect={setAddress}
            placeholder="123 Main St, Denver, CO 80202"
          />

          {/* Square Footage */}
          {renderSectionHeader('Approx. Square Footage')}
          {renderInput(sqft, setSqft, '2,400', { keyboardType: 'numeric' })}

          {/* Occupied / Vacant toggle */}
          {renderSectionHeader('Property Status')}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {['Vacant', 'Occupied'].map((option) => {
              const isSelected = option === 'Occupied' ? isOccupied : !isOccupied;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    setIsOccupied(option === 'Occupied');
                  }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: isSelected ? COLORS.primary : '#F9FAFB',
                    borderWidth: isSelected ? 0 : 0.68,
                    borderColor: '#E5E7EB',
                    alignItems: 'center',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? '#FFFFFF' : COLORS.darkText,
                    }}
                  >
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Number of rooms — stepper */}
          {renderSectionHeader('Rooms to Stage')}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 16,
              backgroundColor: '#F9FAFB',
              borderWidth: 0.68,
              borderColor: '#E5E7EB',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 8,
              alignSelf: 'flex-start',
            }}
          >
            <Pressable
              onPress={() => adjustRooms(-1)}
              disabled={roomsCount <= 1}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: roomsCount > 1 ? '#E5E7EB' : '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed && roomsCount > 1 ? 0.7 : 1,
              })}
            >
              <MinusIcon />
            </Pressable>

            <Text style={{ fontSize: 20, fontWeight: '600', color: COLORS.darkText, minWidth: 30, textAlign: 'center' }}>
              {roomsCount}
            </Text>

            <Pressable
              onPress={() => adjustRooms(1)}
              disabled={roomsCount >= 15}
              hitSlop={10}
              style={({ pressed }) => ({
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: roomsCount < 15 ? '#E5E7EB' : '#F3F4F6',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed && roomsCount < 15 ? 0.7 : 1,
              })}
            >
              <PlusIcon />
            </Pressable>
          </View>

          {/* Staging Scope — multi-select chips */}
          {renderSectionHeader('Staging Scope *')}
          <View style={{ gap: 8 }}>
            {STAGING_SCOPES.map((scope) => {
              const isSelected = selectedScopes.has(scope.key);
              return (
                <Pressable
                  key={scope.key}
                  onPress={() => toggleScope(scope.key)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: isSelected ? 'rgba(0, 61, 195, 0.06)' : '#F9FAFB',
                    borderWidth: isSelected ? 1.2 : 0.68,
                    borderColor: isSelected ? COLORS.primary : '#E5E7EB',
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  {/* Checkbox */}
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      backgroundColor: isSelected ? COLORS.primary : 'transparent',
                      borderWidth: isSelected ? 0 : 1.5,
                      borderColor: '#D1D5DB',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSelected && <CheckIcon />}
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isSelected ? '600' : '500',
                        color: COLORS.darkText,
                        lineHeight: 18,
                      }}
                    >
                      {scope.label}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.bodyText, lineHeight: 16, marginTop: 1 }}>
                      {scope.description}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Timeline — single-select pills */}
          {renderSectionHeader('Timeline Needed')}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TIMELINE_OPTIONS.map((opt) => {
              const isSelected = timeline === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => setTimeline(opt.key)}
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

          {/* Date Needed — native DateTimePicker (S144, S151 label fix) */}
          {renderSectionHeader('Date Needed *')}
          <Pressable
            onPress={() => setShowDatePicker(!showDatePicker)}
            style={{
              backgroundColor: COLORS.inputBackground,
              borderWidth: 0.68,
              borderColor: specificDate ? COLORS.inputActiveBorder : COLORS.border,
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 12,
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: '400',
                color: specificDate ? COLORS.darkText : COLORS.bodyText,
                lineHeight: 20,
              }}
            >
              {specificDate
                ? specificDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : 'Select date'}
            </Text>
          </Pressable>
          {showDatePicker && (
            <View style={{ alignItems: 'center', marginTop: 8 }}>
              <DateTimePicker
                value={specificDate || new Date(Date.now() + 7 * 86400000)}
                mode="date"
                display="inline"
                themeVariant="light"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  if (Platform.OS === 'android') setShowDatePicker(false);
                  if (event.type === 'set' && date) {
                    setSpecificDate(date);
                    if (Platform.OS === 'ios') setShowDatePicker(false);
                  } else if (event.type === 'dismissed') {
                    setShowDatePicker(false);
                  }
                }}
              />
            </View>
          )}

          {/* Special Instructions */}
          {renderSectionHeader('Special Instructions')}
          {renderInput(notes, setNotes, 'e.g. Modern farmhouse aesthetic preferred. Pet-free staging materials needed.', {
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
              backgroundColor: 'rgba(124, 58, 237, 0.05)',
              borderWidth: 0.68,
              borderColor: 'rgba(124, 58, 237, 0.12)',
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.darkText, lineHeight: 18, marginBottom: 4 }}>
              How it works
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.bodyText, lineHeight: 17 }}>
              Home stagers in your area will bid on this job. You{"'"}ll see their portfolio, ratings, and pricing — then accept, counter, or pass. Staged homes sell for 5–15% more on average. A 3% platform fee is applied when you accept a bid.
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
      {successMessage ? (
        <SuccessToast message={successMessage} onDismiss={clearSuccess} />
      ) : null}
    </View>
  );
};

export default PostStagingJobScreen;
