import React from 'react';
import { View, Text, SectionList, TouchableOpacity, Image, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import TopBar from '../components/TopBar';
import EmptyState from '../components/EmptyState';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useFocusEffect } from '@react-navigation/native';
import { fetchApi } from '../utils/api';
import { formatLastSeen } from '../utils/format';
import { AI_ENABLED } from '../config/featureFlags';
import { FIXED_COMPANION_IDS } from '../config/fixedCompanions';

export default function ChatListScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { onlineUsers, activityLabels, socket } = useSocket();
  const [sections, setSections] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  // Distinct from `loading` (which also drives the pull-to-refresh spinner,
  // and only renders inside the pull gesture) — this gates a real, visible
  // loading state for the very first mount, before which the list would
  // otherwise just render blank.
  const [initialLoading, setInitialLoading] = React.useState(true);
  const [storyGroups, setStoryGroups] = React.useState<any[]>([]);
  const [communities, setCommunities] = React.useState<any[]>([]);

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING, TYPOGRAPHY }) => ({
    storyStrip: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.lg,
      gap: SPACING.md,
    },
    storyBubbleWrap: { alignItems: 'center', width: 64 },
    storyRing: {
      width: 60, height: 60, borderRadius: 30,
      justifyContent: 'center', alignItems: 'center', padding: 3,
    },
    storyAvatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: COLORS.background },
    storyName: { color: COLORS.textMuted, fontSize: 11, marginTop: 4, textAlign: 'center' },
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    listContent: {
      paddingTop: SPACING.sm,
      paddingBottom: 20,
    },
    sectionHeader: {
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      backgroundColor: COLORS.background,
      marginTop: SPACING.lg,
      marginBottom: SPACING.sm,
    },
    sectionHeaderText: {
      ...TYPOGRAPHY.body2,
      color: COLORS.secondary,
      textTransform: 'uppercase',
      fontWeight: 'bold',
    },
    chatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 15,
      marginHorizontal: SPACING.lg,
      marginBottom: SPACING.md,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    avatarContainer: {
      position: 'relative',
      marginRight: 15,
    },
    avatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: COLORS.background,
    },
    groupAvatar: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: COLORS.background,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    // Same outer-gradient/inner-solid-avatar shape as storyRing/storyAvatar
    // above, sized for the 50x50 row avatar instead of the 54x54 strip one.
    chatRowStoryRing: {
      width: 54, height: 54, borderRadius: 27,
      justifyContent: 'center', alignItems: 'center', padding: 2,
    },
    chatRowStoryAvatarInner: {
      width: 50, height: 50, borderRadius: 25,
      borderWidth: 2, borderColor: COLORS.surface,
    },
    statusDot: {
      position: 'absolute',
      bottom: 2,
      right: 2,
      width: 12,
      height: 12,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: COLORS.surface,
    },
    chatInfo: {
      flex: 1,
      justifyContent: 'center',
    },
    chatName: {
      ...TYPOGRAPHY.body1,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    chatType: {
      ...TYPOGRAPHY.body2,
      color: COLORS.textMuted,
      fontSize: 12,
    },
    envelopeContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    unreadBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 4,
      backgroundColor: '#FFD700',
      justifyContent: 'center',
      alignItems: 'center',
    },
    unreadBadgeText: {
      color: '#1A1A1A',
      fontSize: 10,
      fontWeight: 'bold',
    },
    fab: {
      position: 'absolute',
      // bottom is set dynamically via insets in JSX (matches AiFloatingOrb's
      // insets.bottom + 76 — without that tab-bar-height offset this sits
      // low enough to render underneath the bottom tab bar, invisible and
      // unclickable even though the component itself is mounted fine)
      bottom: 30,
      right: SPACING.lg,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999,
      elevation: 8,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
    }
  }));

  const fetchStories = async () => {
    try {
      // Bypasses fetchApi's 5-minute GET cache — the status ring and story
      // strip need to reflect a contact's just-posted/expired/deleted story
      // on this screen's own refetch (useFocusEffect below), not stale data.
      const res = await fetchApi('/stories/feed', { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setStoryGroups(data);
      }
    } catch {}
  };

  const fetchCommunities = async () => {
    try {
      const res = await fetchApi('/communities/my');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCommunities(data);
      }
    } catch {}
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchChats();
      fetchStories();
      fetchCommunities();
    }, [user?.userId])
  );

  React.useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = () => {
      fetchChats();
    };

    socket.on('new_message', handleNewMessage);
    return () => {
      socket.off('new_message', handleNewMessage);
    };
  }, [socket]);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const [res, publicRes, companionsRes] = await Promise.all([
        fetchApi('/chats'),
        fetchApi('/chats/public'),
        AI_ENABLED ? fetchApi('/ai/companions') : Promise.resolve(null),
      ]);
      if (res.ok) {
        const chats = await res.json();

        // Real, backend-driven global channels (e.g. "Global Lounge") — any
        // authenticated user can read/post, no membership row required.
        const publicChannels = publicRes.ok ? await publicRes.json() : [];

        const groups = chats.filter((c: any) => c.type === 'GROUP');

        // Sipho/Thandi/Guranda Assistant — fixed, always-available companions
        // (see fixedCompanions.ts), sorted by their real last-message time
        // (null when never messaged, so a fresh companion doesn't jump above
        // an actual recent conversation).
        const companionsRaw = companionsRes?.ok ? await companionsRes.json() : [];
        const idByBackendId = Object.fromEntries(
          Object.entries(FIXED_COMPANION_IDS).map(([localId, backendId]) => [backendId, localId]),
        );
        const companions = companionsRaw.map((c: any) => ({
          id: idByBackendId[c.id] ?? `ai-${c.id}`,
          name: c.name,
          type: 'AI',
          status: 'online',
          hasNewMessage: false,
          unreadCount: 0,
          lastMessageAt: c.lastMessageAt,
        }));

        const privateContacts = [
          ...companions,
          ...chats.filter((c: any) => c.type === 'DIRECT'),
        ].sort((a: any, b: any) => new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime());

        const grouped = [
          { title: 'Private Contacts', data: privateContacts },
          { title: 'Public Channels', data: publicChannels },
          { title: 'Custom Groups', data: groups },
        ];

        setSections(grouped.filter(g => g.data.length > 0));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'online': return '#22C55E';
      case 'away': return '#F59E0B';
      case 'busy': return '#F59E0B';
      default: return '#6B7280'; // offline (or unknown) — was wrongly defaulting to green
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      activeOpacity={0.7}
      onPress={() => {
        if (item.type === 'COMMUNITY') {
          navigation.navigate('Community', { communityId: item.id, communityName: item.name });
          return;
        }
        const companionId = AI_ENABLED ? FIXED_COMPANION_IDS[item.id] : undefined;
        if (companionId) {
          navigation.navigate('CompanionChat', { companionId, companionName: item.name });
          return;
        }
        navigation.navigate('ChatRoom', {
          roomId: item.id,
          roomName: item.name,
          roomType: item.type,
          targetUserId: item.targetUserId,
          avatarUrl: item.avatarUrl,
          // Set only for a chat a relationship partner shared with this
          // user (see ChatShare) — ChatScreen uses this to hide the
          // "share this chat" action from the delegate's own view (only
          // the real owner can share/unshare it).
          sharedByUserId: item.sharedByUserId,
        });
      }}
    >
      <View style={styles.avatarContainer}>
        {item.type === 'Private' || item.type === 'AI' || item.type === 'DIRECT' ? (
          (() => {
            const statusEntry = item.targetUserId ? contactStatusByUserId.get(item.targetUserId) : undefined;
            const avatarUri = item.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.name}`;
            return (
              <TouchableOpacity
                onPress={() => {
                  if (statusEntry) {
                    navigation.navigate('StoryViewer', { groups: [statusEntry.group], initialGroupIndex: 0 });
                    return;
                  }
                  if (item.targetUserId) {
                    navigation.navigate('UserProfile', {
                      userId: item.targetUserId,
                      username: item.name,
                      avatarUrl: avatarUri,
                    });
                  }
                }}
                disabled={!item.targetUserId}
              >
                {statusEntry ? (
                  <LinearGradient
                    colors={statusEntry.allViewed ? ['#9CA3AF', '#9CA3AF'] : ['#7C3AED', '#DB2777']}
                    style={styles.chatRowStoryRing}
                  >
                    <Image source={{ uri: avatarUri }} style={styles.chatRowStoryAvatarInner} />
                  </LinearGradient>
                ) : (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                )}
              </TouchableOpacity>
            );
          })()
        ) : (
          <View style={styles.groupAvatar}>
            <Ionicons
              name={item.type === 'COMMUNITY' ? 'earth' : item.type === 'Public' ? 'globe' : 'people'}
              size={24}
              color={COLORS.text}
            />
          </View>
        )}
        {item.type !== 'COMMUNITY' && (
          <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.targetUserId ? onlineUsers[item.targetUserId] || 'offline' : item.status) }]} />
        )}
      </View>

      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.name}</Text>
        <Text style={styles.chatType} numberOfLines={1}>
          {item.type === 'COMMUNITY'
            ? `${item.memberCount} members`
            : (() => {
                const presence = item.targetUserId ? onlineUsers[item.targetUserId] : item.status;
                if (presence === 'online') return item.effectiveStatus || 'online';
                if (presence === 'busy' || presence === 'away') {
                  return (item.targetUserId && activityLabels[item.targetUserId]) || 'busy';
                }
                return item.targetUserId ? formatLastSeen(item.lastSeenAt ?? null) : (item.status || item.type);
              })()}
        </Text>
      </View>

      {item.type === 'Private' || item.type === 'AI' || item.type === 'DIRECT' ? (
        <View style={styles.envelopeContainer}>
          <Ionicons
            name={item.hasNewMessage ? 'mail' : 'mail-open-outline'}
            size={20}
            color={item.hasNewMessage ? '#FFD700' : COLORS.textMuted}
          />
          {!!item.unreadCount && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{item.unreadCount > 99 ? '99+' : item.unreadCount}</Text>
            </View>
          )}
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      )}
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  // Only other people's active stories show here — no "add your own story"
  // bubble, so this strip stays purely a signal of who has something live
  // right now, not a permanent create-story prompt.
  const otherStoryGroups = storyGroups.filter(g => g.userId !== user?.userId);

  // CONTACTS-only (Status) stories from friends — PUBLIC stories never
  // render a chat-row ring (that's what the horizontal strip above is for);
  // this is specifically the WhatsApp-style "this contact posted a status"
  // signal. The feed endpoint already only returns CONTACTS stories from
  // friends or the caller, so no client-side friend check is needed here.
  const contactStatusByUserId = new Map(
    otherStoryGroups
      .map((g): [string, { group: any; allViewed: boolean }] | null => {
        const contactsStories = g.stories.filter((s: any) => s.visibility === 'CONTACTS');
        if (contactsStories.length === 0) return null;
        return [g.userId, { group: { ...g, stories: contactsStories }, allViewed: contactsStories.every((s: any) => s.viewedByMe) }];
      })
      .filter((e): e is [string, { group: any; allViewed: boolean }] => e !== null),
  );

  const renderStoryStrip = () => {
    if (otherStoryGroups.length === 0) return null;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storyStrip}
      >
        {otherStoryGroups.map(group => (
          <TouchableOpacity
            key={group.userId}
            style={styles.storyBubbleWrap}
            onPress={() => navigation.navigate('StoryViewer', { groups: otherStoryGroups, initialGroupIndex: otherStoryGroups.indexOf(group) })}
          >
            <LinearGradient colors={['#7C3AED', '#DB2777']} style={styles.storyRing}>
              <Image
                source={{ uri: group.user.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${group.user.username}` }}
                style={styles.storyAvatar}
              />
            </LinearGradient>
            <Text style={styles.storyName} numberOfLines={1}>
              {group.user.profile?.displayName || group.user.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const communitySection = communities.length
    ? [{
        title: 'Community',
        data: communities.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: 'COMMUNITY',
          memberCount: c._count?.members ?? 0,
        })),
      }]
    : [];
  const allSections = [...sections, ...communitySection];

  return (
    <SafeAreaView style={styles.container}>
      <TopBar navigation={navigation} />
      {renderStoryStrip()}
      {initialLoading ? (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      ) : (
        <SectionList
          sections={allSections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 90 }, allSections.length === 0 && { flex: 1 }]}
          stickySectionHeadersEnabled={false}
          refreshing={loading}
          onRefresh={() => { fetchChats(); fetchCommunities(); }}
          ListEmptyComponent={
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              subtitle="Start a chat and it'll show up here."
            />
          }
        />
      )}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 76 }]}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('AddContact')}
      >
        <Ionicons name="add" size={30} color={COLORS.surface} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}
