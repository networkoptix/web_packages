import { Component } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';

@UntilDestroy()
@Component({
    selector: 'nx-timeline-interactions',
    templateUrl: './timeline-interactions.component.html',
    styleUrls: ['./timeline-interactions.component.scss'],
})
export class WebGlTimelineInteractionsComponent {
    timeLabelPosition: number | undefined;

    constructor(webglService: NxWebGLService) {}

    handleMouseMove(event: MouseEvent): void {
        if (event.offsetY > 5) {
            // avoid triggering at bottom scroll area
            this.timeLabelPosition = event.offsetX;
        }
    }

    handleMouseLeave(): void {
        this.timeLabelPosition = undefined;
    }

    handleMouseWheel(event: MouseEvent): void {
        // console.log('wheel => ', event);
    }

    handleMouseClick(event: MouseEvent): void {
        // console.log('click => ', event);
    }
}
