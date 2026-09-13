import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi } from '../utils/api';
import { VIDEO_FILTER_PRESETS } from '../utils/videoEditPlan';

interface VideoTemplate {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  filterPreset: string | null;
  musicSong: { title: string; artistName: string } | null;
  clipCount: number;
  useCount: number;
}

// A starter combo (filter + music) to drop a clip into — never someone
// else's finished video, just the recipe (see schema comment on
// VideoTemplate). Picking one carries its id into MultiClipCaptureScreen ->
// VideoEditorScreen, which prefill the filter/music as defaults only.
export default function TemplatesScreen({ navigation }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [templates, setTemplates] = useState<VideoTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/video-templates', { headers: { 'Cache-Control': 'no-cache' } });
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const useTemplate = (t: VideoTemplate) => {
    navigation.navigate('MultiClipCapture', { templateId: t.id });
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
    card: { flex: 1, margin: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, overflow: 'hidden' },
    cardThumb: { width: '100%', aspectRatio: 9 / 14, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    cardBody: { padding: 10 },
    cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
    cardSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
    swatchDot: { width: 10, height: 10, borderRadius: 5, position: 'absolute', top: 8, right: 8 },
    emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 10, paddingHorizontal: SPACING.xl },
    emptyText: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center' },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Templates</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.text} style={{ marginTop: 40 }} />
      ) : templates.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="grid-outline" size={40} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>No templates yet.</Text>
        </View>
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(t) => t.id}
          numColumns={2}
          contentContainerStyle={{ padding: 6 }}
          renderItem={({ item }) => {
            const swatch = VIDEO_FILTER_PRESETS.find((f) => f.key === item.filterPreset);
            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => useTemplate(item)}>
                <View style={styles.cardThumb}>
                  {item.thumbnailUrl ? (
                    <Image source={{ uri: item.thumbnailUrl }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Ionicons name="film-outline" size={28} color={COLORS.textMuted} />
                  )}
                  {swatch ? <View style={[styles.swatchDot, { backgroundColor: swatch.swatch }]} /> : null}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  {item.musicSong ? (
                    <Text style={styles.cardSub} numberOfLines={1}>♪ {item.musicSong.title}</Text>
                  ) : (
                    <Text style={styles.cardSub} numberOfLines={1}>{item.clipCount} clip{item.clipCount > 1 ? 's' : ''}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
