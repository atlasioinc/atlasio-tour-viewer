// OnboardingRoleSelect.tsx
// ═══════════════════════════════════════════════════════════════
// Onboarding Step 2 of 5 — "Choose Your Role"
// Role selection screen — cards are navigation triggers (no bottom CTA)
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AnimatedProgressBar from './AnimatedProgressBar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

// ─────────────────────────────────────────────
// LOCAL TYPES
// ─────────────────────────────────────────────

type OnboardingFormData = {
  role: string;
  subRole?: string;
  fullName: string;
  company?: string;
  serviceArea?: string;
  primaryTrade?: string;
  secondaryTrades?: string[];
  serviceRadius?: string;
  hasLicense?: boolean;
  hasInsurance?: boolean;
};

// ─────────────────────────────────────────────
// DESIGN TOKENS (same as Screen 1 & 2)
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
  cardBorder: '#E5E7EB',
} as const;

const FONTS = {
  logo: Platform.select({
    web: '"Radio Canada Big", "Inter", sans-serif',
    default: 'RadioCanadaBig-SemiBold',
  }),
} as const;

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

/** House icon — Agent card (reused from Screen 1) */
const HouseIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M2.5 10L10 3.33L17.5 10"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M5 8.75V16.67C5 17.13 5.37 17.5 5.83 17.5H14.17C14.63 17.5 15 17.13 15 16.67V8.75"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M7.5 17.5V11.67C7.5 11.21 7.87 10.83 8.33 10.83H11.67C12.13 10.83 12.5 11.21 12.5 11.67V17.5"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Wrench icon — Contractor card */
const WrenchIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M11.67 11.67L17.5 17.5"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M12.5 7.5C12.5 9.57 10.82 11.25 8.75 11.25C6.68 11.25 5 9.57 5 7.5C5 5.43 6.68 3.75 8.75 3.75C9.12 3.75 9.48 3.8 9.82 3.9"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M15 2.5L12.5 5L13.33 6.67L15 7.5L17.5 5C17.5 5 17.5 3.33 16.25 2.5"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Network icon — Partner card (reused from Screen 1) */
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

/** Users icon — Hero section */
const UsersIcon: React.FC = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Circle cx={15} cy={11.67} r={5} stroke={COLORS.primary} strokeWidth={3.33} />
    <Path
      d="M5 33.33C5 27.5 9.47 23.33 15 23.33"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
    />
    <Circle cx={27} cy={13.33} r={4.17} stroke={COLORS.primary} strokeWidth={2.5} />
    <Path
      d="M35 31.67C35 26.67 31.18 23.33 27 23.33"
      stroke={COLORS.primary}
      strokeWidth={2.5}
      strokeLinecap="round"
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
// REUSABLE COMPONENTS
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
// ROLE CARD DATA
// ─────────────────────────────────────────────

interface RoleCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  role: string;
  navigateTo: 'Onboarding3' | 'ContractorProfileBasics';
}

const ROLE_CARDS: RoleCard[] = [
  {
    id: 'agent',
    icon: <HouseIcon />,
    title: 'Real Estate Agent',
    description: 'Post repair jobs, build your squad of trusted pros',
    role: 'real_estate_agent',
    navigateTo: 'Onboarding3',
  },
  {
    id: 'contractor',
    icon: <WrenchIcon />,
    title: 'Contractor',
    description: 'Bid on repair jobs, grow your business with agent leads',
    role: 'contractor',
    navigateTo: 'ContractorProfileBasics',
  },
  {
    id: 'partner',
    icon: <NetworkIcon />,
    title: 'Closing Partner',
    description: 'Get warm referrals from active agents in your area',
    role: 'partner',
    navigateTo: 'Onboarding3',
  },
];

// ═══════════════════════════════════════════════════════════════
// NAVIGATION TYPES
// ═══════════════════════════════════════════════════════════════

type RootStackParamList = {
  Onboarding1: undefined;
  OnboardingRoleSelect: undefined;
  Onboarding3: { formData: OnboardingFormData };
  ContractorProfileBasics: { formData: OnboardingFormData };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnboardingRoleSelect'>;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const OnboardingRoleSelect: React.FC<Props> = ({ navigation }) => {
  const handleBackPress = (): void => {
    navigation.goBack();
  };

  const handleRolePress = (card: RoleCard): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const formData: OnboardingFormData = {
      role: card.role,
      fullName: '',
    };
    navigation.navigate(card.navigateTo, { formData });
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
              <Pressable
                onPress={handleBackPress}
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
              </Pressable>

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
              <AnimatedProgressBar currentStep={2} totalSteps={5} />
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
              <UsersIcon />
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
              Choose Your Role
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
              Select how you'll use Atlasio to get started
            </Text>

            {/* ── Role Cards ── */}
            <View style={{ width: '100%', paddingHorizontal: 20, gap: 16 }}>
              {ROLE_CARDS.map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => handleRolePress(card)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    padding: 20,
                    backgroundColor: COLORS.cardBg,
                    borderRadius: 14,
                    gap: 16,
                    borderWidth: 1,
                    borderColor: COLORS.cardBorder,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  })}
                >
                  <GradientIconBox size={56} radius={14}>
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
                </Pressable>
              ))}
            </View>
          </View>

          {/* Bottom spacer */}
          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingRoleSelect;
