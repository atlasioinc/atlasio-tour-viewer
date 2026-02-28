// PortfolioGallery.tsx
// ═══════════════════════════════════════════════════════════════
// Reusable Portfolio Gallery Component
// Shows a large photo viewer + horizontal thumbnail strip
// Role-gated: Only renders for Contractor, Home Stager,
//   Real Estate Photographer roles
// Max 8 photos enforced. Own-profile shows upload prompt.
//
// Props:
//   photos: string[]       — image URLs (max 8)
//   isOwnProfile: boolean  — shows '+' upload button if true
//   role: string           — gates visibility
//
// Usage:
//   <PortfolioGallery
//     photos={profile.portfolio_photos}
//     isOwnProfile={profile.is_own_profile}
//     role={profile.trade}
//   />
//
// Production upgrade path:
//   1. Wire onAddPhoto to Supabase Storage upload
//   2. Wire onRemovePhoto to delete from storage + DB
//   3. Add drag-to-reorder with react-native-reanimated
//   4. Add full-screen modal viewer (post-MVP)
// ═══════════════════════════════════════════════════════════════

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  Dimensions,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const MAX_PHOTOS = 8;
const THUMBNAIL_SIZE = 64;
const THUMBNAIL_GAP = 8;
const THUMBNAIL_RADIUS = 10;
const LARGE_IMAGE_RADIUS = 16;
const LARGE_IMAGE_HEIGHT = 240;
const SECTION_PADDING_H = 24;
const SECTION_PADDING_V = 16;

// Roles that show the Portfolio section
const GALLERY_ROLES = ['Contractor', 'Home Stager', 'Real Estate Photographer'];

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

/** Camera icon — matches Figma: 20×20, primary blue */
const CameraIcon: React.FC = () => (
  <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
    <Path
      d="M19.17 15.83a1.67 1.67 0 0 1-1.67 1.67H2.5a1.67 1.67 0 0 1-1.67-1.67V6.67A1.67 1.67 0 0 1 2.5 5h3.33L7.5 2.5h5L14.17 5H17.5a1.67 1.67 0 0 1 1.67 1.67v9.16Z"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M10 13.33a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
      stroke={COLORS.primary}
      strokeWidth={1.67}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

/** Plus icon for upload prompt — 24×24, secondaryText */
const PlusIcon: React.FC = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19M5 12H19"
      stroke={COLORS.secondaryText}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

// ─────────────────────────────────────────────
// PROPS INTERFACE
// ─────────────────────────────────────────────

export interface PortfolioGalleryProps {
  /** Array of image URLs (max 8 enforced) */
  photos: string[];
  /** If true, shows upload '+' button and edit affordances */
  isOwnProfile: boolean;
  /** Pro's role/trade — gallery only renders for GALLERY_ROLES */
  role: string;
  /** Optional callback when user taps '+' to add photo */
  onAddPhoto?: () => void;
  /** Optional callback when user taps to remove a photo (own profile) */
  onRemovePhoto?: (index: number) => void;
}

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────

const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  photos,
  isOwnProfile,
  role,
  onAddPhoto,
  onRemovePhoto,
}) => {
  // ── Role gate: don't render if role isn't eligible ──
  if (!role) return null;
  const isGalleryRole = GALLERY_ROLES.some(
    (r) => r.toLowerCase() === role.toLowerCase()
  );
  if (!isGalleryRole) return null;

  // ── Enforce max 8 photos ──
  const displayPhotos = photos.slice(0, MAX_PHOTOS);
  const photoCount = displayPhotos.length;
  const hasPhotos = photoCount > 0;

  // ── State: which photo is selected for large view ──
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const flatListRef = useRef<FlatList>(null);
  const largeListRef = useRef<FlatList>(null);

  // ── Large photo swipe handler ──
  const handleLargePhotoScroll = (e: any): void => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const containerWidth = e.nativeEvent.layoutMeasurement.width;
    const newIndex = Math.round(contentOffsetX / containerWidth);
    if (newIndex >= 0 && newIndex < photoCount && newIndex !== selectedIndex) {
      setSelectedIndex(newIndex);
      // Sync thumbnail strip
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  };

  // ── Thumbnail press handler ──
  const handleThumbnailPress = (index: number): void => {
    setSelectedIndex(index);
    // Scroll large photo viewer to match
    largeListRef.current?.scrollToIndex({
      index,
      animated: true,
    });
    // Scroll thumbnail strip to keep selected item visible
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
      viewPosition: 0.5,
    });
  };

  // ── EMPTY STATE (own profile, no photos) ──
  if (!hasPhotos && isOwnProfile) {
    return (
      <View
        style={{
          paddingHorizontal: SECTION_PADDING_H,
          paddingVertical: SECTION_PADDING_V,
          backgroundColor: COLORS.background,
          borderRadius: 16,
          gap: 16,
        }}
      >
        {/* Section Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <CameraIcon />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: COLORS.darkText,
                lineHeight: 24,
              }}
            >
              Portfolio
            </Text>
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '400',
              color: COLORS.secondaryText,
              lineHeight: 20,
            }}
          >
            0 / {MAX_PHOTOS}
          </Text>
        </View>

        {/* Empty state prompt */}
        <Pressable
          onPress={onAddPhoto}
          style={({ pressed }) => ({
            height: LARGE_IMAGE_HEIGHT,
            backgroundColor: COLORS.screenBg,
            borderRadius: LARGE_IMAGE_RADIUS,
            borderWidth: 1.5,
            borderColor: COLORS.border,
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 9999,
              backgroundColor: COLORS.background,
              borderWidth: 0.68,
              borderColor: COLORS.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PlusIcon />
          </View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '500',
              color: COLORS.bodyText,
              lineHeight: 20,
              textAlign: 'center',
            }}
          >
            Add up to {MAX_PHOTOS} portfolio photos
          </Text>
          <Text
            style={{
              fontSize: 12,
              fontWeight: '400',
              color: COLORS.secondaryText,
              lineHeight: 16,
              textAlign: 'center',
            }}
          >
            Showcase your best work
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── No photos + not own profile: don't render anything ──
  if (!hasPhotos) return null;

  // ── FILLED STATE: Large viewer + thumbnail strip ──
  return (
    <View
      style={{
        paddingHorizontal: SECTION_PADDING_H,
        paddingVertical: SECTION_PADDING_V,
        backgroundColor: COLORS.background,
        borderRadius: 16,
        gap: 16,
      }}
    >
      {/* ── Section Header: Icon + "Portfolio" + "X / 8" ── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <CameraIcon />
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: COLORS.darkText,
              lineHeight: 24,
            }}
          >
            Portfolio
          </Text>
        </View>
        <Text
          style={{
            fontSize: 14,
            fontWeight: '400',
            color: COLORS.secondaryText,
            lineHeight: 20,
          }}
        >
          {selectedIndex + 1} / {photoCount}
        </Text>
      </View>

      {/* ── Large Photo Viewer (swipeable) ── */}
      <View
        style={{
          marginHorizontal: -16,
          paddingHorizontal: 8,
        }}
      >
        <View
          style={{
            height: LARGE_IMAGE_HEIGHT,
            borderRadius: LARGE_IMAGE_RADIUS,
            overflow: 'hidden',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          <FlatList
            ref={largeListRef}
            data={displayPhotos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleLargePhotoScroll}
            keyExtractor={(_, index) => `large-${index}`}
            getItemLayout={(_, index) => ({
              length: Dimensions.get('window').width - 16,
              offset: (Dimensions.get('window').width - 16) * index,
              index,
            })}
            renderItem={({ item }) => (
              <Image
                source={{ uri: item }}
                style={{
                  width: Dimensions.get('window').width - 16,
                  height: LARGE_IMAGE_HEIGHT,
                }}
                resizeMode="cover"
              />
            )}
          />
        </View>
      </View>

      {/* ── Thumbnail Strip ── */}
      <View style={{ height: THUMBNAIL_SIZE + 4, marginHorizontal: -16, paddingHorizontal: 8 }}>
        <FlatList
          ref={flatListRef}
          data={
            // If own profile and under max, append a '+' slot
            isOwnProfile && photoCount < MAX_PHOTOS
              ? [...displayPhotos, '__ADD__']
              : displayPhotos
          }
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item, index) =>
            item === '__ADD__' ? 'add-photo' : `thumb-${index}`
          }
          contentContainerStyle={{ gap: THUMBNAIL_GAP }}
          // Snap to each thumbnail for smooth swiping
          snapToInterval={THUMBNAIL_SIZE + THUMBNAIL_GAP}
          decelerationRate="fast"
          getItemLayout={(_, index) => ({
            length: THUMBNAIL_SIZE + THUMBNAIL_GAP,
            offset: (THUMBNAIL_SIZE + THUMBNAIL_GAP) * index,
            index,
          })}
          renderItem={({ item, index }) => {
            // ── '+' Add Photo button (own profile only) ──
            if (item === '__ADD__') {
              return (
                <Pressable
                  onPress={onAddPhoto}
                  style={({ pressed }) => ({
                    width: THUMBNAIL_SIZE,
                    height: THUMBNAIL_SIZE,
                    borderRadius: THUMBNAIL_RADIUS,
                    borderWidth: 1.35,
                    borderColor: COLORS.border,
                    borderStyle: 'dashed',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: COLORS.screenBg,
                    opacity: pressed ? 0.6 : 0.7,
                  })}
                >
                  <PlusIcon />
                </Pressable>
              );
            }

            // ── Photo thumbnail ──
            const isSelected = index === selectedIndex;
            return (
              <Pressable
                onPress={() => handleThumbnailPress(index)}
                style={({ pressed }) => ({
                  width: THUMBNAIL_SIZE,
                  height: THUMBNAIL_SIZE,
                  borderRadius: THUMBNAIL_RADIUS,
                  overflow: 'hidden',
                  borderWidth: 1.35,
                  borderColor: isSelected ? COLORS.primary : COLORS.border,
                  opacity: pressed ? 0.5 : isSelected ? 1 : 0.7,
                  // Subtle shadow on thumbnails
                  shadowColor: '#000000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                })}
              >
                <Image
                  source={{ uri: item as string }}
                  style={{
                    width: THUMBNAIL_SIZE,
                    height: THUMBNAIL_SIZE,
                  }}
                  resizeMode="cover"
                />
              </Pressable>
            );
          }}
        />
      </View>
    </View>
  );
};

export default PortfolioGallery;
