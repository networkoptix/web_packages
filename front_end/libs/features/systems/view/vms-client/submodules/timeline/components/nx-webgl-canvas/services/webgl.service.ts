import { Injectable } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import * as d3 from 'd3';
import dateFormat from 'dateformat';
import { BehaviorSubject } from 'rxjs';

import { ExportSelection } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/selection/selection.types';
import {
    ZOOM_DIRECTIONS
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/zoom.types';

import { SCROLL_DIRECTIONS } from './webgl.types';

const TIME_FORMAT = 'HH:MM:ss';
const DATE_FORMAT = 'ddd mmm dd yyyy';

@UntilDestroy()
@Injectable({
    providedIn: 'root'
})
export class NxWebGLService {
    canvasWidth$ = new BehaviorSubject<number>(0);
    canvasHeight$ = new BehaviorSubject<number>(0);
    canvasRect$ = new BehaviorSubject<DOMRect>(new DOMRect());
    xScale$ = new BehaviorSubject<d3.ScaleTime<number, number, never>>(d3.scaleUtc());
    canScroll$ = new BehaviorSubject<SCROLL_DIRECTIONS>({
        left: false,
        right: false,
    });
    canZoom$ = new BehaviorSubject<ZOOM_DIRECTIONS>({
        in: true,
        out: false,
    });
    levelZoom$ = new BehaviorSubject<number>(1);
    selectionDrag$ = new BehaviorSubject<boolean>(false);
    selection$ = new BehaviorSubject<ExportSelection>({
        active: false,
        drag: false,
        startDate: new Date(),
        endDate: new Date(),
        startDisplay: 0,
        endDisplay: 0,
        start: 0,
        end: 0,
        leftDate: '',
        leftTime: '',
        rightDate: '',
        rightTime: '',
        timelineStart: new Date(),
        timelineEnd: new Date(),
    });

    selectionReset(): void {
        this.selection$.next({
            active: false,
            drag: false,
            startDate: new Date(),
            endDate: new Date(),
            startDisplay: 0,
            endDisplay: 0,
            start: 0,
            end: 0,
            leftDate: '',
            leftTime: '',
            rightDate: '',
            rightTime: '',
            timelineStart: new Date(),
            timelineEnd: new Date(),
        });
    }

    updateSelection(): void {
        const selection = this.selection$.value;
        const xScale = this.xScale$.value;

        selection.start = xScale(selection.startDate);
        selection.end = xScale(selection.endDate);

        selection.startDisplay =
                        selection.start < 0
                            ? 0
                            : selection.start;

        selection.endDisplay =
                        selection.end > this.canvasWidth$.value
                            ? this.canvasWidth$.value
                            : selection.end;

        selection.leftDate = dateFormat(selection.startDate, DATE_FORMAT);
        selection.leftTime = dateFormat(selection.startDate, TIME_FORMAT);
        selection.rightDate = dateFormat(selection.endDate, DATE_FORMAT);
        selection.rightTime = dateFormat(selection.endDate, TIME_FORMAT);

        this.selection$.next(selection);
    }

    updateTimelineRange(): void {
        const selection = this.selection$.value;
        const xScale = this.xScale$.value;

        selection.timelineStart = xScale.domain()[0];
        selection.timelineEnd = xScale.domain()[1];

        this.selection$.next(selection);
    }
}
