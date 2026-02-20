import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjectStore } from '../store/project.store';
import { useCanvasStore, type CanvasElement } from '../store/canvas.store';
import { useLibraryStore } from '../store/library.store';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import Toolbar from '../components/editor/Toolbar';
import PropertiesPanel from '../components/editor/PropertiesPanel';
import RoomCanvas from '../components/canvas/RoomCanvas';
import ObjectLibrary from '../components/library/ObjectLibrary';
import type Konva from 'konva';

type SaveStatus = 'saved' | 'saving' | 'dirty' | 'idle';

function normalizeLegacyPath(pathData: string, thumbSize = 300): string {
  // Extract all numbers from M/L path commands
  const nums = pathData.match(/-?[\d.]+/g);
  if (!nums || nums.length < 4) return pathData;
  const coords: number[] = nums.map(Number);
  // Check if already normalized (all coords 0-1)
  if (coords.every(n => n >= 0 && n <= 1)) return pathData;
  // Pair up as x,y
  const xs: number[] = [], ys: number[] = [];
  for (let i = 0; i < coords.length - 1; i += 2) {
    xs.push(coords[i]);
    ys.push(coords[i + 1]);
  }
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const rangeX = maxX - minX || thumbSize;
  const rangeY = maxY - minY || thumbSize;
  const pts = xs.map((x, i) =>
    `${((x - minX) / rangeX).toFixed(6)} ${((ys[i] - minY) / rangeY).toFixed(6)}`
  ).join(' L ');
  return `M ${pts} Z`;
}

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setActiveProject, activeProject, updateProjectInList } = useProjectStore();
  const { setElements, setProjectId, elements, dirty, setDirty, initHistory } = useCanvasStore();
  const { setCustomObjects } = useLibraryStore();
  const stageRef = useRef<Konva.Stage | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [renamingName, setRenamingName] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const projectId = parseInt(id ?? '0', 10);

  // Load project and elements on mount
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    async function load() {
      const [project, rawElements, customObjects] = await Promise.all([
        window.api.getProject(projectId),
        window.api.getElementsForProject(projectId),
        window.api.getCustomObjects(),
      ]);

      if (cancelled) return;
      if (!project) { navigate('/'); return; }

      setActiveProject(project);
      useCanvasStore.getState().setGridSizeCm(project.grid_size);
      setProjectId(projectId);

      const mapped: CanvasElement[] = rawElements.map((el) => {
        // Hydrate path_data from custom object library if missing (legacy placements)
        let pathData = el.path_data;
        if (!pathData && el.subtype?.startsWith('custom:')) {
          const customId = parseInt(el.subtype.slice('custom:'.length), 10);
          const customDef = customObjects.find((c) => c.id === customId);
          if (customDef) pathData = customDef.path_data;
        }
        return {
          id: el.id,
          project_id: el.project_id,
          type: el.type as CanvasElement['type'],
          subtype: el.subtype,
          label: el.label,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          rotation: el.rotation,
          scale_x: el.scale_x,
          scale_y: el.scale_y,
          x1: el.x1,
          y1: el.y1,
          x2: el.x2,
          y2: el.y2,
          swing_angle: el.swing_angle,
          swing_dir: el.swing_dir as 'left' | 'right' | null,
          path_data: pathData ? normalizeLegacyPath(pathData) : pathData,
          display_unit: (el.display_unit as CanvasElement['display_unit']) ?? null,
          z_index: el.z_index,
        };
      });

      setElements(mapped);
      useCanvasStore.getState().initHistory();
      setCustomObjects(customObjects);
      setDirty(false);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [projectId]);

  // Auto-save with debounce
  const save = useCallback(async (force = false) => {
    if (!dirty && !force) return;
    setSaveStatus('saving');

    try {
      const toSave = elements.filter((el) => typeof el.id === 'number' || typeof el.id === 'string');
      const upsertInputs = toSave.map((el) => ({
        id: typeof el.id === 'number' ? el.id : undefined,
        project_id: el.project_id,
        type: el.type,
        subtype: el.subtype ?? null,
        label: el.label ?? null,
        x: el.x,
        y: el.y,
        width: el.width ?? null,
        height: el.height ?? null,
        rotation: el.rotation,
        scale_x: el.scale_x,
        scale_y: el.scale_y,
        x1: el.x1 ?? null,
        y1: el.y1 ?? null,
        x2: el.x2 ?? null,
        y2: el.y2 ?? null,
        swing_angle: el.swing_angle ?? null,
        swing_dir: el.swing_dir ?? null,
        path_data: el.path_data ?? null,
        display_unit: el.display_unit ?? null,
        z_index: el.z_index,
      }));

      const { loadedIds, elements: currentElements } = useCanvasStore.getState();
      const currentNumericIds = new Set(
        currentElements.map((e) => e.id).filter((id): id is number => typeof id === 'number')
      );
      const idsToDelete = [...loadedIds].filter((id) => !currentNumericIds.has(id));
      await Promise.all(idsToDelete.map((id) => window.api.deleteElement(id)));

      if (upsertInputs.length > 0) {
        const saved = await window.api.upsertElements(upsertInputs);
        // Update element ids for newly created elements
        const { elements: currentEls, setElements: setEls } = useCanvasStore.getState();
        const updatedEls = currentEls.map((el) => {
          if (typeof el.id === 'string') {
            // Find corresponding saved element by position match
            const match = saved.find((s) => {
              if (s.project_id !== el.project_id || s.type !== el.type) return false;
              if (el.type === 'wall') {
                return (
                  s.x1 === (el.x1 ?? null) &&
                  s.y1 === (el.y1 ?? null) &&
                  s.x2 === (el.x2 ?? null) &&
                  s.y2 === (el.y2 ?? null)
                );
              }
              return s.x === el.x && s.y === el.y;
            });
            if (match) return { ...el, id: match.id };
          }
          return el;
        });
        setEls(updatedEls);
      } else if (idsToDelete.length > 0) {
        // No new elements, but we deleted some — update loadedIds to reflect current state
        const { elements: currentEls, setElements: setEls } = useCanvasStore.getState();
        setEls(currentEls);
      }

      setDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);

      // Capture thumbnail (composite onto white background to avoid black JPEG artifacts)
      if (stageRef.current) {
        try {
          const pngUrl = stageRef.current.toDataURL({ pixelRatio: 0.15 });
          const thumbnail = await new Promise<string>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d')!;
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
            img.src = pngUrl;
          });
          const updated = await window.api.updateProject(projectId, { thumbnail });
          updateProjectInList(updated);
          setActiveProject(updated);
        } catch {
          // thumbnail capture is non-critical
        }
      }
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('dirty');
    }
  }, [elements, dirty, setDirty, projectId, updateProjectInList, setActiveProject]);

  // Trigger debounced auto-save when dirty
  useEffect(() => {
    if (!dirty) return;
    setSaveStatus('dirty');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => save(), 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dirty, save]);

  async function handleRenameSubmit() {
    const newName = (renamingName ?? '').trim();
    if (!newName || !activeProject || newName === activeProject.name) {
      setRenamingName(null);
      return;
    }
    const updated = await window.api.updateProject(projectId, { name: newName });
    updateProjectInList(updated);
    setActiveProject(updated);
    setRenamingName(null);
  }

  useKeyboardShortcuts({
    onSave: () => save(true),
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white text-gray-500">
        Loading project…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 bg-gray-50 border-b border-gray-200 flex-shrink-0">
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-gray-900 transition-colors text-sm"
        >
          ← Projects
        </button>
        <div className="h-4 w-px bg-gray-200" />
        {renamingName !== null ? (
          <input
            autoFocus
            value={renamingName}
            onChange={(e) => setRenamingName(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRenameSubmit();
              if (e.key === 'Escape') setRenamingName(null);
            }}
            className="text-sm font-medium text-gray-900 bg-white border border-blue-400 rounded px-2 py-0.5 focus:outline-none w-48"
          />
        ) : (
          <button
            onClick={() => setRenamingName(activeProject?.name ?? '')}
            className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors max-w-48 truncate"
            title="Click to rename"
          >
            {activeProject?.name ?? ''}
          </button>
        )}
        <div className="h-4 w-px bg-gray-200" />
        <Toolbar stageRef={stageRef} />
        <div className="ml-auto flex items-center gap-3">
          {saveStatus === 'saving' && (
            <span className="text-yellow-600 text-xs">Saving…</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-green-600 text-xs">Saved</span>
          )}
          {saveStatus === 'dirty' && (
            <span className="text-gray-500 text-xs">Unsaved</span>
          )}
          <button
            onClick={() => save(true)}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors border border-gray-200"
          >
            Save
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Library panel */}
        <div className="w-56 flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <ObjectLibrary />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <RoomCanvas stageRef={stageRef} />
        </div>

        {/* Properties panel */}
        <div className="w-60 flex-shrink-0 bg-gray-50 border-l border-gray-200 overflow-y-auto">
          <PropertiesPanel onSave={() => save(true)} />
        </div>
      </div>
    </div>
  );
}
