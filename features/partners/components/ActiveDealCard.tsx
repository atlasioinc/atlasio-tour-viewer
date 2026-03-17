// features/partners/components/ActiveDealCard.tsx
// What: Expandable deal card with milestone progress, alerts, and alert composer
// Who: Partner role users — renders milestone data per partner_role
// Where: Used by HomeTabPartner (Needs Attention section) and PartnerDealsScreen (full pipeline)
// Role branching: alertTypes controlled by parent via ALERT_TYPES_BY_ROLE[partnerRole]
// @demo PARTNER_TRACK_ENABLED must be false before any commit

// STATE FLOW:
// deal.alerts → rateLockAlert → daysRemaining → isUrgent → left border color + banner variant
// deal.milestones → completedCount / totalCount → progress bar
// onMilestoneTap → cycles pending → in_progress → complete (optimistic)
// composerOpen → alertType selection → message input → onPostAlert callback
// onDismissAlert → removes alert banner optimistically

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { COLORS, DIMENSIONS, SPACING } from '../../../lib/tokens';
import { getRateLockDaysRemaining, RATE_LOCK_DANGER_THRESHOLD_DAYS } from '../lib/dealMilestones';
import { ALERT_TYPES_BY_ROLE } from '../lib/dealMilestones';
import type { PartnerActiveDeal, PartnerRole, MilestoneStatus, AlertType, AlertTypeConfig } from '../types/partner.types';

// ─────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────

interface ActiveDealCardProps {
  deal: PartnerActiveDeal;
  partnerRole: PartnerRole;
  onMilestoneTap: (milestoneId: string, currentStatus: MilestoneStatus) => void;
  onPostAlert: (jobId: string, alertType: AlertType, message: string, expiresAt: string | null) => void;
  onDismissAlert: (alertId: string) => void;
}

// ─────────────────────────────────────────────────────────────────
// STATUS ICONS
// ─────────────────────────────────────────────────────────────────

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
    <Circle cx={12} cy={12} r={10} stroke={COLORS.border} strokeWidth={2} />
  </Svg>
);

const AlertIcon: React.FC<{ color: string }> = ({ color }) => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
    <Path d="M12 9V13M12 17H12.01M4.93 19H19.07C20.4 19 21.24 17.56 20.58 16.41L13.5 3.57C12.84 2.43 11.16 2.43 10.5 3.57L3.42 16.41C2.76 17.56 3.6 19 4.93 19Z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DismissIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6L18 18" stroke={COLORS.secondaryText} strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

/** Cycles milestone status: pending → in_progress → complete */
function getNextStatus(current: MilestoneStatus): MilestoneStatus {
  switch (current) {
    case 'pending': return 'in_progress';
    case 'in_progress': return 'complete';
    case 'complete': return 'pending';
  }
}

function formatClosingDate(dateStr: string | null): string {
  if (!dateStr) return 'No closing date';
  const date = new Date(dateStr);
  const now = new Date();
  const daysUntil = Math.ceil((date.getTime() - now.getTime()) / 86400000);
  const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (daysUntil <= 14) return `Closing ${formatted} (${daysUntil}d)`;
  return `Closing ${formatted}`;
}

// ─────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────

const ActiveDealCard: React.FC<ActiveDealCardProps> = ({
  deal,
  partnerRole,
  onMilestoneTap,
  onPostAlert,
  onDismissAlert,
}) => {
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedAlertType, setSelectedAlertType] = useState<AlertTypeConfig | null>(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertExpiryDate, setAlertExpiryDate] = useState('');

  // ── Rate lock escalation logic ──
  // @demo Rate lock countdown is client-side only — reads expires_at from DealAlert
  // In production: recalculate on every render, getRateLockDaysRemaining() in dealMilestones.ts
  const rateLockAlert = deal.alerts.find(a => a.alert_type === 'rate_lock_expiry' && !a.dismissed_at);
  const daysRemaining = rateLockAlert ? getRateLockDaysRemaining(rateLockAlert.expires_at) : null;
  const isUrgent = daysRemaining !== null && daysRemaining <= RATE_LOCK_DANGER_THRESHOLD_DAYS;

  // ── Left border color ──
  // Danger: rate lock urgent. Warning: any alert or stale milestone. Default: neutral
  const hasAnyAlert = deal.alerts.length > 0;
  const leftBorderColor = isUrgent
    ? COLORS.dangerText
    : hasAnyAlert
      ? COLORS.warningAmber
      : COLORS.border;
  const leftBorderWidth = isUrgent || hasAnyAlert ? 3 : 0.5;

  // ── Progress ──
  const completedCount = deal.milestones.filter(m => m.status === 'complete').length;
  const totalCount = deal.milestones.length;
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0;

  // ── Alert types for composer ──
  const alertTypes = ALERT_TYPES_BY_ROLE[partnerRole] ?? [];

  const handleSendAlert = () => {
    if (!selectedAlertType || !alertMessage.trim()) return;
    const expiresAt = selectedAlertType.requiresDate && alertExpiryDate
      ? new Date(alertExpiryDate).toISOString()
      : null;
    onPostAlert(deal.job_id, selectedAlertType.type, alertMessage.trim(), expiresAt);
    // Reset composer
    setComposerOpen(false);
    setSelectedAlertType(null);
    setAlertMessage('');
    setAlertExpiryDate('');
  };

  return (
    <View
      style={{
        borderRadius: DIMENSIONS.cardRadius,
        borderWidth: DIMENSIONS.cardBorderWidth,
        borderColor: COLORS.cardBorder,
        borderLeftWidth: leftBorderWidth,
        borderLeftColor: leftBorderColor,
        backgroundColor: COLORS.background,
        marginBottom: SPACING.lg,
        overflow: 'hidden',
      }}
    >
      {/* ── Card Header ── */}
      <View style={{ padding: SPACING.xl }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: SPACING.md }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.darkText }}>{deal.address}</Text>
            <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, marginTop: 2 }}>
              {deal.agent_name} {'\u00B7'} {formatClosingDate(deal.closing_date)}
            </Text>
          </View>

          {/* Rate lock countdown badge — only when urgent */}
          {isUrgent && daysRemaining !== null && (
            <View style={{
              backgroundColor: COLORS.dangerBg,
              borderRadius: DIMENSIONS.pillRadius,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: COLORS.dangerBorder,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.dangerText }}>
                {daysRemaining <= 0 ? 'Expired' : `${daysRemaining}d left`}
              </Text>
            </View>
          )}
        </View>

        {/* ── Alert Banners ── */}
        {deal.alerts.map(alert => {
          const isRateLock = alert.alert_type === 'rate_lock_expiry';
          const rl = isRateLock ? getRateLockDaysRemaining(alert.expires_at) : null;
          const bannerIsUrgent = rl !== null && rl <= RATE_LOCK_DANGER_THRESHOLD_DAYS;
          const bgColor = bannerIsUrgent ? COLORS.dangerBg : COLORS.mustHaveTileBg;
          const borderColor = bannerIsUrgent ? COLORS.dangerBorder : COLORS.warningAmber;
          const textColor = bannerIsUrgent ? COLORS.dangerText : COLORS.warningText;
          const iconColor = bannerIsUrgent ? COLORS.dangerText : COLORS.warningAmber;

          return (
            <View
              key={alert.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: bgColor,
                borderRadius: 8,
                borderWidth: 1,
                borderColor,
                padding: SPACING.md,
                marginTop: SPACING.md,
              }}
            >
              <AlertIcon color={iconColor} />
              <Text style={{ flex: 1, fontSize: 14, fontWeight: '400', color: textColor, marginLeft: SPACING.md }}>
                {alert.message}
              </Text>
              <Pressable
                onPress={() => onDismissAlert(alert.id)}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <DismissIcon />
              </Pressable>
            </View>
          );
        })}

        {/* ── Progress Bar ── */}
        <View style={{ marginTop: SPACING.lg }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.secondaryText, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Progress
            </Text>
            <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.secondaryText }}>
              {completedCount}/{totalCount}
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: COLORS.chipBg }}>
            <View
              style={{
                height: 6,
                borderRadius: 3,
                backgroundColor: progressPct === 1 ? COLORS.scoreGreen : COLORS.accentBlue,
                width: `${Math.round(progressPct * 100)}%`,
              }}
            />
          </View>
        </View>
      </View>

      {/* ── Milestone List ── */}
      <View style={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.md }}>
        {deal.milestones
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map(ms => {
            const statusIcon = ms.status === 'complete'
              ? <CheckCircleIcon color={COLORS.scoreGreen} />
              : ms.status === 'in_progress'
                ? <InProgressIcon color={COLORS.warningAmber} />
                : <PendingIcon />;

            return (
              <Pressable
                key={ms.id}
                onPress={() => onMilestoneTap(ms.id, ms.status)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderBottomWidth: 0.5,
                  borderBottomColor: COLORS.cardBorder,
                }}
              >
                {statusIcon}
                <Text
                  style={{
                    flex: 1,
                    fontSize: 14,
                    fontWeight: ms.status === 'complete' ? '400' : '500',
                    color: ms.status === 'complete' ? COLORS.secondaryText : COLORS.darkText,
                    marginLeft: SPACING.lg,
                    textDecorationLine: ms.status === 'complete' ? 'line-through' : 'none',
                  }}
                >
                  {ms.milestone_label}
                </Text>
              </Pressable>
            );
          })}
      </View>

      {/* ── Post Alert Button ── */}
      {alertTypes.length > 0 && (
        <View style={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xl }}>
          <Pressable
            onPress={() => setComposerOpen(!composerOpen)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: COLORS.border,
              backgroundColor: COLORS.filterBg,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.accentBlue }}>
              {composerOpen ? 'Cancel' : '+ Post alert to agent'}
            </Text>
          </Pressable>

          {/* ── Alert Composer ── */}
          {composerOpen && (
            <View style={{ marginTop: SPACING.lg }}>
              {/* Alert type chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: SPACING.lg }}
              >
                {alertTypes.map(at => {
                  const isSelected = selectedAlertType?.type === at.type;
                  return (
                    <Pressable
                      key={at.type}
                      onPress={() => setSelectedAlertType(isSelected ? null : at)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: DIMENSIONS.pillRadius,
                        backgroundColor: isSelected ? COLORS.accentBlue : COLORS.chipBg,
                        marginRight: SPACING.md,
                      }}
                    >
                      <Text style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: isSelected ? COLORS.background : COLORS.darkText,
                      }}>
                        {at.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Date picker row — only for rate_lock_expiry */}
              {selectedAlertType?.requiresDate && (
                <View style={{ marginBottom: SPACING.lg }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText, marginBottom: SPACING.md }}>
                    Expiry date
                  </Text>
                  <TextInput
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={COLORS.bodyText}
                    value={alertExpiryDate}
                    onChangeText={setAlertExpiryDate}
                    style={{
                      height: 44,
                      borderWidth: 1,
                      borderColor: COLORS.inputBorder,
                      borderRadius: DIMENSIONS.inputRadius,
                      paddingHorizontal: SPACING.lg,
                      fontSize: 14,
                      color: COLORS.darkText,
                      backgroundColor: COLORS.filterBg,
                    }}
                  />
                </View>
              )}

              {/* Message textarea */}
              <View style={{ marginBottom: SPACING.lg }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText }}>
                    Message
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: alertMessage.length > 130 ? COLORS.warningAmber : COLORS.secondaryText }}>
                    {alertMessage.length}/140
                  </Text>
                </View>
                <TextInput
                  placeholder="Describe the alert..."
                  placeholderTextColor={COLORS.bodyText}
                  value={alertMessage}
                  onChangeText={(t) => setAlertMessage(t.slice(0, 140))}
                  multiline
                  numberOfLines={3}
                  style={{
                    minHeight: 80,
                    borderWidth: 1,
                    borderColor: COLORS.inputBorder,
                    borderRadius: DIMENSIONS.inputRadius,
                    padding: SPACING.lg,
                    fontSize: 14,
                    color: COLORS.darkText,
                    backgroundColor: COLORS.filterBg,
                    textAlignVertical: 'top',
                  }}
                />
              </View>

              {/* Cancel + Send buttons */}
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <Pressable
                  onPress={() => {
                    setComposerOpen(false);
                    setSelectedAlertType(null);
                    setAlertMessage('');
                    setAlertExpiryDate('');
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.secondaryText }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSendAlert}
                  disabled={!selectedAlertType || !alertMessage.trim()}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 8,
                    backgroundColor: selectedAlertType && alertMessage.trim() ? COLORS.accentBlue : COLORS.disabledBg,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: selectedAlertType && alertMessage.trim() ? COLORS.background : COLORS.disabledText,
                  }}>
                    Send
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

export default ActiveDealCard;
