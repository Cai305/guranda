import React, { useEffect, useState } from 'react';
import { View, Image, ScrollView, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS, withSpring } from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { EditPlanClip, MIN_CLIP_MS } from '../utils/videoEditPlan';
import { SPRING } from '../theme/motion';

const PX_PER_SEC = 42;
const HANDLE_W = 16;
const CLIP_H = 64;
const MIN_PX = 36;

interface SegmentProps {
  clip: EditPlanClip;
  index: number;
  selected: boolean;
  onChangeTrim: (trimStartMs: number, trimEndMs: number) => void;
  onDragReorder: (fromIndex: number, dx: number) => void;
  onDragEnd: () => void;
}

function TimelineClipSegment({ clip, index, selected, onChangeTrim, onDragReorder, onDragEnd }: SegmentProps) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const fullPx = Math.max(MIN_PX, (clip.durationMs / 1000) * PX_PER_SEC);
  const trimStartPx = useSharedValue((clip.trimStartMs / Math.max(clip.durationMs, 1)) * fullPx);
  const trimEndPx = useSharedValue(((clip.trimEndMs ?? clip.durationMs) / Math.max(clip.durationMs, 1)) * fullPx);
  const dragX = useSharedValue(0);

  useEffect(() => {
    trimStartPx.value = (clip.trimStartMs / Math.max(clip.durationMs, 1)) * fullPx;
    trimEndPx.value = ((clip.trimEndMs ?? clip.durationMs) / Math.max(clip.durationMs, 1)) * fullPx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clip.trimStartMs, clip.trimEndMs, clip.durationMs]);

  const pxToMs = (px: number) => Math.round((px / fullPx) * clip.durationMs);
  const commitTrim = () => onChangeTrim(pxToMs(trimStartPx.value), pxToMs(trimEndPx.value));
  const minGapPx = (MIN_CLIP_MS / Math.max(clip.durationMs, 1)) * fullPx;
  const startAtStart = useSharedValue(0);
  const startAtEnd = useSharedValue(0);

  const leftHandle = Gesture.Pan()
    .onStart(() => { startAtStart.value = trimStartPx.value; })
    .onUpdate((e) => {
      const next = startAtStart.value + e.translationX;
      trimStartPx.value = Math.max(0, Math.min(trimEndPx.value - minGapPx, next));
    })
    .onEnd(() => runOnJS(commitTrim)());

  const rightHandle = Gesture.Pan()
    .onStart(() => { startAtEnd.value = trimEndPx.value; })
    .onUpdate((e) => {
      const next = startAtEnd.value + e.translationX;
      trimEndPx.value = Math.min(fullPx, Math.max(trimStartPx.value + minGapPx, next));
    })
    .onEnd(() => runOnJS(commitTrim)());

  // Long-press the grip, then drag horizontally to reorder — "bubble" past
  // a neighbor's midpoint to swap with it (same idea DraggableFlatList uses
  // internally), reported back to the parent which owns the actual array.
  const reportDrag = (dx: number) => onDragReorder(index, dx);
  const reportDragEnd = () => onDragEnd();
  const gripDrag = Gesture.Pan()
    .onUpdate((e) => {
      dragX.value = e.translationX;
      runOnJS(reportDrag)(e.translationX);
    })
    .onEnd(() => {
      dragX.value = withSpring(0, SPRING.soft);
      runOnJS(reportDragEnd)();
    });

  const segStyle = useAnimatedStyle(() => ({
    width: Math.max(MIN_PX, trimEndPx.value - trimStartPx.value),
    transform: [{ translateX: dragX.value }],
  }));
  const dimLeftStyle = useAnimatedStyle(() => ({ width: trimStartPx.value }));
  const dimRightStyle = useAnimatedStyle(() => ({ width: Math.max(0, fullPx - trimEndPx.value) }));

  return (
    <View style={{ width: fullPx, height: CLIP_H }}>
      {/* Full filmstrip underneath, with the trimmed-away portions dimmed */}
      <View style={[styles.filmstrip, { width: fullPx, borderColor: selected ? COLORS.primary : 'transparent' }]}>
        <View style={styles.filmstripRow}>
          {clip.thumbnails.length > 0 ? (
            clip.thumbnails.map((uri, i) => (
              <Image key={i} source={{ uri }} style={{ width: fullPx / clip.thumbnails.length, height: CLIP_H }} resizeMode="cover" />
            ))
          ) : (
            <View style={{ width: fullPx, height: CLIP_H, backgroundColor: COLORS.surfaceElevated, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="videocam" size={18} color={COLORS.textMuted} />
            </View>
          )}
        </View>
        <Animated.View pointerEvents="none" style={[styles.dim, { left: 0 }, dimLeftStyle]} />
        <Animated.View pointerEvents="none" style={[styles.dim, { right: 0 }, dimRightStyle]} />
      </View>

      {/* Kept region outline + trim handles + reorder grip, only when selected */}
      {selected && (
        <Animated.View style={[styles.selectedFrame, segStyle, { borderColor: COLORS.primary }]}>
          <GestureDetector gesture={leftHandle}>
            <View style={[styles.handle, { left: -HANDLE_W / 2, backgroundColor: COLORS.primary }]}>
              <View style={styles.handleGrip} />
            </View>
          </GestureDetector>
          <GestureDetector gesture={gripDrag}>
            <View style={styles.gripArea}>
              <Ionicons name="reorder-two" size={14} color="#fff" />
            </View>
          </GestureDetector>
          <GestureDetector gesture={rightHandle}>
            <View style={[styles.handle, { right: -HANDLE_W / 2, backgroundColor: COLORS.primary }]}>
              <View style={styles.handleGrip} />
            </View>
          </GestureDetector>
        </Animated.View>
      )}
    </View>
  );
}

interface Props {
  clips: EditPlanClip[];
  selectedClipId: string;
  onSelectClip: (id: string) => void;
  onChangeTrim: (clipId: string, trimStartMs: number, trimEndMs: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRemoveClip: (id: string) => void;
  playheadMs: number;
}

// The real draggable multi-clip timeline: a filmstrip per clip (not one
// stretched thumbnail), draggable trim handles on the selected clip, and
// drag-to-reorder — replaces the old up/down move-buttons + numeric trim
// steppers with the thing CapCut/TikTok's editor actually looks like.
export default function VideoTimeline({ clips, selectedClipId, onSelectClip, onChangeTrim, onReorder, onRemoveClip, playheadMs }: Props) {
  const { theme } = useTheme();
  const { COLORS } = theme;
  const [segmentWidths, setSegmentWidths] = useState<number[]>([]);

  const handleSegmentLayout = (index: number, e: LayoutChangeEvent) => {
    setSegmentWidths((prev) => {
      const next = [...prev];
      next[index] = e.nativeEvent.layout.width;
      return next;
    });
  };

  const handleDragReorder = (index: number, dx: number) => {
    const neighborIdx = dx < 0 ? index - 1 : index + 1;
    const neighborWidth = segmentWidths[neighborIdx];
    if (neighborWidth && Math.abs(dx) > neighborWidth * 0.6) {
      onReorder(index, neighborIdx);
    }
  };

  const selectedIndex = clips.findIndex((c) => c.id === selectedClipId);
  const selectedClip = clips[selectedIndex];
  const playheadFraction = selectedClip ? Math.min(1, playheadMs / Math.max(1, (selectedClip.trimEndMs ?? selectedClip.durationMs) - selectedClip.trimStartMs)) : 0;

  const styles2 = {
    container: { backgroundColor: COLORS.background },
  };

  return (
    <View style={styles2.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 16, marginBottom: 4 }}>
        {clips.length > 1 ? (
          <View onTouchEnd={() => onRemoveClip(selectedClipId)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="trash-outline" size={13} color={COLORS.error} />
          </View>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 3 }}>
        {clips.map((clip, i) => (
          <View key={clip.id} onLayout={(e) => handleSegmentLayout(i, e)} onTouchEnd={() => onSelectClip(clip.id)}>
            <TimelineClipSegment
              clip={clip}
              index={i}
              selected={clip.id === selectedClipId}
              onChangeTrim={(s, e) => onChangeTrim(clip.id, s, e)}
              onDragReorder={handleDragReorder}
              onDragEnd={() => {}}
            />
            {clip.id === selectedClipId ? (
              <View pointerEvents="none" style={[styles.playhead, { left: `${playheadFraction * 100}%`, backgroundColor: COLORS.primary }]} />
            ) : null}
          </View>
        ))}
      </ScrollView>
      <View style={[styles.ruler, { backgroundColor: COLORS.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  filmstrip: {
    height: CLIP_H,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 2,
  },
  filmstripRow: { flexDirection: 'row', width: '100%', height: '100%' },
  dim: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  selectedFrame: {
    position: 'absolute',
    top: 0,
    height: CLIP_H,
    borderWidth: 2,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_W,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleGrip: { width: 3, height: 20, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.8)' },
  gripArea: {
    position: 'absolute',
    top: -18,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -14,
    width: 28,
    height: 18,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruler: { height: 1, marginTop: 4 },
  playhead: { position: 'absolute', top: -4, bottom: -4, width: 2, borderRadius: 1 },
});
