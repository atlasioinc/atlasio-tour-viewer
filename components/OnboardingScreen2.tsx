// OnboardingScreen2.tsx
// ═══════════════════════════════════════════════════════════════
// RETIRED — Route removed in Session 25, file preserved (453 lines)
// Originally Onboarding Screen 2 of 4 — "Connect Instantly"
// Replaced by OnboardingRoleSelect.tsx in the new 5/6-step flow
//
// @demo  Entire file is dead code — not in nav stack
// @backend none
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AnimatedProgressBar from './AnimatedProgressBar';

// ─────────────────────────────────────────────
// DESIGN TOKENS (same as Screen 1)
// ─────────────────────────────────────────────
const COLORS = {
  primary: '#003DC3',
  primaryEnd: '#0052FF',
  background: '#FFFFFF',
  cardBg: '#F7F7FC',
  bodyText: '#4A5565',
  stepText: '#6A7282',
  progressTrack: '#E5E7EB',
  iconGradientStart: '#E8F0FE',
  iconGradientEnd: '#C2DBFF',
} as const;

const FONTS = {
  logo: Platform.select({
    web: '"Radio Canada Big", "Inter", sans-serif',
    default: 'RadioCanadaBig-SemiBold',
  }),
} as const;

// ─────────────────────────────────────────────
// SVG ICONS — Screen 2 specific
// ─────────────────────────────────────────────

/** Key/link icon — hero section */
const ConnectIcon: React.FC = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    {/* Circle (key head) */}
    <Circle
      cx={27}
      cy={13}
      r={7}
      stroke={COLORS.primary}
      strokeWidth={3.33}
    />
    {/* Key shaft */}
    <Path
      d="M22 18L12 28"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
    />
    {/* Key teeth */}
    <Path
      d="M12 28L12 23"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
    />
    <Path
      d="M16 24L12 28"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
    />
  </Svg>
);

/** Shield icon — "Verified Pros" card */
const ShieldIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 1.67L3.33 5V10C3.33 14.17 6.22 18.02 10 18.33C13.78 18.02 16.67 14.17 16.67 10V5L10 1.67Z"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7 10L9 12L13 8"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Lightning bolt icon — "Direct Communication" card */
const LightningIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M11.25 1.67L3.33 11.67H10L9.17 18.33L17.08 8.33H10.42L11.25 1.67Z"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Star icon — "Top-Rated Quality" card */
const StarIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M10 1.67L12.47 7.17L18.33 7.73L13.83 11.73L15.18 17.5L10 14.4L4.82 17.5L6.17 11.73L1.67 7.73L7.53 7.17L10 1.67Z"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Back arrow icon */
const BackArrowIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M12.5 15L7.5 10L12.5 5"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// REUSABLE COMPONENTS (same patterns as Screen 1)
// ─────────────────────────────────────────────

interface GradientIconBoxProps {
  children: React.ReactNode;
  size?: number;
  radius?: number;
}

const GradientIconBox: React.FC<GradientIconBoxProps> = ({
  children,
  size = 40,
  radius = 10,
}) => (
  <LinearGradient
    colors={[COLORS.iconGradientStart, COLORS.iconGradientEnd]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={{
      width: size,
      height: size,
      borderRadius: radius,
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    {children}
  </LinearGradient>
);

interface BenefitCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const BENEFIT_CARDS: BenefitCard[] = [
  {
    id: 'verified-pros',
    icon: <ShieldIcon />,
    title: 'Verified Pros in your area',
    description: 'Plumbers, electricians, painters & more',
  },
  {
    id: 'direct-comm',
    icon: <LightningIcon />,
    title: 'Direct Communication',
    description: 'Direct real-time chat with pros',
  },
  {
    id: 'top-rated',
    icon: <StarIcon />,
    title: 'Top-Rated Quality',
    description: 'All pros maintain 4.5+ star ratings',
  },
];



const BenefitCardItem: React.FC<{ card: BenefitCard }> = ({ card }) => (
  <View
    style={{
      flexDirection: 'row',
      alignItems: 'flex-start',
      padding: 16,
      backgroundColor: COLORS.cardBg,
      borderRadius: 14,
      gap: 16,
    }}
  >
    <GradientIconBox size={40} radius={10}>
      {card.icon}
    </GradientIconBox>
    <View style={{ flex: 1, gap: 4 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '600',
          color: COLORS.primary,
          lineHeight: 27,
        }}
      >
        {card.title}
      </Text>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '400',
          color: COLORS.bodyText,
          lineHeight: 20,
        }}
      >
        {card.description}
      </Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════════════════════
// NAVIGATION TYPES
// ═══════════════════════════════════════════════════════════════

type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding2'>;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const OnboardingScreen2: React.FC<Props> = ({ navigation }) => {
  const handleNextPress = (): void => {
    navigation.navigate('Onboarding3');
  };

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={{ flex: 1 }}>
        {/* ── Scrollable Content ── */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center' }}
        >
          {/* ── Header Block ── */}
          <View
            style={{
              width: '100%',
              maxWidth: 362,
              paddingTop: 0,
              paddingHorizontal: 24,
            }}
          >
            {/* Back button + Logo row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              {/* Back button */}
              <TouchableOpacity
                onPress={handleBackPress}
                activeOpacity={1}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  left: 0,
                  zIndex: 1,
                }}
              >
                <BackArrowIcon />
              </TouchableOpacity>

              {/* Logo — centered across full width */}
              <Text
                style={{
                  flex: 1,
                  textAlign: 'center',
                  fontSize: 24,
                  fontWeight: '600',
                  color: COLORS.primary,
                  lineHeight: 32,
                  fontFamily: FONTS.logo,
                }}
              >
                Atlasio
              </Text>
            </View>

            {/* Progress bar */}
            <View style={{ width: '100%', maxWidth: 314 }}>
            <AnimatedProgressBar currentStep={2} totalSteps={4} />
            </View>
          </View>

          {/* ── Hero Section ── */}
          <View
            style={{
              width: '100%',
              maxWidth: 362,
              alignItems: 'center',
              gap: 20,
              marginTop: 20,
            }}
          >
            <GradientIconBox size={80} radius={16}>
              <ConnectIcon />
            </GradientIconBox>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 32,
                fontWeight: '600',
                color: COLORS.primary,
                lineHeight: 38.4,
              }}
            >
              Connect Instantly
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '400',
                color: COLORS.bodyText,
                lineHeight: 22.4,
                paddingHorizontal: 16,
              }}
            >
              Access a network of licensed contractors, closing partners,
              inspectors, and service providers at your fingertips.
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: COLORS.primary,
                lineHeight: 20,
              }}
            >
              Tailored for your role
            </Text>

            {/* ── Benefit Cards ── */}
            <View style={{ width: '100%', paddingHorizontal: 20, gap: 16 }}>
              {BENEFIT_CARDS.map((card) => {
                return <BenefitCardItem key={card.id} card={card} />;
              })}
            </View>
          </View>

          {/* Spacer for button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Bottom Button ── */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            alignItems: 'center',
          }}
        >
          <BlurView
            intensity={10}
            tint="light"
            style={{
              width: '100%',
              maxWidth: 362,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 0,
              overflow: 'hidden',
            }}
          >
           <TouchableOpacity
              onPress={handleNextPress}
              activeOpacity={.9}
              style={{ width: '100%', borderRadius: 10, overflow: 'hidden' }}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  height: 54,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                    lineHeight: 24,
                  }}
                >
                  Next
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </BlurView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen2;