// features/partners/hooks/usePartnerData.ts
// What: All partner-specific TanStack Query hooks — queries + mutations
// Who: Partner role users (Title/Escrow, Mortgage Pro)
// Where: Consumed by HomeTabPartner, PartnerDealsScreen
// @demo All hooks return mock data — RPCs not yet deployed
// @backend RPCs listed below each hook (signatures for future backend session)

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PARTNER_TRACK_ENABLED } from '../../../lib/config';
import { isMilestoneStale } from '../lib/dealMilestones';
import type {
  PartnerActiveDeal,
  PartnerStats,
  PartnerRole,
  MilestoneStatus,
  AlertType,
  PartnerConnectionRequest,
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
 * @backend rpc_get_partner_active_deals(p_partner_id: string)
 * Returns: PartnerActiveDeal[] with milestones + undismissed alerts joined
 * Note: RPC not yet deployed — demo mode returns mock data
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

      // @backend rpc_get_partner_active_deals(p_partner_id)
      // When wired: try { supabase.rpc(...) } catch { return MOCK_DEALS }
      return MOCK_DEALS;
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
 * @backend rpc_get_partner_stats(p_partner_id: string)
 * Returns: PartnerStats
 * Note: RPC not yet deployed — demo mode returns mock stats
 */
export function usePartnerStats(partnerId: string) {
  return useQuery({
    queryKey: ['partner_stats', partnerId],
    queryFn: async (): Promise<PartnerStats> => {
      // @demo — return mock stats with positive trends
      return MOCK_STATS;
    },
    enabled: !!partnerId,
  });
}

/**
 * Fetches pending connection requests for a partner.
 * @backend rpc_get_connection_requests(p_partner_id: string)
 * Returns: PartnerConnectionRequest[]
 * Note: RPC not yet deployed — demo mode returns mock requests
 */
export function usePartnerConnectionRequests(partnerId: string) {
  return useQuery({
    queryKey: ['partner_connection_requests', partnerId],
    queryFn: async (): Promise<PartnerConnectionRequest[]> => {
      // @demo — return mock connection requests
      return MOCK_CONNECTION_REQUESTS;
    },
    enabled: !!partnerId,
  });
}

// ─────────────────────────────────────────────────────────────────
// MUTATION HOOKS
// ─────────────────────────────────────────────────────────────────

/**
 * Toggles the partner's accepting_clients status.
 * @backend rpc_toggle_accepting_clients(p_accepting: boolean)
 * Optimistic update on profiles query.
 * Invalidates: ['profile', partnerId]
 */
export function useToggleAcceptingClients() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ partnerId, accepting }: { partnerId: string; accepting: boolean }) => {
      // @backend rpc_toggle_accepting_clients(p_accepting: boolean)
      // When wired: await supabase.rpc('rpc_toggle_accepting_clients', { p_accepting: accepting })
      console.log(`[useToggleAcceptingClients] @demo toggling to ${accepting} for ${partnerId}`);
      return { accepting };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['profile', variables.partnerId] });
    },
  });
}

/**
 * Updates a milestone's status (pending → in_progress → complete).
 * @backend rpc_update_milestone_status(p_milestone_id: string, p_status: MilestoneStatus, p_completed_at: string | null)
 * p_completed_at: ISO string when status = 'complete', null otherwise
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
      // @backend rpc_update_milestone_status(p_milestone_id, p_status, p_completed_at)
      console.log(`[useUpdateMilestoneStatus] @demo ${milestoneId} → ${status}`);
      return { milestoneId, status, completedAt };
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
 * @backend rpc_post_deal_alert(p_job_id: string, p_alert_type: AlertType, p_message: string, p_expires_at: string | null)
 * p_expires_at: ISO string for rate_lock_expiry, null for all other types
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
    }: {
      jobId: string;
      alertType: AlertType;
      message: string;
      expiresAt: string | null;
      partnerId: string;
    }) => {
      // @backend rpc_post_deal_alert(p_job_id, p_alert_type, p_message, p_expires_at)
      console.log(`[usePostDealAlert] @demo posting ${alertType} to ${jobId}`);
      return {
        id: `alert-${Date.now()}`,
        job_id: jobId,
        partner_id: partnerId,
        alert_type: alertType,
        message,
        expires_at: expiresAt,
        dismissed_at: null,
        created_at: new Date().toISOString(),
      };
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
 * @backend rpc_dismiss_deal_alert(p_alert_id: string)
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
      // @backend rpc_dismiss_deal_alert(p_alert_id)
      console.log(`[useDismissDealAlert] @demo dismissing ${alertId}`);
      return { alertId };
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
