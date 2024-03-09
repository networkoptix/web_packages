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
    withEntities({ entity: type<Entity>(), collection: 'error' }),
    withEntities({ entity: type<Entity>(), collection: 'errorIcon' }),
    withEntities({ entity: type<Entity>(), collection: 'message' }),
    withComputed(store => ({
        errors$$: computed(() => entitiesToObject(store.errorEntities())),
        icons$$: computed(() => entitiesToObject(store.errorIconEntities())),
        messages$$: computed(() => entitiesToObject(store.messageEntities())),
    })),
    withMethods(store => ({
        set: ({
            id,
            error,
            icon,
            message,
        }: {
            id: string;
            error?: string;
            icon?: string;
            message?: Translatable;
        }) => {
            const updates: PartialStateUpdater<NamedEntityState<Entity, never>>[] = [];

            if (error) {
                updates.push(setEntity({ id, value: error }, { collection: 'error' }));
            }
            if (icon) {
                updates.push(setEntity({ id, value: icon }, { collection: 'errorIcon' }));
            }
            if (message) {
                updates.push(
                    setEntity(
                        { id, value: message },
                        {
                            collection: 'message',
                        },
                    ),
                );
            }

            return patchState(store, ...updates);
        },
        remove: ({
            errorId,
            iconId,
            messageId,
        }: {
            errorId?: string;
            iconId?: string;
            messageId?: string;
        }) => {
            const updates: PartialStateUpdater<NamedEntityState<Entity, never>>[] = [];

            if (errorId) {
                updates.push(removeEntity(errorId, { collection: 'error' }));
            }
            if (iconId) {
                updates.push(removeEntity(iconId, { collection: 'errorIcon' }));
            }
            if (messageId) {
                updates.push(removeEntity(messageId, { collection: 'message' }));
            }

            Object.entries(staticLang.layouts.additionalErrorMessages).map(
                ([id, value]: [string, Translatable]) => ({ id, value }),
            );

            return patchState(store, ...updates);
        },
        reset: () =>
            patchState(
                store,
                removeAllEntities({ collection: 'error' }),
                removeAllEntities({ collection: 'errorIcon' }),
                setAllEntities(
                    Object.entries(staticLang.layouts.additionalErrorMessages).map(
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
