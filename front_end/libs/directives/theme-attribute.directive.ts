import { Directive, ElementRef } from '@angular/core';

/** Copies the current theme from the root element.
 *
 * For use with single-component variables from the theme generator
 */
@Directive({ selector: '[nxThemeAttribute]', standalone: true })
export class NxThemeAttributeDirective {
    constructor(host: ElementRef<HTMLElement>) {
        host.nativeElement.setAttribute(
            'data-theme',
            document.documentElement.getAttribute('data-theme')!,
        );
    }
}
