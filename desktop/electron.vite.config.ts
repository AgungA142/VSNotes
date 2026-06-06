import { defineConfig } from 'electron-vite';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default ({ mode }: { mode: string }) => {
  const env = loadEnv(mode, __dirname, '');
  const apiBaseUrl =
    env.VITE_API_BASE_URL ||
    (mode === 'production' ? 'https://api.vsnotes.space' : 'http://localhost:3000');

  return defineConfig({
    main: {
      define: {
        'process.env.API_BASE_URL': JSON.stringify(apiBaseUrl),
      },
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
};
