// tagEnums.ts
// ═══════════════════════════════════════════════════════════════
// Profile Tag Definitions — Single source of truth
// PRD Reference: PRD #15 — Profile Tags — Curated Lists & Display Logic
//
// Storage: profiles.specialties (text[]) — max 5 per profile
// Display: max 3 on FindTab cards, max 5 on ProProfile, max 2 on bid cards
//
// MVP: All tags are self-selected during onboarding / profile editing.
//      Validation: profile update RPC checks submitted tags exist
//      in the curated list for the user's role (role-specific + common).
//
// Post-MVP: Auto-derived tags from review comment analysis (NLP/regex).
//           See PRD #15 Section 7 for roadmap.
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
  CONVENTIONAL_EXPERT:      'Conventional Expert',
  JUMBO_SPECIALIST:         'Jumbo Loan Specialist',
  NO_JUNK_FEES:             'No Junk Fees',
  FIRST_TIME_BUYER:         'First-Time Buyer Friendly',
} as const;

// ─────────────────────────────────────────────
// TITLE/ESCROW TAGS
// ─────────────────────────────────────────────
export const TITLE_TAGS = {
  FAST_TURNAROUND:          'Fast Turnaround',
  CLOSE_7_DAY:              '7-Day Close',
  CLOSE_14_DAY:             '14-Day Close',
  CLOSE_21_DAY:             '21-Day Close',
  CASH_BUYER_EXPERT:        'Cash Buyer Expert',
  COMPLEX_SPECIALIST:       'Complex Transaction Specialist',
  NO_JUNK_FEES:             'No Junk Fees',
  TWENTY_FOUR_HR:           '24-Hour Service',
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
  WHOLE_HOUSE:              'Whole House',
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
} as const;

// ─────────────────────────────────────────────
// TRANSACTION COORDINATOR TAGS
// ─────────────────────────────────────────────
export const TC_TAGS = {
  FAST_TURNAROUND:          'Fast Turnaround',
  DEADLINE_TRACKER:         'Deadline Tracker',
  MULTI_STATE:              'Multi-State Licensed',
  NEW_AGENT_FRIENDLY:       'New Agent Friendly',
  HIGH_VOLUME:              'High Volume',
  DIGITAL_FIRST:            'Digital-First',
} as const;

// ─────────────────────────────────────────────
// CONTRACTOR TAGS
// ─────────────────────────────────────────────
export const CONTRACTOR_TAGS = {
  LICENSED_INSURED:         'Licensed & Insured',
  FAST_RESPONSE:            'Fast Response',
  EMERGENCY_SERVICE:        'Emergency Service',
  ON_TIME_COMPLETION:       'On-Time Completion',
  WARRANTY_OFFERED:         'Warranty Offered',
  COMPETITIVE_PRICING:      'Competitive Pricing',
  CLEAN_WORK:               'Clean Work',
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
export const MAX_PROFILE_TAGS = 5;
export const MAX_DISPLAY_CARD = 3;    // FindTab pro cards
export const MAX_DISPLAY_PROFILE = 5; // ProProfile header
export const MAX_DISPLAY_BID = 2;     // Bid cards on RepairJobDetails
