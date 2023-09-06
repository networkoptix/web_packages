import { createFeature } from '@ngrx/store';

import { reducer } from './system-resources.reducer';

export const systemResourcesFeature = createFeature({
    name: 'systemResources',
    reducer,
});
