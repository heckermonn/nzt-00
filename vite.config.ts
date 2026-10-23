import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `--mode preview` builds a self-contained bundle (relative paths, models inlined)
// so the whole site can be dropped into a static host or a single-folder preview.
export default defineConfig(({ mode }) => ({
  base: mode === 'preview' ? './' : '/',
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  build: {
    assetsInlineLimit: mode === 'preview' ? 100_000_000 : 4096,
    chunkSizeWarningLimit: mode === 'preview' ? 3000 : 2000,
  },
}));
