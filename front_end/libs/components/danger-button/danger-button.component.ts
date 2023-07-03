import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';

@Component({
    selector: 'nx-danger-button',
    templateUrl: 'danger-button.component.html',
    styleUrls: ['danger-button.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class NxDangerButtonComponent {
    @Input() buttonText: string;
    @Input() customClass: string = '';
    @Output() onClick = new EventEmitter<void>();

    handleClick(): void {
        this.onClick.emit();
    }
}
