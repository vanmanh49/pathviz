import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useUiStore } from '../store/uiStore';

const STEPS = [
  {
    target: 'grid',
    text: 'Draw walls by dragging on the grid. Drag the start and end markers to move them.',
  },
  {
    target: 'algorithm',
    text: 'Pick an algorithm here. Each one comes with a description and its pseudocode.',
  },
  {
    target: 'playback',
    text: 'Run it, then pause and step forward or backward one operation at a time. Space plays and pauses; the arrow keys step.',
  },
  {
    target: 'sidebar',
    text: 'Follow along here: the highlighted line, the frontier contents and a plain-English note for each step.',
  },
];

const GAP = 12;
const EDGE = 8;

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Where to put a popover of the given size so it sits next to `target` and stays on screen. */
function place(target: Rect | null, width: number, height: number): { left: number; top: number } {
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  if (!target) return { left: (viewWidth - width) / 2, top: (viewHeight - height) / 2 };

  // A tall target with room beside it, such as the sidebar, gets the popover on its left.
  const beside = target.left - GAP - width;
  if (target.height > viewHeight / 2 && beside >= EDGE) {
    return { left: beside, top: Math.max(EDGE, target.top + GAP) };
  }

  let top = target.top + target.height + GAP;
  if (top + height > viewHeight - EDGE) top = target.top - GAP - height;
  if (top < EDGE) top = target.top + GAP;
  const centred = target.left + target.width / 2 - width / 2;
  return {
    left: Math.max(EDGE, Math.min(viewWidth - width - EDGE, centred)),
    top: Math.max(EDGE, Math.min(viewHeight - height - EDGE, top)),
  };
}

function TourSteps() {
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState<Rect | null>(null);
  const [position, setPosition] = useState({ left: EDGE, top: EDGE });
  const popover = useRef<HTMLDivElement>(null);
  const close = () => useUiStore.getState().setTourSeen(true);
  const last = step === STEPS.length - 1;

  useLayoutEffect(() => {
    const measure = () => {
      const element = document.querySelector(`[data-tour="${STEPS[step].target}"]`);
      const rect = element?.getBoundingClientRect() ?? null;
      setTarget(rect);
      const box = popover.current;
      setPosition(place(rect, box?.offsetWidth ?? 320, box?.offsetHeight ?? 160));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [step]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      {target && (
        <div
          aria-hidden
          className="tour-spotlight"
          style={{
            left: target.left - 4,
            top: target.top - 4,
            width: target.width + 8,
            height: target.height + 8,
          }}
        />
      )}
      <motion.div
        key={step}
        ref={popover}
        role="dialog"
        aria-label="Tour"
        className="panel fixed z-50 w-80 max-w-[calc(100vw-16px)] p-4 shadow-xl"
        style={position}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <p className="text-sm">{STEPS[step].text}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className="mr-auto text-xs text-muted tabular-nums">
            {step + 1} of {STEPS.length}
          </span>
          {last ? (
            <button type="button" className="btn btn-primary" autoFocus onClick={close}>
              Done
            </button>
          ) : (
            <>
              <button type="button" className="btn" onClick={close}>
                Skip tour
              </button>
              <button
                type="button"
                className="btn btn-primary"
                autoFocus
                onClick={() => setStep(step + 1)}
              >
                Next
              </button>
            </>
          )}
        </div>
      </motion.div>
    </>
  );
}

/** A short first-visit walkthrough. It reappears only when asked for from the top bar. */
export function Tour() {
  const seen = useUiStore((s) => s.tourSeen);
  return seen ? null : <TourSteps />;
}
