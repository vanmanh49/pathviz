import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CellId } from '../algorithms/types';

export type Tool = 'wall' | 'erase' | 'weight';
export type Theme = 'dark' | 'light';
export type Pane = 0 | 1;

interface UiState {
  theme: Theme;
  tourSeen: boolean;
  tool: Tool;
  brush: number;
  inspected: { pane: Pane; cell: CellId } | null;
  sidebarPane: Pane;
  setTheme(theme: Theme): void;
  setTourSeen(seen: boolean): void;
  setTool(tool: Tool): void;
  setBrush(brush: number): void;
  setInspected(inspected: UiState['inspected']): void;
  setSidebarPane(pane: Pane): void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      tourSeen: false,
      tool: 'wall',
      brush: 5,
      inspected: null,
      sidebarPane: 0,
      setTheme: (theme) => set({ theme }),
      setTourSeen: (tourSeen) => set({ tourSeen }),
      setTool: (tool) => set({ tool }),
      setBrush: (brush) => set({ brush }),
      setInspected: (inspected) => set({ inspected }),
      setSidebarPane: (sidebarPane) => set({ sidebarPane }),
    }),
    {
      name: 'pathviz-ui',
      partialize: ({ theme, tourSeen }) => ({ theme, tourSeen }),
    },
  ),
);
