import { Component, EventEmitter, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxButtonComponent } from '@components/button/button.component';
import { ButtonAction, ButtonType } from '@components/button/button.component.types';
import { icons } from '@static-variables';

@UntilDestroy()
@Component({
    selector: 'nx-webgl-timeline-actions-sound',
    templateUrl: './actions-sound.component.html',
    styleUrls: ['./actions-sound.component.scss'],
    standalone: true,
    imports: [NxButtonComponent, AngularSvgIconModule],
})
export class WebGlTimelineActionsSoundComponent {
    @Output() onChange = new EventEmitter<Record<string, unknown>>();

    protected readonly ButtonType = ButtonType;
    protected readonly ButtonAction = ButtonAction;
    protected readonly icons = icons;

    handleActionClick(action: ButtonAction): void {
        this.onChange.emit({ action, param: '' });
    }
}
