import { useRef } from 'react';
import type Konva from 'konva';
import { useCanvasStore } from '../store/canvas.store';
import { useProjectStore } from '../store/project.store';

export function useExport(stageRef: React.RefObject<Konva.Stage | null>) {
  const { activeProject } = useProjectStore();
  const { stageX, stageY, stageScale, setViewport, pixelsPerCm } = useCanvasStore();

  function getExportDataUrl(): string {
    const stage = stageRef.current;
    if (!stage || !activeProject) return '';

    // Find and hide selection layer
    const selLayer = stage.findOne('.selection-layer') as Konva.Layer | undefined;
    if (selLayer) selLayer.hide();

    // Zoom to fit room
    const roomW = activeProject.width_cm * pixelsPerCm;
    const roomH = activeProject.height_cm * pixelsPerCm;
    const containerW = stage.width();
    const containerH = stage.height();
    const fitScale = Math.min(containerW / roomW, containerH / roomH) * 0.95;
    const fitX = (containerW - roomW * fitScale) / 2;
    const fitY = (containerH - roomH * fitScale) / 2;

    stage.x(fitX);
    stage.y(fitY);
    stage.scale({ x: fitScale, y: fitScale });
    stage.batchDraw();

    const dataUrl = stage.toDataURL({ pixelRatio: 2 });

    // Restore
    stage.x(stageX);
    stage.y(stageY);
    stage.scale({ x: stageScale, y: stageScale });
    if (selLayer) selLayer.show();
    stage.batchDraw();

    return dataUrl;
  }

  async function exportPng() {
    if (!activeProject) return;
    const dataUrl = getExportDataUrl();
    if (!dataUrl) return;
    await window.api.exportPng(activeProject.id, dataUrl);
  }

  async function exportPdf() {
    if (!activeProject) return;
    const dataUrl = getExportDataUrl();
    if (!dataUrl) return;

    // Dynamically import jspdf (renderer-side only)
    const { jsPDF } = await import('jspdf');
    const widthMm = activeProject.width_cm * 10;
    const heightMm = activeProject.height_cm * 10;
    const pdf = new jsPDF({ unit: 'mm', format: [widthMm, heightMm], orientation: 'landscape' });
    pdf.addImage(dataUrl, 'PNG', 0, 0, widthMm, heightMm);
    const pdfDataUri = pdf.output('datauristring');
    await window.api.exportPdf(activeProject.id, pdfDataUri);
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

  return { exportPng, exportPdf, zoomToFit };
}
