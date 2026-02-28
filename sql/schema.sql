-- schema.sql
-- ═══════════════════════════════════════════════════════════════
-- Atlasio — Production-Ready Supabase Schema
-- Last updated: Feb 28, 2026 (Phase 1 Backend Build)
--
-- Deploy: Supabase Dashboard → SQL Editor → New Query → paste & run
-- OR: supabase db push (via CLI)
--
-- Tables (18):
--   profiles, performance_stats, connections, jobs, bids,
--   reviews, vouches, vouch_likes, threads, thread_members,
--   messages, notifications, squads, squad_members,
--   reports, push_tokens, blocked_users, job_invitations
--
-- Structure:
--   1. ENUMS
--   2. TABLES (all 18, RLS enabled, NO policies yet)
--   3. DEFERRED FOREIGN KEYS
--   4. RLS POLICIES (all 50, safe — every table exists)
--   5. INDEXES (36)
--   6. TRIGGERS (9)
--   7. RPCs (15 functions)
--
-- Architecture:
--   - Unified jobs table (repair, photography, staging) with job_type enum
--   - Unified bids table — same RPCs regardless of job_type
--   - Threads + thread_members join table (not array-based participants)
--   - Reviews (rating/comment) separate from vouches (public endorsement)
--   - Squad members include role + is_additional for slot management
--   - All monetary values stored as integers (cents)
--   - RLS enabled on ALL tables
--   - UUIDs everywhere (no serial IDs)
--
-- Revenue model:
--   - Graduated fee on accepted bids (contractor, photographer, stager)
--   - Free tier: 0% (first 3 jobs)
--   - Early Adopter: 5% (months 4–9)
--   - Standard: 10% (month 10+)
--   - $15 minimum when fee applies
--
-- Related docs:
--   - types/index.ts — TypeScript interfaces (1:1 mapping)
--   - hooks/useData.ts — TanStack Query hooks
--   - Backend Integration Guide — flow-by-flow wiring
--   - Supabase Implementation Guide — RPCs, edge functions, Realtime
-- ═══════════════════════════════════════════════════════════════


-- ═════════════════════════════════════════════════════════════
-- SECTION 1: ENUMS
-- ═════════════════════════════════════════════════════════════

-- User roles (12) — matches types/index.ts UserRole
CREATE TYPE user_role AS ENUM (
  'agent',
  'mortgage_pro',
  'title_escrow',
  'home_inspector',
  'contractor',
  'appraiser',
  'transaction_coordinator',
  'attorney',
  'warranty',
  'home_stager',
  'real_estate_photographer',
  'other'
);

CREATE TYPE visibility_enum AS ENUM ('public', 'network_only', 'private');
CREATE TYPE job_type_enum AS ENUM ('repair', 'photography', 'staging');

CREATE TYPE job_status_enum AS ENUM (
  'draft', 'open', 'bidding', 'awarded',
  'in_progress', 'pending_completion', 'completed', 'cancelled'
);

CREATE TYPE bid_status_enum AS ENUM (
  'pending', 'edited', 'withdrawn', 'accepted',
  'rejected', 'countered', 'expired'
);

CREATE TYPE connection_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE thread_type_enum AS ENUM ('one_to_one', 'job_thread', 'deal_chat');
CREATE TYPE message_type AS ENUM ('text', 'image', 'document', 'system');

CREATE TYPE trades_enum AS ENUM (
  'Electrical', 'Plumbing', 'Roofing', 'HVAC',
  'Carpentry / Handyman', 'Painting', 'Flooring', 'Windows & Doors',
  'Foundation / Structural', 'Drywall / Sheetrock', 'Pest Control / Termite',
  'Mold Remediation', 'Sewer / Septic', 'Pool & Spa',
  'Chimney / Fireplace', 'Garage Door', 'Appliances',
  'Landscaping / Drainage', 'Locksmith / Re-key', 'Cleaning / Junk Removal',
  'Driveway / Paving', 'Other'
);

CREATE TYPE notification_type_enum AS ENUM (
  'connection_request_received', 'connection_accepted', 'connection_declined',
  'vouch_received', 'mutual_vouch_prompt',
  'invited_to_bid', 'bid_new', 'bid_edited',
  'bid_accepted_contractor', 'bid_accepted_agent_confirmation',
  'bid_countered', 'counter_resubmitted',
  'bid_rejected', 'bid_withdrawn', 'bidding_window_expiring',
  'contractor_marked_complete', 'agent_confirmed_complete',
  'job_expired', 'job_cancelled',
  'message_new'
);

CREATE TYPE tag_enum AS ENUM (
  'VA Specialist', 'FHA Approved', 'Fast Closer', 'Jumbo Loan Specialist',
  'No Junk Fees', 'Spanish-Speaking', '17-Day Close', '21-Day Close',
  'Fast Turnaround', 'Complex Specialist', 'Cash Buyer Expert',
  '24-Hour Service', 'Clear Communication', 'Weekend Warrior',
  'Same-Day Turnaround', '24-Hour Turnaround', 'Foundation Specialist',
  'Detailed Reports',
  'Fast Response', 'Licensed & Insured', 'On-Time Expert', 'Clean Work',
  'Emergency Service', 'Competitive Pricing', 'Warranty Offered'
);

CREATE TYPE report_type_enum AS ENUM ('user', 'job', 'bid', 'message');
CREATE TYPE report_reason_enum AS ENUM ('spam', 'fake', 'inaccurate', 'harassment', 'other');
CREATE TYPE fee_tier_enum AS ENUM ('free', 'early_adopter', 'standard');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');


-- ═════════════════════════════════════════════════════════════
-- SECTION 2: TABLES (all 18 — RLS enabled, policies deferred)
-- ═════════════════════════════════════════════════════════════

-- ── 1. PROFILES ──────────────────────────────────────────────

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'agent',
  display_role TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  avatar_color TEXT NOT NULL DEFAULT '#7BA3C9',
  rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  vouch_count INTEGER NOT NULL DEFAULT 0,
  deals_closed INTEGER NOT NULL DEFAULT 0,
  tags tag_enum[] NOT NULL DEFAULT '{}',
  trades trades_enum[] NOT NULL DEFAULT '{}',
  trade TEXT,
  specialties TEXT[] NOT NULL DEFAULT '{}',
  licensed TEXT,
  active_since TEXT,
  service_area TEXT,
  phone TEXT,
  profile_visibility visibility_enum NOT NULL DEFAULT 'public',
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  is_banned BOOLEAN NOT NULL DEFAULT false,
  credential_urls TEXT[] NOT NULL DEFAULT '{}',
  stripe_account_id TEXT,
  typical_close_days INTEGER,
  base_price INTEGER,
  fee_tier fee_tier_enum NOT NULL DEFAULT 'free',
  completed_bids_count INTEGER NOT NULL DEFAULT 0,
  fee_tier_started_at TIMESTAMPTZ,
  notification_preferences JSONB NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT true,
  deactivated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;


-- ── 2. PERFORMANCE STATS ─────────────────────────────────────

CREATE TABLE performance_stats (
  profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  on_time_rate INTEGER NOT NULL DEFAULT 100,
  avg_response_time TEXT NOT NULL DEFAULT 'N/A',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE performance_stats ENABLE ROW LEVEL SECURITY;


-- ── 3. CONNECTIONS ───────────────────────────────────────────

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status connection_status NOT NULL DEFAULT 'pending',
  is_in_squad BOOLEAN NOT NULL DEFAULT false,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(requester_id, responder_id)
);
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;


-- ── 4. JOBS ──────────────────────────────────────────────────

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_type job_type_enum NOT NULL DEFAULT 'repair',
  status job_status_enum NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  due_date DATE NOT NULL,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  awarded_bid_id UUID,                             -- FK deferred to after bids table
  bid_deadline TIMESTAMPTZ,
  max_bid_edits INTEGER NOT NULL DEFAULT 3,
  invited_contractor_ids UUID[] NOT NULL DEFAULT '{}',
  trades trades_enum[],
  category TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  budget_range TEXT,
  service_packages TEXT[],
  turnaround_preference TEXT,
  sqft INTEGER,
  occupied_or_vacant TEXT,
  rooms_count INTEGER,
  staging_scope TEXT[],
  contractor_completed_at TIMESTAMPTZ,
  agent_confirmed_at TIMESTAMPTZ,
  completion_notes TEXT,
  proof_photo_urls TEXT[] NOT NULL DEFAULT '{}',
  revision_notes TEXT,
  vouch_prompt_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;


-- ── 5. BIDS ──────────────────────────────────────────────────

CREATE TABLE bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  counter_amount INTEGER,
  acceptance_fee INTEGER,
  fee_paid BOOLEAN NOT NULL DEFAULT false,
  quote TEXT,
  timeline TEXT,
  message TEXT NOT NULL DEFAULT '',
  response_time TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status bid_status_enum NOT NULL DEFAULT 'pending',
  edit_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, contractor_id)
);
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;


-- ── 6. REVIEWS ───────────────────────────────────────────────

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  from_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, from_id, to_id)
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;


-- ── 7. VOUCHES ───────────────────────────────────────────────

CREATE TABLE vouches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  recipient_company TEXT,
  recipient_role TEXT,
  quote TEXT NOT NULL,
  tag TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  likes INTEGER NOT NULL DEFAULT 0,
  avatar_color TEXT NOT NULL DEFAULT '#7BA3C9',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE vouches ENABLE ROW LEVEL SECURITY;


-- ── 8. VOUCH LIKES ───────────────────────────────────────────

CREATE TABLE vouch_likes (
  vouch_id UUID NOT NULL REFERENCES vouches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (vouch_id, user_id)
);
ALTER TABLE vouch_likes ENABLE ROW LEVEL SECURITY;


-- ── 9. THREADS ───────────────────────────────────────────────

CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type thread_type_enum NOT NULL DEFAULT 'one_to_one',
  name TEXT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  property_address TEXT,
  closing_date DATE,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;


-- ── 10. THREAD MEMBERS ──────────────────────────────────────

CREATE TABLE thread_members (
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_muted BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (thread_id, user_id)
);
ALTER TABLE thread_members ENABLE ROW LEVEL SECURITY;


-- ── 11. MESSAGES ─────────────────────────────────────────────

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  content TEXT NOT NULL,
  type message_type NOT NULL DEFAULT 'text',
  attachment_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;


-- ── 12. NOTIFICATIONS ────────────────────────────────────────

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type_enum NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  is_read BOOLEAN NOT NULL DEFAULT false,
  avatar_color TEXT,
  avatar_name TEXT,
  action_label TEXT,
  deep_link TEXT,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES threads(id) ON DELETE SET NULL,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;


-- ── 13. SQUADS ───────────────────────────────────────────────

CREATE TABLE squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Squad',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;


-- ── 14. SQUAD MEMBERS ────────────────────────────────────────

CREATE TABLE squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  is_additional BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(squad_id, role)
);
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;


-- ── 15. REPORTS ──────────────────────────────────────────────

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type report_type_enum NOT NULL,
  reason report_reason_enum NOT NULL,
  description TEXT,
  reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reported_job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  reported_bid_id UUID REFERENCES bids(id) ON DELETE SET NULL,
  reported_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;


-- ── 16. PUSH TOKENS ─────────────────────────────────────────

CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  device_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(token)
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;


-- ── 17. BLOCKED USERS ────────────────────────────────────────

CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;


-- ── 18. JOB INVITATIONS ──────────────────────────────────────

CREATE TABLE job_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status invitation_status NOT NULL DEFAULT 'pending',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE(job_id, contractor_id)
);
ALTER TABLE job_invitations ENABLE ROW LEVEL SECURITY;


-- ═════════════════════════════════════════════════════════════
-- SECTION 3: DEFERRED FOREIGN KEYS
-- ═════════════════════════════════════════════════════════════

ALTER TABLE jobs ADD CONSTRAINT fk_jobs_awarded_bid
  FOREIGN KEY (awarded_bid_id) REFERENCES bids(id) ON DELETE SET NULL;


-- ═════════════════════════════════════════════════════════════
-- SECTION 4: RLS POLICIES (all 50 — every table exists now)
-- ═════════════════════════════════════════════════════════════

-- ── PROFILES POLICIES ────────────────────────────────────────

CREATE POLICY "View public profiles" ON profiles
  FOR SELECT USING (
    is_banned = false AND deactivated_at IS NULL
    AND (profile_visibility = 'public' OR id = auth.uid())
  );

CREATE POLICY "View network profiles" ON profiles
  FOR SELECT USING (
    is_banned = false AND deactivated_at IS NULL
    AND profile_visibility = 'network_only'
    AND EXISTS (
      SELECT 1 FROM connections
      WHERE status = 'accepted'
      AND ((requester_id = auth.uid() AND responder_id = profiles.id)
        OR (responder_id = auth.uid() AND requester_id = profiles.id))
    )
  );

CREATE POLICY "Update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);


-- ── PERFORMANCE STATS POLICIES ───────────────────────────────

CREATE POLICY "Performance stats viewable by everyone" ON performance_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can update own stats" ON performance_stats
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Insert own stats" ON performance_stats
  FOR INSERT WITH CHECK (auth.uid() = profile_id);


-- ── CONNECTIONS POLICIES ─────────────────────────────────────

CREATE POLICY "View own connections" ON connections
  FOR SELECT USING (auth.uid() IN (requester_id, responder_id));

CREATE POLICY "Create connection requests" ON connections
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Update own connections" ON connections
  FOR UPDATE USING (auth.uid() IN (requester_id, responder_id));

CREATE POLICY "Delete own connections" ON connections
  FOR DELETE USING (auth.uid() IN (requester_id, responder_id));


-- ── JOBS POLICIES ────────────────────────────────────────────

CREATE POLICY "Agents see own jobs" ON jobs
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Contractors see matching repair jobs" ON jobs
  FOR SELECT USING (
    job_type = 'repair' AND status IN ('open', 'bidding')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'contractor'
      AND trades && jobs.trades
    )
  );

CREATE POLICY "Photographers see photography jobs" ON jobs
  FOR SELECT USING (
    job_type = 'photography' AND status IN ('open', 'bidding')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'real_estate_photographer'
    )
  );

CREATE POLICY "Stagers see staging jobs" ON jobs
  FOR SELECT USING (
    job_type = 'staging' AND status IN ('open', 'bidding')
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'home_stager'
    )
  );

CREATE POLICY "Invited pros see jobs" ON jobs
  FOR SELECT USING (auth.uid() = ANY(invited_contractor_ids));

CREATE POLICY "Agents create jobs" ON jobs
  FOR INSERT WITH CHECK (
    auth.uid() = agent_id
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'agent')
  );

CREATE POLICY "Agents update own jobs" ON jobs
  FOR UPDATE USING (auth.uid() = agent_id);


-- ── BIDS POLICIES ────────────────────────────────────────────

CREATE POLICY "Job-eligible roles submit bids" ON bids
  FOR INSERT WITH CHECK (
    auth.uid() = contractor_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_banned = false
      AND role IN ('contractor', 'home_stager', 'real_estate_photographer')
    )
  );

CREATE POLICY "View bids" ON bids
  FOR SELECT USING (
    auth.uid() = contractor_id
    OR EXISTS (SELECT 1 FROM jobs WHERE id = bids.job_id AND agent_id = auth.uid())
  );

CREATE POLICY "Update bids" ON bids
  FOR UPDATE USING (
    auth.uid() = contractor_id
    OR EXISTS (SELECT 1 FROM jobs WHERE id = bids.job_id AND agent_id = auth.uid())
  );


-- ── REVIEWS POLICIES ─────────────────────────────────────────

CREATE POLICY "Reviews viewable by everyone" ON reviews
  FOR SELECT USING (true);

CREATE POLICY "Create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = from_id);


-- ── VOUCHES POLICIES ─────────────────────────────────────────

CREATE POLICY "Vouches viewable by everyone" ON vouches
  FOR SELECT USING (true);

CREATE POLICY "Create vouches" ON vouches
  FOR INSERT WITH CHECK (auth.uid() = author_id);


-- ── VOUCH LIKES POLICIES ─────────────────────────────────────

CREATE POLICY "View vouch likes" ON vouch_likes
  FOR SELECT USING (true);

CREATE POLICY "Like and unlike vouches" ON vouch_likes
  FOR ALL USING (auth.uid() = user_id);


-- ── THREADS POLICIES ─────────────────────────────────────────

CREATE POLICY "Members view threads" ON threads
  FOR SELECT USING (
    id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Members update threads" ON threads
  FOR UPDATE USING (
    id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid())
  );


-- ── THREAD MEMBERS POLICIES ──────────────────────────────────

CREATE POLICY "View own memberships" ON thread_members
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "View co-members" ON thread_members
  FOR SELECT USING (
    thread_id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid())
  );


-- ── MESSAGES POLICIES ────────────────────────────────────────

CREATE POLICY "Thread members read messages" ON messages
  FOR SELECT USING (
    thread_id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND thread_id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid())
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = true)
  );

CREATE POLICY "Update own messages" ON messages
  FOR UPDATE USING (
    thread_id IN (SELECT thread_id FROM thread_members WHERE user_id = auth.uid())
  );


-- ── NOTIFICATIONS POLICIES ───────────────────────────────────

CREATE POLICY "View own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System inserts notifications" ON notifications
  FOR INSERT WITH CHECK (true);


-- ── SQUADS POLICIES ──────────────────────────────────────────

CREATE POLICY "Agents view own squads" ON squads
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Agents create squads" ON squads
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Agents update own squads" ON squads
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Agents delete own squads" ON squads
  FOR DELETE USING (auth.uid() = owner_id);


-- ── SQUAD MEMBERS POLICIES ───────────────────────────────────

CREATE POLICY "View own squad members" ON squad_members
  FOR SELECT USING (
    squad_id IN (SELECT id FROM squads WHERE owner_id = auth.uid())
  );

CREATE POLICY "Manage own squad members" ON squad_members
  FOR ALL USING (
    squad_id IN (SELECT id FROM squads WHERE owner_id = auth.uid())
  );


-- ── REPORTS POLICIES ─────────────────────────────────────────

CREATE POLICY "Create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "View own reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);


-- ── PUSH TOKENS POLICIES ────────────────────────────────────

CREATE POLICY "Manage own push tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id);


-- ── BLOCKED USERS POLICIES ──────────────────────────────────

CREATE POLICY "Manage own blocks" ON blocked_users
  FOR ALL USING (auth.uid() = blocker_id);


-- ── JOB INVITATIONS POLICIES ─────────────────────────────────

CREATE POLICY "View own invitations" ON job_invitations
  FOR SELECT USING (auth.uid() = invited_by OR auth.uid() = contractor_id);

CREATE POLICY "Create invitations" ON job_invitations
  FOR INSERT WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Update invitations" ON job_invitations
  FOR UPDATE USING (auth.uid() = invited_by OR auth.uid() = contractor_id);


-- ═════════════════════════════════════════════════════════════
-- SECTION 5: INDEXES (36)
-- ═════════════════════════════════════════════════════════════

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_tags ON profiles USING GIN(tags);
CREATE INDEX idx_profiles_trades ON profiles USING GIN(trades);
CREATE INDEX idx_profiles_location ON profiles(location);
CREATE INDEX idx_profiles_active ON profiles(id) WHERE deactivated_at IS NULL AND is_banned = false;

-- Connections
CREATE INDEX idx_connections_requester ON connections(requester_id);
CREATE INDEX idx_connections_responder ON connections(responder_id);
CREATE INDEX idx_connections_status ON connections(status);
CREATE INDEX idx_connections_pending ON connections(responder_id, status) WHERE status = 'pending';

-- Jobs
CREATE INDEX idx_jobs_agent ON jobs(agent_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_type ON jobs(job_type);
CREATE INDEX idx_jobs_trades ON jobs USING GIN(trades);
CREATE INDEX idx_jobs_open ON jobs(status, job_type) WHERE status IN ('open', 'bidding');
CREATE INDEX idx_jobs_deadline ON jobs(bid_deadline) WHERE status = 'bidding';

-- Bids
CREATE INDEX idx_bids_job ON bids(job_id);
CREATE INDEX idx_bids_contractor ON bids(contractor_id);
CREATE INDEX idx_bids_status ON bids(status);

-- Reviews
CREATE INDEX idx_reviews_to ON reviews(to_id);
CREATE INDEX idx_reviews_job ON reviews(job_id);

-- Vouches
CREATE INDEX idx_vouches_recipient ON vouches(recipient_id);
CREATE INDEX idx_vouches_created ON vouches(created_at DESC);
CREATE INDEX idx_vouches_role ON vouches(recipient_role);

-- Threads + Messages
CREATE INDEX idx_thread_members_user ON thread_members(user_id);
CREATE INDEX idx_thread_members_thread ON thread_members(thread_id);
CREATE INDEX idx_messages_thread ON messages(thread_id);
CREATE INDEX idx_messages_created ON messages(created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Squads
CREATE INDEX idx_squads_owner ON squads(owner_id);
CREATE INDEX idx_squad_members_squad ON squad_members(squad_id);

-- Push tokens
CREATE INDEX idx_push_tokens_user ON push_tokens(user_id) WHERE is_active = true;

-- Job invitations
CREATE INDEX idx_invitations_job ON job_invitations(job_id);
CREATE INDEX idx_invitations_contractor ON job_invitations(contractor_id);
CREATE INDEX idx_invitations_pending ON job_invitations(contractor_id, status) WHERE status = 'pending';

-- Blocked users
CREATE INDEX idx_blocked_blocker ON blocked_users(blocker_id);


-- ═════════════════════════════════════════════════════════════
-- SECTION 6: TRIGGERS (9)
-- ═════════════════════════════════════════════════════════════

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_bids_updated_at
  BEFORE UPDATE ON bids FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- Tier-based acceptance fee on bid accept
-- Revenue model: free (first 3 jobs) → 5% (early adopter) → 10% (standard)
CREATE OR REPLACE FUNCTION calculate_acceptance_fee()
RETURNS TRIGGER AS $$
DECLARE
  v_fee_tier fee_tier_enum;
  v_fee_rate NUMERIC;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    SELECT fee_tier INTO v_fee_tier FROM profiles WHERE id = NEW.contractor_id;

    CASE v_fee_tier
      WHEN 'free' THEN v_fee_rate := 0.00;
      WHEN 'early_adopter' THEN v_fee_rate := 0.05;
      WHEN 'standard' THEN v_fee_rate := 0.10;
      ELSE v_fee_rate := 0.10;
    END CASE;

    IF v_fee_rate > 0 THEN
      NEW.acceptance_fee = GREATEST(ROUND(NEW.amount * v_fee_rate), 1500);
    ELSE
      NEW.acceptance_fee = 0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_bid_accept
  BEFORE UPDATE ON bids FOR EACH ROW
  WHEN (NEW.status = 'accepted')
  EXECUTE FUNCTION calculate_acceptance_fee();


-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- Auto-create performance_stats with profile
CREATE OR REPLACE FUNCTION handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO performance_stats (profile_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON profiles FOR EACH ROW EXECUTE FUNCTION handle_new_profile();


-- Increment vouch_count on profile when vouch created
CREATE OR REPLACE FUNCTION increment_vouch_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET vouch_count = vouch_count + 1 WHERE id = NEW.recipient_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_vouch_created
  AFTER INSERT ON vouches FOR EACH ROW EXECUTE FUNCTION increment_vouch_count();


-- ═════════════════════════════════════════════════════════════
-- SECTION 7: RPCs (15 functions)
-- Frontend NEVER updates job/bid status directly.
-- All state transitions go through these RPCs.
-- ═════════════════════════════════════════════════════════════

-- Append invited contractors to a job
CREATE OR REPLACE FUNCTION append_invited_contractors(p_job_id UUID, p_contractor_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE jobs
  SET invited_contractor_ids = ARRAY(
    SELECT DISTINCT unnest(invited_contractor_ids || p_contractor_ids)
  )
  WHERE id = p_job_id AND agent_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Update vouch like count
CREATE OR REPLACE FUNCTION update_vouch_like_count(p_vouch_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE vouches SET likes = (SELECT count(*) FROM vouch_likes WHERE vouch_id = p_vouch_id)
  WHERE id = p_vouch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Accept connection request
CREATE OR REPLACE FUNCTION rpc_accept_connection(p_connection_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE connections SET status = 'accepted', updated_at = now()
  WHERE id = p_connection_id AND responder_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Connection not found or not pending'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Reject connection request
CREATE OR REPLACE FUNCTION rpc_reject_connection(p_connection_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE connections SET status = 'rejected', updated_at = now()
  WHERE id = p_connection_id AND responder_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Connection not found or not pending'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Create a job (unified — repair, photography, staging)
CREATE OR REPLACE FUNCTION rpc_create_job(
  p_job_type job_type_enum, p_title TEXT, p_address TEXT, p_due_date DATE,
  p_description TEXT DEFAULT '', p_is_urgent BOOLEAN DEFAULT false,
  p_trades trades_enum[] DEFAULT NULL, p_budget_min INTEGER DEFAULT NULL,
  p_budget_max INTEGER DEFAULT NULL, p_budget_range TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL, p_service_packages TEXT[] DEFAULT NULL,
  p_turnaround_preference TEXT DEFAULT NULL, p_sqft INTEGER DEFAULT NULL,
  p_occupied_or_vacant TEXT DEFAULT NULL, p_rooms_count INTEGER DEFAULT NULL,
  p_staging_scope TEXT[] DEFAULT NULL, p_bid_deadline_hours INTEGER DEFAULT 48
)
RETURNS UUID AS $$
DECLARE v_job_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'agent') THEN
    RAISE EXCEPTION 'Only agents can create jobs';
  END IF;
  IF p_address IS NULL OR p_address = '' THEN
    RAISE EXCEPTION 'Address is required';
  END IF;
  IF p_job_type = 'repair' AND (p_trades IS NULL OR array_length(p_trades, 1) IS NULL) THEN
    RAISE EXCEPTION 'Trades are required for repair jobs';
  END IF;
  IF p_job_type = 'photography' AND (p_service_packages IS NULL OR array_length(p_service_packages, 1) IS NULL) THEN
    RAISE EXCEPTION 'Service packages are required for photography jobs';
  END IF;
  IF p_job_type = 'staging' AND (p_staging_scope IS NULL OR array_length(p_staging_scope, 1) IS NULL) THEN
    RAISE EXCEPTION 'Staging scope is required for staging jobs';
  END IF;

  INSERT INTO jobs (
    agent_id, job_type, title, address, due_date, description, is_urgent,
    status, bid_deadline,
    trades, budget_min, budget_max, budget_range, category,
    service_packages, turnaround_preference, sqft,
    occupied_or_vacant, rooms_count, staging_scope
  ) VALUES (
    auth.uid(), p_job_type, p_title, p_address, p_due_date, p_description, p_is_urgent,
    'open', now() + (p_bid_deadline_hours || ' hours')::INTERVAL,
    p_trades, p_budget_min, p_budget_max, p_budget_range, p_category,
    p_service_packages, p_turnaround_preference, p_sqft,
    p_occupied_or_vacant, p_rooms_count, p_staging_scope
  ) RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Submit bid (job-eligible roles: contractor, photographer, stager)
CREATE OR REPLACE FUNCTION rpc_submit_bid(
  p_job_id UUID, p_amount INTEGER,
  p_quote TEXT DEFAULT NULL, p_timeline TEXT DEFAULT NULL, p_message TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE v_bid_id UUID; v_job_status job_status_enum; v_bidder_role user_role;
BEGIN
  SELECT role INTO v_bidder_role FROM profiles WHERE id = auth.uid() AND is_banned = false;
  IF v_bidder_role NOT IN ('contractor', 'home_stager', 'real_estate_photographer') THEN
    RAISE EXCEPTION 'Only job-eligible roles can submit bids';
  END IF;

  SELECT status INTO v_job_status FROM jobs WHERE id = p_job_id;
  IF v_job_status NOT IN ('open', 'bidding') THEN
    RAISE EXCEPTION 'Job is not accepting bids';
  END IF;

  INSERT INTO bids (job_id, contractor_id, amount, quote, timeline, message)
  VALUES (p_job_id, auth.uid(), p_amount, p_quote, p_timeline, p_message)
  RETURNING id INTO v_bid_id;

  UPDATE jobs SET status = 'bidding' WHERE id = p_job_id AND status = 'open';
  RETURN v_bid_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Accept bid (agent)
CREATE OR REPLACE FUNCTION rpc_accept_bid(p_bid_id UUID, p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND agent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND status = 'bidding') THEN
    RAISE EXCEPTION 'Job is not in bidding state';
  END IF;

  UPDATE bids SET status = 'accepted' WHERE id = p_bid_id AND job_id = p_job_id;
  UPDATE bids SET status = 'rejected'
    WHERE job_id = p_job_id AND id != p_bid_id AND status IN ('pending', 'edited', 'countered');
  UPDATE jobs SET status = 'awarded', awarded_bid_id = p_bid_id WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Counter bid (agent)
CREATE OR REPLACE FUNCTION rpc_counter_bid(p_bid_id UUID, p_job_id UUID, p_counter_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND agent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE bids SET status = 'countered', counter_amount = p_counter_amount
    WHERE id = p_bid_id AND job_id = p_job_id AND status IN ('pending', 'edited');
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found or not in counterable state'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Reject bid (agent)
CREATE OR REPLACE FUNCTION rpc_reject_bid(p_bid_id UUID, p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND agent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE bids SET status = 'rejected'
    WHERE id = p_bid_id AND job_id = p_job_id AND status IN ('pending', 'edited');
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found or not rejectable'; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Start job (awarded pro begins work — awarded → in_progress)
CREATE OR REPLACE FUNCTION rpc_start_job(p_job_id UUID)
RETURNS VOID AS $$
DECLARE v_contractor_id UUID;
BEGIN
  SELECT b.contractor_id INTO v_contractor_id
  FROM jobs j JOIN bids b ON j.awarded_bid_id = b.id WHERE j.id = p_job_id;
  IF v_contractor_id IS NULL OR v_contractor_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the awarded pro can start this job';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND status = 'awarded') THEN
    RAISE EXCEPTION 'Job is not in awarded state';
  END IF;
  UPDATE jobs SET status = 'in_progress' WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Mark job complete (awarded pro)
CREATE OR REPLACE FUNCTION rpc_mark_complete(
  p_job_id UUID, p_proof_photos TEXT[] DEFAULT '{}', p_completion_notes TEXT DEFAULT ''
)
RETURNS VOID AS $$
DECLARE v_contractor_id UUID;
BEGIN
  SELECT b.contractor_id INTO v_contractor_id
  FROM jobs j JOIN bids b ON j.awarded_bid_id = b.id WHERE j.id = p_job_id;
  IF v_contractor_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the awarded pro can mark complete';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND status = 'in_progress') THEN
    RAISE EXCEPTION 'Job is not in progress';
  END IF;
  UPDATE jobs SET status = 'pending_completion', contractor_completed_at = now(),
    proof_photo_urls = p_proof_photos, completion_notes = p_completion_notes
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Confirm job complete (agent)
CREATE OR REPLACE FUNCTION rpc_confirm_complete(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND agent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND status = 'pending_completion') THEN
    RAISE EXCEPTION 'Job is not pending completion';
  END IF;
  UPDATE jobs SET status = 'completed', agent_confirmed_at = now() WHERE id = p_job_id;
  UPDATE profiles SET deals_closed = deals_closed + 1 WHERE id = auth.uid();
  UPDATE profiles SET deals_closed = deals_closed + 1 WHERE id = (
    SELECT b.contractor_id FROM bids b JOIN jobs j ON j.awarded_bid_id = b.id WHERE j.id = p_job_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Request revision (agent)
CREATE OR REPLACE FUNCTION rpc_request_revision(p_job_id UUID, p_revision_notes TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND agent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND status = 'pending_completion') THEN
    RAISE EXCEPTION 'Job is not pending completion';
  END IF;
  UPDATE jobs SET status = 'in_progress', revision_notes = p_revision_notes,
    contractor_completed_at = NULL WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Cancel job (agent)
CREATE OR REPLACE FUNCTION rpc_cancel_job(p_job_id UUID)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND agent_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF EXISTS (SELECT 1 FROM jobs WHERE id = p_job_id AND status = 'completed') THEN
    RAISE EXCEPTION 'Cannot cancel a completed job';
  END IF;
  UPDATE bids SET status = 'withdrawn'
    WHERE job_id = p_job_id AND status IN ('pending', 'edited', 'countered');
  UPDATE jobs SET status = 'cancelled' WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Deactivate account (soft delete)
CREATE OR REPLACE FUNCTION rpc_deactivate_account()
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET deactivated_at = now(), is_visible = false WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Reactivate account
CREATE OR REPLACE FUNCTION rpc_reactivate_account()
RETURNS VOID AS $$
BEGIN
  UPDATE profiles SET deactivated_at = NULL, is_visible = true WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═════════════════════════════════════════════════════════════
-- STORAGE BUCKETS (create manually in Dashboard → Storage)
-- ═════════════════════════════════════════════════════════════
--
-- job-photos: Job + proof photos. Access: agent + bidding contractors. Max 5MB.
-- portfolio-photos: Portfolio images. Access: owner upload, public read. Max 5MB, 8 max.
-- message-attachments: Thread files. Access: thread participants. Max 5MB.
-- credentials: License/cert docs. Access: owner + admin. Max 10MB.
-- avatars: Profile photos. Access: owner upload, public read. Max 2MB.
--
-- ═════════════════════════════════════════════════════════════
-- DONE — Next steps:
--   1. Create storage buckets in Dashboard → Storage
--   2. Configure magic link auth in Dashboard → Auth → Providers
--   3. Test: create account → profile auto-created → onboarding
--   4. Wire hooks/useData.ts to live Supabase queries
-- ═════════════════════════════════════════════════════════════
