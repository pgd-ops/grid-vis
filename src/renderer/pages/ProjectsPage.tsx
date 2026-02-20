import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore, type Project } from '../store/project.store';
import { ALL_UNITS, UNIT_LABELS, formatUnit, unitToCm, cmToUnit, type DisplayUnit } from '../utils/units';

const GRID_DEFAULTS: Record<DisplayUnit, number> = { cm: 20, m: 0.2, in: 8, ft: 1 };

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Modified today';
  if (diffDays === 1) return 'Modified yesterday';
  if (diffDays < 7) return `Modified ${diffDays} days ago`;
  return `Modified ${date.toLocaleDateString()}`;
}

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, setProjects, addProject, removeProject, updateProjectInList } = useProjectStore();
  const [duplicating, setDuplicating] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renamingValue, setRenamingValue] = useState('');
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showModal, setShowModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formGrid, setFormGrid] = useState('20');
  const [formUnit, setFormUnit] = useState<DisplayUnit>('cm');
  const [formGridUnit, setFormGridUnit] = useState<DisplayUnit>('cm');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    window.api.getProjects().then((list) => {
      setProjects(list);
      setLoading(false);
    });
  }, [setProjects]);

  // Close menu when clicking outside
  useEffect(() => {
    if (openMenuId === null) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setCreating(true);
    try {
      const project = await window.api.createProject({
        name: formName.trim(),
        width_cm: 0,
        height_cm: 0,
        grid_size: unitToCm(parseFloat(formGrid) || GRID_DEFAULTS[formGridUnit], formGridUnit),
        default_unit: formUnit,
      });
      addProject(project);
      setShowModal(false);
      setFormName('');
      navigate(`/editor/${project.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDuplicate(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenMenuId(null);
    setDuplicating(project.id);
    try {
      const copy = await window.api.duplicateProject(project.id);
      addProject(copy);
    } finally {
      setDuplicating(null);
    }
  }

  async function handleDelete(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await window.api.deleteProject(project.id);
    removeProject(project.id);
  }

  function startRename(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    setOpenMenuId(null);
    setRenamingId(project.id);
    setRenamingValue(project.name);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }

  async function commitRename() {
    const newName = renamingValue.trim();
    if (newName && renamingId !== null) {
      const updated = await window.api.updateProject(renamingId, { name: newName });
      updateProjectInList(updated);
    }
    setRenamingId(null);
  }

  function openModal() {
    setFormName('');
    setFormGrid(String(GRID_DEFAULTS['cm']));
    setFormUnit('cm');
    setFormGridUnit('cm');
    setShowModal(true);
  }

  function handleUnitChange(newUnit: DisplayUnit) {
    const currentCm = unitToCm(parseFloat(formGrid) || GRID_DEFAULTS[formGridUnit], formGridUnit);
    const newGridVal = cmToUnit(currentCm, newUnit);
    setFormUnit(newUnit);
    setFormGridUnit(newUnit);
    setFormGrid(String(parseFloat(newGridVal.toFixed(4))));
  }

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Grid Vis</h1>
            <p className="text-gray-500 mt-1">Room Layout Planner</p>
          </div>
          <button
            onClick={openModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
          >
            + New Project
          </button>
        </div>

        {/* Project grid */}
        {loading ? (
          <div className="text-gray-500 text-center py-16">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📐</div>
            <p className="text-gray-500 text-lg mb-4">No projects yet</p>
            <button
              onClick={openModal}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              Create your first layout
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                onClick={() => renamingId !== project.id && openMenuId !== project.id && navigate(`/editor/${project.id}`)}
                className="bg-gray-50 hover:bg-white border border-gray-200 hover:border-blue-500 rounded-xl overflow-hidden cursor-pointer transition-all shadow-sm hover:shadow-md"
              >
                {/* Thumbnail area */}
                <div className="h-36 bg-gray-100 flex items-center justify-center overflow-hidden border-b border-gray-200">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-contain"
                      draggable={false}
                    />
                  ) : (
                    <div className="text-4xl text-gray-300">📐</div>
                  )}
                </div>

                {/* Info area */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    {renamingId === project.id ? (
                      <input
                        ref={renameInputRef}
                        value={renamingValue}
                        onChange={(e) => setRenamingValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setRenamingId(null);
                          e.stopPropagation();
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-gray-900 font-semibold text-base bg-white border border-blue-400 rounded px-2 py-0.5 focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <h3
                        className="text-gray-900 font-semibold text-base leading-snug flex-1 line-clamp-2"
                        title={project.name}
                      >
                        {project.name}
                      </h3>
                    )}

                    {/* Kebab menu */}
                    <div className="relative flex-shrink-0" ref={openMenuId === project.id ? menuRef : undefined}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === project.id ? null : project.id);
                        }}
                        className="text-gray-400 hover:text-gray-700 w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 transition-colors text-lg leading-none"
                        title="More actions"
                        aria-label="More actions"
                      >
                        ···
                      </button>
                      {openMenuId === project.id && (
                        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                          <button
                            onClick={(e) => startRename(project, e)}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Rename
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(project, e)}
                            disabled={duplicating === project.id}
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                          >
                            {duplicating === project.id ? 'Copying…' : 'Duplicate'}
                          </button>
                          <div className="my-1 border-t border-gray-100" />
                          <button
                            onClick={(e) => handleDelete(project, e)}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-400">
                    Grid: {formatUnit(project.grid_size, (project.default_unit as DisplayUnit) ?? 'cm')}/cell
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatRelativeDate(project.updated_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-5">New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Office Layout"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grid Cell Size</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formGrid}
                    onChange={(e) => setFormGrid(e.target.value)}
                    min="0.1"
                    step="any"
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={formGridUnit}
                    onChange={(e) => {
                      const newGridUnit = e.target.value as DisplayUnit;
                      const currentCm = unitToCm(parseFloat(formGrid) || GRID_DEFAULTS[formGridUnit], formGridUnit);
                      const newVal = cmToUnit(currentCm, newGridUnit);
                      setFormGridUnit(newGridUnit);
                      setFormGrid(String(parseFloat(newVal.toFixed(4))));
                    }}
                    className="bg-white border border-gray-200 rounded-lg px-2 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
                  >
                    {ALL_UNITS.map((u) => (
                      <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Unit</label>
                <select
                  value={formUnit}
                  onChange={(e) => handleUnitChange(e.target.value as DisplayUnit)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:border-blue-500"
                >
                  {ALL_UNITS.map((u) => (
                    <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {creating ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
