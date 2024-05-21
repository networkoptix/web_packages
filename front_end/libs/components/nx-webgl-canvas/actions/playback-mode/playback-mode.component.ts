import { Component, EventEmitter, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxTimelineButtonComponent } from '@components/nx-webgl-canvas/button/button.component';
import {
    TimelineButtonAction,
    TimelineButtonType,
} from '@components/nx-webgl-canvas/button/button.component.types';
import { icons } from '@static-variables';

import { MODE } from '../timeline-actions.types';

@UntilDestroy()
@Component({
    selector: 'nx-webgl-timeline-playback-mode',
    templateUrl: './playback-mode.component.html',
    styleUrls: ['./playback-mode.component.scss'],
    standalone: true,
    imports: [NxTimelineButtonComponent, AngularSvgIconModule],
})
export class WebGlTimelinePlaybackModeComponent {
    @Output() onChange = new EventEmitter<Record<string, unknown>>();

    protected readonly MODE = MODE;
    protected readonly TimelineButtonType = TimelineButtonType;
    protected readonly TimelineButtonAction = TimelineButtonAction;
    protected readonly icons = icons;

    mode: MODE = MODE.DRAG;

    handleActionClick(action: TimelineButtonAction): void {
        if (action === TimelineButtonAction.actionMode && this.mode === MODE.DRAG) {
            this.mode = MODE.SELECTION;
        } else {
            this.mode = MODE.DRAG;
        }

        this.onChange.emit({ action, param: this.mode });
    }
}
