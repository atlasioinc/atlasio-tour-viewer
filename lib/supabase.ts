// ═══════════════════════════════════════════════════════════════
// lib/supabase.ts
// Supabase Client — single shared instance for the entire app
//
// Provides the configured Supabase client used by all hooks in
// hooks/useData.ts, all realtime subscriptions in hooks/useRealtime.ts,
// and auth operations in App.tsx + LoginScreen.tsx.
//
// Setup steps:
//   1. Create project at supabase.com
//   2. Copy URL + anon key from Settings → API
//   3. Add to .env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
//   4. Install: npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
//
// Key config:
//   - AsyncStorage for session persistence (survives app restarts)
//   - detectSessionInUrl: false — deep link tokens are extracted manually
//     in App.tsx via expo-linking (more reliable in Expo than auto-detect)
//   - autoRefreshToken: true — Supabase SDK handles JWT refresh
//
// Exports:
//   supabase          — the client instance
//   getCurrentUserId  — async helper, reads from auth.getUser()
//   getStorageUrl     — builds public URL for storage bucket files
//
// @backend: Supabase project config (URL + anon key via .env)
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key';

// @demo TEMP: Safe AsyncStorage wrapper for Expo Go compatibility
// Native module null error occurs in Expo Go sandbox — fallback prevents crash
// In production native build this wrapper is unnecessary but harmless
const safeStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: safeStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // required for React Native
  },
});

// ─────────────────────────────────────────────
// HELPER: Get current user ID
// ─────────────────────────────────────────────
export const getCurrentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

// ─────────────────────────────────────────────
// HELPER: Get public URL for Storage files
// ─────────────────────────────────────────────
export const getStorageUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
