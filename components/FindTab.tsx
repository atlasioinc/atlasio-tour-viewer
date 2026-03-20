// FindTab.tsx
// ═══════════════════════════════════════════════════════════════
// Find Tab — Agent View (632 lines)
// Search & discover pros with role-specific filters and sorting
// Two states: Default (browse) vs Search (filtered list)
//
// CTA Logic (all pros on FindTab are unconnected):
//   - Job-eligible roles (Contractor, Home Stager, Real Estate Photographer):
//       → [Invite to Job] outline + [Request to Connect] solid
//   - All other partner roles:
//       → [Request to Connect] solid (single full-width button)
//   - No Message button — messaging requires connection first
//
// Sections: Constants, SVG Icons, Role Pills / Sort Options,
//           Filter Definitions, Pro Data, Avatar, Pro Card,
//           Filter Chip, Main Component
//
// @demo  ALL_PROS array (10 mock profiles, lines ~186–225)
//        Feature flag gate: FEATURE_FLAGS.USE_MOCK_DATA
// @backend useFindPros (wired) — profiles filtered by role + search
// @backend useRecommendedPros (wired) — recommended by connections
// @backend useTrendingPros (wired) — trending by vouch count
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Modal,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import InviteToJobModal from './InviteToJobModal';
import type { InviteContractor } from './InviteToJobModal';
import type { FindStackParamList } from './FindStack';
import { mapFindProToProfile } from './proProfileHelpers';
import SearchField from './SearchField';
import RequestConnectModal from './RequestConnectModal';
import { COLORS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useFindPros, useRecommendedPros, useTrendingPros } from '../hooks/useData';
import { adaptProfileToProCard } from '../lib/typeAdapters';
import { VerificationBadge } from './shared/VerificationBadge';
import { DisplayTag } from './DisplayTag';
import type { VerificationLevel } from '../types';



if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

// Roles that participate in the job bidding flow
const JOB_ELIGIBLE_ROLES = ['Contractor', 'Home Stager', 'Real Estate Photographer'];

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const LocationPinIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path
      d="M8 1.33C5.42 1.33 3.33 3.42 3.33 6C3.33 9.5 8 14.67 8 14.67C8 14.67 12.67 9.5 12.67 6C12.67 3.42 10.58 1.33 8 1.33Z"
      stroke={COLORS.bodyText} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round"
    />
    <Circle cx={8} cy={6} r={2} stroke={COLORS.bodyText} strokeWidth={1.33} />
  </Svg>
);

const ChevronDownIcon: React.FC<{ color?: string; flipped?: boolean }> = ({ color = COLORS.sortText, flipped = false }) => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none" style={{ transform: [{ rotate: flipped ? '180deg' : '0deg' }] }}>
    <Path d="M4 6L8 10L12 6" stroke={color} strokeWidth={1.33} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StarIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M7 1.17L8.82 4.87L12.88 5.46L9.94 8.32L10.64 12.36L7 10.44L3.36 12.36L4.06 8.32L1.12 5.46L5.18 4.87L7 1.17Z"
      fill={COLORS.starColor} stroke={COLORS.starColor} strokeWidth={1.17} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LightningIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Path d="M7.58 1.17L2.33 8.17H7L6.42 12.83L11.67 5.83H7L7.58 1.17Z"
      stroke={COLORS.statText} strokeWidth={1.17} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// ROLE PILLS / SORT OPTIONS
// ─────────────────────────────────────────────

const ROLE_PILLS = [
  'All', 'Mortgage Pro', 'Title/Escrow', 'Home Inspector',
  'Appraiser', 'Transaction Coordinator', 'Contractor', 'Warranty', 'Attorney',
];

const SORT_OPTIONS = ['Most Vouched', 'Fastest Closing', 'Highest Rated', 'Nearest'];

// ─────────────────────────────────────────────
// FILTER DEFINITIONS
// ─────────────────────────────────────────────

interface FilterOption { key: string; label: string; type: 'chip' | 'toggle'; }
interface FilterGroup { title: string; options: FilterOption[]; }

const COMMON_FILTERS: FilterGroup = {
  title: 'Quick Filters',
  options: [
    { key: 'rating_48', label: '4.8+ Rating', type: 'chip' },
    { key: 'vouches_50', label: '50+ Vouches', type: 'chip' },
    { key: 'distance_5mi', label: '< 5mi', type: 'chip' },
  ],
};

const ROLE_FILTERS: { [key: string]: FilterGroup[] } = {
  'Mortgage Pro': [
    { title: 'Loan Types', options: [
      { key: 'loan_va', label: 'VA', type: 'chip' }, { key: 'loan_fha', label: 'FHA', type: 'chip' },
      { key: 'loan_conv', label: 'Conventional', type: 'chip' }, { key: 'loan_jumbo', label: 'Jumbo', type: 'chip' },
    ]},
    { title: 'Closing Speed', options: [
      { key: 'close_15', label: '≤15 days', type: 'chip' }, { key: 'close_21', label: '≤21 days', type: 'chip' },
      { key: 'close_30', label: '≤30 days', type: 'chip' },
    ]},
    { title: 'Preferences', options: [
      { key: 'spanish_mortgage', label: 'Spanish Speaking', type: 'toggle' },
      { key: 'no_junk_fees', label: 'No Junk Fees', type: 'toggle' },
    ]},
  ],
  'Title/Escrow': [
    { title: 'Turnaround Time', options: [
      { key: 'turn_24h', label: '24h', type: 'chip' }, { key: 'turn_48h', label: '48h', type: 'chip' },
    ]},
    { title: 'Preferences', options: [
      { key: 'cash_buyer', label: 'Cash Buyer Experience', type: 'toggle' },
      { key: 'spanish_title', label: 'Spanish Speaking', type: 'toggle' },
      { key: 'clear_comm', label: 'Clear Communication', type: 'toggle' },
    ]},
  ],
  'Home Inspector': [
    { title: 'Turnaround Time', options: [
      { key: 'inspect_same', label: 'Same Day', type: 'chip' }, { key: 'inspect_24h', label: '24h', type: 'chip' },
      { key: 'inspect_48h', label: '48h', type: 'chip' },
    ]},
    { title: 'Specialty Areas', options: [
      { key: 'spec_foundation', label: 'Foundation', type: 'chip' }, { key: 'spec_roof', label: 'Roof', type: 'chip' },
      { key: 'spec_plumbing', label: 'Plumbing', type: 'chip' }, { key: 'spec_electrical', label: 'Electrical', type: 'chip' },
      { key: 'spec_whole', label: 'Whole House', type: 'chip' },
    ]},
    { title: 'Preferences', options: [
      { key: 'spanish_inspect', label: 'Spanish Speaking', type: 'toggle' },
    ]},
  ],
  Contractor: [
    { title: 'Response Time', options: [
      { key: 'resp_same', label: 'Same Day', type: 'chip' }, { key: 'resp_24h', label: 'Within 24 hours', type: 'chip' },
      { key: 'resp_48h', label: 'Within 48 hours', type: 'chip' }, { key: 'resp_72h', label: 'Within 72 hours', type: 'chip' },
    ]},
    { title: 'Trade Specialty', options: [
      { key: 'trade_gc', label: 'General Contractor', type: 'chip' }, { key: 'trade_electrical', label: 'Electrical', type: 'chip' },
      { key: 'trade_plumbing', label: 'Plumbing', type: 'chip' }, { key: 'trade_roofing', label: 'Roofing', type: 'chip' },
      { key: 'trade_hvac', label: 'HVAC', type: 'chip' }, { key: 'trade_carpentry', label: 'Carpentry / Handyman', type: 'chip' },
      { key: 'trade_painting', label: 'Painting', type: 'chip' }, { key: 'trade_flooring', label: 'Flooring', type: 'chip' },
      { key: 'trade_windows', label: 'Windows & Doors', type: 'chip' }, { key: 'trade_foundation', label: 'Foundation / Structural', type: 'chip' },
      { key: 'trade_drywall', label: 'Drywall / Sheetrock', type: 'chip' }, { key: 'trade_pest', label: 'Pest Control / Termite', type: 'chip' },
      { key: 'trade_mold', label: 'Mold Remediation', type: 'chip' }, { key: 'trade_sewer', label: 'Sewer / Septic', type: 'chip' },
      { key: 'trade_pool', label: 'Pool & Spa', type: 'chip' }, { key: 'trade_chimney', label: 'Chimney / Fireplace', type: 'chip' },
      { key: 'trade_garage', label: 'Garage Door', type: 'chip' }, { key: 'trade_appliances', label: 'Appliances', type: 'chip' },
      { key: 'trade_landscaping', label: 'Landscaping / Drainage', type: 'chip' }, { key: 'trade_locksmith', label: 'Locksmith / Re-key', type: 'chip' },
      { key: 'trade_cleaning', label: 'Home Cleaning & Junk Removal', type: 'chip' }, { key: 'trade_driveway', label: 'Driveway / Paving', type: 'chip' },
    ]},
    { title: 'Preferences', options: [
      // @backend — wire to verification_level >= 'licensed' (NOT profiles.specialties tags)
      // This is an agent-facing search filter, not a tag match
      { key: 'licensed_insured', label: 'Licensed & Insured', type: 'toggle' },
      { key: 'on_time', label: 'On-Time Completion', type: 'toggle' },
      { key: 'emergency', label: 'Emergency Service', type: 'toggle' },
    ]},
  ],
};

// ─────────────────────────────────────────────
// @demo PRO DATA — 10 mock profiles (all unconnected)
// @backend Replace with useFindPros / useRecommendedPros / useTrendingPros
// ─────────────────────────────────────────────

interface ProCard {
  id: string; name: string; company: string; role: string;
  /** Primary trade specialty — e.g., 'Electrician', 'General Contractor', 'Roofer'.
   *  For non-contractor roles, leave undefined (role is used instead).
   *  Maps to profiles.primary_trade in Supabase. */
  trade?: string;
  /** Up to 2 secondary trade specialties — e.g., ['HVAC', 'Plumbing'].
   *  Maps to profiles.secondary_trades (text[] with CHECK length ≤ 2) in Supabase. */
  secondary_trades?: string[];
  rating: number; vouches: number; tags: string[]; headline: string | null;
  avatarColor: string; closingDays?: number; distanceMi?: number;
  verification_level?: VerificationLevel;
  /** @backend profiles.accepting_clients BOOLEAN — read from partner profile data
   *  @demo use mock profile data with accepting_clients field */
  accepting_clients?: boolean;
}

const ALL_PROS: ProCard[] = [
  { id: '1', name: 'Rachel Williams', company: 'First Choice Lending', role: 'Mortgage Pro', rating: 4.9, vouches: 127, tags: ['VA Specialist', 'Fast Closer', 'Spanish-Speaking'], headline: 'VA loans closed in under 19 days', avatarColor: '#C4A882', closingDays: 19, distanceMi: 2.1 },
  { id: '2', name: 'Brian Cooper', company: 'ProBuild Contractors', role: 'Contractor', trade: 'General Contractor', secondary_trades: ['Carpentry', 'Drywall'], rating: 5.0, vouches: 67, tags: ['Fast Response', 'On-Time Expert'], headline: 'On-site within 24 hours', avatarColor: '#7BA3C9', closingDays: 5, distanceMi: 4.8 },
  { id: '3', name: 'Maria Santos', company: 'HomeGuard Inspections', role: 'Home Inspector', rating: 5.0, vouches: 156, tags: ['Same-Day Turnaround', 'Detailed Reports', 'Spanish-Speaking'], headline: 'Same-day inspection reports', avatarColor: '#D4A8B5', closingDays: 1, distanceMi: 1.3 },
  { id: '4', name: 'Emma Thompson', company: 'Elite Title Services', role: 'Title/Escrow', rating: 4.9, vouches: 104, tags: ['Fast Turnaround', 'Clear Communication', 'Spanish-Speaking'], headline: 'Avg closing fee $795, no surprises', avatarColor: '#A8C5DA', closingDays: 7, distanceMi: 3.2 },
  { id: '5', name: 'Marcus Lee', company: 'Apex Mortgage', role: 'Mortgage Pro', rating: 4.8, vouches: 142, tags: ['FHA Approved', 'Fast Closer', 'Spanish-Speaking'], headline: 'Denver\'s go-to FHA specialist', avatarColor: '#B5C4A8', closingDays: 21, distanceMi: 5.5 },
  { id: '6', name: 'Kevin Park', company: 'Secure Title Co', role: 'Title/Escrow', rating: 4.8, vouches: 93, tags: ['Cash Buyer Expert', 'Fast Turnaround', 'No Junk Fees'], headline: 'Cash deals closed in 7 days', avatarColor: '#C9B87B', closingDays: 7, distanceMi: 6.1 },
  { id: '7', name: 'Sarah Chen', company: 'Mountain View Appraisals', role: 'Appraiser', rating: 4.9, vouches: 89, tags: ['FHA Approved', 'Fast Turnaround'], headline: '48hr appraisal turnaround', avatarColor: '#A8B5D4', closingDays: 2, distanceMi: 3.7 },
  { id: '8', name: 'James Foster', company: 'Summit Roofing', role: 'Contractor', trade: 'Roofer', secondary_trades: ['Gutters', 'Siding'], rating: 4.7, vouches: 52, tags: ['Emergency Available', 'On-Time Expert'], headline: '10yr warranty on every job', avatarColor: '#D4C5A8', closingDays: 3, distanceMi: 7.2 },
  { id: '9', name: 'Lisa Martinez', company: 'Denver Home Warranty', role: 'Warranty', rating: 4.8, vouches: 76, tags: ['Fast Turnaround', 'Clear Communication'], headline: 'Coverage starting at $450/yr', avatarColor: '#B8A8D4', closingDays: 14, distanceMi: 2.8 },
  { id: '10', name: 'David Kim', company: 'RE Law Group', role: 'Attorney', rating: 5.0, vouches: 64, tags: ['Complex Specialist', 'Spanish-Speaking'], headline: 'Flat fee $750, no hourly billing', avatarColor: '#A8D4B5', closingDays: 3, distanceMi: 1.9 },
  { id: '11', name: 'Angela Rivera', company: 'Precision Inspections', role: 'Home Inspector', rating: 4.8, vouches: 112, tags: ['Same-Day Turnaround', 'Foundation Specialist', 'Detailed Reports'], headline: 'Foundation specialist, same-day', avatarColor: '#D4A8C5', closingDays: 1, distanceMi: 4.2 },
  { id: '12', name: 'Tom Anderson', company: 'VA Loan Pros', role: 'Mortgage Pro', rating: 4.9, vouches: 98, tags: ['VA Specialist', 'Fast Closer', 'No Junk Fees'], headline: 'Zero junk fees, avg 17-day close', avatarColor: '#C5D4A8', closingDays: 17, distanceMi: 8.3 },
  { id: '13', name: 'Carlos Mendoza', company: 'Mendoza General Contracting', role: 'Contractor', trade: 'General Contractor', secondary_trades: ['Kitchen & Bath', 'Flooring'], rating: 4.9, vouches: 84, tags: ['Full Remodels', 'On-Time Expert'], headline: 'Full kitchen & bath remodels', avatarColor: '#A8C9B5', closingDays: 14, distanceMi: 3.4 },
  { id: '14', name: 'Derek Washington', company: 'Volt Electric Co', role: 'Contractor', trade: 'Electrician', secondary_trades: ['Lighting', 'EV Chargers'], rating: 4.9, vouches: 71, tags: ['Fast Response', 'Spanish-Speaking'], headline: 'Response in under 2 hours', avatarColor: '#8BA8C9', closingDays: 2, distanceMi: 2.6 },
  { id: '15', name: 'Tony Ruiz', company: 'Front Range Plumbing', role: 'Contractor', trade: 'Plumber', secondary_trades: ['Sewer', 'Water Heaters'], rating: 4.8, vouches: 93, tags: ['Emergency Service', 'Warranty Offered'], headline: 'Emergency calls, same-day service', avatarColor: '#C9A87B', closingDays: 1, distanceMi: 5.1 },
  { id: '16', name: 'Mike Petrov', company: 'Mile High Paving', role: 'Contractor', trade: 'Driveway / Paving', secondary_trades: ['Concrete', 'Drainage'], rating: 4.7, vouches: 48, tags: ['Free Estimates', 'On-Time Expert'], headline: 'Free estimates, always on time', avatarColor: '#B5A8C9', closingDays: 7, distanceMi: 6.8 },
];

const RECOMMENDED_PROS = ALL_PROS.slice(0, 5);
const TRENDING_PROS = ALL_PROS.slice(0, 5);

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{ name: string; color: string; size?: number }> = ({ name, color, size = 56 }) => {
  const initials = name.split(' ').map((n) => n[0]).join('').substring(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: 9999, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.32, fontWeight: '600', color: '#FFFFFF' }}>{initials}</Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// PRO CARD COMPONENT
// ─────────────────────────────────────────────
// FindTab CTA pattern (all unconnected):
//   Job-eligible → [Invite to Job] outline + [Request to Connect] solid
//   Partners     → [Request to Connect] solid full-width
// No Message button — messaging requires connection first.

const ProCardComponent: React.FC<{
  pro: ProCard; width?: number; onPress?: () => void;
  onRequestConnect?: () => void; onInviteToJob?: () => void;
}> = ({ pro, width, onPress, onRequestConnect, onInviteToJob }) => {
  const isJobEligible = JOB_ELIGIBLE_ROLES.some((r) => r.toLowerCase() === pro.role.toLowerCase());

  return (
  <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.95 : 1 })}>
  <View style={{ width: width || '100%', padding: 16, backgroundColor: COLORS.background, borderRadius: 14, borderWidth: 0.68, borderColor: COLORS.cardBorder, shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, gap: 16 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <View style={{ flexDirection: 'row', gap: 16, flex: 1 }}>
        <AvatarPlaceholder name={pro.name} color={pro.avatarColor} />
        <View style={{ gap: 4, flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }} numberOfLines={1}>{pro.name}</Text>
            <VerificationBadge level={pro.verification_level ?? 'none'} size="small" />
          </View>
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }} numberOfLines={1}>{pro.company}</Text>
          <View style={{
            alignSelf: 'flex-start',
            marginTop: 2,
            paddingHorizontal: 8,
            paddingVertical: 3,
            backgroundColor: COLORS.tagBg,
            borderRadius: 9999,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.primary, lineHeight: 16 }}>
              {pro.trade ?? pro.role}
            </Text>
          </View>
          {/* @backend profiles.accepting_clients BOOLEAN — read from partner profile data
              @demo use mock profile data with accepting_clients field
              Only show badge when explicitly false (not when true or undefined) */}
          {pro.accepting_clients === false && (
            <View style={{ marginTop: 4 }}>
              <DisplayTag label="At Capacity" variant="ghost" fontSize={12} />
            </View>
          )}
        </View>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <StarIcon />
          <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.darkText, lineHeight: 16 }}>{pro.rating}</Text>
        </View>
        <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>{pro.vouches} vouches</Text>
      </View>
    </View>
    <View style={{ gap: 8 }}>
      {pro.headline ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.tagBg, borderRadius: 6 }}>
          <LightningIcon />
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20, flex: 1 }} numberOfLines={1}>
            {pro.headline}
          </Text>
        </View>
      ) : null}
      {/* Tags — max 2 visible + "+N more" overflow pill */}
      <View style={{ flexDirection: 'row', flexWrap: 'nowrap', gap: 6, marginTop: 8, overflow: 'hidden' }}>
        {pro.tags.slice(0, 2).map((tag) => (
          <View key={tag} style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.tagBg, borderRadius: 9999, flexShrink: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '400', color: COLORS.tagText, lineHeight: 16 }}>{tag}</Text>
          </View>
        ))}
        {pro.tags.length > 2 && (
          <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.tagBg, borderRadius: 9999, flexShrink: 0 }}>
            <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16 }}>+{pro.tags.length - 2}</Text>
          </View>
        )}
      </View>
    </View>

    {/* Action Buttons: Job-eligible gets 2 buttons, Partners get 1 */}
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {isJobEligible && (
        <Pressable onPress={(e) => { e.stopPropagation(); onInviteToJob?.(); }}
          style={({ pressed }) => ({ flex: 1, height: 36, paddingHorizontal: 16, backgroundColor: COLORS.background, borderRadius: 8, borderWidth: 1.35, borderColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20, textAlign: 'center' }}>Invite to Job</Text>
        </Pressable>
      )}
      <Pressable onPress={(e) => { e.stopPropagation(); onRequestConnect?.(); }}
        style={({ pressed }) => ({ flex: isJobEligible ? undefined : 1, height: 36, paddingHorizontal: 16, backgroundColor: COLORS.primary, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
        <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20, textAlign: 'center' }}>Request to Connect</Text>
      </Pressable>
    </View>
  </View>
  </Pressable>
  );
};

// ─────────────────────────────────────────────
// FILTER CHIP COMPONENT
// ─────────────────────────────────────────────

const FilterChip: React.FC<{ label: string; isActive: boolean; onPress: () => void }> = ({ label, isActive, onPress }) => (
  <Pressable onPress={onPress}
    style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9999, backgroundColor: isActive ? COLORS.selectedBg : COLORS.chipBg, borderWidth: 1, borderColor: isActive ? COLORS.primary : 'transparent', opacity: pressed ? 0.7 : 1 })}>
    <Text style={{ fontSize: 13, fontWeight: isActive ? '500' : '400', color: isActive ? COLORS.primary : COLORS.bodyText, lineHeight: 18 }}>{label}</Text>
  </Pressable>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const FindTab: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<FindStackParamList>>();
  const route = useRoute<RouteProp<FindStackParamList, 'FindMain'>>();
  const [searchText, setSearchText] = useState<string>('');
  const [activeRole, setActiveRole] = useState<string>('All');
  const [selectedSort, setSelectedSort] = useState<string>('Most Vouched');
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());

  // ── Live data hooks (keep cache warm) ──
  const { data: livePros } = useFindPros(searchText, activeRole, selectedSort);
  const { data: liveRecommended } = useRecommendedPros();
  const { data: liveTrending } = useTrendingPros();

  const recommendedPros = FEATURE_FLAGS.USE_MOCK_DATA
    ? RECOMMENDED_PROS
    : (liveRecommended?.map(adaptProfileToProCard) ?? RECOMMENDED_PROS);

  const trendingPros = FEATURE_FLAGS.USE_MOCK_DATA
    ? TRENDING_PROS
    : (liveTrending?.map(adaptProfileToProCard) ?? TRENDING_PROS);

  // ── Apply preset params from Quick Actions (cross-stack navigation) ──
  useEffect(() => {
    const params = route.params;
    if (!params?.presetRole && !params?.presetFilters && !params?.presetSort) return;

    if (params.presetRole) {
      setActiveRole(params.presetRole);
    }
    if (params.presetFilters && params.presetFilters.length > 0) {
      setActiveFilters(new Set(params.presetFilters));
      setShowFilters(true);
    }
    if (params.presetSort) {
      setSelectedSort(params.presetSort);
    }

    // Clear params after applying so back-navigation doesn't re-trigger
    navigation.setParams({ presetRole: undefined, presetFilters: undefined, presetSort: undefined } as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount when navigated with preset params
  }, []);

  // ── Request to Connect modal state ──
  const [connectModalVisible, setConnectModalVisible] = useState<boolean>(false);
  const [connectPro, setConnectPro] = useState<ProCard | null>(null);

  // ── Invite to Job modal state ──
  const [inviteModalVisible, setInviteModalVisible] = useState<boolean>(false);
  const [invitePro, setInvitePro] = useState<InviteContractor | null>(null);

  const openInviteModal = (pro: ProCard) => {
    setInvitePro({ id: pro.id, name: pro.name, company: pro.company, role: pro.trade || pro.role, avatarColor: pro.avatarColor, trades: [pro.trade, ...(pro.secondary_trades || [])].filter(Boolean) as string[] });
    setInviteModalVisible(true);
  };
  const closeInviteModal = () => { setInviteModalVisible(false); setInvitePro(null); };

  const openConnectModal = (pro: ProCard) => { setConnectPro(pro); setConnectModalVisible(true); };
  const closeConnectModal = () => { setConnectModalVisible(false); setConnectPro(null); };

  const handleSendConnect = (message: string) => {
    console.log('📤 Connection request sent to:', connectPro?.name);
    console.log('Message:', message || '(no message)');
    closeConnectModal();
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- collapse filters when user starts typing
  useEffect(() => { if (searchText.length > 0 && showFilters) setShowFilters(false); }, [searchText]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reset filters when role changes
  useEffect(() => { if (activeFilters.size === 0) return; setActiveFilters(new Set()); }, [activeRole]);

  const toggleFilter = (key: string): void => {
    setActiveFilters((prev) => { const next = new Set(prev); if (next.has(key)) { next.delete(key); } else { next.add(key); } return next; });
  };
  const clearAllFilters = (): void => setActiveFilters(new Set());
  const getFiltersForRole = (): FilterGroup[] => [COMMON_FILTERS, ...(ROLE_FILTERS[activeRole] || [])];

  const isSearching = searchText.length > 0 || activeRole !== 'All';
  const activeFilterCount = activeFilters.size;

  const prosPool = FEATURE_FLAGS.USE_MOCK_DATA ? ALL_PROS : (livePros?.map(adaptProfileToProCard) ?? ALL_PROS);
  const filteredPros = prosPool.filter((pro) => {
    const matchesRole = activeRole === 'All' || pro.role === activeRole;
    const matchesSearch = searchText.length === 0 ||
      pro.name.toLowerCase().includes(searchText.toLowerCase()) ||
      pro.company.toLowerCase().includes(searchText.toLowerCase()) ||
      pro.role.toLowerCase().includes(searchText.toLowerCase()) ||
      (pro.trade && pro.trade.toLowerCase().includes(searchText.toLowerCase())) ||
      (pro.secondary_trades?.some((t) => t.toLowerCase().includes(searchText.toLowerCase()))) ||
      pro.tags.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase()));

    let matchesFilters = true;
    if (activeFilters.size > 0) {
      if (activeFilters.has('rating_48') && pro.rating < 4.8) matchesFilters = false;
      if (activeFilters.has('vouches_50') && pro.vouches < 50) matchesFilters = false;
      if (activeFilters.has('distance_5mi') && (pro.distanceMi || 10) > 5) matchesFilters = false;
      const tagMatchMap: { [key: string]: string } = {
        spanish_mortgage: 'Spanish', spanish_title: 'Spanish', spanish_inspect: 'Spanish',
        no_junk_fees: 'No Junk Fees', cash_buyer: 'Cash Buyer', clear_comm: 'Clear Communication',
        licensed_insured: 'Licensed & Insured', on_time: 'On-Time', emergency: 'Emergency',
      };
      for (const [filterKey, requiredTag] of Object.entries(tagMatchMap)) {
        if (activeFilters.has(filterKey) && !pro.tags.some((t) => t.toLowerCase().includes(requiredTag.toLowerCase()))) matchesFilters = false;
      }
      if (activeFilters.has('close_15') && (pro.closingDays || 99) > 15) matchesFilters = false;
      if (activeFilters.has('close_21') && (pro.closingDays || 99) > 21) matchesFilters = false;
      if (activeFilters.has('close_30') && (pro.closingDays || 99) > 30) matchesFilters = false;
    }
    return matchesRole && matchesSearch && matchesFilters;
  });

  const sortedPros = [...filteredPros].sort((a, b) => {
    switch (selectedSort) {
      case 'Most Vouched': return b.vouches - a.vouches;
      case 'Fastest Closing': return (a.closingDays || 99) - (b.closingDays || 99);
      case 'Highest Rated': return b.rating - a.rating || b.vouches - a.vouches;
      case 'Nearest': return (a.distanceMi || 99) - (b.distanceMi || 99);
      default: return 0;
    }
  });

  const handleToggleFilters = (): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters((prev) => !prev);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* ── STICKY HEADER ── */}
      <View style={{ backgroundColor: COLORS.background, borderBottomWidth: 0.69, borderBottomColor: COLORS.border, paddingTop: 0, paddingBottom: 0 }}>
        <View style={{ paddingHorizontal: 16, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.5 : 1 })}>
            <LocationPinIcon />
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>Denver</Text>
          </Pressable>
          <SearchField value={searchText} onChangeText={setSearchText} placeholder="Search for any pro" />
          <Pressable onPress={() => setShowSortDropdown(true)} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
            <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
              <Path d="M3 5H17" stroke={selectedSort !== 'Most Vouched' ? COLORS.primary : COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
              <Path d="M5 10H15" stroke={selectedSort !== 'Most Vouched' ? COLORS.primary : COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
              <Path d="M7 15H13" stroke={selectedSort !== 'Most Vouched' ? COLORS.primary : COLORS.bodyText} strokeWidth={1.67} strokeLinecap="round" />
            </Svg>
            {selectedSort !== 'Most Vouched' && (
              <View style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: 9999, backgroundColor: COLORS.primary }} />
            )}
          </Pressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, gap: 8, paddingRight: 16 }}>
          {ROLE_PILLS.map((pill) => (
            <Pressable key={pill} onPress={() => setActiveRole(pill)} style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 9999, backgroundColor: activeRole === pill ? COLORS.primary : COLORS.background, borderWidth: activeRole === pill ? 0 : 0.69, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 14, fontWeight: '400', color: activeRole === pill ? '#FFFFFF' : COLORS.bodyText, lineHeight: 20, textAlign: 'center' }}>{pill}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 }}>
          <Pressable onPress={handleToggleFilters} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: pressed ? 0.5 : 1 })}>
            <ChevronDownIcon color={COLORS.primary} flipped={showFilters} />
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.primary, lineHeight: 20 }}>{showFilters ? 'Hide filters' : 'Show filters'}</Text>
            {activeFilterCount > 0 && (
              <View style={{ width: 20, height: 20, borderRadius: 9999, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#FFFFFF' }}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {/* ── SCROLLABLE CONTENT ── */}
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1, backgroundColor: COLORS.screenBg }} keyboardShouldPersistTaps="handled">
        {showFilters && (
          <View style={{ backgroundColor: COLORS.filterBg, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 0.69, borderBottomColor: COLORS.border }}>
            {getFiltersForRole().map((group, groupIndex) => (
              <View key={group.title} style={{ marginTop: groupIndex > 0 ? 16 : 0 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.bodyText, lineHeight: 18, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>{group.title}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {group.options.map((option) => (
                    <FilterChip key={option.key} label={option.label} isActive={activeFilters.has(option.key)} onPress={() => toggleFilter(option.key)} />
                  ))}
                </View>
              </View>
            ))}
            {activeFilterCount > 0 && (
              <Pressable onPress={clearAllFilters} style={({ pressed }) => ({ alignSelf: 'flex-start', paddingVertical: 6, marginTop: 16, opacity: pressed ? 0.5 : 1 })}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.errorRed, lineHeight: 20 }}>Clear all filters</Text>
              </Pressable>
            )}
          </View>
        )}

        {!isSearching ? (
          <View style={{ paddingTop: 16, paddingBottom: 16, gap: 24 }}>
            <View style={{ gap: 12 }}>
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28 }}>Recommended for You</Text>
                <Text style={{ fontSize: 14, fontWeight: '400', color: '#666666', lineHeight: 20 }}>Based on your squad gaps and recent jobs</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, paddingVertical: 4, gap: 12 }}>
                {recommendedPros.map((pro) => (
                  <ProCardComponent key={pro.id} pro={pro} width={325}
                    onPress={() => navigation.navigate('ProProfile', { profile: mapFindProToProfile(pro) })}
                    onInviteToJob={() => openInviteModal(pro)} onRequestConnect={() => openConnectModal(pro)} />
                ))}
              </ScrollView>
            </View>
            <View style={{ gap: 12 }}>
              <View style={{ paddingHorizontal: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28 }}>Trending This Week</Text>
                <Text style={{ fontSize: 14, fontWeight: '400', color: '#666666', lineHeight: 20 }}>Most vouched pros in the last 7 days</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 16, paddingVertical: 4, gap: 12 }}>
                {trendingPros.map((pro) => (
                  <ProCardComponent key={`trending-${pro.id}`} pro={pro} width={325}
                    onPress={() => navigation.navigate('ProProfile', { profile: mapFindProToProfile(pro) })}
                    onInviteToJob={() => openInviteModal(pro)} onRequestConnect={() => openConnectModal(pro)} />
                ))}
              </ScrollView>
            </View>
          </View>
        ) : (
          <View style={{ paddingTop: 16, paddingBottom: 24, gap: 16 }}>
            <View style={{ paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28 }}>{`All Pros (${sortedPros.length})`}</Text>
            </View>
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {sortedPros.length > 0 ? (
                sortedPros.map((pro) => (
                  <ProCardComponent key={pro.id} pro={pro}
                    onPress={() => navigation.navigate('ProProfile', { profile: mapFindProToProfile(pro) })}
                    onInviteToJob={() => openInviteModal(pro)} onRequestConnect={() => openConnectModal(pro)} />
                ))
              ) : (
                <View style={{ padding: 32, alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.bodyText }}>No pros found</Text>
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, textAlign: 'center' }}>Try adjusting your search or filters</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Sort Modal ── */}
      <Modal visible={showSortDropdown} transparent animationType="fade" onRequestClose={() => setShowSortDropdown(false)}>
        <Pressable onPress={() => setShowSortDropdown(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}>
          <View style={{ width: '100%', maxWidth: 280, backgroundColor: COLORS.background, borderRadius: 14, overflow: 'hidden' }}>
            <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.primary, lineHeight: 20 }}>Sort by</Text>
            </View>
            {SORT_OPTIONS.map((option, index) => (
              <TouchableOpacity key={option} onPress={() => { setSelectedSort(option); setShowSortDropdown(false); }} activeOpacity={0.7}
                style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: selectedSort === option ? COLORS.tagBg : COLORS.background, borderBottomWidth: index < SORT_OPTIONS.length - 1 ? 1 : 0, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 16, fontWeight: selectedSort === option ? '600' : '400', color: selectedSort === option ? COLORS.primary : COLORS.bodyText }}>{option}</Text>
                {selectedSort === option && (
                  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
                    <Path d="M3 8L6.5 11.5L13 4.5" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ── Request to Connect Modal ── */}
      <RequestConnectModal visible={connectModalVisible} name={connectPro?.name || ''} company={connectPro?.company || ''}
        role={connectPro?.role || ''} avatarColor={connectPro?.avatarColor} onClose={closeConnectModal} onSend={handleSendConnect} />

      {/* ── Invite to Job Modal ── */}
      {invitePro && (
        <InviteToJobModal visible={inviteModalVisible} onClose={closeInviteModal} contractor={invitePro}
          onCreateNewJob={() => { console.log('Navigate to PostJobWizard for', invitePro.name); }}
          onInviteSent={(jobId, contractorId, message) => { console.log('Invite sent:', { jobId, contractorId, message }); }} />
      )}
    </SafeAreaView>
  );
};

export default FindTab;
