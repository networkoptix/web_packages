import {
    Overlay,
    ConnectionPositionPair,
    FlexibleConnectedPositionStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import { Injectable, TemplateRef, ViewContainerRef } from '@angular/core';
import { timer, takeUntil, Subject, filter } from 'rxjs';

import { NxPopoverComponent } from './popover/popover.component';
import { PopoverConfig, POS_STRATEGY } from './popover-config';
import { PopoverRef } from './popover-ref';

const defaultConfig: PopoverConfig<never> = {
    hasBackdrop: false,
    backdropClass: '',
    disableClose: false,
    panelClass: '',
    arrowOffset: 8,
    arrowSize: 16,
};

/**
 * Service to open modal and manage popovers.
 */
@Injectable({
    providedIn: 'root',
})
export class NxPopoverService {
    #popoverRef: PopoverRef;
    close$ = new Subject<boolean>();

    get popoverRef(): PopoverRef {
        return this.#popoverRef;
    }

    set popoverRef(value: PopoverRef) {
        this.#popoverRef?.close();
        this.#popoverRef = value;
    }

    constructor(private overlay: Overlay) {}

    private generatePopoverRefs<T>(
        positionStrategy: FlexibleConnectedPositionStrategy,
        popoverConfig: PopoverConfig<T>,
        target: HTMLElement,
    ): {
        popover: NxPopoverComponent;
        popoverRef: PopoverRef;
    } {
        const { hasBackdrop, panelClass } = popoverConfig;
        const overlayRef = this.overlay.create({
            hasBackdrop,
            panelClass,
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
        });

        const popoverRef = new PopoverRef(overlayRef, positionStrategy, popoverConfig, target.id);

        const popover = overlayRef.attach(new ComponentPortal(NxPopoverComponent)).instance;
        return { popover, popoverRef };
    }

    private generatePositions(popoverConfig: PopoverConfig<unknown>): ConnectionPositionPair[] {
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
                    offsetY: panelOffset,
                },
            ];
        } else if (popoverConfig.positionStrategy === POS_STRATEGY.TOP) {
            positions = [
                {
                    overlayX: 'center',
                    overlayY: 'bottom',
                    originX: 'center',
                    originY: 'top',
                    panelClass: ['bottom', 'center'],
                    offsetY: -1 * panelOffset,
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
                    offsetY: panelOffset,
                },
                // left center
                {
                    overlayX: 'end',
                    overlayY: 'center',
                    originX: 'start',
                    originY: 'center',
                    panelClass: ['right', 'center'],
                    offsetX: -1 * arrowOffset,
                    offsetY: panelOffset,
                },
                // top center
                {
                    overlayX: 'center',
                    overlayY: 'bottom',
                    originX: 'center',
                    originY: 'top',
                    panelClass: ['bottom', 'center'],
                    offsetY: -1 * panelOffset,
                },
                // bottom center
                {
                    overlayX: 'center',
                    overlayY: 'top',
                    originX: 'center',
                    originY: 'bottom',
                    panelClass: ['top', 'center'],
                    offsetY: panelOffset,
                },
                // ... in same manner we can create positions like "top left", "top right" etc.
            ];
        }
        return positions;
    }

    private renderPopover<T>(
        template: TemplateRef<unknown>,
        popover: NxPopoverComponent,
        viewContainerRef: ViewContainerRef,
        config: Partial<PopoverConfig<T>>,
        popoverRef: PopoverRef,
    ): void {
        // rendering a provided template dynamically
        // if we need to render a component - here is the place to add it
        popover.attachTemplate(
            new TemplatePortal(template, viewContainerRef, {
                $implicit: config.data,
                popover: popoverRef,
            }),
        );
    }

    open<T = never>(
        template: TemplateRef<unknown>,
        target: HTMLElement,
        config: Partial<PopoverConfig<T>> = {},
        viewContainerRef?: ViewContainerRef,
        delayTime = 300,
        closeExisting = true,
    ): this {
        this.close$.next(closeExisting);
        const popoverConfig: PopoverConfig<T> = { ...defaultConfig, ...config };
        popoverConfig.panelClass = ['popover-overlay'];
        if (typeof config.panelClass === 'string' && config.panelClass) {
            popoverConfig.panelClass.push(config.panelClass);
        } else if (config.panelClass.length) {
            popoverConfig.panelClass.push(...config.panelClass);
        }
        const positions = this.generatePositions(popoverConfig);

        const positionStrategy = this.overlay
            .position()
            .flexibleConnectedTo(target)
            .withPush(false)
            .withFlexibleDimensions(false)
            .withPositions(positions);

        timer(delayTime)
            .pipe(takeUntil(this.close$.pipe(filter(val => !!val))))
            .subscribe(() => {
                const { popover, popoverRef } = this.generatePopoverRefs(
                    positionStrategy,
                    popoverConfig,
                    target,
                );

                this.renderPopover(template, popover, viewContainerRef, config, popoverRef);
                this.popoverRef = popoverRef;
            });

        return this;
    }

    close(closeExisting = true): string {
        this.close$.next(closeExisting);
        const targetId = this.popoverRef?.targetId;
        this.popoverRef?.close();
        this.popoverRef = undefined;
        return targetId;
    }
}
