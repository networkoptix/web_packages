import { Directive, ElementRef } from '@angular/core';

import { NxEscapeGlobalStyleDirective } from '@directives/escape-global-style.directive';

/** Directive to make an element compatible with the form field */
@Directive({
    selector: '[nxControl]',
    exportAs: 'nxControl',
    standalone: true,
    hostDirectives: [NxEscapeGlobalStyleDirective],
})
export class NxFormFieldControlDirective {
    constructor(public host: ElementRef<HTMLElement>) {}
}
