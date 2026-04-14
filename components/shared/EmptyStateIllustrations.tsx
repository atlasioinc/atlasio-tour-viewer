// ═══════════════════════════════════════════════════════════════
// components/shared/EmptyStateIllustrations.tsx
// 10 SVG illustrations for the shared <EmptyState /> component (S149a).
//
// INTERNAL FILE — do NOT export from components/shared/index.ts.
// Consumers always import <EmptyState illustration="..." /> instead
// of touching these directly.
//
// CONVENTIONS (non-negotiable — keep all 10 illustrations consistent):
//   • Render size:    160 × 160
//   • viewBox:        "0 0 160 160"
//   • Stroke width:   1.5 (everywhere)
//   • Stroke caps:    "round"
//   • Stroke joins:   "round"
//   • Color palette:  EMPTY_PALETTE only — no inline hex anywhere
//
// To add a new illustration:
//   1. Add a new key to EmptyStateIllustration union in EmptyState.tsx
//   2. Implement a new named export here using EMPTY_PALETTE only
//   3. Add the case in the switch in EmptyState.tsx
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import Svg, {
  Circle, Ellipse, Line, Path, Polygon, Polyline, Rect,
} from 'react-native-svg';
import { COLORS } from '../../lib/tokens';

// ─── PALETTE ───
const EMPTY_PALETTE = {
  primary: COLORS.primary,         // #003DC3 — strokes and accents
  fill:    COLORS.emptyStateFill,  // #EBF0FF — light blue fill
  mid:     COLORS.emptyStateMid,   // #C7D4FF — mid blue
  white:   COLORS.background,      // #FFFFFF — interiors
} as const;

const SIZE = 160;
const VIEW_BOX = '0 0 160 160';
const SW = 1.5;          // standard stroke width
const CAP = 'round' as const;
const JOIN = 'round' as const;

// Shared Svg wrapper props — every illustration uses these exact attributes
const svgProps = {
  width: SIZE,
  height: SIZE,
  viewBox: VIEW_BOX,
} as const;

// ─── 1. INBOX — envelope in tray ───
export const InboxIllustration: React.FC = () => (
  <Svg {...svgProps}>
    {/* Tray */}
    <Rect x={20} y={78} width={120} height={60} rx={6}
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinejoin={JOIN} />
    {/* Tray walls */}
    <Rect x={20} y={78} width={6} height={60}
      fill={EMPTY_PALETTE.mid} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinejoin={JOIN} />
    <Rect x={134} y={78} width={6} height={60}
      fill={EMPTY_PALETTE.mid} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinejoin={JOIN} />
    {/* Envelope body */}
    <Rect x={42} y={36} width={76} height={54} rx={4}
      fill={EMPTY_PALETTE.white} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinejoin={JOIN} />
    {/* Envelope flap */}
    <Polyline points="42,36 80,68 118,36"
      fill="none" stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinecap={CAP} strokeLinejoin={JOIN} />
  </Svg>
);

// ─── 2. FIND — magnifying glass with × ───
export const FindIllustration: React.FC = () => (
  <Svg {...svgProps}>
    {/* Outer ring */}
    <Circle cx={68} cy={68} r={42}
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
    {/* Inner lens */}
    <Circle cx={68} cy={68} r={32}
      fill={EMPTY_PALETTE.white} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
    {/* Handle */}
    <Line x1={100} y1={100} x2={134} y2={134}
      stroke={EMPTY_PALETTE.primary} strokeWidth={3.5} strokeLinecap={CAP} />
    {/* × inside lens */}
    <Line x1={56} y1={56} x2={80} y2={80}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={80} y1={56} x2={56} y2={80}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
  </Svg>
);

// ─── 3. NETWORK — two person nodes, dashed link, plus circle ───
export const NetworkIllustration: React.FC = () => {
  const node = (cx: number) => (
    <>
      <Circle cx={cx} cy={80} r={26}
        fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
      {/* Avatar head */}
      <Circle cx={cx} cy={72} r={8}
        fill={EMPTY_PALETTE.mid} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
      {/* Avatar body arc */}
      <Path d={`M ${cx - 12} 96 Q ${cx} 84 ${cx + 12} 96`}
        fill="none" stroke={EMPTY_PALETTE.primary}
        strokeWidth={SW} strokeLinecap={CAP} strokeLinejoin={JOIN} />
    </>
  );
  return (
    <Svg {...svgProps}>
      {node(34)}
      {node(126)}
      {/* Dashed connector */}
      <Line x1={60} y1={80} x2={100} y2={80}
        stroke={EMPTY_PALETTE.mid} strokeWidth={SW}
        strokeDasharray="5,4" strokeLinecap={CAP} />
      {/* Plus circle */}
      <Circle cx={80} cy={80} r={11}
        fill={EMPTY_PALETTE.white} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
      <Line x1={80} y1={74} x2={80} y2={86}
        stroke={EMPTY_PALETTE.primary} strokeWidth={SW} strokeLinecap={CAP} />
      <Line x1={74} y1={80} x2={86} y2={80}
        stroke={EMPTY_PALETTE.primary} strokeWidth={SW} strokeLinecap={CAP} />
    </Svg>
  );
};

// ─── 4. JOB TRACKER — clipboard with empty lines ───
export const JobTrackerIllustration: React.FC = () => (
  <Svg {...svgProps}>
    {/* Clipboard body */}
    <Rect x={36} y={28} width={88} height={108} rx={5}
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinejoin={JOIN} />
    {/* Clip top */}
    <Rect x={64} y={18} width={32} height={20} rx={5}
      fill={EMPTY_PALETTE.mid} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinejoin={JOIN} />
    {/* 4 horizontal lines (full, 85%, 90%, 75% of inner width = 64) */}
    <Line x1={48} y1={60} x2={112} y2={60}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={48} y1={78} x2={102} y2={78}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={48} y1={96} x2={106} y2={96}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={48} y1={114} x2={96} y2={114}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
  </Svg>
);

// ─── 5. CONTRACTOR HOME — hard hat ───
export const ContractorHomeIllustration: React.FC = () => (
  <Svg {...svgProps}>
    {/* Brim */}
    <Ellipse cx={80} cy={108} rx={56} ry={10}
      fill={EMPTY_PALETTE.mid} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
    {/* Dome */}
    <Path d="M 32 108 Q 32 50 80 50 Q 128 50 128 108 Z"
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinecap={CAP} strokeLinejoin={JOIN} />
    {/* Strap line across dome interior */}
    <Line x1={36} y1={92} x2={124} y2={92}
      stroke={EMPTY_PALETTE.primary} strokeWidth={1.2} strokeLinecap={CAP} />
    {/* Center dot */}
    <Circle cx={80} cy={70} r={6}
      fill={EMPTY_PALETTE.mid} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
  </Svg>
);

// ─── 6. AGENT DEALS — three dashed pipeline cards with arrows ───
export const AgentDealsIllustration: React.FC = () => (
  <Svg {...svgProps}>
    {/* 3 cards */}
    <Rect x={14} y={56} width={36} height={48} rx={6}
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.mid}
      strokeWidth={SW} strokeDasharray="4,3" strokeLinejoin={JOIN} />
    <Rect x={62} y={56} width={36} height={48} rx={6}
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.mid}
      strokeWidth={SW} strokeDasharray="4,3" strokeLinejoin={JOIN} />
    <Rect x={110} y={56} width={36} height={48} rx={6}
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.mid}
      strokeWidth={SW} strokeDasharray="4,3" strokeLinejoin={JOIN} />
    {/* Arrow 1 */}
    <Line x1={52} y1={80} x2={60} y2={80}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
    <Polyline points="56,76 60,80 56,84"
      fill="none" stroke={EMPTY_PALETTE.mid}
      strokeWidth={SW} strokeLinecap={CAP} strokeLinejoin={JOIN} />
    {/* Arrow 2 */}
    <Line x1={100} y1={80} x2={108} y2={80}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
    <Polyline points="104,76 108,80 104,84"
      fill="none" stroke={EMPTY_PALETTE.mid}
      strokeWidth={SW} strokeLinecap={CAP} strokeLinejoin={JOIN} />
    {/* Plus icon in first card */}
    <Line x1={32} y1={74} x2={32} y2={86}
      stroke={EMPTY_PALETTE.primary} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={26} y1={80} x2={38} y2={80}
      stroke={EMPTY_PALETTE.primary} strokeWidth={SW} strokeLinecap={CAP} />
  </Svg>
);

// ─── 7. NOTIFICATIONS — bell with checkmark badge ───
export const NotificationsIllustration: React.FC = () => (
  <Svg {...svgProps}>
    {/* Bell body */}
    <Path d="M 50 96 Q 50 50 80 46 Q 110 50 110 96 Z"
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinecap={CAP} strokeLinejoin={JOIN} />
    {/* Bell base */}
    <Rect x={42} y={96} width={76} height={8} rx={4}
      fill={EMPTY_PALETTE.mid} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinejoin={JOIN} />
    {/* Clapper */}
    <Circle cx={80} cy={114} r={6}
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
    {/* Check badge */}
    <Circle cx={114} cy={50} r={14}
      fill={EMPTY_PALETTE.white} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
    <Polyline points="107,50 112,55 121,46"
      fill="none" stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinecap={CAP} strokeLinejoin={JOIN} />
  </Svg>
);

// ─── 8. JOB BIDS — speech bubble + clock ───
export const JobBidsIllustration: React.FC = () => (
  <Svg {...svgProps}>
    {/* Bubble */}
    <Rect x={22} y={32} width={92} height={64} rx={8}
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinejoin={JOIN} />
    {/* Bubble tail */}
    <Path d="M 36 96 L 32 110 L 50 96 Z"
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinecap={CAP} strokeLinejoin={JOIN} />
    {/* 2 lines inside bubble */}
    <Line x1={34} y1={54} x2={102} y2={54}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={34} y1={72} x2={88} y2={72}
      stroke={EMPTY_PALETTE.mid} strokeWidth={SW} strokeLinecap={CAP} />
    {/* Clock face */}
    <Circle cx={116} cy={114} r={22}
      fill={EMPTY_PALETTE.white} stroke={EMPTY_PALETTE.primary} strokeWidth={SW} />
    {/* Clock hands */}
    <Line x1={116} y1={114} x2={116} y2={100}
      stroke={EMPTY_PALETTE.primary} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={116} y1={114} x2={126} y2={118}
      stroke={EMPTY_PALETTE.primary} strokeWidth={SW} strokeLinecap={CAP} />
  </Svg>
);

// ─── 9. VOUCH FEED — star + faded card outlines ───
export const VouchFeedIllustration: React.FC = () => (
  <Svg {...svgProps}>
    {/* Star (5-point) */}
    <Polygon points="80,18 92,46 122,50 100,72 106,102 80,87 54,102 60,72 38,50 68,46"
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinejoin={JOIN} />
    {/* 2 card outlines below */}
    <Rect x={22} y={114} width={52} height={28} rx={6}
      fill="none" stroke={EMPTY_PALETTE.mid}
      strokeWidth={SW} strokeDasharray="4,3" strokeLinejoin={JOIN} />
    <Rect x={86} y={114} width={52} height={28} rx={6}
      fill="none" stroke={EMPTY_PALETTE.mid}
      strokeWidth={SW} strokeDasharray="4,3" strokeLinejoin={JOIN} />
    {/* Faint lines inside each card */}
    <Line x1={28} y1={124} x2={68} y2={124}
      stroke={EMPTY_PALETTE.fill} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={28} y1={132} x2={60} y2={132}
      stroke={EMPTY_PALETTE.fill} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={92} y1={124} x2={132} y2={124}
      stroke={EMPTY_PALETTE.fill} strokeWidth={SW} strokeLinecap={CAP} />
    <Line x1={92} y1={132} x2={124} y2={132}
      stroke={EMPTY_PALETTE.fill} strokeWidth={SW} strokeLinecap={CAP} />
  </Svg>
);

// ─── 10. PROFILE VOUCHES — shield with dashed checkmark ───
export const ProfileVouchesIllustration: React.FC = () => (
  <Svg {...svgProps}>
    {/* Shield */}
    <Path d="M 80 22 L 130 40 L 130 84 Q 130 122 80 140 Q 30 122 30 84 L 30 40 Z"
      fill={EMPTY_PALETTE.fill} stroke={EMPTY_PALETTE.primary}
      strokeWidth={SW} strokeLinecap={CAP} strokeLinejoin={JOIN} />
    {/* Dashed checkmark */}
    <Polyline points="56,82 74,100 108,62"
      fill="none" stroke={EMPTY_PALETTE.mid}
      strokeWidth={2} strokeDasharray="3,2"
      strokeLinecap={CAP} strokeLinejoin={JOIN} />
  </Svg>
);
