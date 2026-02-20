import React from 'react';
import { Group, Rect, Path, Text } from 'react-konva';
import type { CanvasElement } from '../../../store/canvas.store';

interface FurnitureShapeProps {
  element: CanvasElement;
  pixelsPerCm: number;
  selected: boolean;
  onClick?: () => void;
  ghost?: boolean;
  draggable?: boolean;
  onDragEnd?: (x: number, y: number, scaleX: number, scaleY: number) => void;
  onTransformEnd?: (x: number, y: number, scaleX: number, scaleY: number, rotation: number) => void;
}

export default function FurnitureShape({
  element,
  pixelsPerCm,
  selected,
  onClick,
  ghost,
  draggable,
  onDragEnd,
}: FurnitureShapeProps) {
  const w = (element.width ?? 60) * pixelsPerCm * (element.scale_x ?? 1);
  const h = (element.height ?? 60) * pixelsPerCm * (element.scale_y ?? 1);
  const hasPath = !!element.path_data;

  const fillColor = ghost ? 'rgba(96,165,250,0.2)' : 'rgba(37,99,235,0.12)';
  const strokeColor = ghost ? 'rgba(96,165,250,0.5)' : selected ? '#2563eb' : '#2563eb';

  return (
    <Group
      id={ghost ? undefined : `el-${element.id}`}
      x={element.x * pixelsPerCm}
      y={element.y * pixelsPerCm}
      rotation={element.rotation}
      draggable={draggable}
      onClick={ghost ? undefined : onClick}
      listening={!ghost}
      onDragEnd={
        draggable && onDragEnd
          ? (e) => {
              const node = e.target;
              onDragEnd(
                node.x() / pixelsPerCm,
                node.y() / pixelsPerCm,
                element.scale_x,
                element.scale_y
              );
            }
          : undefined
      }
    >
      {hasPath ? (
        <Path
          data={element.path_data!}
          scaleX={pixelsPerCm * (element.scale_x ?? 1)}
          scaleY={pixelsPerCm * (element.scale_y ?? 1)}
          offsetX={(element.width ?? 60) / 2}
          offsetY={(element.height ?? 60) / 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={(selected ? 2 : 1.5) / pixelsPerCm}
          hitStrokeWidth={6 / pixelsPerCm}
        />
      ) : (
        <Rect
          width={w}
          height={h}
          offsetX={w / 2}
          offsetY={h / 2}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={selected ? 2 : 1.5}
          cornerRadius={3}
          hitStrokeWidth={6}
        />
      )}
      {!ghost && element.label && (
        <Text
          text={element.label}
          fontSize={9}
          fill="#1d4ed8"
          offsetX={0}
          offsetY={4}
          align="center"
          width={w}
          x={hasPath ? 0 : -w / 2}
          listening={false}
        />
      )}
    </Group>
  );
}
