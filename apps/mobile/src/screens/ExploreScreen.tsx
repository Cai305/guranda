import React, { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { fetchApi } from '../utils/api';
import { PostDto } from '@mxit2/types';
import { useAuth } from '../context/AuthContext';
import TrendingStoriesFeed from '../components/TrendingStoriesFeed';
import ChallengeCard, { ChallengeSummary } from '../components/ChallengeCard';

const CHALLENGE_CATEGORIES = [
  'DANCE', 'COMEDY', 'FITNESS', 'GAMING', 'PHOTOGRAPHY', 'COOKING',
  'BUSINESS', 'MUSIC', 'LIFESTYLE', 'SPORTS', 'COUPLES', 'SPONSORED',
];

function PostMedia({ mediaUrl, mediaType }: { mediaUrl: string, mediaType?: 'IMAGE' | 'VIDEO' }) {
  const isVideo = mediaType === 'VIDEO';
  const player = useVideoPlayer(isVideo ? mediaUrl : null, p => { p.loop = false; });
  const styles = useThemedStyles(({ COLORS }) => ({
    postMedia: {
      width: '100%',
      height: 280,
      backgroundColor: COLORS.background,
    },
  }));
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
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges' | 'trending'>('feed');
  const [feedMode, setFeedMode] = useState<'forYou' | 'following'>('forYou');
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [challengeCategory, setChallengeCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Dedupes view-impression calls per post per screen visit — reset only on
  // a real feed refetch (mode switch or pull-to-refresh), not on scroll.
  const viewedIds = useRef(new Set<string>());

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'feed') {
        fetchFeed();
      } else if (activeTab === 'challenges') {
        fetchChallenges();
      }
    }, [activeTab, feedMode, challengeCategory])
  );

  const fetchChallenges = async () => {
    try {
      setLoading(true);
      const qs = challengeCategory ? `?category=${challengeCategory}` : '';
      const res = await fetchApi(`/challenges${qs}`);
      if (res.ok) {
        setChallenges(await res.json());
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

  const renderChallenge = ({ item }: { item: ChallengeSummary }) => (
    <ChallengeCard
      challenge={item}
      onPress={() => navigation.navigate('ChallengeDetail', { challengeId: item.id })}
    />
  );

  const renderPost = ({ item }: { item: PostDto }) => {
    const hasLiked = item.likes?.some(l => l.userId === user?.userId);
    const hasReposted = item.reposts?.some(r => r.userId === user?.userId);
    const isBookmarked = !!item.isBookmarkedByMe;
    const displayName = item.author?.displayName || item.author?.username || 'User';
    const openDetail = () => navigation.navigate('PostComments', { postId: item.id });
    return (
      <View style={styles.postCard}>
        <TouchableOpacity activeOpacity={0.85} onPress={openDetail}>
          <View style={styles.postHeader}>
            <View style={styles.postAvatarCol}>
              <Image
                source={{ uri: item.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${displayName}` }}
                style={styles.postAvatar}
              />
            </View>
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
        </TouchableOpacity>
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

  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 15,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    listContent: {
      paddingHorizontal: 20,
      paddingBottom: 80,
      gap: 12,
    },
    categoryRow: {
      paddingHorizontal: 20,
      paddingBottom: 12,
      gap: 8,
    },
    categoryChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    categoryChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    categoryChipText: {
      color: COLORS.textMuted,
      fontSize: 12,
      fontWeight: '700',
    },
    categoryChipTextActive: {
      color: '#fff',
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
    // Avatar sits in its own column sized as a percentage of the card (~14%,
    // within the 10-20% range X's layout uses), not a fixed pixel width, so
    // the proportion holds across device sizes. Content takes the rest via
    // postAuthorInfo's flex: 1.
    postAvatarCol: {
      width: '14%',
      alignItems: 'flex-start',
    },
    postAvatar: {
      width: '100%',
      aspectRatio: 1,
      maxWidth: 44,
      borderRadius: 999,
    },
    postAuthorInfo: {
      flex: 1,
      marginLeft: 4,
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
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={TYPOGRAPHY.h2}>Explore</Text>
          {activeTab === 'challenges' && (
            <TouchableOpacity onPress={() => navigation.navigate('ChallengesLeaderboard')}>
              <Ionicons name="trophy" size={22} color={COLORS.gold} />
            </TouchableOpacity>
          )}
        </View>

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
            style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
            onPress={() => setActiveTab('challenges')}
          >
            <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>Challenges</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => navigation.navigate('Discovery')}
          >
            <Text style={styles.tabText}>Discovery</Text>
          </TouchableOpacity>
        </View>
      </View>

      {activeTab === 'challenges' ? (
        <>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ key: null, label: 'All' }, ...CHALLENGE_CATEGORIES.map((c) => ({ key: c, label: c.charAt(0) + c.slice(1).toLowerCase() }))]}
            keyExtractor={(item) => item.key ?? 'all'}
            contentContainerStyle={styles.categoryRow}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.categoryChip, challengeCategory === item.key && styles.categoryChipActive]}
                onPress={() => setChallengeCategory(item.key)}
              >
                <Text style={[styles.categoryChipText, challengeCategory === item.key && styles.categoryChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
          />
          <FlatList
            data={challenges}
            keyExtractor={(item) => item.id}
            renderItem={renderChallenge}
            numColumns={2}
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={fetchChallenges}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyState}>
                  <Ionicons name="trophy-outline" size={48} color={COLORS.textMuted} />
                  <Text style={styles.emptyText}>No active challenges right now — check back soon!</Text>
                </View>
              ) : null
            }
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
