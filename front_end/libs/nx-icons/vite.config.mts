/// <reference types="vitest" />

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

import { defineConfig } from 'vite';

import { vitePoolConfig } from '../../test_utils/vite-pool.config.mts'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [nxViteTsPaths()],
    test: {
      globals: true,
      environment: 'jsdom',
      include: ['**/*.spec.ts'],

      reporters: ['basic'], // Default reporter consumes logs
      disableConsoleIntercept: true,

      ...vitePoolConfig,
    },
    define: {
      'import.meta.vitest': mode !== 'production',
    },
  };
});
