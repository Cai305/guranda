import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '../theme';
import { fetchApi } from '../utils/api';
import { CommentDto } from '@mxit2/types';

export default function PostCommentsScreen({ route, navigation }: any) {
  const { postId } = route.params;
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [comments, setComments] = useState<CommentDto[]>([]);

  // Since we don't have a get single post API yet, we fetch the feed and find it
  useEffect(() => {
    fetchComments();
  }, []);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetchApi('/posts');
      if (res.ok) {
        const posts = await res.json();
        const post = posts.find((p: any) => p.id === postId);
        if (post && post.comments) {
          setComments(post.comments);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostComment = async () => {
    if (!content.trim()) return;
    
    try {
      const res = await fetchApi(`/posts/${postId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: content.trim() })
      });
      
      if (res.ok) {
        const newComment = await res.json();
        setComments(prev => [...prev, newComment]);
        setContent('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const renderComment = ({ item }: { item: CommentDto }) => (
    <View style={styles.commentItem}>
      <Image 
        source={{ uri: item.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${item.author?.displayName || 'User'}` }}
        style={styles.avatar}
      />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.authorName}>{item.author?.displayName || 'User'}</Text>
          <Text style={styles.time}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.text}>{item.content}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h3}>Comments</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={fetchComments}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
              </View>
            ) : null
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Write a comment..."
            placeholderTextColor={COLORS.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
          />
          <TouchableOpacity 
            style={[styles.postBtn, !content.trim() && styles.postBtnDisabled]}
            onPress={handlePostComment}
            disabled={!content.trim()}
          >
            <Ionicons name="send" size={20} color={!content.trim() ? COLORS.textMuted : COLORS.primary} />
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
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
    backgroundColor: COLORS.surface,
    padding: 12,
    borderRadius: 12,
    borderTopLeftRadius: 4,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  authorName: {
    ...TYPOGRAPHY.body2,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  text: {
    ...TYPOGRAPHY.body1,
    lineHeight: 20,
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
