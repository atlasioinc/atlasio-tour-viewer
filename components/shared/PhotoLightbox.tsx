// components/shared/PhotoLightbox.tsx
// ═══════════════════════════════════════════════════════════════
// WHAT: Full-screen photo lightbox — paging, counter, close button
// WHO: All roles — RepairJobDetails (agent) + ContractorJobDetails (contractor)
// WHERE: Rendered as a Modal sibling to any screen with a photo strip
//
// @demo none — pure presentational component
// @backend none — consumes photo URLs passed as props
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Image, Dimensions } from 'react-native';
import { COLORS } from '../../lib/tokens';

interface PhotoLightboxProps {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ visible, photos, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);
  const windowWidth = Dimensions.get('window').width;
  const windowHeight = Dimensions.get('window').height;

  // Reset to initialIndex each time the lightbox opens
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  if (photos.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* rgba(0,0,0,0.95) — true-black overlay, intentionally not a design token */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', justifyContent: 'center', alignItems: 'center' }}>
        {/* Counter "n / total" */}
        <Text
          style={{
            position: 'absolute',
            top: 60,
            alignSelf: 'center',
            zIndex: 10,
            fontSize: 14,
            fontWeight: '600',
            color: COLORS.background,
          }}
        >
          {currentIndex + 1} / {photos.length}
        </Text>

        {/* Close button — 44×44 touch target */}
        <Pressable
          onPress={onClose}
          style={({ pressed }) => ({
            position: 'absolute',
            top: 48,
            right: 12,
            zIndex: 10,
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ fontSize: 24, color: COLORS.background, fontWeight: '300', lineHeight: 28 }}>✕</Text>
        </Pressable>

        {/* Horizontally paginated viewer */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width);
            setCurrentIndex(index);
          }}
          contentOffset={{ x: initialIndex * windowWidth, y: 0 }}
          style={{ flex: 1 }}
        >
          {photos.map((uri, index) => (
            <View
              key={`${index}-${uri}`}
              style={{
                width: windowWidth,
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image
                source={{ uri }}
                style={{ width: windowWidth, height: windowHeight * 0.75 }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

export default PhotoLightbox;
