import { useEffect } from 'react';
import { BASE_EVENTS_PER_SECOND, usePlaybackStore } from '../store/playbackStore';

// A frame longer than this (a background tab, a debugger pause) advances no further than this.
const MAX_FRAME_MS = 100;

/** Advances playback on animation frames while it is playing. */
export function usePlaybackLoop(): void {
  const playing = usePlaybackStore((s) => s.playing);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let last: number | null = null;
    let carry = 0;

    const tick = (now: number) => {
      const { speed, step } = usePlaybackStore.getState();
      if (last !== null) {
        carry += (Math.min(now - last, MAX_FRAME_MS) / 1000) * BASE_EVENTS_PER_SECOND * speed;
      }
      last = now;
      const whole = Math.floor(carry);
      if (whole > 0) {
        carry -= whole;
        step(whole);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);
}
