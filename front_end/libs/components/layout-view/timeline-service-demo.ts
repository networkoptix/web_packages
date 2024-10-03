import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { isEqual, uniq } from 'lodash-es';
import { distinctUntilChanged, filter, map, switchMap } from 'rxjs';

import { assertResourceOfType } from '@components/layout-grid/layout-grid.type-guards';
import { LayoutSelectionStore } from '@services/layout-state/store/layout-selection.store';
import { NxTimelineService } from '@services/timeline.service';
import { CameraAndSystemIds } from '@services/timeline.service/timeline-service.types';
import { extractSystemAndResourceId } from '@utils/extract-system-and-resources';

import { NxLayoutViewComponent } from './layout-view.component';

export const registerDemoLogger = (layoutViewComponent: NxLayoutViewComponent): void => {
    const timelineService = inject(NxTimelineService);
    const layoutSelectionStore = inject(LayoutSelectionStore);
    const playingCamera$ = toObservable(layoutSelectionStore.playingLayoutItem$$);
    layoutViewComponent.layoutAndItems$
        .pipe(
            map(([{ items }, lookup]) =>
                uniq(
                    items
                        .map(({ resourceId }) => lookup[resourceId])
                        .map(item =>
                            assertResourceOfType.camera(item)
                                ? { id: item.details.id, systemId: item.details.systemId }
                                : null,
                        )
                        .filter(item => !!item),
                ),
            ),
            distinctUntilChanged((a, b) => isEqual(a, b)),
            filter((cameras): cameras is CameraAndSystemIds => cameras?.length > 0),
            switchMap(cameras =>
                playingCamera$.pipe(
                    filter(camera => !!camera && !!camera.id),
                    switchMap(cameraId =>
                        timelineService.groupByMainAndOtherCameras(
                            cameras,
                            (() => {
                                const { systemId, resourceId: id } = extractSystemAndResourceId(
                                    cameraId.resourcePath,
                                );
                                return { id, systemId };
                            })(),
                        ),
                    ),
                ),
            ),
        )
        .subscribe(details => {
            console.info('timeLineDetails', details);
        });
};
