import { Component, EventEmitter, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxTimelineButtonComponent } from '@components/nx-webgl-canvas/button/button.component';
import {
    TimelineButtonAction,
    TimelineButtonType,
} from '@components/nx-webgl-canvas/button/button.component.types';
import { icons } from '@static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-webgl-timeline-actions-sound',
    templateUrl: './actions-sound.component.html',
    styleUrls: ['./actions-sound.component.scss'],
    standalone: true,
    imports: [NxTimelineButtonComponent, AngularSvgIconModule],
})
export class WebGlTimelineActionsSoundComponent {
    @Output() onChange = new EventEmitter<Record<string, unknown>>();

    protected readonly TimelineButtonType = TimelineButtonType;
    protected readonly TimelineButtonAction = TimelineButtonAction;
    protected readonly icons = icons;

    handleActionClick(action: TimelineButtonAction): void {
        this.onChange.emit({ action, param: '' });
    }
}
