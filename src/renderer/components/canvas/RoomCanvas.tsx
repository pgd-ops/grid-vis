import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage } from 'react-konva';
import type Konva from 'konva';
import { useCanvasStore, type CanvasElement } from '../../store/canvas.store';
import { useLibraryStore } from '../../store/library.store';
import { useProjectStore } from '../../store/project.store';
import GridLayer from './GridLayer';
import WallsLayer from './WallsLayer';
import AnnotationsLayer from './AnnotationsLayer';
import FurnitureLayer from './FurnitureLayer';
import SelectionLayer from './SelectionLayer';
import { WallDrawTool } from './tools/WallDrawTool';
import { DoorPlaceTool } from './tools/DoorPlaceTool';
import { OutletPlaceTool } from './tools/OutletPlaceTool';

interface RoomCanvasProps {
  stageRef: React.RefObject<Konva.Stage | null>;
}

const wallTool = new WallDrawTool();
const doorTool = new DoorPlaceTool();
const powerOutletTool = new OutletPlaceTool('power_outlet');
const internetOutletTool = new OutletPlaceTool('internet_outlet');

export default function RoomCanvas({ stageRef }: RoomCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  const {
    tool, stageX, stageY, stageScale, setViewport,
    setSelectedIds, setGhostWall, setGhostElement,
    pixelsPerCm, addElement, pushHistory, projectId,
    gridSizeCm, snapEnabled,
  } = useCanvasStore();

  const { setDragItem, dragItem } = useLibraryStore();
  const { activeProject } = useProjectStore();

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  // Clean up ghost when tool changes
  useEffect(() => {
    wallTool.reset();
    doorTool.reset();
    powerOutletTool.reset();
    internetOutletTool.reset();
  }, [tool]);

  // Escape key to cancel drawing
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        wallTool.reset();
        doorTool.reset();
        powerOutletTool.reset();
        internetOutletTool.reset();
        setSelectedIds([]);
      }
    }
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [setSelectedIds]);

  // Reset panning state if mouse is released outside the canvas
  useEffect(() => {
    function handleWindowMouseUp() {
      isPanning.current = false;
      lastPointer.current = null;
    }
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => window.removeEventListener('mouseup', handleWindowMouseUp);
  }, []);

  function getPointerPos(stage: Konva.Stage) {
    const pos = stage.getPointerPosition();
    return pos ?? { x: 0, y: 0 };
  }

  function stageToRoom(rawX: number, rawY: number) {
    return {
      x: (rawX - stageX) / stageScale / pixelsPerCm,
      y: (rawY - stageY) / stageScale / pixelsPerCm,
    };
  }

  function snap(x: number, y: number) {
    if (!snapEnabled) return { x, y };
    return {
      x: Math.round(x / gridSizeCm) * gridSizeCm,
      y: Math.round(y / gridSizeCm) * gridSizeCm,
    };
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.08;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition()!;
    const mousePointTo = {
      x: (pointer.x - stageX) / oldScale,
      y: (pointer.y - stageY) / oldScale,
    };

    const direction = e.evt.deltaY < 0 ? 1 : -1;
    const newScale = Math.max(0.1, Math.min(10, direction > 0 ? oldScale * scaleBy : oldScale / scaleBy));

    setViewport(
      pointer.x - mousePointTo.x * newScale,
      pointer.y - mousePointTo.y * newScale,
      newScale
    );
  }

  const isPanning = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  function handleMouseDown(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()!;
    const pos = getPointerPos(stage);

    // Middle mouse = pan
    if (e.evt.button === 1 || tool === 'pan') {
      isPanning.current = true;
      lastPointer.current = pos;
      return;
    }

    // Left click
    if (e.evt.button === 0) {
      if (tool === 'wall') {
        wallTool.onMouseDown(pos.x, pos.y);
        return;
      }
      if (tool === 'select') {
        // Clicked on empty stage area — pan, but not if a library drag is in progress
        if (
          (e.target === stage || e.target === stage.findOne('Layer')) &&
          !useLibraryStore.getState().dragItem
        ) {
          setSelectedIds([]);
          isPanning.current = true;
          lastPointer.current = pos;
        }
      }
    }
  }

  function handleMouseMove(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()!;
    const pos = getPointerPos(stage);

    // Pan (skip if a library item is being dragged)
    if (isPanning.current && lastPointer.current && !useLibraryStore.getState().dragItem) {
      const dx = pos.x - lastPointer.current.x;
      const dy = pos.y - lastPointer.current.y;
      setViewport(stageX + dx, stageY + dy, stageScale);
      lastPointer.current = pos;
      return;
    }

    if (tool === 'wall') wallTool.onMouseMove(pos.x, pos.y);
    if (tool === 'door') doorTool.onMouseMove(pos.x, pos.y);
    if (tool === 'power_outlet') powerOutletTool.onMouseMove(pos.x, pos.y);
    if (tool === 'internet_outlet') internetOutletTool.onMouseMove(pos.x, pos.y);

    // Library drag ghost
    const dragItem = useLibraryStore.getState().dragItem;
    if (dragItem) {
      const roomPos = stageToRoom(pos.x, pos.y);
      const snapped = snap(roomPos.x, roomPos.y);

      let ghost: CanvasElement;
      if (dragItem.type === 'preset' && dragItem.preset) {
        const p = dragItem.preset;
        ghost = {
          id: 'ghost',
          project_id: projectId ?? 0,
          type: 'furniture',
          subtype: p.id,
          label: p.label,
          x: snapped.x,
          y: snapped.y,
          width: p.defaultWidth,
          height: p.defaultHeight,
          rotation: 0,
          scale_x: 1,
          scale_y: 1,
          path_data: p.shape.type === 'path' ? p.shape.data : null,
          z_index: 3,
        };
      } else if (dragItem.type === 'custom' && dragItem.custom) {
        const c = dragItem.custom;
        ghost = {
          id: 'ghost',
          project_id: projectId ?? 0,
          type: 'furniture',
          subtype: `custom:${c.id}`,
          label: c.name,
          x: snapped.x,
          y: snapped.y,
          width: c.width_cm,
          height: c.height_cm,
          rotation: 0,
          scale_x: 1,
          scale_y: 1,
          path_data: c.path_data,
          z_index: 3,
        };
      } else {
        return;
      }
      setGhostElement(ghost);
    }
  }

  function handleMouseUp(e: Konva.KonvaEventObject<MouseEvent>) {
    if (isPanning.current) {
      isPanning.current = false;
      lastPointer.current = null;
      // Still allow library drops even if we were panning
      if (!useLibraryStore.getState().dragItem) return;
    }

    const stage = e.target.getStage()!;
    const pos = getPointerPos(stage);

    // Drop from library
    const dragItem = useLibraryStore.getState().dragItem;
    if (dragItem && e.evt.button === 0) {
      const roomPos = stageToRoom(pos.x, pos.y);
      const snapped = snap(roomPos.x, roomPos.y);

      let el: CanvasElement | null = null;
      if (dragItem.type === 'preset' && dragItem.preset) {
        const p = dragItem.preset;
        el = {
          id: `tmp-${Date.now()}-${Math.random()}`,
          project_id: projectId ?? 0,
          type: 'furniture',
          subtype: p.id,
          label: p.label,
          x: snapped.x,
          y: snapped.y,
          width: p.defaultWidth,
          height: p.defaultHeight,
          rotation: 0,
          scale_x: 1,
          scale_y: 1,
          path_data: p.shape.type === 'path' ? p.shape.data : null,
          z_index: 3,
        };
      } else if (dragItem.type === 'custom' && dragItem.custom) {
        const c = dragItem.custom;
        el = {
          id: `tmp-${Date.now()}-${Math.random()}`,
          project_id: projectId ?? 0,
          type: 'furniture',
          subtype: `custom:${c.id}`,
          label: c.name,
          x: snapped.x,
          y: snapped.y,
          width: c.width_cm,
          height: c.height_cm,
          rotation: 0,
          scale_x: 1,
          scale_y: 1,
          path_data: c.path_data,
          z_index: 3,
        };
      }

      if (el) {
        addElement(el);
        pushHistory();
      }
      setGhostElement(null);
      setDragItem(null);
      return;
    }

    // Place tools
    if (e.evt.button === 0) {
      if (tool === 'door') doorTool.onClick(pos.x, pos.y);
      if (tool === 'power_outlet') powerOutletTool.onClick(pos.x, pos.y);
      if (tool === 'internet_outlet') internetOutletTool.onClick(pos.x, pos.y);
    }
  }

  function handleDblClick(e: Konva.KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage()!;
    const pos = getPointerPos(stage);
    if (tool === 'wall') wallTool.onDoubleClick(pos.x, pos.y);
  }

  return (
    <div ref={containerRef} className="w-full h-full bg-white" style={{ cursor: getCursor(tool, !!dragItem) }}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={stageX}
        y={stageY}
        scaleX={stageScale}
        scaleY={stageScale}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDblClick}
      >
        <GridLayer width={size.width} height={size.height} />
        <WallsLayer />
        <AnnotationsLayer />
        <FurnitureLayer />
        <SelectionLayer />
      </Stage>
    </div>
  );
}

function getCursor(tool: string, isDragging: boolean): string {
  if (isDragging) return 'copy';
  switch (tool) {
    case 'pan': return 'grab';
    case 'wall': return 'crosshair';
    case 'door':
    case 'power_outlet':
    case 'internet_outlet': return 'cell';
    default: return 'default';
  }
}
