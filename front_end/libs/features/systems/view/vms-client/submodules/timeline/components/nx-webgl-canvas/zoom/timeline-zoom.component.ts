import { Component, EventEmitter, Input, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { ZOOM_DIRECTION } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/zoom.types';

@UntilDestroy()
@Component({
    selector: 'nx-timeline-zoom',
    templateUrl: './timeline-zoom.component.html',
    styleUrls: ['./timeline-zoom.component.scss']
})
export class TimelineZoomComponent {
    @Input('canZoomIn') canZoomIn: boolean = false;
    @Input('canZoomOut') canZoomOut: boolean = false;

    @Output() onZoom = new EventEmitter<ZOOM_DIRECTION>();

    ZOOM_DIRECTION: ZOOM_DIRECTION;

    public startZooming($event: MouseEvent, direction: ZOOM_DIRECTION): void {
        this.onZoom.emit(direction);
        // if ($event.button !== 0) {
        //
        // }
        // this._zoomingSign = sign;
        // this._zoomingStartedTimestamp = Date.now();
    }

    public stopZooming(): void {
        // const sinceZoomingStarted = Date.now() - this._zoomingStartedTimestamp;
        // const fastClickEdge: ms = 200;
        // if (sinceZoomingStarted < fastClickEdge) {
        //     this.wheelZoom(40 * this._zoomingSign);
        // }
        // this._zoomingSign = 0;
    }

    public fullZoomOut(): void {
        // this.timeline.fullZoomOut();
    }

    public strongZoomIn(): void {
        // this.wheelZoom(80);
    }
}
