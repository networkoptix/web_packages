import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { isEqual, uniq } from 'lodash-es';
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
import { NxSystemsService } from '@services/systems.service';
import { SystemResourcesActions, SystemResourcesSelectors } from '@store/system-resources';
import { extractSystemAndResourceId } from '@utils/extract-system-and-resources';
import { cleanId, dirtyId } from '@utils/general';

import { LayoutStateService } from './layout-state.service';
import { ActiveLayoutActions } from './store/active-layout';
import { CrossSystemLayoutsActions } from './store/cross-system-layouts';
import { LocalLayoutsActions } from './store/local-layouts';
import { SharedLayoutsActions } from './store/shared';
import { selectLayoutsState } from './store/shared/selectors';
import {
    LayoutTypes,
    UnsavedCrossSystemLayoutState,
    UnsavedLayoutState,
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
                UnsavedLayoutsActions.createNewCrossSystemLayout,
                UnsavedLayoutsActions.duplicateLayout,
            ),
            map(({ id }) => id),
            distinctUntilChanged(),
            switchMap(createdLayoutId => {
                this.layoutStateService.editedLayout$$.set({
                    id: dirtyId(createdLayoutId),
                    isNew: true,
                });
                return this.store.select(selectLayoutsState).pipe(
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
            distinctUntilChanged(
                (a, b) => a.systemId === b.systemId && !!a.layoutId === !!b.layoutId,
            ),
            switchMap(({ systemId, layoutId }) =>
                layoutId
                    ? interval(5 * 1000).pipe(
                          startWith(60),
                          map(pollInterval => ({
                              layouts: !(pollInterval % 3),
                              cameras: !(pollInterval % 6),
                              servers: !(pollInterval % 12),
                          })),
                          filter(refreshConfig => Object.values(refreshConfig).some(Boolean)),
                          switchMap(async refreshConfig => {
                              let systemsToRefresh = [systemId];
                              if (
                                  refreshConfig.layouts &&
                                  nxConfig.featureFlags.layoutsCrossSystem
                              ) {
                                  const crossSystemLayouts = await firstValueFrom(
                                      this.layoutStateService.loadCrossSystemLayouts(),
                                  );

                                  systemsToRefresh = uniq(
                                      [
                                          systemId,
                                          ...crossSystemLayouts.flatMap(({ items }) =>
                                              items.map(
                                                  ({ resourcePath }) =>
                                                      extractSystemAndResourceId(resourcePath)
                                                          ?.systemId,
                                              ),
                                          ),
                                      ].filter(Boolean),
                                  );
                              }
                              return SystemResourcesActions.refreshSystemResources({
                                  systems: systemsToRefresh.reduce(
                                      (acc, systemId) => ({ ...acc, [systemId]: refreshConfig }),
                                      {},
                                  ),
                              });
                          }),
                      )
                    : EMPTY,
            ),
        );
    });

    updateOtherSystemResources$ = createEffect(() => {
        return this.layoutStateService.paramStateHandler.state$.pipe(
            map(
                ({
                    params: { systemId: currentSystemId },
                    queryParams: { openNodes: openSystemIds },
                }) => ({
                    currentSystemId,
                    openSystemIds,
                }),
            ),
            distinctUntilChanged((a, b) => isEqual(a, b)),
            switchMap(({ currentSystemId, openSystemIds = [] }) =>
                nxConfig.featureFlags.layoutsCrossSystemEditing && openSystemIds.length
                    ? this.systemsService.systemsSubject.pipe(
                          map(systems =>
                              systems
                                  .map(({ id }) => id)
                                  .filter(
                                      id => id !== currentSystemId && openSystemIds.includes(id),
                                  ),
                          ),
                      )
                    : Promise.resolve([] as string[]),
            ),
            distinctUntilChanged((a, b) => isEqual(a, b)),
            switchMap(otherSystems =>
                otherSystems.length
                    ? interval(5 * 1000).pipe(
                          startWith(60),
                          map(pollInterval => {
                              return SystemResourcesActions.refreshSystemResources({
                                  systems: otherSystems.reduce(
                                      (curr, systemId) => ({
                                          ...curr,
                                          [systemId]: {
                                              cameras: !(pollInterval % 6),
                                              servers: !(pollInterval % 12),
                                          },
                                      }),
                                      {},
                                  ),
                              });
                          }),
                      )
                    : EMPTY,
            ),
        );
    });

    persistLayout$ = createEffect(() => {
        return this.actions.pipe(
            ofType(SharedLayoutsActions.saveLayout),
            map(({ layoutIds }) => layoutIds),
            switchMap(layoutsToSave => {
                return this.store.select(selectUnsavedLayoutsState).pipe(
                    map(layouts => layouts.filter(({ id }) => layoutsToSave.includes(id))),
                    take(1),
                    switchMap(async layouts => {
                        const mediaserver = this.systemService.getCurrentSystem()
                            .mediaserver as NxSystemRestAPI3;

                        const overwriteLayouts = await firstValueFrom(
                            this.store.select(selectUnsavedLayoutsOverwrites),
                        );

                        const errorLayouts: UnsavedLayoutState[] = [];

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

                        const savingCrossSystemLayouts = layouts
                            .filter(({ layoutType }) => layoutType === LayoutTypes.CROSS_SYSTEM)
                            .map((unsavedLocalLayoutState: UnsavedCrossSystemLayoutState) => {
                                const serialized =
                                    this.layoutStateService.crossSystemLayoutSerializer.serialize(
                                        unsavedLocalLayoutState.layout,
                                    );
                                return firstValueFrom(
                                    this.layoutStateService.crossSystemLayoutApi
                                        .save(serialized)
                                        .pipe(
                                            catchError(() => {
                                                errorLayouts.push({
                                                    ...unsavedLocalLayoutState,
                                                    unsaved: UnsavedState.ERROR,
                                                });
                                                return of(null);
                                            }),
                                            map(layout =>
                                                this.layoutStateService.crossSystemLayoutSerializer.deserialize(
                                                    layout,
                                                ),
                                            ),
                                        ),
                                );
                            });

                        const savedLocalLayouts = (await Promise.all(savingLocalLayouts)).filter(
                            Boolean,
                        );

                        const savedCrossSystemLayouts = (
                            await Promise.all(savingCrossSystemLayouts)
                        ).filter(Boolean);

                        const toDelete = [...savedLocalLayouts, ...savedCrossSystemLayouts]
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
                                layouts: savedLocalLayouts,
                            }),
                            CrossSystemLayoutsActions.update({
                                layouts: savedCrossSystemLayouts,
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
            ofType(LocalLayoutsActions.update, CrossSystemLayoutsActions.update),
            filter(({ layouts }) => !!layouts.length),
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
        private systemsService: NxSystemsService,
    ) {}
}
