import { useEffect } from 'react';
import { usePlaybackStore } from '../store/playbackStore';

/**
 * Global playback shortcuts: Space plays or pauses, the arrow keys step, R
 * returns to the first step, Home and End jump. A key is left alone whenever
 * the focused control has its own use for it.
 */
export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof Element ? e.target : null;
      const inField = Boolean(target?.closest('input, select, textarea'));
      const movesFocus = inField || Boolean(target?.closest('[role="grid"]'));
      const playback = usePlaybackStore.getState();

      switch (e.key) {
        case ' ':
          if (inField || target?.closest('button, a')) return;
          playback.toggle();
          break;
        case 'ArrowLeft':
        case 'ArrowRight':
          if (movesFocus) return;
          playback.pause();
          playback.step(e.key === 'ArrowLeft' ? -1 : 1);
          break;
        case 'Home':
        case 'End':
          if (movesFocus) return;
          playback.pause();
          playback.seek(e.key === 'Home' ? 0 : playback.length);
          break;
        case 'r':
        case 'R':
          if (target?.closest('input:not([type="range"]), select, textarea')) return;
          playback.pause();
          playback.seek(0);
          break;
        default:
          return;
      }
      e.preventDefault();
    };

    // A button clicked with the mouse would keep focus and take the next Space for itself.
    // `detail` is 0 when the click came from the keyboard, and that focus is left alone.
    const releaseFocus = (e: MouseEvent) => {
      if (e.detail > 0 && e.target instanceof Element) e.target.closest('button')?.blur();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('click', releaseFocus);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('click', releaseFocus);
    };
  }, []);
}
