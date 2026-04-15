// lib/tradesMap.ts
// ═══════════════════════════════════════════════════════════════
// Bidirectional mapping between TRADE_OPTIONS UI labels and trades_enum DB values.
// Source of truth for all trade label ↔ enum translations across the app.
//
// @backend — DB enum values must match trades_enum in sql/schema.sql exactly.
//            Verified against schema.sql lines 109–123 (S148a, April 14 2026).
//
// Usage:
//   import { TRADE_LABEL_TO_ENUM, TRADE_ENUM_TO_LABEL } from '../lib/tradesMap';
//   // Save path: UI label → DB enum value
//   const dbValue = TRADE_LABEL_TO_ENUM[uiLabel] ?? uiLabel;
//   // Load path: DB enum value → UI label
//   const uiLabel = TRADE_ENUM_TO_LABEL[dbValue] ?? dbValue;
//
// ATL-CONTRACTOR-TRADES-2: EditRepairJob.tsx + PostJobWizard.tsx declare their
// own TRADE_OPTIONS arrays and have NOT been migrated to use this map.
// Audit in a dedicated session before production launch.
// ═══════════════════════════════════════════════════════════════

/**
 * Maps UI display labels (as shown in TRADE_OPTIONS chip grids) to the
 * exact `trades_enum` values in Postgres. Keys must match every entry
 * in `TRADE_OPTIONS` — unmapped labels pass through unchanged and will
 * be rejected by Postgres as invalid enum values.
 */
export const TRADE_LABEL_TO_ENUM: Record<string, string> = {
  // Contractor-profile labels (S148a — ATL-119 fix, 7 mislabels)
  'Electrician':        'Electrical',
  'Plumber':            'Plumbing',
  'Roofer':             'Roofing',
  'Painter':            'Painting',
  'Landscaper':         'Landscaping / Drainage',
  'Driveway/Paving':    'Driveway / Paving',

  // Identity mappings — labels that already match trades_enum verbatim.
  // Verified against sql/schema.sql lines 109-123 (trades_enum definition).
  // Added S157b to close ATL-120 (EditRepairJob side).
  'General Contractor':      'General Contractor',
  'HVAC':                    'HVAC',
  'Carpentry / Handyman':    'Carpentry / Handyman',   // Legacy — kept for backward compat on existing rows
  'Carpentry':               'Carpentry',
  'Handyman':                'Handyman',
  'Flooring':                'Flooring',
  'Windows & Doors':         'Windows & Doors',
  'Foundation / Structural': 'Foundation / Structural',
  'Drywall / Sheetrock':     'Drywall / Sheetrock',
  'Pest Control / Termite':  'Pest Control / Termite',
  'Mold Remediation':        'Mold Remediation',
  'Sewer / Septic':          'Sewer / Septic',
  'Pool & Spa':              'Pool & Spa',
  'Chimney / Fireplace':     'Chimney / Fireplace',
  'Garage Door':             'Garage Door',
  'Appliances':              'Appliances',
  'Locksmith / Re-key':      'Locksmith / Re-key',
  'Cleaning / Junk Removal': 'Cleaning / Junk Removal',
  'Concrete / Masonry':      'Concrete / Masonry',
  'Other':                   'Other',
};

/**
 * Reverse map — derived from TRADE_LABEL_TO_ENUM. Used on the load path
 * to translate DB enum values back to UI labels for chip pre-fill state
 * and for display surfaces (e.g. ProfileTab hero trade pill).
 */
export const TRADE_ENUM_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(TRADE_LABEL_TO_ENUM).map(([label, enumVal]) => [enumVal, label])
);

/**
 * Flat list of all UI labels — drives the chip grid in EditRepairJob.
 * Order follows TRADE_LABEL_TO_ENUM declaration order: contractor-profile
 * labels first, then the full identity-mapped job-side set. Consumers that
 * want a custom order should import TRADE_LABEL_TO_ENUM and sort themselves.
 */
export const ALL_TRADE_LABELS: string[] = Object.keys(TRADE_LABEL_TO_ENUM);
