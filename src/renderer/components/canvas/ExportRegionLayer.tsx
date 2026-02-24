import React from 'react';
import { Layer, Rect } from 'react-konva';
import { useCanvasStore } from '../../store/canvas.store';

interface ExportRegionLayerProps {
  liveRect: { x: number; y: number; w: number; h: number } | null;
}

export default function ExportRegionLayer({ liveRect }: ExportRegionLayerProps) {
  const { exportRegion, pixelsPerCm } = useCanvasStore();

  const rect = liveRect ?? exportRegion;
  if (!rect) return null;

  const x = rect.x * pixelsPerCm;
  const y = rect.y * pixelsPerCm;
  const w = rect.w * pixelsPerCm;
  const h = rect.h * pixelsPerCm;

  return (
    <Layer name="export-region-layer" listening={false}>
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        stroke="#3b82f6"
        strokeWidth={1.5}
        dash={[8, 4]}
        fill="rgba(59,130,246,0.06)"
      />
    </Layer>
  );
}
