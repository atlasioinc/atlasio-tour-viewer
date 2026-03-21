// VouchPromptModal.tsx
// ═══════════════════════════════════════════════════════════════
// Vouch Prompt Modal — Post-Completion Review + Vouch Flow (606 lines)
// Fires after agent confirms job completion (both sides see it).
//
// @demo  Console.log on submit, no actual persistence
// @backend TODO: rpc_create_review + rpc_create_vouch (conditional on 4+ stars)
//
// Features:
//   - 1–5 star rating (required, tappable)
//   - Optional comment (max 500 chars) with character counter
//   - Vouch checkbox appears at 4+ stars ("⭐ Vouch for [Name]")
//   - Anonymity checkbox (contractor reviewing agent only)
//   - Submit creates review row + optionally vouch row
//   - Skip CTA for "not now"
//
// Pattern: Bottom sheet overlay (animationType="none" + custom Animated)
// Matches: SquadSlotPicker, Add Another Role modal animation
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  Animated,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../lib/tokens';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface VouchPromptModalProps {
  visible: boolean;
  onClose: () => void;
  recipientName: string;
  recipientAvatar: { name: string; color: string };
  recipientRole: string;
  jobTitle: string;
  onSubmitVouch: (data: {
    rating: number;
    comment: string;
    tags: string[];
    isVouch: boolean;
    isAnonymous?: boolean;
  }) => void;
  showAnonymityOption?: boolean; // true when contractor reviewing agent
}

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CloseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 5L15 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
    <Path d="M15 5L5 15" stroke={COLORS.darkText} strokeWidth={1.67} strokeLinecap="round" />
  </Svg>
);

const StarRatingIcon: React.FC<{ filled: boolean; size?: number }> = ({
  filled,
  size = 32,
}) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <Path
      d="M16 2.67L20.18 11.13L29.47 12.49L22.73 19.05L24.36 28.29L16 23.87L7.64 28.29L9.27 19.05L2.53 12.49L11.82 11.13L16 2.67Z"
      fill={filled ? COLORS.starColor : 'transparent'}
      stroke={filled ? COLORS.starColor : COLORS.border}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CheckboxIcon: React.FC<{ checked: boolean }> = ({ checked }) => (
  <Svg width={22} height={22} viewBox="0 0 22 22" fill="none">
    {checked ? (
      <>
        <Path
          d="M3 5C3 3.9 3.9 3 5 3H17C18.1 3 19 3.9 19 5V17C19 18.1 18.1 19 17 19H5C3.9 19 3 18.1 3 17V5Z"
          fill={COLORS.primary}
          stroke={COLORS.primary}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M7 11L10 14L15 8"
          stroke="#FFFFFF"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ) : (
      <Path
        d="M3 5C3 3.9 3.9 3 5 3H17C18.1 3 19 3.9 19 5V17C19 18.1 18.1 19 17 19H5C3.9 19 3 18.1 3 17V5Z"
        stroke={COLORS.border}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

// ─────────────────────────────────────────────
// AVATAR PLACEHOLDER
// ─────────────────────────────────────────────

const AvatarPlaceholder: React.FC<{
  name: string;
  color: string;
  size?: number;
}> = ({ name, color, size = 56 }) => {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 9999,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.32, fontWeight: '600', color: '#FFFFFF' }}>
        {initials}
      </Text>
    </View>
  );
};

// ─────────────────────────────────────────────
// RATING LABELS
// ─────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Great',
  5: 'Excellent',
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const VouchPromptModal: React.FC<VouchPromptModalProps> = ({
  visible,
  onClose,
  recipientName,
  recipientAvatar,
  recipientRole,
  jobTitle,
  onSubmitVouch,
  showAnonymityOption = false,
}) => {
  // ── Animation state (matches SquadSlotPicker pattern) ──
  const [modalMounted, setModalMounted] = useState(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // ── Form state ──
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isVouch, setIsVouch] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Animation controller ──
  useEffect(() => {
    if (visible) {
      // Reset form on open
      setRating(0);
      setComment('');
      setIsVouch(false);
      setIsAnonymous(false);
      setIsSubmitting(false);

      setModalMounted(true);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 24,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalMounted) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalMounted(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- animated refs (backdropAnim, slideAnim) are stable
  }, [visible]);

  // ── Handlers ──

  const handleStarPress = useCallback(
    (starIndex: number) => {
      setRating(starIndex);
      // Auto-uncheck vouch if rating drops below 4
      if (starIndex < 4) {
        setIsVouch(false);
      }
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (rating === 0) return;

    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      onSubmitVouch({
        rating,
        comment: comment.trim(),
        tags: [], // MVP: no tags yet
        isVouch,
        isAnonymous: showAnonymityOption ? isAnonymous : undefined,
      });
      setIsSubmitting(false);
    }, 500);
  }, [rating, comment, isVouch, isAnonymous, showAnonymityOption, onSubmitVouch]);

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <Modal
      visible={modalMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop — fades in/out */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: COLORS.overlayDark,
          opacity: backdropAnim,
        }}
      >
        <Pressable onPress={onClose} style={{ flex: 1 }} />
      </Animated.View>

      {/* Sheet — slides up from bottom */}
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingBottom: Platform.OS === 'ios' ? 40 : 24,
              maxHeight: SCREEN_HEIGHT * 0.85,
            }}
          >
            {/* Handle bar */}
            <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
              <View
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: '#D1D5DC',
                }}
              />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {/* ── Header + Close ── */}
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  paddingHorizontal: 16,
                  paddingTop: 8,
                  paddingBottom: 20,
                }}
              >
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '600',
                      color: COLORS.darkText,
                      lineHeight: 28,
                    }}
                  >
                    How was your experience?
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '400',
                      color: COLORS.secondaryText,
                      lineHeight: 20,
                      marginTop: 2,
                    }}
                  >
                    {jobTitle}
                  </Text>
                </View>
                <Pressable
                  onPress={onClose}
                  hitSlop={12}
                  style={({ pressed }) => ({
                    width: 32,
                    height: 32,
                    borderRadius: 9999,
                    backgroundColor: '#F3F4F6',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <CloseIcon />
                </Pressable>
              </View>

              {/* ── Recipient info ── */}
              <View
                style={{
                  alignItems: 'center',
                  paddingBottom: 20,
                  gap: 8,
                }}
              >
                <AvatarPlaceholder
                  name={recipientAvatar.name}
                  color={recipientAvatar.color}
                  size={64}
                />
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: COLORS.darkText,
                      lineHeight: 24,
                    }}
                  >
                    {recipientName}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '400',
                      color: COLORS.secondaryText,
                      lineHeight: 18,
                    }}
                  >
                    {recipientRole}
                  </Text>
                </View>
              </View>

              {/* ── Star Rating ── */}
              <View style={{ alignItems: 'center', paddingBottom: 20, gap: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Pressable
                      key={star}
                      onPress={() => handleStarPress(star)}
                      hitSlop={4}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <StarRatingIcon filled={star <= rating} size={40} />
                    </Pressable>
                  ))}
                </View>
                {rating > 0 && (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '500',
                      color:
                        rating >= 4
                          ? COLORS.successGreen
                          : rating >= 3
                          ? COLORS.counterAmber
                          : COLORS.errorRed,
                      lineHeight: 20,
                    }}
                  >
                    {RATING_LABELS[rating]}
                  </Text>
                )}
              </View>

              {/* ── Vouch Checkbox (appears at 4+ stars) ── */}
              {rating >= 4 && (
                <Pressable
                  onPress={() => setIsVouch(!isVouch)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginHorizontal: 16,
                    marginBottom: 16,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: isVouch ? '#F0FDF4' : COLORS.tagBg,
                    borderRadius: 10,
                    borderWidth: 0.68,
                    borderColor: isVouch ? '#BBF7D0' : COLORS.cardBorder,
                    gap: 10,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <CheckboxIcon checked={isVouch} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: COLORS.darkText, lineHeight: 20 }}>
                      ⭐ Vouch for {recipientName.split(' ')[0]}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 16, marginTop: 1 }}>
                      Vouches appear on their profile and boost their visibility
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* ── Comment ── */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: COLORS.darkText,
                    lineHeight: 20,
                    marginBottom: 8,
                  }}
                >
                  Comments{' '}
                  <Text style={{ fontWeight: '400', color: COLORS.lightText }}>
                    (optional)
                  </Text>
                </Text>
                <View
                  style={{
                    backgroundColor: '#F9FAFB',
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: COLORS.inputBorder,
                    padding: 12,
                  }}
                >
                  <TextInput
                    value={comment}
                    onChangeText={setComment}
                    placeholder={`Share your experience working with ${recipientName.split(' ')[0]}...`}
                    placeholderTextColor={COLORS.lightText}
                    multiline
                    textAlignVertical="top"
                    maxLength={500}
                    style={{
                      fontSize: 14,
                      fontWeight: '400',
                      color: COLORS.darkText,
                      lineHeight: 22,
                      minHeight: 72,
                      padding: 0,
                    }}
                  />
                </View>
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '400',
                    color: COLORS.lightText,
                    lineHeight: 16,
                    textAlign: 'right',
                    marginTop: 4,
                  }}
                >
                  {comment.length}/500
                </Text>
              </View>

              {/* ── Anonymity Checkbox (contractor → agent only) ── */}
              {showAnonymityOption && (
                <Pressable
                  onPress={() => setIsAnonymous(!isAnonymous)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginHorizontal: 16,
                    marginBottom: 16,
                    gap: 10,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <CheckboxIcon checked={isAnonymous} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.bodyText, lineHeight: 20 }}>
                      Submit anonymously
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.lightText, lineHeight: 16 }}>
                      Your name won{"'"}t be shown on this review
                    </Text>
                  </View>
                </Pressable>
              )}

              {/* ── CTAs ── */}
              <View style={{ paddingHorizontal: 16, gap: 10 }}>
                <Pressable
                  onPress={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  style={({ pressed }) => ({
                    height: 48,
                    backgroundColor: rating > 0 ? COLORS.primary : '#A0AEC0',
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed && rating > 0 && !isSubmitting ? 0.85 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 }}>
                    {isSubmitting
                      ? 'Submitting...'
                      : isVouch
                      ? 'Submit Review & Vouch'
                      : 'Submit Review'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleSkip}
                  disabled={isSubmitting}
                  style={({ pressed }) => ({
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.5 : 1,
                  })}
                >
                  <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20 }}>
                    Maybe Later
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default VouchPromptModal;
