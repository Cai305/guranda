import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  Platform,
  Modal,
  Image,
  Animated,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent, useEventListener } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useTheme } from '../context/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';

export interface VideoRenditionMeta {
  label: string; // e.g. "720p", "480p", "360p"
  url: string;
  width: number;
  height: number;
  bitrate?: number | null;
}

export interface VideoPlayerProps {
  url: string; // fallback / "Auto" (original/highest quality) source
  renditions?: VideoRenditionMeta[]; // additional lower-quality options, may be empty/undefined
  poster?: string | null;
  autoPlay?: boolean;
  onProgress?: (seconds: number) => void; // fires roughly every second while playing
  onEnded?: () => void;
  nextVideo?: { id: string; title: string; thumbnailUrl?: string | null } | null;
  onPlayNext?: () => void;
  onBack?: () => void;
}

const PLAYBACK_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const CONTROLS_HIDE_DELAY = 3000;
const DOUBLE_TAP_WINDOW = 300;
const SEEK_STEP = 10;
const AUTOPLAY_COUNTDOWN = 5;
// Press-and-hold fast-forward/rewind — right holds into real 2x playback
// (expo-video decodes that smoothly, same rate the settings sheet already
// offers); left can't do the same trick — hardware decoders don't support
// negative/reverse playback rates — so "rewind" is simulated as a small
// backward seek on a fast repeating timer, which reads as continuous
// rewind even though it's really a rapid stepped seek.
const HOLD_THRESHOLD_MS = 300; // how long a press must last before it's a hold, not a tap
const HOLD_FORWARD_RATE = 2;
const HOLD_REWIND_STEP_SECONDS = 0.5;
const HOLD_REWIND_INTERVAL_MS = 150;

function fmtTime(rawSeconds: number): string {
  const seconds = !isFinite(rawSeconds) || rawSeconds < 0 ? 0 : rawSeconds;
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function VideoPlayer({
  url,
  renditions,
  poster,
  autoPlay,
  onProgress,
  onEnded,
  nextVideo,
  onPlayNext,
  onBack,
}: VideoPlayerProps) {
  const { theme } = useTheme();
  const { COLORS } = theme;

  const containerRef = useRef<View>(null);
  const videoViewRef = useRef<VideoView>(null);
  const trackViewRef = useRef<View>(null);
  const trackPageXRef = useRef(0);
  const trackWidthRef = useRef(1);
  const durationRef = useRef(0);

  const player = useVideoPlayer(url, (p) => {
    p.timeUpdateEventInterval = 1;
    if (autoPlay) p.play();
  });

  // --- Player-driven state -------------------------------------------------
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [currentTime, setCurrentTime] = useState(0);
  const [bufferedPosition, setBufferedPosition] = useState(0);
  const [duration, setDuration] = useState(player.duration || 0);
  const [muted, setMutedState] = useState(player.muted);
  const [playbackRate, setPlaybackRateState] = useState(player.playbackRate);
  const [ended, setEnded] = useState(false);

  useEventListener(player, 'timeUpdate', (payload) => {
    setCurrentTime(payload.currentTime);
    setBufferedPosition(payload.bufferedPosition);
    onProgress?.(Math.floor(payload.currentTime));
  });
  useEventListener(player, 'sourceLoad', (payload) => {
    setDuration(payload.duration || 0);
  });
  useEventListener(player, 'mutedChange', (payload) => setMutedState(payload.muted));
  useEventListener(player, 'playbackRateChange', (payload) => setPlaybackRateState(payload.playbackRate));
  useEventListener(player, 'playToEnd', () => {
    setEnded(true);
    onEnded?.();
  });

  // Reset local UI state whenever the underlying player instance changes
  // (expo-video recreates the player when the `url`/source argument changes).
  useEffect(() => {
    setEnded(false);
    setAutoplayCancelled(false);
    setActiveQualityLabel('Auto');
    setCurrentTime(0);
    setBufferedPosition(0);
    setDuration(player.duration || 0);
    setPosterVisible(!!poster);
    setControlsVisible(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  // --- Quality switching -----------------------------------------------------
  const [activeQualityLabel, setActiveQualityLabel] = useState('Auto');
  const qualityOptions = useMemo(() => {
    const sorted = [...(renditions ?? [])].sort((a, b) => b.width * b.height - a.width * a.height);
    return [{ label: 'Auto', url }, ...sorted.map((r) => ({ label: r.label, url: r.url }))];
  }, [url, renditions]);

  const switchQuality = useCallback(
    async (label: string, sourceUrl: string) => {
      if (label === activeQualityLabel) return;
      const wasPlaying = player.playing;
      const savedTime = player.currentTime;
      try {
        await player.replaceAsync(sourceUrl);
        player.currentTime = savedTime;
        if (wasPlaying) player.play();
        setActiveQualityLabel(label);
      } catch {
        // keep the previous quality selected on failure
      }
    },
    [player, activeQualityLabel]
  );

  // --- Poster ------------------------------------------------------------
  const [posterVisible, setPosterVisible] = useState(!!poster);

  // --- Fullscreen ----------------------------------------------------------
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = () => setIsFullscreen(!!(document as any).fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Landscape while fullscreen, native only — the app itself is locked to
  // portrait (app.json), so without this a fullscreen long-form video would
  // never actually rotate no matter how the device is held. Reacts to
  // `isFullscreen` rather than living inside toggleFullscreen() directly so
  // it stays correct even when fullscreen is entered/exited by the native
  // player chrome itself (onFullscreenEnter/Exit below), not just this
  // component's own button. Always unlocks back to portrait on the way out,
  // including on unmount, so leaving this screen never strands the rest of
  // the app sideways.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (isFullscreen) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    } else {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        if (!isFullscreen) {
          const el = containerRef.current as unknown as HTMLElement | null;
          await el?.requestFullscreen?.();
        } else {
          await (document as any)?.exitFullscreen?.();
        }
      } else if (!isFullscreen) {
        await videoViewRef.current?.enterFullscreen();
      } else {
        await videoViewRef.current?.exitFullscreen();
      }
    } catch {
      // fullscreen requests can be rejected (e.g. missing user gesture) — ignore
    }
  }, [isFullscreen]);

  // --- Controls visibility / auto-hide -------------------------------------
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, controlsOpacity]);

  useEffect(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    if (isPlaying && controlsVisible) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_DELAY);
    }
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, controlsVisible]);

  const showControls = useCallback(() => setControlsVisible(true), []);
  const toggleControls = useCallback(() => setControlsVisible((v) => !v), []);

  // --- Play/pause + tap flash ------------------------------------------------
  const flashOpacity = useRef(new Animated.Value(0)).current;
  const flashScale = useRef(new Animated.Value(1)).current;

  const triggerFlash = useCallback(() => {
    flashOpacity.setValue(1);
    flashScale.setValue(1);
    Animated.parallel([
      Animated.timing(flashOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
      Animated.timing(flashScale, { toValue: 1.4, duration: 450, useNativeDriver: true }),
    ]).start();
  }, [flashOpacity, flashScale]);

  const togglePlay = useCallback(() => {
    if (ended) {
      setEnded(false);
      setAutoplayCancelled(false);
      player.replay();
      player.play();
      triggerFlash();
      showControls();
      return;
    }
    if (player.playing) player.pause();
    else player.play();
    triggerFlash();
    showControls();
  }, [ended, player, triggerFlash, showControls]);

  // --- Double-tap seek ripples ----------------------------------------------
  const leftRippleOpacity = useRef(new Animated.Value(0)).current;
  const rightRippleOpacity = useRef(new Animated.Value(0)).current;

  const triggerRipple = useCallback(
    (side: 'left' | 'right') => {
      const val = side === 'left' ? leftRippleOpacity : rightRippleOpacity;
      val.setValue(1);
      Animated.timing(val, { toValue: 0, duration: 550, useNativeDriver: true }).start();
    },
    [leftRippleOpacity, rightRippleOpacity]
  );

  const doSeek = useCallback(
    (delta: number) => {
      player.seekBy(delta);
      showControls();
    },
    [player, showControls]
  );

  // --- Tap zone handling (single tap toggles controls, double tap seeks) ---
  const [overlayWidth, setOverlayWidth] = useState(0);
  const lastTapRef = useRef<{ time: number; zone: 'left' | 'center' | 'right' } | null>(null);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoneForX = useCallback(
    (x: number): 'left' | 'center' | 'right' => {
      const w = overlayWidth || 1;
      return x < w / 3 ? 'left' : x > (w * 2) / 3 ? 'right' : 'center';
    },
    [overlayWidth]
  );

  useEffect(
    () => () => {
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    },
    []
  );

  const handleTap = useCallback(
    (x: number) => {
      const zone = zoneForX(x);

      if (zone === 'center') {
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }
        lastTapRef.current = null;
        toggleControls();
        return;
      }

      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.zone === zone && now - last.time <= DOUBLE_TAP_WINDOW) {
        if (tapTimeoutRef.current) {
          clearTimeout(tapTimeoutRef.current);
          tapTimeoutRef.current = null;
        }
        lastTapRef.current = null;
        if (zone === 'left') {
          doSeek(-SEEK_STEP);
          triggerRipple('left');
        } else {
          doSeek(SEEK_STEP);
          triggerRipple('right');
        }
        return;
      }

      lastTapRef.current = { time: now, zone };
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        lastTapRef.current = null;
        toggleControls();
      }, DOUBLE_TAP_WINDOW);
    },
    [zoneForX, doSeek, triggerRipple, toggleControls]
  );

  // --- Press-and-hold fast-forward / rewind ----------------------------------
  // Held on the right: real 2x playback (expo-video decodes that smoothly —
  // the same rate the settings sheet already offers). Held on the left:
  // hardware decoders don't support negative/reverse rates, so "rewind" is
  // simulated as a small backward seek on a fast repeating timer instead —
  // it reads as continuous rewind even though each step is really a jump.
  // A press only becomes a hold after HOLD_THRESHOLD_MS; released sooner, it
  // falls straight through to the existing tap/double-tap handling above,
  // completely unchanged.
  const [holdMode, setHoldMode] = useState<'left' | 'right' | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rateBeforeHoldRef = useRef(1);
  const holdActiveRef = useRef(false);

  const stopHold = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    if (holdActiveRef.current) {
      player.playbackRate = rateBeforeHoldRef.current;
    }
    holdActiveRef.current = false;
    setHoldMode(null);
  }, [player]);

  const startHold = useCallback(
    (zone: 'left' | 'right') => {
      holdActiveRef.current = true;
      setHoldMode(zone);
      showControls();
      rateBeforeHoldRef.current = player.playbackRate;
      if (zone === 'right') {
        player.playbackRate = HOLD_FORWARD_RATE;
      } else {
        holdIntervalRef.current = setInterval(() => {
          player.seekBy(-HOLD_REWIND_STEP_SECONDS);
        }, HOLD_REWIND_INTERVAL_MS);
      }
    },
    [player, showControls]
  );

  useEffect(
    () => () => {
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    },
    []
  );

  const handlePressIn = useCallback(
    (x: number) => {
      const zone = zoneForX(x);
      // Always arm the pending-tap timer, even in the center zone — a quick
      // release checks this timer to know it was a tap (see handlePressOut).
      // Only the timer's own callback skips starting a hold for 'center',
      // so holding the center zone still does nothing special.
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        if (zone !== 'center') startHold(zone);
      }, HOLD_THRESHOLD_MS);
    },
    [zoneForX, startHold]
  );

  const handlePressOut = useCallback(
    (x: number) => {
      if (holdTimerRef.current) {
        // Released before the hold threshold fired — a real tap, not a
        // hold. Cancel the pending hold timer and run the normal
        // tap/double-tap logic exactly as before.
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
        handleTap(x);
        return;
      }
      if (holdActiveRef.current) {
        // A hold gesture consumes the press — it never also counts as a tap.
        stopHold();
      }
    },
    [handleTap, stopHold]
  );

  // --- Scrub bar (drag to seek) ----------------------------------------------
  const [scrubTime, setScrubTime] = useState<number | null>(null);
  const wasPlayingBeforeScrubRef = useRef(false);

  const measureTrack = useCallback(() => {
    trackViewRef.current?.measure((_x, _y, width, _height, pageX) => {
      trackPageXRef.current = pageX;
      trackWidthRef.current = Math.max(1, width);
    });
  }, []);

  const updateScrub = useCallback((pageX: number) => {
    const pct = Math.max(0, Math.min(1, (pageX - trackPageXRef.current) / trackWidthRef.current));
    setScrubTime(pct * durationRef.current);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        trackViewRef.current?.measure((_x, _y, width, _height, pageX) => {
          trackPageXRef.current = pageX;
          trackWidthRef.current = Math.max(1, width);
          wasPlayingBeforeScrubRef.current = player.playing;
          player.pause();
          setControlsVisible(true);
          const pct = Math.max(0, Math.min(1, (evt.nativeEvent.pageX - pageX) / Math.max(1, width)));
          setScrubTime(pct * durationRef.current);
        });
      },
      onPanResponderMove: (evt) => {
        updateScrub(evt.nativeEvent.pageX);
      },
      onPanResponderRelease: () => {
        setScrubTime((t) => {
          if (t != null) {
            player.currentTime = t;
            setCurrentTime(t);
          }
          return null;
        });
        if (wasPlayingBeforeScrubRef.current) player.play();
      },
      onPanResponderTerminate: () => {
        setScrubTime(null);
        if (wasPlayingBeforeScrubRef.current) player.play();
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ).current;

  // --- Mute --------------------------------------------------------------
  const toggleMute = useCallback(() => {
    player.muted = !player.muted;
  }, [player]);

  // --- Up next / autoplay countdown ------------------------------------------
  const [countdown, setCountdown] = useState(AUTOPLAY_COUNTDOWN);
  const [autoplayCancelled, setAutoplayCancelled] = useState(false);

  useEffect(() => {
    if (!ended || !nextVideo || autoplayCancelled) return;
    setCountdown(AUTOPLAY_COUNTDOWN);
    const id = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [ended, nextVideo, autoplayCancelled]);

  useEffect(() => {
    if (ended && nextVideo && !autoplayCancelled && countdown === 0) {
      onPlayNext?.();
    }
  }, [countdown, ended, nextVideo, autoplayCancelled, onPlayNext]);

  const replay = useCallback(() => {
    setEnded(false);
    setAutoplayCancelled(false);
    player.replay();
    player.play();
    showControls();
  }, [player, showControls]);

  const playNow = useCallback(() => {
    setEnded(false);
    setAutoplayCancelled(false);
    onPlayNext?.();
  }, [onPlayNext]);

  const cancelAutoplay = useCallback(() => setAutoplayCancelled(true), []);

  // --- Settings sheet ------------------------------------------------------
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isLoading = status === 'loading';
  const displayTime = scrubTime ?? currentTime;
  const playedPct = duration > 0 ? Math.min(100, (displayTime / duration) * 100) : 0;
  const bufferedPct = duration > 0 ? Math.min(100, (bufferedPosition / duration) * 100) : 0;

  const sheetStyles = useThemedStyles(({ COLORS: C, TYPOGRAPHY, SPACING }) => ({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: { backgroundColor: C.surfaceElevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: SPACING.lg, paddingBottom: 36, gap: 4 },
    sheetTitle: { ...TYPOGRAPHY.h3, marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border, fontSize: 15 },
    speedGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 8, marginBottom: 8 },
    speedChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border },
    speedChipActive: { backgroundColor: C.primary + '22', borderColor: C.primary },
    speedChipText: { color: C.text, fontSize: 13, fontWeight: '600' as const },
    speedChipTextActive: { color: C.primary },
    sheetRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, paddingVertical: 12 },
    sheetLabel: { ...TYPOGRAPHY.body1, fontSize: 15 },
  }));

  return (
    <View
      ref={containerRef}
      collapsable={false}
      style={[styles.container, isFullscreen && Platform.OS === 'web' && styles.containerFullscreenWeb]}
    >
      <VideoView
        ref={videoViewRef}
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        nativeControls={false}
        onFullscreenEnter={() => setIsFullscreen(true)}
        onFullscreenExit={() => setIsFullscreen(false)}
        onFirstFrameRender={() => setPosterVisible(false)}
      />

      {poster && posterVisible ? (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="contain" />
        </View>
      ) : null}

      <Pressable
        style={StyleSheet.absoluteFill}
        pointerEvents={ended ? 'none' : 'auto'}
        onLayout={(e) => setOverlayWidth(e.nativeEvent.layout.width)}
        onPressIn={(e) => handlePressIn(e.nativeEvent.locationX)}
        onPressOut={(e) => handlePressOut(e.nativeEvent.locationX)}
      />

      {isLoading ? (
        <View style={styles.bufferingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#fff" />
        </View>
      ) : null}

      {/* Seek ripples */}
      <Animated.View style={[styles.ripple, styles.rippleLeft, { opacity: leftRippleOpacity }]} pointerEvents="none">
        <Ionicons name="play-back" size={22} color="#fff" />
        <Text style={styles.rippleText}>-{SEEK_STEP}</Text>
      </Animated.View>
      <Animated.View style={[styles.ripple, styles.rippleRight, { opacity: rightRippleOpacity }]} pointerEvents="none">
        <Text style={styles.rippleText}>+{SEEK_STEP}</Text>
        <Ionicons name="play-forward" size={22} color="#fff" />
      </Animated.View>

      {/* Hold-to-rewind/fast-forward indicator */}
      {holdMode ? (
        <View style={[styles.holdBadge, holdMode === 'left' ? styles.holdBadgeLeft : styles.holdBadgeRight]} pointerEvents="none">
          {holdMode === 'left' && <Ionicons name="play-back" size={18} color="#fff" />}
          <Text style={styles.holdBadgeText}>{holdMode === 'right' ? `${HOLD_FORWARD_RATE}x` : 'Rewind'}</Text>
          {holdMode === 'right' && <Ionicons name="play-forward" size={18} color="#fff" />}
        </View>
      ) : null}

      {/* Controls overlay */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: controlsOpacity }]}
        pointerEvents={controlsVisible ? 'box-none' : 'none'}
      >
        <LinearGradient colors={['rgba(0,0,0,0.65)', 'transparent']} style={styles.topGradient} pointerEvents="box-none">
          <View style={styles.topBar}>
            {onBack ? (
              <TouchableOpacity style={styles.iconBtn} onPress={onBack} hitSlop={10}>
                <Ionicons name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.centerButtonWrap} pointerEvents="box-none">
          <Animated.View
            pointerEvents="none"
            style={[styles.flashIcon, { opacity: flashOpacity, transform: [{ scale: flashScale }] }]}
          >
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={52} color="#fff" />
          </Animated.View>
          <TouchableOpacity style={styles.centerButton} onPress={togglePlay} hitSlop={12}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={32} color="#fff" />
          </TouchableOpacity>
        </View>

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.bottomGradient} pointerEvents="box-none">
          <View
            ref={trackViewRef}
            style={styles.seekRow}
            onLayout={measureTrack}
            {...panResponder.panHandlers}
          >
            <View style={styles.trackBg} />
            <View style={[styles.trackBuffered, { width: `${bufferedPct}%` }]} />
            <View style={[styles.trackPlayed, { width: `${playedPct}%` }]} />
            <View style={[styles.thumb, { left: `${playedPct}%` }]} />
          </View>
          <View style={styles.bottomBar}>
            <Text style={styles.timeText}>
              {fmtTime(displayTime)} / {fmtTime(duration)}
            </Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.iconBtn} onPress={toggleMute} hitSlop={8}>
              <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setSettingsOpen(true)} hitSlop={8}>
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={toggleFullscreen} hitSlop={8}>
              <Ionicons name={isFullscreen ? 'contract' : 'expand'} size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Up next / replay overlay */}
      {ended ? (
        <View style={styles.endedOverlay} pointerEvents="box-none">
          {nextVideo ? (
            <>
              <View style={styles.nextVideoRow}>
                {nextVideo.thumbnailUrl ? (
                  <Image source={{ uri: nextVideo.thumbnailUrl }} style={styles.nextThumb} />
                ) : (
                  <View style={[styles.nextThumb, styles.nextThumbPlaceholder]}>
                    <Ionicons name="play" size={20} color="#fff" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextLabel}>Up next</Text>
                  <Text style={styles.nextTitle} numberOfLines={2}>
                    {nextVideo.title}
                  </Text>
                </View>
              </View>
              {!autoplayCancelled ? (
                <>
                  <Text style={styles.countdownText}>Playing next in {countdown}…</Text>
                  <View style={styles.endedButtonRow}>
                    <TouchableOpacity style={styles.endedBtnGhost} onPress={cancelAutoplay}>
                      <Text style={styles.endedBtnGhostText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.endedBtnPrimary} onPress={playNow}>
                      <Ionicons name="play" size={16} color="#000" />
                      <Text style={styles.endedBtnPrimaryText}>Play now</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.endedButtonRow}>
                  <TouchableOpacity style={styles.endedBtnGhost} onPress={replay}>
                    <Ionicons name="refresh" size={16} color="#fff" />
                    <Text style={styles.endedBtnGhostText}>Replay</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.endedBtnPrimary} onPress={playNow}>
                    <Ionicons name="play" size={16} color="#000" />
                    <Text style={styles.endedBtnPrimaryText}>Play now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : (
            <TouchableOpacity style={styles.replayBtn} onPress={replay}>
              <Ionicons name="refresh" size={28} color="#fff" />
              <Text style={styles.replayBtnText}>Replay</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}

      {/* Settings bottom sheet */}
      <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={() => setSettingsOpen(false)} />
        <View style={sheetStyles.sheet}>
          <Text style={sheetStyles.sheetTitle}>Playback speed</Text>
          <View style={sheetStyles.speedGrid}>
            {PLAYBACK_SPEEDS.map((speed) => {
              const active = Math.abs(playbackRate - speed) < 0.001;
              return (
                <TouchableOpacity
                  key={speed}
                  style={[sheetStyles.speedChip, active && sheetStyles.speedChipActive]}
                  onPress={() => {
                    player.playbackRate = speed;
                    setPlaybackRateState(speed);
                  }}
                >
                  <Text style={[sheetStyles.speedChipText, active && sheetStyles.speedChipTextActive]}>
                    {speed === 1 ? 'Normal' : `${speed}x`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {(renditions?.length ?? 0) > 0 ? (
            <>
              <Text style={[sheetStyles.sheetTitle, { marginTop: 12 }]}>Quality</Text>
              {qualityOptions.map((opt) => (
                <TouchableOpacity key={opt.label} style={sheetStyles.sheetRow} onPress={() => switchQuality(opt.label, opt.url)}>
                  <Text style={sheetStyles.sheetLabel}>{opt.label}</Text>
                  {activeQualityLabel === opt.label ? <Ionicons name="checkmark" size={18} color={COLORS.primary} /> : null}
                </TouchableOpacity>
              ))}
            </>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  containerFullscreenWeb: {
    aspectRatio: undefined,
    width: '100%',
    height: '100%',
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ripple: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: '30%',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  rippleLeft: { left: 0 },
  rippleRight: { right: 0 },
  rippleText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  holdBadge: {
    position: 'absolute',
    top: '42%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  holdBadgeLeft: { left: 24 },
  holdBadgeRight: { right: 24 },
  holdBadgeText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  centerButtonWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 24,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  seekRow: {
    height: 20,
    justifyContent: 'center',
  },
  trackBg: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  trackBuffered: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  trackPlayed: {
    position: 'absolute',
    left: 0,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FF3B30',
  },
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF3B30',
    marginLeft: -6,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  iconBtn: {
    padding: 6,
    marginLeft: 4,
  },
  endedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'stretch',
    paddingHorizontal: 20,
    gap: 12,
  },
  nextVideoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nextThumb: {
    width: 96,
    height: 54,
    borderRadius: 6,
    backgroundColor: '#222',
  },
  nextThumbPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  nextTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  countdownText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    textAlign: 'center',
  },
  endedButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  endedBtnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  endedBtnGhostText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  endedBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
  },
  endedBtnPrimaryText: { color: '#000', fontWeight: '700', fontSize: 13 },
  replayBtn: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 6,
  },
  replayBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
