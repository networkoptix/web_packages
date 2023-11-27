import { createFeature } from '@ngrx/store';

import { reducer } from './resolution.reducer';

export const layoutsResolutionFeature = createFeature({
    name: 'layoutsResolution',
    reducer,
});
