import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, Dimensions, ViewToken, TouchableOpacity,
  Image, Modal, TextInput, ActivityIndicator, Share, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi, API_BASE_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { VideoMeta } from '../../components/VideoCard';
import GiftButton from '../../components/gifts/GiftButton';
import { GiftCatalogItem } from '../../components/gifts/GiftSheet';
import { formatCurrency, formatCount } from '../../utils/format';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

interface VideoDetail extends VideoMeta {
  creatorId: string;
  url: string;
  description?: string | null;
  subscribed?: boolean;
  subscriberCount?: number;
  giftCount?: number;
  giftTotal?: number;
}

function resolveUrl(url: string) {
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

// ── One full-bleed page ─────────────────────────────────────────────────
function VideoFeedItem({
  video,
  isActive,
  muted,
  onToggleMute,
  navigation,
}: {
  video: VideoMeta;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  navigation: any;
}) {
  const { user } = useAuth();
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const viewedRef = useRef(false);
  const progressRef = useRef(0);

  // Prefetched on mount, not gated on isActive — with windowSize=3 only the
  // active page and its immediate neighbors are ever mounted, so this is
  // exactly the "preload a couple ahead" behavior that makes swiping feel
  // instant instead of showing a spinner on every swipe.
  useEffect(() => {
    let cancelled = false;
    fetchApi(`/videos/${video.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [video.id]);

  // VideoMeta (what the feed list hands each page) has no playable `url` —
  // only the full /videos/:id detail record does. Start the player on no
  // source (null, not '' — an empty string source is a real DOM <video
  // src=""> the browser complains about) and swap in the real one via
  // replaceAsync once `detail` loads.
  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
    p.muted = muted;
  });
  // True only once replaceAsync has actually resolved — detail.url being
  // set just means the fetch finished, not that the player has finished
  // swapping sources. Calling play() in that gap throws a real
  // NotSupportedError since the element has nothing loaded yet.
  const [sourceReady, setSourceReady] = useState(false);

  useEffect(() => {
    if (!detail?.url) return;
    let cancelled = false;
    player.replaceAsync(resolveUrl(detail.url))
      .then(() => { if (!cancelled) setSourceReady(true); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.url]);

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    if (!sourceReady) return;
    if (isActive) {
      player.play();
      if (!viewedRef.current) {
        viewedRef.current = true;
        fetchApi(`/videos/${video.id}/view`, { method: 'POST', body: JSON.stringify({ progress: 0 }) }).catch(() => {});
      }
    } else {
      player.pause();
      player.currentTime = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, sourceReady]);

  // Progress heartbeat — only while this page is the one actually playing.
  useEffect(() => {
    if (!isActive || !sourceReady) return;
    const interval = setInterval(() => {
      const seconds = Math.floor(player.currentTime);
      progressRef.current = seconds;
      if (seconds > 0) {
        fetchApi(`/videos/${video.id}/progress`, { method: 'PATCH', body: JSON.stringify({ progress: seconds }) }).catch(() => {});
      }
    }, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, sourceReady]);

  const togglePlayPause = () => {
    if (!sourceReady) return;
    if (player.playing) player.pause(); else player.play();
  };

  const toggleLike = async () => {
    if (!detail) return;
    const liked = !detail.liked;
    setDetail((d) => (d ? { ...d, liked, _count: { ...d._count, likes: (d._count?.likes ?? 0) + (liked ? 1 : -1) } } : d));
    await fetchApi(`/videos/${video.id}/like`, { method: liked ? 'POST' : 'DELETE' });
  };

  const toggleSave = async () => {
    if (!detail) return;
    const saved = !detail.savedLater;
    setDetail((d) => (d ? { ...d, savedLater: saved } : d));
    await fetchApi(`/videos/${video.id}/watch-later`, { method: saved ? 'POST' : 'DELETE' });
  };

  const toggleSubscribe = async () => {
    if (!detail) return;
    const subscribed = !detail.subscribed;
    setDetail((d) => (d ? { ...d, subscribed, subscriberCount: (d.subscriberCount ?? 0) + (subscribed ? 1 : -1) } : d));
    try {
      await fetchApi(`/videos/creators/${detail.creatorId}/subscribe`, { method: subscribed ? 'POST' : 'DELETE' });
    } catch {
      setDetail((d) => (d ? { ...d, subscribed: !subscribed, subscriberCount: (d.subscriberCount ?? 0) + (subscribed ? -1 : 1) } : d));
    }
  };

  const handleShare = () => {
    Share.share({ title: video.title, message: `Watch "${video.title}" on Guranda Discovery` }).catch(() => {});
  };

  const handleGiftSent = (item: GiftCatalogItem) => {
    setDetail((d) => (d ? { ...d, giftCount: (d.giftCount ?? 0) + 1, giftTotal: (d.giftTotal ?? 0) + item.amount } : d));
  };

  const openComments = async () => {
    setCommentsOpen(true);
    if (comments.length === 0) {
      const res = await fetchApi(`/videos/${video.id}/comments`);
      const c = await res.json();
      setComments(Array.isArray(c) ? c : []);
    }
  };

  const postComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const res = await fetchApi(`/videos/${video.id}/comments`, { method: 'POST', body: JSON.stringify({ text: commentText.trim() }) });
      const c = await res.json();
      setComments((prev) => [c, ...prev]);
      setDetail((d) => (d ? { ...d, _count: { ...d._count, comments: (d._count?.comments ?? 0) + 1 } } : d));
      setCommentText('');
    } catch { /* best-effort */ }
    setPosting(false);
  };

  const displayName = video.creator?.profile?.displayName || video.creator?.username || 'Unknown';
  const liked = detail?.liked ?? video.liked ?? false;
  const savedLater = detail?.savedLater ?? video.savedLater ?? false;
  const likeCount = detail?._count?.likes ?? video._count?.likes ?? 0;
  const commentCount = detail?._count?.comments ?? video._count?.comments ?? 0;
  const isOwner = !!detail && user?.userId === detail.creatorId;

  const styles = useThemedStyles(({ TYPOGRAPHY }) => ({
    page: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },
    tapZone: { ...{ position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 } },
    muteBtn: { position: 'absolute' as const, top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'center' as const },
    railWrap: { position: 'absolute' as const, right: 10, bottom: 110, alignItems: 'center' as const, gap: 20 },
    railAvatarWrap: { alignItems: 'center' as const },
    railAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff', backgroundColor: '#7c3aed', justifyContent: 'center' as const, alignItems: 'center' as const },
    railAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 18 },
    subscribeDot: { position: 'absolute' as const, bottom: -8, alignSelf: 'center' as const, width: 20, height: 20, borderRadius: 10, backgroundColor: '#F43F5E', justifyContent: 'center' as const, alignItems: 'center' as const },
    railBtn: { alignItems: 'center' as const, gap: 3 },
    railLabel: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
    bottomInfo: { position: 'absolute' as const, left: 14, right: 90, bottom: 24, gap: 5 },
    creatorName: { color: '#fff', fontWeight: '800' as const, fontSize: 15 },
    caption: { color: '#fff', fontSize: 13, lineHeight: 18 },
    backBtn: { position: 'absolute' as const, top: 12, left: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'center' as const },
    // Comments sheet
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
    sheet: { height: SCREEN_H * 0.6, backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
    sheetTitle: { ...TYPOGRAPHY.h3, color: '#fff', marginBottom: 12, fontSize: 15 },
    commentRow: { flexDirection: 'row' as const, gap: 10, paddingVertical: 8 },
    commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#333', justifyContent: 'center' as const, alignItems: 'center' as const },
    commentAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 12 },
    commentUser: { color: '#fff', fontWeight: '700' as const, fontSize: 12, marginBottom: 2 },
    commentText: { color: '#ccc', fontSize: 13, lineHeight: 18 },
    commentInputRow: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#222' },
    commentField: { flex: 1, backgroundColor: '#1c1c1e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: '#fff', fontSize: 13, minHeight: 36 },
  }));

  return (
    <View style={styles.page}>
      <VideoView
        player={player}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        contentFit="cover"
        nativeControls={false}
      />
      {!sourceReady ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
          {video.thumbnailUrl ? (
            <Image source={{ uri: video.thumbnailUrl }} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} resizeMode="cover" />
          ) : null}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        </View>
      ) : null}
      <Pressable style={styles.tapZone} onPress={togglePlayPause} />

      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0 }} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute} hitSlop={10}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Right action rail */}
      <View style={styles.railWrap}>
        {!!detail && !isOwner && (
          <View style={styles.railAvatarWrap}>
            <TouchableOpacity style={styles.railAvatar} onPress={toggleSubscribe}>
              {video.creator?.profile?.avatarUrl ? (
                <Image source={{ uri: video.creator.profile.avatarUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
              ) : (
                <Text style={styles.railAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              )}
              {!detail.subscribed && (
                <View style={styles.subscribeDot}>
                  <Ionicons name="add" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.railBtn} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={32} color={liked ? '#F43F5E' : '#fff'} />
          <Text style={styles.railLabel}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.railBtn} onPress={openComments}>
          <Ionicons name="chatbubble-ellipses" size={30} color="#fff" />
          <Text style={styles.railLabel}>{formatCount(commentCount)}</Text>
        </TouchableOpacity>

        {!!detail && !isOwner && (
          <GiftButton
            recipientId={detail.creatorId}
            recipientName={displayName}
            context="video"
            contextId={video.id}
            size={30}
            onSent={handleGiftSent}
          />
        )}

        <TouchableOpacity style={styles.railBtn} onPress={handleShare}>
          <Ionicons name="arrow-redo" size={28} color="#fff" />
          <Text style={styles.railLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.railBtn} onPress={toggleSave}>
          <Ionicons name={savedLater ? 'bookmark' : 'bookmark-outline'} size={28} color={savedLater ? '#FBBF24' : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Bottom creator/caption overlay */}
      <View style={styles.bottomInfo}>
        <Text style={styles.creatorName}>@{video.creator?.username}</Text>
        <Text style={styles.caption} numberOfLines={2}>{video.title}</Text>
        {!!detail?.giftCount && (
          <Text style={[styles.caption, { color: '#FBBF24' }]}>
            🎁 {formatCount(detail.giftCount)} · {formatCurrency(detail.giftTotal ?? 0)}
          </Text>
        )}
      </View>

      {/* Comments sheet */}
      <Modal visible={commentsOpen} transparent animationType="slide" onRequestClose={() => setCommentsOpen(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setCommentsOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{commentCount} Comments</Text>
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={{ flex: 1 }}
              renderItem={({ item: c }) => (
                <View style={styles.commentRow}>
                  {c.user?.profile?.avatarUrl ? (
                    <Image source={{ uri: c.user.profile.avatarUrl }} style={styles.commentAvatar} />
                  ) : (
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{(c.user?.profile?.displayName || c.user?.username || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentUser}>{c.user?.profile?.displayName || c.user?.username}</Text>
                    <Text style={styles.commentText}>{c.text}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No comments yet — say something!</Text>}
            />
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentField}
                placeholder="Add a comment…"
                placeholderTextColor="#888"
                value={commentText}
                onChangeText={setCommentText}
                multiline
              />
              <TouchableOpacity onPress={postComment} disabled={posting || !commentText.trim()} style={{ padding: 8 }}>
                {posting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={20} color={commentText.trim() ? '#fff' : '#555'} />}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── The swipeable feed itself ───────────────────────────────────────────
// TikTok-style: one video per full screen, vertical paging, only the
// centered page plays (isActive gating, same pattern LiveViewerScreen /
// LiveStreamPage already use for live rooms). Starts from whatever list
// the caller already had on screen (Explore's Videos tab, or a single
// video/"All" stream tap), then keeps itself fed with more from the real
// paginated /videos/feed as the viewer nears the end — never dead-ends.
export default function VideoFeedScreen({ navigation, route }: any) {
  const initialVideos: VideoMeta[] = route?.params?.videos ?? [];
  const initialVideoId: string | undefined = route?.params?.videoId;
  const [videos, setVideos] = useState<VideoMeta[]>(initialVideos);
  const hasMoreRef = useRef(true);
  const cursorRef = useRef<string | null>(route?.params?.cursor ?? null);
  const seenIdsRef = useRef<Set<string>>(new Set(initialVideos.map((v) => v.id)));

  const initialIndex = useMemo(() => {
    if (!initialVideoId) return 0;
    const idx = videos.findIndex((v) => v.id === initialVideoId);
    return idx >= 0 ? idx : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [muted, setMuted] = useState(false);
  const viewabilityConfigRef = useRef({ itemVisiblePercentThreshold: 90 });
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && typeof viewableItems[0].index === 'number') {
      setActiveIndex(viewableItems[0].index);
    }
  });

  // Guards with a ref, not just the `loadingMore` state — the seed effect
  // and the preload-ahead effect below can both decide to call this within
  // the same tick (e.g. the tapped video already starts near the end of a
  // short initial list), and `loadingMore` state wouldn't have committed
  // yet for the second call to see it. The ref check-and-set is synchronous,
  // so only one of them actually fires the fetch.
  const loadingRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    try {
      const qs = cursorRef.current ? `?take=20&cursor=${encodeURIComponent(cursorRef.current)}` : '?take=20';
      const res = await fetchApi(`/videos/feed${qs}`);
      if (res.ok) {
        const data: { videos: VideoMeta[]; nextCursor: string | null } = await res.json();
        const fresh = data.videos.filter((v) => !seenIdsRef.current.has(v.id));
        fresh.forEach((v) => seenIdsRef.current.add(v.id));
        setVideos((prev) => [...prev, ...fresh]);
        cursorRef.current = data.nextCursor;
        hasMoreRef.current = data.nextCursor !== null;
      }
    } catch {
      // best-effort — swiping just stops advancing past what's already loaded
    } finally {
      loadingRef.current = false;
    }
  }, []);

  // Seed the feed if the caller didn't hand over a list (a deep link, or a
  // single-video tap with no surrounding context) or the tapped video isn't
  // in what was handed over.
  useEffect(() => {
    if (videos.length === 0) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preload the next page well before the viewer could ever hit a dead end —
  // triggered by the active index, not scroll position, so it fires the
  // moment the 3rd-from-last page becomes current regardless of swipe speed.
  useEffect(() => {
    if (activeIndex >= videos.length - 3) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, videos.length]);

  if (videos.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <FlatList
        style={{ flex: 1 }}
        data={videos}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={{ height: SCREEN_H, width: '100%' }}>
            <VideoFeedItem
              video={item}
              isActive={index === activeIndex}
              muted={muted}
              onToggleMute={() => setMuted((m) => !m)}
              navigation={navigation}
            />
          </View>
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({ length: SCREEN_H, offset: SCREEN_H * index, index })}
        viewabilityConfig={viewabilityConfigRef.current}
        onViewableItemsChanged={onViewableItemsChanged.current}
        windowSize={3}
        maxToRenderPerBatch={2}
        removeClippedSubviews
      />
    </View>
  );
}
