// types/index.ts
// ═══════════════════════════════════════════════════════════════
// Shared Type Definitions — Single Source of Truth
// Every entity maps 1:1 to a Supabase table or view.
// Import from here instead of defining interfaces in screen files.
//
// Supabase auto-generation:
//   npx supabase gen types typescript --project-id YOUR_ID > types/supabase.ts
//   Then re-export cleaned versions here.
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

export type RepairJobStatus =
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
  avatar_url: string | null;          // Supabase Storage URL
  avatar_color: string;               // fallback color for initials
  rating: number;                      // 0–5, derived from vouches
  vouch_count: number;                 // aggregated count
  tags: TagValue[];                     // enum[] in Supabase
  trades: TradeEnum[];                 // contractors only — 22 specialties
  trade: string | null;               // single primary trade (display convenience)
  licensed: string | null;            // e.g., "Licensed CO"
  active_since: string;               // e.g., "2022"
  specialties: string[];              // non-trade specialties (partners)
  service_area: string | null;        // geographic coverage
  deals_closed: number;               // aggregated count
  phone: string | null;               // never exposed in messages (regex filtered)
  profile_visibility: VisibilityEnum; // visibility preference
  is_visible: boolean;                // profile visibility toggle (app-level)
  is_verified: boolean;               // admin-granted after credential review (badge, not gate)
  is_banned: boolean;                 // blocks all interactions
  credential_urls: string[];          // uploaded license/ID files
  stripe_account_id: string | null;   // Stripe Connect Express ID (contractors only)
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
}

// ─────────────────────────────────────────────
// VOUCH
// Table: vouches
// ─────────────────────────────────────────────

export interface Vouch {
  id: string;                          // uuid
  author_id: string;                   // FK → profiles.id (who wrote it)
  recipient_id: string;                // FK → profiles.id (who received it)
  author_name: string;                 // denormalized for feed display
  recipient_name: string;              // denormalized for feed display
  recipient_company?: string;          // optional, for display
  quote: string;                       // the vouch text
  tag: string;                         // category label (e.g., "Contractors")
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
// CONNECTION
// Table: connections
// ─────────────────────────────────────────────

export interface Connection {
  id: string;                          // uuid
  requester_id: string;                // FK → profiles.id
  responder_id: string;                // FK → profiles.id
  status: ConnectionStatus;
  is_in_squad: boolean;                // closing squad membership
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
  joined_at: string;
}

// ─────────────────────────────────────────────
// REPAIR JOB
// Table: repair_jobs
// ─────────────────────────────────────────────

export interface RepairBid {
  id: string;                          // uuid
  job_id: string;                      // FK → repair_jobs.id
  contractor_id: string;               // FK → profiles.id
  name: string;                        // denormalized
  avatar_color: string;
  rating: number;
  response_time: string;
  amount: number;                      // cents — all monetary values stored as integers
  price: string;                       // formatted display price (e.g., "$1,200")
  counter_amount: number | null;       // agent's counter offer (cents)
  quote: string | null;                // bid note / scope description
  timeline: string | null;             // e.g., "3-5 days"
  message: string;
  tags: string[];
  status: BidStatus;                   // 7-state lifecycle
  edit_count: number;                  // max 2–3 per bid
  acceptance_fee: number | null;       // 3% of amount, calculated by trigger (cents)
  fee_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface RepairJob {
  id: string;                          // uuid
  agent_id: string;                    // FK → profiles.id (who posted)
  title: string;
  trades: TradeEnum[];                 // required — determines which contractors see it
  category: string;                    // trade category (display convenience)
  due_date: string;
  is_urgent: boolean;
  budget_min: number | null;           // cents
  budget_max: number | null;           // cents
  budget_range: string;                // formatted display (e.g., "$800–$1,200")
  address: string;
  description: string;
  photo_urls: string[];               // Supabase Storage URLs
  status: RepairJobStatus;             // 8-state lifecycle
  awarded_bid_id: string | null;       // FK → repair_bids.id (set on award)
  bid_deadline: string;                // ISO timestamp — default 48h, range 12h–72h
  max_bid_edits: number;              // default 3
  invited_contractor_ids: string[];   // FK[] → profiles.id
  bids: RepairBid[];                   // joined from repair_bids table
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// CHAT / MESSAGING
// Table: threads, messages
// ─────────────────────────────────────────────

export interface ChatThread {
  id: string;                          // uuid
  type: ConversationType;              // one_to_one | job_thread | deal_chat
  name: string;                        // display name (group/deal name or contact name)
  job_id: string | null;              // FK → repair_jobs.id (job_thread only)
  participants: string[];             // FK[] → profiles.id
  last_message: string;
  last_message_at: string;            // ISO timestamp for sorting
  is_unread: boolean;
  is_pinned: boolean;
  is_archived: boolean;               // auto-archive after 30 days inactive
  member_count?: number;
  avatar_colors: string[];            // for group display
  is_online?: boolean;
  // Deal-specific fields
  property_address?: string;
  closing_date?: string;
}

export interface Message {
  id: string;
  thread_id: string;                   // FK → threads.id
  sender_id: string;                   // FK → profiles.id
  sender_name: string;
  content: string;
  type: 'text' | 'image' | 'document' | 'system';
  attachment_url?: string;
  created_at: string;
  is_read: boolean;
}

export interface Recipient {
  id: string;
  name: string;
  company: string;
  role: string;
  avatar_color: string;
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
  timestamp: string;                   // relative (e.g., "2m ago")
  is_read: boolean;
  created_at: string;                  // ISO for sorting
  avatar_color?: string;
  avatar_name?: string;
  action_label?: string;
  deep_link?: string;
  // Related entity IDs (foreign keys for deep linking)
  job_id?: string;                     // FK → repair_jobs.id
  chat_id?: string;                    // FK → threads.id
  sender_id?: string;                  // FK → profiles.id
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
  reported_user_id?: string;           // FK → profiles.id
  reported_job_id?: string;            // FK → repair_jobs.id
  reported_bid_id?: string;            // FK → repair_bids.id
  reported_message_id?: string;        // FK → messages.id
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
// NAVIGATION PARAM TYPES
// Centralized — imported by all Stack navigators
// ─────────────────────────────────────────────

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

export type InboxStackParamList = {
  InboxList: undefined;
  NewMessage: undefined;
  ChatScreen: { conversationId: string };
  CreateDealChat: undefined;
  DealChatScreen: { conversationId: string };
};
