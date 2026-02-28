// OnboardingScreen4.tsx
// ═══════════════════════════════════════════════════════════════
// Onboarding Screen 4 of 4 — "Verify Credentials"
// Document upload screen with optional file uploads and notes
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StatusBar,
  Platform,
  Alert,
  TouchableOpacity,
  Keyboard,              
  KeyboardAvoidingView,  
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import * as DocumentPicker from 'expo-document-picker';
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
  inputBorderActive: '#003DC3',
  placeholder: '#99A1AF',
  iconGradientStart: '#E8F0FE',
  iconGradientEnd: '#C2DBFF',
  error: '#DC2626',
} as const;

const FONTS = {
  logo: Platform.select({
    web: '"Radio Canada Big", "Inter", sans-serif',
    default: 'RadioCanadaBig-SemiBold',
  }),
} as const;

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const MAX_FILES = 2;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
];

// ─────────────────────────────────────────────
// FILE TYPE
// ─────────────────────────────────────────────
interface UploadedFile {
  name: string;
  uri: string;
  size: number;
  mimeType: string;
}

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

/** Shield icon — hero section */
const ShieldIcon: React.FC = () => (
  <Svg width={40} height={40} viewBox="0 0 40 40" fill="none">
    <Path
      d="M20 3.33L6.67 10V20C6.67 28.33 12.44 36.03 20 36.67C27.56 36.03 33.33 28.33 33.33 20V10L20 3.33Z"
      stroke={COLORS.primary}
      strokeWidth={3.33}
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

/** Upload icon for Choose Files button */
const UploadIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    {/* Tray */}
    <Path
      d="M2.5 12.5V15C2.5 15.92 3.25 16.67 4.17 16.67H15.83C16.75 16.67 17.5 15.92 17.5 15V12.5"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* Arrow up */}
    <Path
      d="M10 12.5V2.5"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M6.67 5.83L10 2.5L13.33 5.83"
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
// NAVIGATION TYPES
// ─────────────────────────────────────────────

type RootStackParamList = {
  Onboarding1: undefined;
  Onboarding2: undefined;
  Onboarding3: undefined;
  Onboarding4: { role: string };
  OnboardingComplete: { role: string };
};

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding4'>;
  route: RouteProp<RootStackParamList, 'Onboarding4'>;
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const OnboardingScreen4: React.FC<Props> = ({ navigation, route }) => {
  const { role } = route.params;
  // ── State ──
  const scrollViewRef = useRef<ScrollView>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [additionalNotes, setAdditionalNotes] = useState<string>('');

  // ── File Picker ──
  const handleChooseFiles = async (): Promise<void> => {
    if (uploadedFiles.length >= MAX_FILES) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Maximum files reached',
        `You can only upload up to ${MAX_FILES} documents.`
      );
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ACCEPTED_TYPES,
        copyToCacheDirectory: true,
        multiple: false,
      });

      // User cancelled
      if (result.canceled) return;

      const file = result.assets[0];

      // Check file size
      if (file.size && file.size > MAX_FILE_SIZE_BYTES) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
          'File too large',
          `Please choose a file under ${MAX_FILE_SIZE_MB}MB.`
        );
        return;
      }

      // Check for duplicate
      const isDuplicate = uploadedFiles.some(
        (existing) => existing.name === file.name
      );
      if (isDuplicate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert(
          'Duplicate file',
          'This file has already been uploaded.'
        );
        return;
      }

      // Add file
      const newFile: UploadedFile = {
        name: file.name,
        uri: file.uri,
        size: file.size || 0,
        mimeType: file.mimeType || '',
      };

      setUploadedFiles((prev) => [...prev, newFile]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log('Document picker error:', error);
    }
  };

  // ── Remove File ──
  const handleRemoveFile = (fileName: string): void => {
    setUploadedFiles((prev) =>
      prev.filter((file) => file.name !== fileName)
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Complete Setup ──
    const handleCompleteSetup = (): void => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    console.log('Setup complete:', {
      role,
      uploadedFiles: uploadedFiles.map((f) => f.name),
      additionalNotes,
    });

    navigation.navigate('OnboardingComplete', { role });

  };

            // ── Skip ──
            const handleSkip = (): void => {
                console.log('Skipped credential upload');
                navigation.navigate('OnboardingComplete', { role });
            };

            // ── Back ──
            const handleBackPress = (): void => {
                navigation.goBack();
            };

            return (
                <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
                <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

                

                    <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
              <AnimatedProgressBar currentStep={4} totalSteps={4} />
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
              <ShieldIcon />
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
              Verify Credentials
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
              Upload your credentials to complete your profile (optional)
            </Text>

            {/* ── Form Section ── */}
            <View
              style={{
                width: '100%',
                paddingHorizontal: 20,
                gap: 16,
              }}
            >
              {/* ── Upload Documents ── */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: COLORS.primary,
                    lineHeight: 20,
                  }}
                >
                  {`Upload Documents (up to ${MAX_FILES})`}
                </Text>

                {/* ── Uploaded Files List ── */}
                {uploadedFiles.map((file) => (
                  <View
                    key={file.name}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      backgroundColor: COLORS.cardBg,
                      borderRadius: 14,
                      borderWidth: 1.38,
                      borderColor: COLORS.inputBorder,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '400',
                        color: COLORS.bodyText,
                        flex: 1,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                    >
                      {file.name}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveFile(file.name)}
                      style={({ pressed }) => ({
                        marginLeft: 12,
                        opacity: pressed ? 0.5 : 1,
                      })}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: COLORS.primary,
                        }}
                      >
                        Remove
                      </Text>
                    </Pressable>
                  </View>
                ))}

                {/* ── Choose Files Button (hide when max reached) ── */}
                {uploadedFiles.length < MAX_FILES && (
                  <Pressable
                    onPress={handleChooseFiles}
                    style={({ pressed }) => ({
                      height: 58,
                      backgroundColor: COLORS.cardBg,
                      borderRadius: 14,
                      borderWidth: 1.38,
                      borderColor: COLORS.inputBorderActive,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    })}
                  >
                    <UploadIcon />
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: '600',
                        color: COLORS.primary,
                        lineHeight: 24,
                      }}
                    >
                      Choose Files
                    </Text>
                  </Pressable>
                )}

                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '400',
                    color: COLORS.stepText,
                    lineHeight: 16,
                  }}
                >
                  Accepted: PDF, JPG, PNG (Max 5MB each)
                </Text>
              </View>

              {/* ── Additional Notes ── */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: COLORS.primary,
                    lineHeight: 20,
                  }}
                >
                  Additional Notes
                </Text>
                <TextInput
                    value={additionalNotes}
                    onChangeText={setAdditionalNotes}
                    placeholder="Any additional information you'd like to share..."
                    placeholderTextColor={COLORS.placeholder}
                    multiline={true}
                    numberOfLines={4}
                    textAlignVertical="top"
                    blurOnSubmit={true}
                    returnKeyType="done"
                    onSubmitEditing={() => Keyboard.dismiss()}
                    onFocus={() => {
                        setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                        }, 300);
                    }}
                    style={{
                        height: 122,
                        paddingHorizontal: 16,
                        paddingTop: 12,
                        paddingBottom: 12,
                        backgroundColor: COLORS.cardBg,
                        borderRadius: 14,
                        borderWidth: 1.38,
                        borderColor: additionalNotes
                        ? COLORS.inputBorderActive
                        : COLORS.inputBorder,
                        fontSize: 16,
                        fontWeight: '400',
                        color: COLORS.bodyText,
                        lineHeight: 24,
                    }}
                    />
              </View>

              {/* ── Skip for now ── */}
              <Pressable
                onPress={handleSkip}
                style={({ pressed }) => ({
                  height: 44,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Text
                  style={{
                    textAlign: 'center',
                    fontSize: 14,
                    fontWeight: '600',
                    color: COLORS.primary,
                    lineHeight: 20,
                  }}
                >
                  {`Skip for now \u2192`}
                </Text>
              </Pressable>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OnboardingScreen4;