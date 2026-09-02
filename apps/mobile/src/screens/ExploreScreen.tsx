import React, { useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchApi } from '../utils/api';
import { PostDto } from '@mxit2/types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ChallengeCard, { ChallengeSummary } from '../components/ChallengeCard';
import PostMediaCarousel from '../components/PostMediaCarousel';
import LiveStreamCard from '../components/LiveStreamCard';
import { toLiveStream, enterLiveStream, RealLiveStream } from '../data/liveApi';

const CHALLENGE_CATEGORIES = [
  'DANCE', 'COMEDY', 'FITNESS', 'GAMING', 'PHOTOGRAPHY', 'COOKING',
  'BUSINESS', 'MUSIC', 'LIFESTYLE', 'SPORTS', 'COUPLES', 'SPONSORED',
];

const FEED_PAGE_SIZE = 20;

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
  const { socket } = useSocket();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges' | 'trending'>('feed');
  const [feedMode, setFeedMode] = useState<'forYou' | 'following'>('forYou');
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [challengeCategory, setChallengeCategory] = useState<string | null>(null);
  const [challengeSubTab, setChallengeSubTab] = useState<'feed' | 'browse'>('feed');
  const [trending, setTrending] = useState<{ posts: PostDto[]; challenges: ChallengeSummary[]; live: RealLiveStream[]; trends: any[]; trendLabels: { label: string; count: number }[] } | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newPostCount, setNewPostCount] = useState(0);
  // The single post currently most-visible in the viewport — gates which
  // carousel (if any) is allowed to mount/play a video, so scrolled-off posts
  // never keep decoding video in the background.
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<PostDto>>(null);
  // Dedupes view-impression calls per post per screen visit — reset only on
  // a real feed refetch (mode switch or pull-to-refresh), not on scroll.
  const viewedIds = useRef(new Set<string>());

  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'feed') {
        fetchFeed();
      } else if (activeTab === 'challenges') {
        fetchChallenges();
      } else if (activeTab === 'trending') {
        fetchTrending();
      }
    }, [activeTab, feedMode, challengeCategory])
  );

  // Live "new posts" signal — X-style: never silently splice new items into
  // a feed the user is actively scrolled through, just surface a count and
  // let them opt into refreshing (see the banner in the feed's ListHeader).
  React.useEffect(() => {
    if (!socket || activeTab !== 'feed') return;
    const handler = (payload: { authorId: string }) => {
      if (payload.authorId === user?.userId) return; // own post — already visible via navigation-back refetch
      setNewPostCount((c) => c + 1);
    };
    socket.on('post_created', handler);
    return () => {
      socket.off('post_created', handler);
    };
  }, [socket, activeTab, user?.userId]);

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

  const fetchTrending = async () => {
    try {
      setTrendingLoading(true);
      const res = await fetchApi('/trending');
      if (res.ok) {
        const data = await res.json();
        setTrending({
          posts: data.posts,
          challenges: data.challenges,
          live: (data.live as any[]).map(toLiveStream),
          trends: data.trends ?? [],
          trendLabels: data.trendLabels ?? [],
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTrendingLoading(false);
    }
  };

  // Trend stories come back with a flattened `author` (not the nested
  // `user` shape StoryViewerScreen's groups expect) — reshape into a single
  // one-story "group" so the existing full-screen viewer just works.
  const openTrendStory = (story: any) => {
    navigation.navigate('StoryViewer', {
      groups: [{ userId: story.userId, user: story.author, stories: [story] }],
      initialGroupIndex: 0,
    });
  };

  const uploadTrend = (label?: string) => {
    navigation.navigate('CreateStory', label ? { mode: 'trend', label } : { mode: 'trend' });
  };

  // /posts (For You) reranks its raw pool by score before paginating, so it
  // can't hand back a reliable cursor as "the last post in this page" the
  // way /posts/following (plain chronological order) can — it returns an
  // explicit { posts, nextCursor } envelope instead; see posts.service.ts's
  // getFeed for why deriving the cursor from the reranked page would silently
  // skip posts. /posts/following keeps returning a plain PostDto[].
  const fetchFeed = async () => {
    try {
      setLoading(true);
      viewedIds.current.clear();
      cursorRef.current = null;
      setNewPostCount(0);
      if (feedMode === 'following') {
        const res = await fetchApi(`/posts/following?take=${FEED_PAGE_SIZE}`);
        if (res.ok) {
          const data: PostDto[] = await res.json();
          setPosts(data);
          cursorRef.current = data.length ? String(data[data.length - 1].createdAt) : null;
          setHasMore(data.length === FEED_PAGE_SIZE);
        }
      } else {
        const res = await fetchApi(`/posts?take=${FEED_PAGE_SIZE}`);
        if (res.ok) {
          const data: { posts: PostDto[]; nextCursor: string | null } = await res.json();
          setPosts(data.posts);
          cursorRef.current = data.nextCursor;
          setHasMore(data.nextCursor !== null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore || !cursorRef.current || activeTab !== 'feed') return;
    try {
      setLoadingMore(true);
      if (feedMode === 'following') {
        const res = await fetchApi(`/posts/following?take=${FEED_PAGE_SIZE}&cursor=${encodeURIComponent(cursorRef.current)}`);
        if (res.ok) {
          const data: PostDto[] = await res.json();
          setPosts((prev) => [...prev, ...data]);
          cursorRef.current = data.length ? String(data[data.length - 1].createdAt) : cursorRef.current;
          setHasMore(data.length === FEED_PAGE_SIZE);
        }
      } else {
        const res = await fetchApi(`/posts?take=${FEED_PAGE_SIZE}&cursor=${encodeURIComponent(cursorRef.current)}`);
        if (res.ok) {
          const data: { posts: PostDto[]; nextCursor: string | null } = await res.json();
          setPosts((prev) => [...prev, ...data.posts]);
          cursorRef.current = data.nextCursor;
          setHasMore(data.nextCursor !== null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  };

  const refreshWithNewPosts = () => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    fetchFeed();
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
    // Most-visible item drives which post's video (if any) is allowed to
    // mount — picking viewableItems[0] rather than tracking a whole set
    // keeps at most one video decoding at a time, TikTok/Instagram-style.
    setVisiblePostId(viewableItems[0]?.item?.id ?? null);
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
              <ExpoImage
                source={{ uri: item.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${displayName}` }}
                style={styles.postAvatar}
                cachePolicy="disk"
                transition={100}
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
          {item.media?.length ? (
            <View style={styles.postMediaWrap}>
              <PostMediaCarousel media={item.media} active={item.id === visiblePostId} />
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
    newPostsBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      alignSelf: 'center',
      backgroundColor: COLORS.primary,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 16,
      paddingVertical: 9,
      marginBottom: 12,
      elevation: 3,
      shadowColor: COLORS.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
    },
    newPostsBannerText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
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
      // bottom is set dynamically via insets in JSX (matches ChatListScreen's
      // and AiFloatingOrb's insets.bottom + 76) — without that tab-bar-height
      // offset this renders underneath the bottom tab bar.
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
    },

    // ── Trends (Trending tab) ────────────────────────────────
    trendsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginTop: 8,
      marginBottom: 10,
    },
    uploadTrendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: COLORS.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: RADIUS.pill,
    },
    uploadTrendBtnText: {
      color: COLORS.surface,
      fontWeight: '700',
      fontSize: 13,
    },
    trendChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: COLORS.surface,
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    trendChipText: {
      color: COLORS.text,
      fontWeight: '700',
      fontSize: 13,
    },
    trendChipCount: {
      color: COLORS.textMuted,
      fontSize: 12,
    },
    trendCard: {
      width: 130,
    },
    trendCardImage: {
      width: 130,
      height: 170,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surface,
    },
    trendCardImageFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    trendCardFallbackText: {
      color: COLORS.textMuted,
      fontSize: 13,
      textAlign: 'center',
    },
    trendCardLabelChip: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: RADIUS.pill,
    },
    trendCardLabelText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 11,
    },
    trendCardAuthor: {
      color: COLORS.textMuted,
      fontSize: 12,
      marginTop: 6,
    },
    trendEmptyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 20,
      marginBottom: 8,
      padding: 14,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    trendEmptyText: {
      color: COLORS.textMuted,
      fontSize: 13,
      flex: 1,
    },

    // ── Challenge sub-tabs ──────────────────────────────────
    challengeSubTabRow: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginBottom: 14,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.md,
      padding: 4,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    challengeSubTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: RADIUS.sm,
    },
    challengeSubTabActive: {
      backgroundColor: COLORS.primary,
    },
    challengeSubTabText: {
      color: COLORS.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    challengeSubTabTextActive: {
      color: '#fff',
    },

    // ── Feed entry card (For You tap-to-open) ───────────────
    feedEntryCard: {
      marginHorizontal: 20,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    feedEntryGradientWrap: {
      backgroundColor: '#0F0A1E',
      padding: 28,
      alignItems: 'center',
      gap: 10,
      minHeight: 220,
      justifyContent: 'center',
    },
    feedEntryIconRow: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: COLORS.primary,
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 6,
    },
    feedEntryTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
    },
    feedEntrySubtitle: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 13,
      textAlign: 'center',
      lineHeight: 19,
    },
    feedEntryBadgeRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 4,
    },
    feedEntryBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(139,92,246,0.3)',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor: 'rgba(139,92,246,0.5)',
    },
    feedEntryBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
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
          {/* ── Challenges sub-tab bar ── */}
          <View style={styles.challengeSubTabRow}>
            <TouchableOpacity
              style={[styles.challengeSubTab, challengeSubTab === 'feed' && styles.challengeSubTabActive]}
              onPress={() => setChallengeSubTab('feed')}
            >
              <Ionicons name="play" size={14} color={challengeSubTab === 'feed' ? '#fff' : COLORS.textMuted} />
              <Text style={[styles.challengeSubTabText, challengeSubTab === 'feed' && styles.challengeSubTabTextActive]}>
                For You
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.challengeSubTab, challengeSubTab === 'browse' && styles.challengeSubTabActive]}
              onPress={() => setChallengeSubTab('browse')}
            >
              <Ionicons name="grid" size={14} color={challengeSubTab === 'browse' ? '#fff' : COLORS.textMuted} />
              <Text style={[styles.challengeSubTabText, challengeSubTab === 'browse' && styles.challengeSubTabTextActive]}>
                Browse
              </Text>
            </TouchableOpacity>
          </View>

          {challengeSubTab === 'feed' ? (
            /* ── For You: navigate directly ── */
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingTop: 40 }}>
              <LinearGradient colors={['#8B5CF6', '#6366F1']} style={{ width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="play-circle" size={40} color="#fff" />
              </LinearGradient>
              <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '800' }}>For You Feed</Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>Infinite scroll through challenge entries from your area and beyond</Text>
              <TouchableOpacity style={{ backgroundColor: COLORS.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 13 }} onPress={() => navigation.navigate('ChallengesFeed')}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Open Feed</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ── Browse: category filter + grid ── */
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
          )}
        </>
      ) : activeTab === 'feed' ? (
        <FlatList
          key="feed-flatlist"
          ref={listRef}
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={loading}
          onRefresh={fetchFeed}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 500 }}
          onEndReached={loadMorePosts}
          onEndReachedThreshold={0.6}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews
          ListHeaderComponent={
            <>
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
              {newPostCount > 0 && (
                <TouchableOpacity style={styles.newPostsBanner} activeOpacity={0.85} onPress={refreshWithNewPosts}>
                  <Ionicons name="arrow-up" size={14} color="#fff" />
                  <Text style={styles.newPostsBannerText}>
                    {newPostCount === 1 ? '1 new post' : `${newPostCount} new posts`}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          }
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ paddingVertical: 20 }} color={COLORS.primary} /> : null
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
        <FlatList
          key="trending-flatlist"
          data={trending?.posts ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={trendingLoading}
          onRefresh={fetchTrending}
          ListHeaderComponent={
            <>
              <View style={styles.trendsHeaderRow}>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800' }}>✨ Trends</Text>
                <TouchableOpacity style={styles.uploadTrendBtn} activeOpacity={0.85} onPress={() => uploadTrend()}>
                  <Ionicons name="add" size={16} color={COLORS.surface} />
                  <Text style={styles.uploadTrendBtnText}>Upload</Text>
                </TouchableOpacity>
              </View>
              {!!trending?.trendLabels.length && (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={trending.trendLabels}
                  keyExtractor={(item) => item.label}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginBottom: 12 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.trendChip} activeOpacity={0.8} onPress={() => uploadTrend(item.label)}>
                      <Text style={styles.trendChipText}>#{item.label}</Text>
                      <Text style={styles.trendChipCount}>{item.count}</Text>
                    </TouchableOpacity>
                  )}
                />
              )}
              {trending?.trends.length ? (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={trending.trends}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ paddingHorizontal: 20, gap: 12, marginBottom: 4 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.trendCard} activeOpacity={0.85} onPress={() => openTrendStory(item)}>
                      {item.mediaUrl ? (
                        <ExpoImage source={{ uri: item.mediaUrl }} style={styles.trendCardImage} contentFit="cover" />
                      ) : (
                        <View style={[styles.trendCardImage, styles.trendCardImageFallback]}>
                          <Text numberOfLines={4} style={styles.trendCardFallbackText}>{item.textContent || '✨'}</Text>
                        </View>
                      )}
                      <View style={styles.trendCardLabelChip}>
                        <Text style={styles.trendCardLabelText}>#{item.label}</Text>
                      </View>
                      <Text style={styles.trendCardAuthor} numberOfLines={1}>{item.author?.displayName || item.author?.username}</Text>
                    </TouchableOpacity>
                  )}
                  style={{ marginBottom: 8 }}
                />
              ) : (
                !trendingLoading && (
                  <TouchableOpacity style={styles.trendEmptyRow} activeOpacity={0.85} onPress={() => uploadTrend()}>
                    <Ionicons name="sparkles-outline" size={18} color={COLORS.textMuted} />
                    <Text style={styles.trendEmptyText}>No trends yet — be the first to post an OOTD, FOTD, or your own.</Text>
                  </TouchableOpacity>
                )
              )}
              {!!trending?.live.length && (
                <>
                  <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800', paddingHorizontal: 20, marginTop: 8, marginBottom: 10 }}>
                    🔴 Live Now
                  </Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={trending.live}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
                    renderItem={({ item }) => (
                      <LiveStreamCard
                        stream={item}
                        size="compact"
                        onPress={(s) => enterLiveStream(s, user?.userId, navigation, trending.live)}
                      />
                    )}
                  />
                </>
              )}
              {!!trending?.challenges.length && (
                <>
                  <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800', paddingHorizontal: 20, marginTop: 20, marginBottom: 10 }}>
                    🏆 Trending Challenges
                  </Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={trending.challenges}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingHorizontal: 20 }}
                    renderItem={({ item }) => (
                      <ChallengeCard
                        challenge={item}
                        style={{ width: 170, marginRight: 12 }}
                        onPress={() => navigation.navigate('ChallengeDetail', { challengeId: item.id })}
                      />
                    )}
                  />
                </>
              )}
              {!!trending?.posts.length && (
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '800', paddingHorizontal: 20, marginTop: 20, marginBottom: 4 }}>
                  📈 Trending Posts
                </Text>
              )}
            </>
          }
          ListEmptyComponent={
            !trendingLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="flame-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nothing trending yet — check back soon.</Text>
              </View>
            ) : null
          }
        />
      ) : null}

      {activeTab === 'feed' ? (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 76 }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreatePost')}
        >
          <Ionicons name="add" size={30} color={COLORS.surface} />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}
