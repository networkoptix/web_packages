import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { isEqual, uniq } from 'lodash-es';
import {
    catchError,
    distinctUntilChanged,
    EMPTY,
    filter,
    firstValueFrom,
    from,
    interval,
    map,
    of,
    shareReplay,
    startWith,
    switchMap,
    take,
    tap,
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
import { SharedLayoutsActions, SharedLayoutsSelectors } from './store/shared';
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
                                  const myOnlineSystems =
                                      this.systemsService
                                          .systems$$()
                                          ?.filter(
                                              ({ stateOfHealth }) => stateOfHealth === 'online',
                                          )
                                          .map(({ id }) => id) || [];

                                  systemsToRefresh = uniq(
                                      [
                                          systemId,
                                          ...crossSystemLayouts.flatMap(({ items, id }) =>
                                              cleanId(id) !== layoutId
                                                  ? []
                                                  : items.map(
                                                        ({ resourcePath }) =>
                                                            extractSystemAndResourceId(resourcePath)
                                                                ?.systemId,
                                                    ),
                                          ),
                                      ].filter(id => myOnlineSystems.includes(id)),
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

    syncInterval$ = interval(5 * 1000).pipe(shareReplay({ refCount: false, bufferSize: 1 }));

    lastUpdateLookup: Record<string, number> = {};

    updateOtherSystemResources$ = createEffect(() => {
        return this.layoutStateService.paramStateHandler.state$.pipe(
            map(
                ({
                    params: { systemId: currentSystemId, layoutId },
                    queryParams: { openNodes: openSystemIds = [] },
                }) => ({
                    currentSystemId,
                    openSystemIds,
                    layoutId,
                }),
            ),
            filter(({ currentSystemId }) => !!currentSystemId),
            distinctUntilChanged((a, b) => isEqual(a, b)),
            switchMap(({ currentSystemId, openSystemIds }) =>
                this.store.select(SharedLayoutsSelectors.selectOtherSystems(currentSystemId)).pipe(
                    map(currentLayoutSystems => ({
                        currentLayoutSystems,
                        currentSystemId,
                        openSystemIds,
                    })),
                ),
            ),
            switchMap(({ currentSystemId, openSystemIds, currentLayoutSystems }) => {
                return nxConfig.featureFlags.layoutsCrossSystem && openSystemIds.length
                    ? this.systemsService.systemsSubject.pipe(
                          map(systems =>
                              systems
                                  .filter(
                                      ({ id, stateOfHealth }) =>
                                          id !== currentSystemId &&
                                          stateOfHealth === 'online' &&
                                          [...openSystemIds, ...currentLayoutSystems].includes(id),
                                  )
                                  .map(({ id }) => id),
                          ),
                      )
                    : Promise.resolve([] as string[]);
            }),
            distinctUntilChanged((a, b) => isEqual(a, b)),
            switchMap(otherSystems => {
                const currentResources = this.store.selectSignal(
                    SystemResourcesSelectors.selectSystemResourcesState,
                )();
                const currentTime = Date.now();

                const systemsToUpdate = otherSystems.filter(
                    id =>
                        !this.lastUpdateLookup[id] ||
                        this.lastUpdateLookup[id] < currentTime - 30 * 1000,
                );

                systemsToUpdate.forEach(id => {
                    this.lastUpdateLookup[id] = currentTime;
                });

                return systemsToUpdate.length
                    ? this.syncInterval$.pipe(
                          startWith(60),
                          map(pollInterval => {
                              return SystemResourcesActions.refreshSystemResources({
                                  systems: systemsToUpdate.reduce(
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
                          startWith(
                              SystemResourcesActions.refreshSystemResources({
                                  systems: systemsToUpdate.reduce((curr, systemId) => {
                                      if (systemId in currentResources) {
                                          return curr;
                                      }

                                      return {
                                          ...curr,
                                          [systemId]: {
                                              cameras: true,
                                              servers: true,
                                          },
                                      };
                                  }, {}),
                              }),
                          ),
                      )
                    : EMPTY;
            }),
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
                        const toDelete: string[] = [];

                        const savingLocalLayouts = layouts
                            .filter(({ layoutType }) => layoutType === LayoutTypes.LOCAL)
                            .map((unsavedLocalLayoutState: UnsavedLocalLayoutState) => {
                                const {
                                    layout: { id, ...layout },
                                } = unsavedLocalLayoutState;
                                const layoutIdToOverwrite = overwriteLayouts[id];
                                return firstValueFrom(
                                    mediaserver.putLayout(layoutIdToOverwrite || id, layout).pipe(
                                        catchError(() => {
                                            errorLayouts.push({
                                                ...unsavedLocalLayoutState,
                                                unsaved: UnsavedState.ERROR,
                                            });
                                            return of(null);
                                        }),
                                        tap(() => {
                                            if (layoutIdToOverwrite) {
                                                toDelete.push(id);
                                            }
                                        }),
                                    ),
                                );
                            });

                        const savingCrossSystemLayouts = layouts
                            .filter(({ layoutType }) => layoutType === LayoutTypes.CROSS_SYSTEM)
                            .map((unsavedCrossSystemLayoutState: UnsavedCrossSystemLayoutState) => {
                                const initialLayoutId = unsavedCrossSystemLayoutState.layout.id;
                                const layoutIdToOverwrite = overwriteLayouts[initialLayoutId];
                                const serialized =
                                    this.layoutStateService.crossSystemLayoutSerializer.serialize({
                                        ...unsavedCrossSystemLayoutState.layout,
                                        id: layoutIdToOverwrite || initialLayoutId,
                                    });
                                return firstValueFrom(
                                    this.layoutStateService.crossSystemLayoutApi
                                        .save(serialized)
                                        .pipe(
                                            catchError(() => {
                                                errorLayouts.push({
                                                    ...unsavedCrossSystemLayoutState,
                                                    unsaved: UnsavedState.ERROR,
                                                });
                                                return of(null);
                                            }),
                                            map(layout => {
                                                if (layoutIdToOverwrite) {
                                                    toDelete.push(initialLayoutId);
                                                }
                                                return this.layoutStateService.crossSystemLayoutSerializer.deserialize(
                                                    layout,
                                                );
                                            }),
                                        ),
                                );
                            });

                        const savedLocalLayouts = (await Promise.all(savingLocalLayouts)).filter(
                            Boolean,
                        );

                        const savedCrossSystemLayouts = (
                            await Promise.all(savingCrossSystemLayouts)
                        ).filter(Boolean);

                        toDelete.push(
                            ...([...savedLocalLayouts, ...savedCrossSystemLayouts]
                                .map(({ id }) =>
                                    Object.keys(overwriteLayouts).find(layoutId => layoutId === id),
                                )
                                .filter(Boolean) as string[]),
                        );

                        const { params: { layoutId } = {} } =
                            this.layoutStateService.paramStateHandler.state$$();

                        if (layoutId && toDelete.map(cleanId).includes(layoutId)) {
                            this.layoutStateService.paramStateHandler.state$$.set({
                                params: { layoutId: cleanId(overwriteLayouts[dirtyId(layoutId)]) },
                            });
                        }

                        return [
                            LocalLayoutsActions.update({
                                layouts: savedLocalLayouts.filter(
                                    ({ id }) => !toDelete.includes(id),
                                ),
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
            map(({ layoutIds }) => {
                const layouts = this.store.selectSignal(selectLayoutsState)();
                return layoutIds.reduce(
                    (acc, id) => {
                        const isLocalLayout = layouts.find(
                            ({ id: layoutId, layoutType }) =>
                                layoutId === id && layoutType === LayoutTypes.LOCAL,
                        );

                        (isLocalLayout ? acc.localLayouts : acc.crossSystemLayouts).push(id);
                        return acc;
                    },
                    { localLayouts: [] as string[], crossSystemLayouts: [] as string[] } as const,
                );
            }),
            switchMap(async ({ localLayouts, crossSystemLayouts }) => {
                const mediaserver = this.systemService.getCurrentSystem()
                    .mediaserver as NxSystemRestAPI3;
                const deletedLocalLayouts = localLayouts.map(layoutId =>
                    firstValueFrom(
                        mediaserver.deleteLayout(layoutId).pipe(
                            map(() => layoutId),
                            catchError(() => of(null)),
                        ),
                    ),
                );

                const deletedCrossSystemLayouts = crossSystemLayouts.map(layoutId => {
                    const cleanedLayoutId = cleanId(layoutId);
                    return firstValueFrom(
                        this.layoutStateService.crossSystemLayoutApi
                            .delete(`${cleanedLayoutId}.json`)
                            .pipe(
                                map(() => cleanedLayoutId),
                                catchError(() => of(null)),
                            ),
                    );
                });

                const removedLocalLayouts = await Promise.all(deletedLocalLayouts);
                const removedCrossSystemLayouts = await Promise.all(deletedCrossSystemLayouts);

                return [
                    LocalLayoutsActions.remove({
                        layoutIds: removedLocalLayouts.filter(Boolean),
                    }),
                    CrossSystemLayoutsActions.remove({
                        layoutIds: removedCrossSystemLayouts.filter(Boolean),
                    }),
                ];
            }),
            switchMap(actions => from(actions)),
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
