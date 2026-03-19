// ═══════════════════════════════════════════════════════════════
// lib/tokens.ts
// Design System Tokens — Single Source of Truth
//
// All screens and components import from here. Never hardcode
// colors, sizes, typography, or spacing inline. If a value appears
// in more than one screen, it belongs here.
//
// Exports (6):
//   COLORS       — 105 named colors (brand, text, borders, status, overlays, chat)
//   TYPOGRAPHY   — 14 text styles (display, heading, body, caption, micro, section)
//   SPACING      — 10-step scale (xs=2 → 5xl=48)
//   DIMENSIONS   — 24 component sizes (headers, buttons, inputs, cards, avatars, modals)
//   SHADOWS      — 2 presets (card, modal)
//   ICONS        — 5 size tiers (nav, action, inline, small, tabBar)
//
// NOTE: Onboarding screens (Onboarding1–4, ContractorProfileBasics, etc.)
// maintain their own local COLORS objects — they do NOT import from here.
// This is intentional: onboarding has a distinct visual style.
//
// Last audited: Feb 22, 2026 — 25 screen files
// @backend: none — purely client-side constants
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────
// COLORS
// ─────────────────────────────────────────────

export const COLORS = {
  // ── Brand ──
  primary: '#003DC3',
  accentBlue: '#155DFC',

  // ── Backgrounds ──
  background: '#FFFFFF',
  screenBg: '#F7F7FC',
  filterBg: '#F9FAFB',       // filter panels, search bg, input bg
  tagBg: '#F4F7FF',          // tag pills, trade pills, bid amount cards
  statBg: '#F2F6FE',         // lightning stat row on pro cards
  chipBg: '#F3F4F6',         // inactive filter chips, tag chips
  infoBg: '#EFF6FF',         // info banners, category badges
  infoBorder: '#DBEAFE',     // border for info banners
  infoText: '#003DC3',       // Info card headline + subtitle text — alias of primary, named for semantic clarity
  backgroundInfo: '#EFF6FF', // Light blue — invite banners, informational callouts (AgentMessageBanner)
  sortBg: '#F2F2F7',         // sort dropdown pill
  quoteBg: '#F5F5F5',        // vouch quote backgrounds

  // ── Text Hierarchy ──
  darkText: '#1C1C1E',       // primary headings, names, modal titles
  headingText: '#101828',     // screen titles, card headings
  bodyText: '#4A5565',        // body copy, descriptions, filter labels
  statText: '#364153',        // stat values, bid quotes, label text
  secondaryText: '#666666',   // subtitles, company names, metadata
  tertiaryText: '#757575',    // lighter secondary (FindTab, NetworkTab)
  sortText: '#333333',        // sort pill text, bold body variant
  tagText: '#707070',         // tag pill text
  lightText: '#99A1AF',       // placeholders, timestamps, disabled text
  mutedText: '#6A7282',       // icon gray, muted labels
  placeholderText: 'rgba(10, 10, 10, 0.5)' as const,

  // ── Borders ──
  border: '#E5E7EB',          // headers, dividers, section borders — NEVER #000000
  cardBorder: '#F3F4F6',      // card outlines (lighter than border)
  inputBorder: '#D1D5DC',     // search inputs, text inputs, form fields
  inputBackground: '#F9FAFB',  // subtle gray bg for all text input fields (S69)
  inputActiveBorder: 'rgba(0, 61, 195, 0.25)' as const,  // blue tint border when field has value (S69)

  // ── Status & Feedback ──
  starColor: '#FFB900',       // star rating icons (Find, Network)
  starText: '#D08700',        // star text on bid cards
  errorRed: '#E7000B',        // reject buttons, delete, cancel actions
  rejectRed: '#E7000B',       // alias — reject/decline borders, icons, text
  notificationRed: '#FB2C36', // badge dots, alert states
  successGreen: '#16A34A',    // awarded badge, success states
  addedGreen: '#219653',      // "Added to Squad" confirmation
  onlineGreen: '#00C950',     // online status dot, accept icons
  counterAmber: '#D97706',    // counter offer button, pending states
  warningAmber: '#D97706',    // warning states, verify nudges (alias of counterAmber)
  bidOrange: '#FF6900',       // bid notification icons
  mentionPurple: '#AD46FF',   // mention notification icons

  // ── Urgent ──
  urgentBg: '#FFE2E2',
  urgentText: '#C10007',

  // ── Counter/Warning ──
  warningBg: '#FFFBEB',
  warningText: '#92400E',
  mustHaveTileBg: '#FEF3C7',    // S61: amber-50 background for must_have lifestyle tiles

  // Budget card tokens (ContractorJobDetails — S33)
  inRangeGreen: '#008236',      // "In range" bid indicator — intentionally darker than successGreen (informational vs celebration state)
  budgetLabelText: '#DBEAFE',   // "Agent's Budget" label text on accentBlue filled card
  budgetSeparator: '#BEDBFF',   // The – dash between budget min/max values on blue card

  // ── Fee/Success (contractor-side) ──
  feeBg: '#F0FDF4',
  feeText: '#15803D',

  // ── Overlays ──
  overlayDark: 'rgba(0, 0, 0, 0.5)' as const,   // modal backdrops (bid actions)
  overlayLight: 'rgba(0, 0, 0, 0.3)' as const,   // sort/menu backdrops
  overlayPhoto: 'rgba(0, 0, 0, 0.6)' as const,   // photo delete overlay
  iconTintBg: 'rgba(0, 61, 195, 0.10)' as const,  // tinted icon backgrounds

  // ── Chat Bubbles ──
  sentBubble: '#003DC3',
  sentText: '#FFFFFF',
  receivedBubble: '#FFFFFF',
  receivedText: '#1C1C1E',
  timestampText: '#99A1AF',
  timestampMine: 'rgba(255, 255, 255, 0.70)' as const,

  // ── Home Quick Action Cards ──
  cardBlue: '#EFF6FF',
  cardBlueBorder: '#BEDBFF',
  cardBlueIcon: '#155DFC',
  cardGreen: '#F0FDF4',
  cardGreenBorder: '#B9F8CF',
  cardGreenIcon: '#00A63E',
  cardOrange: '#FFF7ED',
  cardOrangeBorder: '#FFD6A7',
  cardPurple: '#FAF5FF',
  cardPurpleBorder: '#E9D4FF',
  cardPurpleIcon: '#9810FA',

  // ── Misc ──
  squadCircle: '#D9D9FF',
  selectedBg: '#EFF5FF',       // selected chips, active filter bg
  disabledBg: '#E5E7EB',
  disabledText: '#99A1AF',
  systemBg: '#E5E7EB',        // system message bubbles in chat

  // ── Neighborhood Intelligence ──
  rankGold: '#F59E0B',           // rank #1 badge — gold
  rankSilver: '#9CA3AF',         // rank #2 badge — silver
  rankBronze: '#B45309',         // rank #3 badge — bronze
  winnerBannerBg: '#F0FDF4',     // winner callout background
  winnerBannerBorder: '#059669', // winner callout border
  winnerBannerText: '#065F46',   // winner callout text
  scoreGreen: '#059669',         // composite score >= 85 (emerald-600, unifies AddressComparison + NeighborhoodMatch)
  scoreAmber: '#D97706',         // composite score >= 70 and < 85
  scoreRed: '#DC2626',           // composite score < 70
  // @tokens S59: added to resolve annotated inline hex in AddressComparisonScreen
  winnerCardBorder: '#BBF7D0',   // winner card confirmed-address border (green-200)
  disabledPrimaryTint: '#C7D2FE', // disabled CTA background tint (indigo-200)

  // ── Partner Track (S62) ──
  dangerText: '#DC2626',         // Rate lock danger state — added S62
  dangerBg: '#FEF2F2',          // Rate lock urgent banner background — added S62
  dangerBorder: '#FECACA',      // Rate lock urgent banner border — added S62
} as const;

// ─────────────────────────────────────────────
// TYPOGRAPHY
// ─────────────────────────────────────────────

export const TYPOGRAPHY = {
  // ── Display — prices, hero numbers ──
  displayL:    { fontSize: 30, fontWeight: '700' as const, lineHeight: 36, letterSpacing: 0.4 },
  displayM:    { fontSize: 24, fontWeight: '600' as const, lineHeight: 32, letterSpacing: 0.07 },

  // ── Headings ──
  headingL:    { fontSize: 18, fontWeight: '600' as const, lineHeight: 28 },
  headingM:    { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },

  // ── Body ──
  bodyL:       { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyLMedium: { fontSize: 16, fontWeight: '500' as const, lineHeight: 24 },
  bodyM:       { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyMBold:   { fontSize: 14, fontWeight: '500' as const, lineHeight: 20 },
  bodyS:       { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },

  // ── Caption ──
  caption:     { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },

  // ── Micro — badge counts, avatar initials (no lineHeight needed) ──
  micro:       { fontSize: 11, fontWeight: '600' as const },

  // ── Section Headers (spread + add textTransform/letterSpacing) ──
  sectionA: {
    fontSize: 15, fontWeight: '500' as const, lineHeight: 22,
    textTransform: 'uppercase' as const, letterSpacing: 0.14,
  },
  sectionB: {
    fontSize: 13, fontWeight: '600' as const, lineHeight: 18,
    textTransform: 'uppercase' as const, letterSpacing: 0.5,
  },
  sectionC: {
    fontSize: 12, fontWeight: '400' as const, lineHeight: 16,
    textTransform: 'uppercase' as const, letterSpacing: 0.3,
  },
} as const;

// ─────────────────────────────────────────────
// SPACING
// ─────────────────────────────────────────────

export const SPACING = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  '5xl': 48,
} as const;

// ─────────────────────────────────────────────
// COMPONENT DIMENSIONS
// ─────────────────────────────────────────────

export const DIMENSIONS = {
  // Headers
  headerHeight: 48,
  headerBorderWidth: 0.68,

  // Buttons
  buttonCardHeight: 36,
  buttonModalHeight: 48,
  buttonSendSize: 40,

  // Inputs
  searchHeight: 48,
  chatInputHeight: 45,
  formInputHeight: 48,

  // Cards
  cardRadius: 14,
  bidCardRadius: 16,
  cardBorderWidth: 0.68,

  // Avatars
  avatarHero: 120,
  avatarProfile: 100,
  avatarProCard: 56,
  avatarBidCard: 52,
  avatarSquad: 48,
  avatarChatBubble: 40,
  avatarChatHeader: 32,
  avatarCompact: 28,
  avatarMini: 24,

  // Modals
  modalRadiusLarge: 24,    // bid action modals
  modalRadiusSmall: 14,    // sort/menu dropdowns
  modalMaxWidthLarge: 360, // bid action modals
  modalMaxWidthSmall: 280, // sort/menu dropdowns

  // Misc
  pillRadius: 9999,
  tagRadius: 10,
  buttonRadius: 8,
  inputRadius: 10,
} as const;

// ─────────────────────────────────────────────
// SHADOWS
// ─────────────────────────────────────────────

export const SHADOWS = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.1,
    shadowRadius: 25,
    elevation: 10,
  },
} as const;

// ─────────────────────────────────────────────
// ICON SIZES
// ─────────────────────────────────────────────

export const ICONS = {
  nav: { size: 20, strokeWidth: 1.67 },
  action: { size: 24, strokeWidth: 2.0 },
  inline: { size: 14, strokeWidth: 1.17 },
  small: { size: 16, strokeWidth: 1.33 },
  tabBar: { size: 28, strokeWidth: 2.33 },
} as const;
