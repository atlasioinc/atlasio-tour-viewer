// ConfirmationModal.tsx
// ═══════════════════════════════════════════════════════════════
// Shared Confirmation Modal (196 lines)
//
// Reusable success/confirmation dialog used across all flows:
//   PostJobWizard, InviteToJobModal, RequestConnect, etc.
//
// DESIGN SPEC (from Figma):
//   Overlay: rgba(0,0,0,0.5)
//   Card: maxWidth 360, p24, r16, gap 20
//   Shadow: offset(0,20), opacity 0.1, radius 25, elevation 10
//   Icon: 64px circle, COLORS.primary bg, white SVG (32×32)
//   Title: 20/600/#1C1C1E, lh30
//   Subtitle: 16/400/#666666, lh24
//   Body: 14/400/#666666, lh22.75, px2
//   Primary CTA: 48h, r8, COLORS.primary bg, 14/500/white
//   Outline CTA: 48h, r8, 1.35px #D1D5DC border, 14/500/COLORS.primary
//
// USAGE:
//   <ConfirmationModal
//     visible={showConfirm}
//     icon={<MySvgIcon />}
//     title="Job Posted Successfully!"
//     subtitle={`"${jobTitle}" is now live`}
//     body="Contractors matching the selected trades will start bidding..."
//     primaryLabel="View Job"
//     onPrimary={() => navigateToJob()}
//     secondaryLabel="Back to Home"
//     onSecondary={() => goBack()}
//     onClose={() => setShowConfirm(false)}
//   />
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────

interface ConfirmationModalProps {
  /** Controls visibility */
  visible: boolean;

  /** 32×32 white SVG icon rendered inside the 64px blue circle */
  icon: React.ReactNode;

  /** Large heading — e.g. "Job Posted Successfully!" */
  title: string;

  /** Smaller context line — e.g. '"Kitchen Reno" is now live' */
  subtitle?: string;

  /** Longer explanation paragraph */
  body?: string;

  /** Primary (filled) button label — e.g. "View Job" */
  primaryLabel: string;

  /** Primary button handler */
  onPrimary: () => void;

  /** Outline button label — e.g. "Back to Home", "Done" */
  secondaryLabel?: string;

  /** Outline button handler (defaults to onClose if not provided) */
  onSecondary?: () => void;

  /** Called on overlay tap and Android back — should hide the modal */
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  icon,
  title,
  subtitle,
  body,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onClose,
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable
      style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
      }}
      onPress={onClose}
    >
      {/* Card — stop propagation so tapping inside doesn't dismiss */}
      <Pressable
        onPress={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 360,
          padding: 24,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          gap: 20,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.1,
          shadowRadius: 25,
          elevation: 10,
        }}
      >
        {/* ── Icon — 64px blue circle ── */}
        <View style={{ alignSelf: 'flex-start' }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 9999,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
        </View>

        {/* ── Text Content ── */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: '#1C1C1E', fontSize: 20, fontWeight: '600', lineHeight: 30 }}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={{ color: '#666666', fontSize: 16, fontWeight: '400', lineHeight: 24 }}>
              {subtitle}
            </Text>
          ) : null}
          {body ? (
            <Text style={{ color: '#666666', fontSize: 14, fontWeight: '400', lineHeight: 22.75, paddingHorizontal: 2 }}>
              {body}
            </Text>
          ) : null}
        </View>

        {/* ── Actions ── */}
        <View style={{ gap: 12 }}>
          {/* Primary — filled */}
          <Pressable
            onPress={onPrimary}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 8,
              backgroundColor: COLORS.primary,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '500', lineHeight: 20, textAlign: 'center' }}>
              {primaryLabel}
            </Text>
          </Pressable>

          {/* Secondary — outline (optional) */}
          {secondaryLabel ? (
            <Pressable
              onPress={onSecondary ?? onClose}
              style={({ pressed }) => ({
                height: 48,
                borderRadius: 8,
                backgroundColor: '#FFFFFF',
                borderWidth: 1.35,
                borderColor: '#D1D5DC',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '500', lineHeight: 20, textAlign: 'center' }}>
                {secondaryLabel}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);

export default ConfirmationModal;
