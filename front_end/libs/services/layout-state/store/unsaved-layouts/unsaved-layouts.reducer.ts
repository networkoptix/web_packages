import { inject } from '@angular/core';
import { createReducer, on } from '@ngrx/store';

import { LayoutStateService } from '@services/layout-state/layout-state.service';
import { NxCloudApiService } from '@services/nx-cloud-api';
import { nxConfig } from '@services/nx-config/config';
import { onSyncState } from '@store/sync.utils';

import { SharedLayoutsActions } from '../shared';
import { UnsavedLayoutState, UnsavedState } from '../shared/types/layout-state.types';
import { createNewUnsavedCrossSystemLayout } from '../utils/create-new-cross-system-layout';
import {
    createNewUnsavedLocalLayout,
    createNewUnsavedLocalLayoutDuplicate,
} from '../utils/create-new-local-layout';
import {
    ensureCellAspectRatio,
    ensureCellAspectRatioOnUnsavedLayout,
} from '../utils/ensure-cell-aspect-ratio';

import * as UnsavedLayoutActions from './unsaved-layouts.actions';

export const initialState: UnsavedLayoutState[] = [];

type UnsavedLayoutsDocHandlerMethods = Pick<
    ReturnType<NxCloudApiService['docDbApi']['unsavedLayouts']['getDocHandler']>,
    'save' | 'delete' | 'list'
>;

const syncUnsavedLayoutState = (
    layouts: UnsavedLayoutState[],
    action: keyof UnsavedLayoutsDocHandlerMethods,
): UnsavedLayoutState[] => {
    LayoutStateService.runInInjectionContext(() => {
        if (!nxConfig.featureFlags.layoutsUnsavedSync) {
            return;
        }
        const { docDbApi } = inject(NxCloudApiService);
        layouts.forEach(layout => {
            if ('systemId' in layout.layout) {
                docDbApi.unsavedLayouts
                    .getDocHandler(layout.layout.systemId)
                    [action](layout)
                    .subscribe();
            }
        });
    });
    return [...layouts];
};

export const reducer = createReducer(
    initialState,
    on(UnsavedLayoutActions.set, (state, { unsavedLayouts }): UnsavedLayoutState[] =>
        unsavedLayouts.map(layout => {
            const unsavedLayout = state.find(({ id }) => id === layout.id);

            if (unsavedLayout?.unsaved === UnsavedState.PENDING) {
                return unsavedLayout;
            }

            return layout;
        }),
    ),
    on(UnsavedLayoutActions.clear, (_state): UnsavedLayoutState[] => []),
    on(
        UnsavedLayoutActions.createNewLocalLayout,
        (state, { id, name, items }): UnsavedLayoutState[] => [
            ...state,
            syncUnsavedLayoutState(
                [
                    ensureCellAspectRatioOnUnsavedLayout(
                        createNewUnsavedLocalLayout(id, name, items),
                    ),
                ],
                'save',
            ).pop() as UnsavedLayoutState,
        ],
    ),
    on(
        UnsavedLayoutActions.createNewCrossSystemLayout,
        (state, { id, name, items }): UnsavedLayoutState[] => [
            ...state,
            syncUnsavedLayoutState(
                [
                    ensureCellAspectRatioOnUnsavedLayout(
                        createNewUnsavedCrossSystemLayout(id, name, items),
                    ),
                ],
                'save',
            ).pop() as UnsavedLayoutState,
        ],
    ),
    on(UnsavedLayoutActions.duplicateLayout, (state, { id, layout }): UnsavedLayoutState[] => [
        ...state,
        syncUnsavedLayoutState(
            [createNewUnsavedLocalLayoutDuplicate(id, layout)],
            'save',
        ).pop() as UnsavedLayoutState,
    ]),
    on(
        UnsavedLayoutActions.remove,
        SharedLayoutsActions.deleteLayout,
        (state, { layoutIds }): UnsavedLayoutState[] => {
            const { removedLayouts, remainingLayouts } = state.reduce(
                (acc, layout) => {
                    if (layoutIds.includes(layout.id)) {
                        acc.removedLayouts.push(layout);
                    } else {
                        acc.remainingLayouts.push(layout);
                    }
                    return acc;
                },
                {
                    removedLayouts: [],
                    remainingLayouts: [],
                } as Record<'removedLayouts' | 'remainingLayouts', UnsavedLayoutState[]>,
            );
            syncUnsavedLayoutState(removedLayouts, 'delete');
            return remainingLayouts;
        },
    ),
    on(UnsavedLayoutActions.update, (state, { layouts }): UnsavedLayoutState[] => {
        const updatedLayouts = syncUnsavedLayoutState(layouts, 'save').map(layoutState => {
            const { layout } = layoutState;
            if (!layout.cellAspectRatio) {
                return {
                    ...layoutState,
                    layout: ensureCellAspectRatio(layout),
                };
            }
            return layoutState;
        });

        return [
            ...state.map(layout => {
                const updatedLayout = updatedLayouts.findIndex(({ id }) => id === layout.id);
                if (updatedLayout !== -1) {
                    return updatedLayouts.splice(updatedLayout).pop();
                }
                return layout;
            }),
            ...updatedLayouts,
        ];
    }),
    on(SharedLayoutsActions.saveLayout, (state, { layoutIds }): UnsavedLayoutState[] =>
        state.map(layout =>
            layoutIds.includes(layout.id) ? { ...layout, unsaved: UnsavedState.PENDING } : layout,
        ),
    ),
    onSyncState<UnsavedLayoutState[]>(),
);
