import {
    ConnectedPosition,
    FlexibleConnectedPositionStrategy,
    Overlay,
    OverlayPositionBuilder,
    OverlayRef,
} from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import {
    Directive,
    ElementRef,
    HostListener,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewContainerRef,
} from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import { Subject, timer } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NxTooltipComponent } from '@components/tooltip/tooltip.component';
import { IBool, CoercedBoolInput } from '@decorators/ibool';
import { NgChanges } from '@utils/ng-changes';

@UntilDestroy()
@Directive({ selector: '[nxTooltip]' })
export class NxTooltipDirective implements OnInit, OnChanges, OnDestroy {
    private overlayRef: OverlayRef;
    private destroy$ = new Subject<boolean>();
    private positionStrategy: FlexibleConnectedPositionStrategy;

    @Input('nxTooltip') content: string | TemplateRef<unknown>;
    @Input() alternativeTargetRef: Element;

    @IBool() @Input() horizontal: CoercedBoolInput;
    @IBool() @Input() alternateStyle: CoercedBoolInput;
    @IBool() @Input() alternateSecondary: CoercedBoolInput;

    constructor(
        private overlayPositionBuilder: OverlayPositionBuilder,
        private elementRef: ElementRef,
        private overlay: Overlay,
        private _viewContainerRef: ViewContainerRef,
    ) {}

    ngOnInit(): void {
        const positions: ConnectedPosition[] = this.horizontal
            ? [
                  {
                      originX: 'end',
                      originY: 'center',
                      overlayX: 'start',
                      overlayY: 'center',
                      offsetX: 6,
                      panelClass: ['center', 'right'],
                  },
                  {
                      originX: 'start',
                      originY: 'center',
                      overlayX: 'end',
                      overlayY: 'center',
                      offsetX: -6,
                      panelClass: ['center', 'left'],
                  },
              ]
            : [
                  {
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
                  },
              ];

        this.positionStrategy = this.overlayPositionBuilder
            .flexibleConnectedTo(this.alternativeTargetRef || this.elementRef)
            .withPositions(positions);

        this.overlayRef = this.overlay.create({
            positionStrategy: this.positionStrategy,
            scrollStrategy: this.overlay.scrollStrategies?.reposition(),
        });
    }

    ngOnChanges(changes: NgChanges<NxTooltipDirective>): void {
        if (changes.content) {
            if (this.overlayRef?.hasAttached()) {
                this.close();
                changes.content.currentValue && this.show();
            }
        }
    }

    ngOnDestroy(): void {
        this.close();
        this.overlayRef = undefined;
    }

    @HostListener('mouseleave')
    private close = (): void => {
        this.destroy$.next(true);
        this.overlayRef?.detach();
    };

    @HostListener('mouseenter')
    show(): void {
        timer(300)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                if (!this.content) {
                    return;
                }

                const tooltipPortal = new ComponentPortal(NxTooltipComponent);
                const tooltipRef = this.overlayRef.attach(tooltipPortal).instance;
                if (this.content instanceof TemplateRef) {
                    tooltipRef.attachTemplate(
                        new TemplatePortal(this.content, this._viewContainerRef),
                        !!this.alternateStyle,
                        !!this.alternateSecondary,
                    );
                } else {
                    tooltipRef.attachText(
                        this.content,
                        !!this.alternateStyle,
                        !!this.alternateSecondary,
                    );
                }
            });
    }
}
