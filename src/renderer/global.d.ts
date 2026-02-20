import type { GridVisAPI } from '../preload/index';

declare global {
  interface Window {
    api: GridVisAPI;
  }
}
