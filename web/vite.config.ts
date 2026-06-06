import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@stores': path.resolve(__dirname, './src/stores'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@lib': path.resolve(__dirname, './src/lib'),
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
  server: {
    port: 5173,
  },
});
