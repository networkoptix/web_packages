import { Directive, ElementRef, input } from '@angular/core';

import { NxEscapeGlobalStyleDirective } from '@directives/escape-global-style.directive';

/** Directive to make an element compatible with the form field */
@Directive({
    selector: '[nxControl]',
    exportAs: 'nxControl',
    standalone: true,
    hostDirectives: [NxEscapeGlobalStyleDirective],
})
export class NxFormFieldControlDirective {
    /** Max length for character counter in form field.
     *
     * Doesn't limit actual string value.
     *
     * Syncs with max lengths used in `NxValidators` if `auto` is used
     * AND `type` property is set on `<input />` element.
     */
    maxLength = input<number | 'auto'>('auto', { alias: 'nxFormFieldMaxLength' });

    constructor(public host: ElementRef<HTMLElement>) {}
}
