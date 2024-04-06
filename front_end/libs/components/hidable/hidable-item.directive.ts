import { Directive, ElementRef, HostBinding, Input, booleanAttribute, inject } from '@angular/core';

import { getActualHeight, getActualWidth } from '@utils/general';

/**
 * Directive to mark an element as hidable when the NxHidableComponent is in the collapsed state.
 *
 * Example:
 *
 * ```html
 * <nx-hidable>
 *     <span>Always shown since nxHidableItem directive isn't used</span>
 *     <span nxHidableItem>Hidden when collapsed</span>
 *     <span [nxHidableItem]="someCondition">Hidden when collapsed and someCondition is true</span>
 *     <span>Also always shown</span>
 * </nx-hidable>
 * ```
 *
 * See NxHidableComponent for detailed usage.
 */
@Directive({
    standalone: true,
    selector: '[nxHidableItem]',
    exportAs: 'nxHidableItem',
})
export class NxHidableItemDirective {
    /**
     * Whether the items is currently hidden.
     * This is mostly used internally by the NxHidableComponent but is also exposed from this
     * directive to allow for advanced use cases within the template.
     */
    @HostBinding('class.is-hidden') public isHidden = false;

    /**
     * The width of the element. This is mostly used internally by the NxHidableComponent.
     */
    public get width(): number {
        return getActualWidth(this.elementRef.nativeElement);
    }

    /**
     * The width of the element. This is mostly used internally by the NxHidableComponent.
     */
    public get height(): number {
        return getActualHeight(this.elementRef.nativeElement);
    }

    /**
     * Whether this item is hidable or not. This is mostly used internally by the
     * NxHidableComponent but is also exposed from this directive to allow for
     * advanced use cases within the template.
     */
    @HostBinding('class.hidable-item')
    @Input({ transform: booleanAttribute })
    public readonly nxHidableItem: boolean = true;

    protected elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
}
