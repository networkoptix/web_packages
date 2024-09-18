import {
    booleanAttribute,
    Directive,
    effect,
    inject,
    input,
    TemplateRef,
    ViewContainerRef,
} from '@angular/core';
import { NEVER } from 'rxjs';

import { NxLayoutComponent } from '../../nx-layout/nx-layout.component';

/**
 * Structural directive to project content into the secondary menu.
 *
 * collapsible is true by default, meaning that the secondary menu will be collapsible.
 *
 * Example without condition:
 *
 * ```html
 * <component-or-element *nxMenuProjection></component-or-element>
 * ```
 *
 * Example with condition:
 *
 * ```html
 * <component-or-element *nxMenuProjection="isProjected"></component-or-element>
 * ```
 *
 * Example with collapsible condition:
 *
 * ```html
 * <component-or-element *nxMenuProjection="isProjected; collapsible: isCollapsible"></component-or-element>
 * ```
 */
@Directive({
    standalone: true,
    selector: '[nxMenuProjection]',
})
export class NxMenuProjectionDirective {
    private templateRef = inject(TemplateRef);
    private viewContainer = inject(ViewContainerRef);

    nxMenuProjection = input(true, { transform: booleanAttribute });

    nxMenuProjectionRightPanel = input(false);

    nxMenuProjectionCollapsible = input(true);
    nxMenuProjectionResizable = input(true);
    nxMenuProjectionAutoNavigateSecondaryOnMobile = input(true);

    updateProjection = effect(
        onCleanup => {
            const condition = this.nxMenuProjection();
            const collapsible = this.nxMenuProjectionCollapsible();
            const nxMenuProjectionRightPanel = this.nxMenuProjectionRightPanel();
            const resizable = this.nxMenuProjectionResizable();
            const autoNavigateSecondaryOnMobile =
                this.nxMenuProjectionAutoNavigateSecondaryOnMobile();
            if (NxLayoutComponent.rootLayout && condition) {
                this.viewContainer.clear();
                const cleanup = NxLayoutComponent.rootLayout.useSecondaryMenu(
                    this.templateRef,
                    collapsible,
                    nxMenuProjectionRightPanel,
                    resizable,
                );
                const autoNavigateSubscription = (
                    autoNavigateSecondaryOnMobile
                        ? NxLayoutComponent.rootLayout.navigateNotifier$
                        : NEVER
                ).subscribe();
                return onCleanup(() => {
                    autoNavigateSubscription.unsubscribe();
                    cleanup();
                });
            } else {
                this.viewContainer.createEmbeddedView(this.templateRef);
            }

            return () => {};
        },
        { allowSignalWrites: true },
    );
}
