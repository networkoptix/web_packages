// Copyright 2018-present Network Optix, Inc. Licensed under MPL 2.0: www.mozilla.org/MPL/2.0/

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'fisheye-dewarp': resolve(
        __dirname,
        '../../../open_candidate/packages/fisheye-dewarp/src/index.ts',
      ),
      '@networkoptix/object-tracking-overlay': resolve(
        __dirname,
        '../../../open_candidate/packages/object-tracking-overlay/src/index.ts',
      ),
      '@networkoptix/overlay-shared': resolve(
        __dirname,
        '../../../open_candidate/packages/overlay-shared/src/index.ts',
      ),
    },
  },
});
