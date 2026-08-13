import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/api';
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

export default function UserPostsScreen({ route, navigation }: any) {
  const { userId, title } = route.params;
  const { user } = useAuth();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, RADIUS, SPACING }) => ({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    headerTitle: {
      ...TYPOGRAPHY.h3,
      marginLeft: SPACING.md,
      fontWeight: '700',
    },
    listContent: {
      padding: SPACING.lg,
    },
    postCard: {
      backgroundColor: COLORS.surface,
      padding: 16,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      marginBottom: SPACING.md,
    },
    postHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    postAvatarCol: {
      width: '12%',
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
      marginLeft: 8,
    },
    postAuthorName: {
      ...TYPOGRAPHY.body1,
      fontWeight: 'bold',
    },
    postTime: {
      ...TYPOGRAPHY.body2,
      fontSize: 12,
      color: COLORS.textMuted,
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
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionText: {
      color: COLORS.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    emptyText: {
      ...TYPOGRAPHY.body2,
      color: COLORS.textMuted,
      textAlign: 'center',
      marginTop: 40,
    },
  }));

  const fetchPosts = async (loadMore = false) => {
    if (loadMore) {
      if (!cursor || loadingMore) return;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      let url = `/posts/user/${userId}?take=15`;
      if (loadMore && cursor) url += `&cursor=${cursor}`;

      const res = await fetchApi(url);
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => loadMore ? [...prev, ...data.posts] : data.posts);
        setCursor(data.nextCursor);
      }
    } catch {
      if (!loadMore) Alert.alert('Error', 'Could not load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  const handleLike = async (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const hasLiked = p.likes?.some((l: any) => l.userId === user?.userId);
      return {
        ...p,
        likes: hasLiked 
          ? p.likes.filter((l: any) => l.userId !== user?.userId)
          : [...(p.likes || []), { userId: user?.userId }]
      };
    }));
    await fetchApi(`/posts/${postId}/like`, { method: 'POST' }).catch(() => fetchPosts());
  };

  const renderPost = ({ item }: { item: any }) => {
    const hasLiked = item.likes?.some((l: any) => l.userId === user?.userId);
    const hasReposted = item.reposts?.some((r: any) => r.userId === user?.userId);
    const displayName = item.author?.displayName || item.author?.username || 'User';

    return (
      <View style={styles.postCard}>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('PostComments', { postId: item.id })}>
          <View style={styles.postHeader}>
            <View style={styles.postAvatarCol}>
              <ExpoImage
                source={{ uri: item.author?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/png?seed=${displayName}` }}
                style={styles.postAvatar}
              />
            </View>
            <View style={styles.postAuthorInfo}>
              <Text style={styles.postAuthorName} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={styles.postTime} numberOfLines={1}>
                {timeAgo(item.createdAt)}
              </Text>
            </View>
          </View>
          {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}
          {item.media?.length ? (
            <View style={styles.postMediaWrap}>
              <PostMediaCarousel media={item.media} active={true} />
            </View>
          ) : null}
        </TouchableOpacity>

        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('PostComments', { postId: item.id })}>
            <Ionicons name="chatbubble-outline" size={18} color={styles.actionText.color} />
            <Text style={styles.actionText}>{item.comments?.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="repeat-outline" size={18} color={hasReposted ? '#10B981' : styles.actionText.color} />
            <Text style={[styles.actionText, hasReposted && { color: '#10B981' }]}>{item.reposts?.length || 0}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item.id)}>
            <Ionicons name={hasLiked ? 'heart' : 'heart-outline'} size={18} color={hasLiked ? '#F43F5E' : styles.actionText.color} />
            <Text style={[styles.actionText, hasLiked && { color: '#F43F5E' }]}>{item.likes?.length || 0}</Text>
          </TouchableOpacity>
          <View style={styles.actionButton}>
            <Ionicons name="stats-chart-outline" size={16} color={styles.actionText.color} />
            <Text style={styles.actionText}>{item.views ?? 0}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={styles.headerTitle.color} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title || 'Posts'}</Text>
      </View>
      
      {loading && !posts.length ? (
        <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={() => fetchPosts(true)}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={<Text style={styles.emptyText}>No posts found.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#8B5CF6" style={{ margin: 20 }} /> : null}
        />
      )}
    </SafeAreaView>
  );
}
