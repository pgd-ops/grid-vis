import React from 'react';
import { Line, Text, Group } from 'react-konva';
import type { CanvasElement } from '../../../store/canvas.store';
import { formatUnit, type DisplayUnit } from '../../../utils/units';

interface WallShapeProps {
  element: CanvasElement;
  pixelsPerCm: number;
  selected: boolean;
  onClick?: () => void;
  ghost?: boolean;
  defaultUnit?: DisplayUnit;
}

export default function WallShape({ element, pixelsPerCm, selected, onClick, ghost, defaultUnit }: WallShapeProps) {
  const x1 = (element.x1 ?? 0) * pixelsPerCm;
  const y1 = (element.y1 ?? 0) * pixelsPerCm;
  const x2 = (element.x2 ?? 0) * pixelsPerCm;
  const y2 = (element.y2 ?? 0) * pixelsPerCm;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const lengthCm = Math.sqrt(
    Math.pow((element.x2 ?? 0) - (element.x1 ?? 0), 2) +
    Math.pow((element.y2 ?? 0) - (element.y1 ?? 0), 2)
  );
  const unit: DisplayUnit = (element.display_unit as DisplayUnit) ?? defaultUnit ?? 'cm';
  const label = ghost ? '' : formatUnit(lengthCm, unit);
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

  const strokeColor = ghost ? 'rgba(96,165,250,0.6)' : selected ? '#2563eb' : '#374151';
  const strokeWidth = ghost ? 3 : selected ? 5 : 4;

  return (
    <Group
      id={ghost ? undefined : `el-${element.id}`}
      onClick={ghost ? undefined : onClick}
      listening={!ghost}
    >
      <Line
        points={[x1, y1, x2, y2]}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        lineCap="round"
        hitStrokeWidth={12}
      />
      {!ghost && lengthCm > 0 && (
        <Text
          x={midX}
          y={midY - 10}
          text={label}
          fontSize={10}
          fill="#6b7280"
          offsetX={0}
          rotation={angle > 90 || angle < -90 ? angle + 180 : angle}
          listening={false}
        />
      )}
    </Group>
  );
}
