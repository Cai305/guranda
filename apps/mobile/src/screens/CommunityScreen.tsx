import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image, TextInput, KeyboardAvoidingView, Platform, ActionSheetIOS, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { invalidateCachedResponse } from '../utils/apiCache';
import { CommunityDetailsDto, ChannelDto, CommunityPostDto } from '@mxit2/types';
import { MODULES, LifeModule } from '../config/modules';
import { GAMES } from './hub/GamesScreen';

interface PinnableEntry {
  id: string;
  name: string;
  icon: string;
  gradient: [string, string];
  kind: 'app' | 'game';
}

const PINNABLE_APPS: PinnableEntry[] = MODULES.map((m) => ({ id: m.id, name: m.name, icon: m.icon, gradient: m.gradient, kind: 'app' }));
const PINNABLE_GAMES: PinnableEntry[] = GAMES.map((g) => ({ id: g.id, name: g.name, icon: g.icon, gradient: g.gradient, kind: 'game' }));
const PINNABLE_ALL: PinnableEntry[] = [...PINNABLE_APPS, ...PINNABLE_GAMES];

const CHANNEL_ICON: Record<string, string> = {
  TEXT: 'chatbubbles-outline',
  ANNOUNCEMENT: 'megaphone-outline',
  VOICE: 'mic-outline',
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function CommunityScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const { communityId, communityName } = route.params;
  const [community, setCommunity] = useState<CommunityDetailsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [tab, setTab] = useState<'channels' | 'feed'>('channels');
  const [posts, setPosts] = useState<CommunityPostDto[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [posting, setPosting] = useState(false);
  const [pinPickerOpen, setPinPickerOpen] = useState(false);
  const [pinBusyId, setPinBusyId] = useState<string | null>(null);

  const fetchCommunity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/communities/${communityId}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) setCommunity(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [communityId]);

  const fetchPosts = useCallback(async () => {
    try {
      setPostsLoading(true);
      const res = await fetchApi(`/communities/${communityId}/posts`, { headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) setPosts(await res.json());
    } catch {}
    setPostsLoading(false);
  }, [communityId]);

  useFocusEffect(useCallback(() => { fetchCommunity(); }, [fetchCommunity]));
  useFocusEffect(useCallback(() => { if (tab === 'feed') fetchPosts(); }, [tab, fetchPosts]));

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    backBtn: { padding: 5 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cover: { height: 100, backgroundColor: COLORS.surfaceElevated },
    infoSection: { padding: 20, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    iconContainer: {
      width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center', marginBottom: 15, marginTop: -50,
      borderWidth: 3, borderColor: COLORS.background, overflow: 'hidden',
    },
    iconImage: { width: 80, height: 80 },
    title: { ...TYPOGRAPHY.h2, marginBottom: 8, textAlign: 'center' },
    description: { ...TYPOGRAPHY.body1, color: COLORS.textMuted, textAlign: 'center', marginBottom: 8 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    members: { ...TYPOGRAPHY.body2, color: COLORS.secondary, fontWeight: 'bold' },
    categoryPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    categoryPillText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
    joinBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24 },
    joinBtnText: { ...TYPOGRAPHY.body1, color: COLORS.surface, fontWeight: 'bold' },
    inviteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.primary },
    inviteBtnText: { color: COLORS.primary, fontWeight: '700' },
    tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.border },
    tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabBtnActive: { borderBottomColor: COLORS.primary },
    tabBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
    tabBtnTextActive: { color: COLORS.primary },
    listContent: { padding: 15, gap: 8 },
    roomItem: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, padding: 15,
      borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    },
    roomIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${COLORS.primary}18`, alignItems: 'center', justifyContent: 'center' },
    roomName: { ...TYPOGRAPHY.body1, flex: 1, marginLeft: 12, fontWeight: '500' },
    roomTypeTag: { color: COLORS.textMuted, fontSize: 10, marginLeft: 12, marginTop: 2 },
    fab: {
      position: 'absolute', right: 20, bottom: 20, width: 52, height: 52, borderRadius: 26,
      backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
      shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    errorText: { ...TYPOGRAPHY.body1, color: COLORS.textMuted },
    composer: { flexDirection: 'row', gap: 10, padding: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    composerInput: {
      flex: 1, backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, minHeight: 44,
    },
    postBtn: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
    postBtnDisabled: { opacity: 0.5 },
    postBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    postCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
    postAuthorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    postAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.background },
    postAuthor: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    postTime: { color: COLORS.textMuted, fontSize: 11 },
    postContent: { color: COLORS.text, fontSize: 14, lineHeight: 19 },
    postMedia: { width: '100%', height: 180, borderRadius: 10, marginTop: 2 },
    postActions: { flexDirection: 'row', gap: 18, marginTop: 4 },
    postActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    postActionText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
    postActionTextActive: { color: COLORS.primary },
    emptyText: { color: COLORS.textMuted, textAlign: 'center', marginTop: 30 },
    pinnedSection: { paddingTop: 12, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    pinnedHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 8 },
    pinnedLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    pinnedList: { paddingHorizontal: 15, gap: 14, paddingBottom: 12 },
    pinnedTile: { alignItems: 'center', width: 64 },
    pinnedIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    pinnedName: { color: COLORS.text, fontSize: 11, marginTop: 6, textAlign: 'center' },
    pinnedEmpty: { color: COLORS.textMuted, fontSize: 12, paddingHorizontal: 15 },
    pinModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    pinModalSheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '75%' },
    pinModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    pinModalList: { padding: 15, gap: 8 },
    pinModalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: COLORS.background, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: COLORS.border },
    pinModalIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    pinModalRowText: { flex: 1, color: COLORS.text, fontWeight: '600', fontSize: 14 },
  }));

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetchApi(`/communities/${communityId}/join`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json())?.message || "Couldn't join this community");
      await invalidateCachedResponse(`/communities/${communityId}`);
      await invalidateCachedResponse('/communities');
      fetchCommunity();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    Alert.alert('Leave community', `Leave ${community?.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave', style: 'destructive', onPress: async () => {
          const res = await fetchApi(`/communities/${communityId}/leave`, { method: 'POST' });
          const data = await res.json().catch(() => null);
          if (res.ok) {
            await invalidateCachedResponse('/communities/my');
            navigation.goBack();
          } else {
            Alert.alert('Error', data?.message || "Couldn't leave this community.");
          }
        },
      },
    ]);
  };

  const openMenu = () => {
    const isAdmin = community?.myRole === 'ADMIN';
    const options: { label: string; action: () => void; destructive?: boolean }[] = [];
    options.push({ label: 'Invite People', action: () => navigation.navigate('InviteToCommunity', { communityId, communityName: community?.name }) });
    if (isAdmin) options.push({ label: 'Edit Community', action: () => navigation.navigate('EditCommunity', { communityId }) });
    options.push({ label: 'Leave Community', action: handleLeave, destructive: true });

    const labels = [...options.map((o) => o.label), 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: options.findIndex((o) => o.destructive) },
        (index) => { if (index < options.length) options[index].action(); },
      );
    } else {
      Alert.alert('Community', undefined, [
        ...options.map((o) => ({ text: o.label, style: o.destructive ? 'destructive' as const : undefined, onPress: o.action })),
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const openChannel = (channel: ChannelDto) => {
    if (channel.channelType === 'VOICE') {
      navigation.navigate('CommunityVoice', { communityId, channelId: channel.id, channelName: channel.name });
    } else {
      // ChatRoom lives inside Main > Chat's own stack (ChatStackNavigator),
      // not at this screen's root-level stack — a bare navigate('ChatRoom')
      // silently fails to resolve since CommunityScreen is registered
      // directly in RootNavigator, a sibling of the tab navigator.
      navigation.navigate('Main', {
        screen: 'Chat',
        params: { screen: 'ChatRoom', params: { roomId: channel.id, roomName: channel.name, roomType: channel.type } },
      });
    }
  };

  const submitPost = async () => {
    if (!composerText.trim() || posting) return;
    try {
      setPosting(true);
      const res = await fetchApi(`/communities/${communityId}/posts`, {
        method: 'POST',
        body: JSON.stringify({ content: composerText.trim() }),
      });
      if (res.ok) {
        setComposerText('');
        fetchPosts();
      } else {
        Alert.alert('Error', (await res.json().catch(() => null))?.message || "Couldn't post.");
      }
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: CommunityPostDto) => {
    setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) } : p));
    const res = await fetchApi(`/communities/${communityId}/posts/${post.id}/like`, { method: 'POST' });
    if (!res.ok) fetchPosts();
  };

  const openPinned = (entry: PinnableEntry) => {
    if (entry.kind === 'app') {
      const module = MODULES.find((m) => m.id === entry.id) as LifeModule | undefined;
      if (module?.route) navigation.navigate(module.route.name, module.route.params);
      else navigation.navigate('UnderConstruction', { moduleId: entry.id });
    } else {
      const game = GAMES.find((g) => g.id === entry.id);
      if (game?.live && game.route) navigation.navigate(game.route);
      else navigation.navigate('UnderConstruction', { name: entry.name, icon: entry.icon });
    }
  };

  const togglePin = async (entry: PinnableEntry) => {
    if (!community) return;
    const isPinned = community.pinnedAppIds?.includes(entry.id);
    setPinBusyId(entry.id);
    try {
      const res = isPinned
        ? await fetchApi(`/communities/${communityId}/pinned-apps/${entry.id}`, { method: 'DELETE' })
        : await fetchApi(`/communities/${communityId}/pinned-apps`, { method: 'POST', body: JSON.stringify({ appId: entry.id }) });
      if (res.ok) {
        setCommunity((prev) => prev ? {
          ...prev,
          pinnedAppIds: isPinned ? prev.pinnedAppIds.filter((id) => id !== entry.id) : [...prev.pinnedAppIds, entry.id],
        } : prev);
      }
    } finally {
      setPinBusyId(null);
    }
  };

  const renderRoom = ({ item }: { item: ChannelDto }) => (
    <TouchableOpacity style={styles.roomItem} activeOpacity={0.7} onPress={() => openChannel(item)}>
      <View style={styles.roomIconWrap}>
        <Ionicons name={(CHANNEL_ICON[item.channelType] || 'chatbubbles-outline') as any} size={18} color={COLORS.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.roomName}>{item.name}</Text>
        {item.channelType === 'ANNOUNCEMENT' && <Text style={styles.roomTypeTag}>ANNOUNCEMENT · admins & mods only</Text>}
        {item.channelType === 'VOICE' && <Text style={styles.roomTypeTag}>VOICE CHANNEL</Text>}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: CommunityPostDto }) => (
    <View style={styles.postCard}>
      <View style={styles.postAuthorRow}>
        <Image source={{ uri: item.author?.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.author?.username}` }} style={styles.postAvatar} />
        <View>
          <Text style={styles.postAuthor}>{item.author?.profile?.displayName || item.author?.username}</Text>
          <Text style={styles.postTime}>{timeAgo(item.createdAt as any)}</Text>
        </View>
      </View>
      {!!item.content && <Text style={styles.postContent}>{item.content}</Text>}
      {!!item.mediaUrl && <Image source={{ uri: item.mediaUrl }} style={styles.postMedia} resizeMode="cover" />}
      <View style={styles.postActions}>
        <TouchableOpacity style={styles.postActionBtn} onPress={() => toggleLike(item)}>
          <Ionicons name={item.likedByMe ? 'heart' : 'heart-outline'} size={16} color={item.likedByMe ? COLORS.primary : COLORS.textMuted} />
          <Text style={[styles.postActionText, item.likedByMe && styles.postActionTextActive]}>{item.likeCount}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.postActionBtn} onPress={() => navigation.navigate('CommunityPost', { communityId, postId: item.id })}>
          <Ionicons name="chatbubble-outline" size={15} color={COLORS.textMuted} />
          <Text style={styles.postActionText}>{item.commentCount}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const canManageChannels = community?.myRole === 'ADMIN' || community?.myRole === 'MOD';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>{communityName}</Text>
        <TouchableOpacity onPress={openMenu} style={styles.backBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : community ? (
        <>
          {!!community.coverUrl && <Image source={{ uri: community.coverUrl }} style={styles.cover} resizeMode="cover" />}
          <View style={styles.infoSection}>
            <View style={styles.iconContainer}>
              {community.iconUrl ? <Image source={{ uri: community.iconUrl }} style={styles.iconImage} /> : <Ionicons name="earth" size={40} color={COLORS.surface} />}
            </View>
            <Text style={styles.title}>{community.name}</Text>
            {!!community.description && <Text style={styles.description}>{community.description}</Text>}
            <View style={styles.metaRow}>
              <Text style={styles.members}>{community._count?.members || 0} Members</Text>
              {!!community.category && (
                <View style={styles.categoryPill}><Text style={styles.categoryPillText}>{community.category}</Text></View>
              )}
              {community.privacy === 'PRIVATE' && (
                <View style={styles.categoryPill}><Ionicons name="lock-closed" size={11} color={COLORS.textMuted} /></View>
              )}
            </View>

            {!community.isMember ? (
              <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} disabled={joining}>
                {joining ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.joinBtnText}>Join Community</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.inviteBtn}
                onPress={() => navigation.navigate('CommunityMembers', { communityId })}
              >
                <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                <Text style={styles.inviteBtnText}>Members</Text>
              </TouchableOpacity>
            )}
          </View>

          {community.isMember && (
            <>
              {(community.pinnedAppIds.length > 0 || canManageChannels) && (
                <View style={styles.pinnedSection}>
                  <View style={styles.pinnedHeaderRow}>
                    <Text style={styles.pinnedLabel}>APPS & GAMES</Text>
                    {canManageChannels && (
                      <TouchableOpacity onPress={() => setPinPickerOpen(true)}>
                        <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={PINNABLE_ALL.filter((e) => community.pinnedAppIds.includes(e.id))}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.pinnedList}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={styles.pinnedTile} activeOpacity={0.8} onPress={() => openPinned(item)}>
                        <LinearGradient colors={item.gradient} style={styles.pinnedIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                          <Ionicons name={item.icon as any} size={20} color="#fff" />
                        </LinearGradient>
                        <Text style={styles.pinnedName} numberOfLines={1}>{item.name}</Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={canManageChannels ? <Text style={styles.pinnedEmpty}>Pin an app or game members can jump into</Text> : null}
                  />
                </View>
              )}

              <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tabBtn, tab === 'channels' && styles.tabBtnActive]} onPress={() => setTab('channels')}>
                  <Text style={[styles.tabBtnText, tab === 'channels' && styles.tabBtnTextActive]}>CHANNELS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, tab === 'feed' && styles.tabBtnActive]} onPress={() => setTab('feed')}>
                  <Text style={[styles.tabBtnText, tab === 'feed' && styles.tabBtnTextActive]}>FEED</Text>
                </TouchableOpacity>
              </View>

              {tab === 'channels' ? (
                <View style={{ flex: 1 }}>
                  <FlatList
                    data={community.rooms}
                    keyExtractor={(item) => item.id}
                    renderItem={renderRoom}
                    contentContainerStyle={styles.listContent}
                  />
                  {canManageChannels && (
                    <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateChannel', { communityId })}>
                      <Ionicons name="add" size={26} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                  <View style={styles.composer}>
                    <TextInput
                      style={styles.composerInput}
                      placeholder="Share something with the community…"
                      placeholderTextColor={COLORS.textMuted}
                      value={composerText}
                      onChangeText={setComposerText}
                      multiline
                    />
                    <TouchableOpacity
                      style={[styles.postBtn, (!composerText.trim() || posting) && styles.postBtnDisabled]}
                      onPress={submitPost}
                      disabled={!composerText.trim() || posting}
                    >
                      {posting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.postBtnText}>Post</Text>}
                    </TouchableOpacity>
                  </View>
                  {postsLoading ? (
                    <View style={styles.loadingContainer}><ActivityIndicator color={COLORS.primary} /></View>
                  ) : (
                    <FlatList
                      data={posts}
                      keyExtractor={(item) => item.id}
                      renderItem={renderPost}
                      contentContainerStyle={styles.listContent}
                      ListEmptyComponent={<Text style={styles.emptyText}>No posts yet — be the first to share something.</Text>}
                    />
                  )}
                </KeyboardAvoidingView>
              )}
            </>
          )}
        </>
      ) : (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load community</Text>
        </View>
      )}

      <Modal visible={pinPickerOpen} animationType="slide" transparent onRequestClose={() => setPinPickerOpen(false)}>
        <View style={styles.pinModalOverlay}>
          <View style={styles.pinModalSheet}>
            <View style={styles.pinModalHeader}>
              <Text style={TYPOGRAPHY.h3}>Pin an App or Game</Text>
              <TouchableOpacity onPress={() => setPinPickerOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={PINNABLE_ALL}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.pinModalList}
              renderItem={({ item }) => {
                const isPinned = community?.pinnedAppIds?.includes(item.id);
                return (
                  <TouchableOpacity style={styles.pinModalRow} onPress={() => togglePin(item)} disabled={pinBusyId === item.id}>
                    <LinearGradient colors={item.gradient} style={styles.pinModalIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Ionicons name={item.icon as any} size={18} color="#fff" />
                    </LinearGradient>
                    <Text style={styles.pinModalRowText}>{item.name}</Text>
                    {pinBusyId === item.id ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Ionicons name={isPinned ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={isPinned ? COLORS.primary : COLORS.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
