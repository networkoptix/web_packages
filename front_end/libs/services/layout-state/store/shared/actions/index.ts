import { createAction, props } from '@ngrx/store';

export const deleteLayout = createAction(
    '[Shared Action] Remove Layouts by Ids',
    props<{ layoutIds: string[] }>(),
);

export const saveLayout = createAction(
    '[Shared Action] Save Layouts by Ids',
    props<{ layoutIds: string[] }>(),
);
