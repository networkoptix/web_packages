/// <reference types="vitest" />

import angular from '@analogjs/vite-plugin-angular';

import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

import { defineConfig } from 'vite';

import { vitestConfig } from '../../test_utils/vitest.config.mts';

import project from './project.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [angular(), nxViteTsPaths()],
    test: vitestConfig(project.name),
    define: {
      'import.meta.vitest': mode !== 'production',
    },
  };
});
