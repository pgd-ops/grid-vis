import React, { useRef, useState } from 'react';
import { Stage, Layer, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { useLibraryStore } from '../../store/library.store';
import { useProjectStore } from '../../store/project.store';
import UnitInput from '../ui/UnitInput';
import { type DisplayUnit } from '../../utils/units';

interface Props {
  onClose: () => void;
}

interface Vertex {
  x: number;
  y: number;
}

const CANVAS_SIZE = 300;

export default function CustomObjectCreator({ onClose }: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [closed, setClosed] = useState(false);
  const [name, setName] = useState('');
  const [widthCm, setWidthCm] = useState(100);
  const [heightCm, setHeightCm] = useState(80);
  const [unit, setUnit] = useState<DisplayUnit>(() => {
    const proj = useProjectStore.getState().activeProject;
    return (proj?.default_unit as DisplayUnit) ?? 'cm';
  });
  const [saving, setSaving] = useState(false);
  const { addCustomObject } = useLibraryStore();

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (closed) return;
    const stage = e.target.getStage()!;
    const pos = stage.getPointerPosition()!;

    // Close polygon if clicking near first vertex
    if (vertices.length >= 3) {
      const first = vertices[0];
      const dist = Math.sqrt((pos.x - first.x) ** 2 + (pos.y - first.y) ** 2);
      if (dist < 12) {
        setClosed(true);
        return;
      }
    }

    setVertices((prev) => [...prev, { x: pos.x, y: pos.y }]);
  }

  function handleStageDblClick() {
    if (vertices.length >= 3) setClosed(true);
  }

  function buildPathData(): string {
    if (vertices.length < 2) return '';
    const pts = vertices.map((v) => `${v.x} ${v.y}`).join(' L ');
    return `M ${pts} Z`;
  }

  async function handleSave() {
    if (!name.trim() || !closed || vertices.length < 3) return;
    setSaving(true);
    try {
      const pathData = buildPathData();

      // Generate thumbnail
      const stage = stageRef.current;
      let thumbnail: string | null = null;
      if (stage) {
        thumbnail = stage.toDataURL({ pixelRatio: 0.22 }); // ~64px from 300px
      }

      const obj = await window.api.createCustomObject({
        name: name.trim(),
        path_data: pathData,
        width_cm: widthCm,
        height_cm: heightCm,
        thumbnail,
      });

      addCustomObject(obj);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setVertices([]);
    setClosed(false);
  }

  const polyPoints = vertices.flatMap((v) => [v.x, v.y]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-lg shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Create Custom Object</h2>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-2">
            Click to place vertices. Click near the first vertex or double-click to close the shape.
          </p>
          <div className="border border-gray-200 rounded overflow-hidden" style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
            <Stage
              ref={stageRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              style={{ background: '#f9fafb', cursor: closed ? 'default' : 'crosshair' }}
              onClick={handleStageClick}
              onDblClick={handleStageDblClick}
            >
              <Layer>
                {polyPoints.length >= 4 && (
                  <Line
                    points={closed ? polyPoints : polyPoints}
                    closed={closed}
                    fill={closed ? 'rgba(59,130,246,0.25)' : 'transparent'}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                {vertices.map((v, i) => (
                  <Circle
                    key={i}
                    x={v.x}
                    y={v.y}
                    radius={i === 0 && vertices.length >= 3 ? 7 : 4}
                    fill={i === 0 ? '#fbbf24' : '#60a5fa'}
                    stroke={i === 0 ? '#f59e0b' : '#3b82f6'}
                    strokeWidth={1.5}
                  />
                ))}
              </Layer>
            </Stage>
          </div>
          <button
            onClick={reset}
            className="mt-2 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            Reset drawing
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. L-shaped desk"
              className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Width</label>
              <UnitInput
                valueCm={widthCm}
                onChange={(newCm) => setWidthCm(newCm)}
                unit={unit}
                onUnitChange={setUnit}
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Height</label>
              <UnitInput
                valueCm={heightCm}
                onChange={(newCm) => setHeightCm(newCm)}
                unit={unit}
                onUnitChange={setUnit}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!closed || !name.trim() || saving}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
          >
            {saving ? 'Saving…' : 'Save Object'}
          </button>
        </div>
      </div>
    </div>
  );
}
