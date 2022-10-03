import {
    AfterViewInit,
    Directive,
    ElementRef,
    Input,
    OnChanges,
    OnInit,
    SimpleChanges
} from '@angular/core';

@Directive({ selector: '[nxFocusMe]' })
// directives do support AfterViewInit
// ... this hook is fired by the parent component
export class NxFocusMeDirective implements OnInit, AfterViewInit, OnChanges {
    @Input() timeout = 0;
    @Input() setFocus; // force focus for elements encapsulated

    constructor(private _elementRef: ElementRef) {}

    ngOnInit() {
        this.setFocus = (this.setFocus !== undefined) ? this.setFocus : true;
    }

    ngAfterViewInit() {
        // Timeout is needed for directly navigated pages
        // ... i.e. desktop client opens /register?....
        if (this.setFocus) {
            setTimeout(() => {
                this._elementRef.nativeElement.focus();
            }, this.timeout);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.setFocus?.currentValue) {
            setTimeout(() => {
                this._elementRef.nativeElement.focus();
            }, this.timeout);
        }
    }
}
