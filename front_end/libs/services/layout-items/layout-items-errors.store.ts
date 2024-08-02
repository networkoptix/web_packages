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

type Entity = { id: string; value: string };
type Collection = 'status' | 'layoutError' | 'icon' | 'message';
type Collections = [Collection];

const entitiesToObject = (entities: Entity[]): Record<string, string> =>
    entities.reduce(
        (obj: Record<string, string>, { id, value }) => ({
            ...obj,
            [id]: value,
        }),
        {},
    );

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
    withMethods(store => ({
        set: (
            id: string,
            error: {
                // only message can and should be translatable
                // ts did not let me shorthand that well
                [key in Collection]?: string | Translatable;
            },
        ) => {
            const updates: PartialStateUpdater<NamedEntityState<Entity, string>>[] = [];

            if (!error || !id) {
                return;
            }

            Object.keys(error).forEach(collection => {
                if (error?.[collection]) {
                    updates.push(setEntity({ id, value: error[collection] }, { collection }));
                }
            });

            return patchState(store, ...updates);
        },
        remove: (
            id: string,
            clear:
                | true
                | {
                      [key in Collection]?: boolean;
                  },
        ) => {
            const updates: PartialStateUpdater<NamedEntityState<Entity, string>>[] = [];

            if (!id || !clear) {
                return;
            }

            if (clear === true) {
                clear = { status: true, icon: true, message: true, layoutError: true };
            }

            Object.keys(clear).forEach(collection => {
                if (clear?.[collection]) {
                    updates.push(removeEntity(id, { collection }));
                }
            });

            Object.entries(staticLang.layouts.itemPlaceholders.additionalErrorMessages).map(
                ([id, value]: [string, Translatable]) => ({ id, value }),
            );

            return patchState(store, ...updates);
        },
        reset: (collection?: Collections) =>
            patchState(
                store,
                ...(collection ?? ['status', 'layoutError', 'icon', 'message']).map(
                    (collection: Collection) => {
                        switch (collection) {
                            case 'message':
                                return setAllEntities(
                                    Object.entries(
                                        staticLang.layouts.itemPlaceholders.additionalErrorMessages,
                                    ).map(([id, value]: [string, string]) => ({
                                        id,
                                        value,
                                    })),
                                    { collection },
                                );
                            default:
                                return removeAllEntities({ collection });
                        }
                    },
                ),
            ),
    })),
) {}
