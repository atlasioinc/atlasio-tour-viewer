// features/partners/lib/dealMilestones.ts
// What: Milestone set configs and alert type configs keyed by partner role
// Who: Used by HomeTabPartner, PartnerDealsScreen, rpc_seed_deal_milestones
// Where: Central config — both screens read from here (single source of truth)
// @demo All data here is config, not mock data — safe for production

import type { MilestoneConfig, AlertTypeConfig, PartnerRole, AgentDealPartner } from '../types/partner.types';

// ─────────────────────────────────────────────────────────────────
// MILESTONE SETS — keyed by profiles.role value
// stale_days: days a milestone can sit in_progress before the
// Home tab surfaces the deal in "Needs Attention"
// ─────────────────────────────────────────────────────────────────

export const STANDARD_MILESTONES: Record<PartnerRole, MilestoneConfig[]> = {
  'Title/Escrow': [
    { key: 'title_search',      label: 'Title search',      sort_order: 0, stale_days: 3 },
    { key: 'lien_search',       label: 'Lien search',       sort_order: 1, stale_days: 3 },
    { key: 'title_commitment',  label: 'Title commitment',  sort_order: 2, stale_days: 3 },
    { key: 'clear_to_close',    label: 'Clear to close',    sort_order: 3, stale_days: 2 },
    { key: 'closing_docs',      label: 'Closing docs sent', sort_order: 4, stale_days: 1 },
  ],
  'Mortgage Pro': [
    { key: 'pre_approval',        label: 'Pre-approval confirmed',  sort_order: 0, stale_days: 3 },
    { key: 'app_submitted',       label: 'Application submitted',   sort_order: 1, stale_days: 3 },
    { key: 'appraisal_ordered',   label: 'Appraisal ordered',       sort_order: 2, stale_days: 5 },
    { key: 'appraisal_complete',  label: 'Appraisal complete',      sort_order: 3, stale_days: 5 },
    { key: 'underwriting',        label: 'Underwriting submitted',  sort_order: 4, stale_days: 7 },
    { key: 'conditional_approval',label: 'Conditional approval',    sort_order: 5, stale_days: 4 },
    { key: 'clear_to_close',      label: 'Clear to close',          sort_order: 6, stale_days: 2 },
    { key: 'loan_docs_sent',      label: 'Loan docs sent',          sort_order: 7, stale_days: 1 },
  ],
  // Future roles — stubs only, built in a future session
  'Home Inspector': [],
  'Appraiser':      [],
  'Warranty':       [],
};

// ─────────────────────────────────────────────────────────────────
// ALERT TYPES — keyed by profiles.role value
// Mortgage Pro gets rate_lock_expiry (requires date picker)
// Title/Escrow gets the remaining 3 types only
// ─────────────────────────────────────────────────────────────────

export const ALERT_TYPES_BY_ROLE: Record<PartnerRole, AlertTypeConfig[]> = {
  'Title/Escrow': [
    { type: 'condition_needed',    label: 'Condition needed',    requiresDate: false },
    { type: 'closing_cost_change', label: 'Closing cost change', requiresDate: false },
    { type: 'custom',              label: 'Custom note',         requiresDate: false },
  ],
  'Mortgage Pro': [
    { type: 'rate_lock_expiry',    label: 'Rate lock expiry',    requiresDate: true  },
    { type: 'condition_needed',    label: 'Condition needed',    requiresDate: false },
    { type: 'closing_cost_change', label: 'Closing cost change', requiresDate: false },
    { type: 'custom',              label: 'Custom note',         requiresDate: false },
  ],
  'Home Inspector': [],
  'Appraiser':      [],
  'Warranty':       [],
};

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/**
 * Returns true if a milestone should surface a deal on the Home tab
 * as "Needs Attention" based on how long it has been in_progress.
 * Compares updated_at against the milestone's stale_days config.
 */
export function isMilestoneStale(
  milestone: { status: string; updated_at: string; milestone_key: string },
  role: PartnerRole,
): boolean {
  if (milestone.status !== 'in_progress') return false;
  const config = STANDARD_MILESTONES[role]?.find(m => m.key === milestone.milestone_key);
  if (!config) return false;
  const updatedAt = new Date(milestone.updated_at);
  const now = new Date();
  const daysDiff = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysDiff >= config.stale_days;
}

/**
 * Returns days remaining until rate lock expiry.
 * Returns null if expires_at is not set.
 * Negative values mean already expired.
 */
export function getRateLockDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  const now = new Date();
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Rate lock escalation threshold.
 * <= 5 days: danger state (red badge in card header + red banner)
 * > 5 days: warning state (amber banner only, no header badge)
 */
export const RATE_LOCK_DANGER_THRESHOLD_DAYS = 5;

// ─────────────────────────────────────────────────────────────────
// STATUS DOT — per-partner status for deal cards (extracted S66)
// Priority: red (alert) > amber (stale) > green (on track) > gray (no milestones)
// Used by: HomeTabAgent deal cards, AgentDealsScreen pipeline cards
// ─────────────────────────────────────────────────────────────────

export type SlotStatusDot = 'red' | 'amber' | 'green' | 'gray';

export function getSlotStatusDot(
  partner: AgentDealPartner,
  role: PartnerRole,
): SlotStatusDot {
  if (!(partner.milestones ?? []).length) return 'gray';
  const hasAlert = (partner.alerts ?? []).some(a => !a.dismissed_at);
  if (hasAlert) return 'red';
  const hasStale = (partner.milestones ?? []).some(m => isMilestoneStale(m, role));
  if (hasStale) return 'amber';
  return 'green';
}
