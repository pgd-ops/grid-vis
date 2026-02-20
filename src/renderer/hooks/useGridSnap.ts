import { useCanvasStore } from '../store/canvas.store';

export function useGridSnap() {
  const { gridSizeCm, snapEnabled } = useCanvasStore();

  function snapPoint(x: number, y: number): { x: number; y: number } {
    if (!snapEnabled) return { x, y };
    return {
      x: Math.round(x / gridSizeCm) * gridSizeCm,
      y: Math.round(y / gridSizeCm) * gridSizeCm,
    };
  }

  function snapValue(v: number): number {
    if (!snapEnabled) return v;
    return Math.round(v / gridSizeCm) * gridSizeCm;
  }

  return { snapPoint, snapValue };
}
