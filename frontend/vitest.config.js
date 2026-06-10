// Vitest config · Iter 28 · J9 closure.
// Adds snapshot test support · jsdom environment · global describe/it.

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.js'],
    include: ['src/**/*.test.{js,jsx,ts,tsx}'],
    coverage: {
      reporter: ['text', 'json-summary'],
      include: ['src/components/**/*.{js,jsx}'],
    },
  },
});
