import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ButtonType } from './button.component.types';

@Component({
    imports: [CommonModule],
    selector: 'nx-button',
    templateUrl: 'button.component.html',
    styleUrls: ['button.component.scss'],
    standalone: true,
})
export class NxButtonComponent {
    @Input() text: string = '';
    @Input() type: `${ButtonType}` = ButtonType.secondary;
    @Input() asyncClick: boolean = false;
    @Input() disabled: boolean = false;
    @Output() onClick = new EventEmitter<void>();

    ButtonType = ButtonType;

    handleClick(): void {
        this.onClick.emit();
    }
}
