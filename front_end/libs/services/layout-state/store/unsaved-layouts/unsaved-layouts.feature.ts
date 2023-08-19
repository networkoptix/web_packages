import { createFeature } from '@ngrx/store';

import { reducer } from './unsaved-layouts.reducer';

export const unsavedLayoutsFeature = createFeature({
    name: 'unsavedLayouts',
    reducer,
});
