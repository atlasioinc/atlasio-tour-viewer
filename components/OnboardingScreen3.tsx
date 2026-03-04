// OnboardingScreen3.tsx
// ═══════════════════════════════════════════════════════════════
// Onboarding Screen 3 of 5 — "Tell Us About You"
// Agent/Partner profile form with conditional sub-role dropdown,
// name, company, and service area fields
// Contractor path branches at OnboardingRoleSelect → ContractorProfileBasics
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
  Modal,
  TouchableOpacity,
  KeyboardAvoidingView,
  Keyboard,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import AnimatedProgressBar from './AnimatedProgressBar';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

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

const ChevronDownIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M5 7.5L10 12.5L15 7.5"
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
// DROPDOWN OPTIONS
// ─────────────────────────────────────────────

interface DropdownOption {
  label: string;
  value: string;
}

// Partner sub-role options
const PARTNER_OPTIONS: DropdownOption[] = [
  { label: 'Mortgage Lender', value: 'mortgage_lender' },
  { label: 'Title Officer / Escrow', value: 'title_officer_escrow' },
  { label: 'Home Inspector', value: 'home_inspector' },
  { label: 'Appraiser', value: 'appraiser' },
  { label: 'Real Estate Attorney', value: 'real_estate_attorney' },
  { label: 'Real Estate Photographer', value: 'real_estate_photographer' },
  { label: 'Home Stager', value: 'home_stager' },
  { label: 'Other Partner', value: 'other_partner' },
];


// ─────────────────────────────────────────────
// FORM DATA TYPE
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
  OnboardingRoleSelect: undefined;
  Onboarding3: { formData: OnboardingFormData };
  Onboarding4: { formData: OnboardingFormData };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding3'>;
  route: import('@react-navigation/native').RouteProp<RootStackParamList, 'Onboarding3'>;
};

// ─────────────────────────────────────────────
// ERROR TRACKING TYPE
// ─────────────────────────────────────────────

interface FormErrors {
  subRole: boolean;
  fullName: boolean;
  company: boolean;
  serviceArea: boolean;
}

// ─────────────────────────────────────────────
// REUSABLE DROPDOWN MODAL COMPONENT
// Used for both primary role and sub-role pickers
// ─────────────────────────────────────────────

interface DropdownModalProps {
  visible: boolean;
  title: string;
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const DropdownModal: React.FC<DropdownModalProps> = ({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="fade"
    onRequestClose={onClose}
  >
    <Pressable
      onPress={onClose}
      style={{
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
      }}
    >
      <View
        style={{
          width: '100%',
          maxWidth: 320,
          maxHeight: '70%',
          backgroundColor: COLORS.background,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        {/* Dropdown header */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.progressTrack,
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
            {title}
          </Text>
        </View>

        {/* Scrollable options list */}
        <ScrollView bounces={false}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={option.value}
              onPress={() => onSelect(option.value)}
              activeOpacity={0.7}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                backgroundColor:
                  selectedValue === option.value
                    ? COLORS.iconGradientStart
                    : COLORS.background,
                borderBottomWidth:
                  index < options.length - 1 ? 1 : 0,
                borderBottomColor: COLORS.progressTrack,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight:
                    selectedValue === option.value ? '600' : '400',
                  color:
                    selectedValue === option.value
                      ? COLORS.primary
                      : COLORS.bodyText,
                }}
              >
                {option.label}
              </Text>
              {selectedValue === option.value && (
                <Svg
                  width={16}
                  height={16}
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <Path
                    d="M3 8L6.5 11.5L13 4.5"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Pressable>
  </Modal>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const OnboardingScreen3: React.FC<Props> = ({ navigation, route }) => {
  const { formData } = route.params;

  // ── Form State ──
  const [selectedSubRole, setSelectedSubRole] = useState<string>('');
  const [fullName, setFullName] = useState<string>(formData.fullName || '');
  const [company, setCompany] = useState<string>(formData.company || '');
  const [serviceArea, setServiceArea] = useState<string>(formData.serviceArea || '');

  // ── Dropdown visibility ──
  const [showSubRoleDropdown, setShowSubRoleDropdown] = useState<boolean>(false);

  // ── Errors ──
  const [errors, setErrors] = useState<FormErrors>({
    subRole: false,
    fullName: false,
    company: false,
    serviceArea: false,
  });

  // ── Refs ──
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldPositions = useRef<{ [key: string]: number }>({});

  // ── Animation for sub-role dropdown ──
  const subRoleOpacity = useRef(new Animated.Value(0)).current;
  const subRoleTranslateY = useRef(new Animated.Value(-10)).current;

  // Determine if sub-role dropdown should show (partner only — contractors have dedicated flow)
  const needsSubRole = formData.role === 'partner';

  // Get the right sub-role options and label based on primary role
  const getSubRoleConfig = (): { label: string; placeholder: string; options: DropdownOption[] } => {
    if (formData.role === 'partner') {
      return {
        label: 'What type of partner are you? *',
        placeholder: 'Select partner type',
        options: PARTNER_OPTIONS,
      };
    }
    return { label: '', placeholder: '', options: [] };
  };

  const subRoleConfig = getSubRoleConfig();

  // Animate sub-role dropdown in/out when role changes
  useEffect(() => {
    if (needsSubRole) {
      // Fade in and slide down
      Animated.parallel([
        Animated.timing(subRoleOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(subRoleTranslateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset immediately when hidden
      subRoleOpacity.setValue(0);
      subRoleTranslateY.setValue(-10);
    }
  }, [needsSubRole]);

  // Find label for selected sub-role
  const selectedSubRoleLabel = subRoleConfig.options.find(
    (option) => option.value === selectedSubRole
  )?.label;

  // ── Handlers ──

  const handleSubRoleSelect = (value: string): void => {
    setSelectedSubRole(value);
    setShowSubRoleDropdown(false);
    if (errors.subRole) {
      setErrors((prev) => ({ ...prev, subRole: false }));
    }
  };

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

  const handleNextPress = (): void => {
    Keyboard.dismiss();

    const newErrors: FormErrors = {
      subRole: needsSubRole && !selectedSubRole,
      fullName: !fullName.trim(),
      company: !company.trim(),
      serviceArea: !serviceArea.trim(),
    };

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((error) => error);
    if (hasErrors) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Scroll to first error
      const errorFields = ['subRole', 'fullName', 'company', 'serviceArea'];
      for (const field of errorFields) {
        if (newErrors[field as keyof FormErrors] && fieldPositions.current[field] !== undefined) {
          scrollViewRef.current?.scrollTo({
            y: fieldPositions.current[field] - 20,
            animated: true,
          });
          break;
        }
      }
      return;
    }

    navigation.navigate('Onboarding4', {
      formData: {
        ...formData,
        subRole: selectedSubRole || undefined,
        fullName,
        company,
        serviceArea,
      },
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
                <AnimatedProgressBar currentStep={3} totalSteps={5} />
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
                Help us personalize your Atlasio experience
              </Text>

              {/* ── Form Fields ── */}
              <View
                style={{
                  width: '100%',
                  paddingHorizontal: 20,
                  gap: 16,
                }}
              >
                {/* ── Conditional Sub-Role Dropdown (animated, partner only) ── */}
                {needsSubRole && (
                  <Animated.View
                    style={{
                      gap: 8,
                      opacity: subRoleOpacity,
                      transform: [{ translateY: subRoleTranslateY }],
                    }}
                    onLayout={(e) => {
                      fieldPositions.current['subRole'] = e.nativeEvent.layout.y;
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: errors.subRole ? COLORS.errorText : COLORS.primary,
                        lineHeight: 20,
                      }}
                    >
                      {subRoleConfig.label}
                    </Text>
                    <Pressable
                      onPress={() => setShowSubRoleDropdown(true)}
                      style={{
                        height: 50,
                        paddingHorizontal: 16,
                        backgroundColor: COLORS.cardBg,
                        borderRadius: 14,
                        borderWidth: 1.38,
                        borderColor: getBorderColor('subRole', !!selectedSubRole),
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '400',
                          color: selectedSubRole
                            ? COLORS.bodyText
                            : COLORS.placeholder,
                        }}
                      >
                        {selectedSubRoleLabel || subRoleConfig.placeholder}
                      </Text>
                      <ChevronDownIcon />
                    </Pressable>
                    {errors.subRole && (
                      <Text
                        style={{
                          fontSize: 12,
                          color: COLORS.errorText,
                          lineHeight: 16,
                          marginTop: 2,
                        }}
                      >
                        Please select your partner type
                      </Text>
                    )}
                  </Animated.View>
                )}

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

                {/* ── Company ── */}
                <View
                  style={{ gap: 8 }}
                  onLayout={(e) => {
                    fieldPositions.current['company'] = e.nativeEvent.layout.y;
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: errors.company
                        ? COLORS.errorText
                        : COLORS.primary,
                      lineHeight: 20,
                    }}
                  >
                    Company *
                  </Text>
                  <TextInput
                    value={company}
                    onChangeText={(val) =>
                      handleFieldChange('company', val, setCompany)
                    }
                    placeholder="Your company or brokerage"
                    placeholderTextColor={COLORS.placeholder}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({
                          y: (fieldPositions.current['company'] || 0) + 280,
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
                      borderColor: getBorderColor('company', !!company),
                      fontSize: 16,
                      fontWeight: '400',
                      color: COLORS.bodyText,
                    }}
                  />
                  {errors.company && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.errorText,
                        lineHeight: 16,
                        marginTop: 2,
                      }}
                    >
                      Please enter your company
                    </Text>
                  )}
                </View>

                {/* ── Service Area ── */}
                <View
                  style={{ gap: 8 }}
                  onLayout={(e) => {
                    fieldPositions.current['serviceArea'] =
                      e.nativeEvent.layout.y;
                  }}
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: errors.serviceArea
                        ? COLORS.errorText
                        : COLORS.primary,
                      lineHeight: 20,
                    }}
                  >
                    Service Area *
                  </Text>
                  <TextInput
                    value={serviceArea}
                    onChangeText={(val) =>
                      handleFieldChange('serviceArea', val, setServiceArea)
                    }
                    placeholder="City, State or ZIP code"
                    placeholderTextColor={COLORS.placeholder}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollTo({
                          y:
                            (fieldPositions.current['serviceArea'] || 0) + 280,
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
                      borderColor: getBorderColor(
                        'serviceArea',
                        !!serviceArea
                      ),
                      fontSize: 16,
                      fontWeight: '400',
                      color: COLORS.bodyText,
                    }}
                  />
                  {errors.serviceArea && (
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.errorText,
                        lineHeight: 16,
                        marginTop: 2,
                      }}
                    >
                      Please enter your service area
                    </Text>
                  )}
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

      {/* ── Sub-Role Dropdown Modal (partner only) ── */}
      <DropdownModal
        visible={showSubRoleDropdown}
        title={subRoleConfig.placeholder}
        options={subRoleConfig.options}
        selectedValue={selectedSubRole}
        onSelect={handleSubRoleSelect}
        onClose={() => setShowSubRoleDropdown(false)}
      />
    </SafeAreaView>
  );
};

export default OnboardingScreen3;