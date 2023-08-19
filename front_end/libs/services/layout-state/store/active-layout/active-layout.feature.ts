import { createFeature } from '@ngrx/store';

import { reducer } from './active-layout.reducer';

export const activeLayoutFeature = createFeature({
    name: 'activeLayout',
    reducer,
});
