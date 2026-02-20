import React from 'react';
import { useCanvasStore } from '../../store/canvas.store';
import { useProjectStore } from '../../store/project.store';
import UnitInput from '../ui/UnitInput';
import { formatUnit, type DisplayUnit } from '../../utils/units';

interface Props {
  onSave: () => void;
}

export default function PropertiesPanel({ onSave }: Props) {
  const { selectedIds, elements, updateElement, removeElement, setSelectedIds, pushHistory } =
    useCanvasStore();
  const { activeProject } = useProjectStore();

  const selected = selectedIds.length === 1
    ? elements.find((e) => e.id === selectedIds[0])
    : null;

  function handleDelete() {
    selectedIds.forEach((id) => removeElement(id));
    setSelectedIds([]);
    pushHistory();
  }

  if (!selected) {
    const projUnit = (activeProject?.default_unit as DisplayUnit) ?? 'cm';
    return (
      <div className="p-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Properties</h3>
        {activeProject && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Grid Size</label>
              <p className="text-sm text-gray-700">{formatUnit(activeProject.grid_size, projUnit)}</p>
            </div>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-6">Select an element to edit its properties</p>
      </div>
    );
  }

  const elementUnit: DisplayUnit =
    (selected.display_unit as DisplayUnit) ??
    (activeProject?.default_unit as DisplayUnit) ??
    'cm';

  function handleUnitChange(u: DisplayUnit) {
    updateElement(selected!.id, { display_unit: u });
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {selected.type.replace('_', ' ')}
      </h3>

      {/* Label */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">Label</label>
        <input
          type="text"
          value={selected.label ?? ''}
          onChange={(e) => updateElement(selected.id, { label: e.target.value })}
          className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
          placeholder="Label…"
        />
      </div>

      {/* Position */}
      {selected.type !== 'wall' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">X</label>
            <UnitInput
              valueCm={selected.x}
              onChange={(newCm) => updateElement(selected.id, { x: newCm })}
              unit={elementUnit}
              onUnitChange={handleUnitChange}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Y</label>
            <UnitInput
              valueCm={selected.y}
              onChange={(newCm) => updateElement(selected.id, { y: newCm })}
              unit={elementUnit}
              onUnitChange={handleUnitChange}
            />
          </div>
        </div>
      )}

      {/* Wall endpoints */}
      {selected.type === 'wall' && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">X1</label>
              <UnitInput
                valueCm={selected.x1 ?? 0}
                onChange={(newCm) => updateElement(selected.id, { x1: newCm })}
                unit={elementUnit}
                onUnitChange={handleUnitChange}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Y1</label>
              <UnitInput
                valueCm={selected.y1 ?? 0}
                onChange={(newCm) => updateElement(selected.id, { y1: newCm })}
                unit={elementUnit}
                onUnitChange={handleUnitChange}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">X2</label>
              <UnitInput
                valueCm={selected.x2 ?? 0}
                onChange={(newCm) => updateElement(selected.id, { x2: newCm })}
                unit={elementUnit}
                onUnitChange={handleUnitChange}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Y2</label>
              <UnitInput
                valueCm={selected.y2 ?? 0}
                onChange={(newCm) => updateElement(selected.id, { y2: newCm })}
                unit={elementUnit}
                onUnitChange={handleUnitChange}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Length</label>
            <UnitInput
              valueCm={Math.sqrt(
                Math.pow((selected.x2 ?? 0) - (selected.x1 ?? 0), 2) +
                Math.pow((selected.y2 ?? 0) - (selected.y1 ?? 0), 2)
              )}
              onChange={(newLengthCm) => {
                if (newLengthCm <= 0) return;
                const dx = (selected.x2 ?? 0) - (selected.x1 ?? 0);
                const dy = (selected.y2 ?? 0) - (selected.y1 ?? 0);
                const cur = Math.sqrt(dx * dx + dy * dy);
                const ux = cur > 0 ? dx / cur : 1;
                const uy = cur > 0 ? dy / cur : 0;
                updateElement(selected.id, {
                  x2: (selected.x1 ?? 0) + ux * newLengthCm,
                  y2: (selected.y1 ?? 0) + uy * newLengthCm,
                });
              }}
              unit={elementUnit}
              onUnitChange={handleUnitChange}
            />
          </div>
        </>
      )}

      {/* Size */}
      {selected.type === 'furniture' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Width</label>
            <UnitInput
              valueCm={(selected.width ?? 0) * (selected.scale_x ?? 1)}
              onChange={(newCm) => updateElement(selected.id, {
                scale_x: newCm / (selected.width ?? 1),
              })}
              unit={elementUnit}
              onUnitChange={handleUnitChange}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Height</label>
            <UnitInput
              valueCm={(selected.height ?? 0) * (selected.scale_y ?? 1)}
              onChange={(newCm) => updateElement(selected.id, {
                scale_y: newCm / (selected.height ?? 1),
              })}
              unit={elementUnit}
              onUnitChange={handleUnitChange}
            />
          </div>
        </div>
      )}

      {/* Rotation */}
      {selected.type !== 'wall' && selected.type !== 'power_outlet' && selected.type !== 'internet_outlet' && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">Rotation (°)</label>
          <input
            type="number"
            value={Math.round(selected.rotation)}
            step="15"
            onChange={(e) => updateElement(selected.id, { rotation: Number(e.target.value) })}
            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
          />
        </div>
      )}

      {/* Door controls */}
      {selected.type === 'door' && (
        <>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Swing Angle (°)</label>
            <input
              type="number"
              value={selected.swing_angle ?? 90}
              min="30"
              max="180"
              step="15"
              onChange={(e) => updateElement(selected.id, { swing_angle: Number(e.target.value) })}
              className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Swing Direction</label>
            <select
              value={selected.swing_dir ?? 'right'}
              onChange={(e) => updateElement(selected.id, { swing_dir: e.target.value as 'left' | 'right' })}
              className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 focus:outline-none focus:border-blue-500"
            >
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </div>
        </>
      )}

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="w-full mt-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm rounded transition-colors border border-red-200"
      >
        Delete Element
      </button>
    </div>
  );
}
