import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
    selector: 'nx-primary-button',
    templateUrl: 'primary-button.component.html',
    styleUrls: ['primary-button.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxPrimaryButtonComponent {
    @Input() buttonText: string;
    @Input() customClass: string = '';
    @Output() onClick = new EventEmitter<void>();

    handleClick(): void {
        this.onClick.emit();
    }
}
