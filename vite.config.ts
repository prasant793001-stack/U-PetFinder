import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/U-PetFinder/',
  server: {
    port: 5173,
    open: true
  },
  build: {
    // the lazily-loaded 3D cat chunk (three.js) is ~900 kB by nature; everything on the first paint is far smaller
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom']
          // three.js is NOT forced into a chunk: it ships inside the lazy CatStage chunk, so the first
          // paint never waits for the 3D engine.
        }
      }
    }
  }
});
