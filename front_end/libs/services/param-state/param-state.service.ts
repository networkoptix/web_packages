import { Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivationEnd, Params, Router } from '@angular/router';
import { Observable, filter, map, shareReplay, startWith } from 'rxjs';

import { MutationType, ParamState, ParamStateHandler, UpdateParams } from './param-state.types';

@Injectable({
    providedIn: 'root',
})
export class NxParamStateService {
    private paramState$ = this.router.events.pipe(
        filter(event => event instanceof ActivationEnd),
        startWith(null),
        map(() => {
            const extractParams =
                (params: Params = {}) =>
                (route: ActivatedRoute): Params => {
                    route.children.forEach(extractParams(params));
                    Object.assign(params, route.snapshot.params);
                    return params;
                };
            return {
                params: extractParams()(this.router.routerState.root),
                queryParams: Object.entries(
                    this.router.routerState.root.snapshot.queryParams,
                ).reduce(
                    (acc, [key, val]) => ({ ...acc, [key]: typeof val === 'string' ? [val] : val }),
                    {},
                ),
            };
        }),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    private paramState$$ = toSignal(this.paramState$);

    public getStateHandler(): ParamStateHandler<ParamState>;
    public getStateHandler<MappedParamState>(
        mapState?: (state: ParamState) => MappedParamState,
    ): ParamStateHandler<MappedParamState>;
    public getStateHandler<MappedParamState>(
        mapState?: (state: ParamState) => MappedParamState,
    ): ParamStateHandler<unknown> {
        const state$ = this.paramState$;

        class StateHandler<T> implements ParamStateHandler<T> {
            constructor(
                public state$: Observable<T>,
                public updater: NxParamStateService['updateParamState'],
            ) {}
            state$$ = toSignal(this.state$);
        }

        if (!mapState) {
            return new StateHandler(state$, this.updateParamState);
        }

        return new StateHandler(
            this.paramState$.pipe(map(mapState), shareReplay({ bufferSize: 1, refCount: true })),
            this.updateParamState,
        );
    }

    private updateParamState = <State extends Partial<ParamState>>(
        updatedStateFactory: (previousState: State) => UpdateParams<State>,
    ): Promise<boolean> => {
        const state = this.paramState$$() as State;
        const { params = {}, queryParams: originalQueryParams = {} } = state;
        const { params: updatedParams = {}, queryParams: updatedQueryParams = {} } =
            updatedStateFactory(state);

        const queryParams = Object.entries(updatedQueryParams).reduce((curr, [_key, _value]) => {
            const key = _key as keyof UpdateParams<State>['queryParams'];
            const updatedValue = curr[key];

            const handleMutation = (
                {
                    value,
                    mutationType,
                }: {
                    value: string[];
                    mutationType: MutationType;
                },
                previousValue: string[] = [],
            ): string[] => {
                if (mutationType === MutationType.SET) {
                    return value;
                }

                if (mutationType === MutationType.REMOVE) {
                    return previousValue.filter(val => !value.includes(val));
                }

                if (mutationType === MutationType.APPEND) {
                    return [...previousValue, ...value];
                }
            };

            if (typeof updatedValue === 'string') {
                curr[key] = [updatedValue];
            } else if (typeof updatedValue === 'object' && 'value' in updatedValue) {
                curr[key] = handleMutation(updatedValue, originalQueryParams[_key]);
            } else if (Array.isArray(updatedValue)) {
                curr[key] = updatedValue;
            }

            return curr;
        }, updatedQueryParams as UpdateParams<State>['queryParams']);

        const missingFromUrl = Object.entries(updatedParams).some(
            ([key, value]) => value && !params[key],
        );

        const urlWithParamsReplaced = Object.entries(params).reduce(
            (url, [key, val]) => url.replace(val, updatedParams[key] || val),
            this.router.url.split('?')[0],
        );

        // TODO: Find a way to resolve a route just from params.
        const findUrl = (): string => urlWithParamsReplaced;

        const updatedUrl = missingFromUrl ? findUrl() : urlWithParamsReplaced;

        return this.router.navigate([updatedUrl], {
            queryParams,
            queryParamsHandling: 'merge',
            relativeTo: this.route,
        });
    };

    constructor(private router: Router, private route: ActivatedRoute) {}
}
