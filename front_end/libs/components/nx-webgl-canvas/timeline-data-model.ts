import { computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NEVER, Observable, combineLatest, switchMap } from 'rxjs';

import { CHUNK_TYPE, DATA } from '@components/nx-webgl-canvas/webgl-canvas.types';
import { NxSystemCamera } from '@services/system.service/camera-manager/camera-manager-types';
import { NxTimelineService } from '@services/timeline.service';
import {
    CameraAndSystemId,
    PeriodDetailByMainAndOther,
    TimePeriod,
} from '@services/timeline.service/timeline-service.types';
import { cleanId } from '@utils/general';

/**
 * This class handles managing the data for the timeline.
 *
 * It is responsible for:
 * - Updating the selection model when camera or cameras change.
 * - Pushing updated state to other components via the state$$ signal.
 *
 * Public API:
 * - updateCameras: Updates the cameras for the timeline data.
 * - updateSelectedCameraId: Updates the selected camera id.
 * - state$$: Signal of the current data model state.
 */
export class TimelineDataModel {
    // PUBLIC API

    /**
     * Update list of all cameras where we want to observe timeline data changes.
     *
     * @param cameras Cameras to update the data model with.
     */
    public updateCameras(cameras: NxSystemCamera[]): void {
        this.cameras$$.set(cameras);
    }

    /**
     * Update the camera that we want to individually observe timeline data changes.
     *
     * @param cameraId The camera id for selected camera.
     */
    public updateSelectedCameraId(cameraId: CameraAndSystemId): void {
        this.selectedCameraId$$.set(cameraId);
    }

    /**
     * Signal of the current data model state.
     */
    public state$$ = computed(() => {
        const mainCameraData = this.mainCameraData$$();
        const allCamerasData = this.allCamerasData$$();
        const loading = !mainCameraData;
        const cameras = this.cameras$$();
        const selectedCameraId = this.selectedCameraId$$();
        const selectedCamera = cameras.find(
            camera =>
                selectedCameraId &&
                cleanId(camera.id) === cleanId(selectedCameraId.id) &&
                cleanId(camera.systemId) === cleanId(selectedCameraId.systemId),
        );
        const camerasCount = cameras.length;

        return {
            cameras,
            mainCameraData,
            allCamerasData,
            selectedCameraId,
            selectedCamera,
            camerasCount,
            loading,
        };
    });

    // INTERNAL

    private timelineService = inject(NxTimelineService);
    private selectedCameraId$$ = signal<CameraAndSystemId | null>(null);
    private cameras$$ = signal<NxSystemCamera[]>([]);

    private timeDetails$$ = toSignal(
        combineLatest(toObservable(this.selectedCameraId$$), toObservable(this.cameras$$)).pipe(
            switchMap(([selectedCameraId, cameras]) =>
                selectedCameraId
                    ? this.timelineService.groupByMainAndOtherCameras(cameras, selectedCameraId)
                    : (NEVER as Observable<PeriodDetailByMainAndOther | null>),
            ),
        ),
    );

    private mainCameraData$$ = computed<DATA[] | null>(() => {
        const timeDetails = this.timeDetails$$();
        if (!timeDetails?.main) {
            return null;
        }
        return timeDetails.main.map(period => this.periodToChunk(period));
    });

    private allCamerasData$$ = computed<DATA[]>(() => {
        const timeDetails = this.timeDetails$$();
        if (!timeDetails?.main) {
            return [];
        }
        return [...timeDetails.other, ...timeDetails.main]
            .map(period => this.periodToChunk(period, true))
            .sort((a, b) => a.x - b.x);
    });

    // check if new chunk starting time is within previous chunk duration
    protected checkChunkInProgress(newChunk: DATA): DATA {
        // TODO: This needs to be refactored to not be so tightly coupled with the render state.
        // This isn't really related to the data model and more related to the rendering of the data.

        // if (newChunk.type === CHUNK_TYPE.IN_PROGRESS) {
        //     this.newDataDateStart = new Date(newChunk.x);
        //     let lastData: DATA | undefined;
        //     // this.mainCameraData$$.update(data => {
        //     //     const dataLen = Math.max(data.length - 1, 0);
        //     //     lastData = data?.[dataLen];
        //     //     return data.slice(0, dataLen);
        //     // });
        //     // test data ***********************
        //     if (lastData) {
        //         this.lastDataDateStart = new Date(lastData.realTimeMs);
        //         this.lastDataDateEnd = new Date(lastData.realTimeMs + lastData.width);
        //     } else {
        //         this.lastDataDateStart = new Date(newChunk.realTimeMs);
        //         this.lastDataDateEnd = new Date(newChunk.realTimeMs + newChunk.width);
        //     }
        //     // *********************************
        //     if (lastData && lastData.x + lastData.width > newChunk.x) {
        //         return {
        //             x: lastData.x,
        //             y: 30,
        //             width: Date.now() - lastData.realTimeMs,
        //             realTimeMs: lastData.realTimeMs,
        //             type: CHUNK_TYPE.IN_PROGRESS,
        //         };
        //     } else {
        //         // return last record
        //         if (lastData) {
        //             // this.mainCameraData$$.update(data => [
        //             //     ...(data || []),
        //             //     {
        //             //         x: lastData?.x || 0,
        //             //         y: 30,
        //             //         realTimeMs: lastData?.realTimeMs || 0,
        //             //         width: lastData?.width || 0,
        //             //         type: CHUNK_TYPE.RECORDS,
        //             //     },
        //             // ]);
        //         }
        //         // add new chunk in progress
        //         return newChunk;
        //     }
        // }
        // Throws error if not in progress
        return newChunk;
    }

    private periodToChunk(period: TimePeriod, skipChunkInProgress = false): DATA {
        const realTimeMs = +period.startTimeMs;
        const duration = +period.durationMs;
        const durationMs = duration > 1 ? duration : Date.now() - realTimeMs;
        const type = duration > 1 ? CHUNK_TYPE.RECORDS : CHUNK_TYPE.IN_PROGRESS;

        // align bar to start time (otherwise centered)
        const startTimeMs = realTimeMs + Math.trunc(durationMs / 2);

        const newChunk = {
            x: startTimeMs,
            y: 30,
            realTimeMs,
            width: durationMs,
            type,
        };

        if (!skipChunkInProgress && type === CHUNK_TYPE.IN_PROGRESS) {
            // return this.checkChunkInProgress(newChunk);
        }

        return newChunk;
    }
}
