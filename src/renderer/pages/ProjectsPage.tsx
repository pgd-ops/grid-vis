import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore, type Project } from '../store/project.store';
import { ALL_UNITS, UNIT_LABELS, formatUnit, unitToCm, cmToUnit, type DisplayUnit } from '../utils/units';

const GRID_DEFAULTS: Record<DisplayUnit, number> = { cm: 20, m: 0.2, in: 8, ft: 1 };

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { projects, setProjects, addProject, removeProject } = useProjectStore();
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

  async function handleDelete(project: Project, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Delete "${project.name}"? This cannot be undone.`)) return;
    await window.api.deleteProject(project.id);
    removeProject(project.id);
  }

  function openModal() {
    setFormName('');
    setFormGrid(String(GRID_DEFAULTS['cm']));
    setFormUnit('cm');
    setFormGridUnit('cm');
    setShowModal(true);
  }

  function handleUnitChange(newUnit: DisplayUnit) {
    // Convert grid value to new unit
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
                onClick={() => navigate(`/editor/${project.id}`)}
                className="bg-gray-50 hover:bg-white border border-gray-200 hover:border-blue-500 rounded-xl p-5 cursor-pointer transition-all group shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="text-2xl">🏠</div>
                  <button
                    onClick={(e) => handleDelete(project, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-sm transition-all px-2 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
                <h3 className="text-gray-900 font-semibold text-lg truncate">{project.name}</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Grid: {formatUnit(project.grid_size, (project.default_unit as DisplayUnit) ?? 'cm')}/cell
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  {new Date(project.updated_at).toLocaleDateString()}
                </p>
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
