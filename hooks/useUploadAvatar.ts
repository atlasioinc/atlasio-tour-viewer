// What: Pick a photo from camera or library, upload to Supabase avatars bucket,
//       update profiles.avatar_url, invalidate my_profile cache
// Who: Any authenticated user (agent, contractor, partner)
// Backend: supabase.storage.from('avatars').upload() + supabase.from('profiles').update()

import { useState, useCallback } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

// STATE FLOW:
// pickAndUpload() → ActionSheet (iOS) / Alert (Android)
// → ImagePicker (camera or library) → cancelled? return early
// → fetch(uri).blob() → storage.upload(`${userId}/avatar.jpg`, blob, { upsert: true })
// → storage.getPublicUrl() → profiles.update({ avatar_url })
// → invalidate ['my_profile'] cache → isUploading = false

export const useUploadAvatar = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const launchPicker = useCallback(async (source: 'camera' | 'library') => {
    const pickerFn = source === 'camera'
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await pickerFn({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });

    return result;
  }, []);

  // S149b: optional onSuccess callback fires after a successful upload OR remove,
  // used by EditProfileScreen to surface the SuccessToast. Failure path remains
  // the in-hook Alert.alert (S146 fix) — onSuccess is not called on failure.
  const pickAndUpload = useCallback(async (
    currentAvatarUrl?: string | null,
    onSuccess?: () => void,
  ) => {
    setError(null);
    const hasPhoto = !!currentAvatarUrl;

    const showOptions = (resolve: (source: 'camera' | 'library' | 'remove' | null) => void) => {
      if (Platform.OS === 'ios') {
        if (hasPhoto) {
          ActionSheetIOS.showActionSheetWithOptions(
            {
              options: ['Take Photo', 'Choose from Library', 'Remove Photo', 'Cancel'],
              cancelButtonIndex: 3,
              destructiveButtonIndex: 2,
            },
            (buttonIndex) => {
              if (buttonIndex === 0) resolve('camera');
              else if (buttonIndex === 1) resolve('library');
              else if (buttonIndex === 2) resolve('remove');
              else resolve(null);
            },
          );
        } else {
          ActionSheetIOS.showActionSheetWithOptions(
            {
              options: ['Take Photo', 'Choose from Library', 'Cancel'],
              cancelButtonIndex: 2,
            },
            (buttonIndex) => {
              if (buttonIndex === 0) resolve('camera');
              else if (buttonIndex === 1) resolve('library');
              else resolve(null);
            },
          );
        }
      } else {
        const options = hasPhoto
          ? [
              { text: 'Take Photo', onPress: () => resolve('camera') },
              { text: 'Choose from Library', onPress: () => resolve('library') },
              { text: 'Remove Photo', style: 'destructive' as const, onPress: () => resolve('remove') },
              { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
            ]
          : [
              { text: 'Take Photo', onPress: () => resolve('camera') },
              { text: 'Choose from Library', onPress: () => resolve('library') },
              { text: 'Cancel', style: 'cancel' as const, onPress: () => resolve(null) },
            ];
        Alert.alert(hasPhoto ? 'Update Photo' : 'Upload Photo', 'Choose a source', options);
      }
    };

    const source = await new Promise<'camera' | 'library' | 'remove' | null>(showOptions);
    if (!source) return;

    // Handle remove photo
    if (source === 'remove') {
      try {
        setIsUploading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');

        // Clear avatar_url on profile (critical — throw on failure)
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', user.id);
        if (profileError) throw new Error('Failed to remove photo');

        // Delete file from storage (non-critical — log only)
        const filePath = `${user.id}/avatar.jpg`;
        const { error: storageError } = await supabase.storage
          .from('avatars')
          .remove([filePath]);
        if (storageError) {
          console.log('[useUploadAvatar] storage delete failed (non-critical):', storageError.message);
        }

        // S146a: optimistic clear + invalidate with correct key ['profile', 'me']
        queryClient.setQueryData(['profile', 'me'], (old: any) => ({
          ...old,
          avatar_url: null,
        }));
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
        onSuccess?.();
      } catch (err: any) {
        const message = err?.message || 'Failed to remove photo';
        setError(message);
        console.error('[useUploadAvatar] Remove failed:', err);
      } finally {
        setIsUploading(false);
      }
      return;
    }

    try {
      setIsUploading(true);

      const result = await launchPicker(source);
      if (result.canceled || !result.assets?.[0]?.uri) {
        setIsUploading(false);
        return;
      }

      const pickedUri = result.assets[0].uri;

      // @backend supabase.auth.getUser() — get current user ID
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // S146: step-tagged errors so device Alert identifies which step failed
      let base64: string;
      try {
        base64 = await FileSystem.readAsStringAsync(pickedUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch (readErr: any) {
        throw new Error(`FileSystem read failed: ${readErr?.message ?? readErr}`);
      }

      let arrayBuffer: Uint8Array;
      try {
        arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      } catch (decodeErr: any) {
        throw new Error(`Base64 decode failed: ${decodeErr?.message ?? decodeErr}`);
      }

      // @backend supabase.storage.from('avatars').upload — upsert avatar
      const storagePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

      // @backend supabase.storage.from('avatars').getPublicUrl
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(storagePath);

      // Bust cache — append timestamp to force CDN refresh
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // @backend supabase.from('profiles').update({ avatar_url }) — save URL to profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);
      if (updateError) throw updateError;

      // S146a: correct cache key is ['profile', 'me'] (queryKeys.myProfile),
      // not ['my_profile']. Optimistic setQueryData updates UI immediately,
      // invalidate triggers a background refetch to confirm from DB.
      queryClient.setQueryData(['profile', 'me'], (old: any) => ({
        ...old,
        avatar_url: publicUrl,
      }));
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
      onSuccess?.();
    } catch (err: any) {
      const message = err?.message || 'Failed to upload photo';
      setError(message);
      Alert.alert('Upload Failed', message);
      console.error('[useUploadAvatar] Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, [launchPicker, queryClient]);

  return { pickAndUpload, isUploading, error };
};
