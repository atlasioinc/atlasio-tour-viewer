// ═══════════════════════════════════════════════════════════════
// components/shared/ErrorToast.tsx
// Error toast overlay — appears at bottom of screen, auto-dismisses after 4s
//
// What: Animated error notification with optional retry button
// Who: All roles, all screens
// Where: Rendered at root level of screens that have live data hooks
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import { COLORS } from '../../lib/tokens';

interface ErrorToastProps {
  message: string;
  onRetry?: () => void;
  onDismiss: () => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ message, onRetry, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      speed: 20,
      bounciness: 4,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }, 4000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: 24,
        left: 16,
        right: 16,
        backgroundColor: COLORS.dangerText,
        borderRadius: 12,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        transform: [{ translateY: slideAnim }],
        opacity: fadeAnim,
        zIndex: 9999,
      }}
    >
      <Text style={{
        flex: 1,
        color: COLORS.sentText,
        fontSize: 14,
        lineHeight: 20,
      }}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable onPress={onRetry} style={{ marginLeft: 12 }}>
          <Text style={{
            color: COLORS.sentText,
            fontSize: 14,
            fontWeight: '600',
          }}>
            Retry
          </Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
};

export default ErrorToast;
