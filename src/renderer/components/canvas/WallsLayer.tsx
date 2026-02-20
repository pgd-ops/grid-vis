import React from 'react';
import { Layer } from 'react-konva';
import { useCanvasStore } from '../../store/canvas.store';
import { useProjectStore } from '../../store/project.store';
import WallShape from './shapes/WallShape';
import type { DisplayUnit } from '../../utils/units';

export default function WallsLayer() {
  const { elements, selectedIds, setSelectedIds, ghostWall, pixelsPerCm } = useCanvasStore();
  const { activeProject } = useProjectStore();
  const defaultUnit = (activeProject?.default_unit as DisplayUnit) ?? 'cm';
  const walls = elements.filter((e) => e.type === 'wall');

  return (
    <Layer>
      {walls.map((wall) => (
        <WallShape
          key={wall.id}
          element={wall}
          pixelsPerCm={pixelsPerCm}
          selected={selectedIds.includes(wall.id)}
          onClick={() => setSelectedIds([wall.id])}
          defaultUnit={defaultUnit}
        />
      ))}
      {ghostWall && (
        <WallShape
          element={{
            id: 'ghost',
            project_id: 0,
            type: 'wall',
            x: 0, y: 0,
            rotation: 0, scale_x: 1, scale_y: 1,
            x1: ghostWall.x1, y1: ghostWall.y1,
            x2: ghostWall.x2, y2: ghostWall.y2,
            z_index: 0,
          }}
          pixelsPerCm={pixelsPerCm}
          selected={false}
          ghost
        />
      )}
    </Layer>
  );
}
