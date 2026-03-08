// ═══════════════════════════════════════════════════════════════
// components/EditRepairJob.tsx
// Edit Repair Job — Agent View
//
// Full-screen edit form triggered from RepairJobDetails → "Edit" button.
// Agent-only screen. Navigation: HomeStack → RepairJobDetails → EditRepairJob
//
// Fields: title, trade(s) multi-select, due date, budget min/max,
//         description, photos (ImagePicker)
// Validation: title + at least 1 trade required
//
// @demo: handleSave passes updated job object via nav params (no mutation).
//        handleDelete shows Alert + console.log (no actual deletion).
// @backend TODO: wire handleSave to useUpdateJob mutation
// @backend TODO: wire handleDelete to useDeleteJob mutation (not yet in useData.ts)
// @backend TODO: wire photo uploads to Supabase Storage
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Svg, { Path, Rect } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import type { HomeStackParamList } from './HomeStack';
import type { Job, BidWithProfile } from '../types';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// DESIGN TOKENS (from Figma)
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// TRADE OPTIONS (matches FindTab + Onboarding)
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
];

type EditRepairJobRouteProp = RouteProp<HomeStackParamList, 'EditRepairJob'>;

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const BackIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M12.5 15L7.5 10L12.5 5" stroke={COLORS.headingText} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const CalendarIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Rect x={2.5} y={3.33} width={15} height={15} rx={1.67} stroke={COLORS.bodyText} strokeWidth={1.67} />
    <Path d="M13.33 1.67V5" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M6.67 1.67V5" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M2.5 8.33H17.5" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const CameraIcon: React.FC = () => (
  <Svg width={32} height={32} viewBox="0 0 32 32" fill="none">
    <Path d="M5.33 10.67C5.33 9.93 5.93 9.33 6.67 9.33H9.33L10.67 6.67H21.33L22.67 9.33H25.33C26.07 9.33 26.67 9.93 26.67 10.67V24C26.67 24.74 26.07 25.33 25.33 25.33H6.67C5.93 25.33 5.33 24.74 5.33 24V10.67Z" stroke={COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" strokeLinejoin="round" />
    <Svg>
      <Path d="M16 21.33C18.21 21.33 20 19.54 20 17.33C20 15.12 18.21 13.33 16 13.33C13.79 13.33 12 15.12 12 17.33C12 19.54 13.79 21.33 16 21.33Z" stroke={COLORS.bodyText} strokeWidth={1.67} />
    </Svg>
  </Svg>
);

const CloseXIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M4 4L12 12" stroke="#FFFFFF" strokeWidth={1.33} strokeLinecap="round" />
    <Path d="M12 4L4 12" stroke="#FFFFFF" strokeWidth={1.33} strokeLinecap="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// PHOTO THUMBNAIL (128×128 with delete button)
// ─────────────────────────────────────────────

const PhotoThumbnail: React.FC<{ uri: string; onDelete: () => void }> = ({ uri, onDelete }) => (
  <View style={{ width: 128, height: 128, borderRadius: 14, backgroundColor: '#C4B5A0', overflow: 'hidden' }}>
    {/* Placeholder — in production this would be an <Image source={{ uri }} /> */}
    <View style={{ width: 128, height: 128, backgroundColor: '#C4B5A0' }} />
    {/* Delete button: 24×24 circle, top-right */}
    <Pressable
      onPress={onDelete}
      hitSlop={8}
      style={({ pressed }) => ({
        position: 'absolute',
        top: 8,
        right: 8,
        width: 24,
        height: 24,
        borderRadius: 9999,
        backgroundColor: COLORS.overlayPhoto,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <CloseXIcon />
    </Pressable>
  </View>
);

// ─────────────────────────────────────────────
// ADD PHOTO BUTTON (128×128 dashed-style box)
// ─────────────────────────────────────────────

const AddPhotoButton: React.FC<{ onPress: () => void }> = ({ onPress }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => ({
      width: 128,
      height: 128,
      borderRadius: 14,
      borderWidth: 1.37,
      borderColor: COLORS.inputBorder,
      backgroundColor: COLORS.background,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      opacity: pressed ? 0.7 : 1,
    })}
  >
    <CameraIcon />
    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20, textAlign: 'center' }}>
      Add Photo
    </Text>
  </Pressable>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const EditRepairJob: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<EditRepairJobRouteProp>();
  const insets = useSafeAreaInsets();
  const { job } = route.params;

  // ── Form State (pre-populated from job) ──
  const [jobTitle, setJobTitle] = useState(job.title);
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set(job.category ? [job.category] : []));
  const [dueDate, setDueDate] = useState(job.due_date.replace('Due ', ''));
  const [budgetMin, setBudgetMin] = useState(job.budget_range?.split(' - ')[0]?.replace('$', '').replace(',', '') || '');
  const [budgetMax, setBudgetMax] = useState(job.budget_range?.split(' - ')[1]?.replace('$', '').replace(',', '') || '');
  const [description, setDescription] = useState(job.description);
  const [photos, setPhotos] = useState<string[]>(['placeholder-1', 'placeholder-2', 'placeholder-3']);

  // Check if due date is urgent (within 7 days — demo: always show from job data)
  const isUrgent = job.is_urgent;

  // Toggle trade selection
  const toggleTrade = (trade: string) => {
    setSelectedTrades((prev) => {
      const next = new Set(prev);
      if (next.has(trade)) {
        next.delete(trade);
      } else {
        next.add(trade);
      }
      return next;
    });
  };

  // Determine if Save button should be active
  const hasChanges = jobTitle.trim().length > 0 && selectedTrades.size > 0;

  // @demo Handle save — build updated job and navigate back via params (no mutation)
  const handleSave = () => {
    const updatedJob: Job & { bids: BidWithProfile[] } = {
      ...job,
      title: jobTitle,
      category: Array.from(selectedTrades)[0] || job.category,
      due_date: dueDate ? `Due ${dueDate}` : job.due_date,
      budget_range: budgetMin && budgetMax
        ? `$${Number(budgetMin).toLocaleString()} - $${Number(budgetMax).toLocaleString()}`
        : job.budget_range,
      description: description || job.description,
    };

    // Navigate back to RepairJobDetails with updated job data
    // Using navigate (not goBack) so we can pass new params
    navigation.navigate('RepairJobDetails', { job: updatedJob });
  };

  // @demo Handle delete — Alert + console.log only, no backend call
  const handleDelete = () => {
    Alert.alert(
      'Delete Job',
      'Are you sure you want to delete this repair job? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            console.log('Delete repair job:', job.id);
            // Pop back to home — goBack twice (past RepairJobDetails)
            navigation.goBack();
            navigation.goBack();
          },
        },
      ]
    );
  };

  // Handle add photo
  const handleAddPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  // Handle remove photo
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          HEADER: ← Edit Job | Save
          ══════════════════════════════════════════ */}
      <View
        style={{
          paddingTop: 8 + insets.top,
          paddingLeft: 8,
          paddingRight: 16,
          paddingBottom: 12,
          backgroundColor: COLORS.background,
          borderBottomWidth: 0.7,
          borderBottomColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Back */}
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={12}
          style={({ pressed }) => ({
            width: 36, height: 36, borderRadius: 10,
            alignItems: 'center', justifyContent: 'center',
            opacity: pressed ? 0.5 : 1,
          })}
        >
          <BackIcon />
        </Pressable>

        {/* Title: "Edit Job" — 16px, 500, #003DC3 */}
        <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.primary, lineHeight: 24 }}>
          Edit Job
        </Text>

        {/* Save — gray when no changes, blue when active */}
        <Pressable
          onPress={hasChanges ? handleSave : undefined}
          hitSlop={12}
          style={({ pressed }) => ({
            borderRadius: 10,
            paddingHorizontal: 16,
            paddingVertical: 8,
            opacity: pressed && hasChanges ? 0.5 : 1,
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: '500', color: hasChanges ? COLORS.primary : COLORS.lightText, lineHeight: 24, textAlign: 'center' }}>
            Save
          </Text>
        </Pressable>
      </View>

      {/* ══════════════════════════════════════════
          SCROLLABLE FORM
          ══════════════════════════════════════════ */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1, backgroundColor: COLORS.screenBg }}
          contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 16, paddingBottom: 120, gap: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Job Title ── */}
          <View style={{ gap: 8 }}>
            {/* Label: 14px, 500, #364153 */}
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>
              Job Title
            </Text>
            <View
              style={{
                height: 49,
                paddingHorizontal: 16,
                backgroundColor: COLORS.background,
                borderRadius: 14,
                borderWidth: 0.68,
                borderColor: COLORS.inputBorder,
                justifyContent: 'center',
              }}
            >
              <TextInput
                value={jobTitle}
                onChangeText={setJobTitle}
                placeholder="Enter job title"
                placeholderTextColor={COLORS.placeholderText}
                style={{ fontSize: 16, fontWeight: '400', color: COLORS.bodyText }}
              />
            </View>
          </View>

          {/* ── Trade(s) Picker ── */}
          <View style={{ gap: 12 }}>
            {/* Heading: 17px, 600, #101828 */}
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.headingText, lineHeight: 28 }}>
              Trade(s)
            </Text>
            {/* Pills — wrapping, 40px height, 12px gap */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {TRADE_OPTIONS.map((trade) => {
                const isActive = selectedTrades.has(trade);
                return (
                  <Pressable
                    key={trade}
                    onPress={() => toggleTrade(trade)}
                    style={({ pressed }) => ({
                      height: 40,
                      paddingHorizontal: 16,
                      backgroundColor: isActive ? COLORS.primary : COLORS.background,
                      borderRadius: 20,
                      borderWidth: isActive ? 0 : 0.68,
                      borderColor: COLORS.inputBorder,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    {/* Text: 15px, 500, white if active / #333333 if inactive */}
                    <Text style={{ fontSize: 15, fontWeight: '500', color: isActive ? '#FFFFFF' : COLORS.sortText, lineHeight: 22, textAlign: 'center' }}>
                      {trade}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Due Date ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>
              Due Date
            </Text>
            {/* Show urgent pill if date is soon */}
            {isUrgent && dueDate.trim().length > 0 && (
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.urgentBg, borderRadius: 9999 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.urgentText, lineHeight: 20, textAlign: 'center' }}>
                  Due {dueDate}
                </Text>
              </View>
            )}
            <View
              style={{
                height: 49,
                paddingHorizontal: 16,
                backgroundColor: COLORS.background,
                borderRadius: 14,
                borderWidth: 0.68,
                borderColor: COLORS.inputBorder,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TextInput
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={COLORS.placeholderText}
                style={{ flex: 1, fontSize: 16, fontWeight: '400', color: COLORS.bodyText }}
                keyboardType="numbers-and-punctuation"
              />
              <CalendarIcon />
            </View>
          </View>

          {/* ── Budget (Min – Max) ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>
              Budget
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
              {/* Min field */}
              <View
                style={{
                  flex: 1,
                  height: 49,
                  paddingLeft: 16,
                  paddingRight: 16,
                  backgroundColor: COLORS.background,
                  borderRadius: 14,
                  borderWidth: 0.68,
                  borderColor: COLORS.inputBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                {/* $ prefix: 16px, 400, #4A5565 */}
                <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.bodyText, lineHeight: 24, marginRight: 4 }}>$</Text>
                <TextInput
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  placeholder="800"
                  placeholderTextColor={COLORS.placeholderText}
                  style={{ flex: 1, fontSize: 16, fontWeight: '400', color: COLORS.bodyText }}
                  keyboardType="numeric"
                />
              </View>

              {/* Dash separator: #99A1AF */}
              <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.lightText, lineHeight: 24, paddingHorizontal: 8 }}>–</Text>

              {/* Max field */}
              <View
                style={{
                  flex: 1,
                  height: 49,
                  paddingLeft: 16,
                  paddingRight: 16,
                  backgroundColor: COLORS.background,
                  borderRadius: 14,
                  borderWidth: 0.68,
                  borderColor: COLORS.inputBorder,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.bodyText, lineHeight: 24, marginRight: 4 }}>$</Text>
                <TextInput
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                  placeholder="1,500"
                  placeholderTextColor={COLORS.placeholderText}
                  style={{ flex: 1, fontSize: 16, fontWeight: '400', color: COLORS.bodyText }}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* ── Description ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>
              Description
            </Text>
            <View
              style={{
                minHeight: 217,
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: COLORS.background,
                borderRadius: 14,
                borderWidth: 0.68,
                borderColor: COLORS.inputBorder,
              }}
            >
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the work needed..."
                placeholderTextColor={COLORS.placeholderText}
                style={{ fontSize: 16, fontWeight: '400', color: COLORS.bodyText, lineHeight: 24, textAlignVertical: 'top' }}
                multiline
              />
            </View>
          </View>

          {/* ── Photos ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.statText, lineHeight: 20 }}>
              Photos
            </Text>
            {/* Horizontal scroll of photo thumbnails + add button */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {photos.map((photo, index) => (
                <PhotoThumbnail
                  key={`photo-${index}`}
                  uri={photo}
                  onDelete={() => removePhoto(index)}
                />
              ))}
              <AddPhotoButton onPress={handleAddPhoto} />
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ══════════════════════════════════════════
          BOTTOM BAR: Delete Job button
          ══════════════════════════════════════════ */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingTop: 12,
          paddingHorizontal: 16,
          paddingBottom: Math.max(insets.bottom, 24),
          backgroundColor: COLORS.background,
          borderTopWidth: 0.68,
          borderTopColor: COLORS.border,
        }}
      >
        {/* Delete Job: white bg, red border 1.37px, 50px height, rounded 14 */}
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => ({
            height: 51,
            backgroundColor: COLORS.background,
            borderRadius: 14,
            borderWidth: 1.37,
            borderColor: COLORS.rejectRed,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          {/* Text: 16px, 500, #E7000B */}
          <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.rejectRed, lineHeight: 24, textAlign: 'center' }}>
            Delete Job
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default EditRepairJob;
