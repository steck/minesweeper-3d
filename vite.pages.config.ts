import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
import { fileURLToPath } from 'node:url';

// GitHub Pages serves this repository below /minesweeper-3d/.
export default defineConfig({
  root: 'static-entry',
  base: '/minesweeper-3d/',
  publicDir: '../public',
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  plugins: [react()],
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: '../dist-pages', emptyOutDir: true },
});
