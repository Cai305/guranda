// Web-only: two-tone beep via WebAudio when movable tokens appear.
export function beep(): void {
  try {
    const ctx = new AudioContext();
    const play = (freq: number, startSec: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, ctx.currentTime + startSec);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startSec + dur);
      osc.start(ctx.currentTime + startSec);
      osc.stop(ctx.currentTime + startSec + dur);
    };
    play(880, 0, 0.08);
    play(1100, 0.1, 0.08);
  } catch {}
}
