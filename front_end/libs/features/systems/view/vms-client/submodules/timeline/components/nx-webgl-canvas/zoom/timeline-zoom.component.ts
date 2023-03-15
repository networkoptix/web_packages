import { Component, EventEmitter, Output } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';
import {
    ZOOM_DIRECTION
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/zoom/zoom.types';

@UntilDestroy()
@Component({
    selector: 'nx-timeline-zoom',
    templateUrl: './timeline-zoom.component.html',
    styleUrls: ['./timeline-zoom.component.scss']
})
export class TimelineZoomComponent {
    @Output() onZoom = new EventEmitter<ZOOM_DIRECTION>();
    @Output() constantZoom = new EventEmitter<{
        direction: ZOOM_DIRECTION;
        action: string;
    }>();

    canZoomIn: boolean = false;
    canZoomOut: boolean = false;
    continuousZoom: boolean = false;

    ZOOM_DIRECTION = ZOOM_DIRECTION;

    constructor(
        webglService: NxWebGLService,
    ) {
        webglService.canZoom$
            .pipe(untilDestroyed(this))
            .subscribe(subject => {
                this.canZoomIn = subject.in;
                this.canZoomOut = subject.out;
            });
    }

    doZoom(direction: ZOOM_DIRECTION): void {
        if (direction === ZOOM_DIRECTION.constantIn || direction === ZOOM_DIRECTION.constantOut) {
            this.continuousZoom = true;
            this.constantZoom.emit({
                direction,
                action: 'start'
            });
            return;
        }
        this.onZoom.emit(direction);
    }

    stopZoom(direction: ZOOM_DIRECTION): void {
        if (this.continuousZoom) {
            this.continuousZoom = false;
            this.constantZoom.emit({
                direction,
                action: 'stop'
            });
        }
    }
}
