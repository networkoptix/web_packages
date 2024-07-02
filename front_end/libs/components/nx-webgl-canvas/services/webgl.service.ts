import { effect, Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { UntilDestroy } from '@ngneat/until-destroy';
import * as d3 from 'd3';
import { WebRTCStreamManager } from 'nx-open-web/packages/webrtc-stream-manager';
import { BehaviorSubject, filter, map, switchMap } from 'rxjs';

import { ExportSelection } from '@components/nx-webgl-canvas/interactions/selection/selection.types';
import { DATA } from '@components/nx-webgl-canvas/webgl-canvas.types';
import { ZOOM_DIRECTIONS } from '@components/nx-webgl-canvas/zoom/zoom.types';
import { pipeSignal } from '@utils/signals';

import { SCROLL_DIRECTIONS } from './webgl.types';

@UntilDestroy()
@Injectable({
    providedIn: 'root',
})
export class NxWebGLService {
    canvasWidth$ = new BehaviorSubject<number>(0);
    canvasHeight$ = new BehaviorSubject<number>(0);
    canvasRect$ = new BehaviorSubject<DOMRect>(new DOMRect());
    xScaleOriginal$ = new BehaviorSubject<d3.ScaleTime<number, number, never>>(d3.scaleUtc());
    xScale$ = new BehaviorSubject<d3.ScaleTime<number, number, never>>(d3.scaleUtc());
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
    playbackPosition$$ = signal<number>(undefined);
    playbackPosition$ = toObservable(this.playbackPosition$$);
    playbackTimeMs$$ = signal<number | undefined>(undefined);
    cameraId$$ = signal('');

    resetPosition(): void {
        this.playbackPosition$$.set(undefined);
        this.playbackTimeMs$$.set(undefined);
    }

    timestampFromPlayer$$ = pipeSignal(
        this.cameraId$$,
        cameraId$ =>
            cameraId$.pipe(
                map(cameraId => WebRTCStreamManager.getInstance(cameraId)),
                filter(Boolean),
                switchMap(instance => instance!.currentPosition$),
            ),
        -1,
    );

    syncTimestampEffect = effect(
        () => {
            const timestamp = this.timestampFromPlayer$$();
            if (timestamp !== -1) {
                const position = this.xScale$.value(new Date(timestamp / 1000));
                console.info('syncTimestampEffect', timestamp, position);
                this.playbackPosition$$.set(position);
            }
        },
        { allowSignalWrites: true },
    );

    playbackEffect = effect(
        () => {
            const playbackTimeMs = this.playbackTimeMs$$() || 0;
            const cameraId = this.cameraId$$();
            if (playbackTimeMs && cameraId) {
                WebRTCStreamManager.updateCameraPosition(cameraId, playbackTimeMs);
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
        const xScale = this.xScale$.value;

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
