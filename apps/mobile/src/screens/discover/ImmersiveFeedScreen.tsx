import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, Dimensions, ViewToken, TouchableOpacity,
  Image, Modal, TextInput, ActivityIndicator, Share, Pressable,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { GRADIENTS } from '../../theme';
import { fetchApi, API_BASE_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { PostDto } from '@mxit2/types';
import { VideoMeta } from '../../components/VideoCard';
import { ChallengeSummary } from '../../components/ChallengeCard';
import GiftButton from '../../components/gifts/GiftButton';
import { GiftCatalogItem } from '../../components/gifts/GiftSheet';
import { formatCurrency, formatCount } from '../../utils/format';
import { enterLiveStream, RealLiveStream } from '../../data/liveApi';
import { useEffectiveModules, openModule, LifeModule } from '../../config/modules';
import {
  StreamItem, buildAllStream, fetchMorePosts, fetchMoreChallenges, fetchMoreVideos, fetchMoreLive,
} from '../../data/exploreStream';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');

function resolveUrl(url: string) {
  return url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
}

const RAIL_ICON_SIZE = { like: 32, comment: 30, share: 28, save: 28 };

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
    <View style={styles.page}>
      <VideoView player={player} style={styles.fill} contentFit="cover" nativeControls={false} />
      {!sourceReady ? (
        <View style={styles.fill} pointerEvents="none">
          {video.thumbnailUrl ? <Image source={{ uri: video.thumbnailUrl }} style={styles.fill} resizeMode="cover" /> : null}
          <View style={[styles.fill, styles.loadingScrim]}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        </View>
      ) : null}
      <Pressable style={styles.tapZone} onPress={togglePlayPause} />

      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>LONG VIDEO</Text></View>
        <TouchableOpacity style={styles.muteBtn} onPress={onToggleMute} hitSlop={10}>
          <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={18} color="#fff" />
        </TouchableOpacity>
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

  // Same pattern VideoFeedItem uses (proven working): start with no source,
  // swap the real one in via replaceAsync, and only play() once that
  // promise resolves — calling play() any earlier throws a real
  // NotSupportedError since the element has nothing loaded yet.
  const media = post.media?.[0];
  const player = useVideoPlayer(null, (p) => { p.loop = true; });
  const [mediaReady, setMediaReady] = useState(false);
  useEffect(() => {
    if (media?.type !== 'VIDEO') return;
    let cancelled = false;
    player.replaceAsync(resolveUrl(media.url)).then(() => { if (!cancelled) setMediaReady(true); }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media?.url]);
  useEffect(() => {
    if (media?.type !== 'VIDEO' || !mediaReady) return;
    if (isActive) player.play(); else { player.pause(); player.currentTime = 0; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, media?.type, mediaReady]);

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
      {media ? (
        media.type === 'VIDEO' ? (
          <VideoView player={player} style={styles.fill} contentFit="cover" nativeControls={false} />
        ) : (
          <ExpoImage source={{ uri: media.url }} style={styles.fill} contentFit="cover" />
        )
      ) : (
        <LinearGradient colors={[bgColor + '55', '#07070C']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.75 }} style={styles.fill} />
      )}

      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.kindBadge}><Text style={styles.kindBadgeText}>{media ? 'SHORT VIDEO' : 'POST'}</Text></View>
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
    kindBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.4 },
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

  const streamResult = useMemo(
    () => buildAllStream(postsPool, challengesPool, livePool, videosPool, miniAppsPool),
    [postsPool, challengesPool, livePool, videosPool, miniAppsPool],
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
  }, [streamResult, postsPool.length, challengesPool.length, videosPool.length, livePool.length]);

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
