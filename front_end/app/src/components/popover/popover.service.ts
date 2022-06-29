import {
    Overlay,
    ConnectionPositionPair
} from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import {
    Injectable,
    TemplateRef,
    ViewContainerRef
} from '@angular/core';
import { timer, takeUntil, Subject, filter } from 'rxjs';

import { PopoverConfig, POS_STRATEGY } from './popover-config';
import { PopoverRef } from './popover-ref';
import { NxPopoverComponent } from './popover/popover.component';

const defaultConfig: PopoverConfig = {
    hasBackdrop: false,
    backdropClass: '',
    disableClose: false,
    panelClass: '',
    arrowOffset: 8,
    arrowSize: 16
};

/**
 * Service to open modal and manage popovers.
 */
@Injectable({
    providedIn: 'root'
})
export class NxPopoverService {
    popoverRef: PopoverRef;
    close$ = new Subject();

    constructor(
        private overlay: Overlay,
    ) {
    }

    private generatePopoverRefs(
        config: Partial<PopoverConfig<any>>,
        positionStrategy,
        popoverConfig: PopoverConfig<any>,
        target: HTMLElement,
    ) {
        const overlayRef = this.overlay.create({
            hasBackdrop: config.hasBackdrop,
            panelClass: config.panelClass,
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition()
        });

        const popoverRef = new PopoverRef(overlayRef, positionStrategy, popoverConfig, target.id);

        const popover = overlayRef.attach(new ComponentPortal(NxPopoverComponent)).instance;
        return { popover, popoverRef };
    }

    private generatePositions(popoverConfig: PopoverConfig<any>) {
        const arrowSize = popoverConfig.arrowSize;
        const arrowOffset = popoverConfig.arrowOffset;
        const panelOffset = arrowSize / 2;

        let positions: ConnectionPositionPair[];

        // Special case for storage size component
        if (popoverConfig.positionStrategy === POS_STRATEGY.BOTTOM) {
            positions = [
                // bottom center
                {
                    overlayX: 'center',
                    overlayY: 'top',
                    originX: 'center',
                    originY: 'bottom',
                    panelClass: ['top', 'center'],
                    offsetY: panelOffset
                },
            ];
        } else {
            // Preferred positions, in order of priority.
            // In general we should have only one preferable strategy
            positions = [
                // right center
                {
                    overlayX: 'start',
                    overlayY: 'center',
                    originX: 'end',
                    originY: 'center',
                    panelClass: ['left', 'center'],
                    offsetX: arrowOffset,
                    offsetY: panelOffset
                },
                // left center
                {
                    overlayX: 'end',
                    overlayY: 'center',
                    originX: 'start',
                    originY: 'center',
                    panelClass: ['right', 'center'],
                    offsetX: -1 * arrowOffset,
                    offsetY: panelOffset
                },
                // top center
                {
                    overlayX: 'center',
                    overlayY: 'bottom',
                    originX: 'center',
                    originY: 'top',
                    panelClass: ['bottom', 'center'],
                    offsetY: -1 * panelOffset
                },
                // bottom center
                {
                    overlayX: 'center',
                    overlayY: 'top',
                    originX: 'center',
                    originY: 'bottom',
                    panelClass: ['top', 'center'],
                    offsetY: panelOffset
                },
                // ... in same manner we can create positions like "top left", "top right" etc.
            ];
        }
        return positions;
    }

    private renderPopover(
        template: TemplateRef<any>,
        popover: NxPopoverComponent,
        viewContainerRef: ViewContainerRef,
        config: Partial<PopoverConfig<any>>,
        popoverRef: PopoverRef<any>,
    ): void {
        // rendering a provided template dynamically
        // if we need to render a component - here is the place to add it
        popover.attachTemplate(
            new TemplatePortal(
                template,
                viewContainerRef,
                {
                    $implicit: config.data,
                    popover: popoverRef
                }
            )
        );
    }

    open(
        template: TemplateRef<any>,
        target: HTMLElement,
        config: Partial<PopoverConfig> = {},
        viewContainerRef?: ViewContainerRef,
        delayTime = 300,
        closeExisting = true
    ): NxPopoverService {
        this.close$.next(closeExisting);
        const popoverConfig: PopoverConfig = { ...defaultConfig, ...config };
        const positions: ConnectionPositionPair[] = this.generatePositions(popoverConfig);

        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(target)
            .withPush(false)
            .withFlexibleDimensions(false)
            .withPositions(positions);

        timer(delayTime)
            .pipe(
                takeUntil(this.close$.pipe(filter(val => !!val)))
            ).subscribe(() => {
                const { popover, popoverRef } = this.generatePopoverRefs(config, positionStrategy, popoverConfig, target);

                this.renderPopover(template, popover, viewContainerRef, config, popoverRef);
                this.popoverRef = popoverRef;
            });

        return this;
    }

    close(closeExisting = true) {
        this.close$.next(closeExisting);
        const targetId = this.popoverRef?.targetId;
        this.popoverRef?.close();
        this.popoverRef = undefined;
        return targetId;
    }
}
