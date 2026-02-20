import { create } from 'zustand';

export interface Project {
  id: number;
  name: string;
  width_cm: number;
  height_cm: number;
  grid_size: number;
  default_unit?: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectState {
  projects: Project[];
  activeProject: Project | null;

  setProjects: (projects: Project[]) => void;
  setActiveProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProjectInList: (project: Project) => void;
  removeProject: (id: number) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProject: null,

  setProjects: (projects) => set({ projects }),
  setActiveProject: (activeProject) => set({ activeProject }),
  addProject: (project) => set((s) => ({ projects: [project, ...s.projects] })),
  updateProjectInList: (project) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === project.id ? project : p)),
      activeProject: s.activeProject?.id === project.id ? project : s.activeProject,
    })),
  removeProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      activeProject: s.activeProject?.id === id ? null : s.activeProject,
    })),
}));
