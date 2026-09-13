import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useAudioPlayer } from 'expo-audio';
import { useThemedStyles } from '../theme/useThemedStyles';
import { PickedSong } from './SongPickerScreen';

export type PerformanceMode = 'SONG_SYNC' | 'KARAOKE' | 'ADD_AFTER' | 'EDITED';

const MAX_RECORD_SECONDS = 60;

// One recording screen shared by all three modes rather than three
// near-identical camera screens — only what happens to the song and to the
// eventual playback differs, so that's exactly what's parameterized:
// - SONG_SYNC / KARAOKE: the song plays aloud while the camera records
//   (KARAOKE additionally warns to use headphones, since its whole point is
//   keeping the mic's own captured audio instead of muting the clip).
// - ADD_AFTER: nothing plays — a silent take, song attached afterward.
export default function PerformanceRecordScreen({ navigation, route }: any) {
  const song: PickedSong = route?.params?.song;
  const mode: PerformanceMode = route?.params?.mode;

  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playsSongLive = mode === 'SONG_SYNC' || mode === 'KARAOKE';
  const songPlayer = useAudioPlayer(playsSongLive ? { uri: song?.audioUrl } : null);

  useEffect(() => {
    if (!camPerm?.granted) requestCamPerm();
    if (!micPerm?.granted) requestMicPerm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    songPlayer.pause();
  }, [songPlayer]);

  const cap = Math.min(MAX_RECORD_SECONDS, song?.durationSeconds || MAX_RECORD_SECONDS);

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    setIsRecording(true);
    setElapsedSec(0);
    if (playsSongLive) {
      songPlayer.seekTo(0);
      songPlayer.play();
    }
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: cap });
      finishRecording(result?.uri);
    } catch {
      finishRecording(undefined);
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
  };

  const finishRecording = (videoUri: string | undefined) => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    songPlayer.pause();
    setIsRecording(false);
    if (!videoUri) return;
    if (mode === 'ADD_AFTER') {
      navigation.replace('PerformanceOffsetEdit', { song, mode, videoUri });
    } else {
      navigation.replace('PerformancePreview', { song, mode, videoUri, offsetMs: 0 });
    }
  };

  const styles = useThemedStyles(({ COLORS, SPACING }) => ({
    container: { flex: 1, backgroundColor: '#000' },
    permWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl, gap: 14 },
    permTitle: { color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center' },
    permBody: { color: 'rgba(255,255,255,0.7)', fontSize: 14, textAlign: 'center' },
    permBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 22, paddingVertical: 14, borderRadius: 16, marginTop: 6 },
    permBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: SPACING.lg, zIndex: 5 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    songBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
    songBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600', maxWidth: 160 },
    tipBanner: { position: 'absolute', top: 90, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 14, padding: 12, zIndex: 5 },
    tipText: { color: '#fff', fontSize: 12, textAlign: 'center' },
    timer: { position: 'absolute', top: 90, alignSelf: 'center', backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 5 },
    timerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
    timerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    footer: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
    recordBtnOuter: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    recordBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF4444' },
    recordBtnInnerActive: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EF4444' },
    footerHint: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 14 },
    webNotice: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl, gap: 14 },
  }));

  if (Platform.OS === 'web') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.webNotice}>
          <Ionicons name="videocam-off-outline" size={40} color="rgba(255,255,255,0.6)" />
          <Text style={styles.permTitle}>Recording needs a device build</Text>
          <Text style={styles.permBody}>Camera recording isn't available in this web preview — build to a phone to record.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.permBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!camPerm?.granted || !micPerm?.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permWrap}>
          <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.6)" />
          <Text style={styles.permTitle}>Camera &amp; microphone access</Text>
          <Text style={styles.permBody}>Guranda needs both to record your performance.</Text>
          <TouchableOpacity style={styles.permBtn} onPress={() => { requestCamPerm(); requestMicPerm(); }}>
            <Text style={styles.permBtnText}>Allow access</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" mode="video" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={isRecording}>
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.songBadge}>
          <Ionicons name="musical-notes" size={14} color="#fff" />
          <Text style={styles.songBadgeText} numberOfLines={1}>{song?.title} — {song?.artistName}</Text>
        </View>
      </View>

      {mode === 'KARAOKE' && !isRecording ? (
        <View style={styles.tipBanner}>
          <Text style={styles.tipText}>🎧 Use headphones so only your voice gets picked up — otherwise the song will bleed into your mic.</Text>
        </View>
      ) : null}

      {isRecording ? (
        <View style={styles.timer}>
          <View style={styles.timerDot} />
          <Text style={styles.timerText}>{elapsedSec}s / {cap}s</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.recordBtnOuter} onPress={isRecording ? stopRecording : startRecording}>
          <View style={isRecording ? styles.recordBtnInnerActive : styles.recordBtnInner} />
        </TouchableOpacity>
        <Text style={styles.footerHint}>
          {isRecording ? 'Tap to stop' : mode === 'ADD_AFTER' ? 'Tap to record (silent)' : 'Tap to record — the song will play'}
        </Text>
      </View>
    </View>
  );
}
