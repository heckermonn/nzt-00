import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any sub-path (GitHub Pages serves it under /<repo>/).
// `--mode preview` also inlines the models so the whole site is a single-folder bundle.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  build: {
    assetsInlineLimit: mode === 'preview' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: mode === 'preview' ? 3000 : 2000,
  },
}));
