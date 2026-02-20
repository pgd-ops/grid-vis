import { useCanvasStore, type CanvasElement, type ToolMode } from '../../../store/canvas.store';

function stageToRoom(
  rawX: number, rawY: number,
  stageX: number, stageY: number,
  stageScale: number, pixelsPerCm: number
) {
  return {
    x: (rawX - stageX) / stageScale / pixelsPerCm,
    y: (rawY - stageY) / stageScale / pixelsPerCm,
  };
}

function snapPoint(x: number, y: number, gridCm: number, enabled: boolean) {
  if (!enabled) return { x, y };
  return {
    x: Math.round(x / gridCm) * gridCm,
    y: Math.round(y / gridCm) * gridCm,
  };
}

export class OutletPlaceTool {
  private outletType: 'power_outlet' | 'internet_outlet';

  constructor(outletType: 'power_outlet' | 'internet_outlet') {
    this.outletType = outletType;
  }

  setType(outletType: 'power_outlet' | 'internet_outlet') {
    this.outletType = outletType;
  }

  onMouseMove(rawX: number, rawY: number) {
    const store = useCanvasStore.getState();
    const { stageX, stageY, stageScale, pixelsPerCm, gridSizeCm, snapEnabled, projectId } = store;
    const roomPos = stageToRoom(rawX, rawY, stageX, stageY, stageScale, pixelsPerCm);
    const snapped = snapPoint(roomPos.x, roomPos.y, gridSizeCm, snapEnabled);
    const ghost: CanvasElement = {
      id: 'ghost',
      project_id: projectId ?? 0,
      type: this.outletType,
      label: this.outletType === 'power_outlet' ? 'Power' : 'Network',
      x: snapped.x,
      y: snapped.y,
      rotation: 0,
      scale_x: 1,
      scale_y: 1,
      z_index: 2,
    };
    store.setGhostElement(ghost);
  }

  onClick(rawX: number, rawY: number) {
    const store = useCanvasStore.getState();
    const { stageX, stageY, stageScale, pixelsPerCm, gridSizeCm, snapEnabled, projectId } = store;
    const roomPos = stageToRoom(rawX, rawY, stageX, stageY, stageScale, pixelsPerCm);
    const snapped = snapPoint(roomPos.x, roomPos.y, gridSizeCm, snapEnabled);

    const el: CanvasElement = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      project_id: projectId ?? 0,
      type: this.outletType,
      label: this.outletType === 'power_outlet' ? 'Power' : 'Network',
      x: snapped.x,
      y: snapped.y,
      rotation: 0,
      scale_x: 1,
      scale_y: 1,
      z_index: 2,
    };
    store.addElement(el);
    store.pushHistory();
    store.setGhostElement(null);
  }

  reset() {
    useCanvasStore.getState().setGhostElement(null);
  }
}
