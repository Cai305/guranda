import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchApi } from '../utils/api';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, GRADIENTS } from '../theme';

interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  effectiveStatus: string | null;
}

interface FollowStats {
  followers: number;
  following: number;
  isFollowing: boolean;
}

export default function UserProfileScreen({ route, navigation }: any) {
  const { userId, username: initialUsername, avatarUrl: initialAvatar } = route.params || {};
  const { user: me } = useAuth();
  const { socket, onlineUsers } = useSocket();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0, isFollowing: false });
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const isOnline = onlineUsers[userId] === 'online';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, statsRes] = await Promise.all([
          fetchApi(`/users/${userId}/public-profile`),
          fetchApi(`/users/${userId}/follow-stats`),
        ]);
        if (profileRes.ok) setProfile(await profileRes.json());
        if (statsRes.ok) setFollowStats(await statsRes.json());
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      const res = await fetchApi(`/users/${userId}/follow`, { method: 'POST' });
      if (res.ok) {
        setFollowStats(prev => ({
          ...prev,
          isFollowing: !prev.isFollowing,
          followers: prev.isFollowing ? prev.followers - 1 : prev.followers + 1,
        }));
      }
    } catch {
      Alert.alert('Error', 'Could not update follow status');
    } finally {
      setFollowLoading(false);
    }
  };

  const handleMessage = async () => {
    // Find or create a direct chat with this user then navigate
    try {
      const res = await fetchApi('/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (res.ok) {
        const chat = await res.json();
        navigation.navigate('ChatRoom', {
          roomId: chat.id,
          roomName: profile?.displayName || profile?.username || initialUsername || 'User',
          roomType: 'DIRECT',
          targetUserId: userId,
        });
      }
    } catch {
      Alert.alert('Error', 'Could not open chat');
    }
  };

  const handleCall = (video: boolean) => {
    if (!socket || !me?.userId) return;
    socket.emit('call_invite', {
      callerId: me.userId,
      callerName: me.displayName || me.username,
      targetUserId: userId,
      video,
    });
  };

  const displayName = profile?.displayName || profile?.username || initialUsername || 'User';
  const avatarUri = profile?.avatarUrl || initialAvatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${displayName}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.text} />
      </TouchableOpacity>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : (
          <>
            {/* ===== Identity header ===== */}
            <LinearGradient
              colors={GRADIENTS.midnight}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.identityCard}
            >
              <View style={styles.avatarWrap}>
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
                {/* Online dot */}
                <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#22C55E' : '#6B7280' }]} />
              </View>

              <Text style={styles.displayName}>{displayName}</Text>
              <Text style={styles.username}>@{profile?.username || initialUsername}</Text>

              {!!(profile?.effectiveStatus || profile?.bio) && (
                <Text style={styles.statusLine} numberOfLines={3}>
                  {profile?.effectiveStatus || profile?.bio}
                </Text>
              )}

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{followStats.followers}</Text>
                  <Text style={styles.statLabel}>Followers</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{followStats.following}</Text>
                  <Text style={styles.statLabel}>Following</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <View style={[styles.onlinePill, { backgroundColor: isOnline ? 'rgba(34,197,94,0.15)' : 'rgba(107,114,128,0.15)' }]}>
                    <View style={[styles.onlinePillDot, { backgroundColor: isOnline ? '#22C55E' : '#6B7280' }]} />
                    <Text style={[styles.onlinePillText, { color: isOnline ? '#22C55E' : '#6B7280' }]}>
                      {isOnline ? 'Online' : 'Offline'}
                    </Text>
                  </View>
                </View>
              </View>
            </LinearGradient>

            {/* ===== Action buttons ===== */}
            {me?.userId !== userId && (
              <View style={styles.actionRow}>
                {/* Follow / Unfollow */}
                <TouchableOpacity
                  style={[styles.actionBtn, followStats.isFollowing && styles.actionBtnOutline]}
                  onPress={handleFollow}
                  disabled={followLoading}
                >
                  {followLoading
                    ? <ActivityIndicator color={followStats.isFollowing ? COLORS.primary : '#FFF'} size="small" />
                    : <>
                        <Ionicons
                          name={followStats.isFollowing ? 'person-remove-outline' : 'person-add-outline'}
                          size={16}
                          color={followStats.isFollowing ? COLORS.primary : '#FFF'}
                        />
                        <Text style={[styles.actionBtnText, followStats.isFollowing && { color: COLORS.primary }]}>
                          {followStats.isFollowing ? 'Unfollow' : 'Follow'}
                        </Text>
                      </>
                  }
                </TouchableOpacity>

                {/* Message */}
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnOutline]} onPress={handleMessage}>
                  <Ionicons name="chatbubble-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.actionBtnText, { color: COLORS.primary }]}>Message</Text>
                </TouchableOpacity>

                {/* Voice call */}
                <TouchableOpacity
                  style={[styles.actionBtnIcon, styles.actionBtnOutline]}
                  onPress={() => handleCall(false)}
                >
                  <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>

                {/* Video call */}
                <TouchableOpacity
                  style={[styles.actionBtnIcon, styles.actionBtnOutline]}
                  onPress={() => handleCall(true)}
                >
                  <Ionicons name="videocam-outline" size={18} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            )}

            {/* ===== Bio card ===== */}
            {profile?.bio ? (
              <>
                <Text style={styles.sectionLabel}>ABOUT</Text>
                <View style={styles.card}>
                  <Text style={styles.bioText}>{profile.bio}</Text>
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backBtn: {
    padding: 12,
    paddingLeft: SPACING.lg,
  },
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  identityCard: {
    margin: SPACING.lg,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    alignItems: 'center',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  displayName: {
    ...TYPOGRAPHY.h2,
    textAlign: 'center',
  },
  username: {
    ...TYPOGRAPHY.body2,
    textAlign: 'center',
    marginTop: 2,
  },
  statusLine: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 10,
    marginTop: 2,
  },
  onlinePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  onlinePillDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  onlinePillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
  },
  actionBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  actionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13.5,
  },
  actionBtnIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  card: {
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  bioText: {
    color: COLORS.text,
    fontSize: 14.5,
    lineHeight: 22,
  },
});
