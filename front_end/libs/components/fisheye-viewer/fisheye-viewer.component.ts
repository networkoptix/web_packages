/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { CommonModule } from '@angular/common';
import { Component, computed, effect, ElementRef, inject, input, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { isEqual } from 'lodash-es';

import { SharedLayoutsSelectors } from '@services/layout-state/store/shared';
import { UnsavedState } from '@services/layout-state/store/shared/types/layout-state.types';
import { UnsavedLayoutsActions } from '@services/layout-state/store/unsaved-layouts';
import { nxConfig } from '@services/nx-config/config';

import { FisheyeRenderer, FisheyeViewerDewarpingParams } from './fisheye-renderer';

@Component({
    selector: 'nx-fisheye-viewer',
    standalone: true,
    imports: [CommonModule],
    template: '',
})
export class NxFisheyeViewerComponent extends FisheyeRenderer {
    source = input.required<HTMLVideoElement>();
    dewarpingParams = input.required<FisheyeViewerDewarpingParams>();
    layoutItemId = input.required<string>();
    store = inject(Store);
    updated = signal(false);

    dewarpingParamsUnique = computed(() => this.dewarpingParams(), {
        equal: (a, b) => isEqual(a, b),
    });

    currentLayout = this.store.selectSignal(SharedLayoutsSelectors.selectCurrentLayoutState);

    override controlsUpdatesHandler = (
        updated: Pick<
            FisheyeViewerDewarpingParams['dewarpingParamsItem'],
            'xAngle' | 'yAngle' | 'fov'
        >,
    ) => {
        this.updated.set(true);

        if (!nxConfig.featureFlags.layoutsEditable && !nxConfig.featureFlags.layoutsFisheye) {
            return;
        }

        const layout = structuredClone(this.currentLayout());

        const updatedItem = layout.layout.items.find(({ id }) => id === this.layoutItemId());
        if (updatedItem) {
            updatedItem.dewarpingParams = {
                ...updatedItem.dewarpingParams,
                ...updated,
            };
            this.store.dispatch(
                UnsavedLayoutsActions.update({
                    layouts: [
                        {
                            ...layout,
                            unsaved: UnsavedState.UNSAVED,
                        },
                    ],
                }),
            );
        }
    };

    current = inject(ElementRef);

    resetUpdatedEffect = effect(
        () => {
            const currentLayout = this.currentLayout();

            if (currentLayout.unsaved === UnsavedState.SAVED) {
                this.updated.set(false);
            }
        },
        { allowSignalWrites: true },
    );

    initEffect = effect(() => {
        const source = this.source();
        const target = this.current.nativeElement;
        const dewarpingParams = !this.updated() && this.dewarpingParamsUnique();
        if (source && target && dewarpingParams) {
            this.start(source, target, dewarpingParams);
        }
    });

    ngOnDestroy() {
        this.end(this.current.nativeElement);
    }
}
