// GroupAvatar.tsx
// ═══════════════════════════════════════════════════════════════
// Shared Group Avatar — overlap stack for multi-member threads
// Used by: InboxList (agent), ContractorInboxList (contractor/partner)
//
// S162c: extracted from InboxList.tsx inline GroupAvatar so contractor
// and partner Inbox surfaces can render the same multi-avatar cluster
// on deal_chat rows. Photo support added — each tile falls back to
// colored initials when uri is null/missing/fails to load (via shared
// Avatar's built-in onError fallback).
//
// Behavior:
//   1 member  → full-size shared Avatar
//   2 members → two 28px circles, offset 14px
//   3 members → three 24px circles, offset 12px
//   0 members → empty container of requested size
//   Cap at 3 shown.
//
// Online dot renders bottom-right when isOnline is true.
// ═══════════════════════════════════════════════════════════════

import React from 'react';
import { View } from 'react-native';
import { COLORS } from '../../lib/tokens';
import Avatar from './Avatar';

export interface GroupAvatarMember {
  name: string;
  color: string;
  uri?: string | null;
}

export interface GroupAvatarProps {
  members: GroupAvatarMember[];
  size?: number;
  isOnline?: boolean;
}

const GroupAvatar: React.FC<GroupAvatarProps> = ({ members, size = 48, isOnline }) => {
  const shown = members.slice(0, 3);

  if (shown.length === 0) {
    return <View style={{ width: size, height: size, position: 'relative' }} />;
  }

  if (shown.length === 1) {
    const m = shown[0];
    return (
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Avatar uri={m.uri ?? null} name={m.name} size={size} color={m.color} />
        {isOnline && (
          <View
            style={{
              position: 'absolute',
              bottom: -1,
              right: -1,
              width: 12,
              height: 12,
              borderRadius: 9999,
              backgroundColor: COLORS.onlineGreen,
              borderWidth: 1.5,
              borderColor: COLORS.background,
            }}
          />
        )}
      </View>
    );
  }

  const circleSize = shown.length === 2 ? 28 : 24;
  const offset = shown.length === 2 ? 14 : 12;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {shown.map((m, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: i * offset,
            top: (size - circleSize) / 2,
            width: circleSize,
            height: circleSize,
            borderRadius: 9999,
            borderWidth: 1.5,
            borderColor: COLORS.background,
            overflow: 'hidden',
            zIndex: shown.length - i,
            elevation: shown.length - i,
          }}
        >
          <Avatar uri={m.uri ?? null} name={m.name} size={circleSize} color={m.color} />
        </View>
      ))}
      {isOnline && (
        <View
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: 12,
            height: 12,
            borderRadius: 9999,
            backgroundColor: COLORS.onlineGreen,
            borderWidth: 1.5,
            borderColor: COLORS.background,
            zIndex: shown.length + 1,
            elevation: shown.length + 1,
          }}
        />
      )}
    </View>
  );
};

export default GroupAvatar;
