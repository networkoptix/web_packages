import { Directive, ElementRef } from '@angular/core';

/** A directive to use in components and other directives to mark for escaping global style.
 *
 * Not for templates, apply `data-escape-global-style` directly.
 */
@Directive({ standalone: true })
export class NxEscapeGlobalStyleDirective {
    constructor(host: ElementRef<HTMLElement>) {
        host.nativeElement.setAttribute('data-escape-global-style', '');
    }
}
