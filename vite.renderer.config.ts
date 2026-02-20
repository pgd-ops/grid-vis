import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Disable automatic dep discovery so Vite never restarts the server at runtime.
    // Only pre-bundle konva (the one CJS package) explicitly.
    // Cache persists between runs, so after the first cold start there's no restart.
    noDiscovery: true,
    include: [
      'react', 'react-dom', 'react-dom/client',
      'react-konva', 'konva',
      'cookie', 'set-cookie-parser',
      'react-reconciler', 'scheduler',
    ],
  },
});
