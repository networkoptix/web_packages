import {
    ConnectedPosition,
    FlexibleConnectedPositionStrategy,
    Overlay,
    OverlayPositionBuilder,
    OverlayRef,
} from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal } from '@angular/cdk/portal';
import {
    booleanAttribute,
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
import { NgChanges } from '@utils/ng-changes';

import { NxClickElsewhereDirective } from './nx-click-elsewhere';

/** @deprecated Use v2 */
@UntilDestroy()
@Directive({
    selector: '[nxTooltip]',
    standalone: true,
    hostDirectives: [NxClickElsewhereDirective],
})
export class NxTooltipDirective implements OnInit, OnChanges, OnDestroy {
    private overlayRef: OverlayRef | undefined;
    private destroy$ = new Subject<boolean>();
    private positionStrategy: FlexibleConnectedPositionStrategy;
    private tooltipPortal: ComponentPortal<NxTooltipComponent>;
    private tooltipRef: NxTooltipComponent | undefined;

    @Input('nxTooltip') content: false | string | TemplateRef<unknown>;
    @Input() alternativeTargetRef: Element;

    @Input({ transform: booleanAttribute }) horizontal: boolean;
    @Input({ transform: booleanAttribute }) topBottom: boolean;
    @Input({ transform: booleanAttribute }) alternateStyle: boolean;
    @Input({ transform: booleanAttribute }) alternateSecondary: boolean;
    @Input({ transform: booleanAttribute }) forceDark: boolean;
    @Input({ transform: booleanAttribute }) forceLight: boolean;
    @Input({ transform: booleanAttribute }) tooltipMediumFont: boolean;
    @Input({ transform: booleanAttribute }) toggleOnClick: boolean;
    @Input({ transform: booleanAttribute }) reversePositionOrder: boolean;
    @Input({ transform: booleanAttribute }) ignoreMaxWidth: boolean;
    @Input({ transform: booleanAttribute }) closeAfterDelay: boolean;

    constructor(
        private overlayPositionBuilder: OverlayPositionBuilder,
        private elementRef: ElementRef,
        private overlay: Overlay,
        private _viewContainerRef: ViewContainerRef,
        clickAnywhere: NxClickElsewhereDirective,
    ) {
        clickAnywhere.nxClickElsewhere.pipe(takeUntil(this.destroy$)).subscribe(() => this.close());
    }

    ngOnInit(): void {
        let positions: ConnectedPosition[];

        if (this.topBottom) {
            positions = [
                {
                    originX: 'end',
                    originY: 'top',
                    overlayX: 'start',
                    overlayY: 'top',
                    offsetX: 6,
                    panelClass: ['top', 'right'],
                },
            ];
        } else if (this.horizontal) {
            positions = [
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
            ];
        } else {
            positions = [
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
        }
        this.positionStrategy = this.overlayPositionBuilder
            .flexibleConnectedTo(this.alternativeTargetRef || this.elementRef)
            .withPositions(this.reversePositionOrder ? positions.reverse() : positions);

        this.tooltipPortal = new ComponentPortal(NxTooltipComponent);
    }

    ngOnChanges(changes: NgChanges<NxTooltipDirective>): void {
        if (changes.content) {
            if (this.overlayRef?.hasAttached()) {
                this.close();
                if (changes.content.currentValue) {
                    this.show();
                }
            }
        }
    }

    ngOnDestroy(): void {
        this.close();
    }

    @HostListener('mouseleave')
    hide(): void {
        if (!this.toggleOnClick) {
            this.close();
        }
    }

    private close = (): void => {
        this.destroy$.next(true);
        this.overlayRef?.dispose();
        this.overlayRef = undefined;
    };

    @HostListener('mouseenter')
    show(): void {
        if (!this.toggleOnClick) {
            this.open();
        }
    }

    @HostListener('click')
    toggle(): void {
        if (this.toggleOnClick) {
            if (this.overlayRef?.hasAttached()) {
                this.close();
            } else {
                this.open(0);
            }
        }
    }

    private open = (delay = 300): void => {
        timer(delay)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
                if (!this.content) {
                    return;
                }

                this.overlayRef = this.overlay.create({
                    positionStrategy: this.positionStrategy,
                    scrollStrategy: this.overlay.scrollStrategies?.reposition(),
                });

                this.tooltipRef = this.overlayRef.attach(this.tooltipPortal).instance;
                if (this.content instanceof TemplateRef) {
                    this.tooltipRef.attachTemplate(
                        new TemplatePortal(this.content, this._viewContainerRef),
                        !!this.alternateStyle,
                        !!this.alternateSecondary,
                        !!this.forceDark,
                        !!this.forceLight,
                        !!this.tooltipMediumFont,
                        !!this.ignoreMaxWidth,
                    );
                } else {
                    this.tooltipRef.attachText(
                        this.content,
                        !!this.alternateStyle,
                        !!this.alternateSecondary,
                        !!this.forceDark,
                        !!this.forceLight,
                        !!this.tooltipMediumFont,
                        !!this.ignoreMaxWidth,
                    );
                }

                if (this.closeAfterDelay) {
                    timer(1500)
                        .pipe(takeUntil(this.destroy$))
                        .subscribe(() => this.close());
                }
            });
    };
}
