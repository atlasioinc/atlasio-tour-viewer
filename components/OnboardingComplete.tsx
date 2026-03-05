// OnboardingComplete.tsx
// ═══════════════════════════════════════════════════════════════
// Onboarding Completion — Final step (605 lines)
// Renders role-specific content based on formData.role
// Progress bar: contractor 6/6, agent/partner 5/5
//
// CTA logs full rpc_complete_onboarding payload via console.log
// Then navigates to MainApp with { role: formData.role }
//
// @demo  Console.log payload stub — no actual RPC call
// @backend TODO: rpc_complete_onboarding(formData) — persist all onboarding data
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AnimatedProgressBar from './AnimatedProgressBar';
import { useCompleteOnboarding } from '../hooks/useData';
import { FEATURE_FLAGS } from '../lib/featureFlags';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const COLORS = {
  primary: '#003DC3',
  primaryEnd: '#0052FF',
  background: '#FFFFFF',
  bodyText: '#4A5565',
  cardBodyText: '#64748B',
  stepText: '#6A7282',
  progressTrack: '#E5E7EB',
  iconBg: '#E8F0FE',
} as const;

const FONTS = {
  logo: Platform.select({
    web: '"Radio Canada Big", "Inter", sans-serif',
    default: 'RadioCanadaBig-SemiBold',
  }),
} as const;

// ─────────────────────────────────────────────
// FORM DATA TYPE
// ─────────────────────────────────────────────

type OnboardingFormData = {
  role: string;
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
// ONBOARDING PATH HELPER — UI logic only, not stored in formData.
// Determines which onboarding screens to show based on selected role.
// This is a display concern, not a data concern.
// ─────────────────────────────────────────────
const CONTRACTOR_ROLES = ['Contractor'];
const PARTNER_ROLES = [
  'Mortgage Pro', 'Title/Escrow', 'Home Inspector', 'Appraiser',
  'Transaction Coordinator', 'Warranty', 'Attorney', 'Home Stager',
  'Real Estate Photographer',
];

const getOnboardingPath = (role: string): 'agent' | 'contractor' | 'partner' => {
  if (CONTRACTOR_ROLES.includes(role)) return 'contractor';
  if (PARTNER_ROLES.includes(role)) return 'partner';
  return 'agent';
};

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CheckCircleIcon: React.FC = () => (
  <Svg width={56} height={56} viewBox="0 0 56 56" fill="none">
    <Circle
      cx={28}
      cy={28}
      r={23.33}
      stroke={COLORS.primary}
      strokeWidth={4.67}
    />
    <Path
      d="M21 28L25 32.33L35 23.33"
      stroke={COLORS.primary}
      strokeWidth={4.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

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

const ShieldCheckIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 2L4 6V12C4 16.4183 7.58172 20 12 22C16.4183 20 20 16.4183 20 12V6L12 2Z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 12L11 14L15 10"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const BidsIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M13 2L4 14H12L11 22L20 10H12L13 2Z"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const GuaranteeIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Circle
      cx={12}
      cy={12}
      r={10}
      stroke={COLORS.primary}
      strokeWidth={2}
    />
    <Path
      d="M9 12L11 14L15 10"
      stroke={COLORS.primary}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// ROLE-SPECIFIC CONTENT
// This is the single source of truth for all
// role variants. To add a new role, just add
// a new entry here — no new files needed.
// ─────────────────────────────────────────────

interface BenefitCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface RoleContent {
  heading: string;
  subtitle: string;
  ctaText: string;
  cards: BenefitCard[];
}

// Keyed by getOnboardingPath() output — a display concern
const ROLE_CONTENT: Record<string, RoleContent> = {
  agent: {
    heading: "You're Ready to Build Your Squad!",
    subtitle:
      'Join our growing network of agents who close deals faster with Atlasio.',
    ctaText: 'Build My Squad Now',
    cards: [
      {
        id: 'verified-pros',
        icon: <ShieldCheckIcon />,
        title: 'Handpicked Verified Pros',
        description:
          'Work with pre-screened, trusted professionals in your area—starting with our growing network.',
      },
      {
        id: 'instant-bids',
        icon: <BidsIcon />,
        title: 'Instant Bids & Matches',
        description:
          'Post repairs and get competitive bids in hours from verified pros—streamline your closings.',
      },
      {
        id: 'satisfaction',
        icon: <GuaranteeIcon />,
        title: 'Satisfaction Guaranteed',
        description:
          'Close with confidence—our verified network ensures quality and accountability for every job.',
      },
    ],
  },
  partner: {
    heading: "You're Ready to Get Leads!",
    subtitle:
      'Join our growing network of professionals who get warm referrals from active agents—tailored to your role.',
    ctaText: 'Get Leads Now',
    cards: [
      {
        id: 'verified-pros',
        icon: <ShieldCheckIcon />,
        title: 'Handpicked Verified Pros',
        description:
          'Get leads from pre-screened, trusted agents in your area—starting with our growing network.',
      },
      {
        id: 'instant-leads',
        icon: <BidsIcon />,
        title: 'Instant Leads & Referrals',
        description:
          'Join squads and get warm referrals in hours from agents closing deals fast.',
      },
      {
        id: 'satisfaction',
        icon: <GuaranteeIcon />,
        title: 'Satisfaction Guaranteed',
        description:
          'Build lasting relationships with quality agents—our verified network ensures accountability for every opportunity.',
      },
    ],
  },
  contractor: {
    heading: "You're Ready to Get Jobs!",
    subtitle:
      'Join our growing network of contractors who get matched with jobs from active agents in your area.',
    ctaText: 'Find Jobs Now',
    cards: [
      {
        id: 'verified-pros',
        icon: <ShieldCheckIcon />,
        title: 'Verified Agent Network',
        description:
          'Get matched with pre-screened, active agents who need your skills—starting with our growing network.',
      },
      {
        id: 'instant-jobs',
        icon: <BidsIcon />,
        title: 'Instant Job Matches',
        description:
          'Receive job requests and bid on repairs in hours—grow your business faster.',
      },
      {
        id: 'satisfaction',
        icon: <GuaranteeIcon />,
        title: 'Satisfaction Guaranteed',
        description:
          'Build your reputation with quality agents—our verified network ensures steady work and accountability.',
      },
    ],
  },
};

// Fallback content if role not found
const DEFAULT_CONTENT: RoleContent = ROLE_CONTENT.agent;

// ─────────────────────────────────────────────
// BENEFIT CARD COMPONENT
// ─────────────────────────────────────────────

const BenefitCardItem: React.FC<{ card: BenefitCard }> = ({ card }) => (
  <View
    style={{
      padding: 20,
      backgroundColor: COLORS.background,
      borderRadius: 16,
      shadowColor: '#003DC3',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 16,
    }}
  >
    <View
      style={{
        width: 48,
        height: 48,
        backgroundColor: COLORS.iconBg,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {card.icon}
    </View>
    <View style={{ flex: 1, gap: 8 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: '700',
          color: COLORS.primary,
          lineHeight: 27,
        }}
      >
        {card.title}
      </Text>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '400',
          color: COLORS.cardBodyText,
          lineHeight: 22.5,
        }}
      >
        {card.description}
      </Text>
    </View>
  </View>
);

// ─────────────────────────────────────────────
// NAVIGATION TYPES
// ─────────────────────────────────────────────

type RootStackParamList = {
  Onboarding4: { formData: OnboardingFormData };
  ContractorDetailsStep: { formData: OnboardingFormData };
  OnboardingComplete: { formData: OnboardingFormData };
  MainApp: { role: string };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'OnboardingComplete'>;
  route: RouteProp<RootStackParamList, 'OnboardingComplete'>;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const OnboardingComplete: React.FC<Props> = ({ navigation, route }) => {
  const { formData } = route.params;
  const role = formData.role;

  // Dynamic progress: contractor = 6/6, agent/partner = 5/5
  const rolePath = getOnboardingPath(role);
  const totalSteps = rolePath === 'contractor' ? 6 : 5;
  const currentStep = totalSteps;

  // Get role-specific content or fallback (keyed by onboarding path, not raw role)
  const content = ROLE_CONTENT[rolePath] || DEFAULT_CONTENT;

  // ── Onboarding mutation ──
  const completeOnboarding = useCompleteOnboarding();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCtaPress = async (): Promise<void> => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // @backend — Log full onboarding payload for rpc_complete_onboarding
    console.log('[OnboardingComplete] rpc_complete_onboarding payload:', formData);

    if (FEATURE_FLAGS.LIVE_ONBOARDING) {
      setIsSubmitting(true);
      try {
        await completeOnboarding.mutateAsync({
          fullName: formData.fullName,
          role: formData.role,  // Already a backend enum value — single-value principle
          company: formData.company || undefined,
          location: formData.serviceArea || 'Denver, CO',
          primaryTrade: formData.primaryTrade || undefined,
          secondaryTrades: formData.secondaryTrades || undefined,
        });
        navigation.navigate('MainApp', { role: formData.role });
      } catch {
        Alert.alert(
          'Something went wrong',
          'We couldn\'t complete your setup. Please try again.',
          [{ text: 'OK' }],
        );
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Demo mode — skip RPC, go straight to main app
      navigation.navigate('MainApp', { role: formData.role });
    }
  };

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={{ flex: 1 }}>
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
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 4,
              }}
            >
              <Pressable
                onPress={handleBackPress}
                style={({ pressed }) => ({
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'absolute',
                  left: 0,
                  zIndex: 1,
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <BackArrowIcon />
              </Pressable>
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

            <View style={{ width: '100%', maxWidth: 314 }}>
              <AnimatedProgressBar currentStep={currentStep} totalSteps={totalSteps} />
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
            {/* Hero icon — circle with checkmark */}
            <View
              style={{
                width: 80,
                height: 80,
                backgroundColor: COLORS.iconBg,
                borderRadius: 9999,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircleIcon />
            </View>

            {/* Dynamic heading */}
            <Text
              style={{
                textAlign: 'center',
                fontSize: 32,
                fontWeight: '600',
                color: COLORS.primary,
                lineHeight: 38.4,
              }}
            >
              {content.heading}
            </Text>

            {/* Dynamic subtitle */}
            <Text
              style={{
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '400',
                color: COLORS.bodyText,
                lineHeight: 22.4,
                paddingHorizontal: 20,
              }}
            >
              {content.subtitle}
            </Text>

            {/* Dynamic benefit cards */}
            <View style={{ width: '100%', gap: 16 }}>
              {content.cards.map((card) => (
                <BenefitCardItem key={card.id} card={card} />
              ))}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* ── Bottom Button with dynamic CTA ── */}
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
            intensity={80}
            tint="light"
            style={{
              width: '100%',
              maxWidth: 362,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 24,
              overflow: 'hidden',
            }}
          >
            <Pressable
              onPress={handleCtaPress}
              disabled={isSubmitting}
              style={({ pressed }) => ({
                width: '100%',
                borderRadius: 10,
                overflow: 'hidden',
                opacity: isSubmitting ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}
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
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                <Text
                  style={{
                    textAlign: 'center',
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                    lineHeight: 24,
                  }}
                >
                  {content.ctaText}
                </Text>
                )}
              </LinearGradient>
            </Pressable>
          </BlurView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default OnboardingComplete;