import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {
    catchError,
    distinctUntilChanged,
    filter,
    firstValueFrom,
    map,
    of,
    switchMap,
    take,
} from 'rxjs';

import { nxConfig } from '@services/nx-config/config';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxSystemRestAPI } from '@services/system-rest-api.service';
import { NxSystemService } from '@services/system.service/system.service';
import { dirtyId } from '@utils/general';

import { LayoutStateService } from './layout-state.service';
import { ActiveLayoutActions } from './store/active-layout';
import { LocalLayoutsActions } from './store/local-layouts';
import { SharedLayoutsActions } from './store/shared';
import { selectLayouts } from './store/shared/selectors';
import { LayoutTypes, UnsavedLocalLayoutState } from './store/shared/types/layout-state.types';
import { UnsavedLayoutsActions } from './store/unsaved-layouts';
import { selectUnsavedLayoutsState } from './store/unsaved-layouts/unsaved-layouts.selectors';

@Injectable()
export class LayoutStateEffects {
    autoSelectNewLayout$ = createEffect(() => {
        return this.actions.pipe(
            ofType(
                UnsavedLayoutsActions.createNewLocalLayout,
                UnsavedLayoutsActions.duplicateLayout,
            ),
            map(({ id }) => id),
            distinctUntilChanged(),
            switchMap(createdLayoutId => {
                return this.store.select(selectLayouts).pipe(
                    filter(layouts => layouts.some(({ id }) => id === dirtyId(createdLayoutId))),
                    map(() => createdLayoutId),
                    map(id => ActiveLayoutActions.set({ id })),
                    take(1),
                );
            }),
        );
    });

    updateActiveLayout$ = createEffect(() => {
        return this.layoutStateService.paramStateHandler.state$.pipe(
            map(({ params: { layoutId } }) => ActiveLayoutActions.set({ id: layoutId })),
        );
    });

    updateLayouts$ = createEffect(() => {
        return this.systemService.currentSystem$.pipe(
            filter(() => nxConfig.featureFlags.layouts),
            switchMap(async system => {
                const layouts = await firstValueFrom(
                    (system.mediaserver as NxSystemRestAPI).getLayouts(),
                );
                return LocalLayoutsActions.set({ layouts });
            }),
        );
    });

    persistLayout$ = createEffect(() => {
        return this.actions.pipe(
            ofType(SharedLayoutsActions.saveLayout),
            map(({ layoutIds }) => layoutIds),
            distinctUntilChanged(),
            switchMap(layoutsToSave => {
                return this.store.select(selectUnsavedLayoutsState).pipe(
                    map(layouts => layouts.filter(({ id }) => layoutsToSave.includes(id))),
                    switchMap(async layouts => {
                        const mediaserver = this.systemService.getCurrentSystem()
                            .mediaserver as NxSystemRestAPI3;

                        const savingLocalLayouts = layouts
                            .filter(({ layoutType }) => layoutType === LayoutTypes.LOCAL)
                            .map((layout: UnsavedLocalLayoutState) =>
                                firstValueFrom(
                                    mediaserver.putLayout(layout.id, layout.layout).pipe(
                                        map(updatedLayout => updatedLayout),
                                        catchError(() => of(null)),
                                        filter(Boolean),
                                    ),
                                ),
                            );

                        const savedLayouts = await Promise.all(savingLocalLayouts);

                        return LocalLayoutsActions.update({
                            layouts: savedLayouts,
                        });
                    }),
                    take(1),
                );
            }),
        );
    });

    discardPersistedLayout$ = createEffect(() => {
        return this.actions.pipe(
            ofType(LocalLayoutsActions.update),
            map(({ layouts }) => layouts.map(({ id }) => id)),
            map(layoutIds => UnsavedLayoutsActions.remove({ layoutIds })),
        );
    });

    deleteLayout$ = createEffect(() => {
        return this.actions.pipe(
            ofType(SharedLayoutsActions.deleteLayout),
            switchMap(async ({ layoutIds }) => {
                const mediaserver = this.systemService.getCurrentSystem()
                    .mediaserver as NxSystemRestAPI3;
                const deletedLocalLayouts = layoutIds.map(layoutId =>
                    firstValueFrom(
                        mediaserver.deleteLayout(layoutId).pipe(
                            map(() => layoutId),
                            catchError(() => of(null)),
                            filter(Boolean),
                        ),
                    ),
                );

                const removedLayouts = await Promise.all(deletedLocalLayouts);
                return LocalLayoutsActions.remove({ layoutIds: removedLayouts });
            }),
        );
    });

    constructor(
        private actions: Actions,
        private store: Store,
        private systemService: NxSystemService,
        private layoutStateService: LayoutStateService,
    ) {}
}
