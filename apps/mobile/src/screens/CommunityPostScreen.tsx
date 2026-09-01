import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { CommunityPostDto, CommunityPostCommentDto } from '@mxit2/types';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function CommunityPostScreen({ route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const { communityId, postId } = route.params;
  const [post, setPost] = useState<CommunityPostDto | null>(null);
  const [comments, setComments] = useState<CommunityPostCommentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [feedRes, commentsRes] = await Promise.all([
        fetchApi(`/communities/${communityId}/posts`, { headers: { 'Cache-Control': 'no-cache' } }),
        fetchApi(`/communities/${communityId}/posts/${postId}/comments`, { headers: { 'Cache-Control': 'no-cache' } }),
      ]);
      if (feedRes.ok) {
        const posts: CommunityPostDto[] = await feedRes.json();
        setPost(posts.find((p) => p.id === postId) || null);
      }
      if (commentsRes.ok) setComments(await commentsRes.json());
    } catch {}
    setLoading(false);
  }, [communityId, postId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    postCard: {
      backgroundColor: COLORS.surface, margin: SPACING.lg, borderRadius: 16, padding: 16,
      borderWidth: 1, borderColor: COLORS.border, gap: 8,
    },
    authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background },
    authorName: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    timeText: { color: COLORS.textMuted, fontSize: 11 },
    postContent: { color: COLORS.text, fontSize: 15, lineHeight: 21 },
    postMedia: { width: '100%', height: 220, borderRadius: 12, marginTop: 4 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11, paddingHorizontal: SPACING.lg, marginBottom: 8 },
    commentList: { paddingHorizontal: SPACING.lg, gap: 10, paddingBottom: 20 },
    commentRow: {
      flexDirection: 'row', gap: 10, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
      borderWidth: 1, borderColor: COLORS.border,
    },
    commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.background },
    commentAuthor: { color: COLORS.text, fontWeight: '700', fontSize: 12 },
    commentText: { color: COLORS.text, fontSize: 13, marginTop: 2 },
    composer: {
      flexDirection: 'row', alignItems: 'center', gap: 10, padding: SPACING.lg,
      borderTopWidth: 1, borderTopColor: COLORS.border,
    },
    commentInput: {
      flex: 1, backgroundColor: COLORS.surface, color: COLORS.text, borderRadius: 999,
      paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, fontSize: 14,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary,
      alignItems: 'center', justifyContent: 'center',
    },
    sendBtnDisabled: { opacity: 0.5 },
    empty: { color: COLORS.textMuted, textAlign: 'center', paddingVertical: 20 },
  }));

  const sendComment = async () => {
    if (!commentText.trim() || posting) return;
    try {
      setPosting(true);
      const res = await fetchApi(`/communities/${communityId}/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) {
        setCommentText('');
        load();
      }
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            post ? (
              <>
                <View style={styles.postCard}>
                  <View style={styles.authorRow}>
                    <Image
                      source={{ uri: post.author?.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${post.author?.username}` }}
                      style={styles.avatar}
                    />
                    <View>
                      <Text style={styles.authorName}>{post.author?.profile?.displayName || post.author?.username}</Text>
                      <Text style={styles.timeText}>{timeAgo(post.createdAt as any)}</Text>
                    </View>
                  </View>
                  {!!post.content && <Text style={styles.postContent}>{post.content}</Text>}
                  {!!post.mediaUrl && <Image source={{ uri: post.mediaUrl }} style={styles.postMedia} resizeMode="cover" />}
                </View>
                <Text style={styles.sectionLabel}>COMMENTS</Text>
              </>
            ) : null
          }
          ListEmptyComponent={<Text style={styles.empty}>No comments yet — be the first.</Text>}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <Image
                source={{ uri: item.author?.profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.author?.username}` }}
                style={styles.commentAvatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.commentAuthor}>{item.author?.profile?.displayName || item.author?.username}</Text>
                <Text style={styles.commentText}>{item.content}</Text>
              </View>
              <Text style={styles.timeText}>{timeAgo(item.createdAt as any)}</Text>
            </View>
          )}
          contentContainerStyle={styles.commentList}
        />

        <View style={styles.composer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment…"
            placeholderTextColor={COLORS.textMuted}
            value={commentText}
            onChangeText={setCommentText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!commentText.trim() || posting) && styles.sendBtnDisabled]}
            onPress={sendComment}
            disabled={!commentText.trim() || posting}
          >
            {posting ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
