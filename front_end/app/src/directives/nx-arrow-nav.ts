import {
    Directive,
    ElementRef,
    HostListener,
    Input
} from '@angular/core';

@Directive({ selector: '[nxArrowNav]' })
export class NxArrowNavDirective {
    @Input() nxArrowNav: boolean;

    constructor(
        private _elementRef: ElementRef
    ) {
    }

    private static increase(idx: number, limit: number): number {
        idx = (idx < limit) ? ++idx : limit;
        return idx;
    }

    private static decrease(idx: number): number {
        idx = (idx > 0) ? --idx : 0;
        return idx;
    }

    @HostListener('document:keydown', ['$event'])
    onKeydown(e) {
        // filter events
        if (![38, 40].includes(e.keyCode)) {
            return;
        }

        // proceed only if open
        if (this._elementRef.nativeElement.parentElement.className.includes('show')) {
            const elements = this._elementRef.nativeElement.querySelectorAll('.dropdown-item-container');
            let fdElm = this._elementRef.nativeElement.querySelector(':focus');
            let idx;

            if (fdElm) {
                fdElm = fdElm.parentElement;
            }

            // elements is NodeList and it doesn't implement indexOf
            idx = [].indexOf.call(elements, fdElm);

            // ArrowDown
            if (e.keyCode === 40) {
                idx = NxArrowNavDirective.increase(idx, elements.length - 1);
            }

            // ArrowUp
            if (e.keyCode === 38 && idx !== -1) { // prevent arrow nav before it was initialized
                idx = NxArrowNavDirective.decrease(idx);
            }

            const elm = elements[idx];

            if (elm?.firstElementChild) {
                elm.firstElementChild.focus();
            }
        }
    }
}
