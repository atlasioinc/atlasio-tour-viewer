// What: Pick a photo from camera or library, upload to Supabase avatars bucket,
//       update profiles.avatar_url, invalidate my_profile cache
// Who: Any authenticated user (agent, contractor, partner)
// Backend: supabase.storage.from('avatars').upload() + supabase.from('profiles').update()

import { useState, useCallback } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
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

  const pickAndUpload = useCallback(async () => {
    setError(null);

    const showOptions = (resolve: (source: 'camera' | 'library' | null) => void) => {
      if (Platform.OS === 'ios') {
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
      } else {
        Alert.alert('Upload Photo', 'Choose a source', [
          { text: 'Take Photo', onPress: () => resolve('camera') },
          { text: 'Choose from Library', onPress: () => resolve('library') },
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        ]);
      }
    };

    const source = await new Promise<'camera' | 'library' | null>(showOptions);
    if (!source) return;

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

      // @backend fetch image blob from local URI
      const response = await fetch(pickedUri);
      const blob = await response.blob();

      // @backend supabase.storage.from('avatars').upload — upsert avatar
      const storagePath = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(storagePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });
      if (uploadError) throw uploadError;

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

      // Invalidate profile cache so UI refreshes
      queryClient.invalidateQueries({ queryKey: ['my_profile'] });
    } catch (err: any) {
      const message = err?.message || 'Failed to upload photo';
      setError(message);
      console.error('[useUploadAvatar] Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, [launchPicker, queryClient]);

  return { pickAndUpload, isUploading, error };
};
