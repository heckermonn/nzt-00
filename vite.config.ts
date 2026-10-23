import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any sub-path (GitHub Pages serves it under /<repo>/).
// `--mode preview` also inlines the models so the whole site is a single-folder bundle, and swaps in the
// WebAssembly-free model set because the artifact preview's content security policy blocks WebAssembly.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  resolve: {
    alias: mode === 'preview' ? [{ find: /^.*\/assets\/models\/(\w+)\.glb$/, replacement: `${decodeURIComponent(new URL('./src/assets/models/plain/', import.meta.url).pathname)}$1.glb` }] : [],
  },
  assetsInclude: ['**/*.glb'],
  build: {
    assetsInlineLimit: mode === 'preview' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: mode === 'preview' ? 5000 : 2000,
  },
}));
