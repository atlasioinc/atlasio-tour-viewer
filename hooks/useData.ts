// hooks/useData.ts
// ═══════════════════════════════════════════════════════════════
// Data Hooks — TanStack Query wrappers for all Supabase queries
//
// Each hook provides: { data, isLoading, error, refetch }
// Each mutation provides: { mutate, mutateAsync, isPending }
//
// CURRENT STATE: Returns mock data (no Supabase calls yet)
// TO ACTIVATE: Uncomment the Supabase query, remove mock fallback
//
// This pattern means screens don't change at all when we
// switch from mock → real data. They just call the same hook.
// ═══════════════════════════════════════════════════════════════

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, getCurrentUserId } from '../lib/supabase';
import type {
  Profile,
  ProProfileData,
  PerformanceStats,
  NetworkContact,
  NetworkContractor,
  Job,
  Bid,
  Vouch,
  VouchEntry,
  ChatThreadView,
  Notification,
  Recipient,
} from '../types';

// ═══════════════════════════════════════════════════════════════
// QUERY KEYS — centralized for cache invalidation
// ═══════════════════════════════════════════════════════════════

export const queryKeys = {
  // Profile
  profile: (id: string) => ['profile', id] as const,
  myProfile: ['profile', 'me'] as const,

  // Network
  networkContacts: (tab: 'partners' | 'contractors') => ['network', tab] as const,
  networkContractors: ['network', 'contractors-invite'] as const,

  // Repair Jobs
  repairJobs: ['repair-jobs'] as const,
  repairJob: (id: string) => ['repair-jobs', id] as const,

  // Vouch Feed
  vouchFeed: (filter?: string) => ['vouches', filter ?? 'all'] as const,

  // Chat / Inbox
  chatThreads: ['chat-threads'] as const,
  chatMessages: (conversationId: string) => ['messages', conversationId] as const,
  chatRecipients: ['chat-recipients'] as const,

  // Notifications
  notifications: ['notifications'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,

  // Find / Search
  findPros: (query: string, role: string, sort: string) =>
    ['find-pros', query, role, sort] as const,
} as const;

// ═══════════════════════════════════════════════════════════════
// PROFILE HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch a pro's full profile (for ProProfile screen)
 *
 * Production query:
 *   supabase
 *     .from('profiles')
 *     .select('*, performance_stats(*), vouches!recipient_id(id, author_name, quote, avatar_color)')
 *     .eq('id', profileId)
 *     .single()
 */
export const useProProfile = (profileId: string) => {
  return useQuery({
    queryKey: queryKeys.profile(profileId),
    queryFn: async (): Promise<ProProfileData> => {
      // ── PRODUCTION: Uncomment below ──
      // const { data, error } = await supabase
      //   .from('profiles')
      //   .select(`
      //     *,
      //     performance_stats(*),
      //     received_vouches:vouches!recipient_id(id, author:profiles!author_id(name, avatar_color), quote)
      //   `)
      //   .eq('id', profileId)
      //   .single();
      // if (error) throw error;
      //
      // const userId = await getCurrentUserId();
      // const { data: connection } = await supabase
      //   .from('connections')
      //   .select('status')
      //   .or(`requester_id.eq.${userId},responder_id.eq.${userId}`)
      //   .or(`requester_id.eq.${profileId},responder_id.eq.${profileId}`)
      //   .eq('status', 'accepted')
      //   .maybeSingle();
      //
      // return mapProfileToProProfileData(data, connection, userId);

      // ── MOCK: Remove when Supabase is live ──
      throw new Error('Not implemented — use mock data via route params');
    },
    enabled: !!profileId,
  });
};

/**
 * Fetch current user's own profile
 */
export const useMyProfile = () => {
  return useQuery({
    queryKey: queryKeys.myProfile,
    queryFn: async (): Promise<Profile> => {
      // ── PRODUCTION ──
      // const userId = await getCurrentUserId();
      // if (!userId) throw new Error('Not authenticated');
      // const { data, error } = await supabase
      //   .from('profiles')
      //   .select('*')
      //   .eq('id', userId)
      //   .single();
      // if (error) throw error;
      // return data;

      throw new Error('Not implemented');
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// NETWORK HOOKS
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
export const useNetworkContacts = (tab: 'partners' | 'contractors') => {
  return useQuery({
    queryKey: queryKeys.networkContacts(tab),
    queryFn: async (): Promise<NetworkContact[]> => {
      // ── PRODUCTION ──
      // const userId = await getCurrentUserId();
      // const { data, error } = await supabase
      //   .from('connections')
      //   .select(`
      //     id,
      //     is_in_squad,
      //     profile:profiles!responder_id(id, name, company, display_role, role, tags, avatar_color)
      //   `)
      //   .eq('requester_id', userId)
      //   .eq('status', 'accepted');
      // if (error) throw error;
      // return data.filter(c => isContractorRole(c.profile.role) === (tab === 'contractors'))
      //   .map(mapConnectionToNetworkContact);

      throw new Error('Not implemented');
    },
  });
};

/**
 * Toggle squad membership for a connection
 */
export const useToggleSquad = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ connectionId, isInSquad }: { connectionId: string; isInSquad: boolean }) => {
      // ── PRODUCTION ──
      // const { error } = await supabase
      //   .from('connections')
      //   .update({ is_in_squad: isInSquad })
      //   .eq('id', connectionId);
      // if (error) throw error;

      return { connectionId, isInSquad };
    },
    onSuccess: () => {
      // Invalidate both tabs — squad status shown on both
      qc.invalidateQueries({ queryKey: ['network'] });
    },
  });
};

/**
 * Send a connection request
 */
export const useSendConnectionRequest = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // ── PRODUCTION ──
      // const userId = await getCurrentUserId();
      // const { error } = await supabase
      //   .from('connections')
      //   .insert({ requester_id: userId, responder_id: profileId, status: 'pending' });
      // if (error) throw error;

      return { profileId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['network'] });
      qc.invalidateQueries({ queryKey: queryKeys.notifications });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// REPAIR JOB HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all repair jobs for current agent
 */
export const useJobs = () => {
  return useQuery({
    queryKey: queryKeys.repairJobs,
    queryFn: async (): Promise<Job[]> => {
      // ── PRODUCTION ──
      // const userId = await getCurrentUserId();
      // const { data, error } = await supabase
      //   .from('repair_jobs')
      //   .select('*, bids:repair_bids(*)')
      //   .eq('agent_id', userId)
      //   .in('status', ['open', 'in_progress'])
      //   .order('created_at', { ascending: false });
      // if (error) throw error;
      // return data;

      throw new Error('Not implemented');
    },
  });
};

/**
 * Fetch a single repair job by ID
 */
export const useJob = (jobId: string) => {
  return useQuery({
    queryKey: queryKeys.repairJob(jobId),
    queryFn: async (): Promise<Job> => {
      // ── PRODUCTION ──
      // const { data, error } = await supabase
      //   .from('repair_jobs')
      //   .select('*, bids:repair_bids(*, contractor:profiles!contractor_id(name, avatar_color, rating, tags))')
      //   .eq('id', jobId)
      //   .single();
      // if (error) throw error;
      // return data;

      throw new Error('Not implemented');
    },
    enabled: !!jobId,
  });
};

/**
 * Accept / Counter / Reject a bid
 */
export const useRespondToBid = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bidId,
      jobId,
      action,
      counterPrice,
    }: {
      bidId: string;
      jobId: string;
      action: 'accepted' | 'countered' | 'rejected';
      counterPrice?: string;
    }) => {
      // ── PRODUCTION ──
      // const { error } = await supabase
      //   .from('repair_bids')
      //   .update({ status: action, ...(counterPrice && { counter_price: counterPrice }) })
      //   .eq('id', bidId);
      // if (error) throw error;
      //
      // // If accepted, update job status
      // if (action === 'accepted') {
      //   await supabase
      //     .from('repair_jobs')
      //     .update({ status: 'in_progress' })
      //     .eq('id', jobId);
      // }

      return { bidId, action };
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(variables.jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.repairJobs });
    },
  });
};

/**
 * Create a new repair job
 */
export const useCreateJob = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (job: Omit<Job, 'id' | 'agent_id' | 'bids' | 'created_at' | 'updated_at'>) => {
      // ── PRODUCTION ──
      // const userId = await getCurrentUserId();
      // const { data, error } = await supabase
      //   .from('repair_jobs')
      //   .insert({ ...job, agent_id: userId })
      //   .select()
      //   .single();
      // if (error) throw error;
      // return data;

      return { id: `repair-${Date.now()}`, ...job };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJobs });
    },
  });
};

/**
 * Update a repair job
 */
export const useUpdateJob = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, updates }: { jobId: string; updates: Partial<Job> }) => {
      // ── PRODUCTION ──
      // const { data, error } = await supabase
      //   .from('repair_jobs')
      //   .update(updates)
      //   .eq('id', jobId)
      //   .select()
      //   .single();
      // if (error) throw error;
      // return data;

      return { id: jobId, ...updates };
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(variables.jobId) });
      qc.invalidateQueries({ queryKey: queryKeys.repairJobs });
    },
  });
};

/**
 * Invite contractors to bid on a job
 */
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
      // ── PRODUCTION ──
      // 1. Update job's invited list
      // const { error: jobError } = await supabase.rpc('append_invited_contractors', {
      //   p_job_id: jobId,
      //   p_contractor_ids: contractorIds,
      // });
      // if (jobError) throw jobError;
      //
      // 2. Create notification for each contractor
      // const notifications = contractorIds.map(cId => ({
      //   user_id: cId,
      //   type: 'new_bid' as const,
      //   title: 'New Job Invitation',
      //   subtitle: note || 'You have been invited to bid on a repair job',
      //   job_id: jobId,
      // }));
      // await supabase.from('notifications').insert(notifications);

      return { jobId, contractorIds };
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.repairJob(variables.jobId) });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// VOUCH FEED HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch vouch feed with optional category filter
 */
export const useVouchFeed = (filter: string = 'All') => {
  return useQuery({
    queryKey: queryKeys.vouchFeed(filter),
    queryFn: async (): Promise<Vouch[]> => {
      // ── PRODUCTION ──
      // let query = supabase
      //   .from('vouches')
      //   .select('*')
      //   .order('created_at', { ascending: false })
      //   .limit(20);
      //
      // if (filter !== 'All') {
      //   query = query.eq('tag', filter);
      // }
      //
      // const { data, error } = await query;
      // if (error) throw error;
      // return data;

      throw new Error('Not implemented');
    },
  });
};

/**
 * Like/unlike a vouch
 */
export const useLikeVouch = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ vouchId, liked }: { vouchId: string; liked: boolean }) => {
      // ── PRODUCTION ──
      // if (liked) {
      //   await supabase.from('vouch_likes').insert({ vouch_id: vouchId, user_id: await getCurrentUserId() });
      // } else {
      //   await supabase.from('vouch_likes').delete()
      //     .eq('vouch_id', vouchId)
      //     .eq('user_id', await getCurrentUserId());
      // }
      // // Update denormalized count
      // await supabase.rpc('update_vouch_like_count', { p_vouch_id: vouchId });

      return { vouchId, liked };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouches'] });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// CHAT / INBOX HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch all chat threads for current user
 */
export const useChatThreads = () => {
  return useQuery({
    queryKey: queryKeys.chatThreads,
    queryFn: async (): Promise<ChatThreadView[]> => {
      // ── PRODUCTION ──
      // const userId = await getCurrentUserId();
      // const { data, error } = await supabase
      //   .from('conversation_members')
      //   .select('conversation:conversations(*)')
      //   .eq('user_id', userId)
      //   .order('last_message_at', { ascending: false, foreignTable: 'conversations' });
      // if (error) throw error;
      // return data.map(d => d.conversation);

      throw new Error('Not implemented');
    },
  });
};

/**
 * Send a message
 */
export const useSendMessage = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      type = 'text',
    }: {
      conversationId: string;
      content: string;
      type?: 'text' | 'image' | 'document';
    }) => {
      // ── PRODUCTION ──
      // const userId = await getCurrentUserId();
      // const { data, error } = await supabase
      //   .from('messages')
      //   .insert({ conversation_id: conversationId, sender_id: userId, content, type })
      //   .select()
      //   .single();
      // if (error) throw error;
      //
      // // Update conversation last_message
      // await supabase.from('conversations').update({
      //   last_message: content,
      //   last_message_at: new Date().toISOString(),
      // }).eq('id', conversationId);
      //
      // return data;

      return { id: `msg-${Date.now()}`, content };
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.chatMessages(variables.conversationId) });
      qc.invalidateQueries({ queryKey: queryKeys.chatThreads });
    },
  });
};

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Fetch notifications for current user
 */
export const useNotifications = () => {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async (): Promise<Notification[]> => {
      // ── PRODUCTION ──
      // const userId = await getCurrentUserId();
      // const { data, error } = await supabase
      //   .from('notifications')
      //   .select('*')
      //   .eq('user_id', userId)
      //   .order('created_at', { ascending: false })
      //   .limit(50);
      // if (error) throw error;
      // return data;

      throw new Error('Not implemented');
    },
  });
};

/**
 * Mark notifications as read
 */
export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds: string[]) => {
      // ── PRODUCTION ──
      // const { error } = await supabase
      //   .from('notifications')
      //   .update({ is_read: true })
      //   .in('id', notificationIds);
      // if (error) throw error;

      return { notificationIds };
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
export const useUnreadNotificationCount = () => {
  return useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: async (): Promise<number> => {
      // ── PRODUCTION ──
      // const userId = await getCurrentUserId();
      // const { count, error } = await supabase
      //   .from('notifications')
      //   .select('*', { count: 'exact', head: true })
      //   .eq('user_id', userId)
      //   .eq('is_read', false);
      // if (error) throw error;
      // return count ?? 0;

      return 3; // mock badge count
    },
    // Poll every 30 seconds for badge updates
    refetchInterval: 30 * 1000,
  });
};

// ═══════════════════════════════════════════════════════════════
// FIND / SEARCH HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Search for pros (FindTab)
 */
export const useFindPros = (query: string, role: string, sort: string) => {
  return useQuery({
    queryKey: queryKeys.findPros(query, role, sort),
    queryFn: async (): Promise<Profile[]> => {
      // ── PRODUCTION ──
      // let q = supabase
      //   .from('profiles')
      //   .select('*')
      //   .neq('role', 'agent'); // exclude agents from search
      //
      // if (role !== 'All') q = q.eq('display_role', role);
      // if (query) q = q.or(`name.ilike.%${query}%,company.ilike.%${query}%`);
      //
      // // Sort
      // switch (sort) {
      //   case 'Most Vouched': q = q.order('vouch_count', { ascending: false }); break;
      //   case 'Highest Rated': q = q.order('rating', { ascending: false }); break;
      //   // 'Nearest' and 'Fastest Closing' need PostGIS / computed columns
      // }
      //
      // const { data, error } = await q.limit(30);
      // if (error) throw error;
      // return data;

      throw new Error('Not implemented');
    },
    // Debounce: don't fire until user stops typing for 300ms
    // Handled by the screen via useDebounce hook
  });
};
