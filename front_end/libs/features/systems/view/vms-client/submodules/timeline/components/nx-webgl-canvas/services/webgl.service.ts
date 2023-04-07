import { Injectable } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import * as d3 from 'd3';
import { BehaviorSubject } from 'rxjs';

import {
    ZOOM_DIRECTIONS
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/zoom.types';

import { SCROLL_DIRECTIONS } from './webgl.types';

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
}
