import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  type ProjectInput,
} from './database/project.model';
import {
  getElementsForProject,
  upsertElements,
  deleteElement,
  deleteElementsForProject,
  type ElementUpsertInput,
} from './database/element.model';
import {
  getAllCustomObjects,
  createCustomObject,
  deleteCustomObject,
  type CustomObjectInput,
} from './database/custom-object.model';

export function registerIpcHandlers(): void {
  // Projects
  ipcMain.handle('projects:getAll', () => getAllProjects());
  ipcMain.handle('projects:get', (_e, id: number) => getProject(id));
  ipcMain.handle('projects:create', (_e, input: ProjectInput) => createProject(input));
  ipcMain.handle('projects:update', (_e, id: number, updates: Partial<ProjectInput>) => updateProject(id, updates));
  ipcMain.handle('projects:delete', (_e, id: number) => deleteProject(id));

  // Elements
  ipcMain.handle('elements:getForProject', (_e, projectId: number) => getElementsForProject(projectId));
  ipcMain.handle('elements:upsertMany', (_e, elements: ElementUpsertInput[]) => upsertElements(elements));
  ipcMain.handle('elements:delete', (_e, id: number) => deleteElement(id));
  ipcMain.handle('elements:deleteForProject', (_e, projectId: number) => deleteElementsForProject(projectId));

  // Custom objects
  ipcMain.handle('customObjects:getAll', () => getAllCustomObjects());
  ipcMain.handle('customObjects:create', (_e, input: CustomObjectInput) => createCustomObject(input));
  ipcMain.handle('customObjects:delete', (_e, id: number) => deleteCustomObject(id));

  // Export PNG
  ipcMain.handle('export:png', async (_e, projectId: number, dataUrl: string) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Export PNG',
      defaultPath: `room-layout-${projectId}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }],
    });
    if (result.canceled || !result.filePath) return false;
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'));
    return true;
  });

  // Export PDF
  ipcMain.handle('export:pdf', async (_e, projectId: number, dataUri: string) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Export PDF',
      defaultPath: `room-layout-${projectId}.pdf`,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    });
    if (result.canceled || !result.filePath) return false;
    const base64 = dataUri.replace(/^data:application\/pdf;base64,/, '');
    fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'));
    return true;
  });

  // Save file dialog (generic)
  ipcMain.handle('dialog:saveFile', async (_e, defaultName: string, ext: string) => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showSaveDialog(win ?? undefined!, {
      defaultPath: defaultName,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    return result.canceled ? null : result.filePath;
  });
}
