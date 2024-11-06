import { Directive, ElementRef } from '@angular/core';

/** Directive to make an element compatible with the form field */
@Directive({
    selector: '[nxControl]',
    exportAs: 'nxControl',
    standalone: true,
})
export class NxFormFieldControlDirective {
    /** Max length for character counter in form field.
     *
     * Doesn't limit actual string value.
     *
     * Syncs with max lengths used in `NxValidators` if `auto` is used
     * AND `type` property is set on `<input />` element.
     */
    // maxLength = input<number | 'auto'>('auto', { alias: 'nxFormFieldMaxLength' });
    // Removing this for now

    constructor(public host: ElementRef<HTMLElement>) {}
}
