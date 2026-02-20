import React from 'react';
import { Group, Line, Arc } from 'react-konva';
import type { CanvasElement } from '../../../store/canvas.store';

interface DoorShapeProps {
  element: CanvasElement;
  pixelsPerCm: number;
  selected: boolean;
  onClick?: () => void;
  ghost?: boolean;
  draggable?: boolean;
  onDragEnd?: (x: number, y: number) => void;
}

export default function DoorShape({
  element,
  pixelsPerCm,
  selected,
  onClick,
  ghost,
  draggable,
  onDragEnd,
}: DoorShapeProps) {
  const width = (element.width ?? 80) * pixelsPerCm;
  const swingAngle = element.swing_angle ?? 90;
  const isRight = element.swing_dir !== 'left';
  const stroke = ghost ? 'rgba(251,191,36,0.7)' : selected ? '#2563eb' : '#d97706';

  return (
    <Group
      id={ghost ? undefined : `el-${element.id}`}
      x={element.x * pixelsPerCm}
      y={element.y * pixelsPerCm}
      rotation={element.rotation}
      scaleX={element.scale_x * (isRight ? 1 : -1)}
      scaleY={element.scale_y}
      draggable={draggable}
      onClick={ghost ? undefined : onClick}
      listening={!ghost}
      onDragEnd={
        draggable && onDragEnd
          ? (e) => {
              const node = e.target;
              onDragEnd(node.x() / pixelsPerCm, node.y() / pixelsPerCm);
            }
          : undefined
      }
    >
      {/* Door leaf */}
      <Line
        points={[0, 0, width, 0]}
        stroke={stroke}
        strokeWidth={3}
        lineCap="round"
        hitStrokeWidth={10}
      />
      {/* Swing arc */}
      <Arc
        x={0}
        y={0}
        innerRadius={0}
        outerRadius={width}
        angle={swingAngle}
        rotation={0}
        stroke={stroke}
        strokeWidth={1.5}
        dash={[4, 4]}
        fill="rgba(217,119,6,0.08)"
        listening={false}
      />
      {/* Hinge dot */}
      <Line
        points={[0, -4, 0, 4]}
        stroke={stroke}
        strokeWidth={2}
        lineCap="round"
        listening={false}
      />
    </Group>
  );
}
