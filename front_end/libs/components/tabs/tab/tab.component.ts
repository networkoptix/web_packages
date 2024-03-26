import { Component, EventEmitter, Input, Output, booleanAttribute } from '@angular/core';

@Component({ selector: 'nx-base-tab', template: '', standalone: true })
export class NxBaseTabComponent {
    @Input({ required: true }) displayName: string;
    @Input({ required: true }) route: string;
    @Input({ transform: booleanAttribute }) disabled: boolean;
    @Input({ transform: booleanAttribute }) selected: boolean = false;
    @Output() tabClick = new EventEmitter<number>();
}
