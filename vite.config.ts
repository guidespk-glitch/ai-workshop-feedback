import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.join(rootDirectory, 'client'),
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.join(rootDirectory, 'shared'),
      '@client': path.join(rootDirectory, 'client/src'),
    },
  },
  build: {
    outDir: path.join(rootDirectory, 'dist/public'),
    emptyOutDir: true,
  },
});
