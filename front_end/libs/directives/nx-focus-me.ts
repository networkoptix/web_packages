import {
    AfterViewInit,
    booleanAttribute,
    Directive,
    ElementRef,
    Input,
    OnChanges,
} from '@angular/core';

import { NgChanges } from '@utils/ng-changes';

@Directive({ selector: '[nxFocusMe]', standalone: true })
// directives do support AfterViewInit
// ... this hook is fired by the parent component
export class NxFocusMeDirective implements AfterViewInit, OnChanges {
    @Input() timeout: number = 0;
    @Input({ transform: booleanAttribute }) setFocus: boolean; // force focus for elements encapsulated

    constructor(private _elementRef: ElementRef<HTMLElement>) {}

    ngAfterViewInit(): void {
        // Timeout is needed for directly navigated pages
        // ... i.e. desktop client opens /register?....
        if (this.setFocus) {
            setTimeout(() => {
                this._elementRef.nativeElement.focus();
            }, this.timeout);
        }
    }

    ngOnChanges(changes: NgChanges<NxFocusMeDirective>): void {
        if (changes.setFocus?.currentValue) {
            setTimeout(() => {
                this._elementRef.nativeElement.focus();
            }, this.timeout);
        }
    }
}
