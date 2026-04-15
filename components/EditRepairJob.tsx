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

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Image,
  ActivityIndicator,
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
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { HomeStackParamList } from './HomeStack';
import type { TradeEnum } from '../types';
import { COLORS } from '../lib/tokens';
import { supabase } from '../lib/supabase';
import { useJob, useUpdateJob, useSetJobPhotos, useCancelJob } from '../hooks/useData';
import { TRADE_LABEL_TO_ENUM, TRADE_ENUM_TO_LABEL, ALL_TRADE_LABELS } from '../lib/tradesMap';
import FormField from './FormField';

// ─────────────────────────────────────────────
// MODULE-SCOPE HELPERS
// ─────────────────────────────────────────────

const formatDate = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

// Two-phase photo upload helper — mirrors PostJobWizard.uploadJobPhotos (S157).
// job-photos bucket RLS requires the job row to exist first. Called on Save AFTER
// the update mutation completes. Partial failures per-photo are non-fatal.
async function uploadJobPhotos(jobId: string, localUris: string[]): Promise<string[]> {
  const uploadedPaths: string[] = [];

  for (let i = 0; i < localUris.length; i++) {
    try {
      const uri = localUris[i];
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      // Use timestamp suffix to avoid collisions with existing photos under {jobId}/
      const storagePath = `${jobId}/${Date.now()}-${i}.jpg`;

      const { error } = await supabase.storage
        .from('job-photos')
        .upload(storagePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: false,
        });

      if (error) {
        console.error(`[EditRepairJob.uploadJobPhotos] Upload failed for photo ${i}:`, error.message);
        continue;
      }

      uploadedPaths.push(storagePath);
    } catch (err) {
      console.error(`[EditRepairJob.uploadJobPhotos] Unexpected error for photo ${i}:`, err);
      continue;
    }
  }

  return uploadedPaths;
}

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
  <View style={{ width: 128, height: 128, borderRadius: 14, overflow: 'hidden' }}>
    <Image source={{ uri }} style={{ width: 128, height: 128 }} resizeMode="cover" />
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
  const { jobId } = route.params;

  // @backend — live fetch keyed on jobId per CLAUDE.md navigation rule
  const { data: job, isLoading } = useJob(jobId);
  const updateJob = useUpdateJob();
  const setJobPhotosMutation = useSetJobPhotos();
  const cancelJob = useCancelJob();

  // ── Form State (empty defaults — pre-fill runs in useEffect below) ──
  const [jobTitle, setJobTitle] = useState('');
  const [selectedTrades, setSelectedTrades] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [description, setDescription] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Photos — three arrays working together:
  //   existingPhotoPaths — storage paths currently in jobs.photo_urls
  //   signedPhotoUrls    — signed URLs generated for display of existing
  //   newPhotos          — local URIs for photos picked this session
  const [existingPhotoPaths, setExistingPhotoPaths] = useState<string[]>([]);
  const [signedPhotoUrls, setSignedPhotoUrls] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);

  // Pre-fill effect — runs when live job data loads
  useEffect(() => {
    if (!job) return;
    setJobTitle(job.title ?? '');
    // Trades: map enum values (DB) → display labels (UI) via tradesMap
    const tradeLabels = (job.trades ?? []).map(
      (enumVal) => TRADE_ENUM_TO_LABEL[enumVal] ?? enumVal
    );
    setSelectedTrades(new Set(tradeLabels));
    setDueDate(job.due_date ? new Date(job.due_date) : null);
    setBudgetMin(job.budget_min != null ? String(job.budget_min) : '');
    setBudgetMax(job.budget_max != null ? String(job.budget_max) : '');
    setDescription(job.description ?? '');
    setExistingPhotoPaths(job.photo_urls ?? []);
  }, [job]);

  // Signed URL effect — generate fresh signed URLs for private-bucket display
  useEffect(() => {
    if (!existingPhotoPaths.length) {
      setSignedPhotoUrls([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const urls: string[] = [];
      for (const path of existingPhotoPaths) {
        const { data, error } = await supabase.storage
          .from('job-photos')
          .createSignedUrl(path, 3600);
        if (error) {
          console.warn('[EditRepairJob] createSignedUrl failed:', path, error.message);
          continue;
        }
        if (data?.signedUrl) urls.push(data.signedUrl);
      }
      if (!cancelled) setSignedPhotoUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [existingPhotoPaths]);

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

  // @backend wired — useUpdateJob (direct table update) + two-phase photo sync
  const handleSave = async () => {
    if (!job?.id) return;
    setIsSaving(true);
    try {
      // 1. Update core fields
      await updateJob.mutateAsync({
        jobId: job.id,
        updates: {
          title: jobTitle.trim(),
          trades: Array.from(selectedTrades)
            .map((label) => TRADE_LABEL_TO_ENUM[label] ?? label)
            .filter(Boolean) as TradeEnum[],
          due_date: dueDate
            ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
            : job.due_date,
          budget_min: budgetMin ? parseInt(budgetMin, 10) : job.budget_min,
          budget_max: budgetMax ? parseInt(budgetMax, 10) : job.budget_max,
          description: description.trim(),
        },
      });

      // 2. Photo sync — upload any new photos, then commit full path array
      const allPaths = [...existingPhotoPaths];
      if (newPhotos.length > 0) {
        try {
          const uploadedPaths = await uploadJobPhotos(job.id, newPhotos);
          allPaths.push(...uploadedPaths);
        } catch (uploadErr) {
          console.warn('[EditRepairJob] uploadJobPhotos failed (non-fatal):', uploadErr);
        }
      }
      const originalSorted = [...(job.photo_urls ?? [])].sort();
      const newSorted = [...allPaths].sort();
      const pathsChanged =
        originalSorted.length !== newSorted.length ||
        originalSorted.some((p, i) => p !== newSorted[i]);
      if (pathsChanged) {
        try {
          await setJobPhotosMutation.mutateAsync({ jobId: job.id, photoUrls: allPaths });
        } catch (photoErr) {
          console.warn('[EditRepairJob] rpc_set_job_photos failed (non-fatal):', photoErr);
        }
      }

      navigation.goBack();
    } catch (err) {
      console.error('[EditRepairJob] Save failed:', err);
      Alert.alert('Save Failed', 'Could not save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // @backend wired — useCancelJob → rpc_cancel_job (soft cancel, withdraws bids)
  const handleDelete = () => {
    Alert.alert(
      'Cancel Job',
      'This will cancel the job and withdraw all pending bids. This cannot be undone.',
      [
        { text: 'Keep Job', style: 'cancel' },
        {
          text: 'Cancel Job',
          style: 'destructive',
          onPress: async () => {
            if (!job?.id) return;
            setIsCancelling(true);
            try {
              await cancelJob.mutateAsync(job.id);
              // Pop past RepairJobDetails back to Home
              navigation.goBack();
              navigation.goBack();
            } catch (err) {
              console.error('[EditRepairJob] Cancel failed:', err);
              Alert.alert('Error', 'Could not cancel job. Please try again.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  // Handle add photo — caps at 6 total (existing + new)
  const handleAddPhoto = async () => {
    if (existingPhotoPaths.length + newPhotos.length >= 6) {
      Alert.alert('Limit Reached', 'You can have up to 6 photos per job.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setNewPhotos((prev) => [...prev, result.assets![0].uri]);
    }
  };

  // Remove an existing photo (deletes from pending DB path array; not uploaded yet)
  const removeExistingPhoto = (index: number) => {
    setExistingPhotoPaths((prev) => prev.filter((_, i) => i !== index));
    setSignedPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // Remove a newly-picked photo (discards local URI before upload)
  const removeNewPhoto = (index: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Loading guard — shows spinner while live job data is fetching
  if (isLoading || !job) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ══════════════════════════════════════════
          HEADER: ← Edit Job | Save
          Absolute-centered title pattern
          ══════════════════════════════════════════ */}
      <View
        style={{
          height: 48 + insets.top,
          paddingTop: insets.top,
          backgroundColor: COLORS.background,
          borderBottomWidth: 0.68,
          borderBottomColor: COLORS.border,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        {/* Back — 44×44 touch target */}
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
          <BackIcon />
        </Pressable>

        {/* Title — absolute-centered so it's always the visual middle */}
        <Text
          style={{
            position: 'absolute',
            top: insets.top,
            left: 0,
            right: 0,
            height: 48,
            lineHeight: 48,
            textAlign: 'center',
            fontSize: 17,
            fontWeight: '600',
            color: COLORS.darkText,
          }}
        >
          Edit Job
        </Text>

        {/* Save — right-aligned, disabled while saving or cancelling */}
        <View style={{ flex: 1, alignItems: 'flex-end', paddingRight: 16 }}>
          <Pressable
            onPress={hasChanges && !isSaving && !isCancelling ? handleSave : undefined}
            hitSlop={12}
            style={({ pressed }) => ({
              opacity: pressed && hasChanges && !isSaving && !isCancelling ? 0.5 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: hasChanges && !isSaving && !isCancelling ? COLORS.primary : COLORS.lightText,
                lineHeight: 24,
              }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        </View>
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
          <FormField
            label="Job Title"
            value={jobTitle}
            onChangeText={setJobTitle}
            placeholder="Enter job title"
          />

          {/* ── Trade(s) Picker ── */}
          <View style={{ gap: 12 }}>
            {/* Heading: 17px, 600, #101828 */}
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.headingText, lineHeight: 28 }}>
              Trade(s)
            </Text>
            {/* Pills — wrapping, 40px height, 12px gap */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {ALL_TRADE_LABELS.map((trade) => {
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
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
              Due Date
            </Text>
            {/* Urgent pill — stays when job flagged urgent AND a date is set */}
            {job.is_urgent && dueDate && (
              <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: COLORS.urgentBg, borderRadius: 9999 }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.urgentText, lineHeight: 20, textAlign: 'center' }}>
                  Due {formatDate(dueDate)}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => setShowDatePicker(!showDatePicker)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 12,
                backgroundColor: COLORS.inputBackground,
                borderRadius: 10,
                borderWidth: 0.68,
                borderColor: dueDate ? COLORS.inputActiveBorder : COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '400', color: dueDate ? COLORS.darkText : COLORS.bodyText, lineHeight: 20 }}>
                {dueDate ? formatDate(dueDate) : 'Select date'}
              </Text>
              <CalendarIcon />
            </Pressable>
            {showDatePicker && (
              <View style={{ alignItems: 'center' }}>
                <DateTimePicker
                  value={dueDate ?? new Date(Date.now() + 7 * 86400000)}
                  mode="date"
                  display="inline"
                  themeVariant="light"
                  minimumDate={new Date()}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      setShowDatePicker(false);
                    }
                    if (event.type === 'set' && date) {
                      setDueDate(date);
                      setShowDatePicker(false);
                    } else if (event.type === 'dismissed') {
                      setShowDatePicker(false);
                    }
                  }}
                />
              </View>
            )}
          </View>

          {/* ── Budget (Min – Max) ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
              Budget
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <FormField
                  label=""
                  value={budgetMin}
                  onChangeText={setBudgetMin}
                  placeholder="Min"
                  placeholderTextColor={COLORS.lightText}
                  prefix="$"
                  keyboardType="numeric"
                />
              </View>
              <Text style={{ fontSize: 15, fontWeight: '400', color: COLORS.lightText, lineHeight: 20, paddingHorizontal: 8 }}>–</Text>
              <View style={{ flex: 1 }}>
                <FormField
                  label=""
                  value={budgetMax}
                  onChangeText={setBudgetMax}
                  placeholder="Max"
                  placeholderTextColor={COLORS.lightText}
                  prefix="$"
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* ── Description ── */}
          <FormField
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the work needed..."
            multiline
          />

          {/* ── Photos ── */}
          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20 }}>
              Photos
            </Text>
            {/* Horizontal scroll of photo thumbnails + add button */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
            >
              {/* Existing photos — signed URLs from DB */}
              {signedPhotoUrls.map((uri, index) => (
                <PhotoThumbnail
                  key={`existing-${index}`}
                  uri={uri}
                  onDelete={() => removeExistingPhoto(index)}
                />
              ))}
              {/* New photos picked this session — local URIs */}
              {newPhotos.map((uri, index) => (
                <PhotoThumbnail
                  key={`new-${index}`}
                  uri={uri}
                  onDelete={() => removeNewPhoto(index)}
                />
              ))}
              {/* Add button — cap at 6 total */}
              {existingPhotoPaths.length + newPhotos.length < 6 && (
                <AddPhotoButton onPress={handleAddPhoto} />
              )}
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
        {/* Cancel Job: white bg, red border 1.37px, 50px height, rounded 14 */}
        <Pressable
          onPress={handleDelete}
          disabled={isCancelling}
          style={({ pressed }) => ({
            height: 51,
            backgroundColor: COLORS.background,
            borderRadius: 14,
            borderWidth: 1.37,
            borderColor: COLORS.rejectRed,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed && !isCancelling ? 0.7 : isCancelling ? 0.5 : 1,
          })}
        >
          <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.rejectRed, lineHeight: 24, textAlign: 'center' }}>
            {isCancelling ? 'Cancelling…' : 'Cancel Job'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default EditRepairJob;
