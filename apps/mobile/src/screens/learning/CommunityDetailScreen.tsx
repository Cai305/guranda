import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';
import { ACCENT } from './LearningHomeScreen';

export default function CommunityDetailScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, SPACING } = theme;
  const { communityId } = route.params;
  const [community, setCommunity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [postText, setPostText] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetchApi(`/learning/communities/${communityId}`);
      setCommunity(res.ok ? await res.json() : null);
    } catch { setCommunity(null); }
    setLoading(false);
  }, [communityId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
    back: { padding: 4 },
    headerTitle: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
    card: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
    topicPill: { alignSelf: 'flex-start', backgroundColor: `${ACCENT}22`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    topicPillText: { color: ACCENT, fontSize: 11, fontWeight: '700' },
    description: { color: COLORS.text, fontSize: 14 },
    metaText: { color: COLORS.textMuted, fontSize: 12 },
    primaryBtn: { backgroundColor: ACCENT, borderRadius: 14, padding: 15, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    composer: { backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, padding: 12, gap: 10 },
    composerInput: { color: COLORS.text, fontSize: 14, minHeight: 50 },
    postBtn: { alignSelf: 'flex-end', backgroundColor: ACCENT, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
    postBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
    sectionLabel: { ...TYPOGRAPHY.label, fontSize: 11 },
    postCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border, gap: 4 },
    postAuthor: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    postContent: { color: COLORS.text, fontSize: 13, lineHeight: 18 },
    postTime: { color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
    hint: { color: COLORS.textMuted, fontSize: 13 },
    errorText: { color: '#ef4444', fontSize: 13 },
  }));

  const join = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetchApi(`/learning/communities/${communityId}/join`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to join');
      }
      await load();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const post = async () => {
    if (!postText.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetchApi(`/learning/communities/${communityId}/posts`, {
        method: 'POST',
        body: JSON.stringify({ content: postText.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to post');
      }
      setPostText('');
      await load();
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  if (!community) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Community</Text>
          <View style={{ width: 30 }} />
        </View>
        <Text style={styles.hint}>Community not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{community.name}</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, gap: 16, paddingBottom: 60 }}>
        <View style={styles.card}>
          <View style={styles.topicPill}><Text style={styles.topicPillText}>{community.topic}</Text></View>
          {community.description ? <Text style={styles.description}>{community.description}</Text> : null}
          <Text style={styles.metaText}>{community._count?.members ?? 0} members</Text>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {!community.isMember && (
          <TouchableOpacity style={styles.primaryBtn} onPress={join} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Join Community</Text>}
          </TouchableOpacity>
        )}

        {community.isMember && (
          <View style={styles.composer}>
            <TextInput
              style={styles.composerInput}
              placeholder="Share something with the community…"
              placeholderTextColor={COLORS.textMuted}
              value={postText}
              onChangeText={setPostText}
              multiline
            />
            <TouchableOpacity style={styles.postBtn} onPress={post} disabled={busy || !postText.trim()}>
              <Text style={styles.postBtnText}>Post</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>POSTS</Text>
        {community.posts.length === 0 ? (
          <Text style={styles.hint}>No posts yet — be the first to share.</Text>
        ) : (
          community.posts.map((post: any) => (
            <View key={post.id} style={styles.postCard}>
              <Text style={styles.postAuthor}>{post.author?.profile?.displayName || post.author?.username}</Text>
              <Text style={styles.postContent}>{post.content}</Text>
              <Text style={styles.postTime}>{new Date(post.createdAt).toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
