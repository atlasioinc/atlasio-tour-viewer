// ContractorTradeStep.tsx
// ═══════════════════════════════════════════════════════════════
// Contractor Onboarding Step 4 of 6 — Trade Selection (472 lines)
// Chip grid with ALL 22 trades from schema.sql trades_enum
//
// Two-phase selection:
//   1. First tap → primary trade (filled blue chip)
//   2. Additional taps → secondary trades (outlined blue, max 2)
//   Tapping primary again deselects it; helper text updates dynamically
//
// TRADES constant uses schema display names exactly (not snake_case):
//   'Electrical', 'Plumbing', 'Roofing', ... 'Other' (22 total)
//
// Flow: ContractorProfileBasics → HERE → ContractorDetailsStep
// "Next" disabled until primary trade selected
//
// Sections: Design Tokens, SVG Icons, Gradient Icon Box,
//           Trades List, Local Types, Navigation Types, Main Component
//
// @demo  No mock data — user selection UI
// @backend none (trades stored in formData route params)
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AnimatedProgressBar from './AnimatedProgressBar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────
const COLORS = {
  primary: '#003DC3',
  primaryEnd: '#0052FF',
  background: '#FFFFFF',
  cardBg: '#F7F7FC',
  bodyText: '#4A5565',
  stepText: '#6A7282',
  progressTrack: '#E5E7EB',
  inputBorder: '#E5E7EB',
  placeholder: '#99A1AF',
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
// SVG ICONS
// ─────────────────────────────────────────────

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

const ToolIcon: React.FC = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Path
      d="M23.33 16.67L33.33 26.67C34.17 27.5 34.17 28.83 33.33 29.67L29.67 33.33C28.83 34.17 27.5 34.17 26.67 33.33L16.67 23.33"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M16.67 23.33C13.33 26.67 8.33 26.67 5 23.33C1.67 20 1.67 15 5 11.67L10 6.67L16.67 13.33L23.33 6.67L16.67 13.33"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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
// TRADES LIST
// ─────────────────────────────────────────────

const TRADES = [
  'Electrical', 'Plumbing', 'Roofing', 'HVAC', 'Carpentry / Handyman', 'Painting',
  'Flooring', 'Windows & Doors', 'Foundation / Structural', 'Drywall / Sheetrock',
  'Pest Control / Termite', 'Mold Remediation', 'Sewer / Septic', 'Pool & Spa',
  'Chimney / Fireplace', 'Garage Door', 'Appliances', 'Landscaping / Drainage',
  'Locksmith / Re-key', 'Cleaning / Junk Removal', 'Driveway / Paving', 'Other',
] as const;

// ─────────────────────────────────────────────
// LOCAL TYPES
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
// NAVIGATION TYPES
// ─────────────────────────────────────────────

type RootStackParamList = {
  ContractorProfileBasics: { formData: OnboardingFormData };
  ContractorTradeStep: { formData: OnboardingFormData };
  ContractorDetailsStep: { formData: OnboardingFormData };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ContractorTradeStep'>;
  route: RouteProp<RootStackParamList, 'ContractorTradeStep'>;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ContractorTradeStep: React.FC<Props> = ({ navigation, route }) => {
  const { formData } = route.params;

  // ── Trade Selection State ──
  const [primaryTrade, setPrimaryTrade] = useState<string | null>(null);
  const [secondaryTrades, setSecondaryTrades] = useState<string[]>([]);

  // ── Handlers ──

  const handleChipPress = (trade: string): void => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // If tapping the current primary → deselect it
    if (trade === primaryTrade) {
      setPrimaryTrade(null);
      return;
    }

    // If no primary is set → this becomes the primary
    if (primaryTrade === null) {
      setPrimaryTrade(trade);
      // Also remove from secondaries if it was there
      setSecondaryTrades((prev) => prev.filter((t) => t !== trade));
      return;
    }

    // Primary is set, tapping a different chip → toggle secondary
    if (secondaryTrades.includes(trade)) {
      // Remove from secondaries
      setSecondaryTrades((prev) => prev.filter((t) => t !== trade));
    } else if (secondaryTrades.length < 2) {
      // Add to secondaries (max 2)
      setSecondaryTrades((prev) => [...prev, trade]);
    }
  };

  const getChipStyle = (trade: string) => {
    if (trade === primaryTrade) {
      return {
        backgroundColor: '#003DC3',
        borderColor: '#003DC3',
        textColor: '#FFFFFF',
      };
    }
    if (secondaryTrades.includes(trade)) {
      return {
        backgroundColor: '#E8F0FE',
        borderColor: '#003DC3',
        textColor: '#003DC3',
      };
    }
    return {
      backgroundColor: '#F7F7FC',
      borderColor: '#E5E7EB',
      textColor: '#4A5565',
    };
  };

  const getHelperText = (): string => {
    if (!primaryTrade) {
      return 'Tap to select your primary trade';
    }
    if (secondaryTrades.length === 0) {
      return 'Tap additional trades for secondary specialties (optional)';
    }
    return `${primaryTrade} + ${secondaryTrades.length} secondary`;
  };

  const isNextEnabled = primaryTrade !== null;

  const handleNextPress = (): void => {
    if (!isNextEnabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('ContractorDetailsStep', {
      formData: {
        ...formData,
        primaryTrade,
        secondaryTrades,
      },
    });
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
          keyboardShouldPersistTaps="handled"
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
              <AnimatedProgressBar currentStep={4} totalSteps={6} />
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
              paddingBottom: 24,
            }}
          >
            <GradientIconBox size={80} radius={16}>
              <ToolIcon />
            </GradientIconBox>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 30,
                fontWeight: '600',
                color: COLORS.primary,
                lineHeight: 36,
                letterSpacing: 0.4,
                fontFamily: FONTS.logo,
              }}
            >
              Select Your Trades
            </Text>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 16,
                fontWeight: '400',
                color: COLORS.bodyText,
                lineHeight: 26,
                paddingHorizontal: 16,
              }}
            >
              Choose your primary trade and up to 2 secondary trades
            </Text>

            {/* ── Chip Grid ── */}
            <View
              style={{
                width: '100%',
                paddingHorizontal: 20,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                {TRADES.map((trade) => {
                  const chipStyle = getChipStyle(trade);
                  return (
                    <Pressable
                      key={trade}
                      onPress={() => handleChipPress(trade)}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 9999,
                        borderWidth: 1.38,
                        borderColor: chipStyle.borderColor,
                        backgroundColor: chipStyle.backgroundColor,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '500',
                          color: chipStyle.textColor,
                          lineHeight: 20,
                        }}
                      >
                        {trade}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* ── Dynamic Helper Text ── */}
              <View style={{ marginTop: 8 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '400',
                    color: COLORS.stepText,
                    lineHeight: 20,
                  }}
                >
                  {getHelperText()}
                </Text>
              </View>
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
              onPress={isNextEnabled ? handleNextPress : undefined}
              style={({ pressed }) => ({
                width: '100%',
                borderRadius: 10,
                overflow: 'hidden',
                opacity: isNextEnabled ? 1 : 0.5,
                transform: [{ scale: pressed && isNextEnabled ? 0.97 : 1 }],
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
            </Pressable>
          </BlurView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ContractorTradeStep;
