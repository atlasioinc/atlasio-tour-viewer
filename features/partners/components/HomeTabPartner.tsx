// HomeTabPartner.tsx
// What: Partner home tab — action-required deal board, connection requests, visibility stats
// Who: Partner role users (Title/Escrow, Mortgage Pro) — role-branched within single component
// Where: BottomTabNavigator → Home tab (when role is partner and PARTNER_TRACK_ENABLED)
// Role branching: partnerRole prop controls alert composer types and stale day thresholds
// @demo PARTNER_TRACK_ENABLED must be false before any commit — this screen is pre-launch

// STATE FLOW:
// profile.role → partnerRole → controls alertTypes (via ALERT_TYPES_BY_ROLE)
// usePartnerNeedsAttention() → needsAttentionDeals → "Needs Attention" section
// needsAttentionDeals.length === 0 → show "All deals on track" empty state
// usePartnerActiveDeals() → allDeals.length → "View all X deals →" count
// useToggleAcceptingClients() → optimistic toggle on availability card
// useUpdateMilestoneStatus() → optimistic cycle on milestone tap
// usePostDealAlert() → fires on composer Send tap

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Share,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { COLORS, SPACING, DIMENSIONS, SHADOWS } from '../../../lib/tokens';
import ActiveDealCard from './ActiveDealCard';
import {
  usePartnerNeedsAttention,
  usePartnerActiveDeals,
  usePartnerStats,
  usePartnerInvitations,
  usePartnerAcceptedConnections,
  useToggleAcceptingClients,
  useUpdateMilestoneStatus,
  usePostDealAlert,
  useDismissDealAlert,
  useRespondToDealInvitation,
} from '../hooks/usePartnerData';
import type { PartnerRole, MilestoneStatus, AlertType, InvitationItem } from '../types/partner.types';

// ─────────────────────────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────────────────────────

const BellIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M18 8A6 6 0 006 8C6 15 3 17 3 17H21S18 15 18 8Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M13.73 21A2 2 0 0110.27 21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShareIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M4 12V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 6L12 2L8 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M12 2V15" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LinkIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M10 13C10.4295 13.5741 10.9774 14.0491 11.6066 14.3929C12.2357 14.7367 12.9315 14.9411 13.6467 14.9923C14.3618 15.0435 15.0796 14.9403 15.7513 14.6897C16.4231 14.4392 17.0331 14.047 17.54 13.54L20.54 10.54C21.4508 9.59695 21.9548 8.33394 21.9434 7.02296C21.932 5.71198 21.4061 4.45791 20.479 3.531C19.552 2.60408 18.2979 2.0781 16.987 2.06671C15.676 2.05532 14.413 2.55928 13.47 3.47L11.75 5.18" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 11C13.5705 10.4259 13.0226 9.95083 12.3934 9.60707C11.7642 9.26331 11.0684 9.05889 10.3533 9.00768C9.63816 8.95646 8.92037 9.05964 8.24861 9.31023C7.57685 9.56082 6.96684 9.953 6.46 10.46L3.46 13.46C2.54918 14.403 2.04521 15.666 2.05661 16.977C2.06801 18.288 2.59394 19.5421 3.52101 20.469C4.44808 21.3959 5.70215 21.9219 7.01312 21.9333C8.3241 21.9447 9.58705 21.4407 10.53 20.53L12.24 18.82" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ChevronRightIcon: React.FC<{ color: string; size?: number }> = ({ color, size = 16 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M9 18L15 12L9 6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const PeopleIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Circle cx={9} cy={7} r={4} stroke={color} strokeWidth={2} />
    <Path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrendUpIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M23 6L13.5 15.5L8.5 10.5L1 18" stroke={COLORS.scoreGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 6H23V12" stroke={COLORS.scoreGreen} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const TrendDownIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M23 18L13.5 8.5L8.5 13.5L1 6" stroke={COLORS.dangerText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M17 18H23V12" stroke={COLORS.dangerText} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────
// PROPS & CONFIG
// ─────────────────────────────────────────────────────────────────

interface HomeTabPartnerProps {
  partnerRole?: PartnerRole;
}

// @demo — hardcoded partner ID for mock data
const DEMO_PARTNER_ID = 'partner-1';

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

const HomeTabPartner: React.FC<HomeTabPartnerProps> = ({ partnerRole = 'Mortgage Pro' }) => {
  // ── Navigation ──
  const navigation = useNavigation<any>();

  // ── State ──
  const [acceptingClients, setAcceptingClients] = useState(true);

  // ── Hooks ──
  // @backend rpc_get_partner_active_deals — derives needsAttentionDeals client-side (stale milestones + undismissed alerts)
  const { data: needsAttentionDeals, allDeals } = usePartnerNeedsAttention(DEMO_PARTNER_ID, partnerRole);
  // @backend rpc_get_partner_stats — profile_views + search_appearances return 0 until tracking wired (S62b)
  const { data: stats } = usePartnerStats(DEMO_PARTNER_ID);
  // @backend rpc_get_partner_invitations — unified connection_requests + deal_invitations feed
  const { data: invitations } = usePartnerInvitations();
  const toggleAccepting = useToggleAcceptingClients();
  const updateMilestone = useUpdateMilestoneStatus();
  const postAlert = usePostDealAlert();
  const dismissAlert = useDismissDealAlert();
  const respondToDeal = useRespondToDealInvitation();

  const totalActiveDeals = allDeals?.length ?? 0;

  // @backend usePartnerAcceptedConnections → rpc_get_partner_accepted_connections
  const { data: acceptedConnections } = usePartnerAcceptedConnections();

  // ── Unified invitations list (S64b) ──
  // Merge connection requests + deal invitations into a single ordered list
  const allInvitations: InvitationItem[] = [
    ...(invitations?.connection_requests ?? []),
    ...(invitations?.deal_invitations ?? []),
  ];
  const invitationCount = invitations?.total_count ?? 0;

  // ── Handlers ──
  const handleToggleAccepting = useCallback(() => {
    const newValue = !acceptingClients;
    setAcceptingClients(newValue);
    toggleAccepting.mutate({ partnerId: DEMO_PARTNER_ID, accepting: newValue });
  }, [acceptingClients, toggleAccepting]);

  const handleMilestoneTap = useCallback((milestoneId: string, currentStatus: MilestoneStatus) => {
    const nextStatus: MilestoneStatus =
      currentStatus === 'pending' ? 'in_progress'
      : currentStatus === 'in_progress' ? 'complete'
      : 'pending';
    const completedAt = nextStatus === 'complete' ? new Date().toISOString() : null;
    updateMilestone.mutate({
      milestoneId,
      status: nextStatus,
      completedAt,
      partnerId: DEMO_PARTNER_ID,
    });
  }, [updateMilestone]);

  const handlePostAlert = useCallback((jobId: string, alertType: AlertType, message: string, expiresAt: string | null, transactionId?: string) => {
    // @backend rpc_post_deal_alert — S88: transaction_id forwarded from ActiveDealCard when available
    postAlert.mutate({
      jobId,
      alertType,
      message,
      expiresAt,
      partnerId: DEMO_PARTNER_ID,
      transactionId,
    });
  }, [postAlert]);

  const handleDismissAlert = useCallback((alertId: string) => {
    dismissAlert.mutate({ alertId, partnerId: DEMO_PARTNER_ID });
  }, [dismissAlert]);

  // ── Deal invitation handlers (S64b) ──
  const handleAcceptDeal = useCallback((transactionPartnerId: string) => {
    // @backend rpc_respond_to_deal_invitation(p_transaction_partner_id, p_response: 'accepted')
    // NOTE: anchors to transaction_id (S64+). job_id preserved for backward compat only.
    respondToDeal.mutate({ transactionPartnerId, response: 'accepted' });
  }, [respondToDeal]);

  const handleDeclineDeal = useCallback((transactionPartnerId: string) => {
    Alert.alert(
      'Decline Deal',
      'Are you sure you want to decline this deal invitation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: () => {
            // @backend rpc_respond_to_deal_invitation(p_transaction_partner_id, p_response: 'declined')
            // NOTE: anchors to transaction_id (S64+). job_id preserved for backward compat only.
            respondToDeal.mutate({ transactionPartnerId, response: 'declined' });
          },
        },
      ],
    );
  }, [respondToDeal]);

  const handleShareProfile = useCallback(async () => {
    // @demo deep link is placeholder until deep link routing is wired
    await Share.share({ message: `Connect with me on Atlasio: atlasio://profile/${DEMO_PARTNER_ID}` });
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* ── Header ── */}
      <View style={{
        height: DIMENSIONS.headerHeight,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        borderBottomWidth: DIMENSIONS.headerBorderWidth,
        borderBottomColor: COLORS.border,
      }}>
        <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.darkText }}>Home</Text>
        <Pressable style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <BellIcon color={COLORS.darkText} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* ═════════════════════════════════════════════════════════ */}
        {/* SECTION 1 — Availability Card                           */}
        {/* Toggle accepting_clients — controls visibility on squad  */}
        {/* invites. Green when on, grey when off.                  */}
        {/* @backend rpc_toggle_accepting_clients                   */}
        {/* ═════════════════════════════════════════════════════════ */}
        <Pressable
          onPress={handleToggleAccepting}
          style={{
            marginHorizontal: SPACING.xl,
            marginTop: SPACING.xl,
            padding: SPACING.xl,
            borderRadius: DIMENSIONS.cardRadius,
            backgroundColor: acceptingClients ? COLORS.cardGreen : COLORS.chipBg,
            borderWidth: DIMENSIONS.cardBorderWidth,
            borderColor: acceptingClients ? COLORS.cardGreenBorder : COLORS.cardBorder,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: acceptingClients ? COLORS.addedGreen : COLORS.darkText }}>
              {acceptingClients ? 'Accepting New Clients' : 'At Capacity'}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '400', color: acceptingClients ? COLORS.scoreGreen : COLORS.secondaryText, marginTop: 2 }}>
              {acceptingClients ? 'Visible on squad invites' : 'Hidden from squad invites'}
            </Text>
          </View>
          <Switch
            value={acceptingClients}
            onValueChange={handleToggleAccepting}
            trackColor={{ false: COLORS.border, true: COLORS.scoreGreen }}
            ios_backgroundColor={COLORS.border}
          />
        </Pressable>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SECTION 2 — Invitations (S64b: unified feed)            */}
        {/* Two card types: connection_request + deal_invitation    */}
        {/* @backend rpc_get_partner_invitations() — uses auth.uid()*/}
        {/* NOTE: anchors to transaction_id (S64+)                 */}
        {/* ═════════════════════════════════════════════════════════ */}
        {allInvitations.length > 0 && (
          <View style={{ marginTop: SPACING['3xl'] }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: SPACING.xl,
              marginBottom: SPACING.lg,
            }}>
              <Text style={{
                fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                Invitations
              </Text>
              <Pressable style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.accentBlue }}>
                  See all ({invitationCount})
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingVertical: 4 }}
            >
              {allInvitations.map(item => {
                if (item.item_type === 'connection_request') {
                  // ── Connection Request Card (existing visual, no changes) ──
                  return (
                    <View
                      key={item.id}
                      style={{
                        width: 200,
                        padding: SPACING.xl,
                        borderRadius: DIMENSIONS.cardRadius,
                        borderWidth: DIMENSIONS.cardBorderWidth,
                        borderColor: COLORS.cardBorder,
                        backgroundColor: COLORS.background,
                        marginRight: SPACING.lg,
                        ...SHADOWS.card,
                      }}
                    >
                      {/* Avatar initials */}
                      <View style={{
                        width: 44,
                        height: 44,
                        borderRadius: DIMENSIONS.pillRadius,
                        backgroundColor: item.requester_avatar_color,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: SPACING.md,
                      }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.background }}>
                          {(item.requester_name ?? '').split(' ').map(n => n[0]).join('')}
                        </Text>
                      </View>

                      <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}>{item.requester_name}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, marginTop: 2 }}>
                        {item.requester_role} {'\u00B7'} {item.requester_company}
                      </Text>

                      {/* Accept / Ignore buttons */}
                      <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg }}>
                        <Pressable style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: COLORS.accentBlue,
                          alignItems: 'center',
                        }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.background }}>Accept</Text>
                        </Pressable>
                        <Pressable style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          alignItems: 'center',
                        }}>
                          <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.secondaryText }}>Ignore</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                }

                // ── Deal Invitation Card (S64b — NEW) ──
                // Visual distinction: 4px left border accent, COLORS.primary
                const closingLabel = item.closing_date
                  ? new Date(item.closing_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : null;
                const roleLabel = item.partner_role === 'title_escrow' ? 'Title/Escrow'
                  : item.partner_role === 'mortgage_pro' ? 'Mortgage Pro'
                  : item.partner_role;

                return (
                  <View
                    key={item.id}
                    style={{
                      width: 200,
                      padding: SPACING.xl,
                      borderRadius: DIMENSIONS.cardRadius,
                      borderWidth: DIMENSIONS.cardBorderWidth,
                      borderColor: COLORS.cardBorder,
                      borderLeftWidth: 4,
                      borderLeftColor: COLORS.primary,
                      backgroundColor: COLORS.background,
                      marginRight: SPACING.lg,
                      ...SHADOWS.card,
                    }}
                  >
                    {/* Property address */}
                    <Text
                      style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}
                      numberOfLines={1}
                    >
                      {item.property_address}
                    </Text>

                    {/* Agent row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View style={{
                        width: 24, height: 24, borderRadius: 9999,
                        backgroundColor: item.agent_avatar_color,
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '600', color: COLORS.background }}>
                          {(item.agent_name ?? '').charAt(0)}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText }}>
                        {item.agent_name}
                      </Text>
                    </View>

                    {/* Role pill */}
                    <View style={{
                      alignSelf: 'flex-start', marginTop: 8,
                      backgroundColor: COLORS.tagBg,
                      borderRadius: DIMENSIONS.pillRadius,
                      paddingHorizontal: 8, paddingVertical: 2,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.bodyText }}>
                        {roleLabel}
                      </Text>
                    </View>

                    {/* Closing date */}
                    {closingLabel && (
                      <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, marginTop: 6 }}>
                        Closing {closingLabel}
                      </Text>
                    )}

                    {/* Accept / Decline buttons */}
                    <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg }}>
                      <Pressable
                        onPress={() => handleAcceptDeal(item.id)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          backgroundColor: COLORS.accentBlue,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.background }}>Accept</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeclineDeal(item.id)}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: COLORS.border,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.secondaryText }}>Decline</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SECTION 3 — Needs Attention (deal board)                */}
        {/* Deals with stale milestones or undismissed alerts.      */}
        {/* Empty state: green "All deals on track" card.           */}
        {/* ═════════════════════════════════════════════════════════ */}
        <View style={{ marginTop: SPACING['3xl'], paddingHorizontal: SPACING.xl }}>
          <Text style={{
            fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
            textTransform: 'uppercase', letterSpacing: 0.5,
            marginBottom: SPACING.lg,
          }}>
            {needsAttentionDeals.length > 0 ? 'Needs Attention' : 'Your Deals'}
          </Text>

          {needsAttentionDeals.length === 0 ? (
            /* AllClearEmptyState — green card */
            <View style={{
              padding: SPACING.xl,
              borderRadius: DIMENSIONS.cardRadius,
              backgroundColor: COLORS.cardGreen,
              borderWidth: DIMENSIONS.cardBorderWidth,
              borderColor: COLORS.cardGreenBorder,
              alignItems: 'center',
            }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.addedGreen }}>
                All deals on track
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.scoreGreen, marginTop: SPACING.sm }}>
                Nothing needs your attention right now
              </Text>
            </View>
          ) : (
            needsAttentionDeals.map(deal => (
              <ActiveDealCard
                key={deal.job_id}
                deal={deal}
                partnerRole={partnerRole}
                onMilestoneTap={handleMilestoneTap}
                onPostAlert={handlePostAlert}
                onDismissAlert={handleDismissAlert}
              />
            ))
          )}

          {/* View all deals link — hidden when total deal count is 0 */}
          {totalActiveDeals > 0 && (
            <Pressable
              onPress={() => navigation.navigate('Deals')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: SPACING.lg,
                marginTop: SPACING.sm,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.accentBlue }}>
                View all {totalActiveDeals} deals
              </Text>
              <ChevronRightIcon color={COLORS.accentBlue} />
            </Pressable>
          )}
        </View>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SECTION 4 — Visibility Stats                            */}
        {/* 3-tile row: Profile Views, Search Appearances, Vouches  */}
        {/* @backend rpc_get_partner_stats                          */}
        {/* ═════════════════════════════════════════════════════════ */}
        {stats && (
          <View style={{ marginTop: SPACING['3xl'], paddingHorizontal: SPACING.xl }}>
            <Text style={{
              fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
              textTransform: 'uppercase', letterSpacing: 0.5,
              marginBottom: SPACING.lg,
            }}>
              Visibility This Month
            </Text>

            <View style={{ flexDirection: 'row', gap: SPACING.md }}>
              <StatTile label="Profile Views" value={stats.profile_views} trend={stats.profile_views_trend} />
              <StatTile label="Appearances" value={stats.search_appearances} trend={stats.search_appearances_trend} />
              <StatTile label="New Vouches" value={stats.vouches_received} trend={stats.vouches_received_trend} />
            </View>
          </View>
        )}

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SECTION 5 — Recent Vouches                              */}
        {/* Reuses vouch feed pattern from HomeTabAgent.tsx          */}
        {/* @backend existing vouch RPC                             */}
        {/* @demo Inline mock data — same structure as agent vouch  */}
        {/* ═════════════════════════════════════════════════════════ */}
        <View style={{ marginTop: SPACING['3xl'], paddingHorizontal: SPACING.xl }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: SPACING.lg,
          }}>
            <Text style={{
              fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Recent Vouches
            </Text>
            <Pressable style={{ minHeight: 44, justifyContent: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.accentBlue }}>See all</Text>
            </Pressable>
          </View>

          {/* @demo Inline vouch cards — replace with useProfileVouches when wired */}
          {DEMO_VOUCHES.map(vouch => (
            <View
              key={vouch.id}
              style={{
                padding: SPACING.xl,
                borderRadius: DIMENSIONS.cardRadius,
                borderWidth: DIMENSIONS.cardBorderWidth,
                borderColor: COLORS.cardBorder,
                backgroundColor: COLORS.quoteBg,
                marginBottom: SPACING.lg,
                ...SHADOWS.card,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: DIMENSIONS.pillRadius,
                  backgroundColor: vouch.avatarColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.background }}>
                    {(vouch.name ?? '').split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
                <View style={{ marginLeft: SPACING.md }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText }}>{vouch.name}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText }}>{vouch.role}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, fontStyle: 'italic' }}>
                &ldquo;{vouch.quote}&rdquo;
              </Text>
            </View>
          ))}
        </View>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SECTION 5.5 — My Network Summary Row                    */}
        {/* @backend usePartnerAcceptedConnections → rpc_get_partner_accepted_connections */}
        {/* Taps to Network tab (partner role branch built in S103) */}
        {/* ═════════════════════════════════════════════════════════ */}
        <Pressable
          onPress={() => navigation.dispatch(CommonActions.navigate({ name: 'Network' }))}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: SPACING.xl,
            minHeight: 44,
            justifyContent: 'center',
            marginTop: SPACING['3xl'],
            borderBottomWidth: DIMENSIONS.headerBorderWidth,
            borderBottomColor: COLORS.border,
          }}
        >
          <PeopleIcon color={COLORS.secondaryText} />
          <Text style={{ fontSize: 15, fontWeight: '500', color: COLORS.darkText, marginLeft: SPACING.md, flex: 1 }}>
            My Network
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.secondaryText, marginRight: SPACING.sm }}>
            {acceptedConnections?.length ?? 0} agent{(acceptedConnections?.length ?? 0) !== 1 ? 's' : ''}
          </Text>
          <ChevronRightIcon color={COLORS.secondaryText} />
        </Pressable>

        {/* ═════════════════════════════════════════════════════════ */}
        {/* SECTION 6 — Share Profile CTA                           */}
        {/* Deep link sharing — placeholder until routing is wired  */}
        {/* @demo deep link is atlasio://profile/[partnerId]        */}
        {/* ═════════════════════════════════════════════════════════ */}
        <View style={{ marginTop: SPACING['3xl'], paddingHorizontal: SPACING.xl }}>
          <Text style={{
            fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
            textTransform: 'uppercase', letterSpacing: 0.5,
            marginBottom: SPACING.lg,
          }}>
            Profile
          </Text>

          <Pressable
            onPress={handleShareProfile}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: SPACING.xl,
              borderRadius: DIMENSIONS.cardRadius,
              borderWidth: DIMENSIONS.cardBorderWidth,
              borderColor: COLORS.cardBorder,
              backgroundColor: COLORS.backgroundInfo,
              ...SHADOWS.card,
            }}
          >
            <View style={{
              width: 44,
              height: 44,
              borderRadius: DIMENSIONS.pillRadius,
              backgroundColor: COLORS.cardBlue,
              borderWidth: 1,
              borderColor: COLORS.cardBlueBorder,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <LinkIcon color={COLORS.accentBlue} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.lg }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}>Share your profile</Text>
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, marginTop: 2 }}>
                Send agents your Atlasio link
              </Text>
            </View>
            <ChevronRightIcon color={COLORS.lightText} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─────────────────────────────────────────────────────────────────
// STAT TILE
// ─────────────────────────────────────────────────────────────────

const StatTile: React.FC<{ label: string; value: number; trend: number }> = ({ label, value, trend }) => (
  <View style={{
    flex: 1,
    padding: SPACING.lg,
    borderRadius: DIMENSIONS.cardRadius,
    borderWidth: DIMENSIONS.cardBorderWidth,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.background,
    ...SHADOWS.card,
  }}>
    <Text style={{ fontSize: 20, fontWeight: '700', color: COLORS.darkText }}>{value}</Text>
    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, marginTop: SPACING.sm }}>{label}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: SPACING.sm }}>
      {trend > 0 ? <TrendUpIcon /> : trend < 0 ? <TrendDownIcon /> : null}
      <Text style={{
        fontSize: 14,
        fontWeight: '500',
        color: trend > 0 ? COLORS.scoreGreen : trend < 0 ? COLORS.dangerText : COLORS.secondaryText,
        marginLeft: trend !== 0 ? 4 : 0,
      }}>
        {trend > 0 ? '+' : ''}{trend}%
      </Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────────────────────────
// @demo VOUCH DATA — replace with useProfileVouches when wired
// ─────────────────────────────────────────────────────────────────

const DEMO_VOUCHES = [
  { id: 'v-1', name: 'Priya Patel', role: 'Agent', avatarColor: '#8B5CF6', quote: 'Closed on time every single deal. Communication is top-notch.' },
  { id: 'v-2', name: 'Marcus Webb', role: 'Agent', avatarColor: '#3B82F6', quote: 'Best title company in Denver. Always responsive and thorough.' },
];

export default HomeTabPartner;
