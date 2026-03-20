// AnimatedProgressBar.tsx
// ═══════════════════════════════════════════════════════════════
// Shared animated progress bar for onboarding flow (91 lines)
// Props: { currentStep, totalSteps } — animates width on mount
// Used by all onboarding screens (supports dynamic 5/6 totals)
// @demo none  @backend none — pure UI component
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  primary: '#003DC3',
  primaryEnd: '#0052FF',
  stepText: '#6A7282',
  progressTrack: '#E5E7EB',
} as const;

interface AnimatedProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  currentStep,
  totalSteps,
}) => {
  // Start from previous step's percentage (or 0 if first screen)
  const previousPercent = ((currentStep - 1) / totalSteps) * 100;
  const currentPercent = (currentStep / totalSteps) * 100;

  // Animated value starts at previous step
  const animatedWidth = useRef(new Animated.Value(previousPercent)).current;

  useEffect(() => {
    // Small delay so the user sees the animation after the screen loads
    const timer = setTimeout(() => {
      Animated.timing(animatedWidth, {
        toValue: currentPercent,
        duration: 400,
        useNativeDriver: false, // width animation can't use native driver
      }).start();
    }, 200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- animated values are stable refs
  }, [currentStep]);

  // Convert animated value to a percentage string for width
  const animatedStyle = {
    width: animatedWidth.interpolate({
      inputRange: [0, 100],
      outputRange: ['0%', '100%'],
    }),
  };

  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '400',
          color: COLORS.stepText,
          lineHeight: 20,
        }}
      >
        {`${currentStep}/${totalSteps}`}
      </Text>
      <View
        style={{
          height: 6,
          backgroundColor: COLORS.progressTrack,
          borderRadius: 9999,
          overflow: 'hidden',
        }}
      >
        <Animated.View style={[{ height: 6, borderRadius: 9999 }, animatedStyle]}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 6,
              borderRadius: 9999,
              width: '100%',
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
};

export default AnimatedProgressBar;