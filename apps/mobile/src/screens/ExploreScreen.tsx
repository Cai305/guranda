import React, { useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Share, ActivityIndicator, TextInput, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { GRADIENTS } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { fetchApi } from '../utils/api';
import { PostDto } from '@mxit2/types';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import ChallengeCard, { ChallengeSummary } from '../components/ChallengeCard';
import PostMediaCarousel from '../components/PostMediaCarousel';
import LiveStreamCard from '../components/LiveStreamCard';
import VideoCard, { VideoMeta } from '../components/VideoCard';
import { toLiveStream, enterLiveStream, RealLiveStream } from '../data/liveApi';
import { useEffectiveModules, openModule, LifeModule } from '../config/modules';

const CHALLENGE_CATEGORIES = [
  'DANCE', 'COMEDY', 'FITNESS', 'GAMING', 'PHOTOGRAPHY', 'COOKING',
  'BUSINESS', 'MUSIC', 'LIFESTYLE', 'SPORTS', 'COUPLES', 'SPONSORED',
];

const FEED_PAGE_SIZE = 20;
const FILTERS = ['All', 'Posts', 'Videos', 'Challenges', 'Live', 'Mini Apps'] as const;
type ExploreFilter = typeof FILTERS[number];

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

function timeRemaining(endAt: string): string {
  const ms = new Date(endAt).getTime() - Date.now();
  if (ms <= 0) return 'Ended';
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 1) return `${Math.max(1, Math.floor(ms / 60_000))}m left`;
  if (hrs < 24) return `${hrs}h left`;
  return `${Math.floor(hrs / 24)}d left`;
}

// One momentum stream mixing everything real — posts, challenges, live
// streams, mini apps — instead of fixed, siloed tabs. Interleaved in a
// steady rotation so no single type can crowd the others out.
type StreamItem =
  | { kind: 'post'; key: string; data: PostDto }
  | { kind: 'challenge'; key: string; data: ChallengeSummary }
  | { kind: 'live'; key: string; data: RealLiveStream }
  | { kind: 'video'; key: string; data: VideoMeta }
  | { kind: 'miniapp'; key: string; data: LifeModule };

// Interleaves 5 already-independently-ranked sources (each ranked by its
// own momentum signal server-side — trending.service.ts's own comment
// explains why: "independently-ranked lists... not one merged/score-
// normalized list") in a fixed round-robin, NOT a cross-type ranking by
// momentum. Keep the subtitle copy honest about that — "each ranked by
// what's moving, all in one stream" — rather than implying a single
// global rank across types.
function buildAllStream(
  posts: PostDto[],
  challenges: ChallengeSummary[],
  live: RealLiveStream[],
  videos: VideoMeta[],
  miniApps: LifeModule[],
): StreamItem[] {
  const items: StreamItem[] = [];
  let pi = 0, ci = 0, li = 0, vi = 0, ai = 0;
  const cappedApps = miniApps.slice(0, 4);
  const order: StreamItem['kind'][] = ['post', 'challenge', 'video', 'miniapp', 'live'];
  let step = 0;
  const remaining = () => pi < posts.length || ci < challenges.length || li < live.length || vi < videos.length || ai < cappedApps.length;
  while (remaining()) {
    const slot = order[step % order.length];
    let placed = false;
    if (slot === 'post' && pi < posts.length) { items.push({ kind: 'post', key: `p-${posts[pi].id}`, data: posts[pi] }); pi++; placed = true; }
    else if (slot === 'challenge' && ci < challenges.length) { items.push({ kind: 'challenge', key: `c-${challenges[ci].id}`, data: challenges[ci] }); ci++; placed = true; }
    else if (slot === 'video' && vi < videos.length) { items.push({ kind: 'video', key: `v-${videos[vi].id}`, data: videos[vi] }); vi++; placed = true; }
    else if (slot === 'miniapp' && ai < cappedApps.length) { items.push({ kind: 'miniapp', key: `m-${cappedApps[ai].id}`, data: cappedApps[ai] }); ai++; placed = true; }
    else if (slot === 'live' && li < live.length) { items.push({ kind: 'live', key: `l-${live[li].id}`, data: live[li] }); li++; placed = true; }
    if (!placed) {
      // This slot's source ran dry — fill from whatever's left instead of
      // stalling the loop, so no type gets stranded behind an empty one.
      if (pi < posts.length) { items.push({ kind: 'post', key: `p-${posts[pi].id}`, data: posts[pi] }); pi++; }
      else if (ci < challenges.length) { items.push({ kind: 'challenge', key: `c-${challenges[ci].id}`, data: challenges[ci] }); ci++; }
      else if (vi < videos.length) { items.push({ kind: 'video', key: `v-${videos[vi].id}`, data: videos[vi] }); vi++; }
      else if (li < live.length) { items.push({ kind: 'live', key: `l-${live[li].id}`, data: live[li] }); li++; }
      else if (ai < cappedApps.length) { items.push({ kind: 'miniapp', key: `m-${cappedApps[ai].id}`, data: cappedApps[ai] }); ai++; }
    }
    step++;
  }
  return items;
}

export default function ExploreScreen({ navigation }: any) {
  const { user } = useAuth();
  const { socket } = useSocket();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<ExploreFilter>('All');
  const [feedMode, setFeedMode] = useState<'forYou' | 'following'>('forYou');
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [challenges, setChallenges] = useState<ChallengeSummary[]>([]);
  const [challengeCategory, setChallengeCategory] = useState<string | null>(null);
  const [challengeSubTab, setChallengeSubTab] = useState<'feed' | 'browse'>('feed');
  const [trending, setTrending] = useState<{ posts: PostDto[]; challenges: ChallengeSummary[]; live: RealLiveStream[]; videos: VideoMeta[]; trends: any[]; trendLabels: { label: string; count: number }[] } | null>(null);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newPostCount, setNewPostCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // The single post currently most-visible in the viewport — gates which
  // carousel (if any) is allowed to mount/play a video, so scrolled-off posts
  // never keep decoding video in the background.
  const [visiblePostId, setVisiblePostId] = useState<string | null>(null);
  const cursorRef = useRef<string | null>(null);
  const listRef = useRef<FlatList<PostDto>>(null);
  // Dedupes view-impression calls per post per screen visit — reset only on
  // a real feed refetch (mode switch or pull-to-refresh), not on scroll.
  const viewedIds = useRef(new Set<string>());

  const effectiveModules = useEffectiveModules();
  // Real "discoverable" set — apps not yet installed from the store, per the
  // same registry the Home rail and the Mini Apps store already use. No
  // fabricated "new to you" signal beyond that real installable status.
  const discoverableApps = useMemo(
    () => effectiveModules.filter((m) => m.status === 'installable'),
    [effectiveModules],
  );

  useFocusEffect(
    useCallback(() => {
      if (filter === 'All' || filter === 'Live' || filter === 'Videos') {
        fetchTrending();
      } else if (filter === 'Posts') {
        fetchFeed();
      } else if (filter === 'Challenges') {
        fetchChallenges();
      }
      // Mini Apps needs no fetch — the registry is already loaded client-side.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter, feedMode, challengeCategory])
  );

  // Live "new posts" signal — X-style: never silently splice new items into
  // a feed the user is actively scrolled through, just surface a count and
  // let them opt into refreshing (see the banner in the feed's ListHeader).
  React.useEffect(() => {
    if (!socket || filter !== 'Posts') return;
    const handler = (payload: { authorId: string }) => {
      if (payload.authorId === user?.userId) return; // own post — already visible via navigation-back refetch
      setNewPostCount((c) => c + 1);
    };
    socket.on('post_created', handler);
    return () => {
      socket.off('post_created', handler);
    };
  }, [socket, filter, user?.userId]);

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
          videos: data.videos ?? [],
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

  const uploadTrend = (label?: string) => {
    navigation.navigate('CreateStory', label ? { mode: 'trend', label } : { mode: 'trend' });
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
    if (loadingMore || !hasMore || !cursorRef.current || filter !== 'Posts') return;
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
    const first = viewableItems[0]?.item;
    setVisiblePostId(first?.kind ? (first.kind === 'post' ? first.data.id : null) : (first?.id ?? null));
    for (const v of viewableItems) {
      const raw = v.item;
      const post: PostDto | undefined = raw?.kind === 'post' ? raw.data : (raw?.id && !raw.kind ? raw : undefined);
      const postId = post?.id;
      if (!postId || viewedIds.current.has(postId)) continue;
      viewedIds.current.add(postId);
      fetchApi(`/posts/${postId}/view`, { method: 'POST' }).catch(() => {});
    }
  }).current;

  const handleLike = async (postId: string) => {
    try {
      const applyLike = (list: PostDto[]) => list.map(p => {
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
      });
      setPosts(applyLike);
      setTrending(prev => prev ? { ...prev, posts: applyLike(prev.posts) } : prev);
      await fetchApi(`/posts/${postId}/like`, { method: 'POST' });
    } catch (e) {
      console.error(e);
      if (filter === 'Posts') fetchFeed(); else fetchTrending();
    }
  };

  const handleRepost = async (postId: string) => {
    try {
      const applyRepost = (list: PostDto[]) => list.map(p => {
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
      });
      setPosts(applyRepost);
      setTrending(prev => prev ? { ...prev, posts: applyRepost(prev.posts) } : prev);
      await fetchApi(`/posts/${postId}/repost`, { method: 'POST' });
    } catch (e) {
      console.error(e);
      if (filter === 'Posts') fetchFeed(); else fetchTrending();
    }
  };

  const handleBookmark = async (postId: string) => {
    try {
      const applyBookmark = (list: PostDto[]) => list.map(p => (
        p.id === postId ? { ...p, isBookmarkedByMe: !p.isBookmarkedByMe } : p
      ));
      setPosts(applyBookmark);
      setTrending(prev => prev ? { ...prev, posts: applyBookmark(prev.posts) } : prev);
      await fetchApi(`/posts/${postId}/bookmark`, { method: 'POST' });
    } catch (e) {
      console.error(e);
      if (filter === 'Posts') fetchFeed(); else fetchTrending();
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

  const submitPostReport = async (postId: string, reason: string) => {
    try {
      const res = await fetchApi(`/posts/${postId}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
      if (!res.ok) throw new Error();
      Alert.alert('Reported', 'Thanks — our team will review this post.');
    } catch {
      Alert.alert('Couldn\'t send report', 'Please try again.');
    }
  };

  const handleReportPost = (postId: string) => {
    Alert.alert('Report post', 'Why are you reporting this?', [
      { text: 'Spam', onPress: () => submitPostReport(postId, 'spam') },
      { text: 'Harassment', onPress: () => submitPostReport(postId, 'harassment') },
      { text: 'Nudity or sexual content', onPress: () => submitPostReport(postId, 'nudity') },
      { text: 'Violence', onPress: () => submitPostReport(postId, 'violence') },
      { text: 'Misinformation', onPress: () => submitPostReport(postId, 'misinformation') },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
      paddingBottom: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    subtitle: {
      color: COLORS.textMuted,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 6,
      marginBottom: 14,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      borderColor: COLORS.border,
      paddingHorizontal: 14,
      marginBottom: 12,
    },
    searchInput: {
      flex: 1,
      color: COLORS.text,
      paddingVertical: 10,
      fontSize: 14,
    },
    filterRow: {
      paddingHorizontal: 20,
      paddingBottom: 14,
      gap: 8,
    },
    filterChip: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: RADIUS.pill,
      backgroundColor: COLORS.glass,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    },
    filterChipActive: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary,
    },
    filterChipText: {
      color: COLORS.textMuted,
      fontSize: 13,
      fontWeight: '700',
    },
    filterChipTextActive: {
      color: '#fff',
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
    postMoreBtn: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      marginLeft: 4,
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

    // ── Featured "trending challenge" hero card, used in the All stream ──
    heroCard: {
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      minHeight: 150,
      padding: 16,
      justifyContent: 'space-between',
    },
    heroBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(0,0,0,0.28)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 12,
      paddingVertical: 5,
    },
    heroBadgeText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    heroTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
    },
    heroSubtitle: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12.5,
      marginTop: 3,
    },

    // ── Mini-app discovery card, used in the All stream + Mini Apps filter ──
    miniAppCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: 14,
    },
    miniAppIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },
    miniAppInfo: {
      flex: 1,
    },
    miniAppNameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    miniAppName: {
      color: COLORS.text,
      fontSize: 14.5,
      fontWeight: '700',
    },
    miniAppNewBadge: {
      backgroundColor: 'rgba(52,211,153,0.14)',
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    miniAppNewBadgeText: {
      color: '#34D399',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.3,
    },
    miniAppTagline: {
      color: COLORS.textMuted,
      fontSize: 12.5,
      marginTop: 2,
    },
    miniAppTryBtn: {
      backgroundColor: '#34D399',
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    miniAppTryBtnText: {
      color: '#07070C',
      fontSize: 12.5,
      fontWeight: '800',
    },

    // ── Live card used in the All stream ──
    liveHeroCard: {
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      minHeight: 140,
      padding: 16,
      justifyContent: 'space-between',
    },
    livePillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 6,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: RADIUS.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#fff',
    },
    livePillText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: '800',
    },
    liveTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '800',
    },
    liveSubtitle: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 12.5,
      marginTop: 2,
    },
    miniAppGridRow: {
      justifyContent: 'space-between',
    },

    // ── Trend strip — hashtag "of the day" stories, shown atop the All stream ──
    trendsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
      marginBottom: 14,
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
  }));

  const searchLower = searchQuery.trim().toLowerCase();
  const matchesSearch = (text: string | null | undefined) =>
    !searchLower || (text ?? '').toLowerCase().includes(searchLower);

  const allStream = useMemo(() => {
    const items = buildAllStream(trending?.posts ?? [], trending?.challenges ?? [], trending?.live ?? [], trending?.videos ?? [], discoverableApps);
    if (!searchLower) return items;
    return items.filter((item) => {
      if (item.kind === 'post') return matchesSearch(item.data.content) || matchesSearch(item.data.author?.displayName);
      if (item.kind === 'challenge') return matchesSearch(item.data.title);
      if (item.kind === 'live') return matchesSearch(item.data.title);
      if (item.kind === 'video') return matchesSearch(item.data.title);
      return matchesSearch(item.data.name) || matchesSearch(item.data.tagline);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trending, discoverableApps, searchLower]);

  const visiblePosts = useMemo(
    () => (searchLower ? posts.filter((p) => matchesSearch(p.content) || matchesSearch(p.author?.displayName)) : posts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posts, searchLower],
  );
  const visibleChallenges = useMemo(
    () => (searchLower ? challenges.filter((c) => matchesSearch(c.title)) : challenges),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [challenges, searchLower],
  );
  const visibleLive = useMemo(
    () => (searchLower ? (trending?.live ?? []).filter((l) => matchesSearch(l.title)) : (trending?.live ?? [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trending, searchLower],
  );
  const visibleVideos = useMemo(
    () => (searchLower ? (trending?.videos ?? []).filter((v) => matchesSearch(v.title)) : (trending?.videos ?? [])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trending, searchLower],
  );
  const visibleApps = useMemo(
    () => (searchLower ? discoverableApps.filter((m) => matchesSearch(m.name) || matchesSearch(m.tagline)) : discoverableApps),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [discoverableApps, searchLower],
  );

  const renderPost = (item: PostDto) => {
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
            <TouchableOpacity style={styles.postMoreBtn} onPress={() => handleReportPost(item.id)} hitSlop={8}>
              <Ionicons name="ellipsis-vertical" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
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

  const renderHeroChallenge = (item: ChallengeSummary) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('ChallengeDetail', { challengeId: item.id })}>
      <LinearGradient colors={GRADIENTS.aurora} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>TRENDING CHALLENGE</Text>
        </View>
        <View>
          <Text style={styles.heroTitle} numberOfLines={2}>#{item.title}</Text>
          <Text style={styles.heroSubtitle}>{item._count?.entries ?? 0} entries · {timeRemaining(item.endAt)}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderHeroLive = (item: RealLiveStream) => (
    <TouchableOpacity activeOpacity={0.9} onPress={() => enterLiveStream(item, user?.userId, navigation, trending?.live ?? [])}>
      <LinearGradient colors={GRADIENTS.live} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.liveHeroCard}>
        <View style={styles.livePillRow}>
          <View style={styles.liveDot} />
          <Text style={styles.livePillText}>LIVE</Text>
        </View>
        <View>
          <Text style={styles.liveTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.liveSubtitle}>{item.viewers} watching</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderMiniAppCard = (item: LifeModule) => (
    <View style={styles.miniAppCard}>
      <LinearGradient colors={item.gradient} style={styles.miniAppIcon}>
        <Ionicons name={item.icon as any} size={22} color="#fff" />
      </LinearGradient>
      <View style={styles.miniAppInfo}>
        <View style={styles.miniAppNameRow}>
          <Text style={styles.miniAppName}>{item.name}</Text>
          <View style={styles.miniAppNewBadge}>
            <Text style={styles.miniAppNewBadgeText}>DISCOVER</Text>
          </View>
        </View>
        <Text style={styles.miniAppTagline} numberOfLines={1}>{item.tagline}</Text>
      </View>
      <TouchableOpacity style={styles.miniAppTryBtn} onPress={() => openModule(navigation, item)}>
        <Text style={styles.miniAppTryBtnText}>Try it</Text>
      </TouchableOpacity>
    </View>
  );

  const openVideo = (v: VideoMeta) => navigation.navigate('VideoPlayer', { videoId: v.id });

  const renderStreamItem = ({ item }: { item: StreamItem }) => {
    if (item.kind === 'post') return renderPost(item.data);
    if (item.kind === 'challenge') return renderHeroChallenge(item.data);
    if (item.kind === 'live') return renderHeroLive(item.data);
    if (item.kind === 'video') return <VideoCard video={item.data} onPress={openVideo} />;
    return renderMiniAppCard(item.data);
  };

  const filterChips = (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={FILTERS}
      keyExtractor={(item) => item}
      contentContainerStyle={styles.filterRow}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.filterChip, filter === item && styles.filterChipActive]}
          onPress={() => setFilter(item)}
        >
          <Text style={[styles.filterChipText, filter === item && styles.filterChipTextActive]}>{item}</Text>
        </TouchableOpacity>
      )}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={TYPOGRAPHY.h2}>Explore</Text>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            {filter === 'Challenges' && (
              <TouchableOpacity onPress={() => navigation.navigate('ChallengesLeaderboard')}>
                <Ionicons name="trophy" size={22} color={COLORS.gold} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { setSearchOpen((v) => !v); if (searchOpen) setSearchQuery(''); }}>
              <Ionicons name={searchOpen ? 'close' : 'search'} size={22} color={COLORS.text} />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.subtitle}>
          What's possible for you — posts, challenges, videos, live streams and mini apps, each ranked by what's moving, all in one stream.
        </Text>
        {searchOpen && (
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search this list…"
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              autoCapitalize="none"
            />
          </View>
        )}
      </View>

      {filterChips}

      {filter === 'Challenges' ? (
        <>
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
                data={visibleChallenges}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ChallengeCard challenge={item} onPress={() => navigation.navigate('ChallengeDetail', { challengeId: item.id })} />
                )}
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
      ) : filter === 'Posts' ? (
        <FlatList
          key="posts-flatlist"
          ref={listRef}
          data={visiblePosts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderPost(item)}
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
      ) : filter === 'Live' ? (
        <FlatList
          key="live-flatlist"
          data={visibleLive}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.miniAppGridRow}
          renderItem={({ item }) => (
            <LiveStreamCard
              stream={item}
              size="grid"
              onPress={(s) => enterLiveStream(s, user?.userId, navigation, trending?.live ?? [])}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={trendingLoading}
          onRefresh={fetchTrending}
          ListEmptyComponent={
            !trendingLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="radio-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nothing live right now — check back soon.</Text>
              </View>
            ) : null
          }
        />
      ) : filter === 'Videos' ? (
        <FlatList
          key="videos-flatlist"
          data={visibleVideos}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <VideoCard video={item} onPress={openVideo} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={trendingLoading}
          onRefresh={fetchTrending}
          ListEmptyComponent={
            !trendingLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="play-circle-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>No videos trending right now — check back soon.</Text>
              </View>
            ) : null
          }
        />
      ) : filter === 'Mini Apps' ? (
        <FlatList
          key="miniapps-flatlist"
          data={visibleApps}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderMiniAppCard(item)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="apps-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>You've already got everything installed — nice.</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          key="all-flatlist"
          data={allStream}
          keyExtractor={(item) => item.key}
          renderItem={renderStreamItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={trendingLoading}
          onRefresh={fetchTrending}
          ListHeaderComponent={
            !searchLower ? (
              <View>
                <View style={styles.trendsHeaderRow}>
                  <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: '800' }}>✨ Trends</Text>
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
                    contentContainerStyle={{ gap: 8, marginBottom: 12 }}
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
                    contentContainerStyle={{ gap: 12, marginBottom: 4 }}
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
                    style={{ marginBottom: 16 }}
                  />
                ) : (
                  !trendingLoading && (
                    <TouchableOpacity style={styles.trendEmptyRow} activeOpacity={0.85} onPress={() => uploadTrend()}>
                      <Ionicons name="sparkles-outline" size={18} color={COLORS.textMuted} />
                      <Text style={styles.trendEmptyText}>No trends yet — be the first to post an OOTD, FOTD, or your own.</Text>
                    </TouchableOpacity>
                  )
                )}
              </View>
            ) : null
          }
          ListEmptyComponent={
            !trendingLoading ? (
              <View style={styles.emptyState}>
                <Ionicons name="sparkles-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Nothing has momentum yet — check back soon.</Text>
              </View>
            ) : null
          }
        />
      )}

      {(filter === 'All' || filter === 'Posts') ? (
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
