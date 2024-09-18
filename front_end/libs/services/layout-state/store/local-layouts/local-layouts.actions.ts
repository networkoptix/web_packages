import { createAction, props } from '@ngrx/store';

import { Layout, Layouts } from '@services/system-api.types/layouts.types';

export const set = createAction('[Local Layouts] Set Local Layouts', props<{ layouts: Layouts }>());

export const clear = createAction('[Local Layouts] Clear Local Layouts');

export const add = createAction('[Local Layouts] Add Local Layouts', props<{ layouts: Layouts }>());

export const remove = createAction(
    '[Local Layouts] Remove Local Layouts',
    props<{ layoutIds: string[] }>(),
);

export const update = createAction(
    '[Local Layouts] Update Local Layouts',
    props<{ layouts: Layout[] }>(),
);
