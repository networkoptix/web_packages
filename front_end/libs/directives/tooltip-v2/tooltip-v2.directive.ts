import {
    ConnectionPositionPair,
    FlexibleConnectedPositionStrategy,
    Overlay,
    OverlayConnectionPosition,
    OverlayRef,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import {
    AfterViewInit,
    Directive,
    ElementRef,
    EventEmitter,
    HostListener,
    OnDestroy,
    Output,
    TemplateRef,
    booleanAttribute,
    computed,
    effect,
    input,
    signal,
    untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { identity } from 'lodash-es';
import { BehaviorSubject, delay, filter, of, switchMap, takeUntil, tap } from 'rxjs';

import { environment } from '@environments/environment';
import { cdkOriginPosition, cdkOverlayPosition } from '@utils/nx';

import { NxTooltipV2Component } from './tooltip-v2.component';
import type { TooltipTrigger, TooltipPosition, TooltipTheme } from './tooltip-v2.types';

const horzToVert = {
    start: 'top',
    center: 'center',
    end: 'bottom',
} as const;

/* Example: [N, start]
1. The top edge of the tooltip body is level with the center of the origin.
   The arrow's top corner is touching the body's top edge and the arrow itself is
   pointing one arrow height below that center. Offset the overlay 1 arrow height up
   to make the arrow point at the origin center.
2. Because the arrow edge is flat and the body corners are rounded, offset the arrow down
   to clear the curve, and offset the overlay and equal amount up to keep the
   arrow pointing at the origin center. */
const crossAxisOffset = {
    start: -(NxTooltipV2Component.arrowHeight + NxTooltipV2Component.arrowOffset),
    center: 0,
    end: NxTooltipV2Component.arrowHeight + NxTooltipV2Component.arrowOffset,
};

const MAIN_AXIS_OFFSET = 6;

function isTooltipPosition(
    positionInput: TooltipPosition | TooltipPosition[],
): positionInput is TooltipPosition {
    return positionInput.length === 2 && typeof positionInput[0] === 'string';
}

const compass4Opposite = { N: 'S', E: 'W', S: 'N', W: 'E' } as const;

/* See sandbox/tooltip for examples */
@Directive({
    selector: '[nxTooltipV2]',
    standalone: true,
    exportAs: 'nxTooltipV2',
})
export class NxTooltipV2Directive implements AfterViewInit, OnDestroy {
    _content = input.required<string | TemplateRef<unknown>>({ alias: 'nxTooltipV2' });
    /** The element to attach the tooltip to */
    _attachTarget = input<HTMLElement>(this.self.nativeElement, { alias: 'tooltipOrigin' });

    /** Open and close triggers for the tooltip
     *
     * - `hover`: Open on mouse enter/close on mouse leave (default)
     * - `click`: Toggle on mouse click
     * - `focus`: Open on focus/close on blur
     * - `none`: Disable automatic triggers
     */
    _trigger = input<TooltipTrigger | undefined, TooltipTrigger>(undefined, {
        alias: 'tooltipTrigger',
        transform: identity,
    });
    private trigger = computed<TooltipTrigger | undefined>(() => {
        const [_trigger, manualOverride] = [this._trigger(), this.manualOverride()];
        if (manualOverride) {
            if (_trigger !== undefined && _trigger !== 'none' && !environment.production) {
                console.warn(`Trigger ${_trigger} overridden`);
            }
            return undefined;
        }
        return _trigger ?? 'hover';
    });
    private triggerOnHover = computed(() => this.trigger() === 'hover');
    private triggerOnClick = computed(() => this.trigger() === 'click');
    private triggerOnFocus = computed(() => this.trigger() === 'focus');

    /** Full manual control. Will override triggers, delays, and autohide */
    _manualOpenState = input<boolean | undefined, boolean>(undefined, {
        alias: 'tooltipOpen',
        transform: identity,
    });
    private manualOverride = computed<boolean>(() => this._manualOpenState() !== undefined);
    @Output() tooltipOpenChange = new EventEmitter<boolean>();

    private defaultDelay = [0, 0] as [number, number];
    /** How long to wait after a trigger to open/close the tooltip in ms.
     *
     * Use a single number for for open and close to use the same value,
     * or a two number tuple for separate values.
     *
     * Default value of `0` (no delay).
     *
     */
    _delay = input<[number, number], [number, number] | number>(this.defaultDelay, {
        alias: 'tooltipDelay',
        transform: d => (Array.isArray(d) ? d : [d, d]),
    });
    private delay = computed<[number, number]>(() => {
        const [_delay, manualOverride] = [this._delay(), this.manualOverride()];
        if (manualOverride) {
            if (_delay !== this.defaultDelay && !environment.production) {
                console.warn(`Delay [${_delay}] overridden`);
            }
            return this.defaultDelay;
        }
        return _delay;
    });
    private openDelay = computed<number>(() => this.delay()[0]);
    private closeDelay = computed<number>(() => this.delay()[1]);

    /** Lifetime for a tooltip after open in ms.
     *
     * After this amount of time has passed the tooltip is automatically closed.
     *
     * Default value of `0` (never)
     *
     */
    _autohide = input<number>(0, { alias: 'tooltipAutohide' });
    private autohide = computed<number>(() => {
        const [_autohide, manualOverride] = [this._autohide(), this.manualOverride()];
        if (manualOverride) {
            if (_autohide !== 0 && !environment.production) {
                console.warn(`Autohide ${_autohide} overridden`);
            }
            return 0;
        }
        return _autohide;
    });

    /** Tooltip position(s), in order of preference.
     *
     * A tooltip position is a two string tuple:
     * - The first string is a cardinal direction for which side of the origin the tooltip
     * should attach to (`N`/`W`/`S`/`E`)
     * - The second string is the arrow location is on the tooltip body (`start`/`center`/`end`).
     * `start` is up/left and `end` is down/right.
     *
     * Passing in a single position will automatically add a backup position on the cardinal
     * opposite with the same arrow position.
     *
     * Default value of `[['E', 'center'], ['W', 'center']]`
     */
    _positions = input<TooltipPosition[], TooltipPosition | TooltipPosition[]>(
        [
            ['E', 'center'],
            ['W', 'center'],
        ],
        {
            alias: 'tooltipPositions',
            transform: v => {
                if (isTooltipPosition(v)) {
                    return [v, [compass4Opposite[v[0]], v[1]]];
                } else {
                    return v;
                }
            },
        },
    );
    private overlayPositions = computed<ConnectionPositionPair[]>(() => {
        const inputPositions = this._positions();
        return inputPositions.map(position => {
            const [attachPoint, arrowPosition] = position;

            const originPosition = cdkOriginPosition(attachPoint);
            let overlayPosition: OverlayConnectionPosition;
            let offsetX = 0;
            let offsetY = 0;
            let panelClass: string[] = [];
            switch (attachPoint) {
                case 'N':
                    overlayPosition = cdkOverlayPosition('S');
                    overlayPosition.overlayX = arrowPosition;
                    offsetY = -MAIN_AXIS_OFFSET;
                    offsetX = crossAxisOffset[arrowPosition];
                    panelClass = ['tooltip-origin-connect-top'];
                    break;
                case 'E':
                    overlayPosition = cdkOverlayPosition('W');
                    overlayPosition.overlayY = horzToVert[arrowPosition];
                    offsetX = MAIN_AXIS_OFFSET;
                    offsetY = crossAxisOffset[arrowPosition];
                    panelClass = ['tooltip-origin-connect-end'];
                    break;
                case 'S':
                    overlayPosition = cdkOverlayPosition('N');
                    overlayPosition.overlayX = arrowPosition;
                    offsetY = MAIN_AXIS_OFFSET;
                    offsetX = crossAxisOffset[arrowPosition];
                    panelClass = ['tooltip-origin-connect-bottom'];
                    break;
                case 'W':
                    overlayPosition = cdkOverlayPosition('E');
                    overlayPosition.overlayY = horzToVert[arrowPosition];
                    offsetX = -MAIN_AXIS_OFFSET;
                    offsetY = crossAxisOffset[arrowPosition];
                    panelClass = ['tooltip-origin-connect-start'];
                    break;
            }
            panelClass.push(
                `tooltip-overlay-horizontal-${overlayPosition.overlayX}`,
                `tooltip-overlay-vertical-${overlayPosition.overlayY}`,
            );

            return { ...originPosition, ...overlayPosition, offsetX, offsetY, panelClass };
        });
    });

    _theme = input<TooltipTheme>('default', { alias: 'tooltipTheme' });

    /** Tooltip arrow visibility */
    _withArrow = input<boolean, unknown>(true, {
        alias: 'tooltipArrow',
        transform: booleanAttribute,
    });

    /** Clicks on the tooltip component */
    @Output() tooltipComponentClick = new EventEmitter<void>();
    /** Clicks outside the overlay */
    @Output() tooltipOutsideClick = new EventEmitter<unknown>();

    private overlayRef: OverlayRef;
    private position: FlexibleConnectedPositionStrategy;
    private portal = new ComponentPortal(NxTooltipV2Component);

    private open$ = new BehaviorSubject<[number, number] | null>(null);
    private close$ = new BehaviorSubject<number | null>(null);
    private openStart: number | null = null;
    private closeStart: number | null = null;
    private _opened = signal(false);

    // This holds the value for autohide until the portal has been attached
    private autohideTemp: number = 0;
    private autohide$ = new BehaviorSubject<number>(0);

    private lastHostClick = Number.NEGATIVE_INFINITY;

    constructor(
        private overlay: Overlay,
        private self: ElementRef<HTMLElement>,
    ) {
        this.overlayRef = overlay.create({
            scrollStrategy: overlay.scrollStrategies.reposition(),
        });
        this.overlayRef
            .outsidePointerEvents()
            .pipe(takeUntilDestroyed())
            .subscribe(({ timeStamp, target }) => {
                if (!this._opened()) {
                    return;
                }

                this.tooltipOutsideClick.emit(target);

                setTimeout(() => {
                    /* Hack to check if the click is on the origin element, compensate for fuzzing
                    https://developer.mozilla.org/en-US/docs/Web/API/Event/timeStamp#reduced_time_precision */
                    const clickedHost = Math.abs(timeStamp - this.lastHostClick) < 5;
                    if (this.triggerOnClick() && !clickedHost) {
                        this.close();
                    }
                });
            });
        this.overlayRef
            .attachments()
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                this._opened.set(true);
                this.tooltipOpenChange.emit(true);
                this.open$.next(null);
                this.autohide$.next(this.autohideTemp);
            });
        this.overlayRef
            .detachments()
            .pipe(takeUntilDestroyed())
            .subscribe(() => {
                this._opened.set(false);
                this.tooltipOpenChange.emit(false);
                this.close$.next(null);
                this.autohide$.next(0);
            });

        this.open$
            .pipe(
                takeUntilDestroyed(),
                tap(v => {
                    this.openStart = v ? Date.now() : null;
                }),
                filter<[number, number]>(v => v !== null),
                switchMap(([delay_, autohide]) =>
                    of(autohide).pipe(
                        delay(delay_),
                        takeUntil(this.open$.pipe(filter(v => v === null))),
                    ),
                ),
            )
            .subscribe(autohide => {
                this.autohideTemp = autohide;
                this.openOverlay();
            });
        this.close$
            .pipe(
                takeUntilDestroyed(),
                tap(v => {
                    this.closeStart = v ? Date.now() : null;
                }),
                filter<number>(v => v !== null),
                switchMap(v =>
                    of(null).pipe(delay(v), takeUntil(this.close$.pipe(filter(v => v === null)))),
                ),
            )
            .subscribe(() => {
                this.closeOverlay();
            });

        this.autohide$
            .pipe(
                takeUntilDestroyed(),
                filter<number>(v => v !== 0),
                switchMap(v =>
                    of(null).pipe(delay(v), takeUntil(this.autohide$.pipe(filter(v => v === 0)))),
                ),
            )
            .subscribe(() => {
                this.close();
            });
    }

    ngAfterViewInit(): void {
        this.position = this.overlay
            .position()
            .flexibleConnectedTo(this._attachTarget())
            .withPush(true)
            .withPositions(this.overlayPositions());
        this.overlayRef.updatePositionStrategy(this.position);
    }

    ngOnDestroy(): void {
        this.overlayRef.dispose();
    }

    private openOverlay(): void {
        if (this._opened()) {
            return;
        }
        const component = this.overlayRef.attach(this.portal);
        component.setInput('content', this._content());
        component.setInput('withArrow', this._withArrow());
        component.setInput('theme', this._theme());
        component.instance.click.subscribe(() => {
            this.tooltipComponentClick.emit();
            if (this.triggerOnClick()) {
                this.close();
            }
        });
    }
    private closeOverlay(): void {
        if (!this._opened()) {
            return;
        }
        this.overlayRef.detach();
    }

    /* Public API */
    public opened = this._opened.asReadonly();
    public open(delay: number | undefined = undefined, autohide: number = NaN): void {
        const delay_ = delay ?? this.openDelay();
        const autohide_ = isNaN(autohide) ? this.autohide() : autohide;
        if (!this._opened()) {
            if (this.open$.value === null) {
                this.open$.next([delay_, autohide_]); // Closed => Start open
            } else {
                const remainingDelay = this.openStart! + this.open$.value[0] - Date.now();
                if (remainingDelay > delay_) {
                    this.open$.next([delay_, autohide_]); // Speed up opening if possible
                }
            }
        } else {
            if (this.close$.value === null) {
                this.autohide$.next(autohide_); // Opened => Update autohide
            } else {
                this.close$.next(null); // Closing => Cancel close
            }
        }
    }
    public close(delay: number = NaN): void {
        delay = isNaN(delay) ? this.closeDelay() : delay;
        if (!this._opened()) {
            if (this.open$.value === null) {
                // Closed => Do nothing;
            } else {
                this.open$.next(null); // Opening => Cancel open
            }
        } else {
            if (this.close$.value === null) {
                this.close$.next(delay); // Opened => Start close
            } else {
                const remainingDelay = this.closeStart! + this.close$.value - Date.now();
                if (remainingDelay > delay) {
                    this.close$.next(delay); // Speed up closing if possible
                }
            }
        }
    }
    public toggle(): void {
        if (!this._opened()) {
            this.open();
        } else {
            this.close();
        }
    }

    /** Trick the scroll strategy into updating the tooltip position */
    public updatePosition(): void {
        document.dispatchEvent(new Event('scroll'));
    }

    @HostListener('mouseenter') protected onMouseEnter(): void {
        if (this.triggerOnHover()) {
            this.open();
        }
    }
    @HostListener('mouseleave') protected onMouseLeave(): void {
        if (this.triggerOnHover()) {
            this.close();
        }
    }

    @HostListener('focus') protected onFocus(): void {
        if (this.triggerOnFocus()) {
            this.open();
        }
    }
    @HostListener('blur') protected onBlur(): void {
        if (this.triggerOnFocus()) {
            this.close();
        }
    }

    @HostListener('click', ['$event']) protected onClick(event: MouseEvent): void {
        this.lastHostClick = event.timeStamp;
        if (this.triggerOnClick()) {
            this.toggle();
        }
    }

    protected _manualOpenEffect = effect(() => {
        const state = this._manualOpenState();
        if (state === undefined) {
            return;
        }
        if (state) {
            untracked(() => this.open());
        } else if (!state) {
            untracked(() => this.close());
        }
    });
}
