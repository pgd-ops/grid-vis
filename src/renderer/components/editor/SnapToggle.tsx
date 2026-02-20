import React from 'react';
import { useCanvasStore } from '../../store/canvas.store';
import { useProjectStore } from '../../store/project.store';
import { formatUnit } from '../../utils/units';
import type { DisplayUnit } from '../../utils/units';

const PRESETS = [5, 10, 20, 25, 50, 100];

export default function SnapToggle() {
  const { snapEnabled, setSnapEnabled, gridSizeCm, setGridSizeCm } = useCanvasStore();
  const { activeProject } = useProjectStore();

  const unit = (activeProject?.default_unit ?? 'cm') as DisplayUnit;
  const isCustom = !PRESETS.includes(gridSizeCm);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setSnapEnabled(!snapEnabled)}
        title="Toggle Snap to Grid"
        className={`px-2 py-1.5 rounded text-xs transition-colors border ${
          snapEnabled
            ? 'bg-green-600 text-white border-green-600'
            : 'bg-gray-100 text-gray-500 border-gray-200'
        }`}
      >
        {snapEnabled ? '⊞ Snap ON' : '⊞ Snap OFF'}
      </button>
      <select
        value={gridSizeCm}
        onChange={(e) => setGridSizeCm(Number(e.target.value))}
        className="bg-white text-gray-700 text-xs rounded px-1 py-1.5 border border-gray-200 focus:outline-none focus:border-blue-500"
        title="Grid Size"
      >
        <option value={5}>5 cm – Fine</option>
        <option value={10}>10 cm</option>
        <option value={20}>20 cm – Standard</option>
        <option value={25}>25 cm</option>
        <option value={50}>50 cm – Coarse</option>
        <option value={100}>100 cm – Large</option>
        {isCustom && (
          <option value={gridSizeCm}>{formatUnit(gridSizeCm, unit)}/cell</option>
        )}
      </select>
    </div>
  );
}
