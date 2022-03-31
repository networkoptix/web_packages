import {
    AfterViewInit,
    Directive,
    ElementRef,
    Input,
    OnChanges,
    OnInit,
} from '@angular/core';

import { NgChanges } from '@utils/ng-changes';

@Directive({ selector: '[nxFocusMe]' })
// directives do support AfterViewInit
// ... this hook is fired by the parent component
export class NxFocusMeDirective implements OnInit, AfterViewInit, OnChanges {
    @Input() timeout = 0;
    @Input() setFocus; // force focus for elements encapsulated

    constructor(private _elementRef: ElementRef) {}

    ngOnInit(): void {
        this.setFocus = (this.setFocus !== undefined) ? this.setFocus : true;
    }

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
