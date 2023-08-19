import { createFeature } from '@ngrx/store';

import { reducer } from './local-layouts.reducer';

export const localLayoutsFeature = createFeature({
    name: 'localLayouts',
    reducer,
});
