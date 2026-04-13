// AgentDealDetailScreen.tsx
// ═══════════════════════════════════════════════════════════════
// What: Agent deal detail — milestones, partners, alerts, closing details, close/cancel actions
// Who: Agent role only
// Where: HomeStack → AgentDealDetail (pushed from HomeTabAgent or AgentDealsScreen)
//
// READ-ONLY VIEW — agent cannot tap or modify milestones.
// Partner updates milestones via their own deal card (ActiveDealCard.tsx).
// Realtime subscription refreshes this view automatically.
//
// @demo mock data from useAgentActiveDeals (hooks/useData.ts)
// @backend rpc_get_deal_board_for_agent — params: { p_agent_id: auth.uid() }
// @backend rpc_close_transaction({ p_transaction_id: transactionId })
// @backend rpc_cancel_transaction({ p_transaction_id: transactionId })
// ═══════════════════════════════════════════════════════════════

// STATE FLOW:
// route.params.jobId → find deal from useAgentActiveDeals cache
// deal.transaction_id ?? route.params.transactionId → transactionId for Realtime + mutations
// useRealtimeDealBoard(jobId, transactionId) → live refresh via Supabase channels (S88: transaction_id channel when available)
// per partner: milestones + alerts → progress bar + milestone list + alert banners
// dismiss alert → useAgentDismissDealAlert mutation (optimistic)

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Share, TextInput, KeyboardAvoidingView, Platform, Alert, ActionSheetIOS } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { HomeStackParamList } from './HomeStack';
import { ScreenHeader } from './ScreenHeader';
import { Avatar } from './shared';
import { COLORS, DIMENSIONS, SPACING } from '../lib/tokens';
import FormField from './FormField';
import { useAgentActiveDeals, useAgentDismissDealAlert, useRealtimeDealBoard, useUpdateClosingDetails, useGenerateClientToken, useCloseTransaction, useCancelTransaction } from '../hooks/useData';
import { PrimaryButton, SecondaryButton, DangerButton } from './Button';
import { DEAL_CREATION_ENABLED } from '../lib/config';
import * as Haptics from 'expo-haptics';
import { isMilestoneStale, getRateLockDaysRemaining, RATE_LOCK_DANGER_THRESHOLD_DAYS } from '../features/partners/lib/dealMilestones';
import type { AgentDealPartner, PartnerRole } from '../features/partners/types/partner.types';

// ─── Status Dot Calculation ───────────────────────────────────
// Priority: red > amber > green > gray
// Used on partner header row (12px dot)

function getSlotStatusDot(
  partner: AgentDealPartner,
  role: PartnerRole,
): 'red' | 'amber' | 'green' | 'gray' {
  if (!(partner.milestones ?? []).length) return 'gray';
  const hasAlert = (partner.alerts ?? []).some(a => !a.dismissed_at);
  if (hasAlert) return 'red';
  const hasStale = (partner.milestones ?? []).some(m => isMilestoneStale(m, role));
  if (hasStale) return 'amber';
  return 'green';
}

const STATUS_DOT_COLORS: Record<string, string> = {
  red: COLORS.dangerText,
  amber: COLORS.warningAmber,
  green: COLORS.successGreen,
  gray: COLORS.secondaryText,
};

// ─── SVG Icons ────────────────────────────────────────────────

const CheckCircleIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} fill={color} />
    <Path d="M8 12L11 15L16 9" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const InProgressIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
    <Circle cx={12} cy={12} r={4} fill={color} />
  </Svg>
);

const PendingIcon: React.FC = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={10} stroke={COLORS.secondaryText} strokeWidth={2} />
  </Svg>
);

const AlertIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9V13M12 17H12.01M4.93 19H19.07C20.4 19 21.24 17.56 20.58 16.41L13.5 3.57C12.84 2.43 11.16 2.43 10.5 3.57L3.42 16.41C2.76 17.56 3.6 19 4.93 19Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const MoreHorizontalIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle cx={5} cy={12} r={1.5} fill={color} />
    <Circle cx={12} cy={12} r={1.5} fill={color} />
    <Circle cx={19} cy={12} r={1.5} fill={color} />
  </Svg>
);

// ─── Helpers ──────────────────────────────────────────────────

function formatClosingDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// @backend rpc_get_agent_deals → transactions.contract_price
function formatPrice(price: number | null | undefined): string | null {
  if (!price) return null;
  return '$' + price.toLocaleString('en-US');
}

function getStaleDays(milestone: { updated_at: string }): number {
  const updatedAt = new Date(milestone.updated_at);
  const now = new Date();
  return Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const AgentDealDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<HomeStackParamList, 'AgentDealDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const { jobId, transactionId: routeTransactionId, dealData: routeDealData } = route.params;

  // ── Data ──
  const { data: allDeals } = useAgentActiveDeals();
  // Look up by job_id first, fall back to transaction_id, then use routeDealData passed from DealCreationSheet
  // @demo fallback — routeDealData from route params used when deal not yet in cache
  // Safe to remove post-launch once rpc_get_agent_deals cache is always warm
  // Do NOT remove before TestFlight validation
  const deal = allDeals?.find(d => d.job_id === jobId)
    ?? allDeals?.find(d => d.transaction_id === jobId)
    ?? routeDealData;

  // @backend S88: prefer deal.transaction_id (authoritative), fall back to route param, then undefined
  const transactionId = deal?.transaction_id ?? routeTransactionId;
  const dismissAlert = useAgentDismissDealAlert();
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

  // ── Share button ──
  // @backend useGenerateClientToken — rpc_generate_client_token(p_transaction_id, p_notify_phone)
  // @demo Falls back to 'mock-transaction-001' when transactionId is undefined
  const generateToken = useGenerateClientToken();
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [notifyPhone, setNotifyPhone] = useState('');
  const [smsSent, setSmsSent] = useState(false);

  // ── Deal lifecycle actions (S121a) ──
  // @backend rpc_close_transaction({ p_transaction_id: transactionId })
  // @backend rpc_cancel_transaction({ p_transaction_id: transactionId })
  const closeTransaction = useCloseTransaction();
  const cancelTransaction = useCancelTransaction();
  const isLifecyclePending = closeTransaction.isPending || cancelTransaction.isPending;

  // ── Deal Closed Celebration (S123) ──
  // @backend rpc_mark_deal_closed({ p_transaction_id: transactionId })
  // @demo In mock mode, skip mutation and navigate directly to celebration screen
  // @backend When wired: const markDealClosed = useMarkDealClosed();
  //   await markDealClosed.mutateAsync({ transactionId }); before navigation

  const handleMarkDealClosed = () => {
    if (!deal) return;
    // 1. Heavy haptic immediately
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // 2. Navigate to celebration screen
    // @demo: skip mutation in mock mode, navigate directly
    navigation.push('DealClosedCelebration', {
      deal: {
        address: deal.address,
        buyerName: deal.buyer_name ?? null,
        salePrice: deal.contract_price ?? null,
        closingDate: deal.closing_date ?? null,
        agentName: 'Agent', // @backend replace with auth user's name
      },
    });
  };

  const handleCloseDeal = () => {
    if (!transactionId) return;
    Alert.alert(
      'Mark Deal as Closed?',
      'This will mark the deal as successfully closed. The deal will be removed from your active pipeline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark as Closed',
          onPress: async () => {
            try {
              await closeTransaction.mutateAsync({ transactionId });
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to close transaction');
            }
          },
        },
      ],
    );
  };

  const handleCancelDeal = () => {
    if (!transactionId) return;
    Alert.alert(
      'Cancel This Deal?',
      'This will cancel the deal. It will be removed from your active pipeline. This cannot be undone.',
      [
        { text: 'Keep Deal', style: 'cancel' },
        {
          text: 'Cancel Deal',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelTransaction.mutateAsync({ transactionId });
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'Failed to cancel transaction');
            }
          },
        },
      ],
    );
  };

  const handleShare = async () => {
    if (!transactionId || transactionId.startsWith('mock-')) {
      Alert.alert('Unable to share', 'This deal does not have a live transaction ID yet.');
      return;
    }
    try {
      // @backend rpc_generate_client_token(p_transaction_id)
      const result = await generateToken.mutateAsync({
        transactionId,
      });
      setGeneratedUrl(result.url);
      await Share.share({
        url: result.url,
        message: 'Track your closing progress: ' + result.url,
      });
    } catch (err: any) {
      console.error('[AgentDealDetailScreen] handleShare error:', err);
      Alert.alert('Unable to share', err?.message ?? 'Failed to generate sharing link.');
    }
  };

  // @backend rpc_generate_client_token(p_transaction_id, p_notify_phone) — idempotent, re-calls with phone to trigger SMS
  const handleSendSms = async () => {
    if (!notifyPhone.trim() || !transactionId || transactionId.startsWith('mock-')) return;
    try {
      await generateToken.mutateAsync({
        transactionId,
        notifyPhone: notifyPhone.trim(),
      });
      setSmsSent(true);
    } catch (err: any) {
      console.error('[AgentDealDetailScreen] handleSendSms error:', err);
      Alert.alert('SMS failed', err?.message ?? 'Could not send SMS.');
    }
  };

  // ── 3-dot menu ──
  const handleMenuPress = () => {
    const options = ['Edit Deal', 'Share with Client', 'Cancel'];
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            // Edit Deal → navigate to EditDealScreen
            navigation.push('EditDeal', {
              transactionId: transactionId ?? '',
              buyerName: deal?.buyer_name ?? null,
              contractPrice: deal?.contract_price ?? null,
              closingDate: deal?.closing_date ?? null,
            });
          } else if (buttonIndex === 1) {
            // Share with Client → existing share logic
            handleShare();
          }
        },
      );
    } else {
      // Android fallback — Alert with buttons
      Alert.alert('Deal Options', undefined, [
        {
          text: 'Edit Deal',
          onPress: () => {
            navigation.push('EditDeal', {
              transactionId: transactionId ?? '',
              buyerName: deal?.buyer_name ?? null,
              contractPrice: deal?.contract_price ?? null,
              closingDate: deal?.closing_date ?? null,
            });
          },
        },
        { text: 'Share with Client', onPress: handleShare },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  // ── Closing day details ──
  // @backend useUpdateClosingDetails — rpc_update_closing_details(p_transaction_id, p_closing_details)
  // S88: transactionId wired from deal.transaction_id ?? route param
  const updateClosingDetails = useUpdateClosingDetails();
  const [closingDetails, setClosingDetails] = useState<{ time: string; location: string; bring_list: string; wire_amount: string } | null>(null);
  const [isEditingClosingDetails, setIsEditingClosingDetails] = useState(false);
  const [closingForm, setClosingForm] = useState({
    time: '',
    location: '',
    bring_list: 'Government-issued ID, cashier\'s check or wire confirmation',
    wire_amount: '',
  });

  const handleOpenClosingForm = () => {
    // Fix 4: Pre-fill time with closing_date if form time is empty
    const formattedDate = deal?.closing_date
      ? new Date(deal.closing_date).toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      : '';
    setClosingForm(prev => ({
      ...prev,
      time: prev.time || formattedDate,
    }));
    setIsEditingClosingDetails(true);
  };

  const handleSaveClosingDetails = () => {
    // @backend useUpdateClosingDetails — rpc_update_closing_details(p_transaction_id, p_closing_details)
    // @demo Falls back to 'mock-transaction-001' when transactionId is undefined
    updateClosingDetails.mutate(
      { transactionId: transactionId ?? 'mock-transaction-001', closingDetails: closingForm },
      {
        onSuccess: () => {
          setClosingDetails(closingForm);
          setIsEditingClosingDetails(false);
        },
      },
    );
  };

  // ── Realtime subscription (refreshes cache on milestone/alert changes) ──
  // @backend useRealtimeDealBoard — S88: subscribes via transaction_id channel when available
  // When transactionId is defined, Realtime listens on transaction_id=eq.{transactionId}
  // This gives new deals created via rpc_create_transaction live milestone + alert coverage
  useRealtimeDealBoard(jobId, transactionId);

  if (!deal) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
        <ScreenHeader title="Deal" onBack={() => navigation.goBack()} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '500', color: COLORS.bodyText }}>Deal not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const closingDateLabel = formatClosingDate(deal.closing_date);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      <ScreenHeader
        title={deal.address}
        titleSize={15}
        titleColor={COLORS.darkText}
        rightElement={
          /* 3-dot menu: Edit Deal + Share with Client */
          <Pressable
            onPress={handleMenuPress}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <MoreHorizontalIcon color={COLORS.darkText} />
          </Pressable>
        }
        onBack={() => navigation.goBack()}
      />

      {/* Subtitle bar — buyer name, contract price, closing date */}
      {/* @backend rpc_get_agent_deals → buyer_name, contract_price, closing_date */}
      {(deal.buyer_name || formatPrice(deal.contract_price) || closingDateLabel) ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: DIMENSIONS.headerBorderWidth, borderBottomColor: COLORS.border }}>
          {deal.buyer_name ? (
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, textAlign: 'center' }}>
              {deal.buyer_name}
            </Text>
          ) : null}
          {(formatPrice(deal.contract_price) || closingDateLabel) ? (
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, textAlign: 'center' }}>
              {[formatPrice(deal.contract_price), closingDateLabel ? `Closing ${closingDateLabel}` : null].filter(Boolean).join(' · ')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16 }}
      >
        {deal.partners.map((partner, index) => {
          const statusDot = getSlotStatusDot(partner, partner.partner_role);
          const completedCount = (partner.milestones ?? []).filter(m => m.status === 'complete').length;
          const totalCount = (partner.milestones ?? []).length;
          const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

          return (
            <React.Fragment key={partner.partner_id}>
              {/* ── Divider between partner sections ── */}
              {index > 0 && (
                <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 20, marginHorizontal: 16 }} />
              )}

              <View style={{ paddingHorizontal: 16 }}>
                {/* ── 1. Partner Header Row ── */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Avatar
                    name={partner.name ?? ''}
                    color={partner.partner_avatar_color ?? COLORS.secondaryText}
                    size={36}
                  />

                  {/* Name + role */}
                  <View style={{ flex: 1, marginLeft: SPACING.lg }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}>
                      {partner.name ?? ''}
                    </Text>
                    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText }}>
                      {partner.partner_role}
                    </Text>
                  </View>

                  {/* Status dot */}
                  <View style={{
                    width: 12, height: 12, borderRadius: 9999,
                    backgroundColor: STATUS_DOT_COLORS[statusDot],
                  }} />
                </View>

                {/* ── 2. Alert Banners (undismissed only) ── */}
                {(partner.alerts ?? []).filter(a => !a.dismissed_at && !dismissedAlertIds.includes(a.id)).map(alert => {
                  const isRateLock = alert.alert_type === 'rate_lock_expiry';
                  const rl = isRateLock ? getRateLockDaysRemaining(alert.expires_at) : null;
                  const isDanger = rl !== null && rl <= RATE_LOCK_DANGER_THRESHOLD_DAYS;
                  const bgColor = isDanger ? COLORS.dangerBg : COLORS.mustHaveTileBg;
                  const borderColor = isDanger ? COLORS.dangerBorder : COLORS.warningAmber;
                  const textColor = isDanger ? COLORS.dangerText : COLORS.warningText;
                  const iconColor = isDanger ? COLORS.dangerText : COLORS.warningAmber;

                  return (
                    <View
                      key={alert.id}
                      style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: bgColor, borderRadius: 8,
                        borderWidth: 1, borderColor,
                        padding: SPACING.md, marginTop: SPACING.lg,
                      }}
                    >
                      <AlertIcon color={iconColor} />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: '400', color: textColor, marginLeft: SPACING.md }}>
                        {alert.message}
                      </Text>
                      <Pressable
                        onPress={() => {
                          setDismissedAlertIds(prev => [...prev, alert.id]);
                          dismissAlert.mutate({ alertId: alert.id, jobId: deal.job_id, transactionId: deal.transaction_id });
                        }}
                        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '500', color: textColor }}>Got it</Text>
                      </Pressable>
                    </View>
                  );
                })}

                {/* ── 3. Progress Bar ── */}
                <View style={{ marginTop: SPACING.xl }}>
                  <View style={{ height: 4, borderRadius: 9999, backgroundColor: COLORS.border }}>
                    <View style={{
                      height: 4, borderRadius: 9999,
                      backgroundColor: COLORS.primary,
                      width: `${Math.round(progressPct * 100)}%`,
                    }} />
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, marginTop: 4 }}>
                    {completedCount} of {totalCount} complete
                  </Text>
                </View>

                {/* ── 4. Milestone List ── */}
                {/* READ-ONLY VIEW — agent cannot tap or modify milestones */}
                {/* Partner updates milestones via their own deal card (ActiveDealCard.tsx) */}
                {/* Realtime subscription refreshes this view automatically */}
                <View style={{ marginTop: SPACING.lg }}>
                  <Text style={{
                    fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
                    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.lg,
                  }}>
                    Updated by {partner.name ?? ''}
                  </Text>

                  {(partner.milestones ?? [])
                    .slice()
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map(ms => {
                      const isStale = ms.status === 'in_progress' && isMilestoneStale(ms, partner.partner_role);
                      const staleDays = isStale ? getStaleDays(ms) : 0;

                      const statusIcon = ms.status === 'complete'
                        ? <CheckCircleIcon color={COLORS.successGreen} />
                        : ms.status === 'in_progress'
                          ? <InProgressIcon color={COLORS.primary} />
                          : <PendingIcon />;

                      return (
                        <View
                          key={ms.id}
                          accessibilityRole="none"
                          style={{
                            flexDirection: 'row', alignItems: 'center',
                            paddingVertical: 10,
                            borderBottomWidth: 0.5, borderBottomColor: COLORS.cardBorder,
                          }}
                        >
                          {statusIcon}
                          <Text style={{
                            flex: 1, fontSize: 14,
                            fontWeight: ms.status === 'complete' ? '400' : '500',
                            color: isStale ? COLORS.warningAmber : COLORS.darkText,
                            marginLeft: SPACING.lg,
                          }}>
                            {ms.milestone_label ?? ms.milestone_key}
                          </Text>
                          {isStale && (
                            <View style={{
                              backgroundColor: COLORS.mustHaveTileBg,
                              borderRadius: DIMENSIONS.pillRadius,
                              paddingHorizontal: 6, paddingVertical: 2,
                            }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.warningAmber }}>
                                {staleDays}d
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                </View>
              </View>
            </React.Fragment>
          );
        })}

        {/* ── Closing Day Details Section ── */}
        <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 20, marginHorizontal: 16 }} />
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {/* Section header */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.lg }}>
            <Text style={{
              flex: 1,
              fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Closing day details
            </Text>
            {closingDetails && !isEditingClosingDetails && (
              <Pressable
                onPress={() => {
                  setClosingForm(closingDetails);
                  setIsEditingClosingDetails(true);
                }}
                style={{ flexShrink: 0, width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' }}
              >
                <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '400', color: COLORS.primary }}>Edit</Text>
              </Pressable>
            )}
            {isEditingClosingDetails && (
              <Pressable
                onPress={() => setIsEditingClosingDetails(false)}
                style={{ minWidth: 52, height: 44, alignItems: 'flex-end', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.primary }}>Cancel</Text>
              </Pressable>
            )}
          </View>

          {/* State A — Empty */}
          {/* @demo Empty state — replace with populated state when closing_details is set */}
          {/* @backend Visible until agent saves closing details via useUpdateClosingDetails */}
          {!closingDetails && !isEditingClosingDetails && (
            <View style={{
              backgroundColor: COLORS.backgroundInfo,
              borderLeftWidth: 3,
              borderLeftColor: COLORS.primary,
              borderRadius: 0,
              borderTopRightRadius: 10,
              borderBottomRightRadius: 10,
              padding: 12,
              paddingLeft: 14,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.infoText, marginBottom: 3 }}>
                Your client will see this
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.infoText, lineHeight: 20, marginBottom: 10 }}>
                Add time, location, and what to bring. Shown on their Client Tracker page.
              </Text>
              <Pressable
                onPress={handleOpenClosingForm}
                style={({ pressed }) => ({
                  backgroundColor: COLORS.primary,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  alignSelf: 'flex-start',
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.background }}>+ Add details</Text>
              </Pressable>
            </View>
          )}

          {/* State B — Inline form */}
          {isEditingClosingDetails && (
            <View style={{ gap: SPACING.xl }}>
              {/* @backend rpc_update_closing_details({ p_transaction_id, p_time, p_location, p_bring_list, p_wire_amount }) */}
              <FormField
                label="Date & time"
                value={closingForm.time}
                onChangeText={(text) => setClosingForm(prev => ({ ...prev, time: text }))}
                placeholder="April 15 at 10:00 AM"
              />

              <FormField
                label="Location"
                value={closingForm.location}
                onChangeText={(text) => setClosingForm(prev => ({ ...prev, location: text }))}
                placeholder="Title company address"
              />

              <FormField
                label="What to bring"
                value={closingForm.bring_list}
                onChangeText={(text) => setClosingForm(prev => ({ ...prev, bring_list: text }))}
                placeholder="Government-issued ID, cashier's check or wire confirmation"
              />

              <FormField
                label="Wire amount"
                value={closingForm.wire_amount}
                onChangeText={(text) => setClosingForm(prev => ({ ...prev, wire_amount: text }))}
                placeholder="$0"
                keyboardType="numeric"
              />

              <PrimaryButton
                label="Save details"
                onPress={handleSaveClosingDetails}
                loading={updateClosingDetails.isPending}
                disabled={!closingForm.time.trim()}
              />
            </View>
          )}

          {/* State C — Populated (read-only) */}
          {closingDetails && !isEditingClosingDetails && (
            <View style={{ gap: SPACING.md }}>
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, minWidth: 64 }}>When</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, flex: 1 }}>{closingDetails.time}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, minWidth: 64 }}>Where</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, flex: 1 }}>{closingDetails.location}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, minWidth: 64 }}>Bring</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, flex: 1 }}>{closingDetails.bring_list}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, minWidth: 64 }}>Wire</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, flex: 1 }}>
                  {closingDetails.wire_amount}
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText }}> (confirm with your agent)</Text>
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* ── Notify Client via SMS (optional) ── */}
        {/* @backend rpc_generate_client_token(p_transaction_id, p_notify_phone) — re-calls with phone to trigger SMS */}
        {/* Only visible after client token has been generated via Share button */}
        {generatedUrl && (
          <>
            <View style={{ height: 1, backgroundColor: COLORS.border, marginVertical: 20, marginHorizontal: 16 }} />
            <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
              <Text style={{
                fontSize: 12, fontWeight: '600', color: COLORS.secondaryText,
                textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: SPACING.lg,
              }}>
                Notify client via SMS (optional)
              </Text>

              {smsSent ? (
                <View style={{
                  backgroundColor: COLORS.feeBg,
                  borderRadius: 10,
                  padding: 12,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.feeText }}>
                    SMS sent to {notifyPhone}
                  </Text>
                </View>
              ) : (
                <KeyboardAvoidingView
                  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                  <View style={{ gap: SPACING.lg }}>
                    <TextInput
                      value={notifyPhone}
                      onChangeText={setNotifyPhone}
                      placeholder="(555) 123-4567"
                      placeholderTextColor={COLORS.secondaryText}
                      keyboardType="phone-pad"
                      style={{
                        height: DIMENSIONS.formInputHeight,
                        borderWidth: DIMENSIONS.cardBorderWidth,
                        borderColor: notifyPhone ? COLORS.inputActiveBorder : COLORS.border,
                        borderRadius: DIMENSIONS.inputRadius,
                        backgroundColor: COLORS.inputBackground,
                        paddingHorizontal: 14,
                        fontSize: 15,
                        fontWeight: '400',
                        color: COLORS.darkText,
                      }}
                    />
                    {notifyPhone.trim().length > 0 && (
                      <PrimaryButton
                        label="Send SMS"
                        onPress={handleSendSms}
                        loading={generateToken.isPending}
                      />
                    )}
                  </View>
                </KeyboardAvoidingView>
              )}
            </View>
          </>
        )}

        {/* ─────────────────────────────────────────────────────────────
            MARK DEAL CLOSED — CELEBRATION CTA (S123)
            Gated behind DEAL_CREATION_ENABLED flag.
            Fires haptic + navigates to DealClosedCelebrationScreen.
            This is a NEW button — does NOT replace existing close/cancel lifecycle actions.
            @demo CTA hidden behind DEAL_CREATION_ENABLED flag
            Remove flag gate when rpc_mark_deal_closed is deployed and flow is live
            ───────────────────────────────────────────────────────────── */}
        {DEAL_CREATION_ENABLED && deal && deal.status !== 'closed' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 20 }} />
            <PrimaryButton
              label="Mark Deal Closed 🏆"
              onPress={handleMarkDealClosed}
            />
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────
            DEAL LIFECYCLE ACTIONS
            Only shown when deal.status === 'active' (or undefined for cached data)
            Close: marks deal as successfully sold — removes from active pipeline
            Cancel: marks deal as fallen through — removes from active pipeline
            Both actions require native Alert confirmation before firing
            Both invalidate agent_deals + agent_active_deals on success
            ───────────────────────────────────────────────────────────── */}
        {deal && (deal.status === 'active' || deal.status === undefined) && transactionId && (
          <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24 }}>
            <View style={{ height: 1, backgroundColor: COLORS.border, marginBottom: 16 }} />
            <SecondaryButton
              label="Mark as Closed"
              onPress={handleCloseDeal}
              disabled={isLifecyclePending}
              loading={closeTransaction.isPending}
            />
            <View style={{ height: 8 }} />
            <DangerButton
              label="Cancel Deal"
              onPress={handleCancelDeal}
              disabled={isLifecyclePending}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AgentDealDetailScreen;
