import type React from 'react';
import type Konva from 'konva';
import { useCanvasStore } from '../store/canvas.store';
import { useProjectStore } from '../store/project.store';

export function useExport(stageRef: React.RefObject<Konva.Stage | null>) {
  const { activeProject } = useProjectStore();
  const { stageX, stageY, stageScale, setViewport, pixelsPerCm, exportRegion } = useCanvasStore();

  async function getExportDataUrl(): Promise<{ dataUrl: string; aspect: number } | null> {
    const stage = stageRef.current;
    if (!stage || !activeProject) return null;

    const containerW = stage.width();
    const containerH = stage.height();

    // Compute a zoom-to-fit transform for the export region (or full room)
    let fitScale: number, fitX: number, fitY: number;
    if (exportRegion) {
      const regionW_px = exportRegion.w * pixelsPerCm;
      const regionH_px = exportRegion.h * pixelsPerCm;
      fitScale = Math.min(containerW / regionW_px, containerH / regionH_px);
      fitX = -exportRegion.x * pixelsPerCm * fitScale + (containerW - regionW_px * fitScale) / 2;
      fitY = -exportRegion.y * pixelsPerCm * fitScale + (containerH - regionH_px * fitScale) / 2;
    } else {
      const roomW = activeProject.width_cm * pixelsPerCm;
      const roomH = activeProject.height_cm * pixelsPerCm;
      fitScale = Math.min(containerW / roomW, containerH / roomH);
      fitX = (containerW - roomW * fitScale) / 2;
      fitY = (containerH - roomH * fitScale) / 2;
    }

    // Push fit viewport to store so React-Konva and all layers re-render
    setViewport(fitX, fitY, fitScale);

    // Wait for React to flush the re-render
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

    // Hide UI-only layers
    const selLayer = stage.findOne('.selection-layer') as Konva.Layer | undefined;
    const expLayer = stage.findOne('.export-region-layer') as Konva.Layer | undefined;
    if (selLayer) selLayer.hide();
    if (expLayer) expLayer.hide();
    stage.batchDraw();

    const dataUrl = stage.toDataURL({ pixelRatio: 2 });

    // Restore previous viewport and layers
    if (selLayer) selLayer.show();
    if (expLayer) expLayer.show();
    setViewport(stageX, stageY, stageScale);

    return { dataUrl, aspect: containerW / containerH };
  }

  async function exportPng() {
    if (!activeProject) return;
    const result = await getExportDataUrl();
    if (!result) return;
    await window.api.exportPng(activeProject.id, result.dataUrl);
  }

function zoomToFit(containerW: number, containerH: number) {
    if (!activeProject) return;
    const roomW = activeProject.width_cm * pixelsPerCm;
    const roomH = activeProject.height_cm * pixelsPerCm;
    const fitScale = Math.min(containerW / roomW, containerH / roomH) * 0.9;
    const fitX = (containerW - roomW * fitScale) / 2;
    const fitY = (containerH - roomH * fitScale) / 2;
    setViewport(fitX, fitY, fitScale);
  }

  return { exportPng, zoomToFit };
}
