import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoPlayer } from 'expo-video';

// Press-and-hold fast-forward/rewind, shared by every video surface in the
// app (the dedicated long-video player and the short-video swipe feed).
// Held on the right: real accelerated playback — expo-video decodes a
// faster playbackRate smoothly, the same mechanism the speed-picker already
// uses. Held on the left: hardware decoders don't support negative/reverse
// playback rates, so "rewind" is simulated as a small backward seek fired
// on a fast repeating timer — it reads as continuous rewind even though
// each tick is really a jump.
//
// A press only becomes a hold after HOLD_THRESHOLD_MS. Released sooner, it
// was a normal tap — `onQuickTap(x)` fires instead, so each caller keeps
// its own existing tap behavior (single/double-tap-to-seek for the full
// player, single-tap-to-toggle for the feed) completely untouched.
const HOLD_THRESHOLD_MS = 300;
const HOLD_FORWARD_RATE = 2;
const HOLD_REWIND_STEP_SECONDS = 0.5;
const HOLD_REWIND_INTERVAL_MS = 150;

export type HoldZone = 'left' | 'center' | 'right';

export function useHoldToSeek(player: VideoPlayer, overlayWidth: number, onQuickTap: (x: number) => void) {
  const [holdMode, setHoldMode] = useState<'left' | 'right' | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rateBeforeHoldRef = useRef(1);
  const holdActiveRef = useRef(false);

  const zoneForX = useCallback(
    (x: number): HoldZone => {
      const w = overlayWidth || 1;
      return x < w / 3 ? 'left' : x > (w * 2) / 3 ? 'right' : 'center';
    },
    [overlayWidth]
  );

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
      rateBeforeHoldRef.current = player.playbackRate;
      if (zone === 'right') {
        player.playbackRate = HOLD_FORWARD_RATE;
      } else {
        holdIntervalRef.current = setInterval(() => {
          player.seekBy(-HOLD_REWIND_STEP_SECONDS);
        }, HOLD_REWIND_INTERVAL_MS);
      }
    },
    [player]
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
        // Released before the hold threshold fired — a real tap.
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
        onQuickTap(x);
        return;
      }
      if (holdActiveRef.current) {
        // A hold gesture consumes the press — it never also counts as a tap.
        stopHold();
      }
    },
    [onQuickTap, stopHold]
  );

  return { holdMode, zoneForX, handlePressIn, handlePressOut, HOLD_FORWARD_RATE };
}
