import { computed, inject } from '@angular/core';
import { patchState, signalStore, type, withComputed, withMethods } from '@ngrx/signals';
import { setEntity, withEntities } from '@ngrx/signals/entities';
import { isEqual } from 'lodash-es';

import { NxParamStateService } from '@services/param-state/param-state.service';
import { LayoutItem } from '@services/system-api.types/layouts.types';
import { cleanId } from '@utils/general';

export interface SelectedState {
    /**
     * Layout id
     */
    id: string;
    /**
     * Layout item id and resourcePath
     */
    selected: {
        id: string;
        resourcePath: string;
    };
    /**
     * Is initial or user selected
     */
    initial: boolean;
}

const selectedStateEntity = { collection: 'selectedState' } as const;

export const SelectedCameraStore = signalStore(
    { providedIn: 'root' },
    withEntities({ entity: type<SelectedState>(), ...selectedStateEntity }),
    withComputed(store => {
        const paramStateService = inject(NxParamStateService);
        const currentLayoutId$$ = paramStateService
            .getStateHandler(state => state.params.layoutId)
            .state$$.asReadonly();

        const selectedLayoutItemState$$ = computed(() => {
            const id = currentLayoutId$$();
            return (
                store.selectedStateEntityMap()[id] || {
                    id,
                    selected: { id: '', resourcePath: '' },
                    initial: true,
                }
            );
        });

        const selectedLayoutItem$$ = computed(() => {
            const layoutId = currentLayoutId$$();
            const selectedStateMap = store.selectedStateEntityMap()[layoutId];
            return selectedStateMap?.selected;
        });

        const manuallySelectedEntities$$ = computed(
            () => {
                return store.selectedStateEntities().filter(entity => !entity.initial);
            },
            { equal: (a, b) => isEqual(a, b) },
        );

        return {
            currentLayoutId$$,
            selectedLayoutItemState$$,
            selectedLayoutItem$$,
            manuallySelectedEntities$$,
        };
    }),
    withMethods(store => {
        const updateSelectedResource = (
            layoutItem: Pick<LayoutItem, 'id' | 'resourcePath'>,
            initial = false,
        ): void => {
            const id = store.currentLayoutId$$();
            const selected = {
                id: cleanId(layoutItem.id),
                resourcePath: layoutItem.resourcePath,
            };
            patchState(store, setEntity({ id, selected, initial }, selectedStateEntity));
        };

        return {
            updateSelectedResource,
        };
    }),
);
