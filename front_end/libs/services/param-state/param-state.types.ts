import { WritableSignal } from '@angular/core';
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
    state$$: WritableSignal<RecursivePartial<State>>;
    getInstantState: (route: ActivatedRouteSnapshot) => State;
    updater: <State extends Partial<ParamState>>(
        stateCallbackOrUpdatedState:
            | UpdateParams<State>
            | ((currentState?: State) => UpdateParams<State>),
    ) => void;
}

export type RecursivePartial<T> = {
    [P in keyof T]?: T[P] extends (infer U)[]
        ? RecursivePartial<U>[]
        : T[P] extends object | undefined
        ? RecursivePartial<T[P]>
        : T[P];
};
