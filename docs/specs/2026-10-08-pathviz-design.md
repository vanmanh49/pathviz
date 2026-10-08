# PathViz — Design

Date: 2026-10-08 · Status: awaiting review

## 1. Purpose

PathViz teaches shortest-path and graph-search algorithms by letting a learner
watch one run on a grid, pause it, and move one operation at a time in either
direction. At every step the app shows which node is being expanded, what the
frontier holds, how distances changed, and which line of pseudocode is running.

Success means a learner can answer "why did it do that?" for any step, and the
project meets the acceptance criteria in section 17.

## 2. Scope

In scope: grid editor, seven algorithms, five generators, a reversible playback
engine, five explanation panels, compare mode, onboarding tour, light and dark
themes, tests, README.

Out of scope: backend, routing, saving or sharing grids, a canvas renderer, web
workers, internationalisation, negative edge weights, backward stepping through
generator animations.

## 3. Stack

| Concern | Choice |
|---|---|
| UI | React 18, TypeScript strict, no `any` |
| Build | Vite |
| Styling | Tailwind CSS v4 via `@tailwindcss/vite`; colours as CSS variables |
| Animation | CSS keyframes for grid cells, Framer Motion for panels, tour, endpoints |
| State | Zustand |
| Icons | lucide-react |
| Tests | Vitest, React Testing Library, jsdom |
| Quality | ESLint flat config with typescript-eslint and react-hooks, Prettier |

## 4. Domain model

```ts
type CellId = number; // row * cols + col

interface Grid {
  rows: number;
  cols: number;
  walls: Uint8Array;   // 1 = wall
  weights: Uint8Array; // 1–9, 1 = plain cell
}

interface RunOptions {
  diagonal: boolean;
  heuristic: 'manhattan' | 'euclidean' | 'octile' | 'chebyshev';
}
```

Movement rules, implemented once in `algorithms/grid.ts` and used by every
algorithm:

- Neighbours are visited in a fixed order: N, E, S, W, then NE, SE, SW, NW.
  Runs are therefore deterministic.
- Entering a cell costs its weight. A diagonal move costs weight × √2.
- A diagonal move is allowed only when both orthogonal cells beside it are
  open, so paths never cut a wall corner.
- BFS, DFS and bidirectional BFS count every move as 1 and ignore weights.
  Their reported path cost still uses the real cost model, so comparisons
  between algorithms are fair.

Heuristic admissibility, which the UI states next to the heuristic picker:

| Heuristic | 4 directions | 8 directions |
|---|---|---|
| Manhattan | admissible | not admissible; UI warns that A* may be suboptimal |
| Euclidean | admissible | admissible |
| Octile | admissible | admissible, tightest |
| Chebyshev | admissible | admissible |

## 5. Step events

```ts
type Side = 0 | 1; // bidirectional search: 0 = from start, 1 = from end

type StepEvent =
  | { type: 'visit'; node: CellId; line: number; side?: Side }
  | { type: 'enqueue'; node: CellId; priority?: number; h?: number; line: number; side?: Side }
  | { type: 'relax'; node: CellId; from: CellId; oldDist: number; newDist: number; line: number; side?: Side }
  | { type: 'skip'; node: CellId; reason: string; line: number }
  | { type: 'pass'; n: number; line: number }
  | { type: 'found'; node: CellId; line: number }
  | { type: 'path'; nodes: CellId[]; line: number }
  | { type: 'noPath'; line: number };
```

| Event | Effect on playback state |
|---|---|
| `visit` | node leaves the frontier, becomes visited and current; visited count +1 on first visit |
| `enqueue` | node joins the frontier with its priority, `h` and an insertion sequence number |
| `relax` | `dist[node] = newDist`, `parent[node] = from`; an unseen node becomes frontier |
| `skip` | none; exists for narration and pseudocode highlighting |
| `pass` | pass counter = `n` (Bellman-Ford) |
| `found` | result = found, current = node |
| `path` | final path stored |
| `noPath` | result = no path |

## 6. Algorithms

Each algorithm is one file exporting a pure function:

```ts
type Algorithm = (grid: Grid, start: CellId, end: CellId, options: RunOptions) => StepEvent[];
```

It imports nothing from React, the stores or the DOM.

| Algorithm | Frontier | Uses weights | Shortest path | Time | Space |
|---|---|---|---|---|---|
| BFS | queue | no | yes, in steps | O(V + E) | O(V) |
| DFS | stack | no | no | O(V + E) | O(V) |
| Dijkstra | binary heap on g | yes | yes | O((V + E) log V) | O(V) |
| A* | binary heap on f = g + h | yes | yes, if h is admissible | O((V + E) log V) | O(V) |
| Greedy best-first | binary heap on h | no | no | O((V + E) log V) | O(V) |
| Bidirectional BFS | two queues | no | yes, in steps | O(V + E) | O(V) |
| Bellman-Ford | none, edge passes | yes | yes | O(V · E) | O(V) |

Implementation decisions:

- The heap uses lazy deletion. A stale pop emits `skip` with reason "stale entry".
- DFS is iterative with an explicit stack and marks nodes visited on pop.
- Bidirectional BFS alternates whole levels and finishes the level in which the
  searches first meet, then takes the cheapest meeting point. Stopping at the
  first contact would not guarantee the shortest path.
- Bellman-Ford emits a `pass` event per pass and a `relax` only when a distance
  improves. It stops when a pass changes nothing, not when it reaches the end.
- "Optimal" in stats and compare mode is measured, not asserted: the path cost
  is compared with a silent Dijkstra run on the same grid.

Registry: `data/algorithms.ts` exports an array of entries holding id, name,
`run`, description, flags, complexity, frontier kind and pseudocode lines. The
whole UI reads this array, so adding an algorithm is one file in `algorithms/`
plus one entry.

## 7. Playback engine

`engine/playback.ts` is pure TypeScript with no timers.

State is a set of typed arrays sized to the grid plus a few scalars:

```ts
interface PlaybackState {
  status: Uint8Array;     // 0 unseen, 1 frontier, 2 visited
  dist: Float64Array;     // Infinity when unknown
  parent: Int32Array;     // -1 when none
  priority: Float64Array;
  h: Float64Array;
  seq: Int32Array;        // order of insertion into the frontier
  side: Uint8Array;
  current: CellId;        // -1 when none
  visitedCount: number;
  pass: number;
  path: CellId[] | null;
  result: 'running' | 'found' | 'noPath';
}
```

- `applyEvent(state, event)` mutates the state in constant time.
- `index` is the number of events applied, from 0 to `events.length`. The
  current event, used for narration and pseudocode, is `events[index - 1]`.
- When a run is created, every event is applied once and a copy of the state
  is stored every `interval` events, where
  `interval = max(50, ceil(events.length / 200))`. That caps memory at about
  200 checkpoints regardless of run length.
- `seek(i)` restores the nearest checkpoint at or below `i` and replays the
  remaining events. Step back is `seek(index - 1)`; the scrubber and the jump
  buttons are also `seek`.

Seeking costs at most one array copy plus `interval` constant-time updates, so
any jump on a 50 × 25 grid stays far below one frame.

The frontier is not a separate structure. A cell is in the frontier when its
status is 1, and the data-structure panel orders those cells by `seq` (queue),
reverse `seq` (stack) or `priority` (heap). Checkpoints are therefore plain
array copies.

The timer lives outside the engine, in `hooks/usePlaybackLoop.ts`: a
`requestAnimationFrame` loop accumulates elapsed time and advances by whole
events. 1× is 60 events per second; speeds are 0.25, 0.5, 1, 2, 5, 10 and
instant, which seeks straight to the end.

## 8. Rendering

- The grid is a CSS grid of `div` cells, rendered once. `Cell` is memoised and
  subscribes only to its own wall, weight and endpoint flags, so an edit
  re-renders one cell.
- Search state is not React state. After each index change a painter computes
  a visual code per cell (none, frontier, visited, current, path), compares it
  with the last painted code and writes `data-state` only on cells that
  changed. Forward, backward, scrub and instant all use this one path.
- The grid fits its container with container query units, so cells stay square
  at any size with no resize listener.
- Pointer handling is delegated to the grid element with `touch-action: none`.

## 9. Stores

| Store | Holds |
|---|---|
| `gridStore` | rows, cols, walls, weights, start, end, diagonal, generating flag, edit actions |
| `playbackStore` | compare flag, per-pane algorithm and heuristic, runs, shared index, playing, speed |
| `uiStore` | theme, tour seen, edit tool, weight brush, inspected cell; theme and tour flag persist |

Any grid edit discards the current run. Resizing resets walls and weights and
puts the endpoints back at their default positions.

## 10. Editing

- Tools: wall, erase, weight with a 1–9 brush. On-screen buttons select them,
  which is what makes the editor usable on a tablet.
- Shift held erases; W held paints weights. The modifiers override the tool.
- Dragging the start or end cell moves it. It will not land on a wall or on
  the other endpoint.
- Buttons: clear path (discards the current run), clear walls, clear weights,
  reset all.
- Default size is 25 × 50, reduced to 21 × 31 below 1024 px and 21 × 15 below
  640 px. Rows and columns are adjustable.

## 11. Explanation panels

| Panel | Content |
|---|---|
| Algorithm card | description, weighted, shortest path, complexity; DFS and greedy explain why they are not optimal |
| Pseudocode | lines from the registry; highlights `events[index - 1].line` |
| Data structure | top 12 frontier items in pop order with g, h, f where relevant; frontier and visited sizes; two queues for bidirectional; pass number for Bellman-Ford |
| Narration | one sentence per event, built by a pure `narrate(event, context)` function |
| Inspector | g, h, f, distance, parent, weight for the hovered or keyboard-focused cell |
| Stats | nodes visited, path length, path cost, step count, compute time |

## 12. Generators

Each generator is a pure function returning ordered edit events, which the grid
store applies a few per frame:

```ts
type GenEvent =
  | { type: 'fill'; wall: boolean }
  | { type: 'wall'; node: CellId; on: boolean }
  | { type: 'weight'; node: CellId; value: number };
```

Recursive division, randomised DFS, Prim's, random walls, random weights. All
take a seeded random number generator, so tests are deterministic. Start and
end are always left open and connected to the maze. With reduced motion or
instant speed the events are applied in one batch.

## 13. Compare mode

Two panes share one grid and one step index. Each pane has its own algorithm,
run and painter, and stops at its own last event, so the faster algorithm
visibly finishes first. The sidebar gets an A/B switch. When both runs reach
the end a table shows visited nodes, path length, path cost, optimal or not,
step count and compute time.

## 14. Visual design

Layout: top bar, grid in the centre, sidebar on the right, playback bar at the
bottom. Below 1024 px the sidebar moves under the grid.

Dark theme by default with a light toggle. Roles use the Okabe–Ito
colour-blind-safe palette, and no role relies on colour alone:

| Role | Colour | Second cue |
|---|---|---|
| Empty | surface | — |
| Wall | high-contrast neutral | solid fill |
| Weight | orange tint scaled by weight | number |
| Start | bluish green `#009E73` | icon |
| End | vermillion `#D55E00` | icon |
| Frontier | sky blue `#56B4E9` | — |
| Visited | blue `#0072B2` | — |
| Current | reddish purple `#CC79A7` | ring |
| Path | yellow `#F0E442` | inner dot |

Cells pop when visited and the path is traced cell by cell. All motion is
removed under `prefers-reduced-motion`. A legend lists every role. A four-step
tour runs on first visit and can be reopened from the top bar.

## 15. Accessibility and keyboard

- Global: Space play or pause, ← and → step, R pauses and returns to step 0,
  Home and End jump to the first and last step.
- The grid is one tab stop with a roving cursor. Inside it the arrow keys move
  the cursor, Enter toggles a wall, 1–9 sets a weight, S and E place the
  endpoints. Space and R stay global.
- Global arrow shortcuts are ignored while focus is in the grid, a slider, a
  select or a text field.
- Every control has a label; toggles expose `aria-pressed`; the scrubber
  reports "step n of m". Narration is a polite live region while paused and is
  silent while playing.

## 16. Testing

- Every algorithm, table-driven: known cost on fixed grids, no-path handling,
  paths never cross walls and only use legal moves, weights respected,
  diagonal option.
- Properties over seeded random grids, in a plain loop with no extra
  dependency: A* cost equals Dijkstra cost for every admissible heuristic;
  Bellman-Ford equals Dijkstra; BFS equals Dijkstra on unweighted 4-direction
  grids; bidirectional BFS path length equals BFS.
- Engine: forward N then back N returns the initial state; `seek(i)` from any
  position equals applying the first `i` events from scratch.
- Pseudocode: every emitted `line` is a valid line of that algorithm's listing.
- Generators: endpoints open, mazes solvable, same seed gives same output.
- Components: run, step and keyboard shortcuts update the step counter and the
  highlighted pseudocode line.

## 17. Layout, phases, acceptance

```
src/
  algorithms/   types, grid helpers, priority queue, heuristics, one file per algorithm
  generators/   one file per generator
  engine/       playback, narration
  store/        gridStore, playbackStore, uiStore
  components/   Grid, Cell, TopBar, PlaybackBar, sidebar panels, Tour, CompareSummary
  data/         algorithm registry and pseudocode
  hooks/        playback loop, keyboard shortcuts, grid pointer handling
  utils/        seeded RNG, formatting
```

Phases follow the brief's nine-step order. Each phase ends with lint, type
check, tests, build and a check in the browser before the next begins.

Accepted when `npm run dev`, `build`, `test` and `lint` pass with no errors,
every algorithm can be played, paused, stepped both ways and scrubbed, and the
pseudocode highlight matches the grid at every step.

## 18. Deviations from the brief

1. Events identify cells by flat index (`CellId`) instead of `{ row, col }`
   objects. Coordinates are derived for display.
2. The event union gains `pass`, `side`, `h`, a `node` on `found`, and a `line`
   on every event.
3. The hover inspector is a sidebar panel, not a floating tooltip, so it also
   works with keyboard focus.
4. Generator animations play forward only.
5. Grid cells animate with CSS; Framer Motion is used for the surrounding UI.

## 19. Risks

- Bellman-Ford on a large maze can emit tens of thousands of events. The
  adaptive checkpoint interval keeps memory bounded; no event cap is planned.
- jsdom has no layout, so component tests assert behaviour and not geometry.
