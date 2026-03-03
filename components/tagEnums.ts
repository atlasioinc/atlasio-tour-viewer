// tagEnums.ts
// ═══════════════════════════════════════════════════════════════
// Profile Tag Definitions — Single source of truth
// PRD Reference: PRD #15 — Profile Tags — Curated Lists & Display Logic
//
// TWO-TAG ARCHITECTURE:
//   1. Self-Selected Tags (profiles.tags — tag_enum[])
//      - Chosen by pro during onboarding / profile editing
//      - Max 3 per profile (forces differentiation)
//      - Display: under bio on ProProfile, max 3 on FindTab cards
//      - Represents: "what I offer" — capabilities & credentials
//
//   2. Derived Tags (post-MVP — auto-generated from vouch analysis)
//      - Generated via NLP/regex on vouch comments
//      - Display: above vouches on ProProfile (up to 2-3)
//      - Represents: "what others confirm" — earned reputation
//      - See PRD #15 Section 7 for roadmap
//
// Storage: profiles.tags (tag_enum[]) — max 3 per profile
// Validation: profile update RPC checks submitted tags exist
//             in the curated list for the user's role.
//
// DISPLAY RULES:
//   - FindTab cards: max 3 self-selected tags
//   - ProProfile bio section: all self-selected tags (up to 3)
//   - ProProfile vouch section: derived tags only (post-MVP)
//   - Bid cards on RepairJobDetails: max 2 self-selected tags
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// COMMON TAGS (available to all roles)
// Displayed at top of every role's selection list
// ─────────────────────────────────────────────
export const COMMON_TAGS = {
  SPANISH_SPEAKING:     'Spanish-Speaking',
  BILINGUAL:            'Bilingual',
  WEEKEND_AVAILABILITY: 'Weekend Availability',
} as const;

// ─────────────────────────────────────────────
// MORTGAGE PRO TAGS
// ─────────────────────────────────────────────
export const MORTGAGE_TAGS = {
  FAST_CLOSER:              'Fast Closer',
  VA_SPECIALIST:            'VA Specialist',
  FHA_APPROVED:             'FHA Approved',
  JUMBO_SPECIALIST:         'Jumbo Loan Specialist',
  NO_JUNK_FEES:             'No Junk Fees',
  FIRST_TIME_BUYER:         'First-Time Buyer Friendly',
  SELF_EMPLOYED_FRIENDLY:   'Self-Employed Friendly',
  INVESTMENT_PROPERTY:      'Investment Property',
  RENOVATION_LOAN:          'Renovation Loan (203k)',
  DOWN_PAYMENT_ASSISTANCE:  'Down Payment Assistance',
  PRE_APPROVAL_24HR:        'Pre-Approval in 24hrs',
} as const;

// ─────────────────────────────────────────────
// TITLE/ESCROW TAGS
// Removed granular close-day tags (7/14/21) — use
// profiles.typical_close_days for exact speed.
// ─────────────────────────────────────────────
export const TITLE_TAGS = {
  FAST_TURNAROUND:          'Fast Turnaround',
  CASH_BUYER_EXPERT:        'Cash Buyer Expert',
  COMPLEX_SPECIALIST:       'Complex Transaction Specialist',
  NO_JUNK_FEES:             'No Junk Fees',
  TWENTY_FOUR_HR:           '24-Hour Service',
  MOBILE_CLOSING:           'Mobile Closing',
  BUILDER_NEW_CONSTRUCTION: 'Builder/New Construction',
} as const;

// ─────────────────────────────────────────────
// HOME INSPECTOR TAGS
// ─────────────────────────────────────────────
export const INSPECTOR_TAGS = {
  SAME_DAY_REPORTS:         'Same-Day Reports',
  TWENTY_FOUR_HR:           '24-Hour Turnaround',
  FOUNDATION_SPECIALIST:    'Foundation Specialist',
  ROOF_SPECIALIST:          'Roof Specialist',
  THERMAL_IMAGING:          'Thermal Imaging',
  SEWER_SCOPE:              'Sewer Scope',
  RADON_TESTING:            'Radon Testing',
  MOLD_TESTING:             'Mold Testing',
  PRE_LISTING_INSPECTION:   'Pre-Listing Inspection',
} as const;

// ─────────────────────────────────────────────
// APPRAISER TAGS
// ─────────────────────────────────────────────
export const APPRAISER_TAGS = {
  RUSH_AVAILABLE:           'Rush Available',
  FHA_VA_CERTIFIED:         'FHA/VA Certified',
  LUXURY_HIGH_VALUE:        'Luxury/High-Value',
  NEW_CONSTRUCTION:         'New Construction',
  MULTI_FAMILY:             'Multi-Family',
  DESKTOP_APPRAISAL:        'Desktop Appraisal',
  RURAL_ACREAGE:            'Rural/Acreage',
  CONDO_APPROVED:           'Condo Approved',
} as const;

// ─────────────────────────────────────────────
// TRANSACTION COORDINATOR TAGS
// Removed low-signal tags (Deadline Tracker, Digital-First)
// — those should be table stakes, not differentiators.
// ─────────────────────────────────────────────
export const TC_TAGS = {
  FAST_TURNAROUND:          'Fast Turnaround',
  MULTI_STATE:              'Multi-State Licensed',
  NEW_AGENT_FRIENDLY:       'New Agent Friendly',
  HIGH_VOLUME:              'High Volume',
  DUAL_TRANSACTION:         'Dual Transaction',
  CONTRACT_TO_CLOSE:        'Contract to Close',
  REO_BANK_OWNED:           'REO/Bank-Owned',
  SHORT_SALE:               'Short Sale Experience',
} as const;

// ─────────────────────────────────────────────
// CONTRACTOR TAGS
// Removed "Clean Work" — better as a derived tag from vouches.
// ─────────────────────────────────────────────
export const CONTRACTOR_TAGS = {
  LICENSED_INSURED:         'Licensed & Insured',
  FAST_RESPONSE:            'Fast Response',
  EMERGENCY_SERVICE:        'Emergency Service',
  ON_TIME_COMPLETION:       'On-Time Completion',
  WARRANTY_OFFERED:         'Warranty Offered',
  COMPETITIVE_PRICING:      'Competitive Pricing',
  PERMIT_PULLING:           'Permit Pulling',
  BILINGUAL_CREW:           'Bilingual Crew',
} as const;

// ─────────────────────────────────────────────
// WARRANTY TAGS
// ─────────────────────────────────────────────
export const WARRANTY_TAGS = {
  COMPREHENSIVE_PLANS:      'Comprehensive Plans',
  FAST_CLAIMS:              'Fast Claims',
  SELLER_COVERAGE:          'Seller Coverage',
  NEW_CONSTRUCTION:         'New Construction Coverage',
  FLEXIBLE_PLANS:           'Flexible Plans',
  LOW_DEDUCTIBLE:           'Low Deductible',
} as const;

// ─────────────────────────────────────────────
// ATTORNEY TAGS
// ─────────────────────────────────────────────
export const ATTORNEY_TAGS = {
  CONTRACT_REVIEW:          'Contract Review',
  FLAT_FEE:                 'Flat Fee',
  RE_LITIGATION:            'Real Estate Litigation',
  TEN_THIRTY_ONE:           '1031 Exchange',
  HOA_CONDO:                'HOA/Condo Law',
  FORECLOSURE:              'Foreclosure/Short Sale',
  TITLE_DISPUTE:            'Title Dispute',
  ESTATE_PROBATE:           'Estate/Probate Sale',
} as const;

// ─────────────────────────────────────────────
// ROLE → TAG LIST MAPPING
// Used by onboarding UI and profile update RPC
// Each role gets their specific tags + common tags
// ─────────────────────────────────────────────
export const TAGS_BY_ROLE = {
  'Mortgage Pro':             { ...COMMON_TAGS, ...MORTGAGE_TAGS },
  'Title/Escrow':             { ...COMMON_TAGS, ...TITLE_TAGS },
  'Home Inspector':           { ...COMMON_TAGS, ...INSPECTOR_TAGS },
  'Appraiser':                { ...COMMON_TAGS, ...APPRAISER_TAGS },
  'Transaction Coordinator':  { ...COMMON_TAGS, ...TC_TAGS },
  'Contractor':               { ...COMMON_TAGS, ...CONTRACTOR_TAGS },
  'Warranty':                 { ...COMMON_TAGS, ...WARRANTY_TAGS },
  'Attorney':                 { ...COMMON_TAGS, ...ATTORNEY_TAGS },
} as const;

// Helper: get flat array of valid tag strings for a role
export const getTagsForRole = (role: string): string[] =>
  Object.values(TAGS_BY_ROLE[role as keyof typeof TAGS_BY_ROLE] || {});

// ─────────────────────────────────────────────
// ALL TAGS (flat deduplicated list for global validation)
// ─────────────────────────────────────────────
const allTagSets = [
  COMMON_TAGS,
  MORTGAGE_TAGS,
  TITLE_TAGS,
  INSPECTOR_TAGS,
  APPRAISER_TAGS,
  TC_TAGS,
  CONTRACTOR_TAGS,
  WARRANTY_TAGS,
  ATTORNEY_TAGS,
];

export const ALL_TAGS = [...new Set(
  allTagSets.flatMap(tagSet => Object.values(tagSet))
)];

export type TagValue = (typeof ALL_TAGS)[number];

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
export const MAX_PROFILE_TAGS = 3;     // Self-selected cap (forces differentiation)
export const MAX_DISPLAY_CARD = 3;     // FindTab pro cards
export const MAX_DISPLAY_PROFILE = 3;  // ProProfile bio section (self-selected only)
export const MAX_DISPLAY_BID = 2;      // Bid cards on RepairJobDetails
// NOTE: Derived tags (post-MVP) display separately above vouches — up to 3