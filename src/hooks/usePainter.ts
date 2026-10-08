import { useEffect, type MutableRefObject } from 'react';
import { DISCOVERED, FRONTIER, VISITED } from '../engine/playback';
import { usePlaybackStore } from '../store/playbackStore';
import type { Pane } from '../store/uiStore';

const NONE = 0;
const PATH = 4;
const NAMES = ['', 'frontier', 'visited', 'current', 'path'];

// Index by cell status: unseen, discovered, frontier, visited.
const CODE_OF_STATUS = [NONE, 1, 1, 2];
CODE_OF_STATUS[DISCOVERED] = 1;
CODE_OF_STATUS[FRONTIER] = 1;
CODE_OF_STATUS[VISITED] = 2;

/**
 * Draws the search state of one pane onto its cell elements. It writes
 * `data-state` straight to the DOM and only on cells whose state changed, so
 * stepping never re-renders the grid through React.
 */
export function usePainter(pane: Pane, cells: MutableRefObject<(HTMLElement | null)[]>): void {
  useEffect(() => {
    let painted = new Uint8Array(0);
    let next = new Uint8Array(0);

    const paint = () => {
      const elements = cells.current;
      if (painted.length !== elements.length) {
        painted = new Uint8Array(elements.length);
        next = new Uint8Array(elements.length);
      }

      const state = usePlaybackStore.getState().runs?.[pane]?.playback.state;
      if (state) {
        for (let i = 0; i < next.length; i++) next[i] = CODE_OF_STATUS[state.status[i]];
        if (state.current >= 0) next[state.current] = 3;
        state.path?.forEach((node) => (next[node] = PATH));
      } else {
        next.fill(NONE);
      }

      for (let i = 0; i < next.length; i++) {
        if (next[i] === painted[i]) continue;
        const element = elements[i];
        if (!element) continue;
        if (next[i] === NONE) delete element.dataset.state;
        else element.dataset.state = NAMES[next[i]];
        if (painted[i] === PATH) element.style.removeProperty('--i');
        painted[i] = next[i];
      }
      // Position along the path drives the staggered trace animation.
      state?.path?.forEach((node, order) =>
        elements[node]?.style.setProperty('--i', String(order)),
      );
    };

    paint();
    return usePlaybackStore.subscribe(paint);
  }, [pane, cells]);
}
