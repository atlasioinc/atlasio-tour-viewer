// OnboardingScreen1.tsx
// ═══════════════════════════════════════════════════════════════
// Onboarding Step 1 of 5 — "Welcome to Atlasio" (418 lines)
// Splash screen with 3 benefit cards, "Get Started" CTA
//
// Flow: App launch → OnboardingScreen1 → OnboardingRoleSelect
// Progress bar: 1/5 (agent/partner) or 1/6 (contractor, after role branch)
//
// Uses LOCAL COLORS object (not lib/tokens.ts) — all onboarding screens
// share this pattern for self-contained theming.
//
// Sections: Design Tokens, SVG Icons, Gradient Icon Box,
//           Benefit Card Data, Benefit Card Component, Main Component
//
// @demo  No mock data — static UI
// @backend none (no auth or data fetching on this screen)
//
// Figma spec: 393px frame, Inter + Radio Canada Big,
//   Primary #003DC3, Gradient → #0052FF, Card bg #F7F7FC
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AnimatedProgressBar from './AnimatedProgressBar';
import { supabase } from '../lib/supabase';

// ─────────────────────────────────────────────
// DESIGN TOKENS (extracted from Figma)
// Centralised so any rebrand is a single-file change.
// ─────────────────────────────────────────────
// @tokens: OnboardingScreen1 uses local COLORS — migrate to lib/tokens.ts in a future cleanup session
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
  body: Platform.select({
    web: '"Inter", sans-serif',
    default: 'Inter',
  }),
} as const;

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const HouseIcon: React.FC = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Path
      d="M5 20L20 6.67L35 20"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 17.5V33.33C10 34.25 10.75 35 11.67 35H28.33C29.25 35 30 34.25 30 33.33V17.5"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15 35V23.33C15 22.41 15.75 21.67 16.67 21.67H23.33C24.25 21.67 25 22.41 25 23.33V35"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

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

const NetworkIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Circle cx={10} cy={4.17} r={2.5} stroke={COLORS.primary} strokeWidth={1.67} />
    <Circle cx={4.17} cy={15.83} r={2.5} stroke={COLORS.primary} strokeWidth={1.67} />
    <Circle cx={15.83} cy={15.83} r={2.5} stroke={COLORS.primary} strokeWidth={1.67} />
    <Path d="M10 6.67V10" stroke={COLORS.primary} strokeWidth={1.67} />
    <Path d="M8.5 11L5.5 13.5" stroke={COLORS.primary} strokeWidth={1.67} />
    <Path d="M11.5 11L14.5 13.5" stroke={COLORS.primary} strokeWidth={1.67} />
  </Svg>
);

// ─────────────────────────────────────────────
// GRADIENT ICON BOX
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

// ─────────────────────────────────────────────
// BENEFIT CARD DATA
// ─────────────────────────────────────────────

interface BenefitCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const BENEFIT_CARDS: BenefitCard[] = [
  {
    id: 'verified',
    icon: <ShieldIcon />,
    title: 'Verified Professionals',
    description:
      'Work with pre-screened, trusted pros for every project—in your area and growing daily.',
  },
  {
    id: 'fast',
    icon: <LightningIcon />,
    title: 'Fast & Efficient',
    description: 'Close deals faster with streamlined coordination',
  },
  {
    id: 'network',
    icon: <NetworkIcon />,
    title: 'Seamless Network',
    description: 'Access a complete ecosystem of service providers',
  },
];


// ─────────────────────────────────────────────
// BENEFIT CARD COMPONENT
// ─────────────────────────────────────────────

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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

type RootStackParamList = {
  Onboarding1: undefined;
  OnboardingRoleSelect: undefined;
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding1'>;
};

const OnboardingScreen1: React.FC<Props> = ({ navigation }) => {
  const handleNextPress = (): void => {
    navigation.navigate('OnboardingRoleSelect');
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
            <Text
              style={{
                textAlign: 'center',
                fontSize: 24,
                fontWeight: '600',
                color: COLORS.primary,
                lineHeight: 32,
                fontFamily: FONTS.logo,
                marginBottom: 4,
              }}
            >
              Atlasio
            </Text>
            <View style={{ width: '100%', maxWidth: 314 }}>
            <AnimatedProgressBar currentStep={1} totalSteps={5} />
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
              <HouseIcon />
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
              Welcome to Atlasio
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '400',
                color: COLORS.bodyText,
                lineHeight: 22.4,
                paddingHorizontal: 10,
              }}
            >
              Access a network tailored to your role—licensed contractors,
              closing partners, inspectors, and service providers at your
              fingertips.
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

          {/* Spacer so content can scroll behind the blur button */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Bottom Button — floats OVER the ScrollView ── */}
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
              paddingBottom: 16,
              overflow: 'hidden',
            }}
          >
            <TouchableOpacity
              onPress={handleNextPress}
              activeOpacity={1}
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

            {/* Sign in escape hatch — signs out to trigger auth state → LoginScreen */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 4 }}>
              <Text style={{ fontSize: 14, color: COLORS.bodyText }}>
                Already have an account?
              </Text>
              <Pressable
                onPress={() => supabase.auth.signOut()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary }}>
                  Sign in
                </Text>
              </Pressable>
            </View>
          </BlurView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingScreen1;