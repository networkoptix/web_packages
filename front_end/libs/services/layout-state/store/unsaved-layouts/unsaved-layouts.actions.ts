import { createAction, props } from '@ngrx/store';

import { LayoutItem } from '@services/system-api.types';

import { UnsavedLayoutState } from '../shared/types/layout-state.types';

export const set = createAction(
    '[Unsaved Layouts] Set Unsaved Layouts',
    props<{ unsavedLayouts: UnsavedLayoutState[] }>(),
);

export const createNewLocalLayout = createAction(
    '[Unsaved Layouts] Create New Unsaved Local Layout',
    props<{ name?: string; items?: LayoutItem[] }>(),
);

export const createNewCrossSystemLayout = createAction(
    '[Unsaved Layouts] Create New Unsaved Cross System Layout',
    props<{ name: string; items?: [] }>(),
);

export const clear = createAction('[Unsaved Layouts] Clear Unsaved Layouts');
