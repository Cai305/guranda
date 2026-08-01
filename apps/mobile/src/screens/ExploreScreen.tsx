import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY, RADIUS } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { fetchApi } from '../utils/api';
import { PostDto, CommunityDto } from '@mxit2/types';
import { useAuth } from '../context/AuthContext';
import TrendingStoriesFeed from '../components/TrendingStoriesFeed';

function PostMedia({ mediaUrl, mediaType }: { mediaUrl: string, mediaType?: 'IMAGE' | 'VIDEO' }) {
  const isVideo = mediaType === 'VIDEO';
  const player = useVideoPlayer(isVideo ? mediaUrl : null, p => { p.loop = false; });
  if (isVideo) {
    return <VideoView style={styles.postMedia} player={player} contentFit="cover" nativeControls />;
  }
  return <Image source={{ uri: mediaUrl }} style={styles.postMedia} resizeMode="cover" />;
}

// Compact X-style relative time — "13h", "3d", "just now" — instead of a
// full locale date string, matching the reference feed's density.
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

export default function ExploreScreen({ navigation }: any) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'feed' | 'discover' | 'trending'>('feed');
  const [feedMode, setFeedMode] = useState<'forYou' | 'following'>('forYou');
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [communities, setCommunities] = useState<CommunityDto[]>([]);
  const [loading, setLoading] = useState(false);
  // Dedupes view-impression calls per post per screen visit — reset only on
  // a real feed refetch (mode switch or pull-to-refresh), not on scroll.
  const viewedIds = useRef(new Set<string>());

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'feed') {
        fetchFeed();
      } else {
        fetchCommunities();
      }
    }, [activeTab, feedMode])
  );

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/communities');
      if (res.ok) {
        setCommunities(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeed = async () => {
    try {
      setLoading(true);
      viewedIds.current.clear();
      const res = await fetchApi(feedMode === 'following' ? '/posts/following' : '/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (authorId: string) => {
    try {
      setPosts(prev => prev.map(p => (
        p.authorId === authorId && p.author
          ? { ...p, author: { ...p.author, isFollowedByMe: !p.author.isFollowedByMe } }
          : p
      )));
      await fetchApi(`/users/${authorId}/follow`, { method: 'POST' });
    } catch (e) {
      console.error(e);
      fetchFeed();
    }
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    for (const v of viewableItems) {
      const postId = v.item?.id;
      if (!postId || viewedIds.current.has(postId)) continue;
      viewedIds.current.add(postId);
      fetchApi(`/posts/${postId}/view`, { method: 'POST' }).catch(() => {});
    }
  }).current;

  const handleLike = async (postId: string) => {
    try {
      // Optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const hasLiked = p.likes?.some(l => l.userId === user?.userId);
          return {
            ...p,
            likes: hasLiked
              ? p.likes?.filter(l => l.userId !== user?.userId)
              : [...(p.likes || []), { id: 'temp', userId: user?.userId as string }]
          };
        }
        return p;
      }));

      await fetchApi(`/posts/${postId}/like`, { method: 'POST' });
    } catch (e) {
      console.error(e);
      fetchFeed(); // revert on failure
    }
  };

  const handleRepost = async (postId: string) => {
    try {
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const hasReposted = p.reposts?.some(r => r.userId === user?.userId);
          return {
            ...p,
            reposts: hasReposted
              ? p.reposts?.filter(r => r.userId !== user?.userId)
              : [...(p.reposts || []), { id: 'temp', userId: user?.userId as string }]
          };
        }
        return p;
      }));

      await fetchApi(`/posts/${postId}/repost`, { method: 'POST' });
    } catch (e) {
      console.error(e);
      fetchFeed();
    }
  };

  const handleBookmark = async (postId: string) => {
    try {
      setPosts(prev => prev.map(p => (
        p.id === postId ? { ...p, isBookmarkedByMe: !p.isBookmarkedByMe } : p
      )));
      await fetchApi(`/posts/${postId}/bookmark`, { method: 'POST' });
    } catch (e) {
      console.error(e);
      fetchFeed();
    }
  };

  const handleShare = async (item: PostDto) => {
    try {
      await Share.share({
        message: item.content ? `${item.content}\n\n— ${item.author?.displayName || 'Guranda'}` : 'Shared from Guranda',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const renderRoom = ({ item }: { item: CommunityDto }) => (
    <TouchableOpacity style={styles.roomCard} activeOpacity={0.7} onPress={() => navigation.navigate('Community', { communityId: item.id, communityName: item.name })}>
      <View style={[styles.roomIcon, { backgroundColor: '#3A86FF' }]}>  
        <Ionicons name="earth" size={24} color="#FFF" />
      </View>
      <View style={styles.roomInfo}>
        <Text style={TYPOGRAPHY.body1}>{item.name}</Text>
        <Text style={[TYPOGRAPHY.body2, { marginTop: 2 }]} numberOfLines={1}>{item.description}</Text>
      </View>
      <View style={styles.membersBadge}>
        <Ionicons name="people-outline" size={14} color={COLORS.textMuted} />
        <Text style={styles.membersText}>{item._count?.members || 0}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderPost = ({ item }: { item: PostDto }) => {
    const hasLiked = item.likes?.some(l => l.userId === user?.userId);
    const hasReposted = item.reposts?.some(r => r.userId === user?.userId);
    const isBookmarked = !!item.isBookmarkedByMe;
    const displayName = item.author?.displayName || item.author?.username || 'User';
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Image
            source={{ uri: item.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${displayName}` }}
            style={styles.postAvatar}
          />
          <View style={styles.postAuthorInfo}>
            <View style={styles.postNameRow}>
              <Text style={styles.postAuthorName} numberOfLines={1}>{displayName}</Text>
              {item.author?.verified && (
                <Ionicons name="checkmark-circle" size={15} color={COLORS.primary} style={{ marginLeft: 3 }} />
              )}
            </View>
            <Text style={styles.postTime} numberOfLines={1}>
              {item.author?.username ? `@${item.author.username} · ` : ''}{timeAgo(item.createdAt as any)}
            </Text>
          </View>
          {item.authorId !== user?.userId && !item.author?.isFollowedByMe && (
            <TouchableOpacity style={styles.followBtn} onPress={() => handleFollow(item.authorId)}>
              <Text style={styles.followBtnText}>Follow</Text>
            </TouchableOpacity>
          )}
        </View>
        {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}
        {item.mediaUrl ? (
          <View style={styles.postMediaWrap}>
            <PostMedia mediaUrl={item.mediaUrl} mediaType={item.mediaType} />
          </View>
        ) : null}
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PostComments', { postId: item.id })}>
            <Ionicons name="chatbubble-outline" size={18} color={COLORS.textMuted} />
            <Text style={styles.actionText}>{item.comments?.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleRepost(item.id)}>
            <Ionicons name="repeat-outline" size={18} color={hasReposted ? '#10B981' : COLORS.textMuted} />
            <Text style={[styles.actionText, hasReposted && { color: '#10B981' }]}>{item.reposts?.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
            <Ionicons name={hasLiked ? 'heart' : 'heart-outline'} size={18} color={hasLiked ? '#F43F5E' : COLORS.textMuted} />
            <Text style={[styles.actionText, hasLiked && { color: '#F43F5E' }]}>{item.likes?.length || 0}</Text>
          </TouchableOpacity>
          <View style={styles.actionButton}>
            <Ionicons name="stats-chart-outline" size={16} color={COLORS.textMuted} />
            <Text style={styles.actionText}>{item.views ?? 0}</Text>
          </View>
          <TouchableOpacity style={styles.actionButtonSolo} onPress={() => handleBookmark(item.id)}>
            <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={isBookmarked ? COLORS.gold : COLORS.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButtonSolo} onPress={() => handleShare(item)}>
            <Ionicons name="share-outline" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={TYPOGRAPHY.h2}>Explore</Text>
        
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'feed' && styles.activeTab]}
            onPress={() => setActiveTab('feed')}
          >
            <Text style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>Social Feed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'trending' && styles.activeTab]}
            onPress={() => setActiveTab('trending')}
          >
            <Text style={[styles.tabText, activeTab === 'trending' && styles.activeTabText]}>Trending</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discover' && styles.activeTab]}
            onPress={() => setActiveTab('discover')}
          >
            <Text style={[styles.tabText, activeTab === 'discover' && styles.activeTabText]}>Community</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => navigation.navigate('Discovery')}
          >
            <Text style={styles.tabText}>Discovery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'discover' ? (
        <>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search communities..."
              placeholderTextColor={COLORS.textMuted}
            />
          </View>

          <FlatList
            data={communities}
            keyExtractor={(item) => item.id}
            renderItem={renderRoom}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={fetchCommunities}
          />
        </>
      ) : activeTab === 'feed' ? (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchFeed}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 500 }}
          ListHeaderComponent={
            <View style={styles.feedModeRow}>
              <TouchableOpacity
                style={[styles.feedModeTab, feedMode === 'forYou' && styles.feedModeTabActive]}
                onPress={() => setFeedMode('forYou')}
              >
                <Text style={[styles.feedModeText, feedMode === 'forYou' && styles.feedModeTextActive]}>For You</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.feedModeTab, feedMode === 'following' && styles.feedModeTabActive]}
                onPress={() => setFeedMode('following')}
              >
                <Text style={[styles.feedModeText, feedMode === 'following' && styles.feedModeTextActive]}>Following</Text>
              </TouchableOpacity>
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Ionicons name="newspaper-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>
                  {feedMode === 'following'
                    ? "You're not following anyone yet. Follow people to see their posts here."
                    : 'No posts yet. Be the first to share!'}
                </Text>
              </View>
            ) : null
          }
        />
      ) : activeTab === 'trending' ? (
        <TrendingStoriesFeed navigation={navigation} />
      ) : null}

      {activeTab === 'feed' ? (
        <TouchableOpacity 
          style={styles.fab} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Ionicons name="add" size={30} color={COLORS.surface} />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: COLORS.surface,
  },
  tabText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.text,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
    gap: 12,
  },
  roomCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomInfo: {
    flex: 1,
    marginLeft: 14,
  },
  membersBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  membersText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  postCard: {
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  followBtn: {
    backgroundColor: COLORS.text,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
  },
  followBtnText: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 12,
  },
  feedModeRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 12,
  },
  feedModeTab: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  feedModeTabActive: {
    borderBottomColor: COLORS.primary,
  },
  feedModeText: {
    ...TYPOGRAPHY.body2,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  feedModeTextActive: {
    color: COLORS.text,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  postAuthorInfo: {
    flex: 1,
  },
  postNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postAuthorName: {
    ...TYPOGRAPHY.body1,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  postTime: {
    ...TYPOGRAPHY.body2,
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  postContent: {
    ...TYPOGRAPHY.body1,
    lineHeight: 22,
    marginBottom: 15,
  },
  postMediaWrap: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    marginBottom: 15,
  },
  postMedia: {
    width: '100%',
    height: 280,
    backgroundColor: COLORS.background,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonSolo: {
    alignItems: 'center',
  },
  actionText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textMuted,
    marginTop: 15,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  }
});
