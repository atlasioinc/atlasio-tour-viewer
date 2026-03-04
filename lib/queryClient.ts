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