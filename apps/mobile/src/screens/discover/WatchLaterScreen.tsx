import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../theme';
import { fetchApi } from '../../utils/api';
import VideoCard, { VideoMeta } from '../../components/VideoCard';

export default function WatchLaterScreen({ navigation }: any) {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/videos/watch-later');
      const d = await res.json();
      setVideos(Array.isArray(d) ? d : []);
    } catch { setVideos([]); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const remove = async (v: VideoMeta) => {
    Alert.alert('Remove', `Remove "${v.title}" from Watch Later?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          setVideos(prev => prev.filter(x => x.id !== v.id));
          await fetchApi(`/videos/${v.id}/watch-later`, { method: 'DELETE' });
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Watch Later</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={v => v.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          renderItem={({ item }) => (
            <VideoCard
              video={item}
              onPress={v => navigation.navigate('VideoPlayer', { videoId: v.id })}
              onMenuPress={remove}
              menuIcon="trash-outline"
            />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bookmark-outline" size={64} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>Nothing saved yet</Text>
              <Text style={styles.emptyHint}>Tap the bookmark on any video to save it here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 12 },
  back: { padding: 4 },
  title: { ...TYPOGRAPHY.h2, flex: 1, textAlign: 'center' },
  sep: { height: 1, backgroundColor: COLORS.border },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.textMuted },
  emptyHint: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center' },
});
