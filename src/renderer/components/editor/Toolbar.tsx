import React, { useRef } from 'react';
import type Konva from 'konva';
import { useCanvasStore, type ToolMode } from '../../store/canvas.store';
import { useProjectStore } from '../../store/project.store';
import { useExport } from '../../hooks/useExport';
import SnapToggle from './SnapToggle';

interface ToolbarProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

interface ToolDef {
  mode: ToolMode;
  label: string;
  title: string;
}

const NAV_TOOLS: ToolDef[] = [
  { mode: 'select', label: '↖', title: 'Select (V)' },
  { mode: 'pan', label: '✋', title: 'Pan (H)' },
];

const DRAW_TOOLS: ToolDef[] = [
  { mode: 'wall', label: '▬', title: 'Draw Wall (W)' },
  { mode: 'door', label: '🚪', title: 'Place Door (D)' },
  { mode: 'power_outlet', label: '⚡', title: 'Power Outlet (P)' },
  { mode: 'internet_outlet', label: '🌐', title: 'Network Outlet (N)' },
];

function ToolButton({ t, active, onClick }: { t: ToolDef; active: boolean; onClick: () => void }) {
  return (
    <button
      key={t.mode}
      title={t.title}
      onClick={onClick}
      className={`px-3 py-1.5 rounded text-sm transition-colors border ${
        active
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-200'
      }`}
    >
      {t.label}
    </button>
  );
}

export default function Toolbar({ stageRef }: ToolbarProps) {
  const { tool, setTool, undo, redo, history, historyIndex } = useCanvasStore();
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const { activeProject } = useProjectStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const { exportPng, exportPdf, zoomToFit } = useExport(stageRef);

  function handleZoomToFit() {
    const container = containerRef.current?.closest('.flex-1');
    if (!container) return;
    const { width, height } = container.getBoundingClientRect();
    zoomToFit(width, height);
  }

  return (
    <div className="flex items-center gap-1" ref={containerRef}>
      {NAV_TOOLS.map((t) => (
        <ToolButton key={t.mode} t={t} active={tool === t.mode} onClick={() => setTool(t.mode)} />
      ))}

      <div className="h-4 w-px bg-gray-200 mx-1" />

      {DRAW_TOOLS.map((t) => (
        <ToolButton key={t.mode} t={t} active={tool === t.mode} onClick={() => setTool(t.mode)} />
      ))}

      <div className="h-4 w-px bg-gray-200 mx-1" />
      <button
        title="Undo (⌘Z)"
        onClick={undo}
        disabled={!canUndo}
        className="px-3 py-1.5 rounded text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ↩
      </button>
      <button
        title="Redo (⌘⇧Z)"
        onClick={redo}
        disabled={!canRedo}
        className="px-3 py-1.5 rounded text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        ↪
      </button>

      <div className="h-4 w-px bg-gray-200 mx-1" />
      <SnapToggle />

      <div className="h-4 w-px bg-gray-200 mx-1" />
      <button
        title="Zoom to Fit"
        onClick={handleZoomToFit}
        className="px-3 py-1.5 rounded text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors"
      >
        ⊡ Fit
      </button>

      <div className="h-4 w-px bg-gray-200 mx-1" />
      {activeProject && (
        <>
          <button
            onClick={exportPng}
            className="px-3 py-1.5 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors"
            title="Export PNG"
          >
            PNG
          </button>
          <button
            onClick={exportPdf}
            className="px-3 py-1.5 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 transition-colors"
            title="Export PDF"
          >
            PDF
          </button>
        </>
      )}
    </div>
  );
}
