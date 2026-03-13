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
// HOOK CATALOG (55 hooks, 13 sections):
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
//   CHAT / INBOX (6)     — useChatThreads, useMarkThreadRead, useChatRecipients,
//                          useCreateThread, useMessages, useSendMessage
//   NOTIFICATIONS (3)    — useNotifications, useMarkNotificationsRead, useUnreadNotificationCount
//   FIND / SEARCH (4)    — useSearchPros, useFindPros, useRecommendedPros, useTrendingPros
//   SQUADS (3)           — useSquadMembers, useAssignSquadMember, useRemoveSquadMember
//   CONTRACTOR JOBS (5)  — useContractorJobDetails, useSubmitBid, useRespondToCounter,
//                          useAcceptInvitation, useDeclineInvitation
//   CONTRACTOR DASHBOARD (3) — useMatchingJobs, useContractorEarnings, useMarketPulse
//   ONBOARDING (1)       — useCompleteOnboarding
//   ACCOUNT (1)          — useDeleteAccount
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '../lib/supabase';
import * as FileSystem from 'expo-file-system/legacy';
import { MOCK_REPAIR_JOBS } from '../components/RepairJobsData';
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
} from '../types';

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
          tags: [], trades: [], trade: null, specialties: [], licensed: null,
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
          tags: [], trades: [], trade: null, specialties: [], licensed: null,
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
        const { data, error } = await supabase
          .from('connections')
          .select('*, profile:profiles!responder_id(*)')
          .or(`requester_id.eq.${userId},responder_id.eq.${userId}`)
          .eq('status', 'accepted');
        if (error) throw error;
        // Supabase typed client can't infer join alias — runtime shape is correct
        return (data ?? []) as (Connection & { profile: Profile })[];
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
 * RPC: rpc_mark_complete(p_job_id UUID, p_proof_photos TEXT[] DEFAULT '{}', p_completion_notes TEXT DEFAULT '') → VOID
 */
// STATUS: wired (with mock fallback)
export const useMarkJobComplete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      proofPhotos,
      completionNotes,
    }: {
      jobId: string;
      proofPhotos?: string[];
      completionNotes?: string;
    }) => {
      try {
        const { error } = await supabase.rpc('rpc_mark_complete', {
          p_job_id: jobId,
          p_proof_photos: proofPhotos ?? [],
          p_completion_notes: completionNotes ?? '',
        });
        if (error) throw error;
      } catch (err) {
        console.warn('[useMarkJobComplete] Supabase RPC failed, using mock fallback', err);
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(jobId) });
    },
  });
};

/**
 * Confirm job completion (agent approves)
 * RPC: rpc_confirm_complete(p_job_id UUID) → VOID
 */
// STATUS: wired (with mock fallback)
export const useConfirmJobComplete = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      try {
        const { error } = await supabase.rpc('rpc_confirm_complete', {
          p_job_id: jobId,
        });
        if (error) throw error;
      } catch (err) {
        console.warn('[useConfirmJobComplete] Supabase RPC failed, using mock fallback', err);
        await new Promise((r) => setTimeout(r, 300));
      }
    },
    onSuccess: (_, { jobId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(jobId) });
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
 * Create a new chat thread with first message
 * No RPC available — uses two sequential inserts
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
        console.warn('[useCreateThread] Supabase failed, using mock fallback', err);
        return { success: true, thread_id: `mock-thread-${Date.now()}`, existing: false };
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.chatThreads });
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
 * Send a message
 * Reads sender_name from cached profile (queryKeys.myProfile)
 */
// STATUS: wired (with mock fallback)
export const useSendMessage = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      content,
      type = 'text',
    }: {
      threadId: string;
      content: string;
      type?: 'text' | 'image' | 'document';
    }) => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) throw new Error('Not authenticated');
        // Get sender name from cached profile
        const cachedProfile = qc.getQueryData<Profile>(queryKeys.myProfile);
        const senderName = cachedProfile?.name ?? '';
        const { data, error } = await supabase
          .from('messages')
          .insert({ thread_id: threadId, sender_id: userId, sender_name: senderName, content, type })
          .select()
          .single();
        if (error) throw error;
        return data as Message;
      } catch (err) {
        console.warn('[useSendMessage] Supabase failed, using mock fallback', err);
        // TODO: [PRODUCTION] Remove mock fallback
        return {
          id: `msg-${Date.now()}`, thread_id: threadId, sender_id: '',
          sender_name: '', content, type: 'text', attachment_url: null,
          is_read: false, created_at: new Date().toISOString(),
        } as Message;
      }
    },
    onSuccess: (_, { threadId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.messages(threadId) });
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
 * @backend rpc_get_job_details — returns full job object with agent profile and my_bid
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
// Flow: upload PDF to credentials bucket → call rpc_upload_insurance_document
// @backend: supabase.storage credentials bucket (created S15, RLS: owner only)
//           rpc_upload_insurance_document
//   params: { document_url: string, expiry_month: number, expiry_year: number }
//   returns: { success: boolean, message: string }
// Invalidates: ['profile'] query on success
// ─────────────────────────────────────────────────────────────
// STATUS: wired (with mock fallback)
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
      try {
        // Step 1: Get current user ID for bucket path
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Step 2: Read file using expo-file-system (fetch() doesn't support file:// URIs on iOS)
        // @backend expo-file-system reads local file → base64 → Uint8Array for Supabase upload
        const base64 = await FileSystem.readAsStringAsync(data.fileUri, {
          encoding: 'base64',
        });
        const binaryString = atob(base64);
        const fileBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          fileBytes[i] = binaryString.charCodeAt(i);
        }
        const filePath = `${user.id}/coi-${Date.now()}.pdf`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('credentials')
          .upload(filePath, fileBytes, {
            contentType: data.mimeType,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        // Step 3: Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('credentials')
          .getPublicUrl(uploadData.path);

        // Step 4: Call RPC with storage URL + expiry date
        // @backend rpc_upload_insurance_document
        //   params: { p_document_url, p_expiry_month, p_expiry_year }
        const { data: result, error: rpcError } = await supabase.rpc(
          'rpc_upload_insurance_document',
          {
            p_document_url:  publicUrl,
            p_expiry_month:  data.expiryMonth,
            p_expiry_year:   data.expiryYear,
          }
        );
        if (rpcError) throw rpcError;
        return result as { success: boolean; message: string };
      } catch (err) {
        // Re-throw so InsuranceUploadScreen.handleSubmit can surface the error
        // via setSubmitError — do NOT swallow with a mock success here
        // @demo if you need mock fallback behavior, use LIVE_INSURANCE_HOOKS: false
        //       which bypasses this hook entirely via the flag in the screen
        console.warn('[useUploadInsuranceDocument] RPC or upload failed', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};
