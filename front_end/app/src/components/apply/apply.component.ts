import { Component, forwardRef, Input } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';


@Component({
    selector: 'nx-apply',
    templateUrl: 'apply.component.html',
    styleUrls: ['apply.component.scss'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => NxApplyComponent),
            multi: true
        }
    ],
})
export class NxApplyComponent {
    @Input('') show: boolean;
    @Input('') save: any;
    @Input('') discard: any;
    constructor() {
    }
}
