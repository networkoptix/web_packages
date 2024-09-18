import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { concatMap, forkJoin, map, Observable, tap } from 'rxjs';

import { NxSystemService } from '@services/system.service/system.service';

import {
    LoadPartialSystemResources,
    RefreshSystemResources,
    SystemResources,
    SystemResourcesTypeMap,
    SystemResourceTypeEnums,
} from './system-resources.types';

import { SystemResourcesActions } from '.';

const normalizeLoadAllSystemResources = (
    loadAllSystemResources: RefreshSystemResources,
): LoadPartialSystemResources =>
    'all' in loadAllSystemResources
        ? Object.values(SystemResourceTypeEnums).reduce((acc, cur) => ({ ...acc, [cur]: true }), {})
        : loadAllSystemResources;

@Injectable()
export class SystemResourcesEffects {
    updateSystemResources$ = createEffect(() => {
        return this.actions.pipe(
            ofType(SystemResourcesActions.refreshSystemResources),
            concatMap(({ systems }) =>
                forkJoin(
                    Object.entries(systems)
                        .map(
                            ([systemId, refresh]): [
                                string,
                                Observable<Partial<SystemResourcesTypeMap>>,
                            ] => [
                                systemId,
                                this.systemService.getSystemResources(
                                    systemId,
                                    normalizeLoadAllSystemResources(refresh),
                                ),
                            ],
                        )
                        .reduce(
                            (acc, [systemId, resources]) => ({
                                ...acc,
                                [systemId]: resources,
                            }),
                            {},
                        ) as Record<string, Observable<Partial<SystemResources>>>,
                ),
            ),
            tap(systemResourceAction => {
                console.info({ systemResourceAction });
            }),
            map(updatedResources => SystemResourcesActions.updateSystemResources(updatedResources)),
        );
    });

    constructor(
        private actions: Actions,
        private systemService: NxSystemService,
    ) {}
}
