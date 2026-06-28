import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@shared': path.join(rootDirectory, 'shared'),
      '@client': path.join(rootDirectory, 'client/src'),
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./client/src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
