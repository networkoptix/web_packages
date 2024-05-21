import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { icons } from '@static-variables';

import { TimelineButtonType } from './button.component.types';

@Component({
    imports: [CommonModule, AngularSvgIconModule, NxAddSvgSrcDirective],
    selector: 'nx-timeline-button',
    templateUrl: 'button.component.html',
    styleUrls: ['button.component.scss'],
    standalone: true,
})
export class NxTimelineButtonComponent {
    @Input() type: `${TimelineButtonType}` = 'Action';
    @Input() asyncClick: boolean = false;
    @Input() disabled: boolean = false;
    @Input() active: boolean = false;

    @Output() onClick = new EventEmitter<void>();

    TimelineButtonType = TimelineButtonType;

    handleClick(): void {
        this.onClick.emit();
    }

    protected readonly icons = icons;
}
