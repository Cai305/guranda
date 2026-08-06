import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, FlatList, Image, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, RADIUS } from '../theme';
import { fetchApi } from '../utils/api';
import { CommentDto, PostDto } from '@mxit2/types';
import { useAuth } from '../context/AuthContext';
import PostMediaCarousel from '../components/PostMediaCarousel';

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
  const { postId } = route.params;
  const { user } = useAuth();
  const [post, setPost] = useState<PostDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<{ id: string; name: string } | null>(null);
  const [posting, setPosting] = useState(false);

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
      if (!prev) return prev;
      const toggle = (c: CommentDto): CommentDto => {
        if (c.id !== commentId) return c;
        const has = c.likes?.some(l => l.userId === user?.userId);
        return {
          ...c,
          likes: has
            ? c.likes?.filter(l => l.userId !== user?.userId)
            : [...(c.likes ?? []), { id: 'tmp', userId: user?.userId as string }],
        };
      };
      return {
        ...prev,
        comments: prev.comments?.map(c => (c.id === commentId ? toggle(c) : { ...c, replies: c.replies?.map(r => (r.id === commentId ? toggle(r) : r)) })),
      };
    });
    await fetchApi(`/posts/comments/${commentId}/like`, { method: 'POST' }).catch(() => fetchPost());
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
        const newComment: CommentDto = await res.json();
        setPost(prev => {
          if (!prev) return prev;
          if (replyTarget) {
            return {
              ...prev,
              comments: prev.comments?.map(c => (c.id === replyTarget.id ? { ...c, replies: [...(c.replies ?? []), newComment] } : c)),
            };
          }
          return { ...prev, comments: [...(prev.comments ?? []), { ...newComment, replies: [] }] };
        });
        setContent('');
        setReplyTarget(null);
      }
    } catch (e) {
      console.error(e);
    }
    setPosting(false);
  };

  const renderCommentRow = (item: CommentDto, isReply: boolean) => {
    const liked = item.likes?.some(l => l.userId === user?.userId);
    const name = item.author?.displayName || item.author?.username || 'User';
    return (
      <View key={item.id} style={[styles.commentItem, isReply && styles.replyItem]}>
        <View style={styles.commentAvatarCol}>
          <Image
            source={{ uri: item.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${name}` }}
            style={styles.commentAvatar}
          />
        </View>
        <View style={styles.commentContent}>
          <View style={styles.commentHeaderRow}>
            <Text style={styles.authorName} numberOfLines={1}>{name}</Text>
            {item.author?.verified && <Ionicons name="checkmark-circle" size={13} color={COLORS.primary} style={{ marginLeft: 3 }} />}
            <Text style={styles.time}>· {timeAgo(item.createdAt as any)}</Text>
          </View>
          <Text style={styles.text}>{item.content}</Text>
          <View style={styles.commentActions}>
            <TouchableOpacity style={styles.commentActionBtn} onPress={() => handleLikeComment(item.id)}>
              <Ionicons name={liked ? 'heart' : 'heart-outline'} size={15} color={liked ? '#F43F5E' : COLORS.textMuted} />
              {!!item.likes?.length && <Text style={[styles.commentActionText, liked && { color: '#F43F5E' }]}>{item.likes.length}</Text>}
            </TouchableOpacity>
            {!isReply && (
              <TouchableOpacity style={styles.commentActionBtn} onPress={() => setReplyTarget({ id: item.id, name })}>
                <Ionicons name="chatbubble-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.commentActionText}>Reply</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
          renderItem={({ item }) => (
            <View>
              {renderCommentRow(item, false)}
              {(item.replies ?? []).map(r => renderCommentRow(r, true))}
            </View>
          )}
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
                  <Text style={styles.actionText}>{post.comments?.length || 0}</Text>
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

const styles = StyleSheet.create({
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
  replyItem: {
    paddingLeft: 16 + 44 * 0.6,
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
