import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any> | null;
  readAt: string | null;
  createdAt: string;
};

// Compact relative time, matching ExploreScreen's feed convention.
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const TYPE_ICON: Record<string, string> = {
  'relationship.request': 'heart-outline',
  'relationship.request_accepted': 'heart-outline',
  'friend.request': 'person-add-outline',
  'friend.request_accepted': 'people-outline',
  'chat.message': 'chatbubble-outline',
  'ai.reminder': 'alarm-outline',
  'achievement.unlocked': 'trophy-outline',
  'cards.room_invite': 'game-controller-outline',
  'couples.challenge_ready': 'heart-circle-outline',
  'gift.received': 'gift-outline',
  'reaction.received': 'happy-outline',
  'mention': 'at-outline',
  'post.liked': 'thumbs-up-outline',
  'post.reposted': 'repeat-outline',
  'post.comment': 'chatbox-outline',
  'post.comment_liked': 'thumbs-up-outline',
  'challenge.won': 'trophy-outline',
  'marketplace.outbid': 'pricetag-outline',
  'marketplace.auction_won': 'pricetag-outline',
  'marketplace.item_sold': 'cash-outline',
  'chess.invite': 'game-controller-outline',
  'chess.resigned': 'flag-outline',
  'chess.rematch_offer': 'refresh-outline',
  'tournament.round_result': 'ribbon-outline',
  'tournament.eliminated': 'close-circle-outline',
  'tournament.won': 'trophy-outline',
  'live.guest_invite': 'videocam-outline',
  'live.job_application': 'briefcase-outline',
  'live.dating_match': 'heart-outline',
};
const DEFAULT_ICON = 'notifications-outline';

export default function NotificationsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    fetchApi('/notifications', { headers: { 'Cache-Control': 'no-cache' } })
      .then(r => (r.ok ? r.json() : []))
      .then(data => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    fetchApi(`/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
  };

  const markAllRead = () => {
    setItems(prev => prev.map(n => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })));
    fetchApi('/notifications/read-all', { method: 'POST' }).catch(() => {});
  };

  const hasUnread = items.some(n => !n.readAt);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    markAllLink: { color: COLORS.primary, fontSize: 12.5, fontWeight: '700' },
    markAllLinkDisabled: { color: COLORS.textMuted },
    row: {
      flexDirection: 'row', gap: SPACING.md,
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
      borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    iconWrap: {
      width: 38, height: 38, borderRadius: 19,
      backgroundColor: 'rgba(139,92,246,0.15)',
      justifyContent: 'center', alignItems: 'center',
      marginTop: 2,
    },
    dot: {
      position: 'absolute', top: -1, right: -1,
      width: 9, height: 9, borderRadius: 4.5,
      backgroundColor: '#F87171', borderWidth: 1.5, borderColor: COLORS.background,
    },
    title: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    titleRead: { color: COLORS.textMuted, fontWeight: '600' },
    body: { color: COLORS.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 },
    time: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },
    empty: { alignItems: 'center', paddingVertical: 80, gap: 10, paddingHorizontal: SPACING.xl },
    emptyTitle: { color: COLORS.text, fontWeight: '700', fontSize: 15 },
    emptyBody: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
  }));

  const renderItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.readAt;
    return (
      <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => isUnread && markRead(item.id)}>
        <View>
          <View style={styles.iconWrap}>
            <Ionicons name={(TYPE_ICON[item.type] || DEFAULT_ICON) as any} size={18} color={COLORS.primary} />
          </View>
          {isUnread && <View style={styles.dot} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, !isUnread && styles.titleRead]}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead} disabled={!hasUnread} style={{ minWidth: 36 }}>
          <Text style={[styles.markAllLink, !hasUnread && styles.markAllLinkDisabled]}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.primary} />}
          contentContainerStyle={items.length === 0 ? { flex: 1 } : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyBody}>Requests and updates that need your attention will show up here.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
