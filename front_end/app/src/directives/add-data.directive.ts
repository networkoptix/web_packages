import { Directive, Input, ElementRef } from '@angular/core';

@Directive({
    selector: '[NxAddSvgSrc]'
})
export class NxAddSvgSrc {
    @Input() src: string;

    constructor(private elementRef: ElementRef) {}

    ngOnChanges() {
        this.elementRef.nativeElement.dataset.src = this.src;
    }
}
