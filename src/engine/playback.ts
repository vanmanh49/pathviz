import type { CellId, FrontierKind, Side, StepEvent } from '../algorithms/types';

export const UNSEEN = 0;
/** Has a tentative distance but is not waiting in the frontier structure. */
export const DISCOVERED = 1;
export const FRONTIER = 2;
export const VISITED = 3;

/** Everything the interface shows about a run at one step. Arrays are indexed by cell id. */
export interface PlaybackState {
  status: Uint8Array;
  dist: Float64Array;
  parent: Int32Array;
  priority: Float64Array;
  h: Float64Array;
  /** Order in which cells entered the frontier. */
  seq: Int32Array;
  side: Uint8Array;
  current: CellId;
  visitedCount: number;
  enqueued: number;
  pass: number;
  path: CellId[] | null;
  result: 'running' | 'found' | 'noPath';
}

export function createState(cellCount: number): PlaybackState {
  return {
    status: new Uint8Array(cellCount),
    dist: new Float64Array(cellCount).fill(Infinity),
    parent: new Int32Array(cellCount).fill(-1),
    priority: new Float64Array(cellCount),
    h: new Float64Array(cellCount),
    seq: new Int32Array(cellCount),
    side: new Uint8Array(cellCount),
    current: -1,
    visitedCount: 0,
    enqueued: 0,
    pass: 0,
    path: null,
    result: 'running',
  };
}

function copyState(target: PlaybackState, source: PlaybackState): void {
  target.status.set(source.status);
  target.dist.set(source.dist);
  target.parent.set(source.parent);
  target.priority.set(source.priority);
  target.h.set(source.h);
  target.seq.set(source.seq);
  target.side.set(source.side);
  target.current = source.current;
  target.visitedCount = source.visitedCount;
  target.enqueued = source.enqueued;
  target.pass = source.pass;
  target.path = source.path;
  target.result = source.result;
}

/** Advances `state` by one event. Constant time; never allocates. */
export function applyEvent(state: PlaybackState, event: StepEvent): void {
  switch (event.type) {
    case 'visit':
      if (state.status[event.node] !== VISITED) {
        state.status[event.node] = VISITED;
        state.visitedCount++;
      }
      state.current = event.node;
      break;
    case 'enqueue':
      if (state.status[event.node] !== VISITED) state.status[event.node] = FRONTIER;
      // A fresh sequence number on every push is what moves a re-pushed cell to the top of a stack.
      state.seq[event.node] = state.enqueued++;
      state.priority[event.node] = event.priority ?? 0;
      state.h[event.node] = event.h ?? 0;
      if (event.side !== undefined) state.side[event.node] = event.side;
      break;
    case 'relax':
      state.dist[event.node] = event.newDist;
      state.parent[event.node] = event.from;
      if (state.status[event.node] === UNSEEN) state.status[event.node] = DISCOVERED;
      if (event.side !== undefined) state.side[event.node] = event.side;
      break;
    case 'skip':
      break;
    case 'pass':
      state.pass = event.n;
      break;
    case 'found':
      state.result = 'found';
      state.current = event.node;
      break;
    case 'path':
      state.path = event.nodes;
      break;
    case 'noPath':
      state.result = 'noPath';
      state.current = -1;
      break;
  }
}

export function checkpointInterval(length: number): number {
  return Math.max(50, Math.ceil(length / 200));
}

/**
 * Replays a list of events to any position. A copy of the state is kept every
 * `interval` events, so a jump restores the nearest earlier copy and re-applies
 * at most `interval` events, whichever direction it goes.
 */
export class Playback {
  readonly events: StepEvent[];
  readonly state: PlaybackState;
  private readonly interval: number;
  private readonly checkpoints: PlaybackState[] = [];
  private position = 0;

  constructor(cellCount: number, events: StepEvent[]) {
    this.events = events;
    this.interval = checkpointInterval(events.length);
    this.state = createState(cellCount);

    const scratch = createState(cellCount);
    const snapshot = () => {
      const copy = createState(cellCount);
      copyState(copy, scratch);
      this.checkpoints.push(copy);
    };
    snapshot();
    events.forEach((event, i) => {
      applyEvent(scratch, event);
      if ((i + 1) % this.interval === 0) snapshot();
    });
  }

  get length(): number {
    return this.events.length;
  }

  /** Number of events applied so far. */
  get index(): number {
    return this.position;
  }

  /** The event that produced the current state; undefined before the first step. */
  get current(): StepEvent | undefined {
    return this.events[this.position - 1];
  }

  seek(index: number): void {
    const target = Math.min(this.length, Math.max(0, Math.round(index)));
    if (target === this.position) return;

    const checkpoint = Math.floor(target / this.interval);
    let from = this.position;
    // Moving forward within reach just continues; anything else restarts from a checkpoint.
    if (target < from || checkpoint * this.interval > from) {
      copyState(this.state, this.checkpoints[checkpoint]);
      from = checkpoint * this.interval;
    }
    for (let i = from; i < target; i++) applyEvent(this.state, this.events[i]);
    this.position = target;
  }
}

export interface FrontierItem {
  node: CellId;
  g: number;
  h: number;
  priority: number;
  side: Side;
}

/** Cells waiting in the frontier, in the order the algorithm will take them out. */
export function frontierItems(
  state: PlaybackState,
  kind: FrontierKind,
  side?: Side,
): FrontierItem[] {
  const items: FrontierItem[] = [];
  if (kind === 'none') return items;

  const { status, seq } = state;
  for (let node = 0; node < status.length; node++) {
    if (status[node] !== FRONTIER) continue;
    if (side !== undefined && state.side[node] !== side) continue;
    items.push({
      node,
      g: state.dist[node],
      h: state.h[node],
      priority: state.priority[node],
      side: state.side[node] as Side,
    });
  }

  if (kind === 'queue') items.sort((a, b) => seq[a.node] - seq[b.node]);
  else if (kind === 'stack') items.sort((a, b) => seq[b.node] - seq[a.node]);
  else items.sort((a, b) => a.priority - b.priority || a.h - b.h || seq[a.node] - seq[b.node]);
  return items;
}
