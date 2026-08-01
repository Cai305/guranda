import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Share, Modal, Alert, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi, API_BASE_URL } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import VideoCard, { VideoMeta } from '../../components/VideoCard';
import GiftButton from '../../components/gifts/GiftButton';
import { GiftCatalogItem } from '../../components/gifts/GiftSheet';

let VideoPlayer: any = null;
if (Platform.OS === 'web') {
  VideoPlayer = require('../../components/VideoPlayer.web').default;
} else {
  VideoPlayer = require('../../components/VideoPlayer').default;
}

export default function VideoPlayerScreen({ navigation, route }: any) {
  const { videoId } = route.params;
  const { user } = useAuth();
  const [video, setVideo] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [related, setRelated] = useState<VideoMeta[]>([]);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const progressRef = useRef(0);

  const load = useCallback(async () => {
    const [vRes, cRes] = await Promise.all([
      fetchApi(`/videos/${videoId}`),
      fetchApi(`/videos/${videoId}/comments`),
    ]);
    const v = await vRes.json();
    const c = await cRes.json();
    setVideo(v);
    setComments(Array.isArray(c) ? c : []);
    if (v.category) {
      fetchApi(`/videos/${videoId}/related?category=${encodeURIComponent(v.category)}`)
        .then(r => r.json()).then(d => setRelated(Array.isArray(d) ? d : []));
    }
    // record view
    fetchApi(`/videos/${videoId}/view`, { method: 'POST', body: JSON.stringify({ progress: 0 }) }).catch(() => {});
  }, [videoId]);

  useEffect(() => { load(); }, [load]);

  const toggleLike = async () => {
    if (!video) return;
    const liked = !video.liked;
    setVideo((v: any) => ({ ...v, liked, _count: { ...v._count, likes: v._count.likes + (liked ? 1 : -1) } }));
    await fetchApi(`/videos/${videoId}/like`, { method: liked ? 'POST' : 'DELETE' });
  };

  const toggleSubscribe = async () => {
    if (!video) return;
    const subscribed = !video.subscribed;
    setVideo((v: any) => ({
      ...v,
      subscribed,
      subscriberCount: (v.subscriberCount ?? 0) + (subscribed ? 1 : -1),
    }));
    try {
      await fetchApi(`/videos/creators/${video.creatorId}/subscribe`, {
        method: subscribed ? 'POST' : 'DELETE',
      });
    } catch {
      // Revert on failure — best-effort, matches toggleLike/toggleWatchLater's
      // lack of rollback for consistency, but subscribe state is worth
      // getting right since it's a standing relationship, not a toggle blip.
      setVideo((v: any) => ({
        ...v,
        subscribed: !subscribed,
        subscriberCount: (v.subscriberCount ?? 0) + (subscribed ? -1 : 1),
      }));
    }
  };

  const toggleWatchLater = async () => {
    if (!video) return;
    const saved = !video.savedLater;
    setVideo((v: any) => ({ ...v, savedLater: saved }));
    await fetchApi(`/videos/${videoId}/watch-later`, { method: saved ? 'POST' : 'DELETE' });
  };

  const handleGiftSent = (item: GiftCatalogItem) => {
    setVideo((v: any) => ({
      ...v,
      giftCount: (v.giftCount ?? 0) + 1,
      giftTotal: (v.giftTotal ?? 0) + item.amount,
    }));
  };

  const postComment = async () => {
    if (!comment.trim()) return;
    setPosting(true);
    try {
      const res = await fetchApi(`/videos/${videoId}/comments`, { method: 'POST', body: JSON.stringify({ text: comment.trim() }) });
      const c = await res.json();
      setComments(prev => [c, ...prev]);
      setComment('');
    } catch { }
    setPosting(false);
  };

  const handleShare = async () => {
    try {
      await Share.share({ title: video?.title, message: `Watch "${video?.title}" on Guranda Discovery` });
    } catch { }
  };

  const loadPlaylists = async () => {
    const res = await fetchApi('/videos/playlists/mine');
    const d = await res.json();
    setPlaylists(Array.isArray(d) ? d : []);
    setShowPlaylists(true);
  };

  const addToPlaylist = async (playlistId: string) => {
    setShowPlaylists(false);
    await fetchApi(`/videos/playlists/${playlistId}/videos`, { method: 'POST', body: JSON.stringify({ videoId }) });
    Alert.alert('Added', 'Video added to playlist');
  };

  const videoUrl = video?.url ? (video.url.startsWith('http') ? video.url : `${API_BASE_URL}${video.url}`) : '';

  if (!video) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  const displayName = video.creator?.profile?.displayName || video.creator?.username || 'Unknown';

  return (
    <View style={styles.container}>
      {/* Video player — full width, pinned to top */}
      {videoUrl ? (
        <VideoPlayer
          url={videoUrl}
          autoPlay
          onProgress={(s: number) => { progressRef.current = s; }}
        />
      ) : (
        <View style={styles.playerPlaceholder}>
          <Ionicons name="play-circle" size={64} color={COLORS.textMuted} />
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        {/* Title + meta */}
        <View style={styles.titleBlock}>
          <Text style={styles.videoTitle}>{video.title}</Text>
          <Text style={styles.videoMeta}>
            {video.views?.toLocaleString()} views · {new Date(video.createdAt).toLocaleDateString('en-ZA', { dateStyle: 'medium' })}
          </Text>
          {!!video.giftCount && (
            <Text style={styles.giftMeta}>
              🎁 {video.giftCount.toLocaleString()} {video.giftCount === 1 ? 'gift' : 'gifts'} · {(video.giftTotal ?? 0).toLocaleString()} MSH
            </Text>
          )}
        </View>

        {/* Action row: Like, Dislike, Share, Save, Playlist */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, video.liked && styles.actionBtnActive]} onPress={toggleLike}>
            <Ionicons name={video.liked ? 'thumbs-up' : 'thumbs-up-outline'} size={20} color={video.liked ? COLORS.primary : COLORS.text} />
            <Text style={[styles.actionLabel, video.liked && { color: COLORS.primary }]}>{video._count?.likes ?? 0}</Text>
          </TouchableOpacity>
          <View style={styles.actionDivider} />
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <Ionicons name="share-social-outline" size={20} color={COLORS.text} />
            <Text style={styles.actionLabel}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, video.savedLater && styles.actionBtnActive]} onPress={toggleWatchLater}>
            <Ionicons name={video.savedLater ? 'bookmark' : 'bookmark-outline'} size={20} color={video.savedLater ? COLORS.primary : COLORS.text} />
            <Text style={[styles.actionLabel, video.savedLater && { color: COLORS.primary }]}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={loadPlaylists}>
            <Ionicons name="list" size={20} color={COLORS.text} />
            <Text style={styles.actionLabel}>Playlist</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Creator row */}
        <View style={styles.creatorRow}>
          {video.creator?.profile?.avatarUrl ? (
            <Image source={{ uri: video.creator.profile.avatarUrl }} style={styles.creatorAvatar} />
          ) : (
            <View style={styles.creatorAvatar}>
              <Text style={styles.creatorAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.creatorInfo}>
            <Text style={styles.creatorName}>{displayName}</Text>
            <Text style={styles.creatorSub}>
              @{video.creator?.username} · {(video.subscriberCount ?? 0).toLocaleString()} subscribers
            </Text>
          </View>
          {user?.userId !== video.creatorId && (
            <GiftButton
              recipientId={video.creatorId}
              recipientName={displayName}
              context="video"
              contextId={video.id}
              size={34}
              style={{ marginRight: 8 }}
              onSent={handleGiftSent}
            />
          )}
          {user?.userId !== video.creatorId && (
            <TouchableOpacity
              style={[styles.subscribeBtn, video.subscribed && styles.subscribedBtn]}
              onPress={toggleSubscribe}
            >
              <Text style={[styles.subscribeBtnText, video.subscribed && styles.subscribedBtnText]}>
                {video.subscribed ? 'Subscribed' : 'Subscribe'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Description */}
        {video.description && (
          <TouchableOpacity style={styles.descBlock} onPress={() => setDescExpanded(e => !e)}>
            <Text style={styles.descText} numberOfLines={descExpanded ? undefined : 2}>{video.description}</Text>
            <Text style={styles.descToggle}>{descExpanded ? 'Show less' : 'Show more'}</Text>
          </TouchableOpacity>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Comments */}
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>{video._count?.comments ?? comments.length} Comments</Text>
        </View>
        <View style={styles.commentInput}>
          <TextInput
            style={styles.commentField}
            placeholder="Add a comment…"
            placeholderTextColor={COLORS.textMuted}
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity style={styles.commentSend} onPress={postComment} disabled={posting || !comment.trim()}>
            {posting ? <ActivityIndicator color={COLORS.primary} size="small" /> : <Ionicons name="send" size={18} color={comment.trim() ? COLORS.primary : COLORS.textMuted} />}
          </TouchableOpacity>
        </View>
        {comments.map(c => (
          <View key={c.id} style={styles.commentRow}>
            {c.user?.profile?.avatarUrl ? (
              <Image source={{ uri: c.user.profile.avatarUrl }} style={styles.commentAvatar} />
            ) : (
              <View style={styles.commentAvatar}>
                <Text style={styles.commentAvatarText}>{(c.user?.profile?.displayName || c.user?.username || 'U').charAt(0).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.commentBody}>
              <Text style={styles.commentUser}>{c.user?.profile?.displayName || c.user?.username}</Text>
              <Text style={styles.commentText}>{c.text}</Text>
            </View>
          </View>
        ))}

        {/* Related */}
        {related.length > 0 && (
          <>
            <View style={styles.divider} />
            <Text style={styles.relatedTitle}>Up next</Text>
            {related.map(v => (
              <VideoCard
                key={v.id}
                video={v}
                compact
                onPress={rv => navigation.replace('VideoPlayer', { videoId: rv.id })}
              />
            ))}
          </>
        )}
      </ScrollView>

      {/* Back button overlay */}
      <SafeAreaView edges={['top']} style={styles.backOverlay} pointerEvents="box-none">
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Playlist picker */}
      <Modal visible={showPlaylists} transparent animationType="slide" onRequestClose={() => setShowPlaylists(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowPlaylists(false)} />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Save to playlist</Text>
          {playlists.length === 0 && <Text style={styles.sheetHint}>No playlists yet.</Text>}
          {playlists.map(pl => (
            <TouchableOpacity key={pl.id} style={styles.sheetRow} onPress={() => addToPlaylist(pl.id)}>
              <Ionicons name="list" size={20} color={COLORS.primary} />
              <Text style={styles.sheetLabel}>{pl.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.sheetRow} onPress={() => { setShowPlaylists(false); navigation.navigate('MyPlaylists'); }}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={[styles.sheetLabel, { color: COLORS.primary }]}>New playlist</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  playerPlaceholder: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  backOverlay: { position: 'absolute', top: 0, left: 0 },
  backBtn: { margin: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  titleBlock: { paddingHorizontal: SPACING.lg, paddingTop: 12, paddingBottom: 8 },
  videoTitle: { ...TYPOGRAPHY.h3, fontSize: 16, lineHeight: 22, marginBottom: 4 },
  videoMeta: { color: COLORS.textMuted, fontSize: 12 },
  giftMeta: { color: COLORS.gold, fontSize: 12, fontWeight: '600', marginTop: 4 },
  actionRow: { paddingHorizontal: SPACING.lg, gap: 4, alignItems: 'center', paddingVertical: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface },
  actionBtnActive: { backgroundColor: COLORS.primary + '22' },
  actionLabel: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  actionDivider: { width: 1, height: 24, backgroundColor: COLORS.border, marginHorizontal: 4 },
  creatorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12, gap: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  creatorAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7c3aed', justifyContent: 'center', alignItems: 'center' },
  creatorAvatarText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  creatorInfo: { flex: 1 },
  creatorName: { ...TYPOGRAPHY.body1, fontWeight: '700' },
  creatorSub: { color: COLORS.textMuted, fontSize: 12 },
  subscribeBtn: { backgroundColor: COLORS.text, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  subscribeBtnText: { color: COLORS.background, fontWeight: '700', fontSize: 13 },
  subscribedBtn: { backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
  subscribedBtnText: { color: COLORS.text },
  descBlock: { paddingHorizontal: SPACING.lg, paddingVertical: 10, backgroundColor: COLORS.surface, marginHorizontal: SPACING.lg, borderRadius: 10, gap: 4 },
  descText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  descToggle: { color: COLORS.primary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  divider: { height: 8, backgroundColor: COLORS.surface, marginVertical: 8 },
  commentsHeader: { paddingHorizontal: SPACING.lg, paddingBottom: 12 },
  commentsTitle: { ...TYPOGRAPHY.h3, fontSize: 15 },
  commentInput: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.lg, gap: 10, marginBottom: 16 },
  commentField: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: COLORS.text, fontSize: 13, borderWidth: 1, borderColor: COLORS.border, minHeight: 36 },
  commentSend: { padding: 8 },
  commentRow: { flexDirection: 'row', gap: 10, paddingHorizontal: SPACING.lg, paddingVertical: 8 },
  commentAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  commentAvatarText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
  commentBody: { flex: 1 },
  commentUser: { color: COLORS.text, fontWeight: '700', fontSize: 12, marginBottom: 2 },
  commentText: { color: COLORS.textMuted, fontSize: 13, lineHeight: 18 },
  relatedTitle: { ...TYPOGRAPHY.h3, paddingHorizontal: SPACING.lg, paddingBottom: 8, fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: COLORS.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 36, gap: 4 },
  sheetTitle: { ...TYPOGRAPHY.h3, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  sheetLabel: { ...TYPOGRAPHY.body1, fontSize: 15 },
  sheetHint: { color: COLORS.textMuted, fontSize: 13, paddingVertical: 8 },
});
