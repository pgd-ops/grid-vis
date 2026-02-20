import React, { useRef, useEffect } from 'react';
import { Layer, Transformer, Line, Circle } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '../../store/canvas.store';
import { useGridSnap } from '../../hooks/useGridSnap';

export default function SelectionLayer() {
  const trRef = useRef<Konva.Transformer>(null);
  const { selectedIds, updateElement, pixelsPerCm, elements } = useCanvasStore();
  const { snapPoint } = useGridSnap();

  // Separate walls from other selected elements
  const selectedWalls = elements.filter(
    (e) => selectedIds.includes(e.id) && e.type === 'wall'
  );
  const wallIdSet = new Set(selectedWalls.map((w) => w.id));

  useEffect(() => {
    if (!trRef.current) return;
    const stage = trRef.current.getStage();
    if (!stage) return;

    // Only attach non-wall nodes to the Transformer
    const nodes = selectedIds
      .filter((id) => {
        const el = elements.find((e) => e.id === id);
        return el?.type !== 'wall';
      })
      .map((id) => stage.findOne(`#el-${id}`) as Konva.Node | undefined)
      .filter((n): n is Konva.Node => !!n);

    trRef.current.nodes(nodes);
    trRef.current.getLayer()?.batchDraw();
  }, [selectedIds, elements]);

  return (
    <Layer name="selection-layer">
      <Transformer
        ref={trRef}
        borderStroke="#60a5fa"
        borderStrokeWidth={1.5}
        anchorFill="#60a5fa"
        anchorStroke="#1d4ed8"
        anchorSize={8}
        rotateAnchorOffset={20}
        enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        onTransformEnd={(e) => {
          const node = e.target;
          const id = node.id().replace('el-', '');
          const numId = isNaN(Number(id)) ? id : Number(id);
          updateElement(numId, {
            x: node.x() / pixelsPerCm,
            y: node.y() / pixelsPerCm,
            rotation: node.rotation(),
            scale_x: node.scaleX(),
            scale_y: node.scaleY(),
          });
        }}
        onDragEnd={(e) => {
          const node = e.target;
          const id = node.id().replace('el-', '');
          const numId = isNaN(Number(id)) ? id : Number(id);
          if (wallIdSet.has(numId)) return;
          updateElement(numId, {
            x: node.x() / pixelsPerCm,
            y: node.y() / pixelsPerCm,
          });
        }}
      />

      {selectedWalls.map((wall) => {
        const x1px = (wall.x1 ?? 0) * pixelsPerCm;
        const y1px = (wall.y1 ?? 0) * pixelsPerCm;
        const x2px = (wall.x2 ?? 0) * pixelsPerCm;
        const y2px = (wall.y2 ?? 0) * pixelsPerCm;

        return (
          <React.Fragment key={String(wall.id)}>
            {/* Transparent wide line for body drag */}
            <Line
              points={[x1px, y1px, x2px, y2px]}
              stroke="transparent"
              strokeWidth={20}
              draggable
              onDragEnd={(e) => {
                const dx = e.target.x() / pixelsPerCm;
                const dy = e.target.y() / pixelsPerCm;
                const snapped = snapPoint((wall.x1 ?? 0) + dx, (wall.y1 ?? 0) + dy);
                const actualDx = snapped.x - (wall.x1 ?? 0);
                const actualDy = snapped.y - (wall.y1 ?? 0);
                updateElement(wall.id, {
                  x1: (wall.x1 ?? 0) + actualDx,
                  y1: (wall.y1 ?? 0) + actualDy,
                  x2: (wall.x2 ?? 0) + actualDx,
                  y2: (wall.y2 ?? 0) + actualDy,
                });
                e.target.x(0);
                e.target.y(0);
              }}
            />

            {/* Endpoint 1 handle */}
            <Circle
              x={x1px}
              y={y1px}
              radius={6}
              fill="#60a5fa"
              stroke="#1d4ed8"
              strokeWidth={1.5}
              draggable
              onDragEnd={(e) => {
                const snapped = snapPoint(
                  e.target.x() / pixelsPerCm,
                  e.target.y() / pixelsPerCm
                );
                updateElement(wall.id, { x1: snapped.x, y1: snapped.y });
                e.target.x(snapped.x * pixelsPerCm);
                e.target.y(snapped.y * pixelsPerCm);
              }}
            />

            {/* Endpoint 2 handle */}
            <Circle
              x={x2px}
              y={y2px}
              radius={6}
              fill="#60a5fa"
              stroke="#1d4ed8"
              strokeWidth={1.5}
              draggable
              onDragEnd={(e) => {
                const snapped = snapPoint(
                  e.target.x() / pixelsPerCm,
                  e.target.y() / pixelsPerCm
                );
                updateElement(wall.id, { x2: snapped.x, y2: snapped.y });
                e.target.x(snapped.x * pixelsPerCm);
                e.target.y(snapped.y * pixelsPerCm);
              }}
            />
          </React.Fragment>
        );
      })}
    </Layer>
  );
}
