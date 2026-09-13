import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';

interface DraftPerformance {
  id: string;
  mode: 'SONG_SYNC' | 'KARAOKE' | 'ADD_AFTER' | 'EDITED';
  videoUrl: string;
  thumbnailUrl: string | null;
  offsetMs: number;
  caption: string | null;
  createdAt: string;
  song: { id: string; title: string; artistName: string; audioUrl: string; coverUrl: string | null; durationSeconds: number } | null;
}

const MODE_LABEL: Record<string, string> = { SONG_SYNC: 'Song Sync', KARAOKE: 'Karaoke', ADD_AFTER: 'Add Song After', EDITED: 'Edited' };

export default function PerformanceDraftsScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [drafts, setDrafts] = useState<DraftPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/performances/drafts', { headers: { 'Cache-Control': 'no-cache' } });
      const data = await res.json();
      setDrafts(Array.isArray(data) ? data : []);
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resume = (d: DraftPerformance) => {
    navigation.navigate('PerformancePreview', {
      performanceId: d.id,
      song: d.song,
      mode: d.mode,
      videoUri: d.videoUrl,
      offsetMs: d.offsetMs,
      caption: d.caption ?? '',
    });
  };

  const publishNow = async (d: DraftPerformance) => {
    setBusyId(d.id);
    try {
      const res = await fetchApi(`/performances/${d.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'PUBLISHED' }) });
      if (!res.ok) throw new Error('Failed');
      setDrafts((prev) => prev.filter((x) => x.id !== d.id));
      Alert.alert('Posted!', 'Your performance is live on Explore.');
    } catch {
      Alert.alert('Error', 'Could not publish this draft.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = (d: DraftPerformance) => {
    Alert.alert('Delete draft?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusyId(d.id);
          try {
            await fetchApi(`/performances/${d.id}`, { method: 'DELETE' });
            setDrafts((prev) => prev.filter((x) => x.id !== d.id));
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: SPACING.lg, marginBottom: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12 },
    thumb: { width: 54, height: 72, borderRadius: 10, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    rowTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
    rowSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    modeChip: { alignSelf: 'flex-start', backgroundColor: COLORS.glass, borderColor: COLORS.glassBorder, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
    modeChipText: { fontSize: 10, fontWeight: '700', color: COLORS.primary },
    actions: { gap: 8 },
    actionBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: SPACING.xl },
    emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Drafts</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.text} style={{ marginTop: 40 }} />
      ) : drafts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="albums-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No drafts yet — performances you save without posting show up here.</Text>
        </View>
      ) : (
        <FlatList
          data={drafts}
          keyExtractor={(d) => d.id}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.row} activeOpacity={0.8} onPress={() => resume(item)}>
              <View style={styles.thumb}>
                {item.thumbnailUrl ? (
                  <Image source={{ uri: item.thumbnailUrl }} style={{ width: 54, height: 72, borderRadius: 10 }} />
                ) : (
                  <Ionicons name="videocam" size={20} color={COLORS.textMuted} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{item.caption || item.song?.title || 'Edited clip'}</Text>
                {item.song ? (
                  <Text style={styles.rowSub} numberOfLines={1}>{item.song.title} — {item.song.artistName}</Text>
                ) : null}
                <View style={styles.modeChip}><Text style={styles.modeChipText}>{MODE_LABEL[item.mode]}</Text></View>
              </View>
              <View style={styles.actions}>
                {busyId === item.id ? (
                  <ActivityIndicator size="small" color={COLORS.textMuted} />
                ) : (
                  <>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => publishNow(item)}>
                      <Ionicons name="checkmark" size={16} color={COLORS.success} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => remove(item)}>
                      <Ionicons name="trash-outline" size={15} color={COLORS.error} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
