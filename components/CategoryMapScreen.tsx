// CategoryMapScreen.tsx
// ═══════════════════════════════════════════════════════════════
// WHO:   Agent
// WHERE: HomeStack → fullScreenModal from NeighborhoodMatchScreen 'See on map' row
// WHAT:  Full-screen map scoped to ONE lifestyle category. Address pin + POI pins.
//        Tapping a pin shows bottom card with place details.
// RECEIVES: { category, label, emoji, pois: POIResult[], addressLat, addressLng, address }
//
// @demo  MapView renders with mock POI coordinates from MOCK_POIS
//        No API key required for basic tiles in Expo Go
// @backend Add GOOGLE_MAPS_API_KEY to app.json / EAS secrets before native build
// ═══════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from './HomeStack';
import type { POIResult, LifestyleCategory } from '../types/neighborhood';
import { COLORS } from '../lib/tokens';

// ─────────────────────────────────────────────
// SVG ICONS
// ─────────────────────────────────────────────

const CloseIcon = ({ size = 24, color = COLORS.darkText }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const StarIcon = ({ size = 14, color = '#FFB900' }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 14 14" fill={color}>
    <Path d="M7 1l1.76 3.57L12.5 5.2l-2.75 2.68.65 3.79L7 9.84 3.6 11.67l.65-3.79L1.5 5.2l3.74-.63L7 1z" />
  </Svg>
);

// ─────────────────────────────────────────────
// PIN COLOR MAP
// ─────────────────────────────────────────────

const PIN_COLORS: Partial<Record<LifestyleCategory, string>> = {
  coffee: '#78350F',
  yoga: '#6D28D9',
  parks: '#065F46',
  gym: '#1D4ED8',
  grocery: '#065F46',
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════

const CategoryMapScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  const route = useRoute<RouteProp<HomeStackParamList, 'CategoryMapScreen'>>();
  const insets = useSafeAreaInsets();
  const { label, emoji, pois, addressLat, addressLng } = route.params;

  const [selectedPOI, setSelectedPOI] = useState<POIResult | null>(null);

  const pinColor = PIN_COLORS[route.params.category] ?? COLORS.primary;
  const minDist = pois.length > 0 ? Math.min(...pois.map(p => p.distanceMi)).toFixed(1) : '—';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top']}>
      {/* ── Header ── */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, height: 48,
        borderBottomWidth: 0.69, borderBottomColor: COLORS.border,
      }}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <CloseIcon size={20} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600', color: COLORS.darkText }}>
          {emoji} {label}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Map ── */}
      <View style={{ flex: 1 }}>
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: addressLat,
            longitude: addressLng,
            latitudeDelta: 0.018,
            longitudeDelta: 0.018,
          }}
          onPress={() => setSelectedPOI(null)}
        >
          {/* Address marker */}
          <Marker
            coordinate={{ latitude: addressLat, longitude: addressLng }}
            title="From here"
            zIndex={10}
          >
            <View style={{
              width: 32, height: 32, borderRadius: 16,
              backgroundColor: COLORS.primary,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF' }} />
            </View>
          </Marker>

          {/* POI markers */}
          {pois.map((poi, idx) => (
            <Marker
              key={`poi-${idx}`}
              coordinate={{ latitude: poi.lat, longitude: poi.lng }}
              pinColor={pinColor}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedPOI(poi);
              }}
            />
          ))}
        </MapView>

        {/* ── Selected POI bottom card ── */}
        {selectedPOI && (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: COLORS.background,
            borderTopLeftRadius: 16, borderTopRightRadius: 16,
            paddingHorizontal: 20, paddingTop: 16,
            paddingBottom: 32 + insets.bottom,
            shadowColor: '#000', shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1, shadowRadius: 8, elevation: 8,
          }}>
            {/* Close button */}
            <Pressable
              onPress={() => setSelectedPOI(null)}
              style={{
                position: 'absolute', top: 12, right: 16,
                width: 36, height: 36, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <CloseIcon size={18} color={COLORS.secondaryText} />
            </Pressable>

            <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.darkText, marginBottom: 4, paddingRight: 40 }}>
              {selectedPOI.name}
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.secondaryText, marginBottom: 4 }}>
              {selectedPOI.distanceMi.toFixed(1)} mi away
            </Text>
            {selectedPOI.rating != null && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <StarIcon />
                <Text style={{ fontSize: 14, color: COLORS.bodyText }}>
                  {selectedPOI.rating} rating
                </Text>
              </View>
            )}
            <View style={{
              marginTop: 10, alignSelf: 'flex-start',
              backgroundColor: COLORS.tagBg, borderRadius: 999,
              paddingHorizontal: 10, paddingVertical: 4,
              borderWidth: 1, borderColor: COLORS.border,
            }}>
              <Text style={{ fontSize: 12, fontWeight: '500', color: COLORS.bodyText }}>
                {emoji} {label}
              </Text>
            </View>
          </View>
        )}

        {/* ── Bottom summary bar (when no POI selected) ── */}
        {!selectedPOI && (
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            backgroundColor: COLORS.background,
            borderTopWidth: 0.69, borderTopColor: COLORS.border,
            padding: 16, paddingBottom: 16 + insets.bottom,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '500', color: COLORS.bodyText, textAlign: 'center' }}>
              {pois.length} {label} within 0.5mi  ·  Closest: {minDist}mi
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default CategoryMapScreen;
