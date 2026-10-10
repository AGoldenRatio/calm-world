import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build runs from any static host or sub-path (GitHub Pages, a USB stick, a tablet).
  base: './',
  build: { target: 'es2022' },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
  },
});
