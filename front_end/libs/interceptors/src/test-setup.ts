import 'jest-preset-angular/setup-jest.mjs';
import { patchGlobals } from 'test_utils/patch_globals';
import { setupMocks } from 'test_utils/setup_mocks';

patchGlobals();
setupMocks();
