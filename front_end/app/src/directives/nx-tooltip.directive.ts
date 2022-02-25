import {
    ConnectedPosition,
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
    SimpleChanges,
    TemplateRef,
    ViewContainerRef
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NxTooltipComponent } from '@components/tooltip/tooltip.component';

@UntilDestroy()
@Directive({ selector: '[nxTooltip]' })
export class NxTooltipDirective implements OnInit, OnChanges, OnDestroy {
    private overlayRef: OverlayRef;
    private destroy$ = new Subject();

    @Input('nxTooltip') content: string | TemplateRef<any>;

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
        const positionStrategy = this.overlayPositionBuilder
            .flexibleConnectedTo(this.elementRef)
            .withPositions(positions);

        this.overlayRef = this.overlay.create({
            positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies.reposition(),
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.text) {
            this.hide();
            changes.text.currentValue && this.show();
        }
    }

    ngOnDestroy() {
        this.hide();
    }

    @HostListener('mouseenter')
    show() {
        timer(300).pipe(
            takeUntil(this.destroy$),
        ).subscribe(() => {
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
        this.overlayRef?.detach();
        this.destroy$.next();
    }
}
