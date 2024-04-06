import { Directive, HostBinding, Input, booleanAttribute } from '@angular/core';

/**
 * Directive to mark an element as the element to be shown when the NxHidableComponent
 * is in the collapsed state.
 *
 * Example:
 *
 * ```html
 * <nx-hidable>
 *     <a nxHidableTemplate>...</a>
 * </nx-hidable>
 * ```
 *
 * See NxHidableComponent for detailed usage.
 */
@Directive({
    standalone: true,
    selector: '[nxHidableTemplate]',
})
export class NxHidableTemplateDirective {
    @HostBinding('class.hidable-template')
    @Input({ transform: booleanAttribute })
    protected nxHidableTemplate: boolean;
}
