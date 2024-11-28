import { computed, Injectable } from '@angular/core';
import {
    PartialStateUpdater,
    patchState,
    signalStore,
    type,
    withComputed,
    withMethods,
} from '@ngrx/signals';
import {
    NamedEntityState,
    removeAllEntities,
    removeEntity,
    setAllEntities,
    setEntity,
    withEntities,
} from '@ngrx/signals/entities';

import staticLang from '@language_static';
import { Translatable } from '@pipes/nx-translate.types';
import { nxConfig } from '@services/nx-config/config';

type Entity = { id: string; value: string };
type Collection = 'status' | 'layoutError' | 'icon' | 'message';
type Collections = [Collection];
type EntityValueParam = { [key in Collection]?: string | Translatable };
type EntityClearParam =
    | true
    | {
          [key in Collection]?: boolean;
      };

const entitiesToObject = (entities: Entity[]): Record<string, string> => {
    return entities.reduce(
        (obj: Record<string, string>, { id, value }) => ({
            ...obj,
            [id]: value,
        }),
        {},
    );
};

const helpGetAdditionalErrorMessages = (): Entity[] => {
    const result: Entity[] = [];
    Object.entries(staticLang.layouts.itemPlaceholders.additionalErrorMessages).forEach(
        ([id, value]: [string, string]) => {
            if (
                nxConfig.featureFlags.layoutsAuthorizeCamera ||
                !['unauthorized', 'defaultPassword'].includes(id)
            ) {
                result.push({
                    id,
                    value,
                });
            }
        },
    );
    return result;
};

@Injectable({
    providedIn: 'root',
})
export class LayoutItemsErrorsStore extends signalStore(
    withEntities({ entity: type<Entity>(), collection: 'status' }),
    withEntities({ entity: type<Entity>(), collection: 'layoutError' }),
    withEntities({ entity: type<Entity>(), collection: 'icon' }),
    withEntities({ entity: type<Entity>(), collection: 'message' }),
    withComputed(store => ({
        statuses$$: computed(() => entitiesToObject(store.statusEntities())),
        layoutErrors$$: computed(() => entitiesToObject(store.layoutErrorEntities())),
        icons$$: computed(() => entitiesToObject(store.iconEntities())),
        messages$$: computed(() => entitiesToObject(store.messageEntities())),
    })),
    withMethods(store => {
        function setMultipleEntities(entities: Record<string, EntityValueParam>): void {
            const updates: PartialStateUpdater<NamedEntityState<Entity, string>>[] = [];

            if (!entities || Object.keys(entities).length === 0) {
                return;
            }

            Object.entries(entities).forEach(([id, error]) => {
                Object.keys(error).forEach(collection => {
                    if (error?.[collection] && id) {
                        updates.push(setEntity({ id, value: error[collection] }, { collection }));
                    }
                });
            });

            patchState(store, ...updates);
        }
        function removeMultipleEntities(entities: Record<string, EntityClearParam>): void {
            const updates: PartialStateUpdater<NamedEntityState<Entity, string>>[] = [];

            if (!entities) {
                return;
            }

            Object.entries(entities).forEach(([id, clear]) => {
                if (clear === true) {
                    clear = { status: true, icon: true, message: true, layoutError: true };
                }
                Object.keys(clear).forEach(collection => {
                    if (clear?.[collection]) {
                        updates.push(removeEntity(id, { collection }));
                    }
                });
            });

            return patchState(store, ...updates);
        }

        return {
            set: (id: string, error: EntityValueParam) => {
                if (!id) {
                    return;
                }

                return setMultipleEntities({ [id]: error });
            },
            setMany: (entities: Record<string, EntityValueParam>) => {
                return setMultipleEntities(entities);
            },
            removeMany: (entities: Record<string, EntityClearParam>) => {
                return removeMultipleEntities(entities);
            },
            remove: (id: string, clear: EntityClearParam) => {
                if (!id || !clear) {
                    return;
                }

                return removeMultipleEntities({ [id]: clear });
            },
            reset: (collection?: Collections) => {
                return patchState(
                    store,
                    ...(collection ?? ['status', 'layoutError', 'icon', 'message']).map(
                        (collection: Collection) => {
                            switch (collection) {
                                case 'message':
                                    return setAllEntities(helpGetAdditionalErrorMessages(), {
                                        collection,
                                    });
                                default:
                                    return removeAllEntities({ collection });
                            }
                        },
                    ),
                );
            },
        };
    }),
) {}
