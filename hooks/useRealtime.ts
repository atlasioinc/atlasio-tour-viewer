// hooks/useRealtime.ts
// ═══════════════════════════════════════════════════════════════
// Realtime Subscriptions — Supabase Postgres Changes
//
// Each hook subscribes to a specific table on mount,
// invalidates the relevant TanStack Query cache on changes,
// and unsubscribes on cleanup.
//
// Prerequisites (run in Supabase SQL Editor if not already set):
//   ALTER TABLE messages REPLICA IDENTITY FULL;
//   ALTER TABLE bids REPLICA IDENTITY FULL;
//   ALTER TABLE notifications REPLICA IDENTITY FULL;
// Also enable Realtime for these tables in Dashboard → Database → Replication.
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────
// MESSAGES — Invalidate thread messages on new message
// Used by: ChatScreen
// ─────────────────────────────────────────────

export function useRealtimeMessages(threadId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', threadId] });
          // Also refresh thread list (updates last_message preview)
          queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId, queryClient]);
}

// ─────────────────────────────────────────────
// NOTIFICATIONS — Invalidate on new notification
// Used by: NotificationsTab, BottomTabNavigator (badge count)
// ─────────────────────────────────────────────

export function useRealtimeNotifications(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

// ─────────────────────────────────────────────
// BIDS — Invalidate job bids on new/updated bid
// Used by: RepairJobDetails
// ─────────────────────────────────────────────

export function useRealtimeBids(jobId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!jobId) return;

    const channel = supabase
      .channel(`bids:${jobId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT and UPDATE
          schema: 'public',
          table: 'bids',
          filter: `job_id=eq.${jobId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['repair-jobs', jobId, 'bids'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, queryClient]);
}
