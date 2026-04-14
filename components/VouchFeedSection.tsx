// What: Vouch activity feed for agent home dashboard — shows recent vouches across network
// Who: Agent role
// Where: HomeTabAgent → VouchFeedSection (embedded section)

/**
 * VouchFeedSection.tsx (795 lines)
 *
 * Vouch activity feed for HomeTabAgent dashboard.
 * Shows recent vouches across the agent's network — celebratory, not a review board.
 *
 * Architecture:
 * - VouchFeedItem interface maps 1:1 to: vouches JOIN profiles (voucher) JOIN profiles (recipient)
 * - 75% contractor content bias enforced via applyContractorBias() utility
 * - Filter tabs filter by RECIPIENT's role (who got vouched)
 *
 * @demo  MOCK_VOUCH_FEED (20 items) with contractor bias applied
 * - Names are tappable → ProProfile navigation
 * - No avatars in feed — text hierarchy is the primary signal
 *   (recipient photo can be added later when real images exist in Supabase)
 * - Comment shown only when present (hybrid display)
 * - No like/thumbs up interaction — unnecessary for this feed
 * 
 * Backend wiring:
 * - Replace MOCK_VOUCH_FEED with useVouchFeed(activeFilter) hook
 * - Query: vouches JOIN profiles AS voucher ON from_id JOIN profiles AS recipient ON to_id
 * - ORDER BY created_at DESC, LIMIT 20
 * - Filter tabs → WHERE recipient.role = ? (or no filter for 'All')
 * - 75% bias → weighted query or keep client-side applyContractorBias()
 * - Realtime: subscribe to vouches table INSERT for live feed updates
 * 
 * TanStack Query key: ['vouchFeed', activeFilter]
 * 
 * Session 18 fix: onNavigateToProfile now passes full VouchFeedProfile
 * object instead of just profileId string, so HomeTabAgent can map it
 * to ProProfileData without a separate lookup.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS } from '../lib/tokens';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import { useVouchFeed } from '../hooks/useData';
import { adaptVouchToFeedItem } from '../lib/typeAdapters';
import { EmptyState, SkeletonBlock } from './shared';
import { useDemoRole } from '../lib/demoRoleContext';

// ============================================================
// TYPE DEFINITIONS — maps to Supabase join shape
// ============================================================

/** Minimal profile shape for feed display. Matches profiles table subset.
 *  Exported so consumers (e.g., HomeTabAgent) can map to ProProfileData. */
export interface VouchFeedProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  avatar_color: string; // fallback when no avatar_url
  company: string;
  role: string;          // 'Contractor' | 'Mortgage Pro' | 'Title/Escrow' | 'Home Inspector' | etc.
  trade?: string;        // sub-specialty for contractors (e.g., 'Electrician')
  is_verified: boolean;
  vouches_count: number;
}

/** Single vouch feed item — maps to vouches table joined with both profiles */
export interface VouchFeedItem {
  id: string;                     // vouches.id
  voucher: VouchFeedProfile;      // profiles JOIN on from_id
  recipient: VouchFeedProfile;    // profiles JOIN on to_id
  comment: string | null;         // vouches.comment (nullable — shown only if present)
  tags: string[];                 // vouches.tags
  created_at: string;             // vouches.created_at (ISO string)
  review_id: string | null;       // vouches.review_id (non-null = came from 4+ star review)
}

/** Filter tab options — filters by recipient role */
type VouchFilterTab = 'All' | 'Contractors' | 'Mortgage' | 'Title' | 'Inspectors';

const FILTER_TABS: VouchFilterTab[] = ['All', 'Contractors', 'Mortgage', 'Title', 'Inspectors'];

/** Maps filter tab label to recipient.role value for query */
const FILTER_TO_ROLE: Record<VouchFilterTab, string | null> = {
  'All': null,
  'Contractors': 'Contractor',
  'Mortgage': 'Mortgage Pro',
  'Title': 'Title/Escrow',
  'Inspectors': 'Home Inspector',
};

// ============================================================
// UTILITY: 75% Contractor Content Bias
// ============================================================

/**
 * Applies the 75% contractor content weighting rule from PRD.
 * 
 * Strategy: From a pool of vouches, ensures ~75% of displayed items
 * have a contractor as the recipient. This reflects the revenue model —
 * contractors drive bidding fees, so surfacing their trust signals
 * encourages agents to hire through the platform.
 * 
 * Backend alternative: Use a weighted SQL query that UNIONs
 * 75% from vouches WHERE recipient.role = 'Contractor'
 * with 25% from vouches WHERE recipient.role != 'Contractor',
 * both ordered by created_at DESC.
 */
function applyContractorBias(items: VouchFeedItem[], limit: number = 20): VouchFeedItem[] {
  const contractorItems = items.filter(v => v.recipient.role === 'Contractor');
  const otherItems = items.filter(v => v.recipient.role !== 'Contractor');

  const contractorCount = Math.min(Math.ceil(limit * 0.75), contractorItems.length);
  const otherCount = Math.min(limit - contractorCount, otherItems.length);

  const selected = [
    ...contractorItems.slice(0, contractorCount),
    ...otherItems.slice(0, otherCount),
  ];

  // Backfill if either pool is short
  if (selected.length < limit) {
    const remaining = items.filter(v => !selected.includes(v));
    selected.push(...remaining.slice(0, limit - selected.length));
  }

  // Sort final result by created_at DESC (newest first)
  return selected.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// ============================================================
// UTILITY: Relative Timestamp
// ============================================================

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ============================================================
// INLINE SVG ICONS
// ============================================================

/** Verified checkmark badge — 14x14 */
const VerifiedBadge = () => (
  <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
    <Circle cx="7" cy="7" r="6" fill={COLORS.primary} />
    <Path
      d="M4.5 7L6.2 8.7L9.5 5.3"
      stroke="#FFFFFF"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Vouch handshake icon — section header accent */
const VouchIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.5 11H17L14 17L10 7L7 13H3.5"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Arrow right chevron — 12x12, for "View all" link */
const ChevronRight = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
    <Path
      d="M9 18L15 12L9 6"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Quote mark icon — used for comment display */
const QuoteIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 21C3 21 5 19 5 15V9C5 6.24 7.24 4 10 4H10.5M14 21C14 21 16 19 16 15V9C16 6.24 18.24 4 21 4H21.5"
      stroke={COLORS.lightText}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

// ============================================================
// VOUCH FEED CARD COMPONENT — Text-only, no avatars
// ============================================================

interface VouchCardProps {
  item: VouchFeedItem;
  /** Session 18: Changed from (profileId: string) to (profile: VouchFeedProfile)
   *  so parent can map to ProProfileData without a separate query. */
  onPressProfile: (profile: VouchFeedProfile) => void;
}

const VouchCard: React.FC<VouchCardProps> = React.memo(function VouchCard({ item, onPressProfile }) {
  const { voucher, recipient, comment, tags, created_at } = item;
  const timeAgo = getRelativeTime(created_at);

  // Display the recipient's trade if contractor, otherwise role
  const recipientLabel = recipient.trade || recipient.role;

  // Spring press: scale(0.97) bounciness 6 — established S137a, rolled out S139a
  // useNativeDriver: true — runs on UI thread, no JS jank
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPressProfile(recipient)}
      >
        <View style={styles.card}>
          {/* Action text + timestamp */}
          <View style={styles.cardTop}>
            <Text style={styles.actionText} numberOfLines={2}>
              <Text
                style={styles.voucherName}
                onPress={() => onPressProfile(voucher)}
              >
                {voucher.name}
              </Text>
              <Text style={styles.actionVerb}> vouched for </Text>
              <Text
                style={styles.recipientName}
                onPress={() => onPressProfile(recipient)}
              >
                {recipient.name}
              </Text>
              {recipient.is_verified && <Text> </Text>}
              {recipient.is_verified && <VerifiedBadge />}
            </Text>
            <Text style={styles.timestamp}>{timeAgo}</Text>
          </View>

          {/* Meta row: role/trade · company */}
          <View style={styles.metaRow}>
            <Text style={styles.recipientRole}>{recipientLabel}</Text>
            {recipient.company ? (
              <>
                <Text style={styles.metaDot}> · </Text>
                <Text style={styles.metaCompany}>{recipient.company}</Text>
              </>
            ) : null}
          </View>

          {/* Comment — only shown if present (hybrid display) */}
          {comment ? (
            <View style={styles.commentContainer}>
              <QuoteIcon />
              <Text style={styles.commentText} numberOfLines={3}>
                {comment}
              </Text>
            </View>
          ) : null}

          {/* Tags — shown if present */}
          {tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {tags.slice(0, 3).map((tag, idx) => (
                <View key={idx} style={styles.tagPill}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

// (Local EmptyState removed S149a — replaced by shared <EmptyState /> below.)

// ============================================================
// MAIN COMPONENT: VouchFeedSection
// ============================================================

interface VouchFeedSectionProps {
  /** Navigation callback — receives full VouchFeedProfile so parent
   *  can map it to ProProfileData for navigation.
   *  Session 18: Changed from (profileId: string) to (profile: VouchFeedProfile). */
  onNavigateToProfile: (profile: VouchFeedProfile) => void;
  /** Optional: override vouch data (for testing or parent-level data fetching) */
  vouches?: VouchFeedItem[];
  /** Optional: show "View all" link */
  onViewAll?: () => void;
}

const VouchFeedSection: React.FC<VouchFeedSectionProps> = ({
  onNavigateToProfile,
  vouches: externalVouches,
  onViewAll,
}) => {
  const [activeFilter, setActiveFilter] = useState<VouchFilterTab>('All');
  // Role-branched empty state CTA — agents see read-only feed; contractors get a "Find work" CTA.
  // Business rule: contractors earn vouches by completing jobs, so the CTA points them at jobs.
  // Agents don't get vouched the same way, so showing a CTA would mislead them.
  const { demoRole } = useDemoRole();

  // ── Data fetching ──────────────────────────────────────
  const { data: liveVouches, isLoading: isLoadingVouches, isFetching: isFetchingVouches } = useVouchFeed(activeFilter);
  const allVouches = useMemo(() => externalVouches || (FEATURE_FLAGS.USE_MOCK_DATA ? MOCK_VOUCH_FEED : (liveVouches?.map(adaptVouchToFeedItem) ?? [])), [externalVouches, liveVouches]);
  // @demo S151 — skeleton while live query resolves; mock path bypasses loading state
  const isLoadingFeed = !FEATURE_FLAGS.USE_MOCK_DATA && !externalVouches && (isLoadingVouches || isFetchingVouches);

  // ── Apply filter + contractor bias ──────────────────────
  const filteredVouches = useMemo(() => {
    const roleFilter = FILTER_TO_ROLE[activeFilter];

    // When filter is "All", apply 75% contractor bias
    if (!roleFilter) {
      return applyContractorBias(allVouches, 20);
    }

    // When filtering by specific role, show all matching (no bias needed)
    return allVouches
      .filter(v => v.recipient.role === roleFilter)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);
  }, [allVouches, activeFilter]);

  const handlePressProfile = useCallback((profile: VouchFeedProfile) => {
    onNavigateToProfile(profile);
  }, [onNavigateToProfile]);

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <VouchIcon />
          <Text style={styles.sectionTitle}>Vouch Activity</Text>
        </View>
        {onViewAll && (
          <Pressable
            onPress={onViewAll}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: 'row', alignItems: 'center', gap: 2 })}
          >
            <Text style={styles.viewAllText}>View all</Text>
            <ChevronRight />
          </Pressable>
        )}
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTER_TABS.map(tab => {
          const isActive = tab === activeFilter;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveFilter(tab)}
              style={[
                styles.filterPill,
                isActive ? styles.filterPillActive : styles.filterPillInactive,
              ]}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isActive ? styles.filterPillTextActive : styles.filterPillTextInactive,
                ]}
              >
                {tab}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Feed Cards */}
      {isLoadingFeed ? (
        /* ── S151: skeleton while live vouches load — prevents empty-state flash ── */
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ gap: 8 }}>
              <SkeletonBlock width="60%" height={14} borderRadius={6} />
              <SkeletonBlock width="90%" height={12} borderRadius={6} />
              <SkeletonBlock width="80%" height={12} borderRadius={6} />
            </View>
          ))}
        </View>
      ) : filteredVouches.length === 0 ? (
        /* ── Empty State — S149a — role-branched CTA (see useDemoRole comment above) ── */
        <EmptyState
          illustration="vouch_feed"
          title="No vouches yet"
          body="Complete jobs to start building your reputation."
          ctaLabel={demoRole === 'contractor' ? 'Find work' : undefined}
          onCta={demoRole === 'contractor'
            ? () => { /* @nav contractor: open Jobs tab — wired by parent screen */ }
            : undefined}
          style={{ flex: 0, paddingVertical: 32 }}
        />
      ) : (
        filteredVouches.map(item => (
          <VouchCard
            key={item.id}
            item={item}
            onPressProfile={handlePressProfile}
          />
        ))
      )}
    </View>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  // Section container
  section: {
    paddingTop: 8,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    color: COLORS.darkText,
  },
  viewAllText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
    color: COLORS.primary,
  },

  // Filter pills
  filterScroll: {
    marginBottom: 12,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
  },
  filterPillInactive: {
    backgroundColor: COLORS.chipBg,
  },
  filterPillText: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  filterPillTextInactive: {
    color: COLORS.bodyText,
  },

  // Card — text-only, no avatars
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: COLORS.background,
    borderRadius: 14,
    borderWidth: 0.68,
    borderColor: COLORS.cardBorder,
    padding: 14,
    gap: 6,
    // Standard shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },

  // Top row: action text + timestamp
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  actionText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.bodyText,
    flexWrap: 'wrap',
  },
  voucherName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: COLORS.bodyText,
  },
  recipientName: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: COLORS.darkText,
  },
  actionVerb: {
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.bodyText,
  },
  timestamp: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: COLORS.lightText,
    marginTop: 2,
  },

  // Meta row: role · company
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  recipientRole: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    color: COLORS.primary,
  },
  metaCompany: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: COLORS.tertiaryText,
  },
  metaDot: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    color: COLORS.lightText,
  },

  // Comment block
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: COLORS.quoteBg,
    borderRadius: 8,
  },
  commentText: {
    flex: 1,
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: COLORS.bodyText,
    fontStyle: 'italic',
  },

  // Tags
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: COLORS.tagBg,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.68,
    borderColor: 'rgba(0, 61, 195, 0.15)',
  },
  tagText: {
    fontFamily: 'Inter',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 16,
    color: COLORS.primary,
  },

  // Empty state
  emptyContainer: {
    paddingHorizontal: 32,
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: 'Inter',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    color: COLORS.darkText,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Inter',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: COLORS.secondaryText,
    textAlign: 'center',
  },
});

// ============================================================
// MOCK DATA — 🧹 Remove when wiring to useVouchFeed() hook
// Avatar colors use existing app palette (muted, desaturated)
// from FindTab: #C4A882, #7BA3C9, #D4A8B5, #A8C5DA, etc.
// ============================================================

const MOCK_VOUCH_FEED: VouchFeedItem[] = [
  // ── Contractor vouches (75% target) ────────────────────
  {
    id: 'v1',
    voucher: { id: 'p1', name: 'Sarah Mitchell', avatar_url: null, avatar_color: '#A8C5DA', company: 'Keller Williams', role: 'Agent', is_verified: true, vouches_count: 42 },
    recipient: { id: 'p2', name: 'Carlos Ramirez', avatar_url: null, avatar_color: '#C9A87B', company: 'Ramirez Roofing', role: 'Contractor', trade: 'Roofer', is_verified: true, vouches_count: 87 },
    comment: 'Carlos replaced the entire roof in 3 days. His crew was professional, cleaned up perfectly, and came in under budget.',
    tags: ['Fast Turnaround', 'Clean Work'],
    created_at: new Date(Date.now() - 25 * 60000).toISOString(),
    review_id: 'r1',
  },
  {
    id: 'v2',
    voucher: { id: 'p3', name: 'James Porter', avatar_url: null, avatar_color: '#B5C4A8', company: 'RE/MAX', role: 'Agent', is_verified: false, vouches_count: 18 },
    recipient: { id: 'p4', name: 'Mike Chen', avatar_url: null, avatar_color: '#B8A8D4', company: 'Chen Electric', role: 'Contractor', trade: 'Electrician', is_verified: true, vouches_count: 134 },
    comment: null,
    tags: ['Reliable'],
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    review_id: null,
  },
  {
    id: 'v3',
    voucher: { id: 'p5', name: 'Amanda Torres', avatar_url: null, avatar_color: '#D4A8B5', company: 'Compass', role: 'Agent', is_verified: true, vouches_count: 56 },
    recipient: { id: 'p6', name: 'Dave Williams', avatar_url: null, avatar_color: '#7BA3C9', company: 'Williams Plumbing', role: 'Contractor', trade: 'Plumber', is_verified: false, vouches_count: 63 },
    comment: 'Fixed a major sewer line issue the day before closing. Saved my deal.',
    tags: ['Emergency Response', 'Great Communication'],
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    review_id: 'r3',
  },
  {
    id: 'v4',
    voucher: { id: 'p7', name: 'Nicole Park', avatar_url: null, avatar_color: '#A8D4B5', company: 'eXp Realty', role: 'Agent', is_verified: true, vouches_count: 31 },
    recipient: { id: 'p8', name: 'Roberto Silva', avatar_url: null, avatar_color: '#D4C5A8', company: 'Silva HVAC', role: 'Contractor', trade: 'HVAC', is_verified: true, vouches_count: 98 },
    comment: 'Third time using Roberto. Consistently excellent on furnace replacements.',
    tags: ['Repeat Hire', 'Fair Pricing'],
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    review_id: 'r4',
  },
  {
    id: 'v5',
    voucher: { id: 'p2', name: 'Carlos Ramirez', avatar_url: null, avatar_color: '#C9A87B', company: 'Ramirez Roofing', role: 'Contractor', is_verified: true, vouches_count: 87 },
    recipient: { id: 'p9', name: 'Tom Bradley', avatar_url: null, avatar_color: '#8BA8C9', company: 'Bradley Drywall', role: 'Contractor', trade: 'Drywall', is_verified: false, vouches_count: 45 },
    comment: null,
    tags: ['Quality Work'],
    created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    review_id: null,
  },
  {
    id: 'v6',
    voucher: { id: 'p10', name: 'Lisa Chang', avatar_url: null, avatar_color: '#C4A882', company: 'Coldwell Banker', role: 'Agent', is_verified: true, vouches_count: 73 },
    recipient: { id: 'p11', name: 'Jesse Moreno', avatar_url: null, avatar_color: '#A8C9B5', company: 'Moreno Painting', role: 'Contractor', trade: 'Painter', is_verified: true, vouches_count: 112 },
    comment: 'Jesse transformed a dated 1980s interior into a modern showpiece. Buyers loved it.',
    tags: ['Staging Ready', 'Detail Oriented'],
    created_at: new Date(Date.now() - 10 * 3600000).toISOString(),
    review_id: 'r6',
  },
  {
    id: 'v7',
    voucher: { id: 'p1', name: 'Sarah Mitchell', avatar_url: null, avatar_color: '#A8C5DA', company: 'Keller Williams', role: 'Agent', is_verified: true, vouches_count: 42 },
    recipient: { id: 'p12', name: 'Kevin Patel', avatar_url: null, avatar_color: '#C5D4A8', company: 'Patel Landscaping', role: 'Contractor', trade: 'Landscaper', is_verified: false, vouches_count: 29 },
    comment: null,
    tags: ['Curb Appeal'],
    created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
    review_id: null,
  },
  {
    id: 'v8',
    voucher: { id: 'p5', name: 'Amanda Torres', avatar_url: null, avatar_color: '#D4A8B5', company: 'Compass', role: 'Agent', is_verified: true, vouches_count: 56 },
    recipient: { id: 'p13', name: 'Ryan O\'Brien', avatar_url: null, avatar_color: '#B5A8C9', company: 'O\'Brien General', role: 'Contractor', trade: 'General Contractor', is_verified: true, vouches_count: 156 },
    comment: 'Managed a full kitchen remodel on a flip. On time, on budget, zero drama.',
    tags: ['Project Management', 'Investor Friendly'],
    created_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    review_id: 'r8',
  },
  {
    id: 'v9',
    voucher: { id: 'p3', name: 'James Porter', avatar_url: null, avatar_color: '#B5C4A8', company: 'RE/MAX', role: 'Agent', is_verified: false, vouches_count: 18 },
    recipient: { id: 'p14', name: 'Ana Gutierrez', avatar_url: null, avatar_color: '#D4A8C5', company: 'Gutierrez Tile', role: 'Contractor', trade: 'Tile Installer', is_verified: false, vouches_count: 38 },
    comment: 'Beautiful custom shower tile work. Ana has an eye for design.',
    tags: ['Craftsmanship'],
    created_at: new Date(Date.now() - 22 * 3600000).toISOString(),
    review_id: 'r9',
  },
  {
    id: 'v10',
    voucher: { id: 'p7', name: 'Nicole Park', avatar_url: null, avatar_color: '#A8D4B5', company: 'eXp Realty', role: 'Agent', is_verified: true, vouches_count: 31 },
    recipient: { id: 'p15', name: 'Derek Johnson', avatar_url: null, avatar_color: '#A8B5D4', company: 'Johnson Fencing', role: 'Contractor', trade: 'Fencing', is_verified: false, vouches_count: 22 },
    comment: null,
    tags: [],
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    review_id: null,
  },
  {
    id: 'v11',
    voucher: { id: 'p10', name: 'Lisa Chang', avatar_url: null, avatar_color: '#C4A882', company: 'Coldwell Banker', role: 'Agent', is_verified: true, vouches_count: 73 },
    recipient: { id: 'p16', name: 'Marcus Thompson', avatar_url: null, avatar_color: '#C9B87B', company: 'Thompson Windows', role: 'Contractor', trade: 'Windows', is_verified: true, vouches_count: 67 },
    comment: 'Replaced all windows before listing. Energy report helped justify the price bump.',
    tags: ['Energy Efficient', 'Professional'],
    created_at: new Date(Date.now() - 30 * 3600000).toISOString(),
    review_id: 'r11',
  },
  {
    id: 'v12',
    voucher: { id: 'p13', name: 'Ryan O\'Brien', avatar_url: null, avatar_color: '#B5A8C9', company: 'O\'Brien General', role: 'Contractor', is_verified: true, vouches_count: 156 },
    recipient: { id: 'p4', name: 'Mike Chen', avatar_url: null, avatar_color: '#B8A8D4', company: 'Chen Electric', role: 'Contractor', trade: 'Electrician', is_verified: true, vouches_count: 134 },
    comment: 'Best electrician sub I work with. Always up to code, never a callback.',
    tags: ['Code Compliant', 'Dependable'],
    created_at: new Date(Date.now() - 34 * 3600000).toISOString(),
    review_id: null,
  },

  // ── Partner vouches (25% target) ───────────────────────
  {
    id: 'v13',
    voucher: { id: 'p1', name: 'Sarah Mitchell', avatar_url: null, avatar_color: '#A8C5DA', company: 'Keller Williams', role: 'Agent', is_verified: true, vouches_count: 42 },
    recipient: { id: 'p17', name: 'Diana Ross-Wu', avatar_url: null, avatar_color: '#7BA3C9', company: 'First National Lending', role: 'Mortgage Pro', is_verified: true, vouches_count: 91 },
    comment: 'Closed a jumbo loan in 17 days. Fastest I\'ve ever seen.',
    tags: ['Fast Closer', 'Jumbo Expert'],
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    review_id: 'r13',
  },
  {
    id: 'v14',
    voucher: { id: 'p5', name: 'Amanda Torres', avatar_url: null, avatar_color: '#D4A8B5', company: 'Compass', role: 'Agent', is_verified: true, vouches_count: 56 },
    recipient: { id: 'p18', name: 'Mark Stevens', avatar_url: null, avatar_color: '#A8C9B5', company: 'Front Range Title', role: 'Title/Escrow', is_verified: true, vouches_count: 78 },
    comment: null,
    tags: ['Clear Communication'],
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    review_id: null,
  },
  {
    id: 'v15',
    voucher: { id: 'p7', name: 'Nicole Park', avatar_url: null, avatar_color: '#A8D4B5', company: 'eXp Realty', role: 'Agent', is_verified: true, vouches_count: 31 },
    recipient: { id: 'p19', name: 'Paul Nguyen', avatar_url: null, avatar_color: '#D4C5A8', company: 'Nguyen Inspections', role: 'Home Inspector', is_verified: true, vouches_count: 64 },
    comment: 'Paul found a foundation issue everyone else missed. Saved my buyer $40K.',
    tags: ['Thorough', 'Foundation Expert'],
    created_at: new Date(Date.now() - 20 * 3600000).toISOString(),
    review_id: 'r15',
  },
  {
    id: 'v16',
    voucher: { id: 'p3', name: 'James Porter', avatar_url: null, avatar_color: '#B5C4A8', company: 'RE/MAX', role: 'Agent', is_verified: false, vouches_count: 18 },
    recipient: { id: 'p20', name: 'Rachel Kim', avatar_url: null, avatar_color: '#C4A882', company: 'Summit Mortgage', role: 'Mortgage Pro', is_verified: false, vouches_count: 35 },
    comment: 'Great with first-time buyers. Patient and explains everything clearly.',
    tags: ['First-Time Buyers', 'Patient'],
    created_at: new Date(Date.now() - 28 * 3600000).toISOString(),
    review_id: 'r16',
  },
];

export default VouchFeedSection;
export { VouchFilterTab, applyContractorBias, FILTER_TO_ROLE };
