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

const SUBTYPE_COLORS: Record<string, string> = {
  'desk':      '#3b82f6',
  'standing':  '#06b6d4',
  'chair':     '#8b5cf6',
  'sofa':      '#6d28d9',
  'table':     '#92400e',
  'bookshelf': '#065f46',
  'filing':    '#047857',
  'monitor':   '#374151',
  'tv':        '#1f2937',
  'printer':   '#374151',
  'window':    '#0ea5e9',
  'column':    '#6b7280',
};

function getCategoryColor(subtype?: string | null): string {
  if (!subtype || subtype.startsWith('custom:')) return '#6b7280';
  const prefix = subtype.split('-')[0];
  return SUBTYPE_COLORS[prefix] ?? '#6b7280';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
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

  const categoryColor = getCategoryColor(element.subtype);
  const fillColor = ghost ? 'rgba(96,165,250,0.2)' : hexToRgba(categoryColor, 0.14);
  const strokeColor = ghost ? 'rgba(96,165,250,0.5)' : categoryColor;

  const minDim = Math.min(w, h);
  const fontSize = Math.max(11, Math.min(16, minDim * 0.18));
  const showLabel = !ghost && element.label && (minDim > 24 || selected);

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
      {hasPath ? (() => {
        const isCustom = element.subtype?.startsWith('custom:') ?? false;
        const pathScaleX = isCustom
          ? (element.width ?? 60) * pixelsPerCm * (element.scale_x ?? 1)
          : pixelsPerCm * (element.scale_x ?? 1);
        const pathScaleY = isCustom
          ? (element.height ?? 60) * pixelsPerCm * (element.scale_y ?? 1)
          : pixelsPerCm * (element.scale_y ?? 1);
        const pathOffsetX = isCustom ? 0.5 : (element.width ?? 60) / 2;
        const pathOffsetY = isCustom ? 0.5 : (element.height ?? 60) / 2;
        return (
        <Path
          data={element.path_data!}
          scaleX={pathScaleX}
          scaleY={pathScaleY}
          offsetX={pathOffsetX}
          offsetY={pathOffsetY}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={(selected ? 2 : 1.5) / pathScaleX}
          hitStrokeWidth={6 / pathScaleX}
          shadowColor={categoryColor}
          shadowBlur={8}
          shadowOpacity={0.35}
          shadowEnabled={selected}
        />
        );
      })() : (
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
          shadowColor={categoryColor}
          shadowBlur={8}
          shadowOpacity={0.35}
          shadowEnabled={selected}
        />
      )}
      {showLabel && (
        <Text
          text={element.label}
          fontSize={fontSize}
          fill="#1a1a1a"
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          align="center"
          verticalAlign="middle"
          listening={false}
        />
      )}
    </Group>
  );
}
