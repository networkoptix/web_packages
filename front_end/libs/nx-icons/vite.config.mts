/// <reference types="vitest" />

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

import { defineConfig } from 'vite';

import { vitestConfig } from '../../test_utils/vitest.config.mts';

import project from './project.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [nxViteTsPaths()],
    test: vitestConfig(project.name),
    define: {
      'import.meta.vitest': mode !== 'production',
    },
  };
});
