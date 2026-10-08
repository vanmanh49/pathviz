import { fireEvent, render } from '@testing-library/react';
import { beforeEach, expect, it } from 'vitest';
import { toId } from '../algorithms/grid';
import { useGridStore } from '../store/gridStore';
import { useUiStore } from '../store/uiStore';
import { Grid } from './Grid';

const COLS = 10;

function setup() {
  const { container } = render(<Grid pane={0} />);
  const cell = (id: number) => container.querySelector<HTMLElement>(`[data-cell="${id}"]`)!;
  const kind = (id: number) => cell(id).dataset.kind;
  return { cell, kind };
}

beforeEach(() => {
  useGridStore.getState().resize(10, COLS);
  useUiStore.setState({ tool: 'wall', brush: 5 });
});

it('renders one cell per grid position with the endpoints marked', () => {
  const { kind } = setup();
  const { start, end } = useGridStore.getState();
  expect(document.querySelectorAll('[data-cell]')).toHaveLength(100);
  expect(kind(start)).toBe('start');
  expect(kind(end)).toBe('end');
  expect(kind(0)).toBe('empty');
});

it('draws a wall on pointer down and keeps drawing while dragging', () => {
  const { cell, kind } = setup();
  fireEvent.pointerDown(cell(0));
  fireEvent.pointerMove(cell(1));
  fireEvent.pointerMove(cell(2));
  expect([kind(0), kind(1), kind(2)]).toEqual(['wall', 'wall', 'wall']);
});

it('fills in the cells a fast drag skipped over', () => {
  const { cell, kind } = setup();
  fireEvent.pointerDown(cell(toId(COLS, 0, 0)));
  fireEvent.pointerMove(cell(toId(COLS, 3, 3)));
  expect(kind(toId(COLS, 1, 1))).toBe('wall');
  expect(kind(toId(COLS, 2, 2))).toBe('wall');
});

it('erases with Shift held', () => {
  const { cell, kind } = setup();
  useGridStore.getState().setWall(0, true);
  useGridStore.getState().setWeight(1, 4);
  fireEvent.pointerDown(cell(0), { shiftKey: true });
  fireEvent.pointerMove(cell(1), { shiftKey: true });
  expect([kind(0), kind(1)]).toEqual(['empty', 'empty']);
});

it('paints the brush weight with W held and shows the number', () => {
  const { cell, kind } = setup();
  fireEvent.keyDown(window, { key: 'w' });
  fireEvent.pointerDown(cell(0));
  fireEvent.pointerUp(window);
  fireEvent.keyUp(window, { key: 'w' });
  fireEvent.pointerDown(cell(1));
  expect(kind(0)).toBe('weight');
  expect(cell(0)).toHaveTextContent('5');
  expect(kind(1)).toBe('wall');
});

it('uses the selected tool when no modifier is held', () => {
  const { cell, kind } = setup();
  useGridStore.getState().setWall(0, true);
  useUiStore.setState({ tool: 'erase' });
  fireEvent.pointerDown(cell(0));
  fireEvent.pointerUp(window);
  useUiStore.setState({ tool: 'weight', brush: 3 });
  fireEvent.pointerDown(cell(1));
  expect(kind(0)).toBe('empty');
  expect(cell(1)).toHaveTextContent('3');
});

it('drags the start node to another cell', () => {
  const { cell, kind } = setup();
  const { start } = useGridStore.getState();
  fireEvent.pointerDown(cell(start));
  fireEvent.pointerMove(cell(start + 1));
  expect(kind(start + 1)).toBe('start');
  expect(kind(start)).toBe('empty');
});

it('drags the end node without drawing walls', () => {
  const { cell, kind } = setup();
  const { end } = useGridStore.getState();
  fireEvent.pointerDown(cell(end));
  fireEvent.pointerMove(cell(end - COLS));
  expect(kind(end - COLS)).toBe('end');
  expect(kind(end)).toBe('empty');
});

it('ends a drag when the pointer is released outside the grid', () => {
  const { cell, kind } = setup();
  fireEvent.pointerDown(cell(0));
  fireEvent.pointerUp(document.body);
  fireEvent.pointerMove(cell(1));
  expect(kind(1)).toBe('empty');
});
