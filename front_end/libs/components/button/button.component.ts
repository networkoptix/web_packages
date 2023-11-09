import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

import { NxAddSvgSrcDirective } from '@directives/add-data.directive';
import { environment } from '@environments/environment';
import { icons } from '@static-variables';

import { ButtonType } from './button.component.types';

@Component({
    imports: [CommonModule, AngularSvgIconModule, NxAddSvgSrcDirective],
    selector: 'nx-button',
    templateUrl: 'button.component.html',
    styleUrls: ['button.component.scss'],
    standalone: true,
})
export class NxButtonComponent {
    @Input() text: string = '';
    @Input() type: ButtonType = ButtonType.secondary;
    @Input() asyncClick: boolean = false;
    @Input() disabled: boolean = false;
    @Input() active: boolean = false;
    @Input() btnIconSrc: string = '';

    @Output() onClick = new EventEmitter<void>();

    ButtonType = ButtonType;

    handleClick(): void {
        this.onClick.emit();
    }

    protected readonly icons = icons;
    protected readonly environment = environment;
}
