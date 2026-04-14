// RepairJobsData.ts
// ═══════════════════════════════════════════════════════════════
// Mock repair job data for HomeTabAgent Active Repairs section
// Updated: Uses Job + BidWithProfile types from types/Index.ts
// ═══════════════════════════════════════════════════════════════

import type { Job, BidWithProfile, JobStatus } from '../types';

// Job with bids that include profile data (for UI display)
type JobWithBidProfiles = Job & { bids: BidWithProfile[] };

// Helper to build a mock job with sensible defaults
const mockJob = (overrides: Partial<JobWithBidProfiles> & Pick<JobWithBidProfiles, 'id' | 'title' | 'category' | 'due_date' | 'address' | 'description' | 'status' | 'bids'>): JobWithBidProfiles => ({
  agent_id: 'mock-agent-1',
  job_type: 'repair',
  is_urgent: false,
  budget_min: null,
  budget_max: null,
  budget_range: null,
  photo_urls: [],
  awarded_bid_id: null,
  bid_deadline: null,
  max_bid_edits: 3,
  invited_contractor_ids: [],
  trades: null,
  service_packages: null,
  turnaround_preference: null,
  sqft: null,
  occupied_or_vacant: null,
  rooms_count: null,
  staging_scope: null,
  contractor_completed_at: null,
  agent_confirmed_at: null,
  completion_notes: null,
  proof_photo_urls: [],
  revision_notes: null,
  vouch_prompt_sent: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// Helper to build a mock bid with sensible defaults
const mockBid = (overrides: Partial<BidWithProfile> & Pick<BidWithProfile, 'id' | 'job_id' | 'name' | 'company' | 'trade' | 'avatar_color' | 'rating' | 'response_time' | 'amount' | 'price' | 'message' | 'tags'>): BidWithProfile => ({
  contractor_id: `mock-contractor-${overrides.id}`,
  is_licensed: true,
  counter_amount: null,
  quote: null,
  timeline: null,
  status: 'pending',
  edit_count: 0,
  acceptance_fee: null,
  fee_paid: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

/**
 * Full mock repair jobs with lifecycle status tracking.
 *
 * @backend Replace with: const { data: jobs } = useJobs();
 *   → SELECT * FROM jobs
 *     WHERE agent_id = auth.uid()
 *     ORDER BY created_at DESC
 */
export const MOCK_REPAIR_JOBS: JobWithBidProfiles[] = [
  mockJob({
    id: '1',
    title: 'Fix Leaking Kitchen Faucet',
    category: 'Plumbing',
    due_date: 'Mar 2',
    is_urgent: true,
    budget_range: '$150 – $400',
    address: '4521 Elm Street, Denver CO 80220',
    description: 'Kitchen faucet has been dripping for a week. Possible cartridge replacement needed. Standard Moen single-handle fixture.',
    status: 'open',
    // @demo picsum placeholder photos — replace with real Supabase storage URLs
    photo_urls: [
      'https://picsum.photos/seed/job1a/800/600',
      'https://picsum.photos/seed/job1b/800/600',
      'https://picsum.photos/seed/job1c/800/600',
    ],
    bids: [
      mockBid({ id: 'b1', job_id: '1', name: 'Brian Cooper', company: 'ProBuild Contractors', trade: 'General Contractor', is_licensed: true, avatar_color: '#7BA3C9', rating: 5.0, response_time: '2h ago', amount: 28000, price: '$280', message: 'I can get this done tomorrow morning. Faucet cartridge replacement is straightforward — I stock Moen parts.', tags: ['Licensed & Insured', 'Fast Response'], status: 'pending' }),
      mockBid({ id: 'b2', job_id: '1', name: 'Tony Ruiz', company: 'Front Range Plumbing', trade: 'Plumber', is_licensed: true, has_unread_messages: true, avatar_color: '#C9A87B', rating: 4.8, response_time: '4h ago', amount: 19500, price: '$195', message: "Standard cartridge swap. I'll include a 6-month labor warranty. Available this Thursday.", tags: ['Licensed & Insured', 'Warranty Offered'], status: 'pending' }),
      mockBid({ id: 'b3', job_id: '1', name: 'Derek Washington', company: 'Volt Electric Co', trade: 'Handyman', is_licensed: false, avatar_color: '#8BA8C9', rating: 4.6, response_time: '6h ago', amount: 15000, price: '$150', message: 'Can fix this Saturday morning. Have done dozens of faucet repairs.', tags: ['Fast Response'], status: 'pending' }),
    ],
  }),
  mockJob({
    id: '2',
    title: 'Garage Door Won\u2019t Open',
    category: 'Garage Door',
    due_date: 'Mar 5',
    is_urgent: false,
    budget_range: '$200 – $600',
    address: '782 Maple Drive, Lakewood CO 80226',
    description: 'Garage door opener not responding. Remote and wall switch both dead. Model: LiftMaster 8500.',
    status: 'awarded',
    awarded_bid_id: 'b4',
    bids: [
      mockBid({ id: 'b4', job_id: '2', name: 'Mike Patterson', company: 'Denver Garage Pros', trade: 'Garage Door Tech', is_licensed: true, avatar_color: '#C5B5A8', rating: 4.9, response_time: '1h ago', amount: 42500, price: '$425', message: 'Sounds like a logic board issue. I can diagnose and repair same-day. LiftMaster certified.', tags: ['Licensed & Insured', 'Same-Day Service'], status: 'accepted' }),
      mockBid({ id: 'b5', job_id: '2', name: 'James Foster', company: 'Summit Roofing & Repair', trade: 'General Contractor', is_licensed: true, avatar_color: '#D4C5A8', rating: 4.7, response_time: '5h ago', amount: 55000, price: '$550', message: 'Happy to take a look. Might need a full opener replacement.', tags: ['Licensed & Insured'], status: 'rejected' }),
    ],
  }),
  mockJob({
    id: '3',
    title: 'Patch and Paint Bedroom Walls',
    category: 'Painting',
    due_date: 'Mar 8',
    is_urgent: false,
    budget_range: '$300 – $500',
    address: '1150 Pine Court, Aurora CO 80012',
    description: 'Multiple nail holes and one 4-inch drywall patch in master bedroom. Match existing eggshell finish.',
    status: 'in_progress',
    awarded_bid_id: 'b6',
    bids: [
      mockBid({ id: 'b6', job_id: '3', name: 'Sandra Kim', company: 'Fresh Coat Denver', trade: 'Painter', is_licensed: true, avatar_color: '#D4A8A8', rating: 4.9, response_time: '3h ago', amount: 38000, price: '$380', message: 'I can match the color with a quick sample patch. Two coats included. Will protect floors and trim.', tags: ['Licensed & Insured', 'Clean Work'], status: 'accepted' }),
    ],
  }),
  mockJob({
    id: '4',
    title: 'HVAC Inspection Pre-Close',
    category: 'HVAC',
    due_date: 'Mar 1',
    is_urgent: true,
    budget_range: '$100 – $250',
    address: '331 Oak Boulevard, Denver CO 80209',
    description: 'Buyer requested HVAC inspection before closing. Need full system check — furnace, AC unit, ductwork.',
    status: 'open',
    bids: [
      mockBid({ id: 'b7', job_id: '4', name: 'Tyler Reed', company: 'Alpine HVAC Solutions', trade: 'HVAC Technician', is_licensed: true, avatar_color: '#B5C5D4', rating: 4.8, response_time: '2h ago', amount: 18500, price: '$185', message: 'Full HVAC inspection with written report. I can come tomorrow afternoon.', tags: ['Licensed & Insured', 'Fast Response'], status: 'pending' }),
    ],
  }),
  mockJob({
    id: '5',
    title: 'Replace Front Porch Railing',
    category: 'Carpentry',
    due_date: 'Mar 12',
    is_urgent: false,
    budget_range: '$400 – $800',
    address: '205 Birch Lane, Centennial CO 80112',
    description: 'Front porch wood railing is rotted at the base. Needs full replacement — approximately 12 linear feet.',
    status: 'pending_completion',
    awarded_bid_id: 'b8',
    bids: [
      mockBid({ id: 'b8', job_id: '5', name: 'Brian Cooper', company: 'ProBuild Contractors', trade: 'General Contractor', is_licensed: true, avatar_color: '#7BA3C9', rating: 5.0, response_time: '1h ago', amount: 62500, price: '$625', message: "Cedar railing with treated posts. I'll pull a permit if needed — usually not required for replacements under 30in.", tags: ['Licensed & Insured', 'Permit-Ready'], status: 'accepted' }),
    ],
  }),
  mockJob({
    id: '7',
    title: 'Listing Photos — 4BR Colonial',
    category: 'Photography',
    due_date: 'Mar 6',
    is_urgent: false,
    budget_range: '$450 – $750',
    address: '612 Cedar Lane, Denver CO 80206',
    description: 'Full listing photo package for a 4BR colonial. Prefer golden hour exterior shots and drone aerials of the property and neighborhood.',
    status: 'open',
    // @demo mock photography fields — replace with live data
    job_type: 'photography',
    service_packages: ['Interior + Exterior Photos', 'Drone / Aerial'],
    turnaround_preference: 'Next Day',
    sqft: 2400,
    bids: [
      mockBid({ id: 'b10', job_id: '7', name: 'Priya Shah', company: 'Skyline Real Estate Media', trade: 'Photographer', is_licensed: true, avatar_color: '#A8C5D4', rating: 4.9, response_time: '2h ago', amount: 52500, price: '$525', message: 'Next-day turnaround with 30+ edited photos plus drone package. Licensed Part 107 pilot.', tags: ['Licensed & Insured', 'Fast Turnaround'], status: 'pending' }),
    ],
  }),
  mockJob({
    id: '8',
    title: 'Stage Primary Suite + Living Areas',
    category: 'Staging',
    due_date: 'Mar 10',
    is_urgent: false,
    budget_range: '$1,200 – $2,000',
    address: '2040 Spruce Avenue, Boulder CO 80302',
    description: 'Full staging for the main living areas of an occupied listing. Existing furniture can stay or be repositioned — open to collaboration with homeowner.',
    status: 'open',
    // @demo mock staging fields — replace with live data
    job_type: 'staging',
    occupied_or_vacant: 'occupied',
    rooms_count: 4,
    staging_scope: ['Living Room', 'Dining Room', 'Primary Bedroom'],
    sqft: 1800,
    bids: [
      mockBid({ id: 'b11', job_id: '8', name: 'Marisol Chen', company: 'Elevate Home Staging', trade: 'Home Stager', is_licensed: true, avatar_color: '#D4B5A8', rating: 4.9, response_time: '3h ago', amount: 165000, price: '$1,650', message: 'Occupied staging specialist. Will work with existing pieces plus a curated accent package.', tags: ['Licensed & Insured', 'Occupied Specialist'], status: 'pending' }),
    ],
  }),
  mockJob({
    id: '6',
    title: 'Landscaping Cleanup Before Listing',
    category: 'Landscaping',
    due_date: 'Feb 20',
    is_urgent: false,
    budget_range: '$200 – $450',
    address: '900 Aspen Way, Littleton CO 80120',
    description: 'Front and backyard cleanup before listing photos. Trim bushes, edge lawn, mulch beds, remove debris.',
    status: 'completed',
    awarded_bid_id: 'b9',
    bids: [
      mockBid({ id: 'b9', job_id: '6', name: 'Kevin Walsh', company: 'Walsh Landscaping', trade: 'Landscaper', is_licensed: true, avatar_color: '#B5D4A8', rating: 4.7, response_time: '4h ago', amount: 35000, price: '$350', message: "Full cleanup with debris haul-away. Can do it this weekend. I'll include fresh mulch.", tags: ['Licensed & Insured', 'Competitive Pricing'], status: 'accepted' }),
    ],
  }),
];

/**
 * Active repair jobs — filters out completed and cancelled statuses.
 * Used by HomeTabAgent Active Repairs section to only show pipeline-relevant jobs.
 *
 * @backend Replace with: useJobs({ status: { notIn: ['completed', 'cancelled'] } })
 */
export const ACTIVE_REPAIR_JOBS = MOCK_REPAIR_JOBS.filter(
  (job) => job.status !== 'completed' && job.status !== 'cancelled'
);

export type { JobStatus };
