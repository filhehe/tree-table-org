import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const apiProxy = {
    '/api': {
      target: `http://127.0.0.1:${env.SERVER_PORT || 3001}`,
      changeOrigin: true,
      timeout: 0,
      proxyTimeout: 0,
    },
  };

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
      },
    },
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
