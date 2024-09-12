import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UntilDestroy } from '@ngneat/until-destroy';
import * as d3 from 'd3';
import { WebRTCStreamManager } from 'nx-open-web/packages/webrtc-stream-manager';
import { BehaviorSubject, filter, map, merge, skip, startWith, switchMap, take, timer } from 'rxjs';

import { ExportSelection } from '@components/nx-webgl-canvas/interactions/selection/selection.types';
import { DATA } from '@components/nx-webgl-canvas/webgl-canvas.types';
import { ZOOM_DIRECTIONS } from '@components/nx-webgl-canvas/zoom/zoom.types';
import staticLang from '@language_static';
import { LayoutItemsErrorsStore } from '@services/layout-items/layout-items-errors.store';
import { CameraAndSystemId } from '@services/timeline.service/timeline-service.types';
import { pipeSignal } from '@utils/signals';

import { SCROLL_DIRECTIONS } from './webgl.types';

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class NxWebGLService {
    layoutItemErrorStore = inject(LayoutItemsErrorsStore);
    canvasWidth$ = new BehaviorSubject<number>(0);
    canvasHeight$ = new BehaviorSubject<number>(0);
    canvasRect$ = new BehaviorSubject<DOMRect>(new DOMRect());
    xScaleOriginal$ = new BehaviorSubject<d3.ScaleTime<number, number, never>>(d3.scaleUtc());
    xScale$$ = signal<d3.ScaleTime<number, number, never>>(d3.scaleUtc());
    canScroll$ = new BehaviorSubject<SCROLL_DIRECTIONS>({
        left: false,
        right: false,
    });
    canZoom$ = new BehaviorSubject<ZOOM_DIRECTIONS>({
        in: true,
        out: false,
    });
    selectionDrag$ = new BehaviorSubject<boolean>(false);
    scrollBarScroll$ = new BehaviorSubject<boolean>(false);

    selection = {
        active: false,
        drag: false,
        startDate: undefined,
        endDate: undefined,
        startDisplay: 0,
        endDisplay: 0,
        start: 0,
        end: 0,
        leftDate: '',
        leftTime: '',
        rightDate: '',
        rightTime: '',
        timelineStart: undefined,
        timelineEnd: undefined,
        widthInPx: 0,
    };
    selection$ = new BehaviorSubject<ExportSelection>(this.selection);

    levelZoom$$ = signal<number>(1);
    levelZoom$ = toObservable(this.levelZoom$$);
    currentPointer$$ = signal<number | undefined>(undefined);
    playbackPosition$$ = signal<number | undefined>(undefined);
    playbackPosition$ = toObservable(this.playbackPosition$$);
    cameraId$$ = signal<CameraAndSystemId | null>(null);
    playbackTimeMs$$ = signal<number | undefined>(undefined);
    playbackTimeMs$ = toObservable(this.playbackTimeMs$$).pipe(map(val => val || 0));
    timestampFromPlayer$$ = pipeSignal(
        this.cameraId$$,
        cameraId$ =>
            merge(
                cameraId$.pipe(
                    map(cameraId => cameraId?.id && WebRTCStreamManager.getInstance(cameraId)),
                    filter(Boolean),
                    switchMap(instance => instance.currentPosition$),
                    skip(1),
                ),
                this.playbackTimeMs$.pipe(map(val => (val || 0) * 1000)),
            ).pipe(filter(val => val >= 0)),
        -1,
    );

    smoothTimestampFromPlayers$$ = pipeSignal(
        this.timestampFromPlayer$$,
        timestamp$ =>
            timestamp$.pipe(
                filter(val => val > 0),
                switchMap(val => {
                    const timestamp = val / 1000;
                    const intervalTime = 1000 / 60;
                    return timer(0, intervalTime).pipe(
                        map(frame => timestamp + frame * intervalTime),
                        startWith(timestamp),
                        take(180),
                    );
                }),
            ),
        0,
    );
    smoothPlaybackTimestamp$$ = computed(() => {
        const initialTimestamp = this.playbackTimeMs$$() || 0;
        const timestamp = this.smoothTimestampFromPlayers$$();
        return Math.max(initialTimestamp, timestamp);
    });
    smoothPlaybackPosition$$ = computed(() => {
        const timestamp = this.smoothPlaybackTimestamp$$();
        return this.xScale$$()(new Date(timestamp));
    });

    persistCurrentTimeStamp$$ = signal(true);

    resetPosition(): void {
        this.playbackPosition$$.set(undefined);
        this.playbackTimeMs$$.set(undefined);
    }

    goToLive(): void {
        const cameraId = this.cameraId$$();
        if (cameraId) {
            this.playbackTimeMs$$.set(Date.now() + 1000);
            // const error = this.layoutItemErrorStore.statuses$$()[cameraId.id];
            // if (error === staticLang.common.cameraStates.unavailable.toLowerCase()) {
            //     this.layoutItemErrorStore.remove(cameraId.id, true);
            // }
            // WebRTCStreamManager.updateCameraPosition(cameraId.id, 0);
        }
    }

    autoResetPosition = effect(
        () => {
            if (!this.persistCurrentTimeStamp$$()) {
                this.cameraId$$();
                this.resetPosition();
            }
        },
        { allowSignalWrites: true },
    );

    syncTimestampEffect = effect(
        () => {
            const timestamp = this.timestampFromPlayer$$();
            if (timestamp !== -1) {
                const position = this.xScale$$()(new Date(timestamp / 1000));
                this.playbackPosition$$.set(position);
            }
        },
        { allowSignalWrites: true },
    );

    lastTimestamp$$ = pipeSignal(
        this.timestampFromPlayer$$,
        timestamp$ => timestamp$.pipe(filter(val => val >= 0)),
        -1,
    );

    playbackEffect = effect(
        () => {
            const playbackTimeMs = this.playbackTimeMs$$() || 0;
            const cameraId = this.cameraId$$();
            if (playbackTimeMs && cameraId) {
                const error = this.layoutItemErrorStore.statuses$$()[cameraId.id];
                if (error === staticLang.common.cameraStates.unavailable.toLowerCase()) {
                    this.layoutItemErrorStore.remove(cameraId.id, true);
                }
                WebRTCStreamManager.updateCameraPosition(
                    cameraId,
                    playbackTimeMs > Date.now() ? 0 : playbackTimeMs,
                );
            }
        },
        { allowSignalWrites: true },
    );

    selectionReset(): void {
        this.selection$.next({
            active: false,
            drag: false,
            startDate: undefined,
            endDate: undefined,
            startDisplay: 0,
            endDisplay: 0,
            start: 0,
            end: 0,
            leftDate: '',
            leftTime: '',
            rightDate: '',
            rightTime: '',
            timelineStart: undefined,
            timelineEnd: undefined,
            widthInPx: 0,
        });
    }

    // updateSelection(): void {
    //     const selection = this.selection$.value;
    //
    //     selection.leftDate = dateFormat(selection.startDate, DATE_FORMAT);
    //     selection.leftTime = dateFormat(selection.startDate, TIME_FORMAT);
    //     selection.rightDate = dateFormat(selection.endDate, DATE_FORMAT);
    //     selection.rightTime = dateFormat(selection.endDate, TIME_FORMAT);
    //
    //     this.selection$.next(selection);
    // }

    updateTimelineRange(): void {
        const selection = this.selection$.value;
        const xScale = this.xScale$$();

        selection.timelineStart = xScale.domain()[0];
        selection.timelineEnd = xScale.domain()[1];

        this.selection$.next(selection);
    }

    chunkSearch(data: DATA[], target: number): number | undefined {
        const targetChunk = data.find(
            chunk =>
                chunk.realTimeMs >= target ||
                (chunk.realTimeMs <= target && chunk.realTimeMs + chunk.width >= target),
        );

        if (!targetChunk) {
            return;
        }
        return Math.max(targetChunk.realTimeMs, target);
    }
}
