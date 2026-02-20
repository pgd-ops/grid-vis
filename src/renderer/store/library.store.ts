import { create } from 'zustand';
import type { PresetDefinition } from '../components/library/PresetObjects';

export interface CustomObjectDef {
  id: number;
  name: string;
  path_data: string;
  width_cm: number;
  height_cm: number;
  thumbnail: string | null;
}

export interface DragItem {
  type: 'preset' | 'custom';
  preset?: PresetDefinition;
  custom?: CustomObjectDef;
}

interface LibraryState {
  customObjects: CustomObjectDef[];
  setCustomObjects: (objects: CustomObjectDef[]) => void;
  addCustomObject: (obj: CustomObjectDef) => void;
  removeCustomObject: (id: number) => void;

  /** Active drag item — set on mousedown on LibraryItem, cleared after drop */
  dragItem: DragItem | null;
  setDragItem: (item: DragItem | null) => void;
}

export const useLibraryStore = create<LibraryState>((set) => ({
  customObjects: [],
  setCustomObjects: (customObjects) => set({ customObjects }),
  addCustomObject: (obj) => set((s) => ({ customObjects: [obj, ...s.customObjects] })),
  removeCustomObject: (id) =>
    set((s) => ({ customObjects: s.customObjects.filter((o) => o.id !== id) })),

  dragItem: null,
  setDragItem: (dragItem) => set({ dragItem }),
}));
