import {
    AfterViewInit, Directive,
    ElementRef, Input
} from '@angular/core';

@Directive({ selector: '[nxFocusMe]' })
// directives do support AfterViewInit
// ... this hook is fired by the parent component
export class NxFocusMeDirective implements AfterViewInit {
    @Input() timeout = 0;

    constructor(private _elementRef: ElementRef) {}

    ngAfterViewInit() {
        // Timeout is needed for directly navigated pages
        // ... i.e. desktop client opens /register?....
        setTimeout(() => {
            this._elementRef.nativeElement.focus();
        }, this.timeout);
    }
}
