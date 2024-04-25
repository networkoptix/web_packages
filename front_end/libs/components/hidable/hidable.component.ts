import { CommonModule } from '@angular/common';
import { Component, effect, inject } from '@angular/core';
import { BehaviorSubject, animationFrameScheduler, debounceTime, map, merge } from 'rxjs';

import { NxResizeObserver } from '@directives/resize/nx-resize.directive';
import { Size } from '@directives/resize/nx-resize.directive.types';
import { getActualWidth } from '@utils/general';

import { AbstractHidableDirective } from './abstract-hidable.directive';

/**
 * A to replace some of it's content with a placeholder when the container is too small.
 *
 * To be used with NxHidableTemplateDirective and NxHidableItemDirective. Since the component is
 * mostly expected to be used with the directives, it's recommended to import NxHidableModule
 * instead of individually.
 *
 * The component also accepts a hideAllHidable input which will hide all hidable items if all
 * can't be displayed in the container else it will hide only the items that can't be displayed.
 *
 * Example usage:
 *
 * ```html
 * // Wrap the content with the nx-hidable component.
 * <nx-hidable>
 *     // Any content that doesn't have nxHidableItem directive will always be shown.
 *     <span>Always shown since nxHidableItem directive isn't used</span>
 *     <span>Also always shown</span>
 *
 *     // This content will be automatically hidden when the container is too small.
 *     // If hideAllHidable is set to true, all hidable items will be hidden, else only the
 *     // items that can't be displayed will be hidden.
 *     <span nxHidableItem>Hidden when collapsed</span>
 *     <span nxHidableItem>Also hidden when collapsed</span>
 *
 *     // This content will be hidden when the container is too small and someCondition is true.
 *     <span [nxHidableItem]="someCondition">Hidden when collapsed and someCondition is true</span>
 *
 *     // This content is also always shown since it doesn't have nxHidableItem directive.
 *     <span>Also always shown</span>
 * </nx-hidable>
 * ```

 */
@Component({
    standalone: true,
    selector: 'nx-hidable',
    imports: [CommonModule, NxResizeObserver],
    templateUrl: './hidable.component.html',
    styleUrls: ['./hidable.component.scss'],
    hostDirectives: [NxResizeObserver],
    exportAs: 'nxHidable',
})
export class NxHidableComponent extends AbstractHidableDirective {
    /**
     * This component only currently works on the x-axis shared behavior
     * was moved to AbstractHidableDirective in case we want to create a version
     * in the future that supports on the y-axis.
     */
    protected width$ = new BehaviorSubject(0);

    protected widthTracker$ = this.width$;

    protected expand$ = merge(
        this.mutations$,
        inject(NxResizeObserver).resize.pipe(debounceTime(5, animationFrameScheduler)),
    ).pipe(map(() => false));

    protected collapse$ = this.widthTracker$.pipe(map(width => !width));

    protected endcapResize = ({ width }: Size): void => this.width$.next(width);

    constructor() {
        super();

        effect(() => {
            const itemsHidden = this.hidden$$();
            const hideAllHidable = this.hideAllHidableWhenCollapsed$$();
            this.showHidableTemplate = itemsHidden;
            const itemDirectives = this.hidableItems.toArray();

            if (!itemsHidden || hideAllHidable) {
                itemDirectives.forEach(item => (item.isHidden = itemsHidden));
            } else {
                const childWidth = [...this.elementRef.nativeElement.children].reduce(
                    (totalWidth, el) => totalWidth + getActualWidth(el as HTMLElement),
                    0,
                );
                const container = this.elementRef.nativeElement;

                const containerWidth = getActualWidth(container);
                let overflowWidth = childWidth - containerWidth;
                for (const item of itemDirectives) {
                    if (!item.nxHidableItem) {
                        continue;
                    }
                    item.isHidden =
                        itemsHidden && (overflowWidth + item.width > 0 || hideAllHidable);
                    overflowWidth -= item.width;
                }
            }
        });
    }
}
