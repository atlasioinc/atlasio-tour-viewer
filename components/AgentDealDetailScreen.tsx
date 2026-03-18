// AgentDealDetailScreen.tsx
// ═══════════════════════════════════════════════════════════════
// Agent Deal Detail — Read-only milestone board per deal (S63)
// Who: Agent role — views partner milestone progress + alerts
// Where: HomeStack → AgentDealDetail (push from Active Deals section)
//
// READ-ONLY VIEW — agent cannot tap or modify milestones.
// Partner updates milestones via their own deal card (ActiveDealCard.tsx).
// Realtime subscription refreshes this view automatically.
//
// @demo mock data from useAgentActiveDeals (hooks/useData.ts)
// @backend rpc_get_deal_board_for_agent — params: { p_agent_id: auth.uid() }
// NOTE: will migrate to transaction_id in S64 when transactions table exists
// ═══════════════════════════════════════════════════════════════

// STATE FLOW:
// route.params.jobId → find deal from useAgentActiveDeals cache
// useRealtimeDealBoard(jobId) → live refresh via Supabase channels
// per partner: milestones + alerts → progress bar + milestone list + alert banners
// dismiss alert → useAgentDismissDealAlert mutation (optimistic)

import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle } from 'react-native-svg';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from './HomeStack';
import { ScreenHeader } from './ScreenHeader';
import { COLORS, DIMENSIONS, SPACING } from '../lib/tokens';
import { useAgentActiveDeals, useAgentDismissDealAlert, useRealtimeDealBoard, useUpdateClosingDetails, useGenerateClientToken } from '../hooks/useData';
import { PrimaryButton } from './Button';
import { isMilestoneStale, getRateLockDaysRemaining, RATE_LOCK_DANGER_THRESHOLD_DAYS } from '../features/partners/lib/dealMilestones';
import type { AgentDealPartner, PartnerRole } from '../features/partners/types/partner.types';

// ─── Status Dot Calculation ───────────────────────────────────
// Priority: red > amber > green > gray
// Used on partner header row (12px dot)

function getSlotStatusDot(
  partner: AgentDealPartner,
  role: PartnerRole,
): 'red' | 'amber' | 'green' | 'gray' {
  if (!partner.milestones.length) return 'gray';
  const hasAlert = partner.alerts.some(a => !a.dismissed_at);
  if (hasAlert) return 'red';
  const hasStale = partner.milestones.some(m => isMilestoneStale(m, role));
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

// ─── Helpers ──────────────────────────────────────────────────

function formatClosingDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
  const navigation = useNavigation();
  const { jobId } = route.params;

  // ── Data ──
  const { data: allDeals } = useAgentActiveDeals();
  const deal = allDeals?.find(d => d.job_id === jobId);
  const dismissAlert = useAgentDismissDealAlert();

  // ── Share button ──
  // @demo Uses mock transaction_id — wire to real deal.transaction_id when DEAL_CREATION_ENABLED=true
  // @backend useGenerateClientToken — rpc_generate_client_token(p_transaction_id)
  const generateToken = useGenerateClientToken();

  const handleShare = async () => {
    try {
      const result = await generateToken.mutateAsync({
        transactionId: (deal as any).transaction_id ?? 'mock-transaction-001',
      });
      await Share.share({
        url: result.url,
        message: 'Track your closing progress: ' + result.url,
      });
    } catch {
      // silently fail in demo — live error handling in production
    }
  };

  // ── Closing day details ──
  // @demo Uses mock transaction_id — wire to real deal.transaction_id when DEAL_CREATION_ENABLED=true
  // @backend useUpdateClosingDetails — rpc_update_closing_details(p_transaction_id, p_closing_details)
  const updateClosingDetails = useUpdateClosingDetails();
  const [closingDetails, setClosingDetails] = useState<{ time: string; location: string; bring_list: string; wire_amount: string } | null>(null);
  const [isEditingClosingDetails, setIsEditingClosingDetails] = useState(false);
  const [closingForm, setClosingForm] = useState({
    time: '',
    location: '',
    bring_list: 'Government-issued ID, cashier\'s check or wire confirmation',
    wire_amount: '',
  });

  const handleSaveClosingDetails = () => {
    // @demo Mock save — wire to real transaction_id when DEAL_CREATION_ENABLED=true
    // @backend useUpdateClosingDetails — rpc_update_closing_details(p_transaction_id, p_closing_details)
    const transactionId = 'mock-transaction-001';
    updateClosingDetails.mutate(
      { transactionId, closingDetails: closingForm },
      {
        onSuccess: () => {
          setClosingDetails(closingForm);
          setIsEditingClosingDetails(false);
        },
      },
    );
  };

  // ── Realtime subscription (refreshes cache on milestone/alert changes) ──
  useRealtimeDealBoard(jobId);

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {/* @demo Uses mock transaction_id — wire to real deal.transaction_id when DEAL_CREATION_ENABLED=true */}
            {/* @backend useGenerateClientToken — rpc_generate_client_token(p_transaction_id) */}
            <Pressable
              onPress={handleShare}
              disabled={generateToken.isPending}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: generateToken.isPending ? 0.5 : 1 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.primary }}>Share</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 9999, backgroundColor: COLORS.successGreen }} />
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.successGreen }}>Live</Text>
            </View>
          </View>
        }
        onBack={() => navigation.goBack()}
      />

      {/* Closing date subtitle — below header */}
      {closingDateLabel ? (
        <View style={{ paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: DIMENSIONS.headerBorderWidth, borderBottomColor: COLORS.border }}>
          <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, textAlign: 'center' }}>
            Closing {closingDateLabel}
          </Text>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.screenBg }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16 }}
      >
        {deal.partners.map((partner, index) => {
          const statusDot = getSlotStatusDot(partner, partner.partner_role);
          const completedCount = partner.milestones.filter(m => m.status === 'complete').length;
          const totalCount = partner.milestones.length;
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
                  {/* Avatar */}
                  <View style={{
                    width: 36, height: 36, borderRadius: 9999,
                    backgroundColor: partner.partner_avatar_color,
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#FFFFFF' }}>
                      {partner.partner_name.charAt(0)}
                    </Text>
                  </View>

                  {/* Name + role */}
                  <View style={{ flex: 1, marginLeft: SPACING.lg }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}>
                      {partner.partner_name}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '400', color: COLORS.secondaryText }}>
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
                {partner.alerts.filter(a => !a.dismissed_at).map(alert => {
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
                        onPress={() => dismissAlert.mutate({ alertId: alert.id, jobId: deal.job_id })}
                        style={{ height: 36, paddingHorizontal: 12, justifyContent: 'center' }}
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
                    Updated by {partner.partner_name}
                  </Text>

                  {partner.milestones
                    .slice()
                    .sort((a, b) => a.sort_order - b.sort_order)
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
                            {ms.milestone_label}
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
                style={{ width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.primary }}>Edit</Text>
              </Pressable>
            )}
            {isEditingClosingDetails && (
              <Pressable
                onPress={() => setIsEditingClosingDetails(false)}
                style={{ width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.primary }}>Cancel</Text>
              </Pressable>
            )}
          </View>

          {/* State A — Empty */}
          {!closingDetails && !isEditingClosingDetails && (
            <Pressable
              onPress={() => setIsEditingClosingDetails(true)}
              style={{ width: '100%', height: 44, justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.primary }}>
                Add details for your client
              </Text>
            </Pressable>
          )}

          {/* State B — Inline form */}
          {isEditingClosingDetails && (
            <View style={{ gap: SPACING.xl }}>
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: SPACING.md }}>
                  Date & time
                </Text>
                <TextInput
                  value={closingForm.time}
                  onChangeText={(text) => setClosingForm(prev => ({ ...prev, time: text }))}
                  placeholder="April 15 at 10:00 AM"
                  placeholderTextColor={COLORS.bodyText}
                  style={{
                    borderWidth: DIMENSIONS.cardBorderWidth,
                    borderColor: COLORS.border,
                    borderRadius: DIMENSIONS.inputRadius,
                    padding: 10,
                    paddingHorizontal: 12,
                    fontSize: 14,
                    color: COLORS.darkText,
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: SPACING.md }}>
                  Location
                </Text>
                <TextInput
                  value={closingForm.location}
                  onChangeText={(text) => setClosingForm(prev => ({ ...prev, location: text }))}
                  placeholder="Title company address"
                  placeholderTextColor={COLORS.bodyText}
                  style={{
                    borderWidth: DIMENSIONS.cardBorderWidth,
                    borderColor: COLORS.border,
                    borderRadius: DIMENSIONS.inputRadius,
                    padding: 10,
                    paddingHorizontal: 12,
                    fontSize: 14,
                    color: COLORS.darkText,
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: SPACING.md }}>
                  What to bring
                </Text>
                <TextInput
                  value={closingForm.bring_list}
                  onChangeText={(text) => setClosingForm(prev => ({ ...prev, bring_list: text }))}
                  placeholder="Government-issued ID, cashier's check or wire confirmation"
                  placeholderTextColor={COLORS.bodyText}
                  style={{
                    borderWidth: DIMENSIONS.cardBorderWidth,
                    borderColor: COLORS.border,
                    borderRadius: DIMENSIONS.inputRadius,
                    padding: 10,
                    paddingHorizontal: 12,
                    fontSize: 14,
                    color: COLORS.darkText,
                  }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, lineHeight: 20, marginBottom: SPACING.md }}>
                  Wire amount
                </Text>
                <TextInput
                  value={closingForm.wire_amount}
                  onChangeText={(text) => setClosingForm(prev => ({ ...prev, wire_amount: text }))}
                  placeholder="$0"
                  placeholderTextColor={COLORS.bodyText}
                  keyboardType="numeric"
                  style={{
                    borderWidth: DIMENSIONS.cardBorderWidth,
                    borderColor: COLORS.border,
                    borderRadius: DIMENSIONS.inputRadius,
                    padding: 10,
                    paddingHorizontal: 12,
                    fontSize: 14,
                    color: COLORS.darkText,
                  }}
                />
              </View>

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
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, minWidth: 64 }}>When</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, flex: 1 }}>{closingDetails.time}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, minWidth: 64 }}>Where</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, flex: 1 }}>{closingDetails.location}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, minWidth: 64 }}>Bring</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, flex: 1 }}>{closingDetails.bring_list}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, minWidth: 64 }}>Wire</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, flex: 1 }}>
                  {closingDetails.wire_amount}
                  <Text style={{ fontSize: 11, fontWeight: '400', color: COLORS.secondaryText }}> (confirm with your agent)</Text>
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AgentDealDetailScreen;
