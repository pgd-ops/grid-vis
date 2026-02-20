import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Stage, Layer, Line, Circle, Text, Rect } from 'react-konva';
import Konva from 'konva';
import { useLibraryStore } from '../../store/library.store';
import { useProjectStore } from '../../store/project.store';
import UnitInput from '../ui/UnitInput';
import { type DisplayUnit, cmToUnit, unitToCm } from '../../utils/units';

interface Props {
  onClose: () => void;
}

interface Vertex {
  x: number; // canvas px
  y: number;
}

const CANVAS_W = 500;
const CANVAS_H = 400;
const PADDING = 40;
const CLOSE_ZONE_PX = 20;

// ─── grid helpers ────────────────────────────────────────────────────────────

function niceGridInterval(rangeCm: number): number {
  const candidates = [1, 2, 5, 10, 20, 25, 50, 100];
  const target = rangeCm / 8; // aim for ~8 grid lines
  return candidates.find(c => c >= target) ?? 100;
}

// ─── preset shapes (in cm, origin top-left) ─────────────────────────────────

type PresetFn = (w: number, h: number) => Array<{ x: number; y: number }>;

const PRESETS: Record<string, PresetFn> = {
  rect: (w, h) => [
    { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h },
  ],
  lshape: (w, h) => [
    { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h / 2 },
    { x: w / 2, y: h / 2 }, { x: w / 2, y: h }, { x: 0, y: h },
  ],
  tshape: (w, h) => [
    { x: w / 4, y: 0 }, { x: 3 * w / 4, y: 0 }, { x: 3 * w / 4, y: h / 2 },
    { x: w, y: h / 2 }, { x: w, y: h }, { x: 0, y: h },
    { x: 0, y: h / 2 }, { x: w / 4, y: h / 2 },
  ],
  ushape: (w, h) => [
    { x: 0, y: 0 }, { x: w / 3, y: 0 }, { x: w / 3, y: h * 0.65 },
    { x: 2 * w / 3, y: h * 0.65 }, { x: 2 * w / 3, y: 0 },
    { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h },
  ],
};

// ─── component ───────────────────────────────────────────────────────────────

export default function CustomObjectCreator({ onClose }: Props) {
  const stageRef = useRef<Konva.Stage>(null);
  const [vertices, setVertices] = useState<Vertex[]>([]);
  const [closed, setClosed] = useState(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const [name, setName] = useState('');
  const [widthCm, setWidthCm] = useState(100);
  const [heightCm, setHeightCm] = useState(80);
  const [unit, setUnit] = useState<DisplayUnit>(() => {
    const proj = useProjectStore.getState().activeProject;
    return (proj?.default_unit as DisplayUnit) ?? 'cm';
  });
  const [saving, setSaving] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [customGridInterval, setCustomGridInterval] = useState<number | null>(null);
  const { addCustomObject } = useLibraryStore();

  // ── canvas coordinate helpers ───────────────────────────────────────────

  const scale = Math.min(
    (CANVAS_W - PADDING * 2) / widthCm,
    (CANVAS_H - PADDING * 2) / heightCm
  );
  const offsetX = (CANVAS_W - widthCm * scale) / 2;
  const offsetY = (CANVAS_H - heightCm * scale) / 2;

  const cmToPx = useCallback((cm: number, axis: 'x' | 'y') =>
    cm * scale + (axis === 'x' ? offsetX : offsetY), [scale, offsetX, offsetY]);

  const pxToCm = useCallback((px: number, axis: 'x' | 'y') =>
    (px - (axis === 'x' ? offsetX : offsetY)) / scale, [scale, offsetX, offsetY]);

  // grid interval in cm
  const autoGridInterval = niceGridInterval(Math.max(widthCm, heightCm));
  const gridInterval = customGridInterval ?? autoGridInterval;

  // snap a cm value to grid
  const snapCm = (cm: number) => Math.round(cm / gridInterval) * gridInterval;

  // snap a canvas px position → snapped px (via cm round-trip)
  function snapPos(px: number, py: number): { x: number; y: number } {
    const cx = snapCm(Math.max(0, Math.min(widthCm, pxToCm(px, 'x'))));
    const cy = snapCm(Math.max(0, Math.min(heightCm, pxToCm(py, 'y'))));
    return { x: cmToPx(cx, 'x'), y: cmToPx(cy, 'y') };
  }

  // ── near-first-vertex detection ─────────────────────────────────────────

  const nearFirst = (pos: { x: number; y: number }) => {
    if (vertices.length < 3) return false;
    const f = vertices[0];
    return Math.hypot(pos.x - f.x, pos.y - f.y) < CLOSE_ZONE_PX;
  };

  // ── mouse handlers ──────────────────────────────────────────────────────

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const pos = e.target.getStage()!.getPointerPosition()!;
    const shifted = (e.evt as MouseEvent).shiftKey;
    setMousePos(snapEnabled && !shifted ? snapPos(pos.x, pos.y) : pos);
  }

  function handleMouseLeave() {
    setMousePos(null);
  }

  function handleStageClick(e: Konva.KonvaEventObject<MouseEvent>) {
    if (closed) return;
    const pos = e.target.getStage()!.getPointerPosition()!;
    const shifted = (e.evt as MouseEvent).shiftKey;
    const snapped = snapEnabled && !shifted ? snapPos(pos.x, pos.y) : pos;

    if (nearFirst(snapped)) {
      setClosed(true);
      return;
    }
    setVertices(prev => [...prev, snapped]);
  }

  // ── keyboard shortcuts ──────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !closed) {
        e.preventDefault();
        setVertices(prev => prev.slice(0, -1));
      }
      if (e.key === 'Enter' && !closed && vertices.length >= 3) {
        e.preventDefault();
        setClosed(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closed, vertices.length]);

  // ── presets ─────────────────────────────────────────────────────────────

  function applyPreset(key: string) {
    const fn = PRESETS[key];
    if (!fn) return;
    const cmPts = fn(widthCm, heightCm);
    const pxPts = cmPts.map(p => ({ x: cmToPx(p.x, 'x'), y: cmToPx(p.y, 'y') }));
    setVertices(pxPts);
    setClosed(true);
  }

  // ── reset ────────────────────────────────────────────────────────────────

  function doReset() {
    setVertices([]);
    setClosed(false);
    setConfirmReset(false);
  }

  // ── vertex drag ──────────────────────────────────────────────────────────

  function handleVertexDragEnd(i: number, e: Konva.KonvaEventObject<DragEvent>) {
    const node = e.target;
    const rawX = Math.max(0, Math.min(widthCm, pxToCm(node.x(), 'x')));
    const rawY = Math.max(0, Math.min(heightCm, pxToCm(node.y(), 'y')));
    const cx = snapEnabled ? snapCm(rawX) : rawX;
    const cy = snapEnabled ? snapCm(rawY) : rawY;
    const snapped = { x: cmToPx(cx, 'x'), y: cmToPx(cy, 'y') };
    node.position(snapped);
    setVertices(prev => prev.map((v, idx) => idx === i ? snapped : v));
  }

  // ── build normalized path data (0-1) ─────────────────────────────────────

  function buildPathData(): string {
    const xs = vertices.map(v => pxToCm(v.x, 'x'));
    const ys = vertices.map(v => pxToCm(v.y, 'y'));
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const pts = xs
      .map((x, i) => `${((x - minX) / rangeX).toFixed(6)} ${((ys[i] - minY) / rangeY).toFixed(6)}`)
      .join(' L ');
    return `M ${pts} Z`;
  }

  // ── save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim() || !closed || vertices.length < 3) return;
    setSaving(true);
    try {
      const pathData = buildPathData();
      const stage = stageRef.current;
      let thumbnail: string | null = null;
      if (stage) thumbnail = stage.toDataURL({ pixelRatio: 64 / CANVAS_W });

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

  // ── hint text ────────────────────────────────────────────────────────────

  const hint =
    vertices.length === 0
      ? 'Click on the canvas to place your first vertex'
      : vertices.length < 3
      ? `${vertices.length} ${vertices.length === 1 ? 'vertex' : 'vertices'} placed — keep clicking to add more (Ctrl+Z to undo)`
      : !closed
      ? 'Click the yellow dot or press Enter to close the shape'
      : 'Shape complete! Name your object and click Save.';

  // ── grid lines ───────────────────────────────────────────────────────────

  const gridLines: React.ReactNode[] = [];
  for (let x = 0; x <= widthCm; x += gridInterval) {
    const px = cmToPx(x, 'x');
    gridLines.push(
      <Line key={`gx${x}`} points={[px, offsetY, px, offsetY + heightCm * scale]}
        stroke="#e5e7eb" strokeWidth={1} listening={false} />,
      <Text key={`gtx${x}`} x={px - 12} y={offsetY + heightCm * scale + 4}
        text={cmToUnit(x, unit).toFixed(unit === 'm' ? 2 : 1)} fontSize={9} fill="#9ca3af" listening={false} />,
    );
  }
  for (let y = 0; y <= heightCm; y += gridInterval) {
    const py = cmToPx(y, 'y');
    gridLines.push(
      <Line key={`gy${y}`} points={[offsetX, py, offsetX + widthCm * scale, py]}
        stroke="#e5e7eb" strokeWidth={1} listening={false} />,
      <Text key={`gty${y}`} x={offsetX - 30} y={py - 5}
        text={cmToUnit(y, unit).toFixed(unit === 'm' ? 2 : 1)} fontSize={9} fill="#9ca3af" listening={false} />,
    );
  }

  // bounding box border
  gridLines.push(
    <Rect key="bbox"
      x={offsetX} y={offsetY}
      width={widthCm * scale} height={heightCm * scale}
      stroke="#d1d5db" strokeWidth={1} fill="transparent" listening={false} />
  );

  // ── polygon points ───────────────────────────────────────────────────────

  const polyPoints = vertices.flatMap(v => [v.x, v.y]);
  const isNearFirst = mousePos ? nearFirst(mousePos) : false;

  // cursor style
  const cursorStyle = closed ? 'default' : isNearFirst ? 'pointer' : 'crosshair';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-auto py-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6 w-full max-w-2xl shadow-2xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Create Custom Object</h2>

        {/* Step 1: Dimensions */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Step 1 — Set dimensions</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Width</label>
              <UnitInput valueCm={widthCm} onChange={v => { setWidthCm(v); doReset(); }} unit={unit} onUnitChange={setUnit} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Height</label>
              <UnitInput valueCm={heightCm} onChange={v => { setHeightCm(v); doReset(); }} unit={unit} onUnitChange={setUnit} />
            </div>
          </div>
        </div>

        {/* Step 2: Draw */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Step 2 — Draw your shape</p>

          {/* Preset buttons */}
          <div className="flex gap-2 mb-2">
            {Object.keys(PRESETS).map(key => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors capitalize"
              >
                {key === 'lshape' ? 'L-shape' : key === 'tshape' ? 'T-shape' : key === 'ushape' ? 'U-shape' : 'Rectangle'}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={snapEnabled}
                  onChange={e => setSnapEnabled(e.target.checked)}
                  className="cursor-pointer"
                />
                Snap to grid
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-600">
                Grid
                <input
                  type="number"
                  min={0}
                  step={{ cm: 1, m: 0.01, in: 0.25, ft: 0.1 }[unit]}
                  value={cmToUnit(customGridInterval ?? autoGridInterval, unit).toFixed(unit === 'm' ? 2 : 1)}
                  onChange={e => {
                    const v = parseFloat(e.target.value);
                    setCustomGridInterval(isNaN(v) || v <= 0 ? null : unitToCm(v, unit));
                  }}
                  className="w-14 border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-900 focus:outline-none focus:border-blue-400"
                />
                {unit}
              </label>
            </div>
          </div>

          {/* Canvas */}
          <div className="border border-gray-200 rounded overflow-hidden"
            style={{ width: CANVAS_W, height: CANVAS_H }}>
            <Stage
              ref={stageRef}
              width={CANVAS_W}
              height={CANVAS_H}
              style={{ background: '#f9fafb', cursor: cursorStyle }}
              onClick={handleStageClick}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <Layer>
                {/* Grid */}
                {gridLines}

                {/* Filled / outlined polygon */}
                {polyPoints.length >= 4 && (
                  <Line
                    points={polyPoints}
                    closed={closed}
                    fill={closed ? 'rgba(59,130,246,0.18)' : 'transparent'}
                    stroke="#60a5fa"
                    strokeWidth={2}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}

                {/* Rubber-band preview line */}
                {!closed && vertices.length >= 1 && mousePos && (
                  <Line
                    points={[vertices[vertices.length - 1].x, vertices[vertices.length - 1].y, mousePos.x, mousePos.y]}
                    stroke={isNearFirst ? '#22c55e' : '#93c5fd'}
                    strokeWidth={1.5}
                    dash={[6, 4]}
                    listening={false}
                  />
                )}

                {/* Closing edge preview when near first vertex */}
                {!closed && vertices.length >= 3 && mousePos && isNearFirst && (
                  <Line
                    points={[mousePos.x, mousePos.y, vertices[0].x, vertices[0].y]}
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    dash={[6, 4]}
                    listening={false}
                  />
                )}

                {/* Vertices */}
                {vertices.map((v, i) => {
                  const isFirst = i === 0;
                  const highlightFirst = isFirst && vertices.length >= 3 && !closed;
                  const nearFirstNow = isFirst && isNearFirst;
                  return (
                    <Circle
                      key={i}
                      x={v.x}
                      y={v.y}
                      radius={nearFirstNow ? 10 : highlightFirst ? 7 : 4}
                      fill={isFirst ? (nearFirstNow ? '#22c55e' : '#fbbf24') : '#60a5fa'}
                      stroke={isFirst ? (nearFirstNow ? '#16a34a' : '#f59e0b') : '#3b82f6'}
                      strokeWidth={1.5}
                      draggable={true}
                      onDragEnd={(e) => handleVertexDragEnd(i, e)}
                    />
                  );
                })}
              </Layer>
            </Stage>
          </div>

          {/* Controls below canvas */}
          <div className="flex items-center gap-3 mt-2">
            {!closed && vertices.length >= 3 && (
              <button
                onClick={() => setClosed(true)}
                className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded transition-colors"
              >
                Close Shape
              </button>
            )}
            {!closed && vertices.length >= 1 && (
              <button
                onClick={() => setVertices(prev => prev.slice(0, -1))}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded transition-colors"
              >
                Undo Vertex
              </button>
            )}
            {confirmReset ? (
              <span className="flex items-center gap-2 text-xs text-gray-600">
                Reset? This clears all vertices.
                <button onClick={doReset} className="text-red-600 hover:text-red-700 font-medium">Reset</button>
                <button onClick={() => setConfirmReset(false)} className="text-gray-400 hover:text-gray-600">Cancel</button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmReset(true)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
              >
                Reset drawing
              </button>
            )}
          </div>

          {/* Hint */}
          <p className="text-xs text-gray-400 mt-1.5 italic">{hint}</p>
        </div>

        {/* Step 3: Name */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Step 3 — Name your object</p>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. L-shaped desk"
            className="w-full bg-white border border-gray-200 rounded px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!closed || !name.trim() || saving || vertices.length < 3}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg font-medium transition-colors text-sm"
          >
            {saving ? 'Saving…' : 'Save Object'}
          </button>
        </div>
      </div>
    </div>
  );
}
