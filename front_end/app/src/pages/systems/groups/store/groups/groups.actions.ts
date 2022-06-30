import { createAction, props } from '@ngrx/store';

import { ListItem, SystemsItem } from './groups.types';

export const reset = createAction('[System Groups] Reset');

export const loadList = createAction(
    '[System Groups] Load List',
    props<{ list: Array<ListItem> }>()
);

export const loadSystems = createAction(
    '[System Groups] Load Systems',
    props<{ systems: Array<SystemsItem> }>()
);
