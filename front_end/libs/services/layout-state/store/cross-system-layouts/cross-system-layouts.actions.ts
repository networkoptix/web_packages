import { createAction, props } from '@ngrx/store';

import { Layout, Layouts } from '@services/system-api.types';

export const set = createAction(
    '[Cross System Layouts] Set Cross System Layouts',
    props<{ layouts: Layouts }>(),
);

export const clear = createAction('[Cross System Layouts] Clear Cross System Layouts');

export const add = createAction(
    '[Cross System Layouts] Add Cross System Layouts',
    props<{ layouts: Layouts }>(),
);

export const remove = createAction(
    '[Cross System Layouts] Remove Cross System Layouts',
    props<{ layoutIds: string[] }>(),
);

export const update = createAction(
    '[Cross System Layouts] Update Cross System Layouts',
    props<{ layouts: Layout[] }>(),
);
