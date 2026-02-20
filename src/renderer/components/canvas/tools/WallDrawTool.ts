import { useCanvasStore, type CanvasElement } from '../../../store/canvas.store';

export interface Point {
  x: number;
  y: number;
}

function snapPoint(x: number, y: number, gridCm: number, enabled: boolean): Point {
  if (!enabled) return { x, y };
  return {
    x: Math.round(x / gridCm) * gridCm,
    y: Math.round(y / gridCm) * gridCm,
  };
}

function stageToRoom(
  clientX: number, clientY: number,
  stageX: number, stageY: number,
  stageScale: number,
  pixelsPerCm: number
): Point {
  return {
    x: (clientX - stageX) / stageScale / pixelsPerCm,
    y: (clientY - stageY) / stageScale / pixelsPerCm,
  };
}

export class WallDrawTool {
  private drawing = false;
  private startPoint: Point | null = null;

  reset() {
    this.drawing = false;
    this.startPoint = null;
    useCanvasStore.getState().setGhostWall(null);
  }

  onMouseDown(rawX: number, rawY: number) {
    const store = useCanvasStore.getState();
    const { stageX, stageY, stageScale, pixelsPerCm, gridSizeCm, snapEnabled } = store;
    const roomPos = stageToRoom(rawX, rawY, stageX, stageY, stageScale, pixelsPerCm);
    const snapped = snapPoint(roomPos.x, roomPos.y, gridSizeCm, snapEnabled);

    if (!this.drawing) {
      this.drawing = true;
      this.startPoint = snapped;
      store.setGhostWall({ x1: snapped.x, y1: snapped.y, x2: snapped.x, y2: snapped.y });
    } else {
      // Commit wall
      this.commitWall(snapped);
      // Continue chaining from this point
      this.startPoint = snapped;
      store.setGhostWall({ x1: snapped.x, y1: snapped.y, x2: snapped.x, y2: snapped.y });
    }
  }

  onMouseMove(rawX: number, rawY: number) {
    if (!this.drawing || !this.startPoint) return;
    const store = useCanvasStore.getState();
    const { stageX, stageY, stageScale, pixelsPerCm, gridSizeCm, snapEnabled } = store;
    const roomPos = stageToRoom(rawX, rawY, stageX, stageY, stageScale, pixelsPerCm);
    const snapped = snapPoint(roomPos.x, roomPos.y, gridSizeCm, snapEnabled);
    store.setGhostWall({
      x1: this.startPoint.x,
      y1: this.startPoint.y,
      x2: snapped.x,
      y2: snapped.y,
    });
  }

  onDoubleClick(rawX: number, rawY: number) {
    const store = useCanvasStore.getState();
    const { stageX, stageY, stageScale, pixelsPerCm, gridSizeCm, snapEnabled } = store;
    const roomPos = stageToRoom(rawX, rawY, stageX, stageY, stageScale, pixelsPerCm);
    const snapped = snapPoint(roomPos.x, roomPos.y, gridSizeCm, snapEnabled);
    if (this.drawing && this.startPoint) {
      // The last single-click already committed a wall; don't add another tiny one.
      // Just finish.
    }
    this.reset();
  }

  onEscape() {
    this.reset();
  }

  private commitWall(endPoint: Point) {
    if (!this.startPoint) return;
    const { x1, y1 } = { x1: this.startPoint.x, y1: this.startPoint.y };
    const { x: x2, y: y2 } = endPoint;

    // Don't add zero-length walls
    if (Math.abs(x2 - x1) < 1 && Math.abs(y2 - y1) < 1) return;

    const store = useCanvasStore.getState();
    const el: CanvasElement = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      project_id: store.projectId ?? 0,
      type: 'wall',
      x: 0,
      y: 0,
      rotation: 0,
      scale_x: 1,
      scale_y: 1,
      x1,
      y1,
      x2,
      y2,
      z_index: 1,
    };
    store.addElement(el);
    store.pushHistory();
  }
}
