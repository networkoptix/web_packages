import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash-es';
import {
    EMPTY,
    catchError,
    distinctUntilChanged,
    filter,
    firstValueFrom,
    from,
    interval,
    map,
    of,
    startWith,
    switchMap,
    take,
} from 'rxjs';

import { nxConfig } from '@services/nx-config/config';
import { NxSystemRestAPI3 } from '@services/system-rest-api-v3.service';
import { NxSystemService } from '@services/system.service/system.service';
import { SystemResourcesActions, SystemResourcesSelectors } from '@store/system-resources';
import { cleanId, dirtyId } from '@utils/general';

import { LayoutStateService } from './layout-state.service';
import { ActiveLayoutActions } from './store/active-layout';
import { LocalLayoutsActions } from './store/local-layouts';
import { SharedLayoutsActions } from './store/shared';
import { selectLayouts } from './store/shared/selectors';
import {
    LayoutTypes,
    UnsavedLocalLayoutState,
    UnsavedState,
} from './store/shared/types/layout-state.types';
import { UnsavedLayoutsActions } from './store/unsaved-layouts';
import {
    selectUnsavedLayoutsOverwrites,
    selectUnsavedLayoutsState,
} from './store/unsaved-layouts/unsaved-layouts.selectors';

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
                this.layoutStateService.editedLayout$$.set({
                    id: dirtyId(createdLayoutId),
                    isNew: true,
                });
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
            filter(system => system && !!nxConfig.featureFlags.layouts),
            switchMap(system =>
                this.store.select(SystemResourcesSelectors.selectLayoutsBySystemId(system.id)),
            ),
            map(layouts => LocalLayoutsActions.set({ layouts })),
        );
    });

    updateSystemResources$ = createEffect(() => {
        return this.layoutStateService.paramStateHandler.state$.pipe(
            map(({ params: { systemId, layoutId } }) => ({ systemId, layoutId })),
            distinctUntilChanged(isEqual),
            switchMap(({ systemId, layoutId }) =>
                layoutId
                    ? interval(5 * 1000).pipe(
                          startWith(60),
                          map(pollInterval =>
                              SystemResourcesActions.refreshSystemResources({
                                  systems: {
                                      [systemId]: {
                                          layouts: !(pollInterval % 3),
                                          cameras: !(pollInterval % 6),
                                          servers: !(pollInterval % 12),
                                      },
                                  },
                              }),
                          ),
                      )
                    : EMPTY,
            ),
        );
    });

    persistLayout$ = createEffect(() => {
        return this.actions.pipe(
            ofType(SharedLayoutsActions.saveLayout),
            map(({ layoutIds }) => layoutIds),
            distinctUntilChanged(isEqual),
            switchMap(layoutsToSave => {
                return this.store.select(selectUnsavedLayoutsState).pipe(
                    map(layouts => layouts.filter(({ id }) => layoutsToSave.includes(id))),
                    switchMap(async layouts => {
                        const mediaserver = this.systemService.getCurrentSystem()
                            .mediaserver as NxSystemRestAPI3;

                        const overwriteLayouts = await firstValueFrom(
                            this.store.select(selectUnsavedLayoutsOverwrites),
                        );

                        const errorLayouts: UnsavedLocalLayoutState[] = [];

                        const savingLocalLayouts = layouts
                            .filter(({ layoutType }) => layoutType === LayoutTypes.LOCAL)
                            .map((unsavedLocalLayoutState: UnsavedLocalLayoutState) => {
                                const {
                                    layout: { id, ...layout },
                                } = unsavedLocalLayoutState;
                                return firstValueFrom(
                                    mediaserver.putLayout(overwriteLayouts[id] || id, layout).pipe(
                                        catchError(() => {
                                            errorLayouts.push({
                                                ...unsavedLocalLayoutState,
                                                unsaved: UnsavedState.ERROR,
                                            });
                                            return of(null);
                                        }),
                                    ),
                                );
                            });

                        const savedLayouts = (await Promise.all(savingLocalLayouts)).filter(
                            Boolean,
                        );

                        const toDelete = savedLayouts
                            .map(
                                ({ id }) =>
                                    Object.entries(overwriteLayouts).find(
                                        ([_, value]) => value === id,
                                    )?.[0],
                            )
                            .filter(Boolean) as string[];

                        const { params: { layoutId } = {} } =
                            this.layoutStateService.paramStateHandler.state$$();

                        if (layoutId && toDelete.map(cleanId).includes(layoutId)) {
                            this.layoutStateService.paramStateHandler.state$$.set({
                                params: { layoutId: cleanId(overwriteLayouts[dirtyId(layoutId)]) },
                            });
                        }

                        return [
                            LocalLayoutsActions.update({
                                layouts: savedLayouts,
                            }),
                            SharedLayoutsActions.deleteLayout({ layoutIds: toDelete }),
                            UnsavedLayoutsActions.update({ layouts: errorLayouts }),
                        ];
                    }),
                    take(1),
                    switchMap(actions => from(actions)),
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
