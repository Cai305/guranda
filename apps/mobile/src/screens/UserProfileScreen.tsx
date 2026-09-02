import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { formatLastSeen } from '../utils/format';
import { encodeProfileCard } from '../components/cards/ProfileMiniCard';

interface RelationshipInfo {
  status: string;
  partner: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
}

interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  effectiveStatus: string | null;
  lastSeenAt: string | null;
  rating: number;
  league: string;
  leaguePosition: number;
  leagueSize: number;
  relationship: RelationshipInfo | null;
}

// Bronze/Silver/Gold/Platinum/Diamond/Legendary — same names as the Couples
// rank tiers (relationships.service.ts), applied to individual reputation.
// "Unranked" is the floor tier (reputation.util.ts leagueForReputation).
const LEAGUE_COLORS: Record<string, string> = {
  'Legendary League': '#F472B6',
  'Diamond League': '#22D3EE',
  'Platinum League': '#A78BFA',
  'Gold League': '#FBBF24',
  'Silver League': '#9CA3AF',
  'Bronze League': '#CD7F32',
  Unranked: '#6B7280',
};


interface FollowStats {
  followers: number;
  following: number;
  isFollowing: boolean;
}

export default function UserProfileScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  // `uid` is how a shared-profile deep link (lifeos://profile/:username?uid=)
  // carries the real id — see App.tsx's linking config and handleShareViaLink
  // below, mirrors AddContactScreen's own ?uid= convention.
  const { userId: routeUserId, uid, username: initialUsername, avatarUrl: initialAvatar } = route.params || {};
  const userId = routeUserId || uid;
  const { user: me } = useAuth();
  const { socket, onlineUsers, activityLabels } = useSocket();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [followStats, setFollowStats] = useState<FollowStats>({ followers: 0, following: 0, isFollowing: false });
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [profileBlocked, setProfileBlocked] = useState(false);

  // Share Profile sheet
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [showChatPicker, setShowChatPicker] = useState(false);
  const [shareChats, setShareChats] = useState<any[]>([]);
  const [shareChatsLoading, setShareChatsLoading] = useState(false);

  // Long-press action tray — Block User, and (when the caller has an active
  // relationship partner) Share this chat with partner.
  const [showActionTray, setShowActionTray] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const [relationshipPartner, setRelationshipPartner] = useState<any>(null);
  const [sharingChat, setSharingChat] = useState(false);

  const presenceStatus = onlineUsers[userId];
  const isOnline = presenceStatus === 'online';
  const isBusy = presenceStatus === 'busy' || presenceStatus === 'away';
  const presenceLabel = isOnline
    ? 'Online'
    : isBusy
      ? (activityLabels[userId] || 'Busy')
      : formatLastSeen(profile?.lastSeenAt ?? null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [profileRes, statsRes] = await Promise.all([
          fetchApi(`/users/${userId}/public-profile`),
          fetchApi(`/users/${userId}/follow-stats`),
        ]);
        if (profileRes.status === 403) {
          setProfileBlocked(true);
        } else if (profileRes.ok) {
          setProfile(await profileRes.json());
        }
        if (statsRes.ok) {
          // The endpoint's real response shape is {followerCount,
          // followingCount, isFollowedByMe} — assigning it straight into
          // FollowStats (which names them followers/following/isFollowing)
          // silently produced undefined everywhere, since Response.json()
          // types as `any` and TypeScript never caught the mismatch. The
          // Follow button always rendered "Follow" (never "Following") on
          // load as a result, and toggling it math'd `undefined - 1` into
          // NaN follower counts from the first tap onward.
          const raw = await statsRes.json();
          setFollowStats({
            followers: raw.followerCount ?? 0,
            following: raw.followingCount ?? 0,
            isFollowing: !!raw.isFollowedByMe,
          });
        }
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

  // ── Share Profile ────────────────────────────────────────────────────
  // Same lifeos:// deep-link convention AddContactScreen already uses for
  // "Add me" (?uid= is the stable-id fallback since usernames can be
  // reassigned) — App.tsx's linking config maps profile/:username to this
  // screen. Opening it navigates here to VIEW the profile, unlike add/...
  // which jumps straight into a chat.
  const shareUsername = profile?.username || initialUsername || '';
  const profileLink = `lifeos://profile/${shareUsername}?uid=${userId}`;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(profileLink);
    setShowShareSheet(false);
    Alert.alert('Copied', 'Profile link copied to clipboard.');
  };

  const handleShareVia = async () => {
    try {
      await Share.share({
        message: `Check out ${displayName}'s profile on Guranda: ${profileLink}`,
        url: profileLink,
      });
      setShowShareSheet(false);
    } catch {
      /* user dismissed the native share sheet — not an error */
    }
  };

  const openChatPicker = async () => {
    setShowShareSheet(false);
    setShowChatPicker(true);
    setShareChatsLoading(true);
    try {
      const res = await fetchApi('/chats');
      if (res.ok) {
        const data = await res.json();
        setShareChats(Array.isArray(data) ? data.filter((c: any) => c.type === 'DIRECT' || c.type === 'GROUP') : []);
      }
    } catch {
      setShareChats([]);
    } finally {
      setShareChatsLoading(false);
    }
  };

  const sendProfileToChat = (chatId: string) => {
    if (!socket || !me?.userId || !profile) return;
    socket.emit('send_message', {
      chatId,
      senderId: me.userId,
      content: encodeProfileCard({
        userId: profile.id,
        username: profile.username,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      }),
    });
    setShowChatPicker(false);
    Alert.alert('Sent', 'Profile shared in chat.');
  };

  const openActionTray = async () => {
    setShowActionTray(true);
    try {
      const res = await fetchApi('/relationships/mine');
      if (res.ok) {
        const data = await res.json();
        setRelationshipPartner(data?.partner ?? null);
      }
    } catch {
      setRelationshipPartner(null);
    }
  };

  const handleBlock = () => {
    setShowActionTray(false);
    Alert.alert(
      'Block User',
      `Block @${profile?.username || initialUsername}? They won't be able to message, call, or friend-request you, and neither of you will see each other's posts.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setBlockBusy(true);
            try {
              const res = await fetchApi(`/users/${userId}/block`, { method: 'POST' });
              if (!res.ok) throw new Error('Failed to block');
              setProfileBlocked(true);
              setProfile(null);
            } catch {
              Alert.alert('Error', 'Failed to block this user. Please try again.');
            } finally {
              setBlockBusy(false);
            }
          },
        },
      ],
    );
  };

  // Resolves (or creates) the DIRECT chat with this profile's user, then
  // shares it with the caller's relationship partner — same flow
  // ChatScreen.tsx's share modal uses, just reached from the profile tray
  // instead of from inside the chat itself.
  const handleShareWithPartner = async () => {
    if (!relationshipPartner?.id || sharingChat) return;
    setSharingChat(true);
    try {
      const chatRes = await fetchApi('/chats/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId }),
      });
      if (!chatRes.ok) throw new Error('Failed to open chat');
      const chat = await chatRes.json();
      const shareRes = await fetchApi(`/chats/${chat.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delegateId: relationshipPartner.id }),
      });
      if (!shareRes.ok) throw new Error('Failed to share chat');
      setShowActionTray(false);
      Alert.alert('Shared', `This chat is now shared with ${relationshipPartner.displayName || relationshipPartner.username}.`);
    } catch {
      Alert.alert('Error', 'Failed to share this chat. Please try again.');
    } finally {
      setSharingChat(false);
    }
  };

  const displayName = profile?.displayName || profile?.username || initialUsername || 'User';
  const avatarUri = profile?.avatarUrl || initialAvatar || `https://api.dicebear.com/7.x/avataaars/png?seed=${displayName}`;

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    backBtn: {
      padding: 12,
      paddingLeft: SPACING.lg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingRight: SPACING.lg,
    },
    shareHeaderBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    relationshipBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
      paddingVertical: 6,
      paddingLeft: 8,
      paddingRight: 12,
      borderRadius: RADIUS.pill,
      backgroundColor: 'rgba(244,63,94,0.12)',
      borderWidth: 1,
      borderColor: 'rgba(244,63,94,0.28)',
    },
    relationshipBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#FFF1F2',
    },
    relationshipPartnerAvatar: {
      width: 18,
      height: 18,
      borderRadius: 9,
    },
    relationshipPartnerName: {
      fontSize: 12,
      fontWeight: '700',
      color: COLORS.text,
    },
    leagueCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: SPACING.sm,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: RADIUS.md,
      paddingVertical: SPACING.sm + 2,
      paddingHorizontal: SPACING.md,
      width: '100%',
    },
    leagueItem: {
      flex: 1,
    },
    leagueLabel: {
      color: 'rgba(255,255,255,0.55)',
      fontSize: 10,
      marginBottom: 2,
    },
    leagueDivider: {
      width: 1,
      height: 26,
      backgroundColor: 'rgba(255,255,255,0.12)',
      marginHorizontal: SPACING.sm,
    },
    leagueNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    leagueNameText: {
      fontSize: 11.5,
      fontWeight: '800',
      flexShrink: 1,
    },
    leaguePositionText: {
      color: COLORS.text,
      fontSize: 13,
      fontWeight: '800',
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
    sheetOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    actionTray: {
      backgroundColor: COLORS.surfaceElevated || COLORS.surface,
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.xl,
    },
    trayHandle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: COLORS.border,
      alignSelf: 'center',
      marginBottom: SPACING.md,
    },
    trayItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      paddingVertical: 14,
      paddingHorizontal: SPACING.lg,
    },
    trayItemText: {
      color: COLORS.text,
      fontSize: 15.5,
      fontWeight: '600',
    },
    trayItemDesc: {
      color: COLORS.textMuted,
      fontSize: 12,
      marginTop: 1,
    },
    shareSheetTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    shareSheetTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: COLORS.text,
    },
    sharePreviewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
      padding: SPACING.sm + 4,
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md,
    },
    sharePreviewAvatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.surface,
    },
    sharePreviewName: {
      fontSize: 14.5,
      fontWeight: '700',
      color: COLORS.text,
    },
    sharePreviewLink: {
      fontSize: 12,
      color: COLORS.textMuted,
      marginTop: 1,
    },
    chatPickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: SPACING.lg,
    },
    chatPickerAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: COLORS.surface,
    },
    chatPickerName: {
      fontSize: 14.5,
      fontWeight: '600',
      color: COLORS.text,
      flex: 1,
    },
    qrModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.75)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    qrModalCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: RADIUS.xl,
      padding: SPACING.xl,
      alignItems: 'center',
    },
    qrModalName: {
      marginTop: SPACING.md,
      fontSize: 16,
      fontWeight: '700',
      color: '#0A0A0F',
    },
    qrModalClose: {
      marginTop: SPACING.lg,
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.primary,
    },
    qrModalCloseText: {
      color: '#FFF',
      fontWeight: '700',
    },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareHeaderBtn} onPress={() => setShowShareSheet(true)}>
          <Ionicons name="share-social-outline" size={19} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} size="large" />
          </View>
        ) : profileBlocked ? (
          <View style={styles.loadingBox}>
            <Ionicons name="eye-off-outline" size={40} color={COLORS.textMuted} />
            <Text style={{ color: COLORS.textMuted, marginTop: 12, fontSize: 15 }}>
              This profile is not available
            </Text>
          </View>
        ) : (
          <>
            {/* ===== Identity header ===== */}
            <TouchableOpacity
              activeOpacity={1}
              onLongPress={me?.userId !== userId ? openActionTray : undefined}
              delayLongPress={350}
            >
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

              {/* Relationship status — only ever rendered when the profile
                  owner has an active Relationship AND hasn't set their
                  status to Prefer not to say (see getRelationshipInfo). */}
              {profile?.relationship && (
                <TouchableOpacity
                  style={styles.relationshipBadge}
                  onPress={() =>
                    navigation.push('UserProfile', {
                      userId: profile.relationship!.partner.id,
                      username: profile.relationship!.partner.username,
                      avatarUrl: profile.relationship!.partner.avatarUrl,
                    })
                  }
                >
                  <Ionicons name="heart" size={13} color="#F43F5E" />
                  <Text style={styles.relationshipBadgeText}>
                    {profile.relationship.status === 'MARRIED' ? 'Married to' : 'In a relationship with'}
                  </Text>
                  <Image
                    source={{
                      uri:
                        profile.relationship.partner.avatarUrl ||
                        `https://api.dicebear.com/7.x/avataaars/png?seed=${profile.relationship.partner.username}`,
                    }}
                    style={styles.relationshipPartnerAvatar}
                  />
                  <Text style={styles.relationshipPartnerName}>
                    {profile.relationship.partner.displayName || profile.relationship.partner.username}
                  </Text>
                </TouchableOpacity>
              )}

              {/* effectiveStatus is a live "what they're doing right now" (a
                  flight, an event) — only meaningful while actually online,
                  so a busy/offline person falls back to their permanent bio
                  instead of a stale "On a flight" from hours ago. */}
              {!!((isOnline && profile?.effectiveStatus) || profile?.bio) && (
                <Text style={styles.statusLine} numberOfLines={3}>
                  {isOnline && profile?.effectiveStatus ? profile.effectiveStatus : profile?.bio}
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
                  <View style={[styles.onlinePill, { backgroundColor: isOnline ? 'rgba(34,197,94,0.15)' : isBusy ? 'rgba(245,158,11,0.15)' : 'rgba(107,114,128,0.15)' }]}>
                    <View style={[styles.onlinePillDot, { backgroundColor: isOnline ? '#22C55E' : isBusy ? '#F59E0B' : '#6B7280' }]} />
                    <Text style={[styles.onlinePillText, { color: isOnline ? '#22C55E' : isBusy ? '#F59E0B' : '#6B7280' }]} numberOfLines={1}>
                      {presenceLabel}
                    </Text>
                  </View>
                </View>
              </View>

              {/* League + rating */}
              {!!profile && (
                <View style={styles.leagueCard}>
                  <View style={styles.leagueItem}>
                    <Text style={styles.leagueLabel}>Rating</Text>
                    <View style={styles.leagueNameRow}>
                      <Ionicons name="star" size={13} color={COLORS.gold} />
                      <Text style={[styles.leagueNameText, { color: COLORS.gold }]}>{profile.rating}</Text>
                    </View>
                  </View>
                  <View style={styles.leagueDivider} />
                  <View style={styles.leagueItem}>
                    <Text style={styles.leagueLabel}>League</Text>
                    <View style={styles.leagueNameRow}>
                      <Ionicons name="trophy" size={13} color={LEAGUE_COLORS[profile.league] || COLORS.textMuted} />
                      <Text style={[styles.leagueNameText, { color: LEAGUE_COLORS[profile.league] || COLORS.textMuted }]} numberOfLines={1}>
                        {profile.league}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.leagueDivider} />
                  <View style={styles.leagueItem}>
                    <Text style={styles.leagueLabel}>Position</Text>
                    <Text style={styles.leaguePositionText}>#{profile.leaguePosition} of {profile.leagueSize}</Text>
                  </View>
                </View>
              )}
            </LinearGradient>
            </TouchableOpacity>

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

      <Modal
        visible={showActionTray}
        transparent
        animationType="slide"
        onRequestClose={() => setShowActionTray(false)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowActionTray(false)}>
          <View style={styles.actionTray}>
            <View style={styles.trayHandle} />
            <TouchableOpacity style={styles.trayItem} onPress={handleBlock} disabled={blockBusy}>
              {blockBusy ? (
                <ActivityIndicator color={COLORS.error} size="small" />
              ) : (
                <Ionicons name="ban-outline" size={20} color={COLORS.error} />
              )}
              <Text style={[styles.trayItemText, { color: COLORS.error }]}>Block User</Text>
            </TouchableOpacity>
            {relationshipPartner && (
              <TouchableOpacity style={styles.trayItem} onPress={handleShareWithPartner} disabled={sharingChat}>
                {sharingChat ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                )}
                <View>
                  <Text style={styles.trayItemText}>Share this chat with partner</Text>
                  <Text style={styles.trayItemDesc}>
                    {relationshipPartner.displayName || relationshipPartner.username} will be able to read and reply as you
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showShareSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareSheet(false)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowShareSheet(false)}>
          <View style={styles.actionTray}>
            <View style={styles.trayHandle} />
            <View style={styles.shareSheetTitleRow}>
              <Text style={styles.shareSheetTitle}>Share Profile</Text>
              <TouchableOpacity onPress={() => setShowShareSheet(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.sharePreviewRow}>
              <Image source={{ uri: avatarUri }} style={styles.sharePreviewAvatar} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.sharePreviewName} numberOfLines={1}>{displayName}</Text>
                <Text style={styles.sharePreviewLink} numberOfLines={1}>@{shareUsername}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.trayItem} onPress={handleCopyLink}>
              <Ionicons name="link-outline" size={20} color={COLORS.primary} />
              <Text style={styles.trayItemText}>Copy Profile Link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.trayItem} onPress={handleShareVia}>
              <Ionicons name="share-social-outline" size={20} color={COLORS.primary} />
              <Text style={styles.trayItemText}>Share via…</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.trayItem} onPress={openChatPicker}>
              <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
              <Text style={styles.trayItemText}>Send in a Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.trayItem} onPress={() => { setShowShareSheet(false); setShowQr(true); }}>
              <Ionicons name="qr-code-outline" size={20} color={COLORS.primary} />
              <Text style={styles.trayItemText}>Show QR Code</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showChatPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowChatPicker(false)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowChatPicker(false)}>
          <View style={styles.actionTray}>
            <View style={styles.trayHandle} />
            <View style={styles.shareSheetTitleRow}>
              <Text style={styles.shareSheetTitle}>Send to…</Text>
              <TouchableOpacity onPress={() => setShowChatPicker(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {shareChatsLoading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
            ) : shareChats.length === 0 ? (
              <Text style={[styles.trayItemDesc, { paddingHorizontal: 20, paddingBottom: 16 }]}>No chats to send to yet.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 320 }}>
                {shareChats.map((chat: any) => (
                  <TouchableOpacity key={chat.id} style={styles.chatPickerRow} onPress={() => sendProfileToChat(chat.id)}>
                    <Image
                      source={{ uri: chat.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${chat.name || chat.id}` }}
                      style={styles.chatPickerAvatar}
                    />
                    <Text style={styles.chatPickerName} numberOfLines={1}>{chat.name || 'Chat'}</Text>
                    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showQr}
        transparent
        animationType="fade"
        onRequestClose={() => setShowQr(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalCard}>
            <QRCode value={profileLink} size={200} color="#0A0A0F" backgroundColor="#FFFFFF" />
            <Text style={styles.qrModalName}>{displayName}</Text>
            <TouchableOpacity style={styles.qrModalClose} onPress={() => setShowQr(false)}>
              <Text style={styles.qrModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
