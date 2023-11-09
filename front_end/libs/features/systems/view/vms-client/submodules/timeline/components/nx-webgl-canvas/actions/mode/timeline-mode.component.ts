import { Component, EventEmitter, Output } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';

import { ButtonType } from '@components/button/button.component.types';
import { icons } from '@static-variables';

import { MODE } from '../timeline-actions.types';

@UntilDestroy()
@Component({
    selector: 'nx-webgl-timeline-mode',
    templateUrl: './timeline-mode.component.html',
    styleUrls: ['./timeline-mode.component.scss'],
})
export class WebGlTimelineModeComponent {
    @Output() onChange = new EventEmitter<MODE>();

    protected readonly MODE = MODE;
    protected readonly ButtonType = ButtonType;
    protected readonly icons = icons;

    mode: MODE = MODE.DRAG;

    handleModeClick(): void {
        if (this.mode === MODE.DRAG) {
            this.mode = MODE.SELECTION;
        } else {
            this.mode = MODE.DRAG;
        }

        this.onChange.emit(this.mode);
    }
}
