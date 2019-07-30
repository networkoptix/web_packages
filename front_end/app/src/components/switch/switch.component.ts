import { Component, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
    selector: 'nx-switch',
    templateUrl: 'switch.component.html',
    styleUrls: ['switch.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxSwitchComponent),
            multi: true
        }
    ],
})
export class NxSwitchComponent {
    constructor() {}
}
