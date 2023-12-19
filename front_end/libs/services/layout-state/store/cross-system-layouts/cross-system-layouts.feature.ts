import { createFeature } from '@ngrx/store';

import { reducer } from './cross-system-layouts.reducer';

export const crossSystemLayoutsFeature = createFeature({
    name: 'crossSystemLayouts',
    reducer,
});
