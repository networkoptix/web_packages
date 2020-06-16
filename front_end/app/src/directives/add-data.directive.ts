import { Directive, Input, ElementRef, OnChanges, SimpleChanges } from '@angular/core';

@Directive({
    selector: '[nx-add-svg-src]'
})
export class NxAddSvgSrc implements OnChanges {
    @Input() src: string;

    constructor(private elementRef: ElementRef) {}

    ngOnChanges({ src: { firstChange, currentValue, previousValue } }: SimpleChanges) {
        if (firstChange && currentValue !== previousValue) {
            this.elementRef.nativeElement.dataset.src = this.src;
        }
    }
}
