// features/partners/types/partner.types.ts
// What: All partner-specific TypeScript interfaces — isolated from types/index.ts
// Who: Partner role users (Title/Escrow, Mortgage Pro, future: Inspector, Appraiser, Warranty)
// Where: Imported by features/partners/** only — never by core agent/contractor code
// @demo PARTNER_TRACK_ENABLED must be false before any commit — these types are pre-launch

// ─────────────────────────────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────────────────────────────

/** Milestone status — maps to deal_milestones.status CHECK constraint */
export type MilestoneStatus = 'pending' | 'in_progress' | 'complete';

/** Partner role — maps to profiles.role values for partner users */
export type PartnerRole = 'Title/Escrow' | 'Mortgage Pro' | 'Home Inspector' | 'Appraiser' | 'Warranty';

/** Alert types — maps to deal_alerts.alert_type CHECK constraint */
export type AlertType = 'rate_lock_expiry' | 'condition_needed' | 'closing_cost_change' | 'custom';

// ─────────────────────────────────────────────────────────────────
// TABLE INTERFACES
// ─────────────────────────────────────────────────────────────────

export interface DealMilestone {
  id: string;
  job_id: string;
  partner_id: string;
  partner_role: PartnerRole;
  milestone_key: string;
  milestone_label: string;
  status: MilestoneStatus;
  sort_order: number;
  completed_at: string | null;   // ISO string when complete, null otherwise
  updated_at: string;
  created_at: string;
}

export interface DealAlert {
  id: string;
  job_id: string;
  partner_id: string;
  alert_type: AlertType;
  message: string;
  expires_at: string | null;     // ISO string — only set for rate_lock_expiry
  dismissed_at: string | null;   // null = active, ISO string = dismissed
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────
// COMPOSITE INTERFACES
// ─────────────────────────────────────────────────────────────────

export interface PartnerActiveDeal {
  job_id: string;
  transaction_id?: string;       // S88: optional — present when deal created via rpc_create_transaction
  address: string;               // property address from jobs table
  agent_name: string;            // from profiles join
  closing_date: string | null;   // ISO date string, nullable
  milestones: DealMilestone[];
  alerts: DealAlert[];           // only undismissed alerts (dismissed_at IS NULL)
}

export interface PartnerStats {
  profile_views: number;
  profile_views_trend: number;   // percentage change vs prior month
  search_appearances: number;
  search_appearances_trend: number;
  vouches_received: number;
  vouches_received_trend: number;
}

// ─────────────────────────────────────────────────────────────────
// CONFIG INTERFACES
// ─────────────────────────────────────────────────────────────────

/** Config shape for a single milestone in the STANDARD_MILESTONES config */
export interface MilestoneConfig {
  key: string;
  label: string;
  sort_order: number;
  stale_days: number;            // days in_progress before surfacing on Home tab as Needs Attention
}

/** Config shape for alert types available per role */
export interface AlertTypeConfig {
  type: AlertType;
  label: string;
  requiresDate: boolean;         // true only for rate_lock_expiry
}

// ─────────────────────────────────────────────────────────────────
// AGENT DEAL BOARD (S63) — agent-side composite for multi-partner views
// ─────────────────────────────────────────────────────────────────

/** A single partner's milestones + alerts within a deal, as seen by the agent */
export interface AgentDealPartner {
  partner_id: string;
  partner_name: string;
  partner_role: PartnerRole;
  partner_avatar_color: string;
  milestones?: DealMilestone[];
  alerts?: DealAlert[];
}

/**
 * Agent-side deal board composite — one deal with multiple partners.
 * Different from PartnerActiveDeal (single partner's view of their own deal).
 * @backend rpc_get_deal_board_for_agent — returns one per active job
 * NOTE: will migrate to transaction_id in S64 when transactions table exists
 */
export interface AgentActiveDeal {
  job_id: string;
  transaction_id?: string;       // S88: optional — present when deal created via rpc_create_transaction
  address: string;
  closing_date: string | null;
  partners: AgentDealPartner[];
}

// ─────────────────────────────────────────────────────────────────
// CONNECTION REQUEST (partner-specific)
// ─────────────────────────────────────────────────────────────────

export interface PartnerConnectionRequest {
  id: string;
  requester_id: string;
  name: string;
  company: string;
  role: string;
  avatar_color: string;
  has_mutual_vouches: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────
// INVITATION ITEMS (S64b — unified invitations feed)
// ─────────────────────────────────────────────────────────────────

/** Connection request card in unified invitations feed */
export interface ConnectionRequestItem {
  item_type: 'connection_request';
  id: string;
  requester_id: string;
  requester_name: string;
  requester_role: string;
  requester_company: string;
  requester_avatar_color: string;
  note: string | null;
  created_at: string;
}

/** Deal invitation card in unified invitations feed */
export interface DealInvitationItem {
  item_type: 'deal_invitation';
  id: string;                      // transaction_partner_id
  transaction_id: string;
  partner_role: string;
  invited_at: string;
  property_address: string;
  closing_date: string | null;
  contract_price: number | null;
  agent_id: string;
  agent_name: string;
  agent_company: string;
  agent_avatar_color: string;
}

/** Discriminated union for rendering both card types in a single list */
export type InvitationItem = ConnectionRequestItem | DealInvitationItem;

/** Response shape from rpc_get_partner_invitations */
export interface PartnerInvitationsResponse {
  connection_requests: ConnectionRequestItem[];
  deal_invitations: DealInvitationItem[];
  total_count: number;
}
