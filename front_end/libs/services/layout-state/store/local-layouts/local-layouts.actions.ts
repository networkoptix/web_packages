import { createAction, props } from '@ngrx/store';

import { Layouts, Layout } from '@services/system-api.types';

type LayoutPartialUpdate = Partial<Layout> & Pick<Layout, 'id'>;

export const set = createAction('[Local Layouts] Set Local Layouts', props<{ layouts: Layouts }>());

export const clear = createAction('[Local Layouts] Clear Local Layouts');

export const add = createAction('[Local Layouts] Add Local Layouts', props<{ layouts: Layouts }>());

export const remove = createAction(
    '[Local Layouts] Remove Local Layouts',
    props<{ layouts: Layouts }>(),
);

export const update = createAction(
    '[Local Layouts] Update Local Layouts',
    props<{ layouts: LayoutPartialUpdate[] }>(),
);
