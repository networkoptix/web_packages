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
    withEntities({ entity: type<Entity>(), collection: 'icon' }),
    withEntities({ entity: type<Entity>(), collection: 'message' }),
    withComputed(store => ({
        statuses$$: computed(() => entitiesToObject(store.statusEntities())),
        icons$$: computed(() => entitiesToObject(store.iconEntities())),
        messages$$: computed(() => entitiesToObject(store.messageEntities())),
    })),
    withMethods(store => ({
        set: (
            id: string,
            error: {
                status?: string;
                icon?: string;
                message?: Translatable;
            },
        ) => {
            const updates: PartialStateUpdater<NamedEntityState<Entity, string>>[] = [];

            if (!error || !id) {
                return;
            }

            Object.keys(error).forEach(key => {
                if (error?.[key]) {
                    updates.push(setEntity({ id, value: error[key] }, { collection: key }));
                }
            });

            return patchState(store, ...updates);
        },
        remove: (
            id: string,
            clear:
                | true
                | {
                      status?: boolean;
                      icon?: boolean;
                      message?: boolean;
                  },
        ) => {
            const updates: PartialStateUpdater<NamedEntityState<Entity, string>>[] = [];

            if (!id || !clear) {
                return;
            }

            if (clear === true) {
                clear = { status: true, icon: true, message: true };
            }

            Object.keys(clear).forEach(key => {
                if (clear?.[key]) {
                    updates.push(removeEntity(id, { collection: key }));
                }
            });

            Object.entries(staticLang.layouts.itemPlaceholders.additionalErrorMessages).map(
                ([id, value]: [string, Translatable]) => ({ id, value }),
            );

            return patchState(store, ...updates);
        },
        reset: () =>
            patchState(
                store,
                removeAllEntities({ collection: 'status' }),
                removeAllEntities({ collection: 'icon' }),
                setAllEntities(
                    Object.entries(staticLang.layouts.itemPlaceholders.additionalErrorMessages).map(
                        ([id, value]: [string, string]) => ({
                            id,
                            value,
                        }),
                    ),
                    { collection: 'message' },
                ),
            ),
    })),
) {}
