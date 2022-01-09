import {
    ConnectedPosition,
    Overlay, OverlayPositionBuilder,
    OverlayRef
} from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import {
    ComponentRef,
    Directive, ElementRef, HostBinding, HostListener, Input, OnChanges,
    OnInit, SimpleChanges, TemplateRef, ViewContainerRef
} from '@angular/core';

import { NxTooltipComponent } from '@components/tooltip/tooltip.component';
import { debounce } from '@src/decorators/debounce';

@Directive({ selector: '[nxTooltip]' })
export class NxTooltipDirective implements OnInit, OnChanges {
    private overlayRef: OverlayRef;

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

    @HostListener('mouseenter')
    @debounce(300)
    show() {
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
    }

    @HostListener('mouseout')
    @debounce(100)
    hide() {
        this.overlayRef && this.overlayRef.detach();
    }
}
