// ContractorDetailsStep.tsx
// ═══════════════════════════════════════════════════════════════
// Contractor Onboarding Step 5 of 6 — "Service Details"
// Service area, radius selection, and license/insurance toggles
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
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
// NAVIGATION TYPES
// ─────────────────────────────────────────────

type RootStackParamList = {
  ContractorTradeStep: { formData: OnboardingFormData };
  ContractorDetailsStep: { formData: OnboardingFormData };
  OnboardingComplete: { formData: OnboardingFormData };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ContractorDetailsStep'>;
  route: RouteProp<RootStackParamList, 'ContractorDetailsStep'>;
};

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const MapPinIcon: React.FC = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Path
      d="M20 3.33C13.56 3.33 8.33 8.56 8.33 15C8.33 24.17 20 36.67 20 36.67C20 36.67 31.67 24.17 31.67 15C31.67 8.56 26.44 3.33 20 3.33Z"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Circle
      cx={20}
      cy={15}
      r={5}
      stroke={COLORS.primary}
      strokeWidth={3.33}
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
// RADIUS OPTIONS
// ─────────────────────────────────────────────

const RADIUS_OPTIONS = ['10 mi', '25 mi', '50 mi'] as const;

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ContractorDetailsStep: React.FC<Props> = ({ navigation, route }) => {
  const { formData } = route.params;

  // ── State ──
  const [selectedRadius, setSelectedRadius] = useState<string>('25 mi');
  const [hasLicense, setHasLicense] = useState(false);
  const [hasInsurance, setHasInsurance] = useState(false);

  // ── Handlers ──

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  const handleRadiusPress = (radius: string): void => {
    setSelectedRadius(radius);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCompleteSetup = (): void => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate('OnboardingComplete', {
      formData: {
        ...formData,
        serviceArea: 'Denver Metro Area',
        serviceRadius: selectedRadius,
        hasLicense,
        hasInsurance,
      },
    });
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
              <AnimatedProgressBar currentStep={5} totalSteps={6} />
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
              <MapPinIcon />
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
              Service Details
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
              Set your service area and credentials
            </Text>

            {/* ── Cards Section ── */}
            <View
              style={{
                width: '100%',
                paddingHorizontal: 20,
                gap: 16,
              }}
            >
              {/* ── Card 1: Service Area ── */}
              <View
                style={{
                  padding: 20,
                  backgroundColor: '#F7F7FC',
                  borderRadius: 14,
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: COLORS.primary,
                    lineHeight: 20,
                  }}
                >
                  Service Area
                </Text>

                {/* Pre-set chip */}
                <View style={{ flexDirection: 'row' }}>
                  <View
                    style={{
                      backgroundColor: COLORS.primary,
                      borderRadius: 9999,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: '#FFFFFF',
                      }}
                    >
                      Denver Metro Area
                    </Text>
                  </View>
                </View>

                {/* Radius pills row */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {RADIUS_OPTIONS.map((radius) => {
                    const isActive = selectedRadius === radius;
                    return (
                      <Pressable
                        key={radius}
                        onPress={() => handleRadiusPress(radius)}
                        style={({ pressed }) => ({
                          backgroundColor: isActive ? '#003DC3' : '#E5E7EB',
                          borderRadius: 9999,
                          paddingHorizontal: 14,
                          paddingVertical: 6,
                          opacity: pressed ? 0.8 : 1,
                        })}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '500',
                            color: isActive ? '#FFFFFF' : '#4A5565',
                          }}
                        >
                          {radius}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* ── Card 2: Credentials ── */}
              <View
                style={{
                  padding: 20,
                  backgroundColor: '#F7F7FC',
                  borderRadius: 14,
                  gap: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: COLORS.primary,
                    lineHeight: 20,
                  }}
                >
                  Professional Credentials
                </Text>

                {/* Toggle row 1: Licensed Contractor */}
                <View
                  style={{
                    height: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '400',
                      color: COLORS.bodyText,
                    }}
                  >
                    Licensed Contractor
                  </Text>
                  <Switch
                    value={hasLicense}
                    onValueChange={setHasLicense}
                    trackColor={{ false: '#D1D5DC', true: '#003DC3' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Toggle row 2: Insured */}
                <View
                  style={{
                    height: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: '400',
                      color: COLORS.bodyText,
                    }}
                  >
                    Insured
                  </Text>
                  <Switch
                    value={hasInsurance}
                    onValueChange={setHasInsurance}
                    trackColor={{ false: '#D1D5DC', true: '#003DC3' }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              </View>

              {/* ── Social Proof Text ── */}
              <Text
                style={{
                  fontSize: 13,
                  color: '#6A7282',
                  textAlign: 'center',
                  fontStyle: 'italic',
                  lineHeight: 18,
                  paddingHorizontal: 16,
                }}
              >
                Licensed & insured contractors get 3x more job invites
              </Text>
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
              onPress={handleCompleteSetup}
              style={({ pressed }) => ({
                width: '100%',
                borderRadius: 10,
                overflow: 'hidden',
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
                <Text
                  style={{
                    textAlign: 'center',
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '600',
                    lineHeight: 24,
                  }}
                >
                  Complete Setup
                </Text>
              </LinearGradient>
            </Pressable>
          </BlurView>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ContractorDetailsStep;
