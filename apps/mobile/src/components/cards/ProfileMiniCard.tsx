import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { useThemedStyles } from '../../theme/useThemedStyles';

export interface ProfileCardData {
  userId: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export const PROFILE_CARD_TAG = '__profileCard';

export function encodeProfileCard(data: ProfileCardData): string {
  return JSON.stringify({ [PROFILE_CARD_TAG]: true, ...data });
}

export function decodeProfileCard(content: string): ProfileCardData | null {
  try {
    if (!content.includes(PROFILE_CARD_TAG)) return null;
    const parsed = JSON.parse(content);
    if (!parsed[PROFILE_CARD_TAG]) return null;
    const { [PROFILE_CARD_TAG]: _tag, ...rest } = parsed;
    return rest as ProfileCardData;
  } catch {
    return null;
  }
}

export default function ProfileMiniCard({ profile, navigation }: { profile: ProfileCardData; navigation?: any }) {
  const styles = useThemedStyles(({ COLORS, RADIUS }) => ({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: 'rgba(15,15,25,0.97)',
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.25)',
      padding: 12,
      minWidth: 220,
      maxWidth: 280,
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surface },
    info: { flex: 1, minWidth: 0 },
    name: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    username: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },
    viewBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.35)',
      backgroundColor: 'rgba(139,92,246,0.08)',
    },
    viewBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },
  }));

  return (
    <View style={styles.card}>
      <Image
        source={{ uri: profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${profile.username}` }}
        style={styles.avatar}
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{profile.displayName || profile.username}</Text>
        <Text style={styles.username} numberOfLines={1}>@{profile.username}</Text>
      </View>
      <TouchableOpacity
        style={styles.viewBtn}
        onPress={() => navigation?.navigate('UserProfile', { userId: profile.userId, username: profile.username, avatarUrl: profile.avatarUrl })}
      >
        <Text style={styles.viewBtnText}>View</Text>
      </TouchableOpacity>
    </View>
  );
}
