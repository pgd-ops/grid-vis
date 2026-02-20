import React from 'react';
import { Layer } from 'react-konva';
import { useCanvasStore } from '../../store/canvas.store';
import FurnitureShape from './shapes/FurnitureShape';

export default function FurnitureLayer() {
  const { elements, selectedIds, setSelectedIds, ghostElement, pixelsPerCm, updateElement } =
    useCanvasStore();

  const furniture = elements.filter((e) => e.type === 'furniture');

  return (
    <Layer>
      {furniture.map((el) => {
        const selected = selectedIds.includes(el.id);
        return (
          <FurnitureShape
            key={el.id}
            element={el}
            pixelsPerCm={pixelsPerCm}
            selected={selected}
            onClick={() => setSelectedIds([el.id])}
            draggable={selected}
            onDragEnd={(x, y) => updateElement(el.id, { x, y })}
          />
        );
      })}

      {/* Ghost preview (drag from library) */}
      {ghostElement && ghostElement.type === 'furniture' && (
        <FurnitureShape
          element={ghostElement}
          pixelsPerCm={pixelsPerCm}
          selected={false}
          ghost
        />
      )}
    </Layer>
  );
}
