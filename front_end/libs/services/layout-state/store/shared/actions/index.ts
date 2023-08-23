import { createAction, props } from '@ngrx/store';

export const deleteLayout = createAction(
    '[Delete Layout] Remove Layouts by Ids',
    props<{ layoutIds: string[] }>(),
);
