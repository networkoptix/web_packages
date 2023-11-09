import { Component, EventEmitter, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import {
    ACTIONS,
    MODE,
} from '@vms-client/submodules/timeline/components/nx-webgl-canvas/actions/timeline-actions.types';

@UntilDestroy()
@Component({
    selector: 'nx-timeline-actions',
    templateUrl: './timeline-actions.component.html',
    styleUrls: ['./timeline-actions.component.scss'],
})
export class WebGlTimelineActionsComponent {
    @Output() onActions = new EventEmitter<ACTIONS>();

    timelineActions: ACTIONS = {
        mode: MODE.DRAG,
    };

    changeMode(event: MODE): void {
        this.timelineActions.mode = event;
        this.onActions.emit(this.timelineActions);
    }
}
