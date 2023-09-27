import { Signal } from '@angular/core';
import { ActivatedRouteSnapshot } from '@angular/router';
import { Observable } from 'rxjs';

export interface ParamState {
    params: Record<string, string>;
    queryParams: Record<string, string[]>;
}

export enum MutationType {
    SET = 'SET',
    REMOVE = 'REMOVE',
    APPEND = 'APPEND',
}

export type QueryParamUpdate<T> = {
    [P in keyof T]?: string | string[] | { value: string[]; mutationType: MutationType };
};

export interface UpdateParams<State extends Partial<ParamState>> {
    params?: Partial<State['params']>;
    queryParams?: QueryParamUpdate<State['queryParams']>;
}

export interface ParamStateHandler<State> {
    state$: Observable<State>;
    state$$: Signal<State>;
    getInstantState: (route: ActivatedRouteSnapshot) => State;
    updater: <State extends Partial<ParamState>>(
        stateCallback: (currentState?: State) => UpdateParams<State>,
    ) => void;
}
