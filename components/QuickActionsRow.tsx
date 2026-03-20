// QuickActionsRow.tsx
// ═══════════════════════════════════════════════════════════════
// Quick Actions — Horizontal scrollable row of 4 cards (308 lines)
// Surfaces high-frequency, time-sensitive decisions for agents.
//
// Cards:
//   1. 📸 Listing Photographer → PostPhotoJobScreen
//   2. 🪑 Stage to Sell → PostStagingJobScreen
//   3. 🔧 Get Repair Bids → PostJobWizard (existing)
//   4. 🏦 Fast-Close Lender → FindTab (pre-filtered: Mortgage Pro + Closing Speed)
//
// Architecture:
//   - Each card is a Pressable that navigates to the appropriate flow
//   - Cards 1–3 lead to job posting flows (bidding revenue)
//   - Card 4 leads to FindTab with pre-set filters via route params
//   - Starting prices are hardcoded Denver market averages for MVP
//     (wire to: MIN(profiles.base_price) WHERE role=X AND service_area='denver')
//   - Ratings are hardcoded (wire to: AVG(profiles.average_rating) WHERE role=X)
//
// Navigation:
//   - Cards 1–2: navigate within HomeStack (PostPhotoJobScreen, PostStagingJobScreen)
//   - Card 3: navigate within HomeStack (PostJobWizard — already exists)
//   - Card 4: cross-stack navigate to FindTab with params
//     Uses CommonActions.navigate (established pattern from InboxList → ProProfile)
//
// Dependencies: COLORS from lib/tokens.ts, react-native-svg for icons
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import Svg, { Path, Circle, Line } from 'react-native-svg';
import { useNavigation, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS, SHADOWS } from '../lib/tokens';
import { useVerificationGate } from '../hooks/useVerificationGate';

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

interface QuickActionCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  /** Accent color for the icon background circle */
  accentBg: string;
  /** Navigation action when card is tapped */
  onPress: () => void;
}

// ─────────────────────────────────────────────
// SVG ICONS — 20x20, stroke-based, consistent weight
// ─────────────────────────────────────────────

const CameraIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M3.33 6.67C3.33 5.75 4.08 5 5 5H6.18C6.58 5 6.95 4.79 7.15 4.45L7.85 3.22C8.05 2.88 8.42 2.67 8.82 2.67H11.18C11.58 2.67 11.95 2.88 12.15 3.22L12.85 4.45C13.05 4.79 13.42 5 13.82 5H15C15.92 5 16.67 5.75 16.67 6.67V14.17C16.67 15.08 15.92 15.83 15 15.83H5C4.08 15.83 3.33 15.08 3.33 14.17V6.67Z"
      stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
    <Circle cx={10} cy={10} r={2.5} stroke="#FFFFFF" strokeWidth={1.5} />
  </Svg>
);

const ChairIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M5 11.67V5C5 3.62 6.12 2.5 7.5 2.5H12.5C13.88 2.5 15 3.62 15 5V11.67" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M3.33 11.67H16.67V14.17C16.67 15.08 15.92 15.83 15 15.83H5C4.08 15.83 3.33 15.08 3.33 14.17V11.67Z" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    <Line x1={6.67} y1={15.83} x2={6.67} y2={17.5} stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
    <Line x1={13.33} y1={15.83} x2={13.33} y2={17.5} stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" />
  </Svg>
);

const WrenchIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M12.08 3.33C10.28 3.33 8.75 4.53 8.28 6.17C8.17 6.55 8.12 6.95 8.12 7.37C8.12 7.63 8.14 7.88 8.19 8.12L3.33 13.02V15.83H6.17L11.05 10.97C11.38 11.03 11.72 11.07 12.08 11.07C14.15 11.07 15.83 9.4 15.83 7.33C15.83 6.97 15.78 6.62 15.68 6.3L13.33 8.67L11.25 6.58L13.62 4.22C13.15 3.68 12.48 3.33 12.08 3.33Z"
      stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
    />
  </Svg>
);

const SpeedIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path d="M10 17.5C14.14 17.5 17.5 14.14 17.5 10C17.5 5.86 14.14 2.5 10 2.5C5.86 2.5 2.5 5.86 2.5 10C2.5 14.14 5.86 17.5 10 17.5Z" stroke="#FFFFFF" strokeWidth={1.5} />
    <Path d="M10 5V10L13.33 11.67" stroke="#FFFFFF" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StarMiniIcon: React.FC<{ color?: string }> = ({ color = '#FFB900' }) => (
  <Svg width={11} height={11} viewBox="0 0 11 11" fill="none">
    <Path
      d="M5.5 0.92L6.93 3.83L10.12 4.3L7.81 6.54L8.36 9.72L5.5 8.21L2.64 9.72L3.19 6.54L0.88 4.3L4.07 3.83L5.5 0.92Z"
      fill={color} stroke={color} strokeWidth={0.75}
    />
  </Svg>
);

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

const QuickActionsRow: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { canPostJob } = useVerificationGate();

  // ── Verification gate — blocks job posting for unverified users ──

  const gateJobPosting = (onAllow: () => void) => {
    if (canPostJob) {
      onAllow();
      return;
    }
    Alert.alert(
      'Verify your account to post jobs',
      'To protect our community, we require account verification before posting jobs. This helps ensure quality and trust.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Get Verified',
          onPress: () =>
            navigation.dispatch(
              CommonActions.navigate({ name: 'Profile', params: { screen: 'Verification' } }),
            ),
        },
      ],
    );
  };

  // ── Navigation handlers ──

  const handlePhotographerPress = () => {
    gateJobPosting(() => navigation.navigate('PostPhotoJobScreen'));
  };

  const handleStagingPress = () => {
    gateJobPosting(() => navigation.navigate('PostStagingJobScreen'));
  };

  const handleRepairPress = () => {
    gateJobPosting(() => navigation.navigate('PostJobWizard'));
  };

  const handleLenderPress = () => {
    // Cross-stack navigate: HomeStack → Find tab → FindMain with preset filters
    // Targets the bottom tab first, then passes params down to the screen
    navigation.dispatch(
      CommonActions.navigate({
        name: 'Find',
        params: {
          screen: 'FindMain',
          params: {
            presetRole: 'Mortgage Pro',
            presetFilters: ['close_21'],
            presetSort: 'Fastest Closing',
          },
        },
      })
    );
  };

  // ── Card definitions ──
  // 🔌 MVP: hardcoded Denver market averages
  // Wire to: useQuickActionStats() → queries MIN base_price + AVG rating per role in agent's service area

  const cards: QuickActionCard[] = [
    {
      id: 'photographer',
      icon: <CameraIcon />,
      title: 'Get Photo Bids',
      subtitle: 'From $129 · 4.8★',
      accentBg: '#1A6B3C', // Forest green — visual distinction from blue primary
      onPress: handlePhotographerPress,
    },
    {
      id: 'stager',
      icon: <ChairIcon />,
      title: 'Stage to Sell',
      subtitle: 'From $400 · 4.9★',
      accentBg: '#7C3AED', // Purple — warm creative energy
      onPress: handleStagingPress,
    },
    {
      id: 'repair',
      icon: <WrenchIcon />,
      title: 'Get Repair Bids',
      subtitle: 'Vetted pros · Fast bids',
      accentBg: COLORS.primary, // Brand blue — core revenue action
      onPress: handleRepairPress,
    },
    {
      id: 'lender',
      icon: <SpeedIcon />,
      title: 'Fast-Close Lender',
      subtitle: 'Find by close speed',
      accentBg: '#B45309', // Amber brown — urgency, financial
      onPress: handleLenderPress,
    },
  ];

  // ── Render ──

  return (
    <View style={{ marginTop: 20 }}>
      {/* Section header */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: COLORS.darkText,
          lineHeight: 24,
          paddingHorizontal: 16,
          marginBottom: 12,
        }}
      >
        Quick Actions
      </Text>

      {/* Horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingVertical: 4,
          gap: 12,
        }}
      >
        {cards.map((card) => (
          <Pressable
            key={card.id}
            onPress={card.onPress}
            style={({ pressed }) => ({
              width: 148,
              paddingVertical: 16,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: COLORS.background,
              borderWidth: 0.68,
              borderColor: '#F3F4F6',
              ...SHADOWS.card,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            {/* Icon circle */}
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: card.accentBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              {card.icon}
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: COLORS.darkText,
                lineHeight: 18,
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              {card.title}
            </Text>

            {/* Subtitle with inline star */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              {card.subtitle.includes('★') ? (
                <>
                  <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.bodyText, lineHeight: 16 }}>
                    {card.subtitle.replace(/★/g, '').trim()}
                  </Text>
                  <StarMiniIcon />
                </>
              ) : (
                <Text style={{ fontSize: 12, fontWeight: '400', color: COLORS.bodyText, lineHeight: 16 }}>
                  {card.subtitle}
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

export default QuickActionsRow;
