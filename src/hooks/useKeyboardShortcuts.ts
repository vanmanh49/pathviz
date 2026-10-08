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
      // A slider has no use for Space, so it stays a playback key there.
      const takesSpace = Boolean(
        target?.closest('input:not([type="range"]), select, textarea, button, a'),
      );
      const movesFocus = inField || Boolean(target?.closest('[role="grid"]'));
      const playback = usePlaybackStore.getState();

      switch (e.key) {
        case ' ':
          if (takesSpace) return;
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

    // The same goes for a dropdown: once a choice is made with the mouse it lets go of focus.
    // One operated from the keyboard keeps it, so its arrow keys go on working.
    let byPointer = false;
    const onPointerDown = () => {
      byPointer = true;
    };
    const onAnyKey = () => {
      byPointer = false;
    };
    const releaseSelect = (e: Event) => {
      if (byPointer && e.target instanceof HTMLSelectElement) e.target.blur();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keydown', onAnyKey, true);
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('change', releaseSelect);
    window.addEventListener('click', releaseFocus);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keydown', onAnyKey, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('change', releaseSelect);
      window.removeEventListener('click', releaseFocus);
    };
  }, []);
}
