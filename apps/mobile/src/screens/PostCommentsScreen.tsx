import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, FlatList, Image, Share, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { ThemeTokens } from '../theme/themes';
import { fetchApi } from '../utils/api';
import { CommentDto, PostDto } from '@mxit2/types';
import { useAuth } from '../context/AuthContext';
import PostMediaCarousel from '../components/PostMediaCarousel';
import PlatformWidget from '../components/widgets/PlatformWidget';
import { decodePlatformWidget } from '../components/widgets/platformWidget';

// ── Recursive comment-tree helpers ──────────────────────────────────────
// Comments now nest to any depth (see posts.service.ts's buildCommentTree) —
// these walk the whole tree instead of assuming one flat level of replies.
function updateCommentTree(comments: CommentDto[], targetId: string, updater: (c: CommentDto) => CommentDto): CommentDto[] {
  return comments.map((c) => {
    if (c.id === targetId) return updater(c);
    if (c.replies?.length) return { ...c, replies: updateCommentTree(c.replies, targetId, updater) };
    return c;
  });
}

function addReplyToTree(comments: CommentDto[], parentId: string, reply: CommentDto): CommentDto[] {
  return comments.map((c) => {
    if (c.id === parentId) return { ...c, replies: [...(c.replies ?? []), reply] };
    if (c.replies?.length) return { ...c, replies: addReplyToTree(c.replies, parentId, reply) };
    return c;
  });
}

function countDescendants(c: CommentDto): number {
  return (c.replies ?? []).reduce((sum, r) => sum + 1 + countDescendants(r), 0);
}

// Depth-cycled accent palette for the thread ribbon — six distinct hues
// instead of one flat gray indent line, so the eye can tell "which branch
// am I in" at a glance in a genuinely deep thread. Cycles rather than fades
// so depth 7 reads exactly as distinctly as depth 1, not as a smear.
const THREAD_COLORS = ['#8B5CF6', '#14B8A6', '#F59E0B', '#F43F5E', '#38BDF8', '#84CC16'];
const threadColor = (depth: number) => THREAD_COLORS[(depth - 1) % THREAD_COLORS.length];
// Reply nesting itself has no limit — only the ribbon's drawn width does.
// One full color cycle's worth of bars is plenty to establish "this is a
// deep thread"; past that, the 🧵 depth badge (shown from depth 4) carries
// the actual number instead of the row eating more horizontal space.
const MAX_RIBBON_BARS = THREAD_COLORS.length;

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

export default function PostCommentsScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const styles = useThemedStyles(createStyles);
  const { postId } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState<PostDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);
  const [posting, setPosting] = useState(false);
  // Collapsed sub-threads — a genuinely unbounded tree needs a way to fold
  // a branch back up, same idea as folding a file tree. Nothing is
  // collapsed by default; this only ever grows by explicit tap.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const toggleCollapsed = (id: string) => setCollapsedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const fetchPost = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchApi(`/posts/${postId}`);
      if (res.ok) setPost(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { fetchPost(); }, [fetchPost]);

  const displayName = post?.author?.displayName || post?.author?.username || 'User';
  const hasLiked = post?.likes?.some(l => l.userId === user?.userId);
  const hasReposted = post?.reposts?.some(r => r.userId === user?.userId);
  const isBookmarked = !!post?.isBookmarkedByMe;
  // Top-level comments plus every reply at any depth — comments now nest
  // arbitrarily deep, so a flat `.length` on the top-level array alone
  // would undercount a thread that's mostly replies.
  const totalCommentCount = (post?.comments ?? []).reduce((sum, c) => sum + 1 + countDescendants(c), 0);

  const handleLike = async () => {
    if (!post) return;
    setPost(p => (p ? {
      ...p,
      likes: hasLiked ? p.likes?.filter(l => l.userId !== user?.userId) : [...(p.likes || []), { id: 'tmp', userId: user?.userId as string }],
    } : p));
    await fetchApi(`/posts/${postId}/like`, { method: 'POST' }).catch(() => fetchPost());
  };

  const handleRepost = async () => {
    if (!post) return;
    setPost(p => (p ? {
      ...p,
      reposts: hasReposted ? p.reposts?.filter(r => r.userId !== user?.userId) : [...(p.reposts || []), { id: 'tmp', userId: user?.userId as string }],
    } : p));
    await fetchApi(`/posts/${postId}/repost`, { method: 'POST' }).catch(() => fetchPost());
  };

  const handleBookmark = async () => {
    if (!post) return;
    setPost(p => (p ? { ...p, isBookmarkedByMe: !p.isBookmarkedByMe } : p));
    await fetchApi(`/posts/${postId}/bookmark`, { method: 'POST' }).catch(() => fetchPost());
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: post?.content ? `${post.content}\n\n— ${displayName}` : 'Shared from Guranda' });
    } catch { }
  };

  const handleLikeComment = async (commentId: string) => {
    setPost(prev => {
      if (!prev?.comments) return prev;
      const toggle = (c: CommentDto): CommentDto => {
        const has = c.likes?.some(l => l.userId === user?.userId);
        return {
          ...c,
          likes: has
            ? c.likes?.filter(l => l.userId !== user?.userId)
            : [...(c.likes ?? []), { id: 'tmp', userId: user?.userId as string }],
        };
      };
      return { ...prev, comments: updateCommentTree(prev.comments, commentId, toggle) };
    });
    await fetchApi(`/posts/comments/${commentId}/like`, { method: 'POST' }).catch(() => fetchPost());
  };

  const submitCommentReport = async (commentId: string, reason: string) => {
    try {
      const res = await fetchApi(`/posts/comments/${commentId}/report`, { method: 'POST', body: JSON.stringify({ reason }) });
      if (!res.ok) throw new Error();
      Alert.alert('Reported', 'Thanks — our team will review this comment.');
    } catch {
      Alert.alert('Couldn\'t send report', 'Please try again.');
    }
  };

  const handleReportComment = (commentId: string) => {
    Alert.alert('Report comment', 'Why are you reporting this?', [
      { text: 'Spam', onPress: () => submitCommentReport(commentId, 'spam') },
      { text: 'Harassment', onPress: () => submitCommentReport(commentId, 'harassment') },
      { text: 'Nudity or sexual content', onPress: () => submitCommentReport(commentId, 'nudity') },
      { text: 'Violence', onPress: () => submitCommentReport(commentId, 'violence') },
      { text: 'Misinformation', onPress: () => submitCommentReport(commentId, 'misinformation') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handlePostComment = async () => {
    if (!content.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetchApi(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim(), parentId: replyTarget?.id }),
      });
      if (res.ok) {
        const newComment: CommentDto = { ...(await res.json()), replies: [] };
        setPost(prev => {
          if (!prev) return prev;
          if (replyTarget) {
            return { ...prev, comments: addReplyToTree(prev.comments ?? [], replyTarget.id, newComment) };
          }
          return { ...prev, comments: [...(prev.comments ?? []), newComment] };
        });
        setContent('');
        setReplyTarget(null);
      }
    } catch (e) {
      console.error(e);
    }
    setPosting(false);
  };

  // "Signal Threads" — the comment tree's own visual identity, distinct from
  // the single-gray-indent-line convention most feeds copy from each other.
  // Every depth level gets its own color from THREAD_COLORS, drawn as a
  // vertical ribbon bar to the left of the row (one bar per ancestor level,
  // so depth 3 shows 3 colored bars) with the bar for THIS reply's own
  // immediate parent capped with a small rounded "elbow" hook into the
  // avatar — a visual "this reply attaches here" cue lines-only threads
  // don't give you. The avatar itself picks up a ring in that same color,
  // tying the two together at a glance. Recurses to any depth — there is no
  // hardcoded stopping point, only the optional per-branch collapse toggle.
  const renderCommentRow = (item: CommentDto, depth: number): React.ReactElement => {
    const liked = item.likes?.some(l => l.userId === user?.userId);
    const name = item.author?.displayName || item.author?.username || 'User';
    const widget = decodePlatformWidget(item.content);
    const myColor = depth > 0 ? threadColor(depth) : undefined;
    const replies = item.replies ?? [];
    const collapsed = collapsedIds.has(item.id);
    const totalDescendants = countDescendants(item);

    return (
      <View key={item.id}>
        <View style={styles.commentItem}>
          {depth > 0 && (
            <View style={styles.ribbon}>
              {/* Reply depth itself is unbounded (see MAX_RIBBON_BARS'
                  comment below), but the ribbon's WIDTH caps out so a truly
                  deep thread never squeezes content off-screen — the
                  avatar ring and 🧵 depth badge still track the real depth
                  past that point, so nothing about how deep you are is lost,
                  it just stops costing more horizontal space to show it. */}
              {Array.from({ length: Math.min(depth, MAX_RIBBON_BARS) }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.ribbonBar,
                    { backgroundColor: threadColor(i + 1) },
                    i === Math.min(depth, MAX_RIBBON_BARS) - 1 && styles.ribbonBarElbow,
                  ]}
                />
              ))}
            </View>
          )}
          <View style={styles.commentAvatarCol}>
            <Image
              source={{ uri: item.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${name}` }}
              style={[styles.commentAvatar, myColor ? { borderColor: myColor, borderWidth: 2 } : null]}
            />
          </View>
          <View style={styles.commentContent}>
            <View style={styles.commentHeaderRow}>
              <Text style={styles.authorName} numberOfLines={1}>{name}</Text>
              {item.author?.verified && <Ionicons name="checkmark-circle" size={13} color={COLORS.primary} style={{ marginLeft: 3 }} />}
              <Text style={styles.time}>· {timeAgo(item.createdAt as any)}</Text>
              {depth >= 4 && (
                <View style={[styles.deepBadge, { borderColor: myColor }]}>
                  <Text style={styles.deepBadgeText}>🧵 {depth}</Text>
                </View>
              )}
            </View>
            {widget ? <PlatformWidget widget={widget} navigation={navigation} compact /> : <Text style={styles.text}>{item.content}</Text>}
            <View style={styles.commentActions}>
              <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleLikeComment(item.id)}>
                <Ionicons name={liked ? 'heart' : 'heart-outline'} size={15} color={liked ? '#F43F5E' : COLORS.textMuted} />
                {!!item.likes?.length && <Text style={[styles.commentActionText, liked && { color: '#F43F5E' }]}>{item.likes.length}</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.commentActionBtn} onPress={() => setReplyTarget({ id: item.id, name })}>
                <Ionicons name="chatbubble-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleReportComment(item.id)}>
                <Ionicons name="flag-outline" size={14} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            {totalDescendants > 0 && (
              <TouchableOpacity
                style={[styles.collapseToggle, { borderColor: (myColor ?? THREAD_COLORS[0]) + '55', backgroundColor: (myColor ?? THREAD_COLORS[0]) + '1A' }]}
                onPress={() => toggleCollapsed(item.id)}
              >
                <Ionicons name={collapsed ? 'chevron-forward' : 'chevron-down'} size={13} color={myColor ?? THREAD_COLORS[0]} />
                <Text style={[styles.collapseToggleText, { color: myColor ?? THREAD_COLORS[0] }]}>
                  {collapsed
                    ? `Show ${totalDescendants} ${totalDescendants === 1 ? 'reply' : 'replies'}`
                    : 'Collapse thread'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        {!collapsed && replies.map((r) => renderCommentRow(r, depth + 1))}
      </View>
    );
  };

  if (loading && !post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!post) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={TYPOGRAPHY.h3}>Post</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingWrap}>
          <Text style={styles.emptyText}>This post isn't available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>Post</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
        <FlatList
          data={post.comments ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => renderCommentRow(item, 0)}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchPost}
          ListHeaderComponent={
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.postAvatarCol}>
                  <Image
                    source={{ uri: post.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${displayName}` }}
                    style={styles.postAvatar}
                  />
                </View>
                <View style={styles.postAuthorInfo}>
                  <View style={styles.postNameRow}>
                    <Text style={styles.postAuthorName} numberOfLines={1}>{displayName}</Text>
                    {post.author?.verified && <Ionicons name="checkmark-circle" size={15} color={COLORS.primary} style={{ marginLeft: 3 }} />}
                  </View>
                  <Text style={styles.postTime} numberOfLines={1}>
                    {post.author?.username ? `@${post.author.username} · ` : ''}{timeAgo(post.createdAt as any)}
                  </Text>
                </View>
              </View>
              {post.content ? <Text style={styles.postContent}>{post.content}</Text> : null}
              {post.media?.length ? (
                <View style={styles.postMediaWrap}>
                  <PostMediaCarousel media={post.media} active />
                </View>
              ) : null}
              <View style={styles.postActions}>
                <View style={styles.actionButton}>
                  <Ionicons name="chatbubble-outline" size={18} color={COLORS.textMuted} />
                  <Text style={styles.actionText}>{totalCommentCount}</Text>
                </View>
                <TouchableOpacity style={styles.actionButton} onPress={handleRepost}>
                  <Ionicons name="repeat-outline" size={18} color={hasReposted ? '#10B981' : COLORS.textMuted} />
                  <Text style={[styles.actionText, hasReposted && { color: '#10B981' }]}>{post.reposts?.length || 0}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
                  <Ionicons name={hasLiked ? 'heart' : 'heart-outline'} size={18} color={hasLiked ? '#F43F5E' : COLORS.textMuted} />
                  <Text style={[styles.actionText, hasLiked && { color: '#F43F5E' }]}>{post.likes?.length || 0}</Text>
                </TouchableOpacity>
                <View style={styles.actionButton}>
                  <Ionicons name="stats-chart-outline" size={16} color={COLORS.textMuted} />
                  <Text style={styles.actionText}>{post.views ?? 0}</Text>
                </View>
                <TouchableOpacity style={styles.actionButtonSolo} onPress={handleBookmark}>
                  <Ionicons name={isBookmarked ? 'bookmark' : 'bookmark-outline'} size={18} color={isBookmarked ? COLORS.gold : COLORS.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButtonSolo} onPress={handleShare}>
                  <Ionicons name="share-outline" size={18} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
              <Text style={styles.commentsLabel}>Comments</Text>
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
              </View>
            ) : null
          }
        />

        {replyTarget && (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText}>Replying to @{replyTarget.name}</Text>
            <TouchableOpacity onPress={() => setReplyTarget(null)}>
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={replyTarget ? `Reply to @${replyTarget.name}...` : 'Write a comment...'}
            placeholderTextColor={COLORS.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
          />
          <TouchableOpacity
            style={[styles.postBtn, (!content.trim() || posting) && styles.postBtnDisabled]}
            onPress={handlePostComment}
            disabled={!content.trim() || posting}
          >
            <Ionicons name="send" size={20} color={!content.trim() || posting ? COLORS.textMuted : COLORS.primary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles({ COLORS, TYPOGRAPHY, RADIUS }: ThemeTokens) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 5,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 40,
  },

  // Full post card — mirrors ExploreScreen's post-card conventions so the
  // detail view reads as the same visual system as the feed.
  postCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
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
    marginBottom: 4,
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
  commentsLabel: {
    ...TYPOGRAPHY.label,
    fontSize: 11,
    marginTop: 14,
  },

  // Comments — same avatar-column convention as the post itself, indented
  // one level for replies (matches X's single-level thread nesting).
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  // ── "Signal Threads" connector ribbon ──────────────────────────────────
  ribbon: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 5,
    marginRight: 8,
  },
  ribbonBar: {
    width: 3,
    borderRadius: 2,
    opacity: 0.85,
  },
  // The bar belonging to this reply's own immediate parent gets a rounded
  // foot instead of a flush-square end — a small "this is where I attach"
  // hook, cheap to do with just a border-radius tweak rather than an
  // absolutely-positioned elbow curve.
  ribbonBarElbow: {
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  deepBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
  },
  deepBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.text,
  },
  // A distinct pill (not another plain icon+text action) so "this thread
  // has more underneath, tap to fold it" reads as its own control rather
  // than blending into the like/reply/flag row above it.
  collapseToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  collapseToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  commentAvatarCol: {
    width: '14%',
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 32,
    borderRadius: 999,
  },
  commentContent: {
    flex: 1,
    marginLeft: 4,
  },
  commentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorName: {
    ...TYPOGRAPHY.body2,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  time: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginLeft: 4,
  },
  text: {
    ...TYPOGRAPHY.body1,
    lineHeight: 20,
    marginTop: 2,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 6,
  },
  commentActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  replyBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  replyBannerText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'flex-end',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    color: COLORS.text,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 20,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  postBtn: {
    padding: 10,
    marginBottom: 2,
  },
  postBtnDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    ...TYPOGRAPHY.body1,
    color: COLORS.textMuted,
  },
  });
}
