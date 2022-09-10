import { createReducer, on } from '@ngrx/store';

import * as CounterActions from './counter.actions';

export const initialState = 0;

export const counterReducer = createReducer(
    initialState,
    on(CounterActions.increment, (state): number => state + 1),
    on(CounterActions.decrement, (state): number => state - 1),
    on(CounterActions.reset, (state): number => 0)
);
