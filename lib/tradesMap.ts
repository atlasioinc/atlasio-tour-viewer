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
  'Electrician':        'Electrical',
  'Plumber':            'Plumbing',
  'Roofer':             'Roofing',
  'General Contractor': 'General Contractor',   // identity — verified in schema.sql
  'HVAC':               'HVAC',                 // identity — verified in schema.sql
  'Painter':            'Painting',
  'Landscaper':         'Landscaping / Drainage',
  'Driveway/Paving':    'Driveway / Paving',
};

/**
 * Reverse map — derived from TRADE_LABEL_TO_ENUM. Used on the load path
 * to translate DB enum values back to UI labels for chip pre-fill state
 * and for display surfaces (e.g. ProfileTab hero trade pill).
 */
export const TRADE_ENUM_TO_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(TRADE_LABEL_TO_ENUM).map(([label, enumVal]) => [enumVal, label])
);
