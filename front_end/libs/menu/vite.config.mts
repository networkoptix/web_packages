/// <reference types="vitest" />

import angular from '@analogjs/vite-plugin-angular';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

import { defineConfig } from 'vite';

import { vitePoolConfig } from '../../test_utils/vite-pool.config.mts'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [angular(), nxViteTsPaths()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      include: ['**/*.spec.ts'],

      reporters: ['basic'], // Default reporter consumes logs
      disableConsoleIntercept: true,

      ...vitePoolConfig,
      pool: undefined, // Explicit 'forks' causes test to hang
    },
    define: {
      'import.meta.vitest': mode !== 'production',
    },
  };
});
