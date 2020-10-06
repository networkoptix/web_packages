import { Directive, ElementRef, OnInit } from '@angular/core';

@Directive({ selector: '[nxFocusMe]' })
export class NxFocusMeDirective {
    constructor(private _elementRef: ElementRef) {
    }

    ngAfterViewInit() {
        this._elementRef.nativeElement.focus();
    }
}
