import React from 'react';
import { Group, Circle, Text } from 'react-konva';
import type { CanvasElement } from '../../../store/canvas.store';

interface OutletShapeProps {
  element: CanvasElement;
  pixelsPerCm: number;
  selected: boolean;
  onClick?: () => void;
  ghost?: boolean;
  draggable?: boolean;
  onDragEnd?: (x: number, y: number) => void;
}

export default function OutletShape({
  element,
  pixelsPerCm,
  selected,
  onClick,
  ghost,
  draggable,
  onDragEnd,
}: OutletShapeProps) {
  const isPower = element.type === 'power_outlet';
  const radius = 10;
  const strokeColor = ghost
    ? 'rgba(167,139,250,0.7)'
    : selected
    ? '#60a5fa'
    : isPower
    ? '#d97706'
    : '#059669';

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
              onDragEnd(node.x() / pixelsPerCm, node.y() / pixelsPerCm);
            }
          : undefined
      }
    >
      <Circle
        radius={radius}
        fill={isPower ? 'rgba(217,119,6,0.1)' : 'rgba(5,150,105,0.1)'}
        stroke={strokeColor}
        strokeWidth={selected ? 2.5 : 1.5}
        hitRadius={radius + 4}
      />
      <Text
        text={isPower ? '⚡' : '🌐'}
        fontSize={10}
        offsetX={5}
        offsetY={5}
        listening={false}
      />
      {element.label && (
        <Text
          text={element.label}
          fontSize={8}
          fill="#6b7280"
          offsetX={0}
          y={radius + 2}
          listening={false}
        />
      )}
    </Group>
  );
}
