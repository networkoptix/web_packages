import {
    Directive,
    Input,
    ElementRef,
    OnChanges,
} from '@angular/core';

import { NgChanges } from '@utils/ng-changes';

@Directive({
    selector: '[nx-add-svg-src]'
})
export class NxAddSvgSrc implements OnChanges {
    @Input() src: string;

    constructor(private elementRef: ElementRef) {}

    ngOnChanges({ src: { currentValue, previousValue } }: NgChanges<NxAddSvgSrc>) {
        if (currentValue !== previousValue) {
            this.elementRef.nativeElement.dataset.src = this.src;
        }
    }
}
