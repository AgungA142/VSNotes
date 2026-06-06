import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  main: {
    build: {
      outDir: 'dist/main',
      rollupOptions: {
        external: ['better-sqlite3'],
      },
    },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, './src/shared'),
        '@main': path.resolve(__dirname, './src/main'),
        '@vsnotes/shared-types': path.resolve(
          __dirname,
          '../packages/shared-types/src'
        ),
        '@vsnotes/validation': path.resolve(
          __dirname,
          '../packages/validation/src'
        ),
        '@vsnotes/api-client': path.resolve(
          __dirname,
          '../packages/api-client/src'
        ),
      },
    },
  },
  preload: {
    build: {
      outDir: 'dist/preload',
    },
    resolve: {
      alias: {
        '@shared': path.resolve(__dirname, './src/shared'),
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react()],
    build: {
      outDir: 'dist/renderer',
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },
    resolve: {
      alias: {
        '@renderer': path.resolve(__dirname, './src/renderer'),
        '@shared': path.resolve(__dirname, './src/shared'),
        '@vsnotes/shared-types': path.resolve(
          __dirname,
          '../packages/shared-types/src'
        ),
        '@vsnotes/validation': path.resolve(
          __dirname,
          '../packages/validation/src'
        ),
        '@vsnotes/api-client': path.resolve(
          __dirname,
          '../packages/api-client/src'
        ),
      },
    },
  },
});
