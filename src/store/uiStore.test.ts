import { beforeEach, expect, it, vi } from 'vitest';

const KEY = 'pathviz-ui';

async function freshStore() {
  vi.resetModules();
  return (await import('./uiStore')).useUiStore;
}

beforeEach(() => {
  localStorage.clear();
});

it('starts dark with the tour unseen', async () => {
  const store = await freshStore();
  expect(store.getState().theme).toBe('dark');
  expect(store.getState().tourSeen).toBe(false);
});

it('falls back to defaults when stored settings are corrupt', async () => {
  localStorage.setItem(KEY, '{not json');
  const store = await freshStore();
  expect(store.getState().theme).toBe('dark');
  expect(store.getState().tourSeen).toBe(false);
});

it('restores a saved theme and tour flag', async () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ state: { theme: 'light', tourSeen: true }, version: 0 }),
  );
  const store = await freshStore();
  expect(store.getState().theme).toBe('light');
  expect(store.getState().tourSeen).toBe(true);
});

it('persists only the theme and the tour flag', async () => {
  const store = await freshStore();
  store.getState().setTool('erase');
  store.getState().setBrush(7);
  store.getState().setTheme('light');
  const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { state: unknown };
  expect(saved.state).toEqual({ theme: 'light', tourSeen: false });
});

it('ignores stored values of the wrong kind', async () => {
  localStorage.setItem(
    KEY,
    JSON.stringify({ state: { theme: 'blue', tourSeen: 'no' }, version: 0 }),
  );
  const store = await freshStore();
  expect(store.getState().theme).toBe('dark');
  expect(store.getState().tourSeen).toBe(false);
});
