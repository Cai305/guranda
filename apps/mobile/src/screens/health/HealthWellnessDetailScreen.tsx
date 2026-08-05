import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { fetchApi } from '../../utils/api';

export default function HealthWellnessDetailScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS, GRADIENTS } = theme;
  const { postId } = route.params;
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = () => fetchApi(`/health/wellness/${postId}`).then(r => r.json()).then(setPost).catch(() => {});
  useEffect(() => { load().finally(() => setLoading(false)); }, [postId]);

  const toggleLike = async () => {
    setBusy(true);
    try {
      await fetchApi(`/health/wellness/${postId}/like`, { method: 'POST' });
      await load();
    } catch {}
    setBusy(false);
  };

  const styles = useThemedStyles(({ COLORS, TYPOGRAPHY, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
    imageWrap: { position: 'relative' },
    image: { width: '100%', height: 200, justifyContent: 'center', alignItems: 'center' },
    backBtn: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 8, zIndex: 2 },
    body: { padding: SPACING.lg },
    catPill: { alignSelf: 'flex-start', backgroundColor: '#F8717122', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
    catText: { color: '#F87171', fontSize: 11, fontWeight: '700' },
    title: { ...TYPOGRAPHY.h2, marginBottom: 6 },
    author: { color: COLORS.textMuted, fontSize: 12, marginBottom: 16 },
    desc: { color: COLORS.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 20 },
    likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#F87171', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 10 },
    likeBtnActive: { backgroundColor: '#F87171' },
    likeText: { color: '#F87171', fontWeight: '700', fontSize: 13 },
    likeTextActive: { color: '#fff' },
  }));

  if (loading) return <View style={styles.center}><ActivityIndicator color={COLORS.primary} size="large" /></View>;
  if (!post) return <View style={styles.center}><Text style={{ color: COLORS.textMuted }}>Post not found</Text></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.imageWrap}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          {post.imageUrl ? (
            <Image source={{ uri: post.imageUrl }} style={styles.image} />
          ) : (
            <LinearGradient colors={GRADIENTS.crimson} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.image}>
              <Ionicons name="leaf" size={56} color="rgba(255,255,255,0.3)" />
            </LinearGradient>
          )}
        </View>

        <View style={styles.body}>
          <View style={styles.catPill}><Text style={styles.catText}>{post.category}</Text></View>
          <Text style={styles.title}>{post.title}</Text>
          <Text style={styles.author}>By {post.author?.profile?.displayName || post.author?.username}</Text>
          <Text style={styles.desc}>{post.description}</Text>

          <TouchableOpacity style={[styles.likeBtn, post.likedByMe && styles.likeBtnActive]} onPress={toggleLike} disabled={busy}>
            <Ionicons name={post.likedByMe ? 'heart' : 'heart-outline'} size={18} color={post.likedByMe ? '#fff' : '#F87171'} />
            <Text style={[styles.likeText, post.likedByMe && styles.likeTextActive]}>{post._count?.likes ?? 0} {post.likedByMe ? 'Liked' : 'Like'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
