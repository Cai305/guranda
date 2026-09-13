import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { uploadMedia, fetchApi } from '../utils/api';
import { generateVideoThumbnail } from '../utils/videoThumbnail';
import { PickedSong } from './SongPickerScreen';
import { PerformanceMode } from './PerformanceRecordScreen';

// The shared last step for all three modes and for resuming a saved draft —
// only how the video's own audio and the song line up differs per mode:
// SONG_SYNC/ADD_AFTER mute the clip and let the song carry the sound (from
// 0 or from the chosen offset); KARAOKE keeps the clip's own captured audio
// and never re-plays the song file here.
export default function PerformancePreviewScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const song: PickedSong | undefined = route?.params?.song;
  const mode: PerformanceMode = route?.params?.mode;
  const videoUri: string = route?.params?.videoUri;
  const offsetMs: number = route?.params?.offsetMs ?? 0;
  // Resuming a draft edits the existing row instead of creating a new one.
  const existingId: string | undefined = route?.params?.performanceId;

  const [caption, setCaption] = useState<string>(route?.params?.caption ?? '');
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);

  // KARAOKE keeps its own captured audio; EDITED's file already has its
  // final composited audio baked in server-side — both play unmuted with no
  // separate song player, even when a song is attached (attribution only).
  const usesOwnAudio = mode === 'KARAOKE' || mode === 'EDITED';
  const muteVideo = !usesOwnAudio;
  const player = useVideoPlayer(videoUri, (p) => { p.loop = true; p.muted = muteVideo; });
  const songPlayer = useAudioPlayer(muteVideo && song ? { uri: song.audioUrl } : null);

  useEffect(() => {
    player.play();
    if (muteVideo && song) {
      songPlayer.loop = true;
      songPlayer.seekTo(offsetMs / 1000);
      songPlayer.play();
    }
    return () => { player.pause(); songPlayer.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (status: 'DRAFT' | 'PUBLISHED') => {
    setSaving(status === 'DRAFT' ? 'draft' : 'publish');
    try {
      let videoUrl = videoUri;
      let thumbnailUrl: string | null = null;
      const isNewUpload = !existingId;
      if (isNewUpload) {
        const uploaded = await uploadMedia(videoUri, 'video');
        videoUrl = uploaded.url;
        thumbnailUrl = await generateVideoThumbnail(videoUri);
      }
      const res = existingId
        ? await fetchApi(`/performances/${existingId}`, {
            method: 'PATCH',
            body: JSON.stringify({ caption: caption.trim() || undefined, status }),
          })
        : await fetchApi('/performances', {
            method: 'POST',
            body: JSON.stringify({ songId: song?.id, mode, videoUrl, thumbnailUrl: thumbnailUrl ?? undefined, offsetMs, caption: caption.trim() || undefined, status }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Could not save your performance');
      if (status === 'PUBLISHED') {
        Alert.alert('Posted!', 'Your performance is live on Explore.');
        navigation.popToTop();
      } else {
        Alert.alert('Saved as draft', 'Find it under My Drafts whenever you want to finish it.');
        navigation.navigate('PerformanceDrafts');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong.');
    } finally {
      setSaving(null);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
    videoWrap: { marginHorizontal: SPACING.lg, marginTop: 10, aspectRatio: 9 / 16, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: '#000', maxHeight: 380 },
    video: { width: '100%', height: '100%' },
    modeBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
    modeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    songRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: SPACING.lg, marginTop: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12 },
    songText: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '600' },
    captionInput: { marginHorizontal: SPACING.lg, marginTop: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, color: COLORS.text, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top' },
    btnRow: { flexDirection: 'row', gap: 10, marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
    draftBtn: { flex: 1, alignItems: 'center', padding: 15, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
    draftBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 14 },
    postBtn: { flex: 1, alignItems: 'center', padding: 15, borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
    postBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  }));

  const modeLabel = mode === 'SONG_SYNC' ? 'SONG SYNC' : mode === 'KARAOKE' ? 'KARAOKE' : mode === 'EDITED' ? 'EDITED' : 'ADD SONG AFTER';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.videoWrap}>
        <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
        <View style={styles.modeBadge}><Text style={styles.modeBadgeText}>{modeLabel}</Text></View>
      </View>

      {song ? (
        <View style={styles.songRow}>
          <Ionicons name="musical-notes" size={16} color={COLORS.secondary} />
          <Text style={styles.songText} numberOfLines={1}>{song.title} — {song.artistName}</Text>
        </View>
      ) : null}

      <TextInput
        style={styles.captionInput}
        value={caption}
        onChangeText={setCaption}
        placeholder="Write a caption..."
        placeholderTextColor={COLORS.textMuted}
        multiline
        maxLength={200}
      />

      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.draftBtn} onPress={() => save('DRAFT')} disabled={!!saving}>
          {saving === 'draft' ? <ActivityIndicator color={COLORS.text} /> : <Text style={styles.draftBtnText}>Save as draft</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.postBtn} onPress={() => save('PUBLISHED')} disabled={!!saving}>
          {saving === 'publish' ? <ActivityIndicator color="#fff" /> : <Text style={styles.postBtnText}>Post to Explore</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
