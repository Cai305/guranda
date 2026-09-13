import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, Dimensions, ViewToken, TouchableOpacity,
  Image, Modal, TextInput, ActivityIndicator, Share, Pressable, ScrollView,
  PanResponder, Platform,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer, type VideoPlayer as ExpoVideoPlayer } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import { useEventListener } from 'expo';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { useHoldToSeek } from '../../hooks/useHoldToSeek';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { GRADIENTS } from '../../theme';
import { fetchApi, API_BASE_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { PostDto, CampaignDto } from '@mxit2/types';
import { VideoMeta } from '../../components/VideoCard';
import { ChallengeSummary } from '../../components/ChallengeCard';
import EventMiniCard, { EventCardData } from '../../components/cards/EventMiniCard';
import GiftButton from '../../components/gifts/GiftButton';
import { GiftCatalogItem } from '../../components/gifts/GiftSheet';
import { formatCurrency, formatCount } from '../../utils/format';
import { enterLiveStream, RealLiveStream } from '../../data/liveApi';
import { useEffectiveModules, openModule, LifeModule } from '../../config/modules';
import {
  StreamItem, StatusItem, PerformanceItem, buildAllStream, fetchMorePosts, fetchMoreChallenges, fetchMoreVideos,
  fetchMoreLive, fetchMoreStatuses, fetchMoreEvents, fetchMoreAds, fetchMorePerformances,
} from '../../data/exploreStream';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

function resolveUrl(url: string) {
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

const RAIL_ICON_SIZE = { like: 32, comment: 30, share: 28, save: 28 };

// Drag-to-scrub + hold-right-to-2x/hold-left-to-rewind, shared by every
// video page in the swipe feed (long-form Discovery videos and a post's own
// short video attachments alike) — sits on TOP of a page's existing
// tap-to-play-pause Pressable rather than replacing it, so a quick tap still
// toggles play/pause exactly as before; only a genuine hold or a drag on the
// scrub track does something new. Uses the same gesture split as the
// dedicated VideoPlayer.tsx (useHoldToSeek), kept as one shared piece here
// since both feed items need it and neither is the rich full-controls
// player that component is built for.
function VideoGestureOverlay({ player, onQuickTap, bottomOffset = 0 }: {
  player: ExpoVideoPlayer; onQuickTap: () => void; bottomOffset?: number;
}) {
  const [overlayWidth, setOverlayWidth] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  // expo-video's web player never emits 'sourceLoad' (unimplemented there —
  // see node_modules/expo-video/build/VideoPlayer.web.js), so duration is
  // read straight off `player.duration` on every timeUpdate tick instead —
  // that getter is populated as soon as metadata loads on every platform,
  // unlike the event. Requires the caller to have set
  // `timeUpdateEventInterval` on the player (it defaults to 0 = never
  // fires) — both VideoFeedItem and PostMediaPage do this.
  const [duration, setDuration] = useState(() => player.duration || 0);
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const wasPlayingRef = useRef(false);
  const trackViewRef = useRef<View>(null);
  const trackPageXRef = useRef(0);
  const trackWidthRef = useRef(1);
  const durationRef = useRef(duration);
  durationRef.current = duration;

  useEventListener(player, 'timeUpdate', (payload) => {
    setCurrentTime(payload.currentTime);
    setDuration(player.duration || 0);
  });

  const { holdMode, handlePressIn, handlePressOut } = useHoldToSeek(player, overlayWidth, onQuickTap);

  const updateScrub = useCallback((pageX: number) => {
    const pct = Math.max(0, Math.min(1, (pageX - trackPageXRef.current) / trackWidthRef.current));
    setScrubTime(pct * durationRef.current);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        trackViewRef.current?.measure((_x, _y, width, _height, pageX) => {
          trackPageXRef.current = pageX;
          trackWidthRef.current = Math.max(1, width);
          wasPlayingRef.current = player.playing;
          player.pause();
          const pct = Math.max(0, Math.min(1, (evt.nativeEvent.pageX - pageX) / Math.max(1, width)));
          setScrubTime(pct * durationRef.current);
        });
      },
      onPanResponderMove: (evt) => updateScrub(evt.nativeEvent.pageX),
      onPanResponderRelease: () => {
        setScrubTime((t) => {
          if (t != null) player.currentTime = t;
          return null;
        });
        if (wasPlayingRef.current) player.play();
      },
      onPanResponderTerminate: () => {
        setScrubTime(null);
        if (wasPlayingRef.current) player.play();
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    })
  ).current;

  const displayTime = scrubTime ?? currentTime;
  const playedPct = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;

  return (
    <>
      <Pressable
        style={gestureStyles.fill}
        onLayout={(e) => setOverlayWidth(e.nativeEvent.layout.width)}
        onPressIn={(e) => handlePressIn(e.nativeEvent.locationX)}
        onPressOut={(e) => handlePressOut(e.nativeEvent.locationX)}
      />
      {holdMode ? (
        <View style={[gestureStyles.holdBadge, holdMode === 'left' ? gestureStyles.holdBadgeLeft : gestureStyles.holdBadgeRight]} pointerEvents="none">
          {holdMode === 'left' && <Ionicons name="play-back" size={16} color="#fff" />}
          <Text style={gestureStyles.holdBadgeText}>{holdMode === 'right' ? '2x' : 'Rewind'}</Text>
          {holdMode === 'right' && <Ionicons name="play-forward" size={16} color="#fff" />}
        </View>
      ) : null}
      {duration > 0 ? (
        <View
          ref={trackViewRef}
          style={[gestureStyles.scrubTrack, { bottom: bottomOffset }]}
          {...panResponder.panHandlers}
        >
          <View style={gestureStyles.scrubBg} />
          <View style={[gestureStyles.scrubPlayed, { width: `${playedPct}%` }]} />
          <View style={[gestureStyles.scrubThumb, { left: `${playedPct}%` }]} />
        </View>
      ) : null}
    </>
  );
}

const gestureStyles = {
  fill: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
  holdBadge: {
    position: 'absolute' as const, top: '42%' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  holdBadgeLeft: { left: 24 },
  holdBadgeRight: { right: 24 },
  holdBadgeText: { color: '#fff', fontSize: 14, fontWeight: '800' as const },
  scrubTrack: { position: 'absolute' as const, left: 14, right: 90, height: 20, justifyContent: 'center' as const },
  scrubBg: { position: 'absolute' as const, left: 0, right: 0, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  scrubPlayed: { position: 'absolute' as const, left: 0, height: 3, borderRadius: 2, backgroundColor: '#fff' },
  scrubThumb: { position: 'absolute' as const, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff', marginLeft: -6 },
};

// ── Video page — full real playback, unchanged from before this screen ──
// mixed everything in: prefetches its own /videos/:id detail on mount (not
// gated on isActive — windowSize=3 means only nearby pages ever mount, so
// this is the "preload a couple ahead" that makes swiping feel instant),
// swaps the player source in once that resolves, and only plays/tracks
// view+progress while it's the centered page.
interface VideoDetail extends VideoMeta {
  creatorId: string;
  url: string;
  description?: string | null;
  subscribed?: boolean;
  subscriberCount?: number;
  giftCount?: number;
  giftTotal?: number;
}

function VideoFeedItem({ video, isActive, muted, onToggleMute, navigation }: {
  video: VideoMeta; isActive: boolean; muted: boolean; onToggleMute: () => void; navigation: any;
}) {
  const { user } = useAuth();
  const [detail, setDetail] = useState<VideoDetail | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const viewedRef = useRef(false);
  const progressRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    fetchApi(`/videos/${video.id}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [video.id]);

  const player = useVideoPlayer(null, (p) => {
    p.loop = true;
    p.muted = muted;
    p.timeUpdateEventInterval = 1; // needed for VideoGestureOverlay's scrub bar — see its comment
  });
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

  useEffect(() => { player.muted = muted; }, [muted, player]);

  // Long-form video only: fullscreen/landscape. The app itself is locked to
  // portrait (app.json), so entering fullscreen unlocks landscape only for
  // as long as this page is fullscreen, and always restores portrait on
  // exit/unmount — never strands the rest of the app sideways.
  const containerRef = useRef<View>(null);
  const videoViewRef = useRef<VideoView>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => setIsFullscreen(!!(document as any).fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenOrientation.lockAsync(isFullscreen ? ScreenOrientation.OrientationLock.LANDSCAPE : ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, [isFullscreen]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    return () => { ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {}); };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        if (!isFullscreen) {
          await (containerRef.current as unknown as HTMLElement | null)?.requestFullscreen?.();
        } else {
          await (document as any)?.exitFullscreen?.();
        }
      } else if (!isFullscreen) {
        await videoViewRef.current?.enterFullscreen();
      } else {
        await videoViewRef.current?.exitFullscreen();
      }
    } catch { /* fullscreen requests can be rejected — ignore */ }
  }, [isFullscreen]);

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

  const styles = useThemedStyles(({ TYPOGRAPHY }) => sharedFeedStyles(TYPOGRAPHY));

  return (
    <View ref={containerRef} collapsable={false} style={styles.page}>
      <VideoView
        ref={videoViewRef}
        player={player}
        style={styles.fill}
        contentFit="cover"
        nativeControls={false}
        onFullscreenEnter={() => setIsFullscreen(true)}
        onFullscreenExit={() => setIsFullscreen(false)}
      />
      {!sourceReady ? (
        <View style={styles.fill} pointerEvents="none">
          {video.thumbnailUrl ? <Image source={{ uri: video.thumbnailUrl }} style={styles.fill} resizeMode="cover" /> : null}
          <View style={[styles.fill, styles.loadingScrim]}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        </View>
      ) : null}
      {sourceReady ? (
        <VideoGestureOverlay player={player} onQuickTap={togglePlayPause} bottomOffset={96} />
      ) : null}

      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.kindBadge, styles.kindBadgeLong]}><Text style={styles.kindBadgeText}>LONG VIDEO</Text></View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.muteBtn} onPress={toggleFullscreen} hitSlop={10}>
            <Ionicons name={isFullscreen ? 'contract' : 'expand'} size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute} hitSlop={10}>
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <View style={styles.railWrap}>
        {!!detail && !isOwner && (
          <View style={{ alignItems: 'center' }}>
            <TouchableOpacity style={styles.railAvatar} onPress={toggleSubscribe}>
              {video.creator?.profile?.avatarUrl ? (
                <Image source={{ uri: video.creator.profile.avatarUrl }} style={styles.railAvatarImg} />
              ) : (
                <Text style={styles.railAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              )}
              {!detail.subscribed && (
                <View style={styles.subscribeDot}><Ionicons name="add" size={14} color="#fff" /></View>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.railBtn} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={RAIL_ICON_SIZE.like} color={liked ? '#F43F5E' : '#fff'} />
          <Text style={styles.railLabel}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.railBtn} onPress={openComments}>
          <Ionicons name="chatbubble-ellipses" size={RAIL_ICON_SIZE.comment} color="#fff" />
          <Text style={styles.railLabel}>{formatCount(commentCount)}</Text>
        </TouchableOpacity>

        {!!detail && !isOwner && (
          <GiftButton recipientId={detail.creatorId} recipientName={displayName} context="video" contextId={video.id} size={30} onSent={handleGiftSent} />
        )}

        <TouchableOpacity style={styles.railBtn} onPress={handleShare}>
          <Ionicons name="arrow-redo" size={RAIL_ICON_SIZE.share} color="#fff" />
          <Text style={styles.railLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.railBtn} onPress={toggleSave}>
          <Ionicons name={savedLater ? 'bookmark' : 'bookmark-outline'} size={RAIL_ICON_SIZE.save} color={savedLater ? '#FBBF24' : '#fff'} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomInfo}>
        <Text style={styles.creatorName}>@{video.creator?.username}</Text>
        <Text style={styles.caption} numberOfLines={2}>{video.title}</Text>
        {!!detail?.giftCount && (
          <Text style={[styles.caption, { color: '#FBBF24' }]}>🎁 {formatCount(detail.giftCount)} · {formatCurrency(detail.giftTotal ?? 0)}</Text>
        )}
      </View>

      <Modal visible={commentsOpen} transparent animationType="slide" onRequestClose={() => setCommentsOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setCommentsOpen(false)}>
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
                    <Text style={styles.commentBody}>{c.text}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.commentEmpty}>No comments yet — say something!</Text>}
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

// ── Post page — real like/repost/bookmark/comment/share, a post's own
// attached media (short clip or photo) shown full-bleed when present,
// otherwise the text itself is the whole page ──
const TEXT_POST_PALETTE = ['#8B5CF6', '#EC4899', '#22D3EE', '#F59E0B', '#34D399', '#F43F5E'];
function paletteColorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TEXT_POST_PALETTE[hash % TEXT_POST_PALETTE.length];
}

// One page of a post's media gallery — mirrors PostMediaCarousel's own
// MediaItem (source stays null/inactive until this exact slide is both the
// centered post AND the centered slide within its carousel, so a post with
// several images/videos never decodes more than the one on screen).
function PostMediaPage({ item, isActive }: { item: { url: string; type: 'IMAGE' | 'VIDEO'; thumbnailUrl?: string | null }; isActive: boolean }) {
  const isVideo = item.type === 'VIDEO';
  const player = useVideoPlayer(null, (p) => { p.loop = true; p.timeUpdateEventInterval = 1; });
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!isVideo || !isActive) return;
    let cancelled = false;
    player.replaceAsync(resolveUrl(item.url)).then(() => { if (!cancelled) setReady(true); }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.url, isActive]);
  useEffect(() => {
    if (!isVideo || !ready) return;
    if (isActive) player.play(); else { player.pause(); player.currentTime = 0; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, ready]);

  const togglePlayPause = useCallback(() => {
    if (!ready) return;
    if (player.playing) player.pause(); else player.play();
  }, [player, ready]);

  if (isVideo) {
    return (
      <View style={{ width: SCREEN_W, height: SCREEN_H, backgroundColor: '#07070C' }}>
        {isActive && ready ? (
          <>
            <VideoView style={{ width: SCREEN_W, height: SCREEN_H }} player={player} contentFit="cover" nativeControls={false} />
            <VideoGestureOverlay player={player} onQuickTap={togglePlayPause} bottomOffset={96} />
          </>
        ) : item.thumbnailUrl ? (
          <ExpoImage source={{ uri: resolveUrl(item.thumbnailUrl) }} style={{ width: SCREEN_W, height: SCREEN_H }} contentFit="cover" />
        ) : null}
      </View>
    );
  }
  return <ExpoImage source={{ uri: resolveUrl(item.url) }} style={{ width: SCREEN_W, height: SCREEN_H }} contentFit="cover" />;
}

function PostFeedItem({ post, isActive, navigation }: { post: PostDto; isActive: boolean; navigation: any }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(!!post.likes?.some((l) => l.userId === user?.userId));
  const [likeCount, setLikeCount] = useState(post.likes?.length ?? 0);
  const [reposted, setReposted] = useState(!!post.reposts?.some((r) => r.userId === user?.userId));
  const [repostCount, setRepostCount] = useState(post.reposts?.length ?? 0);
  const [bookmarked, setBookmarked] = useState(!!post.isBookmarkedByMe);
  const commentCount = post.comments?.length ?? 0;
  const viewedRef = useRef(false);

  useEffect(() => {
    if (isActive && !viewedRef.current) {
      viewedRef.current = true;
      fetchApi(`/posts/${post.id}/view`, { method: 'POST' }).catch(() => {});
    }
  }, [isActive, post.id]);

  // A post can carry several images/videos (PostMedia[], same gallery
  // PostMediaCarousel renders in the regular feed) — swipe horizontally
  // between them here too, full-bleed instead of the card-sized carousel.
  const mediaList = post.media ?? [];
  const media = mediaList[0];
  const [mediaIndex, setMediaIndex] = useState(0);
  const currentMedia = mediaList[mediaIndex];
  const onMediaScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    setMediaIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  };

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    await fetchApi(`/posts/${post.id}/like`, { method: 'POST' }).catch(() => {});
  };
  const toggleRepost = async () => {
    const next = !reposted;
    setReposted(next);
    setRepostCount((c) => c + (next ? 1 : -1));
    await fetchApi(`/posts/${post.id}/repost`, { method: 'POST' }).catch(() => {});
  };
  const toggleBookmark = async () => {
    const next = !bookmarked;
    setBookmarked(next);
    await fetchApi(`/posts/${post.id}/bookmark`, { method: 'POST' }).catch(() => {});
  };
  const handleShare = () => {
    Share.share({ message: post.content ? `${post.content}\n\n— ${post.author?.displayName || 'Guranda'}` : 'Shared from Guranda' }).catch(() => {});
  };

  const displayName = post.author?.displayName || post.author?.username || 'User';
  const styles = useThemedStyles(({ TYPOGRAPHY }) => sharedFeedStyles(TYPOGRAPHY));
  const bgColor = paletteColorFor(post.authorId);

  return (
    <View style={styles.page}>
      {mediaList.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEnabled={mediaList.length > 1}
          onMomentumScrollEnd={onMediaScrollEnd}
          style={styles.fill}
        >
          {mediaList.map((m, i) => (
            <PostMediaPage key={m.id ?? `${post.id}-${i}`} item={m} isActive={isActive && i === mediaIndex} />
          ))}
        </ScrollView>
      ) : (
        <LinearGradient colors={[bgColor + '55', '#07070C']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.75 }} style={styles.fill} />
      )}

      {mediaList.length > 1 && (
        <View style={styles.mediaDotsRow} pointerEvents="none">
          {mediaList.map((_, i) => (
            <View key={i} style={[styles.mediaDot, i === mediaIndex && styles.mediaDotActive]} />
          ))}
        </View>
      )}

      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.kindBadge, currentMedia?.type === 'VIDEO' && styles.kindBadgeShort]}>
          <Text style={styles.kindBadgeText}>
            {currentMedia ? (currentMedia.type === 'VIDEO' ? 'SHORT VIDEO' : 'PHOTO') : 'POST'}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </SafeAreaView>

      {!media && !!post.content && (
        <View style={styles.textPostWrap} pointerEvents="none">
          <Text style={styles.textPostContent}>{post.content}</Text>
        </View>
      )}

      <View style={styles.railWrap}>
        <View style={{ alignItems: 'center' }}>
          <View style={styles.railAvatar}>
            {post.author?.avatarUrl ? (
              <Image source={{ uri: post.author.avatarUrl }} style={styles.railAvatarImg} />
            ) : (
              <Text style={styles.railAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.railBtn} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={RAIL_ICON_SIZE.like} color={liked ? '#F43F5E' : '#fff'} />
          <Text style={styles.railLabel}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.railBtn} onPress={() => navigation.navigate('PostComments', { postId: post.id })}>
          <Ionicons name="chatbubble-ellipses" size={RAIL_ICON_SIZE.comment} color="#fff" />
          <Text style={styles.railLabel}>{formatCount(commentCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.railBtn} onPress={toggleRepost}>
          <Ionicons name="repeat" size={RAIL_ICON_SIZE.share} color={reposted ? '#34D399' : '#fff'} />
          <Text style={styles.railLabel}>{formatCount(repostCount)}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.railBtn} onPress={handleShare}>
          <Ionicons name="arrow-redo" size={RAIL_ICON_SIZE.share} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.railBtn} onPress={toggleBookmark}>
          <Ionicons name={bookmarked ? 'bookmark' : 'bookmark-outline'} size={RAIL_ICON_SIZE.save} color={bookmarked ? '#FBBF24' : '#fff'} />
        </TouchableOpacity>
      </View>

      <View style={styles.bottomInfo}>
        <Text style={styles.creatorName}>{post.author?.username ? `@${post.author.username}` : displayName}</Text>
        {!!media && !!post.content && <Text style={styles.caption} numberOfLines={2}>{post.content}</Text>}
      </View>
    </View>
  );
}

// ── Challenge page — real "open" action into the existing detail screen ──
function ChallengeFeedItem({ challenge, navigation }: { challenge: ChallengeSummary; navigation: any }) {
  const styles = useThemedStyles(({ TYPOGRAPHY }) => sharedFeedStyles(TYPOGRAPHY));
  const open = () => navigation.navigate('ChallengeDetail', { challengeId: challenge.id });
  return (
    <View style={styles.page}>
      <LinearGradient colors={GRADIENTS.aurora} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>CHALLENGE</Text></View>
        <View style={{ width: 36 }} />
      </SafeAreaView>
      <View style={styles.centerCta}>
        <Text style={styles.centerTitle}>#{challenge.title}</Text>
        <Text style={styles.centerSub}>{challenge._count?.entries ?? 0} entries</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={open}>
          <Text style={styles.ctaBtnText}>View Challenge</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Live page — real join, same enterLiveStream flow the Live tab uses ──
function LiveFeedItem({ live, navigation, allLive }: { live: RealLiveStream; navigation: any; allLive: RealLiveStream[] }) {
  const { user } = useAuth();
  const styles = useThemedStyles(({ TYPOGRAPHY }) => sharedFeedStyles(TYPOGRAPHY));
  return (
    <View style={styles.page}>
      <LinearGradient colors={GRADIENTS.live} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>LIVE</Text></View>
        <View style={{ width: 36 }} />
      </SafeAreaView>
      <View style={styles.centerCta}>
        <Text style={styles.centerTitle}>{live.title}</Text>
        <Text style={styles.centerSub}>{live.viewers} watching</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => enterLiveStream(live, user?.userId, navigation, allLive)}>
          <Text style={styles.ctaBtnText}>Watch Live</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Mini app page — real install/open, same openModule flow the app rail
// and Explore's Mini Apps tab already use ──
function MiniAppFeedItem({ app, navigation }: { app: LifeModule; navigation: any }) {
  const styles = useThemedStyles(({ TYPOGRAPHY }) => sharedFeedStyles(TYPOGRAPHY));
  return (
    <View style={styles.page}>
      <LinearGradient colors={app.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>MINI APP</Text></View>
        <View style={{ width: 36 }} />
      </SafeAreaView>
      <View style={styles.centerCta}>
        <View style={styles.appIconWrap}>
          <Ionicons name={app.icon as any} size={32} color="#fff" />
        </View>
        <Text style={styles.centerTitle}>{app.name}</Text>
        <Text style={styles.centerSub}>{app.tagline}</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={() => openModule(navigation, app)}>
          <Text style={styles.ctaBtnText}>Try it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Status page — a lightweight preview (media/text + author) with a real
// "View Status" CTA into the existing StoryViewerScreen, which already owns
// view-tracking, like/comment and product-square interactions — no reason
// to duplicate that here, same reasoning as ChallengeFeedItem/LiveFeedItem
// deferring to their own existing detail screens.
function StatusFeedItem({ status, navigation }: { status: StatusItem; navigation: any }) {
  const styles = useThemedStyles(({ TYPOGRAPHY }) => sharedFeedStyles(TYPOGRAPHY));
  const displayName = status.author.displayName || status.author.username || 'User';
  const open = () => navigation.navigate('StoryViewer', {
    groups: [{ userId: status.author.id, user: status.author, stories: [status] }],
    initialGroupIndex: 0,
  });
  return (
    <View style={styles.page}>
      {status.mediaUrl ? (
        <ExpoImage source={{ uri: resolveUrl(status.mediaUrl) }} style={styles.fill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={[status.backgroundColor || '#7C3AED', '#07070C']}
          start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.75 }}
          style={styles.fill}
        />
      )}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>STATUS</Text></View>
        <View style={{ width: 36 }} />
      </SafeAreaView>
      {!status.mediaUrl && !!status.textContent && (
        <View style={styles.textPostWrap} pointerEvents="none">
          <Text style={styles.textPostContent}>{status.textContent}</Text>
        </View>
      )}
      <View style={styles.bottomInfo}>
        <Text style={styles.creatorName}>{displayName}</Text>
        <TouchableOpacity style={[styles.ctaBtn, { marginTop: 10, alignSelf: 'flex-start' }]} onPress={open}>
          <Text style={styles.ctaBtnText}>View Status</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Event page — the real EventMiniCard (book/view/gift, all real
// endpoints) centered over the event's own poster ──
function EventFeedItem({ event, navigation }: { event: EventCardData; navigation: any }) {
  const styles = useThemedStyles(({ TYPOGRAPHY }) => sharedFeedStyles(TYPOGRAPHY));
  return (
    <View style={styles.page}>
      {event.posterUrl ? (
        <ExpoImage source={{ uri: resolveUrl(event.posterUrl) }} style={styles.fill} contentFit="cover" blurRadius={18} />
      ) : (
        <LinearGradient colors={['#4c1d95', '#db2777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
      )}
      <View style={[styles.fill, { backgroundColor: 'rgba(0,0,0,0.45)' }]} pointerEvents="none" />
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>EVENT</Text></View>
        <View style={{ width: 36 }} />
      </SafeAreaView>
      <View style={styles.centerCta}>
        <EventMiniCard event={event} navigation={navigation} canBook />
      </View>
    </View>
  );
}

// ── Ad page — a real Campaign (sponsored/platform), click + impression
// tracked against the same endpoints CampaignAnalyticsScreen reads from ──
function AdFeedItem({ campaign, navigation, onImpression }: { campaign: CampaignDto; navigation: any; onImpression: (id: string) => void }) {
  const styles = useThemedStyles(({ TYPOGRAPHY }) => sharedFeedStyles(TYPOGRAPHY));

  useEffect(() => {
    onImpression(campaign.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  const badgeLabel = campaign.type === 'PLATFORM_UPDATE' ? 'PLATFORM UPDATE' : campaign.createdByBusinessId ? 'SPONSORED' : 'PROMOTED';
  const handlePress = () => {
    fetchApi(`/campaigns/${campaign.id}/click`, { method: 'POST' }).catch(() => {});
    const route = campaign.actionRoute;
    if (route?.name) navigation.navigate(route.name, route.params);
  };

  return (
    <View style={styles.page}>
      {campaign.coverImageUrl ? (
        <ExpoImage source={{ uri: resolveUrl(campaign.coverImageUrl) }} style={styles.fill} contentFit="cover" />
      ) : (
        <LinearGradient colors={GRADIENTS.golden} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
      )}
      <View style={[styles.fill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} pointerEvents="none" />
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>{badgeLabel}</Text></View>
        <View style={{ width: 36 }} />
      </SafeAreaView>
      <View style={styles.centerCta}>
        <Text style={styles.centerTitle}>{campaign.title}</Text>
        <Text style={styles.centerSub}>{campaign.description}</Text>
        <TouchableOpacity style={styles.ctaBtn} onPress={handlePress}>
          <Text style={styles.ctaBtnText}>{campaign.actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Sync page — a performance (Song Sync / Karaoke / Add Song After).
// Video is always muted except in KARAOKE mode, which keeps the clip's own
// captured audio instead — same rules PerformancePreviewScreen composes
// with when the performer first saves it. ──
const PERFORMANCE_MODE_LABEL: Record<string, string> = { SONG_SYNC: 'SONG SYNC', KARAOKE: 'KARAOKE', ADD_AFTER: 'SYNC', EDITED: 'EDITED' };

function PerformanceFeedItem({ performance, isActive, navigation }: { performance: PerformanceItem; isActive: boolean; navigation: any }) {
  const { user } = useAuth();
  const styles = useThemedStyles(({ TYPOGRAPHY }) => sharedFeedStyles(TYPOGRAPHY));
  const [liked, setLiked] = useState(!!performance.likedByMe);
  const [likeCount, setLikeCount] = useState(performance.likeCount);
  const [commentCount, setCommentCount] = useState(performance.commentCount);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  // KARAOKE keeps its own captured audio; EDITED's file already has its
  // final composited audio baked in server-side — both play unmuted with no
  // separate song player, even when a song is attached (attribution only).
  const usesOwnAudio = performance.mode === 'KARAOKE' || performance.mode === 'EDITED';
  const muteVideo = !usesOwnAudio;
  const player = useVideoPlayer(resolveUrl(performance.videoUrl), (p) => { p.loop = true; p.muted = muteVideo; });
  const songPlayer = useAudioPlayer(muteVideo && performance.song ? { uri: resolveUrl(performance.song.audioUrl) } : null);
  const viewedRef = useRef(false);

  useEffect(() => {
    if (isActive) {
      player.play();
      if (muteVideo && performance.song) {
        songPlayer.loop = true;
        songPlayer.seekTo(performance.offsetMs / 1000);
        songPlayer.play();
      }
      if (!viewedRef.current) viewedRef.current = true;
    } else {
      player.pause();
      player.currentTime = 0;
      songPlayer.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const togglePlayPause = () => {
    if (player.playing) { player.pause(); songPlayer.pause(); } else { player.play(); if (muteVideo && performance.song) songPlayer.play(); }
  };

  const toggleLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    await fetchApi(`/performances/${performance.id}/like`, { method: next ? 'POST' : 'DELETE' }).catch(() => {});
  };
  const handleShare = () => {
    Share.share({ message: `${performance.caption || performance.song?.title || 'Check this out'} on Guranda` }).catch(() => {});
  };

  const openComments = async () => {
    setCommentsOpen(true);
    if (comments.length === 0) {
      const res = await fetchApi(`/performances/${performance.id}/comments`);
      const c = await res.json();
      setComments(Array.isArray(c) ? c : []);
    }
  };
  const postComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const res = await fetchApi(`/performances/${performance.id}/comments`, { method: 'POST', body: JSON.stringify({ text: commentText.trim() }) });
      const c = await res.json();
      setComments((prev) => [...prev, c]);
      setCommentCount((n) => n + 1);
      setCommentText('');
    } catch { /* best-effort */ }
    setPosting(false);
  };

  const displayName = performance.user.displayName;
  const isOwner = user?.userId === performance.user.id;

  return (
    <View style={styles.page}>
      <VideoView player={player} style={styles.fill} contentFit="cover" nativeControls={false} />
      <Pressable style={styles.tapZone} onPress={togglePlayPause} />

      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={[styles.kindBadge, { backgroundColor: 'rgba(139,92,246,0.55)' }]}>
          <Text style={styles.kindBadgeText}>{PERFORMANCE_MODE_LABEL[performance.mode]}</Text>
        </View>
        <View style={{ width: 36 }} />
      </SafeAreaView>

      <View style={styles.railWrap}>
        {!isOwner && (
          <View style={{ alignItems: 'center' }}>
            <View style={styles.railAvatar}>
              {performance.user.avatarUrl ? (
                <Image source={{ uri: performance.user.avatarUrl }} style={styles.railAvatarImg} />
              ) : (
                <Text style={styles.railAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
              )}
            </View>
          </View>
        )}
        <TouchableOpacity style={styles.railBtn} onPress={toggleLike}>
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={RAIL_ICON_SIZE.like} color={liked ? '#F43F5E' : '#fff'} />
          <Text style={styles.railLabel}>{formatCount(likeCount)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn} onPress={openComments}>
          <Ionicons name="chatbubble-ellipses" size={RAIL_ICON_SIZE.comment} color="#fff" />
          <Text style={styles.railLabel}>{formatCount(commentCount)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn} onPress={handleShare}>
          <Ionicons name="arrow-redo" size={RAIL_ICON_SIZE.share} color="#fff" />
          <Text style={styles.railLabel}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.railBtn}
          onPress={() => navigation.navigate('MultiClipCapture', { sourcePerformanceId: performance.id, compositionMode: 'DUET' })}
        >
          <Ionicons name="people-outline" size={RAIL_ICON_SIZE.share} color="#fff" />
          <Text style={styles.railLabel}>Duet</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.railBtn}
          onPress={() => navigation.navigate('MultiClipCapture', { sourcePerformanceId: performance.id, compositionMode: 'STITCH' })}
        >
          <Ionicons name="link-outline" size={RAIL_ICON_SIZE.share} color="#fff" />
          <Text style={styles.railLabel}>Stitch</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomInfo}>
        <Text style={styles.creatorName}>@{performance.user.username}</Text>
        {performance.caption ? <Text style={styles.caption} numberOfLines={2}>{performance.caption}</Text> : null}
        {performance.song ? (
          <Text style={[styles.caption, { color: '#fff', opacity: 0.85 }]} numberOfLines={1}>♫ {performance.song.title} — {performance.song.artistName}</Text>
        ) : null}
      </View>

      <Modal visible={commentsOpen} transparent animationType="slide" onRequestClose={() => setCommentsOpen(false)}>
        <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setCommentsOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{commentCount} Comments</Text>
            <FlatList
              data={comments}
              keyExtractor={(c) => c.id}
              style={{ flex: 1 }}
              renderItem={({ item: c }) => (
                <View style={styles.commentRow}>
                  {c.user?.avatarUrl ? (
                    <Image source={{ uri: c.user.avatarUrl }} style={styles.commentAvatar} />
                  ) : (
                    <View style={styles.commentAvatar}>
                      <Text style={styles.commentAvatarText}>{(c.user?.displayName || c.user?.username || 'U').charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.commentUser}>{c.user?.displayName || c.user?.username}</Text>
                    <Text style={styles.commentBody}>{c.text}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.commentEmpty}>No comments yet — say something!</Text>}
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

function sharedFeedStyles(TYPOGRAPHY: any) {
  return {
    page: { width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' as const },
    fill: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
    tapZone: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 },
    loadingScrim: { justifyContent: 'center' as const, alignItems: 'center' as const, backgroundColor: 'rgba(0,0,0,0.25)' },
    topBar: { position: 'absolute' as const, top: 0, left: 0, right: 0, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingHorizontal: 12, paddingTop: 4 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'center' as const },
    muteBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center' as const, alignItems: 'center' as const },
    kindBadge: { backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
    kindBadgeLong: { backgroundColor: 'rgba(139,92,246,0.55)' },
    kindBadgeShort: { backgroundColor: 'rgba(56,189,248,0.55)' },
    kindBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.4 },
    mediaDotsRow: { position: 'absolute' as const, top: 54, left: 0, right: 0, flexDirection: 'row' as const, justifyContent: 'center' as const, gap: 5 },
    mediaDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
    mediaDotActive: { backgroundColor: '#fff', width: 16 },
    railWrap: { position: 'absolute' as const, right: 10, bottom: 110, alignItems: 'center' as const, gap: 20 },
    railAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff', backgroundColor: '#7c3aed', justifyContent: 'center' as const, alignItems: 'center' as const },
    railAvatarImg: { width: 48, height: 48, borderRadius: 24 },
    railAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 18 },
    subscribeDot: { position: 'absolute' as const, bottom: -8, alignSelf: 'center' as const, width: 20, height: 20, borderRadius: 10, backgroundColor: '#F43F5E', justifyContent: 'center' as const, alignItems: 'center' as const },
    railBtn: { alignItems: 'center' as const, gap: 3 },
    railLabel: { color: '#fff', fontSize: 11, fontWeight: '700' as const },
    bottomInfo: { position: 'absolute' as const, left: 14, right: 90, bottom: 24, gap: 5 },
    creatorName: { color: '#fff', fontWeight: '800' as const, fontSize: 15 },
    caption: { color: '#fff', fontSize: 13, lineHeight: 18 },
    textPostWrap: { position: 'absolute' as const, left: 20, right: 90, top: 0, bottom: 0, justifyContent: 'center' as const },
    textPostContent: { color: '#fff', fontSize: 22, fontWeight: '700' as const, lineHeight: 30 },
    centerCta: { position: 'absolute' as const, left: 32, right: 32, top: 0, bottom: 0, justifyContent: 'center' as const, alignItems: 'center' as const, gap: 8 },
    centerTitle: { color: '#fff', fontSize: 24, fontWeight: '800' as const, textAlign: 'center' as const },
    centerSub: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center' as const },
    ctaBtn: { marginTop: 12, backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 26, paddingVertical: 12 },
    ctaBtnText: { color: '#07070C', fontSize: 14, fontWeight: '800' as const },
    appIconWrap: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', justifyContent: 'center' as const, alignItems: 'center' as const, marginBottom: 6 },
    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' as const },
    sheet: { height: SCREEN_H * 0.6, backgroundColor: '#111', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16 },
    sheetTitle: { ...TYPOGRAPHY.h3, color: '#fff', marginBottom: 12, fontSize: 15 },
    commentRow: { flexDirection: 'row' as const, gap: 10, paddingVertical: 8 },
    commentAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#333', justifyContent: 'center' as const, alignItems: 'center' as const },
    commentAvatarText: { color: '#fff', fontWeight: '700' as const, fontSize: 12 },
    commentUser: { color: '#fff', fontWeight: '700' as const, fontSize: 12, marginBottom: 2 },
    commentBody: { color: '#ccc', fontSize: 13, lineHeight: 18 },
    commentEmpty: { color: '#888', textAlign: 'center' as const, marginTop: 20 },
    commentInputRow: { flexDirection: 'row' as const, alignItems: 'flex-end' as const, gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#222' },
    commentField: { flex: 1, backgroundColor: '#1c1c1e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: '#fff', fontSize: 13, minHeight: 36 },
  };
}

// ── The swipeable feed itself ───────────────────────────────────────────
// TikTok-style: one item per full screen, vertical paging, only the
// centered page plays/tracks (isActive gating, same pattern
// LiveViewerScreen/LiveStreamPage use for live rooms). A genuine mix —
// post, challenge, video, live, mini app — not a video-only feed: the
// items the caller already had on screen (Explore's "All" stream, or a
// single card tap) become the swipe order, and this screen keeps itself
// fed with more of whichever type is running low via the same mixing
// algorithm and continuation fetches Explore's "All" tab uses (see
// data/exploreStream.ts) — so it never dead-ends and never diverges from
// what "All" would show.
export default function ImmersiveFeedScreen({ navigation, route }: any) {
  const initialItems: StreamItem[] = route?.params?.items ?? [];
  const initialKey: string | undefined = route?.params?.initialKey;
  const discoverableApps = useEffectiveModules().filter((m) => m.status === 'installable');

  const [postsPool, setPostsPool] = useState<PostDto[]>(() => initialItems.filter((i) => i.kind === 'post').map((i) => i.data as PostDto));
  const [challengesPool, setChallengesPool] = useState<ChallengeSummary[]>(() => initialItems.filter((i) => i.kind === 'challenge').map((i) => i.data as ChallengeSummary));
  const [livePool, setLivePool] = useState<RealLiveStream[]>(() => initialItems.filter((i) => i.kind === 'live').map((i) => i.data as RealLiveStream));
  const [videosPool, setVideosPool] = useState<VideoMeta[]>(() => initialItems.filter((i) => i.kind === 'video').map((i) => i.data as VideoMeta));
  const [miniAppsPool] = useState<LifeModule[]>(() => (
    initialItems.length > 0 ? initialItems.filter((i) => i.kind === 'miniapp').map((i) => i.data as LifeModule) : discoverableApps
  ));
  const [statusesPool, setStatusesPool] = useState<StatusItem[]>(() => initialItems.filter((i) => i.kind === 'status').map((i) => i.data as StatusItem));
  const [eventsPool, setEventsPool] = useState<EventCardData[]>(() => initialItems.filter((i) => i.kind === 'event').map((i) => i.data as EventCardData));
  const [adsPool, setAdsPool] = useState<CampaignDto[]>(() => initialItems.filter((i) => i.kind === 'ad').map((i) => i.data as CampaignDto));
  const [performancesPool, setPerformancesPool] = useState<PerformanceItem[]>(() => initialItems.filter((i) => i.kind === 'performance').map((i) => i.data as PerformanceItem));

  const postsCursorRef = useRef<string | null>(null);
  const postsHasMoreRef = useRef(true);
  const seenPostIds = useRef(new Set(postsPool.map((p) => p.id)));
  const challengesSkipRef = useRef(0);
  const challengesHasMoreRef = useRef(true);
  const seenChallengeIds = useRef(new Set(challengesPool.map((c) => c.id)));
  const videosCursorRef = useRef<string | null>(null);
  const videosHasMoreRef = useRef(true);
  const seenVideoIds = useRef(new Set(videosPool.map((v) => v.id)));
  const liveHasMoreRef = useRef(true);
  const seenLiveIds = useRef(new Set(livePool.map((l) => l.id)));
  const statusesHasMoreRef = useRef(true);
  const seenStatusIds = useRef(new Set(statusesPool.map((s) => s.id)));
  const eventsSkipRef = useRef(0);
  const eventsHasMoreRef = useRef(true);
  const seenEventIds = useRef(new Set(eventsPool.map((e) => e.id)));
  const adsCursorRef = useRef<string | null>(null);
  const adsHasMoreRef = useRef(true);
  const seenAdIds = useRef(new Set(adsPool.map((a) => a.id)));
  const performancesCursorRef = useRef<string | null>(null);
  const performancesHasMoreRef = useRef(true);
  const seenPerformanceIds = useRef(new Set(performancesPool.map((p) => p.id)));
  const impressedAdIds = useRef(new Set<string>());
  const trackAdImpression = useCallback((campaignId: string) => {
    if (impressedAdIds.current.has(campaignId)) return;
    impressedAdIds.current.add(campaignId);
    fetchApi(`/campaigns/${campaignId}/impression`, { method: 'POST' }).catch(() => {});
  }, []);

  const streamResult = useMemo(
    () => buildAllStream(postsPool, challengesPool, livePool, videosPool, miniAppsPool, statusesPool, eventsPool, adsPool, performancesPool),
    [postsPool, challengesPool, livePool, videosPool, miniAppsPool, statusesPool, eventsPool, adsPool, performancesPool],
  );
  const items = streamResult.items;

  const initialIndex = useMemo(() => {
    if (!initialKey) return 0;
    const idx = items.findIndex((i) => i.key === initialKey);
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

  // Same synchronous-ref guard VideoFeedScreen needed: the seed effect and
  // the preload-ahead effect can both decide to fetch within the same
  // tick, and state-based guards don't commit fast enough to stop both.
  const loadingRef = useRef(false);
  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    const exhausted = streamResult.exhausted;
    const jobs: Promise<void>[] = [];
    if ((exhausted.has('post') || postsPool.length === 0) && postsHasMoreRef.current) {
      jobs.push(fetchMorePosts(postsCursorRef.current, seenPostIds.current).then(({ items: fresh, nextCursor }) => {
        postsCursorRef.current = nextCursor;
        postsHasMoreRef.current = nextCursor !== null;
        if (fresh.length) setPostsPool((prev) => [...prev, ...fresh]);
      }));
    }
    if ((exhausted.has('challenge') || challengesPool.length === 0) && challengesHasMoreRef.current) {
      jobs.push(fetchMoreChallenges(challengesSkipRef.current, seenChallengeIds.current).then(({ items: fresh, nextSkip, hasMore }) => {
        challengesSkipRef.current = nextSkip;
        challengesHasMoreRef.current = hasMore;
        if (fresh.length) setChallengesPool((prev) => [...prev, ...fresh]);
      }));
    }
    if ((exhausted.has('video') || videosPool.length === 0) && videosHasMoreRef.current) {
      jobs.push(fetchMoreVideos(videosCursorRef.current, seenVideoIds.current).then(({ items: fresh, nextCursor }) => {
        videosCursorRef.current = nextCursor;
        videosHasMoreRef.current = nextCursor !== null;
        if (fresh.length) setVideosPool((prev) => [...prev, ...fresh]);
      }));
    }
    if ((exhausted.has('live') || livePool.length === 0) && liveHasMoreRef.current) {
      jobs.push(fetchMoreLive(seenLiveIds.current).then(({ items: fresh }) => {
        liveHasMoreRef.current = fresh.length > 0;
        if (fresh.length) setLivePool((prev) => [...prev, ...fresh]);
      }));
    }
    if ((exhausted.has('status') || statusesPool.length === 0) && statusesHasMoreRef.current) {
      jobs.push(fetchMoreStatuses(seenStatusIds.current).then(({ items: fresh }) => {
        statusesHasMoreRef.current = fresh.length > 0;
        if (fresh.length) setStatusesPool((prev) => [...prev, ...fresh]);
      }));
    }
    if ((exhausted.has('event') || eventsPool.length === 0) && eventsHasMoreRef.current) {
      jobs.push(fetchMoreEvents(eventsSkipRef.current, seenEventIds.current).then(({ items: fresh, nextSkip, hasMore }) => {
        eventsSkipRef.current = nextSkip;
        eventsHasMoreRef.current = hasMore;
        if (fresh.length) setEventsPool((prev) => [...prev, ...fresh]);
      }));
    }
    if ((exhausted.has('ad') || adsPool.length === 0) && adsHasMoreRef.current) {
      jobs.push(fetchMoreAds(adsCursorRef.current, seenAdIds.current).then(({ items: fresh, nextCursor }) => {
        adsCursorRef.current = nextCursor;
        adsHasMoreRef.current = nextCursor !== null;
        if (fresh.length) setAdsPool((prev) => [...prev, ...fresh]);
      }));
    }
    if ((exhausted.has('performance') || performancesPool.length === 0) && performancesHasMoreRef.current) {
      jobs.push(fetchMorePerformances(performancesCursorRef.current, seenPerformanceIds.current).then(({ items: fresh, nextCursor }) => {
        performancesCursorRef.current = nextCursor;
        performancesHasMoreRef.current = nextCursor !== null;
        if (fresh.length) setPerformancesPool((prev) => [...prev, ...fresh]);
      }));
    }
    if (jobs.length === 0) return;
    loadingRef.current = true;
    try {
      await Promise.all(jobs);
    } catch {
      // best-effort — swiping just stops advancing past what's already loaded
    } finally {
      loadingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamResult, postsPool.length, challengesPool.length, videosPool.length, livePool.length, statusesPool.length, eventsPool.length, adsPool.length, performancesPool.length]);

  // Seed on mount if the caller handed over nothing (a cold "Videos" chip
  // tap before the "All" tab was ever fetched this session).
  useEffect(() => {
    if (items.length === 0) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preload well before the viewer could ever hit a dead end — triggered
  // by active index, not scroll position, so it fires regardless of swipe
  // speed.
  useEffect(() => {
    if (activeIndex >= items.length - 3) loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items.length]);

  if (items.length === 0) {
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
        data={items}
        keyExtractor={(item) => item.key}
        renderItem={({ item, index }) => (
          <View style={{ height: SCREEN_H, width: '100%' }}>
            {item.kind === 'video' && (
              <VideoFeedItem video={item.data} isActive={index === activeIndex} muted={muted} onToggleMute={() => setMuted((m) => !m)} navigation={navigation} />
            )}
            {item.kind === 'post' && (
              <PostFeedItem post={item.data} isActive={index === activeIndex} navigation={navigation} />
            )}
            {item.kind === 'challenge' && (
              <ChallengeFeedItem challenge={item.data} navigation={navigation} />
            )}
            {item.kind === 'live' && (
              <LiveFeedItem live={item.data} navigation={navigation} allLive={livePool} />
            )}
            {item.kind === 'miniapp' && (
              <MiniAppFeedItem app={item.data} navigation={navigation} />
            )}
            {item.kind === 'status' && (
              <StatusFeedItem status={item.data} navigation={navigation} />
            )}
            {item.kind === 'event' && (
              <EventFeedItem event={item.data} navigation={navigation} />
            )}
            {item.kind === 'ad' && (
              <AdFeedItem campaign={item.data} navigation={navigation} onImpression={trackAdImpression} />
            )}
            {item.kind === 'performance' && (
              <PerformanceFeedItem performance={item.data} isActive={index === activeIndex} navigation={navigation} />
            )}
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
