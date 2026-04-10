// ═══════════════════════════════════════════════════════════════
// components/shared/SkeletonBlock.tsx
// Reusable shimmer skeleton block — building block for all loading states
//
// What: Animated placeholder that sweeps a light bar across a gray block
// Who: All roles, all screens
// Where: Used inside screen-specific skeleton layouts during data loading
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, View, ViewStyle } from 'react-native';
import { COLORS } from '../../lib/tokens';

interface SkeletonBlockProps {
  width: DimensionValue;    // number for fixed px, string for '100%' etc.
  height: number;
  borderRadius?: number;    // default: 8
  style?: ViewStyle;        // optional extra styles (margin, etc.)
}

const SkeletonBlock: React.FC<SkeletonBlockProps> = ({
  width,
  height,
  borderRadius = 8,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 300,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();

    return () => shimmerAnim.stopAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: COLORS.skeletonBase,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 80,
          backgroundColor: COLORS.skeletonShimmer,
          transform: [{ translateX: shimmerAnim }],
        }}
      />
    </View>
  );
};

export default SkeletonBlock;
