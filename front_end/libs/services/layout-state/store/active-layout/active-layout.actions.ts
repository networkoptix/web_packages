import { createAction, props } from '@ngrx/store';

export const set = createAction('[Active Layout] Set Active Layout ID', props<{ id: string }>());

export const clear = createAction('[Active Layout] Clear Active Layout ID');
