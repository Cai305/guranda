import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function StatusViewersScreen({ route, navigation }: any) {
  const { theme } = useTheme();
  const { COLORS, TYPOGRAPHY } = theme;
  const storyId: string = route.params?.storyId;
  const [viewers, setViewers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    // Bypasses fetchApi's 5-minute GET cache — a view recorded moments ago
    // must show up here immediately, not on the next cache expiry.
    fetchApi(`/stories/${storyId}/viewers`, { headers: { 'Cache-Control': 'no-cache' } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setViewers(Array.isArray(data) ? data : []))
      .catch(() => setViewers([]))
      .finally(() => setLoading(false));
  }, [storyId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    root: { flex: 1, backgroundColor: COLORS.background },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
      backgroundColor: COLORS.glass, borderWidth: 1, borderColor: COLORS.glassBorder,
      borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.surface },
    name: { color: COLORS.text, fontWeight: '600' },
    viewedAt: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  }));

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={TYPOGRAPHY.h2}>Viewers</Text>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        data={viewers}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.viewer?.avatarUrl ? (
              <Image source={{ uri: item.viewer.avatarUrl }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle" size={36} color={COLORS.primary} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.viewer?.displayName || item.viewer?.username || 'Someone'}</Text>
              <Text style={styles.viewedAt}>Viewed {timeAgo(item.viewedAt)}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', padding: 40 }}>
            {loading ? <ActivityIndicator color={COLORS.primary} /> : <Text style={{ color: COLORS.textMuted }}>No views yet.</Text>}
          </View>
        }
      />
    </SafeAreaView>
  );
}
