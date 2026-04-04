// ═══════════════════════════════════════════════════════════════
// hooks/useData.ts
// Data Hooks — TanStack Query wrappers for all Supabase queries
//
// Every screen fetches data through hooks exported from this file.
// Screens never call Supabase directly — this is the data boundary.
//
// Each useQuery hook provides:  { data, isLoading, error, refetch }
// Each useMutation hook provides: { mutate, mutateAsync, isPending }
//
// ─────────────────────────────────────────────
// WIRING STATUS:
//   All hooks follow the "wired with mock fallback" pattern:
//   try { Supabase call } catch { console.warn + mock fallback }
//   This means the demo app never breaks, even without Supabase.
//   See CLAUDE.md § Backend Wiring Pattern for the canonical form.
//
//   STATUS annotations on each hook:
//     wired   — Supabase call implemented, mock fallback preserved
//     mock    — placeholder only, no Supabase call yet
//
//   @demo: all catch blocks contain mock fallbacks (TODO: [PRODUCTION])
//   @backend: Supabase tables + RPCs referenced throughout
// ─────────────────────────────────────────────
//
// HOOK CATALOG (59 hooks, 14 sections):
//   QUERY KEYS           — centralized cache keys for invalidation
//   PROFILE (5)          — useMyProfile, useProfile, useUpdateProfile,
//                          useConnectionStatus, useProfileVouches
//   NETWORK (9)          — useNetworkContacts, useConnections, useConnectionRequests,
//                          useConnectionRequestCount, useConnectedPros, useToggleSquad,
//                          useSendConnectionRequest, useAcceptConnection, useDeclineConnection
//   REPAIR JOBS (13)     — useAgentJobs, useJobs, useJob, useJobBids,
//                          useAcceptBid, useCounterBid, useRejectBid,
//                          useMarkJobComplete, useConfirmJobComplete, useRequestJobRevision,
//                          useCreateJob, useUpdateJob, useInviteContractors
//   VOUCH FEED (2)       — useVouchFeed, useLikeVouch
//   CHAT / INBOX (8)     — useChatThreads, useMarkThreadRead, useChatRecipients,
//                          useCreateThread, useMessages, useSendMessage,
//                          useInboxThreads, useThreadMessages
//   NOTIFICATIONS (3)    — useNotifications, useMarkNotificationsRead, useUnreadNotificationCount
//   FIND / SEARCH (4)    — useSearchPros, useFindPros, useRecommendedPros, useTrendingPros
//   SQUADS (3)           — useSquadMembers, useAssignSquadMember, useRemoveSquadMember
//   CONTRACTOR JOBS (6)  — useContractorJobDetails, useSubmitBid, useRespondToCounter,
//                          useAcceptInvitation, useDeclineInvitation, useStartJob
//   CONTRACTOR DASHBOARD (3) — useMatchingJobs, useContractorEarnings, useMarketPulse
//   ONBOARDING (1)       — useCompleteOnboarding
//   ACCOUNT (1)          — useDeleteAccount
//   SQUAD SHARE (1)      — useSquadShare (sendViaEmail + sendViaSms)
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { MOCK_REPAIR_JOBS } from '../components/RepairJobsData';
import type { AgentActiveDeal } from '../features/partners/types/partner.types';
import type {
  Profile,
  PerformanceStats,
  NetworkContact,
  NetworkContractor,
  Connection,
  Job,
  JobType,
  TradeEnum,
  Bid,
  BidWithProfile,
  Vouch,
  VouchEntry,
  ChatThreadView,
  Message,
  Notification,
  Recipient,
  SquadMember,
  UserRole,
  ContractorJobDetail,
  SquadShareEmailParams,
  SquadShareSmsParams,
  SquadShareResult,
  InboxThread,
  ThreadMessage,
  ClosedDeal,
} from '../types';
import { FEATURE_FLAGS } from '../lib/featureFlags';

// ═══════════════════════════════════════════════════════════════
// QUERY KEYS — centralized for cache invalidation
// ═══════════════════════════════════════════════════════════════

export const queryKeys = {
  // Profile
  profile: (id: string) => ['profile', id] as const,
  myProfile: ['profile', 'me'] as const,
  connectionStatus: (profileId: string) => ['connection-status', profileId] as const,
  profileVouches: (profileId: string) => ['profile-vouches', profileId] as const,

  // Network
  networkContacts: (tab: 'partners' | 'contractors') => ['network', tab] as const,
  networkContractors: ['network', 'contractors-invite'] as const,
  connections: ['connections'] as const,
  connectionRequests: ['connection-requests'] as const,
  connectionRequestCount: ['connection-requests', 'count'] as const,
  connectedPros: (role: string) => ['connected-pros', role] as const,

  // Repair Jobs
  repairJobs: ['repair-jobs'] as const,
  repairJob: (id: string) => ['repair-jobs', id] as const,
  jobBids: (jobId: string) => ['repair-jobs', jobId, 'bids'] as const,

  // Vouch Feed
  vouchFeed: (filter?: string) => ['vouches', filter ?? 'all'] as const,

  // Chat / Inbox
  chatThreads: ['chat-threads'] as const,
  chatMessages: (conversationId: string) => ['messages', conversationId] as const,
  messages: (threadId: string) => ['messages', threadId] as const,
  chatRecipients: ['chat-recipients'] as const,
  inboxThreads: ['inbox_threads'] as const,
  threadMessages: (threadId: string) => ['thread_messages', threadId] as const,

  // Notifications
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,

  // Find / Search
  findPros: (query: string, role: string, sort: string) =>
    ['find-pros', query, role, sort] as const,
  searchPros: (query: string, role: string) => ['search-pros', query, role] as const,
  recommendedPros: ['recommended-pros'] as const,
  trendingPros: ['trending-pros'] as const,

  // Squads
  squadMembers: (squadId: string) => ['squad-members', squadId] as const,

  // Agent Jobs
  agentJobs: ['agent-jobs'] as const,

  // Contractor Dashboard
  matchingJobs: (limit: number) => ['matchingJobs', limit] as const,
  contractorEarnings: ['contractorEarnings'] as const,
  marketPulse: ['marketPulse'] as const,
} as const;

// ═══════════════════════════════════════════════════════════════
// PROFILE HOOKS
// @backend: profiles table, connections table, vouches table
// ═══════════════════════════════════════════════════════════════


/**
 * Fetch current user's own profile
 */
// STATUS: wired (with mock fallback)
export const useMyProfile = () => {
  return useQuery({
    queryKey: queryKeys.myProfile,
    queryFn: async (): Promise<Profile> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) throw error;
        return data as Profile;
      } catch (err) {
        console.warn('[useMyProfile] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return {
          id: 'mock-user-1', name: 'Demo Agent', company: 'Atlasio Demo', role: 'agent',
          display_role: 'Real Estate Agent', location: 'Denver, CO', bio: '', avatar_url: null,
          avatar_color: '#7BA3C9', rating: 4.8, vouch_count: 6, deals_closed: 24, headline: null,
          tags: [], trades: [], trade: null, specialties: [], languages: [], licensed: null,
          active_since: '2022', service_area: 'Denver Metro', phone: null,
          profile_visibility: 'public', is_visible: true, is_verified: false, is_banned: false,
          credential_urls: [], stripe_account_id: null, typical_close_days: null, base_price: null,
          fee_tier: 'free', completed_bids_count: 0, fee_tier_started_at: null,
          notification_preferences: {}, is_public: true,
          license_number: null, license_state: 'CO', license_status: null, license_verified: false,
          license_verified_at: null, phone_verified: false, phone_verified_at: null,
          insurance_uploaded: false, verification_level: 'none',
          deactivated_at: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        } as Profile;
      }
    },
  });
};

/**
 * Fetch a profile by ID with performance stats
 */
// STATUS: wired (with mock fallback)
export const useProfile = (profileId: string) => {
  return useQuery({
    queryKey: queryKeys.profile(profileId),
    queryFn: async (): Promise<Profile & { performance_stats: PerformanceStats | null }> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, performance_stats(*)')
          .eq('id', profileId)
          .single();
        if (error) throw error;
        return data as Profile & { performance_stats: PerformanceStats | null };
      } catch (err) {
        console.warn('[useProfile] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        // Full mock shape — only used when Supabase is unreachable
        return {
          id: profileId, name: 'Unknown', company: '', role: 'agent',
          display_role: '', location: '', bio: '', avatar_url: null,
          avatar_color: '#7BA3C9', rating: 0, vouch_count: 0, deals_closed: 0, headline: null,
          tags: [], trades: [], trade: null, specialties: [], languages: [], licensed: null,
          active_since: '', service_area: '', phone: null,
          profile_visibility: 'public', is_visible: true, is_verified: false, is_banned: false,
          credential_urls: [], stripe_account_id: null, typical_close_days: null, base_price: null,
          fee_tier: 'free', completed_bids_count: 0, fee_tier_started_at: null,
          notification_preferences: {}, is_public: true,
          license_number: null, license_state: 'CO', license_status: null, license_verified: false,
          license_verified_at: null, phone_verified: false, phone_verified_at: null,
          insurance_uploaded: false, verification_level: 'none',
          deactivated_at: null,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          performance_stats: null,
        } as Profile & { performance_stats: PerformanceStats | null };
      }
    },
    enabled: !!profileId,
  });
};

/**
 * Update current user's profile
 * Accepts Partial<Profile> — only send changed fields
 */
// STATUS: wired (with mock fallback)
export const useUpdateProfile = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Profile>): Promise<Profile> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId)
          .select()
          .single();
        if (error) throw error;
        return data as Profile;
      } catch (err) {
        console.warn('[useUpdateProfile] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        const current = qc.getQueryData<Profile>(queryKeys.myProfile);
        return { ...current, ...updates } as Profile;
      }
    },
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.myProfile, data);
      qc.invalidateQueries({ queryKey: queryKeys.myProfile });
    },
  });
};

/**
 * Check relationship between current user and a profile
 * Returns: 'self' | 'connected' | 'pending' | 'none'
 */
// STATUS: wired (with mock fallback)
export type ConnectionStatusValue = 'self' | 'connected' | 'pending' | 'none';
export const useConnectionStatus = (profileId: string) => {
  return useQuery({
    queryKey: queryKeys.connectionStatus(profileId),
    queryFn: async (): Promise<ConnectionStatusValue> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) return 'none';
        if (userId === profileId) return 'self';
        const { data, error } = await supabase
          .from('connections')
          .select('status')
          .or(
            `and(requester_id.eq.${userId},responder_id.eq.${profileId}),and(requester_id.eq.${profileId},responder_id.eq.${userId})`
          )
          .maybeSingle();
        if (error) throw error;
        if (!data) return 'none';
        if (data.status === 'accepted') return 'connected';
        if (data.status === 'pending') return 'pending';
        return 'none';
      } catch (err) {
        console.warn('[useConnectionStatus] Supabase failed, using mock fallback', err);
        return 'none';
      }
    },
    enabled: !!profileId,
  });
};

/**
 * Fetch recent vouches for a profile (for ProProfile screen)
 * Returns VouchEntry[] (compact format: id, name, quote, avatar_color)
 */
// STATUS: wired (with mock fallback)
export const useProfileVouches = (profileId: string) => {
  return useQuery({
    queryKey: queryKeys.profileVouches(profileId),
    queryFn: async (): Promise<VouchEntry[]> => {
      try {
        const { data, error } = await supabase
          .from('vouches')
          .select('id, quote, author:profiles!author_id(name, avatar_color)')
          .eq('recipient_id', profileId)
          .order('created_at', { ascending: false })
          .limit(5);
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
          id: row.id,
          name: row.author?.name ?? 'Unknown',
          quote: row.quote,
          avatar_color: row.author?.avatar_color ?? '#7BA3C9',
        }));
      } catch (err) {
        console.warn('[useProfileVouches] Supabase failed, using mock fallback', err);
        return [];
      }
    },
    enabled: !!profileId,
  });
};

// ═══════════════════════════════════════════════════════════════
// NETWORK HOOKS
// @backend: connections table, rpc_accept_connection, rpc_reject_connection
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch network contacts (partners or contractors)
 *
 * Production query:
 *   supabase
 *     .from('connections')
 *     .select('*, profile:profiles!responder_id(*)')
 *     .eq('requester_id', userId)
 *     .eq('status', 'accepted')
 */
// STATUS: wired (with mock fallback)
export const useNetworkContacts = (tab: 'partners' | 'contractors') => {
  return useQuery({
    queryKey: queryKeys.networkContacts(tab),
    queryFn: async (): Promise<NetworkContact[]> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('connections')
          .select('*, profile:profiles!responder_id(id, name, company, display_role, role, tags, avatar_color)')
          .eq('requester_id', userId)
          .eq('status', 'accepted');
        if (error) throw error;
        // Map join result to flat NetworkContact shape
        return (data ?? []).map((row: any) => ({
          id: row.id,
          profile_id: row.profile?.id ?? row.responder_id,
          name: row.profile?.name ?? '',
          company: row.profile?.company ?? '',
          role: row.profile?.display_role ?? row.profile?.role ?? '',
          group: row.profile?.role === 'contractor' ? 'Contractors' : 'Partners',
          tags: row.profile?.tags ?? [],
          avatar_color: row.profile?.avatar_color ?? '#7BA3C9',
          is_in_squad: row.is_in_squad ?? false,
          tab: tab,
        })) as NetworkContact[];
      } catch (err) {
        console.warn('[useNetworkContacts] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
  });
};

/**
 * Fetch all accepted connections for current user
 */
// STATUS: wired (with mock fallback)
export const useConnections = () => {
  return useQuery({
    queryKey: queryKeys.connections,
    queryFn: async (): Promise<(Connection & { profile: Profile })[]> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        // S115d: join BOTH profiles so we can pick the other person's profile
        // (not always responder — current user can be either requester or responder)
        const { data, error } = await supabase
          .from('connections')
          .select('*, requester_profile:profiles!requester_id(*), responder_profile:profiles!responder_id(*)')
          .or(`requester_id.eq.${userId},responder_id.eq.${userId}`)
          .eq('status', 'accepted');
        if (error) throw error;
        // @backend S115d: always use the OTHER person's profile, not self
        // Before this fix, profiles!responder_id returned Tony's own profile
        // when Lisa was the requester (requester=Lisa, responder=Tony)
        const normalized = (data ?? []).map((conn: any) => {
          const isRequester = conn.requester_id === userId;
          return {
            ...conn,
            profile: isRequester
              ? (conn.responder_profile ?? conn.requester_profile)
              : (conn.requester_profile ?? conn.responder_profile),
          };
        });
        return normalized as (Connection & { profile: Profile })[];
      } catch (err) {
        console.warn('[useConnections] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
  });
};

/**
 * Fetch pending connection requests (incoming)
 */
// STATUS: wired (with mock fallback)
export const useConnectionRequests = () => {
  return useQuery({
    queryKey: queryKeys.connectionRequests,
    queryFn: async (): Promise<(Connection & { requester: Profile })[]> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('connections')
          .select('*, requester:profiles!requester_id(*)')
          .eq('responder_id', userId)
          .eq('status', 'pending');
        if (error) throw error;
        // Supabase typed client can't infer join alias — runtime shape is correct
        return (data ?? []) as (Connection & { requester: Profile })[];
      } catch (err) {
        console.warn('[useConnectionRequests] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
  });
};

/**
 * Pending connection request count (for badge)
 */
// STATUS: wired (with mock fallback)
export const useConnectionRequestCount = () => {
  return useQuery({
    queryKey: queryKeys.connectionRequestCount,
    queryFn: async (): Promise<number> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { count, error } = await supabase
          .from('connections')
          .select('id', { count: 'exact', head: true })
          .eq('responder_id', userId)
          .eq('status', 'pending');
        if (error) throw error;
        return count ?? 0;
      } catch (err) {
        console.warn('[useConnectionRequestCount] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return 0;
      }
    },
    refetchInterval: 30 * 1000,
  });
};

/**
 * Fetch connected pros filtered by role
 */
// STATUS: wired (with mock fallback)
export const useConnectedPros = (role: string) => {
  return useQuery({
    queryKey: queryKeys.connectedPros(role),
    queryFn: async (): Promise<(Connection & { profile: Profile })[]> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('connections')
          .select('*, profile:profiles!responder_id(*)')
          .or(`requester_id.eq.${userId},responder_id.eq.${userId}`)
          .eq('status', 'accepted');
        if (error) throw error;
        const filtered = (data ?? []).filter((c: any) =>
          role === 'All' || c.profile?.role === role
        );
        // Supabase typed client can't infer join alias — runtime shape is correct
        return filtered as (Connection & { profile: Profile })[];
      } catch (err) {
        console.warn('[useConnectedPros] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
  });
};

/**
 * Toggle squad membership for a connection
 */
// STATUS: wired (with mock fallback)
export const useToggleSquad = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, isInSquad }: { connectionId: string; isInSquad: boolean }) => {
      try {
        const { error } = await supabase
          .from('connections')
          .update({ is_in_squad: isInSquad })
          .eq('id', connectionId);
        if (error) throw error;
      } catch (err) {
        console.warn('[useToggleSquad] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        await new Promise((r) => setTimeout(r, 300));
      }
      return { connectionId, isInSquad };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.connections });
      qc.invalidateQueries({ queryKey: ['network'] });
    },
  });
};

/**
 * Send a connection request (direct INSERT — no RPC, uses RLS policy)
 */
// STATUS: wired (with mock fallback)
export const useSendConnectionRequest = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId, note }: { targetId: string; note?: string }) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { error } = await supabase
          .from('connections')
          .insert({ requester_id: userId, responder_id: targetId, status: 'pending', note: note ?? null });
        if (error) throw error;
      } catch (err) {
        console.warn('[useSendConnectionRequest] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.connections });
      qc.invalidateQueries({ queryKey: queryKeys.connectionRequests });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
};

/**
 * Accept a connection request
 * RPC: rpc_accept_connection(p_connection_id UUID) → VOID
 */
// STATUS: wired (with mock fallback)
export const useAcceptConnection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ connectionId }: { connectionId: string }) => {
      try {
        const { error } = await supabase.rpc('rpc_accept_connection', {
          p_connection_id: connectionId,
        });
        if (error) throw error;
      } catch (err) {
        console.warn('[useAcceptConnection] Supabase RPC failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.connections });
      qc.invalidateQueries({ queryKey: queryKeys.connectionRequests });
      qc.invalidateQueries({ queryKey: queryKeys.connectionRequestCount });
    },
  });
};

/**
 * Decline a connection request
 * RPC: rpc_reject_connection(p_connection_id UUID) → VOID
 */
// STATUS: wired (with mock fallback)
export const useDeclineConnection = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ connectionId }: { connectionId: string }) => {
      try {
        const { error } = await supabase.rpc('rpc_reject_connection', {
          p_connection_id: connectionId,
        });
        if (error) throw error;
      } catch (err) {
        console.warn('[useDeclineConnection] Supabase RPC failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.connectionRequests });
      qc.invalidateQueries({ queryKey: queryKeys.connectionRequestCount });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// REPAIR JOB HOOKS
// @backend: jobs table, bids table, job_invitations table
// RPCs: rpc_accept_bid, rpc_counter_bid, rpc_reject_bid,
//       rpc_mark_complete, rpc_confirm_complete, rpc_request_revision,
//       rpc_create_job, append_invited_contractors
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all jobs for current agent
 */
// STATUS: wired (with mock fallback)
export const useAgentJobs = () => {
  return useQuery({
    queryKey: queryKeys.agentJobs,
    queryFn: async (): Promise<Job[]> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('agent_id', userId)
          .order('updated_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((j: any) => ({ ...j, bids: [] })) as Job[];
      } catch (err) {
        console.warn('[useAgentJobs] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return MOCK_REPAIR_JOBS;
      }
    },
  });
};

/**
 * Fetch all repair jobs for current agent (legacy alias)
 */
export const useJobs = useAgentJobs;

/**
 * Fetch a single repair job by ID
 */
// STATUS: wired (with mock fallback)
export const useJob = (jobId: string) => {
  return useQuery({
    queryKey: queryKeys.repairJob(jobId),
    queryFn: async (): Promise<Job> => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .single();
        if (error) throw error;
        return { ...data, bids: [] } as Job;
      } catch (err) {
        console.warn('[useJob] Supabase failed, using mock fallback', err);
        return MOCK_REPAIR_JOBS.find((j) => j.id === jobId) ?? MOCK_REPAIR_JOBS[0];
      }
    },
    enabled: !!jobId,
  });
};

/**
 * Fetch all bids for a job, with contractor profile data
 */
// STATUS: wired (with mock fallback)
export const useJobBids = (jobId: string) => {
  return useQuery({
    queryKey: queryKeys.jobBids(jobId),
    queryFn: async (): Promise<BidWithProfile[]> => {
      try {
        const { data, error } = await supabase
          .from('bids')
          .select('*, contractor:profiles!contractor_id(*)')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).map((row: any) => {
          const profile = row.contractor;
          return {
            ...row,
            contractor: undefined,
            name: profile?.name ?? '',
            company: profile?.company ?? '',
            trade: profile?.trade ?? null,
            is_licensed: !!profile?.licensed,
            avatar_color: profile?.avatar_color ?? '#999',
            rating: profile?.rating ?? 0,
            price: `$${(row.amount / 100).toLocaleString()}`,
          } as BidWithProfile;
        });
      } catch (err) {
        console.warn('[useJobBids] Supabase failed, using mock fallback', err);
        const mockJob = MOCK_REPAIR_JOBS.find((j) => j.id === jobId);
        return (mockJob?.bids as BidWithProfile[]) ?? [];
      }
    },
    enabled: !!jobId,
  });
};

/**
 * Accept a bid — awards the job and rejects all other bids
 * RPC: rpc_accept_bid(p_bid_id UUID, p_job_id UUID) → VOID
 */
// STATUS: wired (with mock fallback)
export const useAcceptBid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bidId, jobId }: { bidId: string; jobId: string }) => {
      try {
        const { error } = await supabase.rpc('rpc_accept_bid', {
          p_bid_id: bidId,
          p_job_id: jobId,
        });
        if (error) throw error;
      } catch (err) {
        console.warn('[useAcceptBid] Supabase RPC failed, using mock fallback', err);
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.jobBids(jobId) });
    },
  });
};

/**
 * Counter a bid — sets counter_amount and status to 'countered'
 * RPC: rpc_counter_bid(p_bid_id UUID, p_job_id UUID, p_counter_amount INTEGER) → VOID
 */
// STATUS: wired (with mock fallback)
export const useCounterBid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bidId,
      jobId,
      counterAmount,
    }: {
      bidId: string;
      jobId: string;
      counterAmount: number; // cents
    }) => {
      try {
        const { error } = await supabase.rpc('rpc_counter_bid', {
          p_bid_id: bidId,
          p_job_id: jobId,
          p_counter_amount: counterAmount,
        });
        if (error) throw error;
      } catch (err) {
        console.warn('[useCounterBid] Supabase RPC failed, using mock fallback', err);
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.jobBids(jobId) });
    },
  });
};

/**
 * Reject a bid
 * RPC: rpc_reject_bid(p_bid_id UUID, p_job_id UUID) → VOID
 */
// STATUS: wired (with mock fallback)
export const useRejectBid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ bidId, jobId }: { bidId: string; jobId: string }) => {
      try {
        const { error } = await supabase.rpc('rpc_reject_bid', {
          p_bid_id: bidId,
          p_job_id: jobId,
        });
        if (error) throw error;
      } catch (err) {
        console.warn('[useRejectBid] Supabase RPC failed, using mock fallback', err);
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.jobBids(jobId) });
    },
  });
};

/**
 * Mark job as complete (contractor submits proof)
 * @backend rpc_mark_job_complete(p_job_id, p_proof_photo_urls, p_completion_notes)
 * Validates: caller is awarded contractor, job status is 'in_progress'
 * Transitions: in_progress → pending_completion
 * Stores: proof_photo_urls (text[]), completion_notes (text), contractor_completed_at
 * Notifies: agent via 'contractor_marked_complete' notification
 */
// STATUS: wired (with mock fallback)
export const useMarkJobComplete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      proofPhotoUrls,
      completionNotes,
    }: {
      jobId: string;
      proofPhotoUrls?: string[];
      completionNotes?: string;
    }) => {
      try {
        const { data, error } = await supabase.rpc('rpc_mark_job_complete', {
          p_job_id: jobId,
          p_proof_photo_urls: proofPhotoUrls ?? [],
          p_completion_notes: completionNotes ?? null,
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.message ?? 'Failed to mark job complete');
      } catch (err) {
        console.warn('[useMarkJobComplete] Supabase RPC failed, using mock fallback', err);
        // @demo mock fallback — simulate success so demo app never breaks
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(jobId) });
      qc.invalidateQueries({ queryKey: ['contractorJob', jobId] });
      qc.invalidateQueries({ queryKey: ['contractorActiveJobs'] });
      qc.invalidateQueries({ queryKey: queryKeys.agentJobs });
    },
  });
};

/**
 * Confirm job completion (agent approves)
 * @backend rpc_confirm_job_complete(p_job_id)
 * Validates: caller is the job agent, job status is 'pending_completion'
 * Transitions: pending_completion → completed
 * Stores: agent_confirmed_at
 * Notifies: contractor via 'agent_confirmed_complete' notification
 * Sets: vouch_prompt_sent = false (picked up by send-vouch-prompts cron)
 */
// STATUS: wired (with mock fallback)
export const useConfirmJobComplete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      try {
        const { data, error } = await supabase.rpc('rpc_confirm_job_complete', {
          p_job_id: jobId,
        });
        if (error) throw error;
        if (!data?.success) throw new Error(data?.message ?? 'Failed to confirm job complete');
      } catch (err) {
        console.warn('[useConfirmJobComplete] Supabase RPC failed, using mock fallback', err);
        // @demo mock fallback — simulate success so demo app never breaks
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.agentJobs });
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(jobId) });
      qc.invalidateQueries({ queryKey: ['contractorJob', jobId] });
      qc.invalidateQueries({ queryKey: ['contractorActiveJobs'] });
    },
  });
};

/**
 * Request revision (agent sends job back to in_progress)
 * RPC: rpc_request_revision(p_job_id UUID, p_revision_notes TEXT) → VOID
 */
// STATUS: wired (with mock fallback)
export const useRequestJobRevision = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      revisionNotes,
    }: {
      jobId: string;
      revisionNotes: string;
    }) => {
      try {
        const { error } = await supabase.rpc('rpc_request_revision', {
          p_job_id: jobId,
          p_revision_notes: revisionNotes,
        });
        if (error) throw error;
      } catch (err) {
        console.warn('[useRequestJobRevision] Supabase RPC failed, using mock fallback', err);
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(jobId) });
    },
  });
};

// ─────────────────────────────────────────────
// CreateJobInput — matches rpc_create_job signature exactly
// ─────────────────────────────────────────────

interface CreateJobInputBase {
  p_job_type: JobType;
  p_title: string;
  p_address: string;
  p_due_date: string;                          // DATE as ISO string (YYYY-MM-DD)
  p_description?: string;
  p_is_urgent?: boolean;
  p_bid_deadline_hours?: number;               // default 48
}

interface CreateRepairJobInput extends CreateJobInputBase {
  p_job_type: 'repair';
  p_trades: TradeEnum[];
  p_budget_min?: number;                       // cents
  p_budget_max?: number;                       // cents
  p_budget_range?: string;
  p_category?: string;
}

interface CreatePhotographyJobInput extends CreateJobInputBase {
  p_job_type: 'photography';
  p_service_packages: string[];
  p_turnaround_preference?: string;
}

interface CreateStagingJobInput extends CreateJobInputBase {
  p_job_type: 'staging';
  p_staging_scope: string[];
  p_sqft?: number;
  p_occupied_or_vacant?: string;
  p_rooms_count?: number;
}

type CreateJobInput = CreateRepairJobInput | CreatePhotographyJobInput | CreateStagingJobInput;

/**
 * Create a new job (repair, photography, or staging)
 * Calls: supabase.rpc('rpc_create_job', params)
 * Returns: UUID of the created job
 *
 * @backend RPC: rpc_create_job — see sql/schema.sql line 963
 */
// STATUS: wired (with mock fallback)
export const useCreateJob = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobInput): Promise<string> => {
      try {
        const { data, error } = await supabase.rpc('rpc_create_job', input);
        if (error) throw error;
        return data as string;
      } catch (err) {
        console.warn('[useCreateJob] Supabase RPC failed, using mock fallback', err);
        return `mock-job-${Date.now()}`;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJobs });
      qc.invalidateQueries({ queryKey: queryKeys.agentJobs });
    },
  });
};

/**
 * Update a job
 */
// STATUS: wired (with mock fallback)
export const useUpdateJob = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: Partial<Job> }) => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .update(updates)
          .eq('id', jobId)
          .select()
          .single();
        if (error) throw error;
        return { ...data, bids: [] } as Job;
      } catch (err) {
        console.warn('[useUpdateJob] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        // Merge updates into cached job for offline resilience
        const cached = qc.getQueryData<Job>(queryKeys.repairJob(jobId));
        return { ...cached, id: jobId, ...updates, bids: cached?.bids ?? [] } as Job;
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(variables.jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.agentJobs });
    },
  });
};

/**
 * Invite contractors to bid on a job
 * RPC: append_invited_contractors(p_job_id UUID, p_contractor_ids UUID[]) → VOID
 */
// STATUS: wired (with mock fallback)
export const useInviteContractors = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      contractorIds,
      note,
    }: {
      jobId: string;
      contractorIds: string[];
      note?: string;
    }) => {
      try {
        const { error: rpcError } = await supabase.rpc('append_invited_contractors', {
          p_job_id: jobId,
          p_contractor_ids: contractorIds,
        });
        if (rpcError) throw rpcError;

        // Create job_invitations records for tracking
        const invitations = contractorIds.map((cId) => ({
          job_id: jobId,
          contractor_id: cId,
          invited_by: '', // filled by RLS default or trigger
          note: note ?? null,
        }));
        await supabase.from('job_invitations').upsert(invitations, { onConflict: 'job_id,contractor_id' });
      } catch (err) {
        console.warn('[useInviteContractors] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(variables.jobId) });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// VOUCH FEED HOOKS
// @backend: vouches table, vouch_likes table, update_vouch_like_count RPC
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch vouch feed with optional category filter
 */
// STATUS: wired (with mock fallback)
export const useVouchFeed = (filter: string = 'All') => {
  return useQuery({
    queryKey: queryKeys.vouchFeed(filter),
    queryFn: async (): Promise<Vouch[]> => {
      try {
        let query = supabase
          .from('vouches')
          .select('*, author:profiles!author_id(*), recipient:profiles!recipient_id(*)')
          .order('created_at', { ascending: false })
          .limit(20);

        if (filter !== 'All') {
          query = query.eq('tag', filter);
        }

        const { data, error } = await query;
        if (error) throw error;
        // Map join aliases to flat Vouch fields
        return (data ?? []).map((row: any) => ({
          ...row,
          author_name: row.author?.name ?? row.author_name ?? '',
          recipient_name: row.recipient?.name ?? row.recipient_name ?? '',
          recipient_company: row.recipient?.company ?? row.recipient_company ?? null,
          recipient_role: row.recipient?.display_role ?? row.recipient_role ?? null,
          avatar_color: row.author?.avatar_color ?? row.avatar_color ?? '#7BA3C9',
          author: undefined,
          recipient: undefined,
        })) as Vouch[];
      } catch (err) {
        console.warn('[useVouchFeed] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
  });
};

/**
 * Like/unlike a vouch
 * INSERT/DELETE on vouch_likes + rpc('update_vouch_like_count')
 */
// STATUS: wired (with mock fallback)
export const useLikeVouch = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ vouchId, liked }: { vouchId: string; liked: boolean }) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        if (liked) {
          await supabase.from('vouch_likes').insert({ vouch_id: vouchId, user_id: userId });
        } else {
          await supabase.from('vouch_likes').delete()
            .eq('vouch_id', vouchId)
            .eq('user_id', userId);
        }
        await supabase.rpc('update_vouch_like_count', { p_vouch_id: vouchId });
      } catch (err) {
        console.warn('[useLikeVouch] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        await new Promise((r) => setTimeout(r, 200));
      }
      return { vouchId, liked };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouches'] });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// CHAT / INBOX HOOKS
// @backend: threads table, thread_members table, messages table, rpc_create_thread
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all chat threads for current user
 */
// STATUS: wired (with mock fallback)
export const useChatThreads = () => {
  return useQuery({
    queryKey: queryKeys.chatThreads,
    queryFn: async (): Promise<ChatThreadView[]> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        // Get threads + current user's last_read_at for each
        const { data: memberRows, error } = await supabase
          .from('thread_members')
          .select('last_read_at, thread:threads(*)')
          .eq('user_id', userId);
        if (error) throw error;
        const rows = (memberRows ?? []).filter((d: any) => d.thread);
        if (rows.length === 0) return [];

        // Fetch all members + avatar colors for these threads
        const threadIds = rows.map((d: any) => d.thread.id);
        const { data: allMembers } = await supabase
          .from('thread_members')
          .select('thread_id, profile:profiles!user_id(avatar_color)')
          .in('thread_id', threadIds);

        // Build avatar_colors map per thread
        const colorMap: Record<string, string[]> = {};
        for (const m of allMembers ?? []) {
          const tid = m.thread_id;
          const color = (m as any).profile?.avatar_color ?? '#7BA3C9';
          if (!colorMap[tid]) colorMap[tid] = [];
          colorMap[tid].push(color);
        }

        return (rows.map((d: any) => {
          const t = d.thread;
          const lastRead = d.last_read_at ? new Date(d.last_read_at).getTime() : 0;
          const lastMsg = t.last_message_at ? new Date(t.last_message_at).getTime() : 0;
          return {
            ...t,
            participants: [],
            is_unread: lastMsg > lastRead,
            avatar_colors: colorMap[t.id] ?? [],
          };
        }) as ChatThreadView[]);
      } catch (err) {
        console.warn('[useChatThreads] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
  });
};

/**
 * Mark a thread as read for the current user
 * Updates thread_members.last_read_at = now()
 */
// STATUS: wired (with mock fallback)
export const useMarkThreadRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (threadId: string) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { error } = await supabase
          .from('thread_members')
          .update({ last_read_at: new Date().toISOString() })
          .eq('thread_id', threadId)
          .eq('user_id', userId);
        if (error) throw error;
      } catch (err) {
        console.warn('[useMarkThreadRead] Supabase failed', err);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chatThreads });
    },
  });
};

/**
 * Fetch connected users as potential message recipients
 * Used by NewMessage screen contact picker
 */
// STATUS: wired (with mock fallback)
export const useChatRecipients = () => {
  return useQuery({
    queryKey: queryKeys.chatRecipients,
    queryFn: async (): Promise<Recipient[]> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        // Query both directions of accepted connections
        const { data, error } = await supabase
          .from('connections')
          .select('requester_id, responder_id, requester:profiles!requester_id(id, name, company, display_role, avatar_color), responder:profiles!responder_id(id, name, company, display_role, avatar_color)')
          .or(`requester_id.eq.${userId},responder_id.eq.${userId}`)
          .eq('status', 'accepted');
        if (error) throw error;
        // Map to Recipient — pick the other user from each connection
        return (data ?? []).map((row: any) => {
          const other = row.requester_id === userId ? row.responder : row.requester;
          return {
            id: other?.id ?? '',
            name: other?.name ?? '',
            company: other?.company ?? '',
            role: other?.display_role ?? '',
            avatar_color: other?.avatar_color ?? '#7BA3C9',
          };
        }).filter((r: Recipient) => r.id) as Recipient[];
      } catch (err) {
        console.warn('[useChatRecipients] Supabase failed, using mock fallback', err);
        return [];
      }
    },
  });
};

/**
 * Create a new chat thread with first message (idempotent — reuses existing 1:1 thread)
 * @backend rpc_create_thread({ p_recipient_id, p_first_message })
 * Returns { success, thread_id, existing }
 */
// STATUS: wired (with mock fallback)
export const useCreateThread = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ recipientId, firstMessage }: { recipientId: string; firstMessage: string }) => {
      try {
        const { data, error } = await supabase.rpc('rpc_create_thread', {
          p_recipient_id: recipientId,
          p_first_message: firstMessage,
        });
        if (error) throw error;
        return data as { success: boolean; thread_id: string; existing: boolean };
      } catch (err) {
        console.warn('[useCreateThread] failed:', err);
        throw err;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chatThreads });
      qc.invalidateQueries({ queryKey: queryKeys.inboxThreads });
    },
  });
};

/**
 * Fetch messages for a thread (with sender profile join for name + avatar)
 */
// STATUS: wired (with mock fallback)
export const useMessages = (threadId: string) => {
  return useQuery({
    queryKey: queryKeys.messages(threadId),
    queryFn: async (): Promise<Message[]> => {
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*, sender:profiles!sender_id(name, avatar_color)')
          .eq('thread_id', threadId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return (data ?? []).map((row: any) => ({
          ...row,
          sender_name: row.sender?.name ?? row.sender_name ?? 'Unknown',
          sender: undefined, // remove join artifact from Message shape
        })) as Message[];
      } catch (err) {
        console.warn('[useMessages] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
    enabled: !!threadId,
  });
};

/**
 * Send a message in an existing thread
 * @backend rpc_send_message({ p_thread_id, p_content })
 * Returns { success, message_id, thread_id }
 */
// STATUS: wired (with mock fallback)
export const useSendMessage = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      content,
    }: {
      threadId: string;
      content: string;
    }) => {
      try {
        const { data, error } = await supabase.rpc('rpc_send_message', {
          p_thread_id: threadId,
          p_content: content,
        });
        if (error) throw error;
        return data as { success: boolean; message_id: string; thread_id: string };
      } catch (err) {
        console.warn('[useSendMessage] failed:', err);
        throw err;
      }
    },
    onSuccess: (_, { threadId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.messages(threadId) });
      qc.invalidateQueries({ queryKey: queryKeys.threadMessages(threadId) });
      qc.invalidateQueries({ queryKey: queryKeys.chatThreads });
      qc.invalidateQueries({ queryKey: queryKeys.inboxThreads });
    },
  });
};

/**
 * Fetch inbox threads for current user (ordered by last_message_at DESC)
 * @backend rpc_get_inbox_threads() — no params, uses auth.uid()
 * Returns InboxThread[] with other_member profile + unread_count
 */
// STATUS: wired (with mock fallback)
export const useInboxThreads = () => {
  return useQuery({
    queryKey: queryKeys.inboxThreads,
    queryFn: async (): Promise<InboxThread[]> => {
      if (FEATURE_FLAGS.USE_MOCK_DATA) return [];
      try {
        const { data, error } = await supabase.rpc('rpc_get_inbox_threads');
        if (error) throw error;
        const result = data as { success: boolean; threads: InboxThread[] } | null;
        return (result?.threads ?? []) as InboxThread[];
      } catch (err) {
        console.warn('[useInboxThreads] Supabase failed, using mock fallback', err);
        return [];
      }
    },
  });
};

/**
 * Fetch messages for a specific thread
 * @backend rpc_get_thread_messages({ p_thread_id }) — validates membership, marks last_read_at
 * Returns ThreadMessage[] ordered ASC by created_at
 */
// STATUS: wired (with mock fallback)
export const useThreadMessages = (threadId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.threadMessages(threadId ?? ''),
    queryFn: async (): Promise<ThreadMessage[]> => {
      if (!threadId) return [];
      try {
        const { data, error } = await supabase.rpc('rpc_get_thread_messages', {
          p_thread_id: threadId,
        });
        if (error) throw error;
        const result = data as { success: boolean; messages: ThreadMessage[] } | null;
        // @demo mock fallback — empty array when RPC returns nothing
        return (result?.messages ?? []) as ThreadMessage[];
      } catch (err) {
        console.warn('[useThreadMessages] Supabase failed, using mock fallback', err);
        return [];
      }
    },
    enabled: !!threadId,
  });
};

/**
 * Archive a thread so it no longer appears in the inbox.
 * @backend rpc_archive_thread({ p_thread_id })
 * rpc_create_thread now skips archived threads (S115e fix) so messaging
 * the same person again creates a fresh thread with no old history.
 */
// STATUS: wired
export const useArchiveThread = () => {
  const qc = useQueryClient();
  return useMutation({
    onMutate: async (threadId: string) => {
      // Cancel in-flight refetch so it doesn't overwrite optimistic update
      await qc.cancelQueries({ queryKey: queryKeys.inboxThreads });

      // Snapshot current cache for rollback on error
      const previousThreads = qc.getQueryData(queryKeys.inboxThreads);

      // Optimistically remove thread from cache immediately
      qc.setQueryData(queryKeys.inboxThreads, (old: InboxThread[] | undefined) =>
        (old ?? []).filter((t) => t.thread_id !== threadId),
      );

      return { previousThreads };
    },
    mutationFn: async (threadId: string) => {
      const { data, error } = await supabase.rpc('rpc_archive_thread', {
        p_thread_id: threadId,
      });
      if (error) throw error;
      return data;
    },
    onError: (error, _threadId, context) => {
      // Roll back optimistic update on failure
      if (context?.previousThreads) {
        qc.setQueryData(queryKeys.inboxThreads, context.previousThreads);
      }
      console.error('[useArchiveThread] failed:', error);
    },
    onSettled: () => {
      // Always refetch after mutation to sync with server
      qc.invalidateQueries({ queryKey: queryKeys.inboxThreads });
      qc.invalidateQueries({ queryKey: queryKeys.chatThreads });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION HOOKS
// @backend: notifications table
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch notifications for current user
 */
// STATUS: wired (with mock fallback)
export const useNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async (): Promise<Notification[]> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return (data ?? []) as Notification[];
      } catch (err) {
        console.warn('[useNotifications] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
  });
};

/**
 * Mark notifications as read
 */
// STATUS: wired (with mock fallback)
export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      try {
        const { error } = await supabase
          .from('notifications')
          .update({ is_read: true })
          .in('id', notificationIds);
        if (error) throw error;
      } catch (err) {
        console.warn('[useMarkNotificationsRead] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        await new Promise((r) => setTimeout(r, 200));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
      qc.invalidateQueries({ queryKey: queryKeys.unreadCount });
    },
  });
};

/**
 * Get unread notification count (for badge)
 */
// STATUS: wired (with mock fallback)
export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async (): Promise<number> => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        const { count, error } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_read', false);
        if (error) throw error;
        return count ?? 0;
      } catch (err) {
        console.warn('[useUnreadNotificationCount] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return 3;
      }
    },
    refetchInterval: 30 * 1000,
  });
};

// ═══════════════════════════════════════════════════════════════
// FIND / SEARCH HOOKS
// @backend: profiles table (filtered by role, visibility, search text)
// ═══════════════════════════════════════════════════════════════

/**
 * Search for pros (FindTab) — with dynamic filters
 */
// STATUS: wired (with mock fallback)
export const useSearchPros = (query: string, role: string) => {
  return useQuery({
    queryKey: queryKeys.searchPros(query, role),
    queryFn: async (): Promise<Profile[]> => {
      try {
        let q = supabase
          .from('profiles')
          .select('*')
          .neq('role', 'agent')
          .eq('is_visible', true);

        if (role !== 'All') q = q.eq('role', role);
        if (query) q = q.or(`name.ilike.%${query}%,company.ilike.%${query}%`);

        const { data, error } = await q.limit(30);
        if (error) throw error;
        return (data ?? []) as Profile[];
      } catch (err) {
        console.warn('[useSearchPros] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
  });
};

/**
 * Search for pros (FindTab) — legacy alias with sort param
 */
// STATUS: wired (with mock fallback)
export const useFindPros = (query: string, role: string, sort: string) => {
  return useQuery({
    queryKey: queryKeys.findPros(query, role, sort),
    queryFn: async (): Promise<Profile[]> => {
      try {
        let q = supabase
          .from('profiles')
          .select('*')
          .neq('role', 'agent')
          .eq('is_visible', true);

        if (role !== 'All') q = q.eq('display_role', role);
        if (query) q = q.or(`name.ilike.%${query}%,company.ilike.%${query}%`);

        switch (sort) {
          case 'Most Vouched': q = q.order('vouch_count', { ascending: false }); break;
          case 'Highest Rated': q = q.order('rating', { ascending: false }); break;
        }

        const { data, error } = await q.limit(30);
        if (error) throw error;
        return (data ?? []) as Profile[];
      } catch (err) {
        console.warn('[useFindPros] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
  });
};

/**
 * Fetch recommended pros (highest-rated, top 5)
 */
// STATUS: wired (with mock fallback)
export const useRecommendedPros = () => {
  return useQuery({
    queryKey: queryKeys.recommendedPros,
    queryFn: async (): Promise<Profile[]> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'agent')
          .eq('is_visible', true)
          .order('rating', { ascending: false })
          .limit(5);
        if (error) throw error;
        return (data ?? []) as Profile[];
      } catch (err) {
        console.warn('[useRecommendedPros] Supabase failed, using mock fallback', err);
        return [];
      }
    },
  });
};

/**
 * Fetch trending pros (most-vouched, top 5)
 * TODO: Filter to vouches received in last 7 days once an RPC or view exists
 */
// STATUS: wired (with mock fallback)
export const useTrendingPros = () => {
  return useQuery({
    queryKey: queryKeys.trendingPros,
    queryFn: async (): Promise<Profile[]> => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('role', 'agent')
          .eq('is_visible', true)
          .order('vouch_count', { ascending: false })
          .limit(5);
        if (error) throw error;
        return (data ?? []) as Profile[];
      } catch (err) {
        console.warn('[useTrendingPros] Supabase failed, using mock fallback', err);
        return [];
      }
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// SQUAD HOOKS
// @backend: squad_members table (with profile join)
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch squad members for a squad
 */
// STATUS: wired (with mock fallback)
export const useSquadMembers = (squadId: string) => {
  return useQuery({
    queryKey: queryKeys.squadMembers(squadId),
    queryFn: async (): Promise<(SquadMember & { profile: Profile })[]> => {
      try {
        const { data, error } = await supabase
          .from('squad_members')
          .select('*, profile:profiles!profile_id(*)')
          .eq('squad_id', squadId);
        if (error) throw error;
        // Supabase typed client can't infer join alias — runtime shape is correct
        return (data ?? []) as (SquadMember & { profile: Profile })[];
      } catch (err) {
        console.warn('[useSquadMembers] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return [];
      }
    },
    enabled: !!squadId,
  });
};

/**
 * Assign a member to a squad
 */
// STATUS: wired (with mock fallback)
export const useAssignSquadMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      squadId,
      profileId,
      role,
    }: {
      squadId: string;
      profileId: string;
      role: UserRole;
    }) => {
      try {
        const { error } = await supabase
          .from('squad_members')
          .upsert({ squad_id: squadId, profile_id: profileId, role });
        if (error) throw error;
      } catch (err) {
        console.warn('[useAssignSquadMember] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { squadId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.squadMembers(squadId) });
    },
  });
};

/**
 * Remove a member from a squad
 */
// STATUS: wired (with mock fallback)
export const useRemoveSquadMember = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, squadId }: { memberId: string; squadId: string }) => {
      try {
        const { error } = await supabase
          .from('squad_members')
          .delete()
          .eq('id', memberId);
        if (error) throw error;
      } catch (err) {
        console.warn('[useRemoveSquadMember] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { squadId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.squadMembers(squadId) });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// CONTRACTOR JOB DETAILS
// @backend: jobs table, bids table (contractor-side views)
// RPCs: rpc_get_job_details, rpc_submit_bid, rpc_respond_to_counter
// ═══════════════════════════════════════════════════════════════

export const LIVE_CONTRACTOR_HOOKS = true;

/**
 * Fetch contractor's view of a single job.
 * @backend rpc_get_job_details(p_job_id) — name confirmed March 12 2026
 * Note: was previously called rpc_get_contractor_job_details — name mismatch fixed S50
 * @demo replaced mock return null with live Supabase RPC call
 */
// STATUS: wired (with mock fallback)
export const useContractorJobDetails = (jobId: string) => {
  return useQuery<ContractorJobDetail>({
    queryKey: ['contractorJob', jobId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .rpc('rpc_get_job_details', { p_job_id: jobId });
        if (error) throw error;
        return data as ContractorJobDetail;
      } catch (err) {
        console.warn('[useContractorJobDetails] Supabase RPC failed, using mock fallback', err);
        // @demo mock fallback — return null (screen handles loading/null states)
        return null as unknown as ContractorJobDetail;
      }
    },
    enabled: !!jobId,
  });
};

/**
 * Submit a bid on a job.
 * @backend rpc_submit_bid — submits contractor bid, invalidates job + contractor-jobs queries
 * @demo replaced console.log + setTimeout with live Supabase RPC call
 */
// STATUS: wired (with mock fallback)
export const useSubmitBid = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { jobId: string; amount: number; timeline: string; notes: string }) => {
      try {
        const { error } = await supabase
          .rpc('rpc_submit_bid', {
            p_job_id: data.jobId,
            p_amount: data.amount,
            p_timeline: data.timeline ?? null,
            p_quote: data.notes ?? null,
            p_message: '',
          });
        if (error) throw error;
      } catch (err) {
        console.warn('[useSubmitBid] Supabase RPC failed, using mock fallback', err);
        // @demo mock fallback — simulate success
        await new Promise((r) => setTimeout(r, 500));
      }
    },
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: ['contractorJob', jobId] });
      qc.invalidateQueries({ queryKey: ['contractor-jobs'] });
    },
  });
};

/**
 * Respond to agent's counter-offer.
 * @backend supabase.rpc('rpc_respond_to_counter', {
 *   p_bid_id, p_action: 'accept' | 'counter' | 'decline', p_counter_amount?
 * })
 * → returns { success, action, bid_id }
 */
// STATUS: wired (with mock fallback)
export const useRespondToCounter = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { bidId: string; action: 'accept' | 'counter' | 'decline'; newAmount?: number }) => {
      try {
        const { data: result, error } = await supabase
          .rpc('rpc_respond_to_counter', {
            p_bid_id: data.bidId,
            p_action: data.action,
            p_counter_amount: data.newAmount ?? null,
          });
        if (error) throw error;
        return result;
      } catch (err) {
        console.warn('[useRespondToCounter] Supabase RPC failed, using mock fallback', err);
        // @demo mock fallback — simulate success
        await new Promise((r) => setTimeout(r, 500));
        return { success: true, action: data.action, bid_id: data.bidId };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractorJob'] });
      qc.invalidateQueries({ queryKey: queryKeys.matchingJobs(20) });
    },
  });
};

/**
 * Accept a job invitation.
 * @backend supabase.rpc('rpc_accept_invitation', { p_invitation_id })
 * → returns { success, invitation_id, job_id }
 */
// STATUS: wired (with mock fallback)
export const useAcceptInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { invitationId: string }) => {
      try {
        const { data, error } = await supabase
          .rpc('rpc_accept_invitation', { p_invitation_id: params.invitationId });
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('[useAcceptInvitation] Supabase RPC failed, using mock fallback', err);
        // @demo mock fallback
        await new Promise((r) => setTimeout(r, 500));
        return { success: true, invitation_id: params.invitationId };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractorJob'] });
      qc.invalidateQueries({ queryKey: queryKeys.matchingJobs(20) });
    },
  });
};

/**
 * Decline a job invitation.
 * @backend supabase.rpc('rpc_decline_invitation', { p_invitation_id })
 * → returns { success, invitation_id, job_id }
 */
// STATUS: wired (with mock fallback)
export const useDeclineInvitation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { invitationId: string }) => {
      try {
        const { data, error } = await supabase
          .rpc('rpc_decline_invitation', { p_invitation_id: params.invitationId });
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('[useDeclineInvitation] Supabase RPC failed, using mock fallback', err);
        // @demo mock fallback
        await new Promise((r) => setTimeout(r, 500));
        return { success: true, invitation_id: params.invitationId };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contractorJob'] });
    },
  });
};

/**
 * Start work on an awarded job (contractor).
 * @backend supabase.rpc('rpc_start_job', { p_job_id })
 * → validates awarded contractor, transitions awarded → in_progress, notifies agent
 */
// STATUS: mock
// @demo: mock 800ms delay, optimistic awarded → in_progress
// @backend: rpc_start_job(p_job_id)
export const useStartJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { jobId: string }) => {
      try {
        const { data, error } = await supabase
          .rpc('rpc_start_job', { p_job_id: params.jobId });
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('[useStartJob] Supabase RPC failed, using mock fallback', err);
        // @demo mock fallback — 800ms delay
        await new Promise((r) => setTimeout(r, 800));
        return { success: true, job_id: params.jobId, status: 'in_progress' };
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['contractorJob', variables.jobId] });
      qc.invalidateQueries({ queryKey: ['contractorActiveJobs'] });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// CONTRACTOR DASHBOARD QUERIES
// @backend: rpc_get_matching_jobs, rpc_get_contractor_earnings, rpc_get_market_pulse
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch jobs matching the contractor's trades.
 * @backend supabase.rpc('rpc_get_matching_jobs', { p_limit })
 * → returns { success, jobs: Array<{ id, title, description, address, job_type,
 *   status, trades, budget_min, budget_max, due_date, is_urgent, bid_deadline,
 *   created_at, agent: { id, name, company, rating, avatar_color } }> }
 */
// STATUS: wired (with mock fallback)
export const useMatchingJobs = (limit = 20) => {
  return useQuery({
    queryKey: queryKeys.matchingJobs(limit),
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .rpc('rpc_get_matching_jobs', { p_limit: limit });
        if (error) throw error;
        return data?.jobs ?? [];
      } catch (err) {
        console.warn('[useMatchingJobs] Supabase RPC failed, using mock fallback', err);
        return [];
      }
    },
  });
};

/**
 * Fetch contractor earnings summary.
 * @backend supabase.rpc('rpc_get_contractor_earnings')
 * → returns { success, total_earnings, this_month_earnings, jobs_completed, avg_job_value }
 * All monetary values in cents (INTEGER).
 */
// STATUS: wired (with mock fallback)
export const useContractorEarnings = () => {
  return useQuery({
    queryKey: queryKeys.contractorEarnings,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .rpc('rpc_get_contractor_earnings');
        if (error) throw error;
        return data as {
          success: boolean;
          total_earnings: number;
          this_month_earnings: number;
          jobs_completed: number;
          avg_job_value: number;
        };
      } catch (err) {
        console.warn('[useContractorEarnings] Supabase RPC failed, using mock fallback', err);
        return {
          success: true,
          total_earnings: 0,
          this_month_earnings: 0,
          jobs_completed: 0,
          avg_job_value: 0,
        };
      }
    },
  });
};

/**
 * Fetch market activity stats for the contractor's trade.
 * @backend supabase.rpc('rpc_get_market_pulse')
 * → returns { success, open_jobs, avg_budget, active_contractors, avg_bid }
 * All monetary values in cents (INTEGER).
 */
// STATUS: wired (with mock fallback)
export const useMarketPulse = () => {
  return useQuery({
    queryKey: queryKeys.marketPulse,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .rpc('rpc_get_market_pulse');
        if (error) throw error;
        return data as {
          success: boolean;
          open_jobs: number;
          avg_budget: number;
          active_contractors: number;
          avg_bid: number;
        };
      } catch (err) {
        console.warn('[useMarketPulse] Supabase RPC failed, using mock fallback', err);
        return {
          success: true,
          open_jobs: 0,
          avg_budget: 0,
          active_contractors: 0,
          avg_bid: 0,
        };
      }
    },
  });
};

// ─────────────────────────────────────────────
// ONBOARDING
// ─────────────────────────────────────────────

/**
 * Complete onboarding — calls rpc_complete_onboarding to persist
 * the user's profile, role, and onboarding data.
 * formData.role is already a backend enum value (single-value principle).
 *
 * @backend supabase.rpc('rpc_complete_onboarding', {
 *   p_display_role, p_full_name, p_company_name,
 *   p_primary_trade, p_secondary_trades, p_location
 * })
 */
// STATUS: wired (with mock fallback)
export const useCompleteOnboarding = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      role: string;
      fullName: string;
      company?: string;
      location?: string;
      primaryTrade?: string;
      secondaryTrades?: string[];
    }) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');

        const { error } = await supabase.rpc('rpc_complete_onboarding', {
          p_display_role: params.role,
          p_full_name: params.fullName,
          p_company_name: params.company ?? null,
          p_primary_trade: params.primaryTrade ?? null,
          p_secondary_trades: params.secondaryTrades ?? null,
          p_location: params.location ?? null,
        });

        if (error) throw error;
        return { success: true };
      } catch (err) {
        console.warn('[useCompleteOnboarding] Supabase RPC failed, using mock fallback', err);
        // Mock fallback — simulate success so demo app keeps working
        await new Promise((r) => setTimeout(r, 800));
        return { success: true };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.myProfile });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// ACCOUNT
// @backend: rpc_delete_account
// ═══════════════════════════════════════════════════════════════

/**
 * Soft-delete user account. Sets deactivated_at, cancels open jobs,
 * withdraws pending bids, removes push tokens.
 * @backend supabase.rpc('rpc_delete_account', { p_confirm_text: 'DELETE' })
 * → returns { success, deactivated_at, cancelled_jobs, withdrawn_bids }
 * Guards: blocks if user has active jobs (awarded/in_progress/pending_completion).
 * Error message includes active job count when blocked.
 */
// STATUS: wired (with mock fallback)
export const useDeleteAccount = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      try {
        const { data, error } = await supabase
          .rpc('rpc_delete_account', { p_confirm_text: 'DELETE' });
        if (error) throw error;
        return data;
      } catch (err) {
        // Re-throw so the screen can show the error message
        // (e.g. "Cannot delete account with 2 active job(s)")
        throw err;
      }
    },
    onSuccess: async () => {
      qc.clear();
      await supabase.auth.signOut();
    },
  });
};

// ─────────────────────────────────────────────────────────────
// HOOK #50 — useSubmitLicenseVerification
// Called by: VerificationScreen.tsx → handleLicenseSave
// @backend: rpc_submit_license_verification
//   params: { p_license_number: string, p_license_state: string }
//   returns: { success: boolean, message: string }
// Invalidates: ['profile'] query on success
// ─────────────────────────────────────────────────────────────
// STATUS: wired (with mock fallback)
export const useSubmitLicenseVerification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { licenseNumber: string; licenseState: string }) => {
      try {
        const { data: result, error } = await supabase.rpc(
          'rpc_submit_license_verification',
          {
            p_license_number: data.licenseNumber,
            p_license_state: data.licenseState,
          }
        );
        if (error) throw error;
        return result as { success: boolean; message: string };
      } catch (err) {
        console.warn('[useSubmitLicenseVerification] Supabase RPC failed, using mock fallback', err);
        // @demo mock fallback — simulate success
        await new Promise((r) => setTimeout(r, 500));
        return { success: true, message: 'License submitted for verification' };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

// ─────────────────────────────────────────────────────────────
// HOOK #51 — useUploadInsuranceDocument
// Called by: InsuranceUploadScreen.tsx → handleSubmit
// Flow: read file → base64 → invoke upload-insurance-document Edge Function
//       (Edge Function uploads to credentials bucket server-side, bypassing 42P17 RLS bug)
// @backend: Edge Function upload-insurance-document → credentials bucket + rpc_upload_insurance_document
//   params: { fileBase64, mimeType, expiryMonth, expiryYear, userId }
//   returns: { success: boolean, message: string }
// Invalidates: ['profile'] query on success
// ─────────────────────────────────────────────────────────────
// STATUS: wired (Edge Function bypass for 42P17 storage bug)
export const useUploadInsuranceDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      fileUri: string;
      fileName: string;
      mimeType: string;
      expiryMonth: number;
      expiryYear: number;
    }) => {
      // Step 1: Read file as base64 using expo-file-system/legacy
      // @backend expo-file-system reads local file → base64 for Edge Function
      const fileBase64 = await FileSystem.readAsStringAsync(data.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 2: Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Step 3: Invoke Edge Function (server-side upload bypasses 42P17 RLS bug)
      // @backend Edge Function upload-insurance-document
      //   params: { fileBase64, mimeType, expiryMonth, expiryYear, userId }
      const { data: result, error } = await supabase.functions.invoke(
        'upload-insurance-document',
        {
          body: {
            fileBase64,
            fileName: data.fileName,
            mimeType: data.mimeType,
            expiryMonth: data.expiryMonth,
            expiryYear: data.expiryYear,
            userId: user.id,
          },
        },
      );

      if (error) throw error;
      if (!result?.success) throw new Error(result?.message ?? 'Upload failed');

      return { success: true, message: result.message } as { success: boolean; message: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// SQUAD SHARE (hook #56 — Send to Client, S51)
// @backend: send-squad-email Edge Function (Resend — HTML email with squad cards)
// @backend: send-squad-sms Edge Function (PDF gen → Storage → Twilio SMS with link)
// @demo: LIVE_SQUAD_SHARE: false → 1500ms setTimeout returns { success: true }
// ═══════════════════════════════════════════════════════════════

// @demo hardcoded — replace with real Edge Function calls when LIVE_SQUAD_SHARE flipped to true
const mockSquadShareDelay = (): Promise<SquadShareResult> =>
  new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1500));

// STATUS: mock (Edge Functions not deployed yet)
export const useSquadShare = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
  }, []);

  // @backend: send-squad-email Edge Function. Params: squadMembers[], agentName, agentCompany, recipientEmail, personalMessage?
  // @demo: Replace with supabase.functions.invoke('send-squad-email', { body: params }) when LIVE_SQUAD_SHARE flipped to true
  const sendViaEmail = useCallback(async (params: SquadShareEmailParams): Promise<SquadShareResult> => {
    setIsLoading(true);
    setError(null);
    try {
      if (FEATURE_FLAGS.LIVE_SQUAD_SHARE) {
        const { data, error: fnError } = await supabase.functions.invoke('send-squad-email', {
          body: {
            squadMembers: params.squadMembers,
            agentName: params.agentName,
            agentCompany: params.agentCompany,
            recipientEmail: params.recipientEmail,
            personalMessage: params.personalMessage || null,
          },
        });
        if (fnError) throw fnError;
        return (data as SquadShareResult) ?? { success: true };
      }
      return await mockSquadShareDelay();
    } catch (err: any) {
      const msg = err?.message || 'Failed to send email. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  // @backend: send-squad-sms Edge Function. Params: squadMembers[], agentName, agentCompany, recipientPhone, personalMessage?
  // @demo: Replace with supabase.functions.invoke('send-squad-sms', { body: params }) when LIVE_SQUAD_SHARE flipped to true
  const sendViaSms = useCallback(async (params: SquadShareSmsParams): Promise<SquadShareResult> => {
    setIsLoading(true);
    setError(null);
    try {
      if (FEATURE_FLAGS.LIVE_SQUAD_SHARE) {
        const { data, error: fnError } = await supabase.functions.invoke('send-squad-sms', {
          body: {
            squadMembers: params.squadMembers,
            agentName: params.agentName,
            agentCompany: params.agentCompany,
            recipientPhone: params.recipientPhone,
            personalMessage: params.personalMessage || null,
          },
        });
        if (fnError) throw fnError;
        return (data as SquadShareResult) ?? { success: true };
      }
      return await mockSquadShareDelay();
    } catch (err: any) {
      const msg = err?.message || 'Failed to send text. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { sendViaEmail, sendViaSms, isLoading, error, reset };
};

// ═══════════════════════════════════════════════════════════════
// AGENT DEAL BOARD (S63)
// ═══════════════════════════════════════════════════════════════

// ─── Mock Data ────────────────────────────────────────────────
// @demo — replace with rpc_get_deal_board_for_agent calls per active job in production
// NOTE: will migrate to transaction_id in S64 when transactions table exists

const _now = new Date();
const _daysFromNow = (d: number) => new Date(_now.getTime() + d * 86400000).toISOString();
const _daysAgo = (d: number) => new Date(_now.getTime() - d * 86400000).toISOString();

const MOCK_AGENT_ACTIVE_DEALS: AgentActiveDeal[] = [
  {
    job_id: 'mock-job-001',
    transaction_id: 'mock-txn-001', // @demo hardcoded — replace with real transaction_id from rpc_create_transaction
    address: '2847 Maple Street, Denver, CO',
    closing_date: '2026-04-15',
    buyer_name: 'James & Sarah Thornton', // @demo hardcoded — replace with rpc_get_agent_deals response
    contract_price: 875000, // @demo hardcoded — replace with rpc_get_agent_deals response
    partners: [
      {
        partner_id: 'mock-partner-001',
        name: 'Sarah Chen',
        partner_role: 'Title/Escrow',
        partner_avatar_color: '#7BA3C9',
        milestones: [
          { id: 'ams-001', milestone_key: 'title_search', milestone_label: 'Title search', status: 'complete', sort_order: 0, completed_at: _daysAgo(10), updated_at: _daysAgo(10) },
          { id: 'ams-002', milestone_key: 'lien_search', milestone_label: 'Lien search', status: 'complete', sort_order: 1, completed_at: _daysAgo(8), updated_at: _daysAgo(8) },
          { id: 'ams-003', milestone_key: 'title_commitment', milestone_label: 'Title commitment', status: 'complete', sort_order: 2, completed_at: _daysAgo(5), updated_at: _daysAgo(5) },
          { id: 'ams-004', milestone_key: 'clear_to_close', milestone_label: 'Clear to close', status: 'pending', sort_order: 3, completed_at: null, updated_at: _daysAgo(20) },
          { id: 'ams-005', milestone_key: 'closing_docs', milestone_label: 'Closing docs sent', status: 'pending', sort_order: 4, completed_at: null, updated_at: _daysAgo(20) },
        ],
        alerts: [
          {
            id: 'mock-alert-001',
            alert_type: 'rate_lock_expiry',
            message: 'Rate lock expires in 3 days — confirm extension or float.',
            expires_at: _daysFromNow(3),
            dismissed_at: null,
            document_requested: null,
          },
        ],
      },
      {
        partner_id: 'mock-partner-002',
        name: 'James Rivera',
        partner_role: 'Mortgage Pro',
        partner_avatar_color: '#A3C9A8',
        milestones: [
          { id: 'ams-010', milestone_key: 'pre_approval', milestone_label: 'Pre-approval confirmed', status: 'complete', sort_order: 0, completed_at: _daysAgo(14), updated_at: _daysAgo(14) },
          { id: 'ams-011', milestone_key: 'app_submitted', milestone_label: 'Application submitted', status: 'complete', sort_order: 1, completed_at: _daysAgo(10), updated_at: _daysAgo(10) },
          { id: 'ams-012', milestone_key: 'appraisal_ordered', milestone_label: 'Appraisal ordered', status: 'in_progress', sort_order: 2, completed_at: null, updated_at: _daysAgo(6) },
          { id: 'ams-013', milestone_key: 'appraisal_complete', milestone_label: 'Appraisal complete', status: 'pending', sort_order: 3, completed_at: null, updated_at: _daysAgo(21) },
          { id: 'ams-014', milestone_key: 'underwriting', milestone_label: 'Underwriting submitted', status: 'pending', sort_order: 4, completed_at: null, updated_at: _daysAgo(21) },
          { id: 'ams-015', milestone_key: 'conditional_approval', milestone_label: 'Conditional approval', status: 'pending', sort_order: 5, completed_at: null, updated_at: _daysAgo(21) },
          { id: 'ams-016', milestone_key: 'clear_to_close', milestone_label: 'Clear to close', status: 'pending', sort_order: 6, completed_at: null, updated_at: _daysAgo(21) },
          { id: 'ams-017', milestone_key: 'loan_docs_sent', milestone_label: 'Loan docs sent', status: 'pending', sort_order: 7, completed_at: null, updated_at: _daysAgo(21) },
        ],
        alerts: [],
      },
    ],
  },
  {
    job_id: 'mock-job-002',
    transaction_id: 'mock-txn-002', // @demo hardcoded — replace with real transaction_id from rpc_create_transaction
    address: '1190 Corona Street, Denver, CO',
    closing_date: '2026-05-01',
    buyer_name: 'David & Michelle Park', // @demo hardcoded — replace with rpc_get_agent_deals response
    contract_price: 620000, // @demo hardcoded — replace with rpc_get_agent_deals response
    partners: [
      {
        partner_id: 'mock-partner-003',
        name: 'Priya Nair',
        partner_role: 'Title/Escrow',
        partner_avatar_color: '#C9A87B',
        milestones: [
          { id: 'ams-020', milestone_key: 'title_search', milestone_label: 'Title search', status: 'complete', sort_order: 0, completed_at: _daysAgo(5), updated_at: _daysAgo(5) },
          { id: 'ams-021', milestone_key: 'lien_search', milestone_label: 'Lien search', status: 'in_progress', sort_order: 1, completed_at: null, updated_at: _daysAgo(1) },
          { id: 'ams-022', milestone_key: 'title_commitment', milestone_label: 'Title commitment', status: 'pending', sort_order: 2, completed_at: null, updated_at: _daysAgo(10) },
          { id: 'ams-023', milestone_key: 'clear_to_close', milestone_label: 'Clear to close', status: 'pending', sort_order: 3, completed_at: null, updated_at: _daysAgo(10) },
          { id: 'ams-024', milestone_key: 'closing_docs', milestone_label: 'Closing docs sent', status: 'pending', sort_order: 4, completed_at: null, updated_at: _daysAgo(10) },
        ],
        alerts: [],
      },
    ],
  },
];

// ─── useAgentDeals ────────────────────────────────────────────
// STATUS: mock
// PURPOSE: Full pipeline of agent's active deals for AgentDealsScreen.
// Superset of useAgentActiveDeals (which drives HomeTabAgent scroll).
// Returns all deals with partner milestones + alerts for filter chip logic.
//
// @backend rpc_get_agent_deals() — no params (auth.uid() identifies agent)
// Returns: AgentActiveDeal[] sorted by closing_date ASC (soonest first)
// On success: no invalidation needed (query, not mutation)
//
// @demo 4 mock deals with varied statuses to demonstrate all filter states:
//   - 1 deal closing within 14 days (triggers "Closing soon" chip)
//   - 1 deal with rate_lock_expiry alert (triggers "Needs attention" chip)
//   - 1 deal with stale milestone (triggers "Needs attention" chip)
//   - 1 clean deal (on track, green)
// NOTE: rpc_get_agent_deals does not yet exist — stub only.
// Wire when DEAL_CREATION_ENABLED=true and RPC is deployed.

// @demo hardcoded — replace with rpc_get_agent_deals response in production
const MOCK_AGENT_DEALS: AgentActiveDeal[] = [
  {
    // Deal 1: rate lock alert → red status → "Needs attention"
    job_id: 'mock-deal-001',
    transaction_id: 'mock-txn-deals-001', // @demo hardcoded — replace with real transaction_id
    address: '2847 Maple Street, Denver, CO',
    closing_date: '2026-04-15',
    buyer_name: 'James & Sarah Thornton', // @demo hardcoded — replace with rpc_get_agent_deals response
    contract_price: 875000, // @demo hardcoded — replace with rpc_get_agent_deals response
    partners: [
      {
        partner_id: 'mock-p-001',
        name: 'Sarah Chen',
        partner_role: 'Title/Escrow',
        partner_avatar_color: '#7BA3C9',
        milestones: [
          { id: 'md-001', milestone_key: 'title_search', milestone_label: 'Title search', status: 'complete', sort_order: 0, completed_at: _daysAgo(10), updated_at: _daysAgo(10) },
          { id: 'md-002', milestone_key: 'lien_search', milestone_label: 'Lien search', status: 'in_progress', sort_order: 1, completed_at: null, updated_at: _daysAgo(1) },
          { id: 'md-003', milestone_key: 'title_commitment', milestone_label: 'Title commitment', status: 'pending', sort_order: 2, completed_at: null, updated_at: _daysAgo(20) },
        ],
        alerts: [],
      },
      {
        partner_id: 'mock-p-002',
        name: 'James Rivera',
        partner_role: 'Mortgage Pro',
        partner_avatar_color: '#A3C9A8',
        milestones: [
          { id: 'md-010', milestone_key: 'pre_approval', milestone_label: 'Pre-approval confirmed', status: 'complete', sort_order: 0, completed_at: _daysAgo(14), updated_at: _daysAgo(14) },
          { id: 'md-011', milestone_key: 'app_submitted', milestone_label: 'Application submitted', status: 'complete', sort_order: 1, completed_at: _daysAgo(10), updated_at: _daysAgo(10) },
          { id: 'md-012', milestone_key: 'appraisal_ordered', milestone_label: 'Appraisal ordered', status: 'in_progress', sort_order: 2, completed_at: null, updated_at: _daysAgo(6) },
        ],
        alerts: [
          { id: 'ma-001', alert_type: 'rate_lock_expiry', message: 'Rate lock expires in 4 days — confirm extension or float.', expires_at: _daysFromNow(4), dismissed_at: null, document_requested: null },
        ],
      },
    ],
  },
  {
    // Deal 2: closing within 14 days → "Closing soon" + green (on track)
    job_id: 'mock-deal-002',
    transaction_id: 'mock-txn-deals-002', // @demo hardcoded — replace with real transaction_id
    address: '1190 Corona Street, Denver, CO',
    closing_date: '2026-03-28',
    buyer_name: 'David & Michelle Park', // @demo hardcoded — replace with rpc_get_agent_deals response
    contract_price: 620000, // @demo hardcoded — replace with rpc_get_agent_deals response
    partners: [
      {
        partner_id: 'mock-p-003',
        name: 'Priya Nair',
        partner_role: 'Title/Escrow',
        partner_avatar_color: '#C9A87B',
        milestones: [
          { id: 'md-020', milestone_key: 'title_search', milestone_label: 'Title search', status: 'complete', sort_order: 0, completed_at: _daysAgo(12), updated_at: _daysAgo(12) },
          { id: 'md-021', milestone_key: 'lien_search', milestone_label: 'Lien search', status: 'complete', sort_order: 1, completed_at: _daysAgo(8), updated_at: _daysAgo(8) },
          { id: 'md-022', milestone_key: 'clear_to_close', milestone_label: 'Clear to close', status: 'in_progress', sort_order: 3, completed_at: null, updated_at: _daysAgo(1) },
        ],
        alerts: [],
      },
      {
        partner_id: 'mock-p-004',
        name: 'Marcus Lee',
        partner_role: 'Mortgage Pro',
        partner_avatar_color: '#C97BA3',
        milestones: [
          { id: 'md-030', milestone_key: 'pre_approval', milestone_label: 'Pre-approval confirmed', status: 'complete', sort_order: 0, completed_at: _daysAgo(15), updated_at: _daysAgo(15) },
          { id: 'md-031', milestone_key: 'clear_to_close', milestone_label: 'Clear to close', status: 'complete', sort_order: 6, completed_at: _daysAgo(2), updated_at: _daysAgo(2) },
        ],
        alerts: [],
      },
    ],
  },
  {
    // Deal 3: stale milestone → amber status → "Needs attention"
    job_id: 'mock-deal-003',
    transaction_id: 'mock-txn-deals-003', // @demo hardcoded — replace with real transaction_id
    address: '4521 Tennyson Street, Denver, CO',
    closing_date: '2026-06-10',
    buyer_name: 'Angela Torres', // @demo hardcoded — replace with rpc_get_agent_deals response
    contract_price: 540000, // @demo hardcoded — replace with rpc_get_agent_deals response
    partners: [
      {
        partner_id: 'mock-p-005',
        name: 'Olivia Park',
        partner_role: 'Title/Escrow',
        partner_avatar_color: '#9B7BC9',
        milestones: [
          { id: 'md-040', milestone_key: 'title_search', milestone_label: 'Title search', status: 'complete', sort_order: 0, completed_at: _daysAgo(10), updated_at: _daysAgo(10) },
          { id: 'md-041', milestone_key: 'lien_search', milestone_label: 'Lien search', status: 'in_progress', sort_order: 1, completed_at: null, updated_at: _daysAgo(5) },
        ],
        alerts: [],
      },
    ],
  },
  {
    // Deal 4: all green — normal state
    job_id: 'mock-deal-004',
    transaction_id: 'mock-txn-deals-004', // @demo hardcoded — replace with real transaction_id
    address: '782 S Pearl Street, Denver, CO',
    closing_date: '2026-07-22',
    buyer_name: 'Robert & Lisa Chen', // @demo hardcoded — replace with rpc_get_agent_deals response
    contract_price: 1250000, // @demo hardcoded — replace with rpc_get_agent_deals response
    partners: [
      {
        partner_id: 'mock-p-006',
        name: 'Daniel Kim',
        partner_role: 'Title/Escrow',
        partner_avatar_color: '#C9C97B',
        milestones: [
          { id: 'md-050', milestone_key: 'title_search', milestone_label: 'Title search', status: 'complete', sort_order: 0, completed_at: _daysAgo(3), updated_at: _daysAgo(3) },
          { id: 'md-051', milestone_key: 'lien_search', milestone_label: 'Lien search', status: 'in_progress', sort_order: 1, completed_at: null, updated_at: _daysAgo(1) },
        ],
        alerts: [],
      },
      {
        partner_id: 'mock-p-007',
        name: 'Rachel Gomez',
        partner_role: 'Mortgage Pro',
        partner_avatar_color: '#7BC9B8',
        milestones: [
          { id: 'md-060', milestone_key: 'pre_approval', milestone_label: 'Pre-approval confirmed', status: 'complete', sort_order: 0, completed_at: _daysAgo(5), updated_at: _daysAgo(5) },
          { id: 'md-061', milestone_key: 'app_submitted', milestone_label: 'Application submitted', status: 'in_progress', sort_order: 1, completed_at: null, updated_at: _daysAgo(1) },
        ],
        alerts: [],
      },
    ],
  },
];

export function useAgentDeals() {
  return useQuery({
    queryKey: ['agent_deals'],
    queryFn: async (): Promise<AgentActiveDeal[]> => {
      // @demo — return mock deals sorted by closing_date ASC
      // @backend rpc_get_agent_deals — params: none (auth.uid() identifies agent)
      return MOCK_AGENT_DEALS;
    },
  });
}

// ─── useAgentActiveDeals ──────────────────────────────────────
// STATUS: wired (with mock fallback)
// @backend rpc_get_agent_deals() — no params, uses auth.uid()
// Returns active deals with partner list for Home tab + AgentDealsScreen
// When transactionId is provided, filters deal board by transaction_id instead of job_id.
// Mock fallback: MOCK_AGENT_ACTIVE_DEALS (2 deals) — demo must never show empty Home tab

export function useAgentActiveDeals(transactionId?: string) {
  return useQuery({
    queryKey: ['agent_active_deals', transactionId ?? null],
    queryFn: async (): Promise<AgentActiveDeal[]> => {
      try {
        // @backend rpc_get_agent_deals() — no params, uses auth.uid()
        const { data, error } = await supabase.rpc('rpc_get_agent_deals');
        if (error || !data?.success) throw error;
        return (data.deals ?? []) as AgentActiveDeal[];
      } catch (e) {
        console.warn('[useAgentActiveDeals] rpc_get_agent_deals failed, using mock:', e);
        // @demo hardcoded — mock fallback preserves demo app
        return MOCK_AGENT_ACTIVE_DEALS;
      }
    },
  });
}

// ─── useDismissDealAlert ──────────────────────────────────────
// STATUS: wired (S113d)
// @backend rpc_dismiss_deal_alert({ p_alert_id })
// Optimistic: removes alert from agent_active_deals cache by transaction_id

export function useAgentDismissDealAlert() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      alertId,
      jobId,
      transactionId,
    }: {
      alertId: string;
      /** @deprecated use transactionId for optimistic matching */
      jobId?: string;
      transactionId?: string;
    }) => {
      // @backend rpc_dismiss_deal_alert({ p_alert_id })
      const { data, error } = await supabase.rpc('rpc_dismiss_deal_alert', {
        p_alert_id: alertId,
      });
      if (error) {
        console.error('[useAgentDismissDealAlert] RPC failed:', error);
        throw error;
      }
      return data;
    },
    onMutate: async (variables) => {
      await qc.cancelQueries({ queryKey: ['agent_active_deals'] });
      const previous = qc.getQueryData<AgentActiveDeal[]>(['agent_active_deals']);

      qc.setQueryData<AgentActiveDeal[]>(
        ['agent_active_deals'],
        (old) => old?.map(deal => {
          const isMatch = variables.transactionId
            ? deal.transaction_id === variables.transactionId
            : deal.job_id === variables.jobId;
          if (!isMatch) return deal;
          return {
            ...deal,
            partners: deal.partners.map(p => ({
              ...p,
              alerts: (p.alerts ?? []).filter(a => a.id !== variables.alertId),
            })),
          };
        }),
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(['agent_active_deals'], context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      qc.invalidateQueries({ queryKey: ['agent_active_deals'] });
      if (variables.jobId) {
        qc.invalidateQueries({ queryKey: ['deal_board', variables.jobId] });
      }
      if (variables.transactionId) {
        qc.invalidateQueries({ queryKey: ['deal_board', variables.transactionId] });
      }
    },
  });
}

// ─── useCreateTransaction ────────────────────────────────────────────────────
// STATUS: wired (with mock fallback)
// Creates a new transaction and sends partner invitations atomically.
// @backend rpc_create_transaction({
//   p_property_address: string,   // required
//   p_closing_date: string | null,
//   p_contract_price: number | null,
//   p_buyer_name: string | null,
//   p_mls_number: string | null,
//   p_partner_assignments: { partner_id: string, partner_role: string }[]
// })
// NOTE: anchors to transaction_id (S64+). job_id preserved for backward compat only.
// Invalidates: ['agent_active_deals'] on success
// @demo mock: 1500ms delay → { success: true, transaction_id: 'mock-txn-001', address, partner_count }

export function useCreateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      propertyAddress,
      closingDate,
      contractPrice,
      buyerName,
      partnerAssignments,
    }: {
      propertyAddress: string;
      closingDate: string | null;
      contractPrice: number | null;
      buyerName?: string | null;
      partnerAssignments: { partner_id: string; partner_role: string }[];
    }) => {
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        // @demo — 1500ms delay to simulate network
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`[useCreateTransaction] @demo creating deal at ${propertyAddress}`);
        return {
          success: true,
          transaction_id: `mock-txn-${Date.now()}`,
          address: propertyAddress,
          partner_count: partnerAssignments.length,
        };
      }

      // @backend rpc_create_transaction(p_property_address, p_closing_date, p_contract_price, p_buyer_name, p_mls_number, p_partner_assignments)
      const { data, error } = await supabase.rpc('rpc_create_transaction', {
        p_property_address: propertyAddress,
        p_closing_date: closingDate,
        p_contract_price: contractPrice,
        p_buyer_name: buyerName ?? null,
        p_mls_number: null,
        p_partner_assignments: partnerAssignments,
      });
      if (error || !data?.success) throw new Error(data?.error ?? error?.message ?? 'Failed to create transaction');
      return data;
    },
    onSuccess: (data, variables) => {
      // query key must match useAgentActiveDeals exactly
      qc.invalidateQueries({ queryKey: ['agent_active_deals'] });
      // query key must match useAgentDeals exactly (AgentDealsScreen)
      qc.invalidateQueries({ queryKey: ['agent_deals'] });

      // @backend rpc_seed_transaction_milestones({ p_transaction_id, p_partner_id, p_partner_role })
      // Seeds milestone board for each partner immediately after deal creation
      // Fire-and-forget — failure does not block the success flow
      if (data?.transaction_id && !data.transaction_id.startsWith('mock-')) {
        for (const partner of variables.partnerAssignments) {
          supabase.rpc('rpc_seed_transaction_milestones', {
            p_transaction_id: data.transaction_id,
            p_partner_id: partner.partner_id,
            p_partner_role: partner.partner_role,
          }).then(res => {
            if (res.error) console.warn('[seed milestones] failed for', partner.partner_id, res.error);
          });
        }
      }
    },
  });
}

// ─── useRealtimeDealBoard ─────────────────────────────────────
// Subscribes to Supabase Realtime for deal_milestones + deal_alerts
// Invalidates TanStack Query cache on any INSERT/UPDATE
// Cleanup on unmount to prevent memory leaks
// NOTE: will migrate to transaction_id in S64 when transactions table exists

// ─── useGenerateClientToken ──────────────────────────────────
// STATUS: wired (with mock fallback)
// PURPOSE: Generates or retrieves the unique sharing URL for a deal.
// Called when agent taps "Share" on AgentDealDetailScreen.
// Idempotent — safe to call on every share tap (RPC returns existing token if set).
//
// @backend rpc_generate_client_token({ p_transaction_id: transactionId })
// Returns: { success: boolean, client_token: string, url: string }
// On success: invalidate ['agent_active_deals']
//
// @demo Returns mock URL — replace with live RPC call when DEAL_CREATION_ENABLED=true
// NOTE: transaction_id param anchored to S64+ deal creation flow

export function useGenerateClientToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId, notifyPhone }: { transactionId: string; notifyPhone?: string | null }) => {
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        // @demo mock — 600ms delay to simulate network
        await new Promise(resolve => setTimeout(resolve, 600));
        return {
          success: true,
          client_token: 'demo-token-001',
          url: 'https://closing.atlasioapp.com/demo-token-001',
        };
      }

      // @backend rpc_generate_client_token(p_transaction_id, p_notify_phone)
      const { data, error } = await supabase.rpc('rpc_generate_client_token', {
        p_transaction_id: transactionId,
        p_notify_phone: notifyPhone ?? null,
      });
      if (error || !data?.success) throw new Error(data?.error ?? error?.message ?? 'Failed to generate token');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_active_deals'] });
    },
  });
}

// ─── useUpdateClosingDetails ─────────────────────────────────
// STATUS: wired (with mock fallback)
// PURPOSE: Agent populates closing day details visible on the client web page.
// Called from the "Closing day details" section in AgentDealDetailScreen.
//
// @backend rpc_update_closing_details({
//   p_transaction_id: transactionId,
//   p_closing_details: { time, location, bring_list, wire_amount }
// })
// Returns: { success: boolean, closing_details: ClosingDetails }
// On success: invalidate ['agent_active_deals']
//
// @demo Mock save with 800ms delay — replace with live RPC call
// NOTE: p_closing_details shape must match closing_details JSONB column exactly

export function useUpdateClosingDetails() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      transactionId,
      closingDetails,
    }: {
      transactionId: string;
      closingDetails: {
        time: string;
        location: string;
        bring_list: string;
        wire_amount: string;
      };
    }) => {
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        // @demo mock — 800ms delay to simulate network
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true, closing_details: closingDetails };
      }

      // @backend rpc_update_closing_details(p_transaction_id, p_closing_details)
      // NOTE: RPC does jsonb MERGE not overwrite — safe to pass partial objects
      const { data, error } = await supabase.rpc('rpc_update_closing_details', {
        p_transaction_id: transactionId,
        p_closing_details: closingDetails,
      });
      if (error || !data?.success) throw new Error(data?.error ?? error?.message ?? 'Failed to update closing details');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_active_deals'] });
    },
  });
}

// ─── useCloseTransaction ─────────────────────────────────────
// STATUS: wired (with mock fallback)
// PURPOSE: Agent marks a deal as successfully closed.
// Removes the deal from the active pipeline.
//
// @backend rpc_close_transaction({ p_transaction_id: transactionId })
// Returns: { success: boolean, error?: string }
// On success: invalidate ['agent_deals'] + ['agent_active_deals']

export function useCloseTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId }: { transactionId: string }) => {
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        // @demo mock — 800ms delay to simulate network
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true };
      }

      // @backend rpc_close_transaction(p_transaction_id)
      const { data, error } = await supabase.rpc('rpc_close_transaction', {
        p_transaction_id: transactionId,
      });
      if (error || !data?.success) throw new Error(data?.error ?? error?.message ?? 'Failed to close transaction');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_deals'] });
      queryClient.invalidateQueries({ queryKey: ['agent_active_deals'] });
    },
  });
}

// ─── useCancelTransaction ────────────────────────────────────
// STATUS: wired (with mock fallback)
// PURPOSE: Agent cancels a deal (fell through / no longer active).
// Removes the deal from the active pipeline.
//
// @backend rpc_cancel_transaction({ p_transaction_id: transactionId })
// Returns: { success: boolean, error?: string }
// On success: invalidate ['agent_deals'] + ['agent_active_deals']

export function useCancelTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId }: { transactionId: string }) => {
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        // @demo mock — 800ms delay to simulate network
        await new Promise(resolve => setTimeout(resolve, 800));
        return { success: true };
      }

      // @backend rpc_cancel_transaction(p_transaction_id)
      const { data, error } = await supabase.rpc('rpc_cancel_transaction', {
        p_transaction_id: transactionId,
      });
      if (error || !data?.success) throw new Error(data?.error ?? error?.message ?? 'Failed to cancel transaction');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_deals'] });
      queryClient.invalidateQueries({ queryKey: ['agent_active_deals'] });
    },
  });
}

// ─── useUpdateTransaction ─────────────────────────────────────
// STATUS: wired (with mock fallback)
// PURPOSE: Agent edits top-level deal fields (buyer name, contract price, closing date).
// Called from EditDealScreen via 3-dot menu on AgentDealDetailScreen.
//
// @backend rpc_update_transaction({
//   p_transaction_id, p_buyer_name, p_contract_price, p_closing_date, p_clear_closing_date
// })
// Returns: { success: boolean }
// On success: invalidate ['agent_deals'] + ['agent_active_deals']
//
// NOTE: rpc_update_closing_details handles closing_details JSONB separately.

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      transactionId: string;
      buyerName?: string | null;
      contractPrice?: number | null;
      closingDate?: string | null; // ISO date string YYYY-MM-DD
      clearClosingDate?: boolean; // true when user explicitly cleared the date
    }) => {
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        // @demo mock — 600ms delay to simulate network
        await new Promise(resolve => setTimeout(resolve, 600));
        return { success: true };
      }

      // @backend rpc_update_transaction(p_transaction_id, p_buyer_name, p_contract_price, p_closing_date, p_clear_closing_date)
      const { data, error } = await supabase.rpc('rpc_update_transaction', {
        p_transaction_id: input.transactionId,
        p_buyer_name: input.buyerName ?? null,
        p_contract_price: input.contractPrice ?? null,
        p_closing_date: input.closingDate ?? null,
        p_clear_closing_date: input.clearClosingDate ?? false,
      });
      if (error) throw error;
      if (data && !data.success) throw new Error(data.error ?? 'Failed to update transaction');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_deals'] });
      queryClient.invalidateQueries({ queryKey: ['agent_active_deals'] });
    },
    onError: (error) => {
      console.error('[useUpdateTransaction] failed:', error);
    },
  });
}

// ─── useAgentPartnerConnections ───────────────────────────────
// STATUS: wired (with mock fallback)
// Returns accepted partner connections for the current agent.
// Used by DealCreationSheet to populate the "Add to Deal" partner list.
// @backend Direct query on `connections` table (RLS: "View own connections" policy)
//   Joins `profiles` for partner name, display_role, avatar_color.
// @demo mock: returns MOCK_CONNECTED_PARTNERS (3 hardcoded partners)

interface PartnerConnection {
  id: string;
  name: string;
  role: string;
  avatar_color: string;
}

const MOCK_PARTNER_CONNECTIONS: PartnerConnection[] = [
  { id: 'a1b2c3d4-0001-4000-8000-000000000001', name: 'Lisa Nguyen', role: 'title_escrow', avatar_color: '#10B981' },
  { id: 'a1b2c3d4-0002-4000-8000-000000000002', name: 'David Park', role: 'mortgage_pro', avatar_color: '#6366F1' },
  { id: 'mock-partner-003', name: 'Sarah Kim', role: 'title_escrow', avatar_color: '#F59E0B' },
];

export function useAgentPartnerConnections() {
  return useQuery({
    queryKey: ['agent_partner_connections'],
    queryFn: async (): Promise<PartnerConnection[]> => {
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        // @demo mock — return hardcoded partner connections
        return MOCK_PARTNER_CONNECTIONS;
      }

      try {
        const userId = await getCurrentUserId();

        // @backend Query accepted connections where agent is requester
        const { data: asRequester, error: e1 } = await supabase
          .from('connections')
          .select('responder_id, profiles!connections_responder_id_fkey(id, name, display_role, avatar_color)')
          .eq('requester_id', userId)
          .eq('status', 'accepted');
        if (e1) throw e1;

        // @backend Query accepted connections where agent is responder
        const { data: asResponder, error: e2 } = await supabase
          .from('connections')
          .select('requester_id, profiles!connections_requester_id_fkey(id, name, display_role, avatar_color)')
          .eq('responder_id', userId)
          .eq('status', 'accepted');
        if (e2) throw e2;

        const partners: PartnerConnection[] = [];

        for (const row of asRequester ?? []) {
          const p = row.profiles as any;
          if (p?.id) {
            partners.push({
              id: p.id,
              name: p.name ?? '',
              role: p.display_role ?? '',
              avatar_color: p.avatar_color ?? '#7BA3C9',
            });
          }
        }

        for (const row of asResponder ?? []) {
          const p = row.profiles as any;
          if (p?.id) {
            partners.push({
              id: p.id,
              name: p.name ?? '',
              role: p.display_role ?? '',
              avatar_color: p.avatar_color ?? '#7BA3C9',
            });
          }
        }

        return partners;
      } catch (err) {
        console.warn('[useAgentPartnerConnections] Supabase failed, using mock fallback', err);
        return MOCK_PARTNER_CONNECTIONS;
      }
    },
  });
}

// ─── useRealtimeDealBoard ─────────────────────────────────────
// When transactionId is provided, subscribe on transaction_id instead of job_id.
// Falls back to job_id when transactionId is omitted (backward compatible).
export function useRealtimeDealBoard(jobId: string, transactionId?: string): void {
  const qc = useQueryClient();

  useEffect(() => {
    const filter = transactionId
      ? `transaction_id=eq.${transactionId}`
      : `job_id=eq.${jobId}`;
    const channelName = transactionId
      ? `deal_board_tx_${transactionId}`
      : `deal_board_${jobId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deal_milestones', filter },
        () => {
          qc.invalidateQueries({ queryKey: ['deal_board', jobId] });
          qc.invalidateQueries({ queryKey: ['agent_active_deals'] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deal_alerts', filter },
        () => {
          qc.invalidateQueries({ queryKey: ['deal_board', jobId] });
          qc.invalidateQueries({ queryKey: ['agent_active_deals'] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId, transactionId, qc]);
}

// ─── useMarkDealClosed ──────────────────────────────────────
// STATUS: mock
// PURPOSE: Marks a deal as closed for the celebration flow.
// Separate from useCloseTransaction — this hook is specifically for
// the DealClosedCelebration experience and does NOT replace the
// existing close deal lifecycle action.
//
// @backend rpc_mark_deal_closed({ p_transaction_id: transactionId })
// Returns: { success: boolean }
// On success: invalidate ['agent_active_deals'], ['agent_deals'], ['closed_deals']

export function useMarkDealClosed() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ transactionId }: { transactionId: string }) => {
      // @demo mock — 800ms delay to simulate network
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true };
      // @backend uncomment when rpc_mark_deal_closed is deployed:
      // const { data, error } = await supabase.rpc('rpc_mark_deal_closed', {
      //   p_transaction_id: transactionId,
      // });
      // if (error || !data?.success) throw new Error(data?.error ?? error?.message ?? 'Failed to mark deal closed');
      // return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent_active_deals'] });
      queryClient.invalidateQueries({ queryKey: ['agent_deals'] });
      queryClient.invalidateQueries({ queryKey: ['closed_deals'] });
    },
  });
}

// ─── useClosedDeals ─────────────────────────────────────────
// STATUS: mock
// PURPOSE: Fetches closed deals for the agent's history list.
//
// @backend rpc_get_closed_deals() — does not exist yet, deploy before flipping USE_MOCK_DATA
// @demo mock: returns MOCK_CLOSED_DEALS array
// Query key: ['closed_deals']

// @demo mock — 3 closed deals for demo
// @backend replace with rpc_get_closed_deals when deployed
const MOCK_CLOSED_DEALS: ClosedDeal[] = [
  {
    id: 'cd-001',
    address: '4821 Maple Ridge Drive, Austin, TX 78746',
    buyerName: 'James & Sarah Thornton',
    salePrice: 875000,
    closingDate: '2026-04-15',
  },
  {
    id: 'cd-002',
    address: '112 Westover Hills Blvd, Denver, CO 80219',
    buyerName: 'Michael Rodriguez',
    salePrice: 620000,
    closingDate: '2026-03-28',
  },
  {
    id: 'cd-003',
    address: '3301 Lakefront Terrace, Nashville, TN 37214',
    buyerName: 'Emily & David Kwan',
    salePrice: 492500,
    closingDate: '2026-02-14',
  },
];

export function useClosedDeals() {
  return useQuery({
    queryKey: ['closed_deals'],
    queryFn: async () => {
      // @demo mock — return static closed deals
      return MOCK_CLOSED_DEALS;
      // @backend uncomment when rpc_get_closed_deals is deployed:
      // const { data, error } = await supabase.rpc('rpc_get_closed_deals');
      // if (error) throw error;
      // return (data ?? []) as ClosedDeal[];
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// STRIPE CONNECT HOOKS
// @backend: stripe-connect-onboarding Edge Function
// Note: Edge Function writes stripe_account_id directly to profiles.
// useFocusEffect in PaymentSettingsScreen handles cache refresh on return.
// ═══════════════════════════════════════════════════════════════

/**
 * Get Stripe Connect onboarding URL from Edge Function
 * Opens Stripe-hosted onboarding flow for contractor payment setup
 */
// STATUS: wired (with mock fallback)
export const useGetStripeOnboardingUrl = () => {
  return useMutation({
    mutationFn: async (): Promise<{ url: string }> => {
      // @demo hardcoded — return mock URL in demo mode
      if (FEATURE_FLAGS.USE_MOCK_DATA) {
        await new Promise((r) => setTimeout(r, 800));
        return { url: 'https://demo.stripe.com/mock-onboarding' };
      }

      try {
        // @backend: stripe-connect-onboarding Edge Function
        // Body: { user_id: string, return_url: string }
        // Returns { url: string } — Stripe-hosted onboarding URL
        // return_url: https://closing.atlasioapp.com/stripe-return (page TBD — S-Web-02)
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not authenticated');

        const res = await fetch(
          'https://fqeighzlnreghzmailgx.supabase.co/functions/v1/stripe-connect-onboarding',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              user_id: session.user.id,
              return_url: 'https://closing.atlasioapp.com/stripe-return',
            }),
          },
        );

        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Edge Function error: ${res.status} ${body}`);
        }

        const data = await res.json();
        return { url: data.url };
      } catch (err) {
        console.warn('[useGetStripeOnboardingUrl] Edge Function failed', err);
        throw err; // S106 pattern — never fake success
      }
    },
  });
};

