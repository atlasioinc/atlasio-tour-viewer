// features/partners/hooks/usePartnerData.ts
// What: All partner-specific TanStack Query hooks — queries + mutations
// Who: Partner role users (Title/Escrow, Mortgage Pro)
// Where: Consumed by HomeTabPartner, PartnerDealsScreen
// S90: 7 of 9 hooks wired to live Supabase RPCs (with mock fallback)
// 2 hooks intentionally deferred: usePartnerInvitations, useRespondToDealInvitation
// @backend RPCs listed below each hook — all wired hooks have try/catch with mock fallback

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';
import { PARTNER_TRACK_ENABLED } from '../../../lib/config';
import { isMilestoneStale } from '../lib/dealMilestones';
import type {
  PartnerActiveDeal,
  PartnerStats,
  PartnerRole,
  MilestoneStatus,
  AlertType,
  PartnerConnectionRequest,
  ConnectionRequestItem,
  DealInvitationItem,
  PartnerInvitationsResponse,
} from '../types/partner.types';

// ─────────────────────────────────────────────────────────────────
// MOCK DATA — realistic Denver, CO deals
// @demo All mock data below — replace with live RPCs when deployed
// ─────────────────────────────────────────────────────────────────

const now = new Date();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

// @demo Deal 1 — Mortgage Pro, urgent rate lock
const MOCK_DEAL_1: PartnerActiveDeal = {
  job_id: 'deal-001',
  transaction_id: 'mock-txn-partner-001', // @demo hardcoded — replace with real transaction_id from rpc_create_transaction
  address: '1203 Rosewood Dr, #4, Denver CO',
  agent_name: 'Priya Patel',
  closing_date: daysFromNow(28),
  milestones: [
    { id: 'ms-001', job_id: 'deal-001', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'pre_approval',       milestone_label: 'Pre-approval confirmed', status: 'complete',     sort_order: 0, completed_at: daysAgo(14), updated_at: daysAgo(14), created_at: daysAgo(30) },
    { id: 'ms-002', job_id: 'deal-001', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'app_submitted',       milestone_label: 'Application submitted',  status: 'complete',     sort_order: 1, completed_at: daysAgo(10), updated_at: daysAgo(10), created_at: daysAgo(30) },
    { id: 'ms-003', job_id: 'deal-001', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'appraisal_ordered',   milestone_label: 'Appraisal ordered',      status: 'complete',     sort_order: 2, completed_at: daysAgo(7),  updated_at: daysAgo(7),  created_at: daysAgo(30) },
    { id: 'ms-004', job_id: 'deal-001', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'appraisal_complete',  milestone_label: 'Appraisal complete',     status: 'in_progress', sort_order: 3, completed_at: null,        updated_at: daysAgo(2),  created_at: daysAgo(30) },
    { id: 'ms-005', job_id: 'deal-001', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'underwriting',        milestone_label: 'Underwriting submitted', status: 'pending',      sort_order: 4, completed_at: null,        updated_at: daysAgo(30), created_at: daysAgo(30) },
    { id: 'ms-006', job_id: 'deal-001', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'conditional_approval',milestone_label: 'Conditional approval',   status: 'pending',      sort_order: 5, completed_at: null,        updated_at: daysAgo(30), created_at: daysAgo(30) },
    { id: 'ms-007', job_id: 'deal-001', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'clear_to_close',      milestone_label: 'Clear to close',         status: 'pending',      sort_order: 6, completed_at: null,        updated_at: daysAgo(30), created_at: daysAgo(30) },
    { id: 'ms-008', job_id: 'deal-001', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'loan_docs_sent',      milestone_label: 'Loan docs sent',         status: 'pending',      sort_order: 7, completed_at: null,        updated_at: daysAgo(30), created_at: daysAgo(30) },
  ],
  alerts: [
    {
      id: 'alert-001',
      job_id: 'deal-001',
      partner_id: 'partner-1',
      alert_type: 'rate_lock_expiry',
      message: 'Rate lock expires soon \u2014 buyer must confirm loan docs immediately',
      expires_at: daysFromNow(3),
      dismissed_at: null,
      created_at: daysAgo(5),
    },
  ],
};

// @demo Deal 2 — Title/Escrow, stale milestone (title_commitment in_progress 4 days, threshold 3)
const MOCK_DEAL_2: PartnerActiveDeal = {
  job_id: 'deal-002',
  transaction_id: 'mock-txn-partner-002', // @demo hardcoded — replace with real transaction_id from rpc_create_transaction
  address: '4821 Birchwood Ave, Denver CO',
  agent_name: 'Marcus Webb',
  closing_date: daysFromNow(12),
  milestones: [
    { id: 'ms-010', job_id: 'deal-002', partner_id: 'partner-1', partner_role: 'Title/Escrow', milestone_key: 'title_search',     milestone_label: 'Title search',      status: 'complete',     sort_order: 0, completed_at: daysAgo(8), updated_at: daysAgo(8), created_at: daysAgo(14) },
    { id: 'ms-011', job_id: 'deal-002', partner_id: 'partner-1', partner_role: 'Title/Escrow', milestone_key: 'lien_search',      milestone_label: 'Lien search',       status: 'complete',     sort_order: 1, completed_at: daysAgo(6), updated_at: daysAgo(6), created_at: daysAgo(14) },
    { id: 'ms-012', job_id: 'deal-002', partner_id: 'partner-1', partner_role: 'Title/Escrow', milestone_key: 'title_commitment', milestone_label: 'Title commitment',  status: 'in_progress', sort_order: 2, completed_at: null,       updated_at: daysAgo(4), created_at: daysAgo(14) },
    { id: 'ms-013', job_id: 'deal-002', partner_id: 'partner-1', partner_role: 'Title/Escrow', milestone_key: 'clear_to_close',   milestone_label: 'Clear to close',    status: 'pending',      sort_order: 3, completed_at: null,       updated_at: daysAgo(14), created_at: daysAgo(14) },
    { id: 'ms-014', job_id: 'deal-002', partner_id: 'partner-1', partner_role: 'Title/Escrow', milestone_key: 'closing_docs',     milestone_label: 'Closing docs sent', status: 'pending',      sort_order: 4, completed_at: null,       updated_at: daysAgo(14), created_at: daysAgo(14) },
  ],
  alerts: [],
};

// @demo Deal 3 — Clean deal, no alerts, not stale
const MOCK_DEAL_3: PartnerActiveDeal = {
  job_id: 'deal-003',
  transaction_id: 'mock-txn-partner-003', // @demo hardcoded — replace with real transaction_id from rpc_create_transaction
  address: '887 Maple Canyon Rd, Denver CO',
  agent_name: 'Dani Torres',
  closing_date: daysFromNow(45),
  milestones: [
    { id: 'ms-020', job_id: 'deal-003', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'pre_approval',     milestone_label: 'Pre-approval confirmed', status: 'complete',     sort_order: 0, completed_at: daysAgo(3), updated_at: daysAgo(3), created_at: daysAgo(7) },
    { id: 'ms-021', job_id: 'deal-003', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'app_submitted',    milestone_label: 'Application submitted',  status: 'in_progress', sort_order: 1, completed_at: null,       updated_at: daysAgo(1), created_at: daysAgo(7) },
    { id: 'ms-022', job_id: 'deal-003', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'appraisal_ordered',milestone_label: 'Appraisal ordered',      status: 'pending',      sort_order: 2, completed_at: null,       updated_at: daysAgo(7), created_at: daysAgo(7) },
    { id: 'ms-023', job_id: 'deal-003', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'appraisal_complete',milestone_label: 'Appraisal complete',    status: 'pending',      sort_order: 3, completed_at: null,       updated_at: daysAgo(7), created_at: daysAgo(7) },
    { id: 'ms-024', job_id: 'deal-003', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'underwriting',     milestone_label: 'Underwriting submitted', status: 'pending',      sort_order: 4, completed_at: null,       updated_at: daysAgo(7), created_at: daysAgo(7) },
    { id: 'ms-025', job_id: 'deal-003', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'conditional_approval',milestone_label: 'Conditional approval', status: 'pending',      sort_order: 5, completed_at: null,       updated_at: daysAgo(7), created_at: daysAgo(7) },
    { id: 'ms-026', job_id: 'deal-003', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'clear_to_close',   milestone_label: 'Clear to close',         status: 'pending',      sort_order: 6, completed_at: null,       updated_at: daysAgo(7), created_at: daysAgo(7) },
    { id: 'ms-027', job_id: 'deal-003', partner_id: 'partner-1', partner_role: 'Mortgage Pro', milestone_key: 'loan_docs_sent',   milestone_label: 'Loan docs sent',         status: 'pending',      sort_order: 7, completed_at: null,       updated_at: daysAgo(7), created_at: daysAgo(7) },
  ],
  alerts: [],
};

const MOCK_DEALS: PartnerActiveDeal[] = [MOCK_DEAL_1, MOCK_DEAL_2, MOCK_DEAL_3];

// @demo Mock stats — realistic positive trends
const MOCK_STATS: PartnerStats = {
  profile_views: 142,
  profile_views_trend: 12,
  search_appearances: 387,
  search_appearances_trend: 8,
  vouches_received: 23,
  vouches_received_trend: 15,
};

// @demo Mock connection requests
const MOCK_CONNECTION_REQUESTS: PartnerConnectionRequest[] = [
  { id: 'cr-001', requester_id: 'agent-101', name: 'Sarah Chen', company: 'Keller Williams', role: 'Agent', avatar_color: '#3B82F6', has_mutual_vouches: true, created_at: daysAgo(1) },
  { id: 'cr-002', requester_id: 'agent-102', name: 'James Thornton', company: 'RE/MAX Alliance', role: 'Agent', avatar_color: '#8B5CF6', has_mutual_vouches: false, created_at: daysAgo(2) },
  { id: 'cr-003', requester_id: 'agent-103', name: 'Maria Gonzalez', company: 'Compass', role: 'Agent', avatar_color: '#EC4899', has_mutual_vouches: true, created_at: daysAgo(3) },
];

// ─────────────────────────────────────────────────────────────────
// QUERY HOOKS
// ─────────────────────────────────────────────────────────────────

/**
 * Fetches all active deals for a partner, sorted by closing_date ASC nulls last.
 * STATUS: wired (with mock fallback)
 * @backend rpc_get_partner_active_deals — no params, uses auth.uid() server-side
 * Returns: PartnerActiveDeal[] with milestones + undismissed alerts joined
 */
export function usePartnerActiveDeals(partnerId: string) {
  return useQuery({
    queryKey: ['partner_active_deals', partnerId],
    queryFn: async (): Promise<PartnerActiveDeal[]> => {
      if (!PARTNER_TRACK_ENABLED) {
        // @demo — return mock deals sorted by closing_date ASC, nulls last
        return [...MOCK_DEALS].sort((a, b) => {
          if (!a.closing_date) return 1;
          if (!b.closing_date) return -1;
          return new Date(a.closing_date).getTime() - new Date(b.closing_date).getTime();
        });
      }

      try {
        // @backend rpc_get_partner_active_deals — no params, uses auth.uid()
        const { data, error } = await supabase.rpc('rpc_get_partner_active_deals');
        if (error) throw error;
        return (data as PartnerActiveDeal[]) ?? MOCK_DEALS;
      } catch {
        console.warn('[usePartnerActiveDeals] Supabase failed, using mock fallback');
        return MOCK_DEALS;
      }
    },
    enabled: !!partnerId,
  });
}

/**
 * Derives from usePartnerActiveDeals — filters client-side for deals
 * with stale milestones or undismissed alerts.
 * No separate RPC needed — pure client-side derivation.
 */
export function usePartnerNeedsAttention(partnerId: string, role: PartnerRole) {
  const { data: allDeals, ...rest } = usePartnerActiveDeals(partnerId);

  const needsAttentionDeals = allDeals?.filter(deal => {
    // Deal has undismissed alerts
    const hasAlerts = deal.alerts.length > 0;

    // Deal has a stale milestone (in_progress past stale_days threshold)
    const hasStaleMilestone = deal.milestones.some(ms => isMilestoneStale(ms, role));

    return hasAlerts || hasStaleMilestone;
  }) ?? [];

  return { data: needsAttentionDeals, allDeals, ...rest };
}

/**
 * Fetches partner visibility stats for the current month.
 * STATUS: wired (with mock fallback)
 * @backend rpc_get_partner_stats — no params, uses auth.uid() server-side
 * NOTE: profile_views + search_appearances return 0 from RPC
 * Flagged S62b for product review before partner launch — real tracking not yet implemented
 * Returns: PartnerStats
 */
export function usePartnerStats(partnerId: string) {
  return useQuery({
    queryKey: ['partner_stats', partnerId],
    queryFn: async (): Promise<PartnerStats> => {
      if (!PARTNER_TRACK_ENABLED) {
        // @demo — return mock stats with positive trends
        return MOCK_STATS;
      }

      try {
        // @backend rpc_get_partner_stats — NOTE: profile_views + search_appearances return 0
        // Flagged S62b for product review before partner launch — real tracking not yet implemented
        const { data, error } = await supabase.rpc('rpc_get_partner_stats');
        if (error) throw error;
        return (data as PartnerStats) ?? MOCK_STATS;
      } catch {
        console.warn('[usePartnerStats] Supabase failed, using mock fallback');
        return MOCK_STATS;
      }
    },
    enabled: !!partnerId,
  });
}

/**
 * Fetches pending connection requests for a partner.
 * STATUS: wired (with mock fallback)
 * @backend rpc_get_connection_requests — no params, uses auth.uid() server-side
 * Returns: PartnerConnectionRequest[]
 */
export function usePartnerConnectionRequests(partnerId: string) {
  return useQuery({
    queryKey: ['connection_requests', partnerId],
    queryFn: async (): Promise<PartnerConnectionRequest[]> => {
      if (!PARTNER_TRACK_ENABLED) {
        // @demo — return mock connection requests
        return MOCK_CONNECTION_REQUESTS;
      }

      try {
        // @backend rpc_get_connection_requests — no params, uses auth.uid()
        const { data, error } = await supabase.rpc('rpc_get_connection_requests');
        if (error) throw error;
        return (data as PartnerConnectionRequest[]) ?? MOCK_CONNECTION_REQUESTS;
      } catch {
        console.warn('[usePartnerConnectionRequests] Supabase failed, using mock fallback');
        return MOCK_CONNECTION_REQUESTS;
      }
    },
    enabled: !!partnerId,
  });
}

// ─────────────────────────────────────────────────────────────────
// INVITATION DATA (S64b — unified invitations feed)
// @demo All mock data below — replace with rpc_get_partner_invitations() in production
// ─────────────────────────────────────────────────────────────────

// @demo hardcoded — replace with real data in production
const MOCK_PARTNER_INVITATIONS: PartnerInvitationsResponse = {
  connection_requests: [
    {
      item_type: 'connection_request' as const,
      id: 'mock-conn-001',
      requester_id: 'mock-agent-001',
      requester_name: 'Rachel Williams',
      requester_role: 'Real Estate Agent',
      requester_company: 'Coldwell Banker',
      requester_avatar_color: '#7BA3C9',
      note: 'Would love to work together on future listings.',
      created_at: new Date().toISOString(),
    },
  ],
  deal_invitations: [
    {
      item_type: 'deal_invitation' as const,
      id: 'mock-txn-partner-001',
      transaction_id: 'mock-txn-001',
      partner_role: 'title_escrow',
      invited_at: new Date().toISOString(),
      property_address: '2847 Maple Street, Denver, CO',
      closing_date: '2026-04-15',
      contract_price: 485000,
      agent_id: 'mock-agent-001',
      agent_name: 'Rachel Williams',
      agent_company: 'Coldwell Banker',
      agent_avatar_color: '#7BA3C9',
    },
  ],
  total_count: 2,
};

/**
 * Fetches all pending invitations for a partner — both connection requests and deal invitations.
 * STATUS: mock — intentionally deferred
 * @backend rpc_get_partner_invitations — RPC NOT YET DEPLOYED
 * Wire in dedicated backend session before partner launch
 * Returns: PartnerInvitationsResponse { connection_requests, deal_invitations, total_count }
 * NOTE: anchors to transaction_id (S64+). job_id preserved for backward compat only.
 * Query key: ['partner_invitations']
 */
export function usePartnerInvitations() {
  return useQuery({
    queryKey: ['partner_invitations'],
    queryFn: async (): Promise<PartnerInvitationsResponse> => {
      // @demo — return mock invitations
      // @backend rpc_get_partner_invitations() — uses auth.uid() internally
      return MOCK_PARTNER_INVITATIONS;
    },
    enabled: PARTNER_TRACK_ENABLED || true, // always enabled in demo mode
  });
}

// ─────────────────────────────────────────────────────────────────
// MUTATION HOOKS
// ─────────────────────────────────────────────────────────────────

/**
 * Toggles the partner's accepting_clients status.
 * STATUS: wired (with mock fallback)
 * @backend rpc_toggle_accepting_clients — params: { p_accepting: boolean }
 * Optimistic update on profiles query.
 * Invalidates: ['partner_stats'], ['profile', partnerId]
 */
export function useToggleAcceptingClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ partnerId, accepting }: { partnerId: string; accepting: boolean }) => {
      try {
        // @backend rpc_toggle_accepting_clients — params: { p_accepting: boolean }
        const { data, error } = await supabase.rpc('rpc_toggle_accepting_clients', { p_accepting: accepting });
        if (error) throw error;
        return data ?? { accepting };
      } catch {
        console.warn(`[useToggleAcceptingClients] Supabase failed, mock toggling to ${accepting}`);
        return { accepting };
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner_stats', variables.partnerId] });
      queryClient.invalidateQueries({ queryKey: ['profile', variables.partnerId] });
    },
  });
}

/**
 * Updates a milestone's status (pending → in_progress → complete).
 * STATUS: wired (with mock fallback)
 * @backend rpc_update_milestone_status — params: { p_milestone_id: string, p_status: MilestoneStatus }
 * Optimistic update: updates milestone in partner_active_deals cache immediately.
 * Invalidates: ['partner_active_deals', partnerId]
 */
export function useUpdateMilestoneStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      milestoneId,
      status,
      completedAt,
      partnerId,
    }: {
      milestoneId: string;
      status: MilestoneStatus;
      completedAt: string | null;
      partnerId: string;
    }) => {
      try {
        // @backend rpc_update_milestone_status — params: { p_milestone_id, p_status }
        const { data, error } = await supabase.rpc('rpc_update_milestone_status', {
          p_milestone_id: milestoneId,
          p_status: status,
        });
        if (error) throw error;
        return data ?? { milestoneId, status, completedAt };
      } catch {
        console.warn(`[useUpdateMilestoneStatus] Supabase failed, mock ${milestoneId} → ${status}`);
        return { milestoneId, status, completedAt };
      }
    },
    onMutate: async (variables) => {
      // Optimistic update — cycle milestone in cache
      await queryClient.cancelQueries({ queryKey: ['partner_active_deals', variables.partnerId] });
      const previous = queryClient.getQueryData<PartnerActiveDeal[]>(['partner_active_deals', variables.partnerId]);

      queryClient.setQueryData<PartnerActiveDeal[]>(
        ['partner_active_deals', variables.partnerId],
        (old) => old?.map(deal => ({
          ...deal,
          milestones: deal.milestones.map(ms =>
            ms.id === variables.milestoneId
              ? { ...ms, status: variables.status, completed_at: variables.completedAt, updated_at: new Date().toISOString() }
              : ms,
          ),
        })),
      );

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['partner_active_deals', variables.partnerId], context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner_active_deals', variables.partnerId] });
    },
  });
}

/**
 * Posts a new alert to a deal (visible to the agent).
 * STATUS: wired (with mock fallback)
 * @backend rpc_post_deal_alert — params: { p_job_id, p_transaction_id?, p_alert_type, p_message, p_expires_at? }
 * p_expires_at: ISO string for rate_lock_expiry, null for all other types
 * p_transaction_id: anchors alert to a transaction when provided
 * Invalidates: ['partner_active_deals', partnerId]
 */
export function usePostDealAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      alertType,
      message,
      expiresAt,
      partnerId,
      transactionId,
    }: {
      jobId: string;
      alertType: AlertType;
      message: string;
      expiresAt: string | null;
      partnerId: string;
      transactionId?: string;
    }) => {
      const mockResult = {
        id: `alert-${Date.now()}`,
        job_id: jobId,
        partner_id: partnerId,
        alert_type: alertType,
        message,
        expires_at: expiresAt,
        transaction_id: transactionId ?? null,
        dismissed_at: null,
        created_at: new Date().toISOString(),
      };

      try {
        // @backend rpc_post_deal_alert — params: { p_job_id, p_transaction_id, p_alert_type, p_message, p_expires_at }
        const { data, error } = await supabase.rpc('rpc_post_deal_alert', {
          p_job_id: jobId,
          p_transaction_id: transactionId ?? null,
          p_alert_type: alertType,
          p_message: message,
          p_expires_at: expiresAt,
        });
        if (error) throw error;
        return data ?? mockResult;
      } catch {
        console.warn(`[usePostDealAlert] Supabase failed, mock posting ${alertType} to ${jobId}`);
        return mockResult;
      }
    },
    onMutate: async (variables) => {
      // Optimistic: add alert to deal in cache
      await queryClient.cancelQueries({ queryKey: ['partner_active_deals', variables.partnerId] });
      const previous = queryClient.getQueryData<PartnerActiveDeal[]>(['partner_active_deals', variables.partnerId]);

      queryClient.setQueryData<PartnerActiveDeal[]>(
        ['partner_active_deals', variables.partnerId],
        (old) => old?.map(deal =>
          deal.job_id === variables.jobId
            ? {
                ...deal,
                alerts: [
                  ...deal.alerts,
                  {
                    id: `alert-${Date.now()}`,
                    job_id: variables.jobId,
                    partner_id: variables.partnerId,
                    alert_type: variables.alertType,
                    message: variables.message,
                    expires_at: variables.expiresAt,
                    transaction_id: variables.transactionId ?? null,
                    dismissed_at: null,
                    created_at: new Date().toISOString(),
                  },
                ],
              }
            : deal,
        ),
      );

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['partner_active_deals', variables.partnerId], context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner_active_deals', variables.partnerId] });
    },
  });
}

/**
 * Dismisses a deal alert (writes dismissed_at = NOW()).
 * STATUS: wired (with mock fallback)
 * @backend rpc_dismiss_deal_alert — params: { p_alert_id: string }
 * Optimistic: removes alert from deal in cache.
 * Invalidates: ['partner_active_deals', partnerId]
 */
export function useDismissDealAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      alertId,
      partnerId,
    }: {
      alertId: string;
      partnerId: string;
    }) => {
      try {
        // @backend rpc_dismiss_deal_alert — params: { p_alert_id }
        const { data, error } = await supabase.rpc('rpc_dismiss_deal_alert', { p_alert_id: alertId });
        if (error) throw error;
        return data ?? { alertId };
      } catch {
        console.warn(`[useDismissDealAlert] Supabase failed, mock dismissing ${alertId}`);
        return { alertId };
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['partner_active_deals', variables.partnerId] });
      const previous = queryClient.getQueryData<PartnerActiveDeal[]>(['partner_active_deals', variables.partnerId]);

      queryClient.setQueryData<PartnerActiveDeal[]>(
        ['partner_active_deals', variables.partnerId],
        (old) => old?.map(deal => ({
          ...deal,
          alerts: deal.alerts.filter(a => a.id !== variables.alertId),
        })),
      );

      return { previous };
    },
    onError: (_err, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['partner_active_deals', variables.partnerId], context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner_active_deals', variables.partnerId] });
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// DEAL INVITATION MUTATIONS (S64b)
// ─────────────────────────────────────────────────────────────────

/**
 * Responds to a deal invitation — accept or decline.
 * STATUS: mock — intentionally deferred
 * @backend rpc_respond_to_deal_invitation — RPC NOT YET DEPLOYED
 * Wire in dedicated backend session before partner launch
 * NOTE: anchors to transaction_id (S64+). job_id preserved for backward compat only.
 * On accept: invalidates ['partner_invitations'] + ['partner_active_deals']
 * On decline: invalidates ['partner_invitations'] only
 * @demo mock: 800ms delay → { success: true, response: p_response, milestones_seeded: 5 | 8 | 0 }
 */
export function useRespondToDealInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      transactionPartnerId,
      response,
    }: {
      transactionPartnerId: string;
      response: 'accepted' | 'declined';
    }) => {
      // @demo — 800ms delay to simulate network
      // @backend rpc_respond_to_deal_invitation(p_transaction_partner_id, p_response)
      await new Promise(resolve => setTimeout(resolve, 800));
      console.log(`[useRespondToDealInvitation] @demo ${transactionPartnerId} → ${response}`);
      return {
        success: true,
        response,
        milestones_seeded: response === 'accepted' ? 5 : 0,
      };
    },
    onMutate: async (variables) => {
      // Optimistic: remove invitation card from cache
      await queryClient.cancelQueries({ queryKey: ['partner_invitations'] });
      const previous = queryClient.getQueryData<PartnerInvitationsResponse>(['partner_invitations']);

      queryClient.setQueryData<PartnerInvitationsResponse>(
        ['partner_invitations'],
        (old) => {
          if (!old) return old;
          const filtered = old.deal_invitations.filter(
            inv => inv.id !== variables.transactionPartnerId,
          );
          return {
            ...old,
            deal_invitations: filtered,
            total_count: old.connection_requests.length + filtered.length,
          };
        },
      );

      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['partner_invitations'], context.previous);
      }
    },
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({ queryKey: ['partner_invitations'] });
      if (variables.response === 'accepted') {
        queryClient.invalidateQueries({ queryKey: ['partner_active_deals'] });
      }
    },
  });
}
