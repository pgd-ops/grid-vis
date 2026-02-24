import { create } from 'zustand';
import type { DisplayUnit } from '../utils/units';

export type ToolMode = 'select' | 'pan' | 'wall' | 'door' | 'power_outlet' | 'internet_outlet' | 'export_region';

export interface CanvasElement {
  /** Numeric id once persisted; temp string like 'tmp-<uuid>' before first save */
  id: number | string;
  project_id: number;
  type: 'wall' | 'door' | 'power_outlet' | 'internet_outlet' | 'furniture';
  subtype?: string | null;
  label?: string | null;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  rotation: number;
  scale_x: number;
  scale_y: number;
  // Wall endpoints (cm)
  x1?: number | null;
  y1?: number | null;
  x2?: number | null;
  y2?: number | null;
  // Door
  swing_angle?: number | null;
  swing_dir?: 'left' | 'right' | null;
  // Custom shape
  path_data?: string | null;
  // Display unit (null = inherit project default)
  display_unit?: DisplayUnit | null;
  z_index: number;
}

export interface GhostWall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface CanvasState {
  tool: ToolMode;
  setTool: (tool: ToolMode) => void;

  // Viewport
  stageX: number;
  stageY: number;
  stageScale: number;
  setViewport: (x: number, y: number, scale: number) => void;

  // Grid
  gridSizeCm: number;
  setGridSizeCm: (size: number) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  pixelsPerCm: number;

  // Ghost preview while drawing walls
  ghostWall: GhostWall | null;
  setGhostWall: (ghost: GhostWall | null) => void;

  // Ghost element preview while placing items
  ghostElement: CanvasElement | null;
  setGhostElement: (el: CanvasElement | null) => void;

  // Elements
  elements: CanvasElement[];
  loadedIds: Set<number>;
  addElement: (el: CanvasElement) => void;
  updateElement: (id: number | string, updates: Partial<CanvasElement>) => void;
  removeElement: (id: number | string) => void;
  setElements: (elements: CanvasElement[]) => void;

  // Selection
  selectedIds: (number | string)[];
  setSelectedIds: (ids: (number | string)[]) => void;

  // Undo/redo
  history: CanvasElement[][];
  historyIndex: number;
  initHistory: () => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Export region (in cm, room coordinates)
  exportRegion: { x: number; y: number; w: number; h: number } | null;
  setExportRegion: (r: { x: number; y: number; w: number; h: number }) => void;
  clearExportRegion: () => void;

  // Dirty flag
  dirty: boolean;
  setDirty: (dirty: boolean) => void;

  // Active project
  projectId: number | null;
  setProjectId: (id: number | null) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  tool: 'select',
  setTool: (tool) => set({ tool }),

  stageX: 40,
  stageY: 40,
  stageScale: 1,
  setViewport: (stageX, stageY, stageScale) => set({ stageX, stageY, stageScale }),

  gridSizeCm: 20,
  setGridSizeCm: (gridSizeCm) => set({ gridSizeCm }),
  snapEnabled: true,
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  pixelsPerCm: 4,

  ghostWall: null,
  setGhostWall: (ghostWall) => set({ ghostWall }),

  ghostElement: null,
  setGhostElement: (ghostElement) => set({ ghostElement }),

  elements: [],
  loadedIds: new Set<number>(),
  addElement: (el) => {
    set((s) => ({ elements: [...s.elements, el], dirty: true }));
  },
  updateElement: (id, updates) => {
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      dirty: true,
    }));
  },
  removeElement: (id) => {
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      dirty: true,
    }));
  },
  setElements: (elements) => {
    const loadedIds = new Set<number>(
      elements.map((e) => e.id).filter((id): id is number => typeof id === 'number')
    );
    set({ elements, loadedIds });
  },

  selectedIds: [],
  setSelectedIds: (selectedIds) => set({ selectedIds }),

  history: [],
  historyIndex: -1,
  initHistory: () => {
    const { elements } = get();
    set({ history: [JSON.parse(JSON.stringify(elements))], historyIndex: 0 });
  },
  pushHistory: () => {
    const { elements, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(elements)));
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },
  undo: () => {
    const { historyIndex, history } = get();
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    set({
      elements: JSON.parse(JSON.stringify(history[newIndex])),
      historyIndex: newIndex,
      dirty: true,
    });
  },
  redo: () => {
    const { historyIndex, history } = get();
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    set({
      elements: JSON.parse(JSON.stringify(history[newIndex])),
      historyIndex: newIndex,
      dirty: true,
    });
  },

  exportRegion: null,
  setExportRegion: (exportRegion) => set({ exportRegion }),
  clearExportRegion: () => set({ exportRegion: null }),

  dirty: false,
  setDirty: (dirty) => set({ dirty }),

  projectId: null,
  setProjectId: (projectId) => set({ projectId }),
}));
