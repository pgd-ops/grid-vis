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

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setActiveProject } = useProjectStore();
  const { setElements, setProjectId, elements, dirty, setDirty, initHistory } = useCanvasStore();
  const { setCustomObjects } = useLibraryStore();
  const stageRef = useRef<Konva.Stage | null>(null);

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loading, setLoading] = useState(true);
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

      const mapped: CanvasElement[] = rawElements.map((el) => ({
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
        path_data: el.path_data,
        display_unit: (el.display_unit as CanvasElement['display_unit']) ?? null,
        z_index: el.z_index,
      }));

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
      }

      setDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Save failed:', err);
      setSaveStatus('dirty');
    }
  }, [elements, dirty, setDirty]);

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
