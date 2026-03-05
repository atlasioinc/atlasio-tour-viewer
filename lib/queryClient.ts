// ═══════════════════════════════════════════════════════════════
// lib/queryClient.ts
// TanStack React Query Client — shared instance for all data hooks
//
// Provides the QueryClient used by every hook in hooks/useData.ts.
// Wrapped in <QueryClientProvider> at the root of App.tsx.
//
// Config:
//   staleTime: 5min              — reduces redundant fetches across tab switches
//   retry: 1                     — single retry on failure (keeps demo snappy)
//   refetchOnWindowFocus: false  — required for React Native
//                                  (AppState focus events differ from web)
//
// Lifecycle:
//   - Cleared on sign-out: App.tsx calls queryClient.clear() in onAuthStateChange
//   - Invalidated on onboarding: useCompleteOnboarding invalidates myProfile key
//
// @backend: none — client-side configuration only
// ═══════════════════════════════════════════════════════════════

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,    // 5 minutes — data stays fresh
      retry: 1,                      // retry failed queries once
      refetchOnWindowFocus: false,   // don't refetch when app comes to foreground
    },
  },
});