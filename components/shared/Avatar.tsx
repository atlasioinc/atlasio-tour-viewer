// What: Reusable avatar component — shows photo if available, colored initials fallback
// Who: All roles — agent, contractor, partner
// Where: Imported via components/shared/index.ts — used on ProfileTab, ProProfile,
//        ProCard, InboxList, InviteContractorsModal

import React, { useState } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS } from '../../lib/tokens';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size: number;
  color?: string;
  onPress?: () => void;
  showCameraOverlay?: boolean; // camera badge bottom-right, only when onPress present
  isUploading?: boolean;       // spinner overlay during upload
}

// S161: shared initials helper — first letter of first two words, uppercased.
// Exported for use in GroupAvatar (InboxList) and GroupAvatarGrid (DealChatScreen).
export const getInitials = (name: string): string =>
  (name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join('') || '?';

const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size,
  color = COLORS.primary,
  onPress,
  showCameraOverlay = false,
  isUploading = false,
}) => {
  const [imageError, setImageError] = useState(false);
  const hasImage = !!uri && !imageError;
  const initials = getInitials(name);

  const avatarContent = (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Avatar circle — image or initials fallback */}
      {hasImage ? (
        <Image
          source={{ uri }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          onError={() => setImageError(true)}
        />
      ) : (
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: size * 0.38, fontWeight: '600', color: COLORS.onPrimary }}>
            {initials}
          </Text>
        </View>
      )}

      {/* Upload spinner overlay */}
      {isUploading && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator color="#FFFFFF" size={size > 60 ? 'large' : 'small'} />
        </View>
      )}

      {/* Camera badge — bottom-right */}
      {showCameraOverlay && onPress && !isUploading && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 24,
            height: 24,
            borderRadius: 12,
            backgroundColor: COLORS.primary,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#FFFFFF',
          }}
        >
          <Svg width={12} height={12} viewBox="0 0 24 24" fill="none">
            <Path
              d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z"
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          </Svg>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {avatarContent}
      </Pressable>
    );
  }

  return avatarContent;
};

export default Avatar;
