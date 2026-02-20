import React, { useEffect, useRef } from 'react';
import { Layer } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '../../store/canvas.store';

interface GridLayerProps {
  width: number;
  height: number;
}

export default function GridLayer({ width, height }: GridLayerProps) {
  const layerRef = useRef<Konva.Layer>(null);
  const { stageX, stageY, stageScale, gridSizeCm, pixelsPerCm } = useCanvasStore();

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.destroyChildren();

    // Grid spacing in canvas-local pixels and screen pixels
    const gridCanvasPx = gridSizeCm * pixelsPerCm;
    const gridScreenPx = gridCanvasPx * stageScale;
    if (gridScreenPx < 4) { layer.batchDraw(); return; }

    // Visible area in canvas-local coordinates
    const visibleLeft   = -stageX / stageScale;
    const visibleTop    = -stageY / stageScale;
    const visibleRight  = (width  - stageX) / stageScale;
    const visibleBottom = (height - stageY) / stageScale;

    // Snap start position to grid
    const startX = Math.floor(visibleLeft  / gridCanvasPx) * gridCanvasPx;
    const startY = Math.floor(visibleTop   / gridCanvasPx) * gridCanvasPx;

    // 1 screen-pixel line width regardless of zoom
    const lw = 1 / stageScale;

    const lines: Konva.Line[] = [];

    // Vertical lines
    for (let x = startX; x <= visibleRight + gridCanvasPx; x += gridCanvasPx) {
      lines.push(new Konva.Line({
        points: [x, visibleTop, x, visibleBottom],
        stroke: 'rgba(0,0,0,0.12)',
        strokeWidth: lw,
        listening: false,
      }));
    }

    // Horizontal lines
    for (let y = startY; y <= visibleBottom + gridCanvasPx; y += gridCanvasPx) {
      lines.push(new Konva.Line({
        points: [visibleLeft, y, visibleRight, y],
        stroke: 'rgba(0,0,0,0.12)',
        strokeWidth: lw,
        listening: false,
      }));
    }

    lines.forEach((l) => layer.add(l));
    layer.batchDraw();
  }, [stageX, stageY, stageScale, gridSizeCm, pixelsPerCm, width, height]);

  return <Layer ref={layerRef} listening={false} />;
}
