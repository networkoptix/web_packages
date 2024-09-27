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
    @Input({ transform: booleanAttribute }) setFocus: boolean = true; // force focus for elements encapsulated

    constructor(private _elementRef: ElementRef<HTMLElement>) {}

    ngAfterViewInit(): void {
        if (this.setFocus) {
            setTimeout(() => {
                this._elementRef.nativeElement.focus();
            });
        }
    }

    ngOnChanges(changes: NgChanges<NxFocusMeDirective>): void {
        if (changes.setFocus?.currentValue) {
            setTimeout(() => {
                this._elementRef.nativeElement.focus();
            });
        }
    }
}
