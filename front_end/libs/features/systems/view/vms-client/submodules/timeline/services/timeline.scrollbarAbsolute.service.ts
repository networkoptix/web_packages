import { Injectable, isDevMode } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { calcClientX } from '@vms-client/utils/calculate-coordinates';
import { px } from '@vms-client/utils/type-aliases';

import { TimelineScrollbarRelativeService } from './timeline.scrollbarRelative.service';
import { TimelineService } from './timeline.service';
import type { TimelineScrollbarAbsoluteServiceStatus } from './timeline.services.types';

const MIN_BAR_WIDTH_PX = 50;

@Injectable({
    providedIn: 'root'
})
export class TimelineScrollbarAbsoluteService {
    protected _logPrefix: string = 'SCROLLBAR_ABSOLUTE_SERVICE ::';
    protected _logDisable: boolean = true;

    protected _log(...args: any[]): void {
        if (isDevMode() && !this._logDisable) {
            // eslint-disable-next-line no-useless-call
            console.log.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    protected _warn(...args: any[]): void {
        if (isDevMode() && !this._logDisable) {
            // eslint-disable-next-line no-useless-call
            console.warn.apply(console, [this._logPrefix, ...arguments]);
        }
    }

    constructor(
        protected timeline: TimelineService,
        protected relative: TimelineScrollbarRelativeService,
    ) {
        this.relative.subject.subscribe(this._emit.bind(this));
    }

    protected _subject = new BehaviorSubject<TimelineScrollbarAbsoluteServiceStatus>({
        magnification: 1.0,
        offset: 0.0,
        isBarGrabbed: false,
        canScrollLeft: false,
        canScrollRight: false,
        isIllusionary: false,
        left: 0,
        honestLeft: 0,
        width: 0,
        honestWidth: 0
    });

    protected _emit(): void {
        this._subject.next({
            ...this.relative.subject.value,
            isIllusionary: this.isIllusionary,
            left: this.left,
            honestLeft: this.honestLeft,
            width: this.width,
            honestWidth: this.honestWidth,
            isBarGrabbed: this._isBarGrabbed
        });
    }

    public get subject(): BehaviorSubject<TimelineScrollbarAbsoluteServiceStatus> {
        return this._subject;
    }

    protected _backgroundWidth: px = 1000;

    public get backgroundWidth(): px {
        return this._backgroundWidth;
    }

    public set backgroundWidth(w: px) {
        this._log('new width', w);
        this._backgroundWidth = w;
        this._emit();
    }

    public get isIllusionary(): boolean {
        return this.honestWidth < MIN_BAR_WIDTH_PX;
    }

    public get honestWidth(): px {
        return this.backgroundWidth / this.relative.magnification;
    }

    public get honestLeft(): px {
        return this.backgroundWidth * this.relative.offset;
    }

    public get dw(): px {
        return !this.isIllusionary ? 0 : MIN_BAR_WIDTH_PX - this.honestWidth;
    }

    public get width(): px {
        return this.isIllusionary ? MIN_BAR_WIDTH_PX : this.honestWidth;
    }

    public get left(): px {
        return this.isIllusionary
            ? this.honestLeft - this.dw * this.relative.offset
            : this.honestLeft;
    }

    protected _dragAnchorAbsolute: px = -1;
    protected _isBarGrabbed: boolean = false;

    public handleBarMouseDown(e: MouseEvent | TouchEvent): void {
        this._dragAnchorAbsolute = calcClientX(e);
        this._isBarGrabbed = true;
        if (e instanceof MouseEvent) {
            e.stopPropagation();
            e.preventDefault();
        }
    }

    public handleBarMouseUp(e: MouseEvent | TouchEvent): void {
        this._isBarGrabbed = false;
    }

    public handleBarDragMouseMove(e: MouseEvent): void {
        if (this._isBarGrabbed) {
            const dx = calcClientX(e) - this._dragAnchorAbsolute;
            const leftEdgeMeansMs = this.timeline.visibleRange.start;

            // there's a dilemma:
            const msPerBarPixel = this.timeline.visibleRange.duration / this.honestWidth; // or just this.width
            // using honest width allows to keep mouse pointer and the bar in sync, but may cause some bumps
            // using visual width has kinda contrary behaviour
            // for now, using honestWidth feels to produce better UX (@gbezyuk)

            const newLeftEdgeMs = leftEdgeMeansMs + msPerBarPixel * dx;
            this.timeline.jumpScrollTo(newLeftEdgeMs); // don't animate the jump!
            this._dragAnchorAbsolute = calcClientX(e); // unless you found a way to get rid of this update
            // yet if you managed it, animation could make UX less bumpy
            this._emit();
        }
    }
}
