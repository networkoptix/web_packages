import { Directive, EventEmitter, ElementRef, HostListener, Output } from '@angular/core';

@Directive({ selector: '[nxClickElsewhere]', standalone: true })
export class NxClickElsewhereDirective {
    @Output()
    nxClickElsewhere = new EventEmitter<void>();

    constructor(private _elementRef: ElementRef<HTMLElement>) {}

    @HostListener('document:click', ['$event.target'])
    onMouseClick(targetElement: HTMLElement): void {
        if ((targetElement as HTMLInputElement).type === 'checkbox') {
            // special case for nx-checkbox component not being recognized as internal
            // for nx-multi-select
            return;
        }

        const clickedInside = this._elementRef.nativeElement.contains(targetElement);
        if (!clickedInside) {
            this.nxClickElsewhere.emit();
        }
    }
}
