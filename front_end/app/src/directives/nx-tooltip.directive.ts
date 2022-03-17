import {
    ConnectedPosition,
    FlexibleConnectedPositionStrategy,
    Overlay, OverlayPositionBuilder,
    OverlayRef
} from '@angular/cdk/overlay';
import {
    ComponentPortal,
    TemplatePortal
} from '@angular/cdk/portal';
import {
    Directive,
    ElementRef,
    HostListener,
    Input,
    OnChanges, OnDestroy,
    OnInit,
    TemplateRef,
    ViewContainerRef
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NxTooltipComponent } from '@components/tooltip/tooltip.component';
import { NgChanges } from '@utils/ng-changes';

@UntilDestroy()
@Directive({ selector: '[nxTooltip]' })
export class NxTooltipDirective implements OnInit, OnChanges, OnDestroy {
    private overlayRef: OverlayRef;
    private destroy$ = new Subject();
    private positionStrategy: FlexibleConnectedPositionStrategy;

    @Input('nxTooltip') content: string | TemplateRef<any>;

    private close() {
        this.destroy$.next();
        this.overlayRef?.detach();
        this.overlayRef = undefined;
    }

    constructor(
        private overlayPositionBuilder: OverlayPositionBuilder,
        private elementRef: ElementRef,
        private overlay: Overlay,
        private _viewContainerRef: ViewContainerRef,
    ) {
    }

    ngOnInit() {
        const positions: ConnectedPosition[] = [{
            originX: 'center',
            originY: 'top',
            overlayX: 'center',
            overlayY: 'bottom',
            offsetY: -6,
            panelClass: ['top', 'center'],
        },
        {
            originX: 'center',
            originY: 'bottom',
            overlayX: 'center',
            overlayY: 'top',
            offsetY: 6,
            panelClass: ['bottom', 'center'],
        }];
        this.positionStrategy = this.overlayPositionBuilder
            .flexibleConnectedTo(this.elementRef)
            .withPositions(positions);
    }

    ngOnChanges(changes: NgChanges<NxTooltipDirective>) {
        // TODO: Restore or remove
        // if (changes.text) {
        //     this.close();
        //     changes.text.currentValue && this.show();
        // }
    }

    ngOnDestroy() {
        this.close();
    }

    @HostListener('mouseenter')
    show() {
        timer(300).pipe(
            takeUntil(this.destroy$),
        ).subscribe(() => {
            if (!this.content) {
                return;
            }

            this.overlayRef = this.overlay.create({
                positionStrategy: this.positionStrategy,
                scrollStrategy: this.overlay.scrollStrategies.reposition(),
            });

            const tooltipPortal = new ComponentPortal(NxTooltipComponent);
            const tooltipRef = this.overlayRef.attach(tooltipPortal).instance;
            if (this.content instanceof TemplateRef) {
                tooltipRef.attachTemplate(
                    new TemplatePortal(
                        this.content,
                        this._viewContainerRef
                    )
                );
            } else {
                tooltipRef.attachText(this.content);
            }
        });
    }

    @HostListener('mouseleave')
    hide() {
        this.close();
    }
}
