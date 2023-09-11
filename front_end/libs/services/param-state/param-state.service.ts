import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivationEnd, Params, Router } from '@angular/router';
import { Observable, filter, map, shareReplay } from 'rxjs';

import { ParamState } from './param-state.types';

@Injectable({
    providedIn: 'root',
})
export class NxParamStateService {
    private paramState$ = this.router.events.pipe(
        filter(event => event instanceof ActivationEnd),
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

    public getState(): Observable<ParamState>;
    public getState<MappedParamState>(
        mapState?: (state: ParamState) => MappedParamState,
    ): Observable<MappedParamState>;
    public getState<MappedParamState>(
        mapState?: (state: ParamState) => MappedParamState,
    ): Observable<unknown> {
        if (!mapState) {
            return this.paramState$;
        }

        return this.paramState$.pipe(map(mapState), shareReplay({ bufferSize: 1, refCount: true }));
    }

    constructor(private router: Router) {}
}
