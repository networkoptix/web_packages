import { Injectable, Injector, runInInjectionContext, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
    ActivatedRoute,
    ActivatedRouteSnapshot,
    ActivationEnd,
    Params,
    Router,
} from '@angular/router';
import { cloneDeep } from 'lodash-es';
import { filter, map, Observable, shareReplay, startWith } from 'rxjs';

import {
    MutationType,
    ParamState,
    ParamStateHandler,
    RecursivePartial,
    UpdateParams,
} from './param-state.types';

@Injectable({
    providedIn: 'root',
})
export class NxParamStateService {
    private paramState$ = this.router.events.pipe(
        filter(event => event instanceof ActivationEnd),
        startWith(null),
        map(() => this.getParamState()),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    private getParamState = (
        route: ActivatedRouteSnapshot = this.router.routerState.root.snapshot,
    ) => ({
        params: this.extractParams()(route),
        queryParams: Object.entries(route.queryParams).reduce(
            (acc, [key, val]) => ({ ...acc, [key]: typeof val === 'string' ? [val] : val }),
            {},
        ),
    });

    private extractParams =
        (params: Params = {}) =>
        (route: ActivatedRouteSnapshot): Params => {
            route.children.forEach(this.extractParams(params));
            Object.assign(params, route.params);
            return params;
        };

    private paramState$$ = toSignal(this.paramState$);

    public getStateHandler(): ParamStateHandler<ParamState>;
    public getStateHandler<MappedParamState>(
        mapState?: (state: ParamState) => MappedParamState,
    ): ParamStateHandler<MappedParamState>;
    public getStateHandler<MappedParamState>(
        mapState?: (state: ParamState) => MappedParamState,
    ): ParamStateHandler<unknown> {
        const state$ = this.paramState$;
        const injector = this.injector;

        class StateHandler<T> implements ParamStateHandler<T> {
            constructor(
                public state$: Observable<T>,
                public updater: NxParamStateService['updateParamState'],
                public getInstantState: (route: ActivatedRouteSnapshot) => T,
            ) {}
            state$$ = runInInjectionContext(injector, () => {
                const readOnlySignal$$ = toSignal(this.state$) as unknown as WritableSignal<
                    RecursivePartial<T>
                >;

                const proxiedMethods = {
                    set: this.updater,
                    update: this.updater,
                    mutate: (mutatorFn: (state: T) => void): void => {
                        this.updater(state => {
                            const mutableState = cloneDeep(state as T);
                            mutatorFn(mutableState);
                            return mutableState;
                        });
                    },
                    asReadonly: () => readOnlySignal$$,
                };

                const proxyHandler = {
                    get(target: WritableSignal<RecursivePartial<T>>, prop: string): unknown {
                        if (prop in proxiedMethods) {
                            return proxiedMethods[prop as keyof typeof proxiedMethods];
                        }

                        return Reflect.get(target, prop);
                    },
                };
                return new Proxy(readOnlySignal$$, proxyHandler);
            });
        }

        if (!mapState) {
            return new StateHandler(
                state$,
                this.updateParamState,
                (route: ActivatedRouteSnapshot) => this.getParamState(route),
            );
        }

        return new StateHandler(
            this.paramState$.pipe(map(mapState), shareReplay({ bufferSize: 1, refCount: true })),
            this.updateParamState,
            (route: ActivatedRouteSnapshot) => mapState(this.getParamState(route)),
        );
    }

    private updateParamState = <State extends Partial<ParamState>>(
        updateStatePartialOrStateMapper:
            | UpdateParams<State>
            | ((previousState: State) => UpdateParams<State>),
    ): Promise<boolean> => {
        const state = this.paramState$$() as State;
        const { params = {}, queryParams: originalQueryParams = {} } = state;
        const { params: updatedParams = {}, queryParams: updatedQueryParams = {} } =
            typeof updateStatePartialOrStateMapper === 'function'
                ? updateStatePartialOrStateMapper(state)
                : updateStatePartialOrStateMapper;

        const queryParams = Object.entries(updatedQueryParams).reduce(
            (curr, [_key, _value]) => {
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

                if (typeof updatedValue === 'string' && updatedValue !== '') {
                    curr[key] = [updatedValue];
                } else if (typeof updatedValue === 'object' && 'value' in updatedValue) {
                    curr[key] = handleMutation(updatedValue, originalQueryParams[_key]);
                } else if (Array.isArray(updatedValue)) {
                    curr[key] = updatedValue;
                }

                return curr;
            },
            updatedQueryParams as UpdateParams<State>['queryParams'],
        );

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

        return this.router.navigate([decodeURIComponent(updatedUrl)], {
            queryParams,
            queryParamsHandling: 'merge',
            relativeTo: this.route,
            replaceUrl: true,
        });
    };

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private injector: Injector,
    ) {}
}
