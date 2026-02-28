// lib/supabase.ts
// ═══════════════════════════════════════════════════════════════
// Supabase Client Configuration
//
// Setup steps:
//   1. Create project at supabase.com
//   2. Copy URL + anon key from Settings → API
//   3. Add to .env: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
//   4. Install: npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
//
// This client handles:
//   - Auth (sign-up, login, session persistence)
//   - Database queries (CRUD on all tables)
//   - Realtime subscriptions (chat, notifications)
//   - Storage (avatar photos, repair job photos)
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
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
