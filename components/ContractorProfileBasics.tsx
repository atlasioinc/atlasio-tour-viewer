// ContractorProfileBasics.tsx
// ═══════════════════════════════════════════════════════════════
// Contractor Onboarding Step 3 of 6 — "Tell Us About You" (519 lines)
// 2 fields only — clean and fast:
//   - Full name (required, validated on "Next")
//   - Business name (optional)
//
// Flow: OnboardingRoleSelect → HERE → ContractorTradeStep
// Receives formData via route params, passes forward with name + company
//
// Sections: Design Tokens, SVG Icons, Gradient Icon Box,
//           Types, Error Tracking, Main Component
//
// @demo  No mock data — form collects user input
// @backend none (data accumulated in route params, persisted at OnboardingComplete)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AnimatedProgressBar from './AnimatedProgressBar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

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
  inputBorderActive: '#003DC3',
  inputBorderError: '#DC2626',
  errorText: '#DC2626',
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

const PersonIcon: React.FC = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Circle
      cx={20}
      cy={11.67}
      r={6.67}
      stroke={COLORS.primary}
      strokeWidth={3.33}
    />
    <Path
      d="M8.33 35C8.33 28.33 13.33 25 20 25C26.67 25 31.67 28.33 31.67 35"
      stroke={COLORS.primary}
      strokeWidth={3.33}
      strokeLinecap="round"
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
// TYPES
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

type RootStackParamList = {
  OnboardingRoleSelect: undefined;
  ContractorProfileBasics: { formData: OnboardingFormData };
  ContractorTradeStep: { formData: OnboardingFormData };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ContractorProfileBasics'>;
  route: RouteProp<RootStackParamList, 'ContractorProfileBasics'>;
};

// ─────────────────────────────────────────────
// ERROR TRACKING TYPE
// ─────────────────────────────────────────────

interface FormErrors {
  fullName: boolean;
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const ContractorProfileBasics: React.FC<Props> = ({ navigation, route }) => {
  const { formData } = route.params;

  // ── Form State ──
  const [fullName, setFullName] = useState<string>(formData.fullName || '');
  const [company, setCompany] = useState<string>(formData.company || '');

  // Pre-fill name from Supabase user metadata for SSO users (Apple/Google)
  // Only fires when formData.fullName is empty — never overwrites user-entered name
  // @backend supabase.auth.getUser — reads raw_user_meta_data.full_name
  useEffect(() => {
    if (formData.fullName) return; // already have a name — skip
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const metaName = user?.user_metadata?.full_name as string | undefined;
      if (metaName && metaName.trim()) {
        setFullName(metaName.trim());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount
  }, []);

  // ── Errors ──
  const [errors, setErrors] = useState<FormErrors>({
    fullName: false,
  });

  // ── Refs ──
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<{ [key: string]: number }>({});

  // ── Handlers ──

  const handleFieldChange = (
    field: keyof FormErrors,
    value: string,
    setter: (val: string) => void
  ): void => {
    setter(value);
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const getBorderColor = (
    field: keyof FormErrors,
    hasValue: boolean
  ): string => {
    if (errors[field]) return COLORS.inputBorderError;
    if (hasValue) return COLORS.inputBorderActive;
    return COLORS.inputBorder;
  };

  const getCompanyBorderColor = (hasValue: boolean): string => {
    if (hasValue) return COLORS.inputBorderActive;
    return COLORS.inputBorder;
  };

  const handleNextPress = (): void => {
    Keyboard.dismiss();

    const newErrors: FormErrors = {
      fullName: !fullName.trim(),
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((error) => error);
    if (hasErrors) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Scroll to first error
      if (newErrors.fullName && fieldPositions.current['fullName'] !== undefined) {
        scrollViewRef.current?.scrollTo({
          y: fieldPositions.current['fullName'] - 20,
          animated: true,
        });
      }
      return;
    }

    navigation.navigate('ContractorTradeStep', {
      formData: { ...formData, fullName, company },
    });
  };

  const handleBackPress = (): void => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={{ flex: 1 }}>
          {/* ── Scrollable Content ── */}
          <ScrollView
            ref={scrollViewRef}
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
                <AnimatedProgressBar currentStep={3} totalSteps={6} />
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
                <PersonIcon />
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
                Tell Us About You
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
                {"Let's set up your contractor profile"}
              </Text>

              {/* ── Form Fields ── */}
              <View
                style={{
                  width: '100%',
                  paddingHorizontal: 20,
                  gap: 16,
                }}
              >
                {/* ── Full Name ── */}
                <View
                  style={{ gap: 8 }}
                  onLayout={(e) => {
                    fieldPositions.current['fullName'] = e.nativeEvent.layout.y;
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: errors.fullName
                        ? COLORS.errorText
                        : COLORS.primary,
                      lineHeight: 20,
                    }}
                  >
                    Full Name *
                  </Text>
                  <TextInput
                    value={fullName}
                    onChangeText={(val) =>
                      handleFieldChange('fullName', val, setFullName)
                    }
                    placeholder="Enter your name"
                    placeholderTextColor={COLORS.placeholder}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({
                          y: (fieldPositions.current['fullName'] || 0) + 280,
                          animated: true,
                        });
                      }, 300);
                    }}
                    style={{
                      height: 50,
                      paddingHorizontal: 16,
                      backgroundColor: COLORS.cardBg,
                      borderRadius: 14,
                      borderWidth: 1.38,
                      borderColor: getBorderColor('fullName', !!fullName),
                      fontSize: 16,
                      fontWeight: '400',
                      color: COLORS.bodyText,
                    }}
                  />
                  {errors.fullName && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.errorText,
                        lineHeight: 16,
                        marginTop: 2,
                      }}
                    >
                      Please enter your name
                    </Text>
                  )}
                </View>

                {/* ── Business Name (optional) ── */}
                <View style={{ gap: 8 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: COLORS.primary,
                      lineHeight: 20,
                    }}
                  >
                    Business Name
                  </Text>
                  <TextInput
                    value={company}
                    onChangeText={setCompany}
                    placeholder="Your business or company name"
                    placeholderTextColor={COLORS.placeholder}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({
                          y: (fieldPositions.current['fullName'] || 0) + 360,
                          animated: true,
                        });
                      }, 300);
                    }}
                    style={{
                      height: 50,
                      paddingHorizontal: 16,
                      backgroundColor: COLORS.cardBg,
                      borderRadius: 14,
                      borderWidth: 1.38,
                      borderColor: getCompanyBorderColor(!!company),
                      fontSize: 16,
                      fontWeight: '400',
                      color: COLORS.bodyText,
                    }}
                  />
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
                onPress={handleNextPress}
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
                    Next
                  </Text>
                </LinearGradient>
              </Pressable>
            </BlurView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ContractorProfileBasics;
