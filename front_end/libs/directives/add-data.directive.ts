import { Directive, Input, ElementRef, OnChanges } from '@angular/core';

import { NgChanges } from '@utils/ng-changes';

@Directive({
    selector: '[nx-add-svg-src]',
    standalone: true,
})
export class NxAddSvgSrcDirective implements OnChanges {
    @Input() src: string;

    constructor(private elementRef: ElementRef) {}

    ngOnChanges({ src: { currentValue, previousValue } }: NgChanges<NxAddSvgSrcDirective>): void {
        if (currentValue !== previousValue) {
            this.elementRef.nativeElement.dataset.src = this.src;
        }
    }
}
