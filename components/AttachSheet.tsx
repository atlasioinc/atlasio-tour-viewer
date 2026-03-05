// AttachSheet.tsx
// ═══════════════════════════════════════════════════════════════
// Reusable Attach Bottom Sheet (166 lines)
// Slides up with Photo and Document options
// Used in: ChatScreen, DealChatScreen, RepairChatScreen
// @demo  Uses expo-image-picker + expo-document-picker (real APIs)
// @backend TODO: Upload selected files to Supabase Storage
// ═══════════════════════════════════════════════════════════════

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
} from 'react-native';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const PhotoIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Rect x={3} y={3} width={18} height={18} rx={2} stroke={COLORS.primary} strokeWidth={2} />
    <Circle cx={8.5} cy={8.5} r={1.5} stroke={COLORS.primary} strokeWidth={2} />
    <Path d="M21 15L16 10L5 21" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const DocumentIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M14 2V8H20" stroke={COLORS.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// ─────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────

interface AttachSheetProps {
  visible: boolean;
  onClose: () => void;
  onPhotoPress: () => void;
  onDocumentPress: () => void;
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

const AttachSheet: React.FC<AttachSheetProps> = ({
  visible,
  onClose,
  onPhotoPress,
  onDocumentPress,
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' }}
      >
        {/* Sheet */}
        <Animated.View
          style={{
            backgroundColor: COLORS.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingTop: 24,
            paddingHorizontal: 24,
            paddingBottom: 40,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Title */}
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.darkText, lineHeight: 28, marginBottom: 16 }}>
              Attach
            </Text>

            {/* Photo option */}
            <Pressable
              onPress={() => { onPhotoPress(); onClose(); }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 80,
                borderRadius: 14,
                gap: 16,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ width: 48, height: 48, borderRadius: 9999, backgroundColor: COLORS.iconTintBg, alignItems: 'center', justifyContent: 'center' }}>
                <PhotoIcon />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.darkText, lineHeight: 24 }}>
                  Photo
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20 }}>
                  Choose from gallery
                </Text>
              </View>
            </Pressable>

            {/* Document option */}
            <Pressable
              onPress={() => { onDocumentPress(); onClose(); }}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                height: 80,
                borderRadius: 14,
                gap: 16,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View style={{ width: 48, height: 48, borderRadius: 9999, backgroundColor: COLORS.iconTintBg, alignItems: 'center', justifyContent: 'center' }}>
                <DocumentIcon />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '400', color: COLORS.darkText, lineHeight: 24 }}>
                  Document
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '400', color: COLORS.secondaryText, lineHeight: 20 }}>
                  Browse files
                </Text>
              </View>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default AttachSheet;
