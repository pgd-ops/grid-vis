import { contextBridge, ipcRenderer } from 'electron';

export interface Project {
  id: number;
  name: string;
  width_cm: number;
  height_cm: number;
  grid_size: number;
  default_unit: string | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

export interface RoomElement {
  id: number;
  project_id: number;
  type: string;
  subtype: string | null;
  label: string | null;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  rotation: number;
  scale_x: number;
  scale_y: number;
  x1: number | null;
  y1: number | null;
  x2: number | null;
  y2: number | null;
  swing_angle: number | null;
  swing_dir: string | null;
  path_data: string | null;
  display_unit: string | null;
  z_index: number;
  created_at: string;
  updated_at: string;
}

export interface ElementUpsertInput {
  id?: number;
  project_id: number;
  type: string;
  subtype?: string | null;
  label?: string | null;
  x: number;
  y: number;
  width?: number | null;
  height?: number | null;
  rotation?: number;
  scale_x?: number;
  scale_y?: number;
  x1?: number | null;
  y1?: number | null;
  x2?: number | null;
  y2?: number | null;
  swing_angle?: number | null;
  swing_dir?: string | null;
  path_data?: string | null;
  display_unit?: string | null;
  z_index?: number;
}

export interface CustomObject {
  id: number;
  name: string;
  path_data: string;
  width_cm: number;
  height_cm: number;
  thumbnail: string | null;
  created_at: string;
}

const api = {
  // Projects
  getProjects: (): Promise<Project[]> => ipcRenderer.invoke('projects:getAll'),
  getProject: (id: number): Promise<Project | undefined> => ipcRenderer.invoke('projects:get', id),
  createProject: (input: { name: string; width_cm?: number; height_cm?: number; grid_size?: number; default_unit?: string | null }): Promise<Project> =>
    ipcRenderer.invoke('projects:create', input),
  updateProject: (id: number, updates: Partial<{ name: string; width_cm: number; height_cm: number; grid_size: number; default_unit: string | null; thumbnail: string | null }>): Promise<Project> =>
    ipcRenderer.invoke('projects:update', id, updates),
  deleteProject: (id: number): Promise<void> => ipcRenderer.invoke('projects:delete', id),
  duplicateProject: (id: number): Promise<Project> => ipcRenderer.invoke('projects:duplicate', id),

  // Elements
  getElementsForProject: (projectId: number): Promise<RoomElement[]> =>
    ipcRenderer.invoke('elements:getForProject', projectId),
  upsertElements: (elements: ElementUpsertInput[]): Promise<RoomElement[]> =>
    ipcRenderer.invoke('elements:upsertMany', elements),
  deleteElement: (id: number): Promise<void> => ipcRenderer.invoke('elements:delete', id),
  deleteElementsForProject: (projectId: number): Promise<void> =>
    ipcRenderer.invoke('elements:deleteForProject', projectId),

  // Custom objects
  getCustomObjects: (): Promise<CustomObject[]> => ipcRenderer.invoke('customObjects:getAll'),
  createCustomObject: (input: { name: string; path_data: string; width_cm: number; height_cm: number; thumbnail?: string | null }): Promise<CustomObject> =>
    ipcRenderer.invoke('customObjects:create', input),
  deleteCustomObject: (id: number): Promise<void> => ipcRenderer.invoke('customObjects:delete', id),

  // Export
  exportPng: (projectId: number, dataUrl: string): Promise<boolean> =>
    ipcRenderer.invoke('export:png', projectId, dataUrl),
  exportPdf: (projectId: number, dataUri: string): Promise<boolean> =>
    ipcRenderer.invoke('export:pdf', projectId, dataUri),
  saveFileDialog: (defaultName: string, ext: string): Promise<string | null> =>
    ipcRenderer.invoke('dialog:saveFile', defaultName, ext),
};

export type GridVisAPI = typeof api;

contextBridge.exposeInMainWorld('api', api);
