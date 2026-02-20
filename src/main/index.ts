import { app, BrowserWindow, screen } from 'electron';
import path from 'node:path';
import { initDatabase } from './database/connection';
import { registerIpcHandlers } from './ipc-handlers';

import squirrelStartup from 'electron-squirrel-startup';
if (squirrelStartup) {
  app.quit();
}

const createWindow = () => {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize;
  const winW = 1280;
  const winH = 800;

  const mainWindow = new BrowserWindow({
    width: winW,
    height: winH,
    x: Math.round((screenW - winW) / 2),
    y: Math.round((screenH - winH) / 2),
    minWidth: 1100,
    minHeight: 700,
    show: true,
    backgroundColor: '#111827',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    // Give Vite time to finish dep pre-bundling before Electron tries to load.
    // Pre-bundling can briefly restart the dev server, causing ERR_CONNECTION_REFUSED.
    function loadWithRetry(retries = 15, delayMs = 600) {
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL!).catch(() => {
        if (retries > 0) {
          setTimeout(() => loadWithRetry(retries - 1, delayMs), delayMs);
        }
      });
    }
    // Small initial delay to let Vite finish pre-bundling
    setTimeout(() => loadWithRetry(), 1500);
    mainWindow.webContents.on('did-fail-load', (_e, code) => {
      if (code === -102) { // ERR_CONNECTION_REFUSED
        setTimeout(() => mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL!).catch(() => {}), 800);
      }
    });
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }
};

app.on('ready', () => {
  try {
    initDatabase();
  } catch (err) {
    console.error('Database init failed:', err);
  }
  try {
    registerIpcHandlers();
  } catch (err) {
    console.error('IPC handler registration failed:', err);
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;
