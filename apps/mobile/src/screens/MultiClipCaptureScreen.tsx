import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Platform, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useThemedStyles } from '../theme/useThemedStyles';
import { useTheme } from '../context/ThemeContext';
import { uploadMedia } from '../utils/api';
import { generateVideoThumbnail, generateFilmstrip } from '../utils/videoThumbnail';
import { EditPlanClip, newClipId } from '../utils/videoEditPlan';

const FILMSTRIP_FRAME_COUNT = 6;

const MAX_CLIP_SECONDS = 60;
const MIN_TOTAL_CLIPS_MS = 500;

interface CapturedClip extends EditPlanClip {
  thumbnailUri: string | null;
  uploading: boolean;
}

// The first step of the "Create" flow, shared by a fresh video, a
// template-backed video, and a duet/stitch response: build an ordered list
// of clips (recorded on-device or picked from the gallery) before handing
// off to VideoEditorScreen. Recording needs a real device build (same
// limitation as PerformanceRecordScreen — expo-camera's recordAsync is
// native-only); picking from the gallery works everywhere, including this
// web preview, so it isn't gated behind a platform check.
export default function MultiClipCaptureScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const templateId: string | undefined = route?.params?.templateId;
  const sourcePerformanceId: string | undefined = route?.params?.sourcePerformanceId;
  const compositionMode: 'DUET' | 'STITCH' | undefined = route?.params?.compositionMode;

  const [clips, setClips] = useState<CapturedClip[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [camPerm, requestCamPerm] = useCameraPermissions();
  const [micPerm, requestMicPerm] = useMicrophonePermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addClip = async (uri: string, sourceType: 'RECORDED' | 'LIBRARY', durationMs: number) => {
    const id = newClipId();
    setClips((prev) => [...prev, {
      id, sourceUrl: uri, sourceType, trimStartMs: 0, trimEndMs: null, speed: 1, durationMs,
      overlays: [], transitionOut: 'cut', thumbnails: [], thumbnailUri: null, uploading: true,
    }]);
    try {
      const [thumb, filmstrip, uploaded] = await Promise.all([
        generateVideoThumbnail(uri).catch(() => null),
        generateFilmstrip(uri, FILMSTRIP_FRAME_COUNT, durationMs).catch(() => []),
        uploadMedia(uri, 'video'),
      ]);
      setClips((prev) => prev.map((c) => (c.id === id ? { ...c, sourceUrl: uploaded.url, thumbnailUri: thumb, thumbnails: filmstrip, uploading: false } : c)));
    } catch (e: any) {
      setClips((prev) => prev.filter((c) => c.id !== id));
      Alert.alert('Upload failed', e?.message || 'Could not add that clip.');
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Permission needed', 'Allow photo library access to pick a video.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], allowsEditing: false, quality: 1 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    // Same ms-vs-seconds quirk VideoUploadScreen already works around:
    // native reports duration in ms, web reports it in seconds already.
    const durationMs = asset.duration ? (Platform.OS === 'web' ? asset.duration * 1000 : asset.duration) : 5000;
    addClip(asset.uri, 'LIBRARY', Math.round(durationMs));
  };

  const startRecording = async () => {
    if (!cameraRef.current || isRecording) return;
    setIsRecording(true);
    setElapsedSec(0);
    timerRef.current = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    try {
      const result = await cameraRef.current.recordAsync({ maxDuration: MAX_CLIP_SECONDS });
      if (result?.uri) addClip(result.uri, 'RECORDED', elapsedSec * 1000);
    } finally {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setIsRecording(false);
      setShowCamera(false);
    }
  };

  const stopRecording = () => cameraRef.current?.stopRecording();

  const openCamera = () => {
    if (Platform.OS === 'web') {
      Alert.alert('Recording needs a device build', 'Camera recording isn’t available in this web preview — pick from your gallery instead, or build to a phone to record.');
      return;
    }
    if (!camPerm?.granted) requestCamPerm();
    if (!micPerm?.granted) requestMicPerm();
    setShowCamera(true);
  };

  const removeClip = (id: string) => setClips((prev) => prev.filter((c) => c.id !== id));
  const moveClip = (id: string, dir: -1 | 1) => {
    setClips((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      const swapWith = idx + dir;
      if (idx < 0 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
      return next;
    });
  };

  const totalMs = clips.reduce((sum, c) => sum + c.durationMs, 0);
  const anyUploading = clips.some((c) => c.uploading);
  const canContinue = clips.length > 0 && totalMs >= MIN_TOTAL_CLIPS_MS && !anyUploading;

  const goToEditor = () => {
    if (!canContinue) return;
    const editPlanClips: EditPlanClip[] = clips.map((c) => ({
      id: c.id, sourceUrl: c.sourceUrl, sourceType: c.sourceType,
      trimStartMs: c.trimStartMs, trimEndMs: c.trimEndMs, speed: c.speed,
      durationMs: c.durationMs, overlays: c.overlays,
      transitionOut: c.transitionOut, thumbnails: c.thumbnails,
    }));
    navigation.navigate('VideoEditor', {
      clips: editPlanClips,
      templateId, sourcePerformanceId, compositionMode,
    });
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
    banner: { marginHorizontal: SPACING.lg, marginTop: 4, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    bannerText: { color: COLORS.textMuted, fontSize: 12, flex: 1 },
    addRow: { flexDirection: 'row', gap: 10, marginHorizontal: SPACING.lg, marginTop: 14 },
    addBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 16, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border },
    addBtnText: { color: COLORS.text, fontWeight: '700', fontSize: 13 },
    clipsHeader: { marginHorizontal: SPACING.lg, marginTop: 20, color: COLORS.textMuted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
    clipRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: SPACING.lg, marginTop: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10 },
    clipThumb: { width: 46, height: 62, borderRadius: 8, backgroundColor: COLORS.surfaceElevated, justifyContent: 'center', alignItems: 'center' },
    clipIndex: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    clipIndexText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    clipDuration: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
    clipActions: { flexDirection: 'row', gap: 6 },
    iconBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    footer: { marginHorizontal: SPACING.lg, marginTop: 'auto', marginBottom: 20 },
    nextBtn: { backgroundColor: COLORS.primary, borderRadius: RADIUS.md, alignItems: 'center', padding: 15, opacity: canContinue ? 1 : 0.4 },
    nextBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
    totalText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12, marginTop: 8 },
    cameraContainer: { flex: 1, backgroundColor: '#000' },
    recordFooter: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
    recordBtnOuter: { width: 84, height: 84, borderRadius: 42, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    recordBtnInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EF4444' },
    recordBtnInnerActive: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EF4444' },
    timer: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
    timerText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    closeCameraBtn: { position: 'absolute', top: 50, left: 20, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  }));

  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front" mode="video" />
        <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setShowCamera(false)} disabled={isRecording}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
        {isRecording ? (
          <View style={styles.timer}><Text style={styles.timerText}>{elapsedSec}s / {MAX_CLIP_SECONDS}s</Text></View>
        ) : null}
        <View style={styles.recordFooter}>
          <TouchableOpacity style={styles.recordBtnOuter} onPress={isRecording ? stopRecording : startRecording}>
            <View style={isRecording ? styles.recordBtnInnerActive : styles.recordBtnInner} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{compositionMode === 'DUET' ? 'Duet' : compositionMode === 'STITCH' ? 'Stitch' : 'New Video'}</Text>
        <View style={{ width: 40 }} />
      </View>

      {compositionMode ? (
        <View style={styles.banner}>
          <Ionicons name="git-branch-outline" size={16} color={COLORS.secondary} />
          <Text style={styles.bannerText}>
            {compositionMode === 'DUET' ? 'Your clip will play side-by-side with the original.' : 'Your clip will play right after the original.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.addRow}>
        <TouchableOpacity style={styles.addBtn} onPress={openCamera}>
          <Ionicons name="camera-outline" size={26} color={COLORS.primary} />
          <Text style={styles.addBtnText}>Record a clip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addBtn} onPress={pickFromGallery}>
          <Ionicons name="images-outline" size={26} color={COLORS.primary} />
          <Text style={styles.addBtnText}>From gallery</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.clipsHeader}>CLIPS ({clips.length})</Text>
      <ScrollView contentContainerStyle={{ paddingBottom: 12 }}>
        {clips.map((c, i) => (
          <View key={c.id} style={styles.clipRow}>
            <View style={styles.clipIndex}><Text style={styles.clipIndexText}>{i + 1}</Text></View>
            <View style={styles.clipThumb}>
              {c.thumbnailUri ? (
                <Image source={{ uri: c.thumbnailUri }} style={{ width: 46, height: 62, borderRadius: 8 }} />
              ) : (
                <Ionicons name="videocam" size={18} color={COLORS.textMuted} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clipDuration}>{(c.durationMs / 1000).toFixed(1)}s</Text>
              {c.uploading ? <ActivityIndicator size="small" color={COLORS.textMuted} /> : null}
            </View>
            <View style={styles.clipActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => moveClip(c.id, -1)} disabled={i === 0}>
                <Ionicons name="chevron-up" size={16} color={i === 0 ? COLORS.border : COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => moveClip(c.id, 1)} disabled={i === clips.length - 1}>
                <Ionicons name="chevron-down" size={16} color={i === clips.length - 1 ? COLORS.border : COLORS.text} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => removeClip(c.id)}>
                <Ionicons name="trash-outline" size={15} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.nextBtn} onPress={goToEditor} disabled={!canContinue}>
          <Text style={styles.nextBtnText}>{anyUploading ? 'Uploading…' : 'Next: Edit'}</Text>
        </TouchableOpacity>
        {clips.length > 0 ? <Text style={styles.totalText}>Total: {(totalMs / 1000).toFixed(1)}s</Text> : null}
      </View>
    </SafeAreaView>
  );
}
