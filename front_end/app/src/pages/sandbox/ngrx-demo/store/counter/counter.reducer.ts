import { createReducer, on } from '@ngrx/store';

import * as CounterActions from './counter.actions';

export const initialState = 0;

const _counterReducer = createReducer(
    initialState,
    on(CounterActions.increment, state => state + 1),
    on(CounterActions.decrement, state => state - 1),
    on(CounterActions.reset, state => 0)
);

export function counterReducer(state, action) {
    return _counterReducer(state, action);
}
