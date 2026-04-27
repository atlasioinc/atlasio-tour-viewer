// ═══════════════════════════════════════════════════════════════
// types/index.ts
// Shared Type Definitions — Single Source of Truth
//
// Every interface maps to one of three categories:
//
//   1:1 TABLE     — mirrors a Supabase table exactly
//                   Profile, PerformanceStats, Vouch, VouchLike, Connection,
//                   Squad, SquadMember, Bid, Job, Review, ChatThread,
//                   ThreadMember, Message, Notification, Report, PushToken,
//                   BlockedUser, JobInvitation
//
//   COMPOSITE     — joins multiple tables for UI display
//                   BidWithProfile (bids + profiles)
//                   ChatThreadView (threads + members + presence)
//                   ProProfileData (profiles + stats + vouches + connections)
//                   ContractorJobDetail (jobs + agent profile + contractor bid)
//                   NetworkContact (profiles + connections)
//
//   FRONTEND-ONLY — exist only in the app, no Supabase counterpart
//                   VouchEntry (compact vouch for profile cards)
//                   Recipient (chat compose picker)
//                   NetworkContractor (invite modal subset)
//
// ENUMS (12) — match Supabase CREATE TYPE definitions exactly
// NAV PARAMS — centralized stack param types for all navigators
//
// Import from here instead of defining interfaces in screen files.
//
// Supabase auto-generation:
//   npx supabase gen types typescript --project-id YOUR_ID > types/supabase.ts
//   Then re-export cleaned versions here.
//
// @backend: all 1:1 and composite types reference sql/schema.sql tables
// ═══════════════════════════════════════════════════════════════

import type { TagValue } from '../components/tagEnums';

// ─────────────────────────────────────────────
// ENUMS — Match Supabase CREATE TYPE definitions
// ─────────────────────────────────────────────

export type UserRole =
  | 'agent'
  | 'mortgage_pro'
  | 'title_escrow'
  | 'home_inspector'
  | 'contractor'
  | 'appraiser'
  | 'transaction_coordinator'
  | 'attorney'
  | 'warranty'
  | 'home_stager'
  | 'real_estate_photographer'
  | 'other';

export type TradeEnum =
  | 'Electrical'
  | 'Plumbing'
  | 'Roofing'
  | 'HVAC'
  | 'Carpentry / Handyman'
  | 'Painting'
  | 'Flooring'
  | 'Windows & Doors'
  | 'Foundation / Structural'
  | 'Drywall / Sheetrock'
  | 'Pest Control / Termite'
  | 'Mold Remediation'
  | 'Sewer / Septic'
  | 'Pool & Spa'
  | 'Chimney / Fireplace'
  | 'Garage Door'
  | 'Appliances'
  | 'Landscaping / Drainage'
  | 'Locksmith / Re-key'
  | 'Cleaning / Junk Removal'
  | 'Driveway / Paving'
  | 'Other';

export type VisibilityEnum = 'public' | 'network_only' | 'private';

export type JobType = 'repair' | 'photography' | 'staging';

export type JobStatus =
  | 'draft'
  | 'open'
  | 'bidding'
  | 'awarded'
  | 'in_progress'
  | 'pending_completion'
  | 'completed'
  | 'cancelled';

export type BidStatus =
  | 'pending'
  | 'edited'
  | 'withdrawn'
  | 'accepted'
  | 'rejected'
  | 'countered'
  | 'expired';

export type ConversationType = 'one_to_one' | 'job_thread' | 'deal_chat';

export type ConnectionStatus = 'pending' | 'accepted' | 'rejected';

export type NotificationType =
  // Networking (3)
  | 'connection_request_received'
  | 'connection_accepted'
  | 'connection_declined'
  // Reputation (2)
  | 'vouch_received'
  | 'mutual_vouch_prompt'
  // Job & Bidding (10)
  | 'invited_to_bid'
  | 'bid_new'
  | 'bid_edited'
  | 'bid_accepted_contractor'
  | 'bid_accepted_agent_confirmation'
  | 'bid_countered'
  | 'counter_resubmitted'
  | 'bid_rejected'
  | 'bid_withdrawn'
  | 'bidding_window_expiring'
  // Job Lifecycle (4)
  | 'contractor_marked_complete'
  | 'agent_confirmed_complete'
  | 'job_expired'
  | 'job_cancelled'
  // Messaging (1)
  | 'message_new';

export type ReportType = 'user' | 'job' | 'bid' | 'message';

export type ReportReason = 'spam' | 'fake' | 'inaccurate' | 'harassment' | 'other';

export type FeeTier = 'free' | 'early_adopter' | 'standard';

export type VerificationLevel = 'none' | 'basic' | 'verified' | 'fully_verified';

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

// ─────────────────────────────────────────────
// USER / PROFILE
// Table: profiles
// ─────────────────────────────────────────────

export interface Profile {
  id: string;                          // uuid, PK — maps to auth.users.id
  name: string;                        // full name
  company: string;
  role: UserRole;                      // enum
  display_role: string;                // human-readable (e.g., "Mortgage Lender")
  location: string;                    // e.g., "Denver, CO"
  bio: string;
  headline: string | null;            // short tagline, max 35 chars — @backend add to profiles table
  avatar_url: string | null;          // Supabase Storage URL
  avatar_color: string;               // fallback color for initials
  rating: number;                      // 0–5, derived from vouches
  vouch_count: number;                 // aggregated count
  tags: TagValue[];                     // enum[] in Supabase
  trades: TradeEnum[];                 // contractors only — 22 specialties
  trade: string | null;               // single primary trade (display convenience)
  licensed: string | null;            // e.g., "Licensed CO"
  active_since: string | null;        // e.g., "2022"
  specialties: string[];              // non-trade specialties (partners)
  languages: string[];               // spoken languages — text[] NOT NULL DEFAULT '{}' (S119c)
  service_area: string | null;        // geographic coverage
  deals_closed: number;               // aggregated count
  phone: string | null;               // never exposed in messages (regex filtered)
  profile_visibility: VisibilityEnum; // visibility preference
  is_visible: boolean;                // profile visibility toggle (app-level)
  is_verified: boolean;               // admin-granted after credential review (badge, not gate)
  is_banned: boolean;                 // blocks all interactions
  credential_urls: string[];          // uploaded license/ID files
  stripe_account_id: string | null;   // Stripe Connect Express ID (contractors only)
  typical_close_days: number | null;  // partner metric
  base_price: number | null;          // cents
  fee_tier: FeeTier;                  // graduated fee tier
  completed_bids_count: number;       // tracks tier progression
  fee_tier_started_at: string | null; // TIMESTAMPTZ
  notification_preferences: Record<string, unknown>; // JSONB
  is_public: boolean;                 // public profile flag
  license_number: string | null;     // state license number
  license_state: string;             // default 'CO'
  license_status: string | null;     // 'pending' | 'verified' | null — set by rpc_submit_license_verification (S47)
  license_verified: boolean;         // verified via ARELLO or manual review
  license_verified_at: string | null; // TIMESTAMPTZ
  phone_verified: boolean;           // verified via OTP
  phone_verified_at: string | null;  // TIMESTAMPTZ
  insurance_uploaded: boolean;       // uploaded insurance doc
  verification_level: VerificationLevel; // derived: none → basic → verified → fully_verified
  deactivated_at: string | null;      // TIMESTAMPTZ — soft delete
  created_at: string;                  // ISO timestamp
  updated_at: string;                  // ISO timestamp
}

// ─────────────────────────────────────────────
// PERFORMANCE STATS
// Table: performance_stats (1:1 with profiles)
// ─────────────────────────────────────────────

export interface PerformanceStats {
  profile_id: string;                  // FK → profiles.id
  completed_jobs: number;
  on_time_rate: number;               // 0–100 percentage
  avg_response_time: string;          // e.g., '<2h'
  updated_at: string;                  // ISO timestamp
}

// ─────────────────────────────────────────────
// VOUCH
// Table: vouches
// ─────────────────────────────────────────────

export interface Vouch {
  id: string;                          // uuid
  author_id: string;                   // FK → profiles.id (who wrote it)
  recipient_id: string;                // FK → profiles.id (who received it)
  review_id: string | null;            // FK → reviews.id
  author_name: string;                 // denormalized for feed display
  recipient_name: string;              // denormalized for feed display
  recipient_company: string | null;    // denormalized for display
  recipient_role: string | null;       // snake_case role enum; convert via roleLabel() for display
  quote: string;                       // the vouch text
  tag: string;                         // category label (e.g., "Contractors")
  tags: string[];                      // additional tags
  likes: number;                       // aggregated count
  avatar_color: string;                // author's avatar fallback
  created_at: string;                  // ISO timestamp
}

// ─────────────────────────────────────────────
// VOUCH ENTRY (compact version for profile cards)
// Derived from vouches table via query
// ─────────────────────────────────────────────

export interface VouchEntry {
  id: string;
  name: string;                        // author name
  quote: string;
  avatar_color?: string;
}

// ─────────────────────────────────────────────
// VOUCH LIKE
// Table: vouch_likes
// ─────────────────────────────────────────────

export interface VouchLike {
  vouch_id: string;                    // FK → vouches.id (PK part 1)
  user_id: string;                     // FK → profiles.id (PK part 2)
  created_at: string;
}

// ─────────────────────────────────────────────
// CONNECTION
// Table: connections
// ─────────────────────────────────────────────

export interface Connection {
  id: string;                          // uuid
  requester_id: string;                // FK → profiles.id
  responder_id: string;                // FK → profiles.id
  status: ConnectionStatus;
  is_in_squad: boolean;                // closing squad membership
  note: string | null;                 // optional connection request note
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// NETWORK CONTACT (view — joined profiles + connections)
// Used by NetworkTab, InviteContractorsModal
// ─────────────────────────────────────────────

export interface NetworkContact {
  id: string;                          // connection or profile id
  profile_id: string;                  // FK → profiles.id
  name: string;
  company: string;
  role: string;                        // display role
  group: string;                       // grouping category
  tags: TagValue[];
  avatar_color: string;
  is_in_squad: boolean;
  tab: 'partners' | 'contractors';
}

// Contractor subset (for invite modal)
export interface NetworkContractor {
  id: string;
  profile_id: string;
  name: string;
  company: string;
  trades: TradeEnum[];
  rating: number;
  avatar_color: string;
}

// ─────────────────────────────────────────────
// SQUAD
// Table: squads, squad_members
// ─────────────────────────────────────────────

export interface Squad {
  id: string;                          // uuid
  name: string;
  owner_id: string;                    // FK → profiles.id (agent who created it)
  created_at: string;
}

export interface SquadMember {
  id: string;                          // uuid
  squad_id: string;                    // FK → squads.id
  profile_id: string;                  // FK → profiles.id
  role: UserRole;                      // member's role
  is_additional: boolean;              // extra slot beyond default
  created_at: string;
}

// ─────────────────────────────────────────────
// JOB (unified — repair, photography, staging)
// Table: jobs
// ─────────────────────────────────────────────

export interface Bid {
  id: string;                          // uuid
  job_id: string;                      // FK → jobs.id
  contractor_id: string;               // FK → profiles.id
  amount: number;                      // cents — all monetary values stored as integers
  counter_amount: number | null;       // agent's counter offer (cents)
  acceptance_fee: number | null;       // graduated fee, calculated by trigger (cents)
  fee_paid: boolean;
  quote: string | null;                // bid note / scope description
  timeline: string | null;             // e.g., "3-5 days"
  message: string;
  response_time: string | null;        // e.g., "2h ago"
  tags: string[];
  status: BidStatus;                   // 7-state lifecycle
  edit_count: number;                  // max 2–3 per bid
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;                          // uuid
  agent_id: string;                    // FK → profiles.id (who posted)
  job_type: JobType;                   // repair | photography | staging
  status: JobStatus;                   // 8-state lifecycle
  title: string;
  description: string;
  address: string;
  due_date: string;                    // DATE
  is_urgent: boolean;
  photo_urls: string[];               // Supabase Storage URLs
  awarded_bid_id: string | null;       // FK → bids.id (set on award)
  bid_deadline: string | null;         // TIMESTAMPTZ — default 48h
  max_bid_edits: number;              // default 3
  invited_contractor_ids: string[];   // FK[] → profiles.id
  // Repair-specific
  trades: TradeEnum[] | null;          // determines which contractors see it
  category: string | null;            // trade category (display convenience)
  budget_min: number | null;           // cents
  budget_max: number | null;           // cents
  budget_range: string | null;         // formatted display (e.g., "$800–$1,200")
  // Photography-specific
  service_packages: string[] | null;
  turnaround_preference: string | null;
  // Staging-specific
  sqft: number | null;
  occupied_or_vacant: string | null;
  rooms_count: number | null;
  staging_scope: string[] | null;
  // Completion flow
  contractor_completed_at: string | null;
  agent_confirmed_at: string | null;
  completion_notes: string | null;
  proof_photo_urls: string[];
  revision_notes: string | null;
  vouch_prompt_sent: boolean;
  // Timestamps
  created_at: string;
  updated_at: string;
  // Joined relation (not a DB column)
  bids: Bid[];
}

// ─────────────────────────────────────────────
// BID WITH PROFILE (composite — for UI display)
// Extends Bid with joined profile fields
// ─────────────────────────────────────────────

export interface BidWithProfile extends Bid {
  name: string;                        // from profiles.name
  company: string;                     // from profiles.company
  trade: string | null;                // from profiles.trade
  is_licensed: boolean;                // derived from profiles.licensed
  avatar_color: string;                // from profiles.avatar_color
  rating: number;                      // from profiles.rating
  price: string;                       // formatted display (e.g., "$1,200")
  has_unread_messages?: boolean;       // derived from unread message count
}

// ─────────────────────────────────────────────
// CONTRACTOR JOB DETAIL
// Composite view: job + agent profile + contractor's bid
// Used by ContractorJobDetails screen
// ─────────────────────────────────────────────

export interface ContractorJobDetail {
  id: string;
  title: string;
  description: string;
  address: string;
  trade: string;
  budgetMin: number;                   // cents
  budgetMax: number;                   // cents
  dueDate: string;
  isUrgent: boolean;
  photos: string[];
  bidCount: number;
  jobStatus: JobStatus;
  // Invite fields — populated when contractor was personally invited
  job_type?: 'open' | 'invite';       // @backend: rpc_get_job_details
  agent_message?: string | null;      // @backend: job_invitations.note
  invited_at?: string | null;         // @backend: rpc_get_job_details → job_invitations.created_at (ISO string)
  agent: {
    id: string;
    name: string;
    company: string;
    avatarColor: string;
    rating: number;
    vouchCount: number;
  };
  myBid?: {
    id: string;
    amount: number;                    // cents
    timelineDays: number;
    notes: string;
    status: BidStatus;
    counterAmount?: number;            // cents
    counterNotes?: string;
  };
}

// ─────────────────────────────────────────────
// REVIEW
// Table: reviews
// ─────────────────────────────────────────────

export interface Review {
  id: string;                          // uuid
  job_id: string;                      // FK → jobs.id
  from_id: string;                     // FK → profiles.id
  to_id: string;                       // FK → profiles.id
  rating: number;                      // 1–5
  comment: string;
  tags: string[];
  is_anonymous: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────
// CHAT / MESSAGING
// Tables: threads, thread_members, messages
// ─────────────────────────────────────────────

export interface ChatThread {
  id: string;                          // uuid
  type: ConversationType;              // one_to_one | job_thread | deal_chat
  name: string | null;                 // display name (group/deal name or contact name)
  job_id: string | null;              // FK → jobs.id (job_thread only)
  property_address: string | null;     // deal_chat only
  closing_date: string | null;         // deal_chat only (DATE)
  is_pinned: boolean;
  is_archived: boolean;               // auto-archive after 30 days inactive
  last_message: string | null;
  last_message_at: string | null;     // TIMESTAMPTZ for sorting
  created_at: string;
}

// ChatThread + derived fields for UI display
export interface ChatThreadView extends ChatThread {
  participants: string[];             // derived from thread_members
  is_unread: boolean;                 // derived from unread message count
  member_count?: number;              // derived
  avatar_colors: string[];            // derived from member profiles
  is_online?: boolean;                // derived from presence
}

export interface ThreadMember {
  thread_id: string;                   // FK → threads.id (PK part 1)
  user_id: string;                     // FK → profiles.id (PK part 2)
  is_muted: boolean;
  joined_at: string;
}

export interface Message {
  id: string;
  thread_id: string;                   // FK → threads.id
  sender_id: string;                   // FK → profiles.id
  sender_name: string;
  content: string;
  type: 'text' | 'image' | 'document' | 'system';
  attachment_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Recipient {
  id: string;
  name: string;
  company: string;
  role: string;
  avatar_color: string;
}

// ─────────────────────────────────────────────
// RPC RESPONSE TYPES — rpc_get_inbox_threads, rpc_get_thread_messages
// @backend These mirror the exact JSON shape returned by the RPCs
// ─────────────────────────────────────────────

/** @backend rpc_get_inbox_threads() — single thread in the response array */
export interface InboxThread {
  thread_id: string;
  type: 'one_to_one' | 'job_thread' | 'deal_chat';
  name: string | null;
  job_id: string | null;
  property_address: string | null;
  closing_date: string | null;
  is_pinned: boolean;
  is_archived: boolean;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
  is_muted: boolean;
  last_read_at: string | null;
  other_member: {
    user_id: string;
    name: string | null;
    avatar_color: string | null;
    avatar_url: string | null;   // S133: now returned by rpc_get_inbox_threads
    company: string | null;
  };
  // S161: all thread members except the current user, ordered by joined_at ASC.
  // Optional for backward compat. Used by adaptInboxThreadToLocal to populate
  // GroupAvatar tiles with real member colors (replaces S160 deriveColor placeholder).
  members?: {
    user_id: string;
    name: string;
    avatar_color: string | null;
    avatar_url: string | null;
  }[];
  unread_count: number;
}

/** @backend rpc_get_thread_messages(p_thread_id) — single message in the response array */
export interface ThreadMessage {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  type: string;
  attachment_url: string | null;
  is_read: boolean;
  created_at: string;
}

// ─────────────────────────────────────────────
// NOTIFICATION
// Table: notifications
// ─────────────────────────────────────────────

export interface Notification {
  id: string;                          // uuid
  user_id: string;                     // FK → profiles.id (recipient)
  type: NotificationType;              // 20 types across 5 groups
  title: string;
  subtitle: string;
  is_read: boolean;
  created_at: string;                  // TIMESTAMPTZ
  avatar_color: string | null;
  avatar_name: string | null;
  action_label: string | null;
  deep_link: string | null;
  // Related entity IDs (foreign keys for deep linking)
  job_id: string | null;               // FK → jobs.id
  thread_id: string | null;            // FK → threads.id
  sender_id: string | null;            // FK → profiles.id
}

// ─────────────────────────────────────────────
// REPORT
// Table: reports
// ─────────────────────────────────────────────

export interface Report {
  id: string;                          // uuid
  reporter_id: string;                 // FK → profiles.id (who filed)
  type: ReportType;                    // what entity is being reported
  reason: ReportReason;
  description: string | null;          // optional details
  reported_user_id: string | null;     // FK → profiles.id
  reported_job_id: string | null;      // FK → jobs.id
  reported_bid_id: string | null;      // FK → bids.id
  reported_message_id: string | null;  // FK → messages.id
  created_at: string;
}

// ─────────────────────────────────────────────
// PUSH TOKEN
// Table: push_tokens (multi-device support)
// ─────────────────────────────────────────────

export type PushPlatform = 'ios' | 'android' | 'web';

export interface PushToken {
  id: string;                          // uuid
  user_id: string;                     // FK → profiles.id
  token: string;                       // Expo push token or web push subscription
  platform: PushPlatform;
  device_name: string | null;         // e.g., "iPhone 15", "Chrome on MacBook"
  is_active: boolean;                  // false on expiry/logout
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// BLOCKED USER
// Table: blocked_users
// ─────────────────────────────────────────────

export interface BlockedUser {
  id: string;                          // uuid
  blocker_id: string;                  // FK → profiles.id
  blocked_id: string;                  // FK → profiles.id
  created_at: string;
}

// ─────────────────────────────────────────────
// JOB INVITATION
// Table: job_invitations
// ─────────────────────────────────────────────

export interface JobInvitation {
  id: string;                          // uuid
  job_id: string;                      // FK → jobs.id
  contractor_id: string;               // FK → profiles.id
  invited_by: string;                  // FK → profiles.id
  status: InvitationStatus;
  note: string | null;
  created_at: string;
  responded_at: string | null;
}

// ─────────────────────────────────────────────
// CLOSED DEAL
// Frontend-only for now — maps to rpc_get_closed_deals when deployed
// @backend rpc_get_closed_deals() — returns closed deals for the agent
// ─────────────────────────────────────────────

export interface ClosedDeal {
  id: string;
  address: string;
  buyerName: string | null;
  salePrice: number | null;
  closingDate: string | null; // ISO date string
}

// ─────────────────────────────────────────────
// PRO PROFILE (composite view for ProProfile screen)
// Joins: profiles + performance_stats + vouches + connections
// ─────────────────────────────────────────────

export interface ProProfileData {
  id: string;
  name: string;
  company: string;
  location: string;
  rating: number;
  vouches: number;
  active_since: string;
  trade: string;
  licensed: string;
  distance: string;
  bio: string;
  avatar_color: string;
  performance_stats: PerformanceStats;
  tags: TagValue[];
  recent_vouches: VouchEntry[];
  is_connected: boolean;
  is_own_profile: boolean;
}

// ─────────────────────────────────────────────
// AGENT ACTIVE JOBS
// Returned by rpc_get_agent_active_jobs — S135b
// ─────────────────────────────────────────────

export interface AgentActiveJob {
  id: string;
  title: string;
  job_type: 'repair' | 'photography' | 'staging';
  status: JobStatus;
  address: string;
  due_date: string;
  is_urgent: boolean;
  budget_min: number | null;
  budget_max: number | null;
  budget_range: string | null;
  trades: string[] | null;
  contractor_completed_at: string | null;
  created_at: string;
  contractor: {
    id: string;
    name: string;
    avatar_color: string;
    company: string | null;
    rating: number | null;
    vouch_count: number | null;
  } | null;
}

// ─────────────────────────────────────────────
// NAVIGATION PARAM TYPES
// Centralized — imported by all Stack navigators
// ─────────────────────────────────────────────

// @bug: duplicate HomeStackParamList — types/index.ts:724 conflicts with HomeStack.tsx:57
// The canonical definition is in HomeStack.tsx. This copy is stale and should be
// removed or unified in a future cleanup session.
export type HomeStackParamList = {
  HomeMain: undefined;
  RepairJobDetails: { jobId: string };   // fetch on mount
  EditRepairJob: { jobId: string };
  Notifications: undefined;
  ProProfile: { profileId: string };
};

export type FindStackParamList = {
  FindMain: undefined;
  ProProfile: { profileId: string };
};

export type NetworkStackParamList = {
  NetworkMain: undefined;
  ProProfile: { profileId: string };
};

// InboxStackParamList is defined in components/InboxStack.tsx (single source of
// truth). All inbox-stack screens import it from there. Removed duplicate here
// in S160 — it had drifted (DealChatScreen shape, ChatScreen required fields).

// ─────────────────────────────────────────────
// SQUAD SHARE (Send to Client — S51)
// @backend: send-squad-email Edge Function (Resend), send-squad-sms Edge Function (Twilio + Storage)
// @demo: LIVE_SQUAD_SHARE feature flag gates live calls
// ─────────────────────────────────────────────

export interface SquadShareEmailParams {
  squadMembers: SquadShareMember[];
  agentName: string;
  agentCompany: string;
  recipientEmail: string;
  personalMessage?: string;
}

export interface SquadShareSmsParams {
  squadMembers: SquadShareMember[];
  agentName: string;
  agentCompany: string;
  recipientPhone: string;
  personalMessage?: string;
}

/** Subset of SquadProCandidate sent to Edge Functions — client-facing only, no social proof signals */
export interface SquadShareMember {
  name: string;
  company: string;
  role: string;
  avatar_url?: string;      // profile photo URL from Supabase storage
  avatar_color?: string;    // hex color string e.g. '#3B82F6' — used as initials circle background
}

export interface SquadShareResult {
  success: boolean;
  pdfUrl?: string;   // SMS path only — public Supabase Storage URL
  error?: string;
}

// ═══════════════════════════════════════════════════════════════
// FIND — Location-aware Recommended / Trending Pros (S166)
// @backend rpc_get_recommended_pros / rpc_get_trending_pros
// Narrow row shapes returned by the two earthdistance-filtered RPCs.
// Distinct from the full Profile interface — these RPCs intentionally
// project a small subset for list rendering.
// ═══════════════════════════════════════════════════════════════
export interface RecommendedPro {
  id: string;
  name: string;
  display_role: string;
  role: string;
  avatar_url: string | null;
  avatar_color: string;
  vouch_count: number;
  service_area_label: string | null;
  service_area_radius: number | null;
  service_area_lat: number | null;
  service_area_lng: number | null;
  license_status: string | null;
  // S166 v2 — true when this pro's role fills a gap in the agent's squad
  // (no existing connection with `is_in_squad = true` covering the role).
  // RPC orders Tier 1 (gap fills) before Tier 2 (covered roles), both by
  // vouch_count DESC. Surfaced as a "For Your Squad" badge in FindTab.
  is_gap_fill: boolean;
}

export interface TrendingPro extends RecommendedPro {
  last_active_at: string;
}

// ─────────────────────────────────────────────────────────────────────
// CONTRACTOR FOR JOB (S171 — ATL-LOCATION-03)
// Returned by rpc_get_contractors_for_job(p_job_lat, p_job_lng).
// snake_case field names match RPC output directly.
// @backend rpc_get_contractors_for_job
// ─────────────────────────────────────────────────────────────────────
export interface ContractorForJob {
  id: string;
  name: string;
  role: string;
  avatar_url: string | null;
  avatar_color: string | null;
  vouch_count: number;
  service_area_label: string | null;
  trade: string | null;
  is_verified: boolean;
}
