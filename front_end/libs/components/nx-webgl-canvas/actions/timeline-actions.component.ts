import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { timeDays } from 'd3';

import { WebGlTimelineActionsSoundComponent } from '@components/nx-webgl-canvas/actions/actions-sound/actions-sound.component';
import { WebGlTimelinePlaybackModeComponent } from '@components/nx-webgl-canvas/actions/playback-mode/playback-mode.component';
import { WebGlTimelineTimeNavComponent } from '@components/nx-webgl-canvas/actions/time-nav/time-nav.component';
import { NxWebGLService } from '@components/nx-webgl-canvas/services/webgl.service';

@UntilDestroy()
@Component({
    selector: 'nx-timeline-actions',
    templateUrl: './timeline-actions.component.html',
    styleUrls: ['./timeline-actions.component.scss'],
    standalone: true,
    imports: [
        CommonModule,
        WebGlTimelinePlaybackModeComponent,
        WebGlTimelineActionsSoundComponent,
        WebGlTimelineTimeNavComponent,
    ],
})
export class WebGlTimelineActionsComponent {
    @Output() onActions = new EventEmitter<Record<string, unknown>>();

    overallDays: number;
    time: string;

    constructor(webglService: NxWebGLService) {
        webglService.xScaleOriginal$.subscribe(xScale => {
            // use overallDays to limit time nav options
            this.overallDays = timeDays(xScale.domain()[0], xScale.domain()[1]).length;
        });
    }

    // changeMode(event: MODE): void {
    //     this.onActions.emit({ action: ButtonAction.actionMode, param: event });
    // }

    handleActionClick(e: Record<string, unknown>): void {
        this.onActions.emit({ actin: e.action, param: e.param });
    }
}
