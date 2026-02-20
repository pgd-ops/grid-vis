import React from 'react';
import { Layer } from 'react-konva';
import { useCanvasStore } from '../../store/canvas.store';
import DoorShape from './shapes/DoorShape';
import OutletShape from './shapes/OutletShape';

export default function AnnotationsLayer() {
  const { elements, selectedIds, setSelectedIds, ghostElement, pixelsPerCm, updateElement, pushHistory } =
    useCanvasStore();

  const annotations = elements.filter(
    (e) => e.type === 'door' || e.type === 'power_outlet' || e.type === 'internet_outlet'
  );

  return (
    <Layer>
      {annotations.map((el) => {
        const selected = selectedIds.includes(el.id);
        const commonProps = {
          key: el.id,
          element: el,
          pixelsPerCm,
          selected,
          onClick: () => setSelectedIds([el.id]),
          draggable: selected,
          onDragEnd: (x: number, y: number) => {
            updateElement(el.id, { x, y });
          },
        };

        if (el.type === 'door') return <DoorShape {...commonProps} />;
        return <OutletShape {...commonProps} />;
      })}

      {/* Ghost preview */}
      {ghostElement && (ghostElement.type === 'door') && (
        <DoorShape element={ghostElement} pixelsPerCm={pixelsPerCm} selected={false} ghost />
      )}
      {ghostElement &&
        (ghostElement.type === 'power_outlet' || ghostElement.type === 'internet_outlet') && (
          <OutletShape element={ghostElement} pixelsPerCm={pixelsPerCm} selected={false} ghost />
        )}
    </Layer>
  );
}
