import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudioPlayer } from 'expo-audio';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { PickedSong } from './SongPickerScreen';

const STEP_SECONDS = 1;

// ADD_AFTER's only extra step: the clip was recorded silent, so before
// saving we need to know where in the song playback should start relative
// to the video's own t=0. A stepper (not a full drag-timeline) — same
// pattern AirPayScreen's radius control already uses — keeps this simple
// and still lets the performer line the song up by ear via Preview.
export default function PerformanceOffsetEditScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const song: PickedSong = route?.params?.song;
  const mode = route?.params?.mode;
  const videoUri: string = route?.params?.videoUri;

  const maxOffsetSeconds = Math.max(0, song.durationSeconds - 3);
  const [offsetSeconds, setOffsetSeconds] = useState(0);
  const [previewing, setPreviewing] = useState(false);

  const player = useVideoPlayer(videoUri, (p) => { p.loop = false; p.muted = true; });
  const songPlayer = useAudioPlayer({ uri: song.audioUrl });

  useEffect(() => () => { player.pause(); songPlayer.pause(); }, [player, songPlayer]);

  const bump = (delta: number) => {
    setOffsetSeconds((s) => Math.max(0, Math.min(maxOffsetSeconds, Math.round((s + delta) * 10) / 10)));
  };

  const togglePreview = () => {
    if (previewing) {
      player.pause();
      songPlayer.pause();
      setPreviewing(false);
      return;
    }
    player.currentTime = 0;
    songPlayer.seekTo(offsetSeconds);
    player.play();
    songPlayer.play();
    setPreviewing(true);
  };

  const confirm = () => {
    player.pause();
    songPlayer.pause();
    navigation.replace('PerformancePreview', { song, mode, videoUri, offsetMs: Math.round(offsetSeconds * 1000) });
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
    videoWrap: { marginHorizontal: SPACING.lg, marginTop: 10, aspectRatio: 9 / 16, borderRadius: RADIUS.lg, overflow: 'hidden', backgroundColor: '#000', maxHeight: 380 },
    video: { width: '100%', height: '100%' },
    playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
    label: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted, marginBottom: 10, textAlign: 'center' },
    stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
    stepBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    offsetValue: { fontSize: 22, fontWeight: '800', color: COLORS.text, minWidth: 90, textAlign: 'center' },
    caption: { textAlign: 'center', fontSize: 12, color: COLORS.textMuted, marginTop: 10 },
    confirmBtn: { marginHorizontal: SPACING.lg, marginTop: SPACING.xl, alignItems: 'center', padding: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.primary },
    confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  }));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Line up the song</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.videoWrap}>
        <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
        <TouchableOpacity style={styles.playOverlay} onPress={togglePreview} activeOpacity={0.8}>
          {!previewing ? <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.85)" /> : null}
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>SONG STARTS AT</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => bump(-STEP_SECONDS)}>
            <Ionicons name="remove" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.offsetValue}>{offsetSeconds.toFixed(1)}s</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => bump(STEP_SECONDS)}>
            <Ionicons name="add" size={20} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        <Text style={styles.caption}>Tap the video to preview your performance with the song from this point.</Text>
      </View>

      <TouchableOpacity style={styles.confirmBtn} onPress={confirm}>
        <Text style={styles.confirmBtnText}>Looks good</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
