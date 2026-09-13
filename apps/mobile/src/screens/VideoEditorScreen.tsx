import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { fetchApi, uploadMedia } from '../utils/api';
import {
  EditPlanClip, VideoOverlayLayer, VIDEO_FILTER_PRESETS, VOICE_EFFECTS, TRANSITIONS, MIN_SPEED, MAX_SPEED,
} from '../utils/videoEditPlan';
import { PickedSong } from './SongPickerScreen';
import Button from '../components/Button';
import { DURATION, EASING, useReducedMotion } from '../theme/motion';
import VideoTimeline from './VideoTimeline';
import EditorVideoCanvas from './editor/EditorVideoCanvas';
import LayerView from './editor/LayerView';
import TextEditorModal from './editor/panels/TextEditorModal';
import StickerPanel from './editor/panels/StickerPanel';
import SimpleSlider from './editor/SimpleSlider';
import { FILTER_PRESETS, buildFinalMatrix, IDENTITY_MATRIX } from './editor/filters';
import { Layer, LayerTransform, TextLayerData, StickerLayerData, makeLayer, makeTransform, newLayerId } from './editor/types';

type Panel = 'none' | 'filter' | 'text' | 'music' | 'voice' | 'transition';

const { width: SCREEN_W } = Dimensions.get('window');
const CANVAS_W = Math.min(SCREEN_W - 32, 340);
const CANVAS_H = CANVAS_W * (16 / 9);

function AnimatedPanel({ children }: { children: React.ReactNode }) {
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (!reducedMotion) progress.value = withTiming(1, { duration: DURATION.standard, easing: EASING.standard });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 8 }] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

// The real editor: a live Skia preview (real color-matrix filters applied
// to actual video frames, not a swatch), a draggable multi-clip timeline
// with real filmstrips and trim handles, freeform drag/pinch/rotate text &
// sticker overlays (the photo editor's own LayerView/TextEditorModal reused
// verbatim), a continuous speed range with a genuinely sped-up/slowed-down
// live preview, real transitions between clips, and full undo/redo — see
// EditorVideoCanvas.tsx and VideoTimeline.tsx for the two pieces that don't
// exist anywhere else in this codebase yet.
export default function VideoEditorScreen({ navigation, route }: any) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const initialClips: EditPlanClip[] = route?.params?.clips ?? [];
  const templateId: string | undefined = route?.params?.templateId;
  const sourcePerformanceId: string | undefined = route?.params?.sourcePerformanceId;
  const compositionMode: 'DUET' | 'STITCH' | undefined = route?.params?.compositionMode;

  const [clips, setClips] = useState<EditPlanClip[]>(initialClips);
  const clipsRef = useRef(clips);
  useEffect(() => { clipsRef.current = clips; }, [clips]);
  const [history, setHistory] = useState<EditPlanClip[][]>([]);
  const [future, setFuture] = useState<EditPlanClip[][]>([]);

  const [selectedClipId, setSelectedClipId] = useState(initialClips[0]?.id ?? '');
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>('none');
  const [filterPreset, setFilterPreset] = useState('original');
  const [musicSong, setMusicSong] = useState<PickedSong | null>(null);
  const [musicOffsetMs, setMusicOffsetMs] = useState(0);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [voiceEffect, setVoiceEffect] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentClipMs, setCurrentClipMs] = useState(0);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [editingOverlayId, setEditingOverlayId] = useState<string | null>(null);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);

  const canvasRef = useRef<{ seekTo: (ms: number) => void }>(null);
  const exportShotRef = useRef<React.ComponentRef<typeof ViewShot>>(null);

  useEffect(() => {
    if (!templateId) return;
    fetchApi(`/video-templates/${templateId}`).then((res) => res.json()).then((t) => {
      if (t.filterPreset) setFilterPreset(t.filterPreset);
      if (t.musicSong) setMusicSong(t.musicSong);
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  useEffect(() => {
    if (route?.params?.pickedSong) {
      setMusicSong(route.params.pickedSong);
      navigation.setParams({ pickedSong: undefined });
    }
  }, [route?.params?.pickedSong, navigation]);

  const clip = clips.find((c) => c.id === selectedClipId) ?? clips[0];
  const clipIndex = clips.findIndex((c) => c.id === selectedClipId);

  const filterMatrix = useMemo(() => {
    const preset = FILTER_PRESETS.find((f) => f.key === filterPreset)?.matrix ?? IDENTITY_MATRIX;
    return buildFinalMatrix(preset, 0, 0, 0);
  }, [filterPreset]);

  // ── Undo/redo — same history/future snapshot-stack pattern MediaEditorScreen uses
  const mutateClips = useCallback((updater: (prev: EditPlanClip[]) => EditPlanClip[]) => {
    setHistory((h) => [...h, clipsRef.current]);
    setFuture([]);
    setClips((prev) => updater(prev));
  }, []);
  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setFuture((f) => [clipsRef.current, ...f]);
    setHistory((h) => h.slice(0, -1));
    setClips(prev);
  };
  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory((h) => [...h, clipsRef.current]);
    setFuture((f) => f.slice(1));
    setClips(next);
  };

  const updateClip = (id: string, patch: Partial<EditPlanClip>) => {
    mutateClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const handleChangeTrim = (id: string, trimStartMs: number, trimEndMs: number) => {
    updateClip(id, { trimStartMs, trimEndMs });
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    mutateClips((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const removeClip = (id: string) => {
    if (clips.length <= 1) { Alert.alert('At least one clip is required'); return; }
    mutateClips((prev) => prev.filter((c) => c.id !== id));
    if (selectedClipId === id) setSelectedClipId(clips.find((c) => c.id !== id)?.id ?? '');
  };

  const setSpeed = (speed: number) => clip && updateClip(clip.id, { speed });
  const setTransitionOut = (t: 'cut' | 'fade' | 'slide') => clip && updateClip(clip.id, { transitionOut: t });

  // ── Overlays (freeform text/stickers) — reuse the photo editor's Layer model
  const updateOverlayTransform = (overlayId: string, transform: LayerTransform) => {
    if (!clip) return;
    updateClip(clip.id, {
      overlays: clip.overlays.map((o) => (o.id === overlayId ? { ...o, transform } : o)),
    });
  };

  const openAddText = () => { setEditingOverlayId(null); setTextModalVisible(true); };
  const openEditText = (overlayId: string) => { setEditingOverlayId(overlayId); setTextModalVisible(true); };

  const saveTextOverlay = (data: TextLayerData) => {
    if (!clip) return;
    setTextModalVisible(false);
    if (editingOverlayId) {
      updateClip(clip.id, { overlays: clip.overlays.map((o) => (o.id === editingOverlayId ? { ...o, data } : o)) });
    } else {
      const layer = makeLayer(newLayerId(), data, makeTransform(CANVAS_W / 2, CANVAS_H / 2));
      const overlay: VideoOverlayLayer = { ...layer, startMs: 0, endMs: null };
      updateClip(clip.id, { overlays: [...clip.overlays, overlay] });
      setSelectedOverlayId(layer.id);
    }
  };

  const addSticker = (emoji: string) => {
    if (!clip) return;
    setStickerPickerOpen(false);
    const data: StickerLayerData = { kind: 'sticker', emoji };
    const layer = makeLayer(newLayerId(), data, makeTransform(CANVAS_W / 2, CANVAS_H / 2));
    const overlay: VideoOverlayLayer = { ...layer, startMs: 0, endMs: null };
    updateClip(clip.id, { overlays: [...clip.overlays, overlay] });
    setSelectedOverlayId(layer.id);
  };

  const removeOverlay = (overlayId: string) => {
    if (!clip) return;
    updateClip(clip.id, { overlays: clip.overlays.filter((o) => o.id !== overlayId) });
    setSelectedOverlayId(null);
  };

  const selectedOverlay = clip?.overlays.find((o) => o.id === selectedOverlayId) ?? null;

  const totalDurationMs = useMemo(
    () => clips.reduce((sum, c) => sum + ((c.trimEndMs ?? c.durationMs) - c.trimStartMs) / (c.speed || 1), 0),
    [clips],
  );

  // ── Export: capture each overlay in isolation as its own transparent PNG
  // (full canvas frame, others hidden) — the position/rotation/scale the
  // user dragged/pinched/rotated it to is already baked into the pixels,
  // so the server just overlays this PNG at (0,0) scaled to the output
  // frame; no bounding-box math needed on either side.
  const captureOverlaysForClip = async (targetClip: EditPlanClip): Promise<{ imageUrl: string; startMs: number; endMs: number | null }[]> => {
    if (targetClip.overlays.length === 0) return [];
    const results: { imageUrl: string; startMs: number; endMs: number | null }[] = [];
    for (const ov of targetClip.overlays) {
      setCaptureLayers(targetClip.overlays.map((o) => ({ ...o, hidden: o.id !== ov.id })));
      await new Promise((r) => setTimeout(r, 80));
      const uri = await exportShotRef.current?.capture?.();
      if (!uri) continue;
      const finalUri = Platform.OS === 'android' && !uri.startsWith('file://') ? `file://${uri}` : uri;
      const { url } = await uploadMedia(finalUri, 'image');
      results.push({ imageUrl: url, startMs: ov.startMs, endMs: ov.endMs });
    }
    setCaptureLayers([]);
    return results;
  };
  const [captureLayers, setCaptureLayers] = useState<Layer[]>([]);

  const handleContinue = async () => {
    setSaving(true);
    try {
      const clipsForApi = [];
      for (const c of clips) {
        const overlays = await captureOverlaysForClip(c);
        clipsForApi.push({
          id: c.id,
          sourceUrl: c.sourceUrl,
          sourceType: c.sourceType,
          trimStartMs: c.trimStartMs,
          trimEndMs: c.trimEndMs,
          speed: c.speed,
          transitionOut: c.transitionOut,
          overlays: overlays.map((o) => ({ imageUrl: o.imageUrl, xNorm: 0, yNorm: 0, widthNorm: 1, startMs: o.startMs, endMs: o.endMs })),
        });
      }

      const payload = {
        clips: clipsForApi,
        musicSongId: musicSong?.id,
        musicOffsetMs,
        musicVolume,
        voiceEffect: voiceEffect ?? undefined,
        filterPreset,
        templateId,
        sourcePerformanceId,
        compositionMode,
      };
      const createRes = await fetchApi('/video-projects', { method: 'POST', body: JSON.stringify(payload) });
      const project = await createRes.json();
      if (!createRes.ok) throw new Error(project.message || 'Could not save your edit');

      const renderRes = await fetchApi(`/video-projects/${project.id}/render`, { method: 'POST', body: JSON.stringify({ status: 'DRAFT' }) });
      if (!renderRes.ok) { const d = await renderRes.json(); throw new Error(d.message || 'Could not start rendering'); }

      navigation.replace('RenderStatus', { projectId: project.id });
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const styles = useThemedStyles(({ COLORS, RADIUS, SPACING }) => ({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    iconBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
    continueBtn: { backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
    continueBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
    canvasWrap: { alignSelf: 'center', marginTop: 8 },
    toolRow: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: SPACING.lg, marginTop: 14 },
    toolBtn: { alignItems: 'center', gap: 4 },
    toolLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
    toolLabelActive: { color: COLORS.primary },
    panel: { marginHorizontal: SPACING.lg, marginTop: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14 },
    panelLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 10, letterSpacing: 0.4 },
    chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 6 },
    chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
    chipTextActive: { color: '#fff' },
    swatch: { width: 14, height: 14, borderRadius: 7 },
    musicRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surfaceElevated, borderRadius: RADIUS.md, padding: 10, marginBottom: 10 },
    musicText: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '600' },
    sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sliderLabel: { color: COLORS.textMuted, fontSize: 12, width: 44 },
    overlayList: { marginTop: 8, gap: 6 },
    overlayItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: COLORS.surfaceElevated, borderRadius: 8, padding: 8 },
    overlayRemove: { marginLeft: 'auto' },
    footer: { marginHorizontal: SPACING.lg, marginTop: 10, marginBottom: 4 },
    footerText: { textAlign: 'center', color: COLORS.textMuted, fontSize: 12 },
  }));

  if (!clip) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: COLORS.text, textAlign: 'center', marginTop: 40 }}>No clips to edit.</Text>
      </SafeAreaView>
    );
  }

  const trimEndMs = clip.trimEndMs ?? clip.durationMs;
  const speedLabel = `${clip.speed.toFixed(1)}x`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Offscreen export-capture surface: renders ONE overlay at a time on
          a transparent background at canvas resolution — see
          captureOverlaysForClip above for why this needs no bounding-box math. */}
      <View style={{ position: 'absolute', left: -9999, top: -9999 }} pointerEvents="none">
        <ViewShot ref={exportShotRef} options={{ format: 'png', quality: 1 }}>
          <View style={{ width: CANVAS_W, height: CANVAS_H }}>
            {captureLayers.filter((l) => !l.hidden).map((l) => (
              <LayerView key={l.id} layer={l} selected={false} canvasWidth={CANVAS_W} canvasHeight={CANVAS_H} onSelect={() => {}} onChange={() => {}} />
            ))}
          </View>
        </ViewShot>
      </View>

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn} onPress={undo} disabled={history.length === 0}>
            <Ionicons name="arrow-undo" size={16} color={history.length === 0 ? COLORS.border : COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={redo} disabled={future.length === 0}>
            <Ionicons name="arrow-redo" size={16} color={future.length === 0 ? COLORS.border : COLORS.text} />
          </TouchableOpacity>
          <Button label="Continue" onPress={handleContinue} loading={saving} style={styles.continueBtn} textStyle={styles.continueBtnText} />
        </View>
      </View>

      <View style={styles.canvasWrap}>
        <TouchableOpacity activeOpacity={0.95} onPress={() => setPlaying((p) => !p)}>
          <EditorVideoCanvas
            ref={canvasRef}
            sourceUrl={clip.sourceUrl}
            width={CANVAS_W}
            height={CANVAS_H}
            filterMatrix={filterMatrix}
            speed={clip.speed}
            trimStartMs={clip.trimStartMs}
            trimEndMs={trimEndMs}
            playing={playing}
            overlays={clip.overlays}
            currentClipMs={currentClipMs}
            selectedOverlayId={selectedOverlayId}
            onSelectOverlay={setSelectedOverlayId}
            onChangeOverlayTransform={updateOverlayTransform}
            onTimeUpdate={setCurrentClipMs}
          />
          {!playing ? (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
              <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.85)" />
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      <VideoTimeline
        clips={clips}
        selectedClipId={selectedClipId}
        onSelectClip={(id) => { setSelectedClipId(id); setSelectedOverlayId(null); setPlaying(false); }}
        onChangeTrim={handleChangeTrim}
        onReorder={handleReorder}
        onRemoveClip={removeClip}
        playheadMs={currentClipMs}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.toolRow}>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setPanel(panel === 'filter' ? 'none' : 'filter')}>
            <Ionicons name="color-filter-outline" size={20} color={panel === 'filter' ? COLORS.primary : COLORS.text} />
            <Text style={[styles.toolLabel, panel === 'filter' && styles.toolLabelActive]}>Filter</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={openAddText}>
            <Ionicons name="text-outline" size={20} color={COLORS.text} />
            <Text style={styles.toolLabel}>Text</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setStickerPickerOpen((v) => !v)}>
            <Ionicons name="happy-outline" size={20} color={stickerPickerOpen ? COLORS.primary : COLORS.text} />
            <Text style={[styles.toolLabel, stickerPickerOpen && styles.toolLabelActive]}>Sticker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setPanel(panel === 'music' ? 'none' : 'music')}>
            <Ionicons name="musical-notes-outline" size={20} color={panel === 'music' ? COLORS.primary : COLORS.text} />
            <Text style={[styles.toolLabel, panel === 'music' && styles.toolLabelActive]}>Music</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={() => setPanel(panel === 'voice' ? 'none' : 'voice')}>
            <Ionicons name="mic-outline" size={20} color={panel === 'voice' ? COLORS.primary : COLORS.text} />
            <Text style={[styles.toolLabel, panel === 'voice' && styles.toolLabelActive]}>Voice</Text>
          </TouchableOpacity>
          {clipIndex < clips.length - 1 ? (
            <TouchableOpacity style={styles.toolBtn} onPress={() => setPanel(panel === 'transition' ? 'none' : 'transition')}>
              <Ionicons name="swap-horizontal-outline" size={20} color={panel === 'transition' ? COLORS.primary : COLORS.text} />
              <Text style={[styles.toolLabel, panel === 'transition' && styles.toolLabelActive]}>Transition</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ marginHorizontal: 16, marginTop: 10 }}>
          <View style={styles.sliderRow}>
            <Text style={styles.sliderLabel}>{speedLabel}</Text>
            <View style={{ flex: 1 }}>
              <SimpleSlider value={clip.speed} min={MIN_SPEED} max={MAX_SPEED} onChange={setSpeed} />
            </View>
          </View>
        </View>

        {stickerPickerOpen ? (
          <AnimatedPanel>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>STICKERS</Text>
              <StickerPanel onPick={addSticker} />
            </View>
          </AnimatedPanel>
        ) : null}

        {panel === 'filter' ? (
          <AnimatedPanel>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>FILTER — applied live to the whole video</Text>
              <View style={styles.chipRow}>
                {VIDEO_FILTER_PRESETS.map((f) => (
                  <TouchableOpacity key={f.key} style={[styles.chip, filterPreset === f.key && styles.chipActive]} onPress={() => setFilterPreset(f.key)}>
                    <View style={[styles.swatch, { backgroundColor: f.swatch }]} />
                    <Text style={[styles.chipText, filterPreset === f.key && styles.chipTextActive]}>{f.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </AnimatedPanel>
        ) : null}

        {panel === 'transition' && clipIndex < clips.length - 1 ? (
          <AnimatedPanel>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>TRANSITION INTO NEXT CLIP</Text>
              <View style={styles.chipRow}>
                {TRANSITIONS.map((t) => (
                  <TouchableOpacity key={t.key} style={[styles.chip, (clip.transitionOut ?? 'cut') === t.key && styles.chipActive]} onPress={() => setTransitionOut(t.key)}>
                    <Ionicons name={t.icon as any} size={14} color={(clip.transitionOut ?? 'cut') === t.key ? '#fff' : COLORS.text} />
                    <Text style={[styles.chipText, (clip.transitionOut ?? 'cut') === t.key && styles.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </AnimatedPanel>
        ) : null}

        {panel === 'music' ? (
          <AnimatedPanel>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>MUSIC (optional)</Text>
              {musicSong ? (
                <View style={styles.musicRow}>
                  <Ionicons name="musical-notes" size={16} color={COLORS.secondary} />
                  <Text style={styles.musicText} numberOfLines={1}>{musicSong.title} — {musicSong.artistName}</Text>
                  <TouchableOpacity onPress={() => setMusicSong(null)}><Ionicons name="close-circle" size={20} color={COLORS.textMuted} /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.chip} onPress={() => navigation.navigate('SongPicker', { returnScreen: 'VideoEditor', returnParamKey: 'pickedSong' })}>
                  <Ionicons name="add" size={14} color={COLORS.text} />
                  <Text style={styles.chipText}>Pick a song</Text>
                </TouchableOpacity>
              )}
              {musicSong ? (
                <>
                  <Text style={[styles.panelLabel, { marginTop: 14 }]}>STARTS AT (into the song) — {(musicOffsetMs / 1000).toFixed(1)}s</Text>
                  <SimpleSlider value={musicOffsetMs} min={0} max={Math.max(1000, (musicSong.durationSeconds - 1) * 1000)} onChange={setMusicOffsetMs} />
                  <Text style={[styles.panelLabel, { marginTop: 14 }]}>MUSIC VOLUME — {Math.round(musicVolume * 100)}%</Text>
                  <SimpleSlider value={musicVolume} min={0} max={1} onChange={setMusicVolume} />
                </>
              ) : null}
            </View>
          </AnimatedPanel>
        ) : null}

        {panel === 'voice' ? (
          <AnimatedPanel>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>VOICE EFFECT</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity style={[styles.chip, !voiceEffect && styles.chipActive]} onPress={() => setVoiceEffect(null)}>
                  <Text style={[styles.chipText, !voiceEffect && styles.chipTextActive]}>None</Text>
                </TouchableOpacity>
                {VOICE_EFFECTS.map((v) => (
                  <TouchableOpacity key={v.key} style={[styles.chip, voiceEffect === v.key && styles.chipActive]} onPress={() => setVoiceEffect(v.key)}>
                    <Ionicons name={v.icon as any} size={14} color={voiceEffect === v.key ? '#fff' : COLORS.text} />
                    <Text style={[styles.chipText, voiceEffect === v.key && styles.chipTextActive]}>{v.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </AnimatedPanel>
        ) : null}

        {selectedOverlay ? (
          <AnimatedPanel>
            <View style={styles.panel}>
              <Text style={styles.panelLabel}>SELECTED OVERLAY</Text>
              <View style={styles.chipRow}>
                {selectedOverlay.data.kind === 'text' ? (
                  <TouchableOpacity style={styles.chip} onPress={() => openEditText(selectedOverlay.id)}>
                    <Ionicons name="create-outline" size={14} color={COLORS.text} />
                    <Text style={styles.chipText}>Edit text</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.chip} onPress={() => removeOverlay(selectedOverlay.id)}>
                  <Ionicons name="trash-outline" size={14} color={COLORS.error} />
                  <Text style={styles.chipText}>Remove</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.panelLabel, { marginTop: 14 }]}>DRAG ON THE PREVIEW TO MOVE · PINCH TO RESIZE · TWO FINGERS TO ROTATE</Text>
            </View>
          </AnimatedPanel>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Total: {(totalDurationMs / 1000).toFixed(1)}s — rendered after you tap Continue</Text>
        </View>
      </ScrollView>

      <TextEditorModal
        visible={textModalVisible}
        initial={editingOverlayId ? (clip.overlays.find((o) => o.id === editingOverlayId)?.data as TextLayerData) : undefined}
        onCancel={() => setTextModalVisible(false)}
        onSave={saveTextOverlay}
      />
    </SafeAreaView>
  );
}
