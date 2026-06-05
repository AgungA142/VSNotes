import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
  },
  resolve: {
    alias: {
      '@config': path.resolve(__dirname, 'src/config'),
      '@controllers': path.resolve(__dirname, 'src/controllers'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@models': path.resolve(__dirname, 'src/models'),
      '@middleware': path.resolve(__dirname, 'src/middleware'),
      '@routes': path.resolve(__dirname, 'src/routes'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
      '@jobs': path.resolve(__dirname, 'src/jobs'),
      '@vsnotes/shared-types': path.resolve(__dirname, '../packages/shared-types/src'),
      '@vsnotes/validation': path.resolve(__dirname, '../packages/validation/src'),
    },
  },
});
