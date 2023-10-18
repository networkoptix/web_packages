import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { calcClientX } from '@vms-client/utils/calculate-coordinates';
import { px } from '@vms-client/utils/type-aliases';

import { TimelineScrollbarRelativeService } from './timeline.scrollbarRelative.service';
import { TimelineService } from './timeline.service';
import type { TimelineScrollbarAbsoluteServiceStatus } from './timeline.services.types';

const MIN_BAR_WIDTH_PX = 50;

@Injectable({
    providedIn: 'root',
})
export class TimelineScrollbarAbsoluteService {
    constructor(
        private timeline: TimelineService,
        private relative: TimelineScrollbarRelativeService,
    ) {
        this.relative.subject.subscribe(this.emit.bind(this));
    }

    subject = new BehaviorSubject<TimelineScrollbarAbsoluteServiceStatus>({
        magnification: 1.0,
        offset: 0.0,
        isBarGrabbed: false,
        canScrollLeft: false,
        canScrollRight: false,
        isIllusionary: false,
        left: 0,
        honestLeft: 0,
        width: 0,
        honestWidth: 0,
    });

    private emit(): void {
        this.subject.next({
            ...this.relative.subject.value,
            isIllusionary: this.isIllusionary,
            left: this.left,
            honestLeft: this.honestLeft,
            width: this.width,
            honestWidth: this.honestWidth,
            isBarGrabbed: this.isBarGrabbed,
        });
    }

    private _backgroundWidth: px = 1000;

    get backgroundWidth(): px {
        return this._backgroundWidth;
    }

    set backgroundWidth(w: px) {
        this._backgroundWidth = w;
        this.emit();
    }

    private get isIllusionary(): boolean {
        return this.honestWidth < MIN_BAR_WIDTH_PX;
    }

    private get honestWidth(): px {
        return this.backgroundWidth / this.relative.magnification;
    }

    private get honestLeft(): px {
        return this.backgroundWidth * this.relative.offset;
    }

    private get dw(): px {
        return !this.isIllusionary ? 0 : MIN_BAR_WIDTH_PX - this.honestWidth;
    }

    private get width(): px {
        return this.isIllusionary ? MIN_BAR_WIDTH_PX : this.honestWidth;
    }

    private get left(): px {
        return this.isIllusionary
            ? this.honestLeft - this.dw * this.relative.offset
            : this.honestLeft;
    }

    private dragAnchorAbsolute: px = -1;
    private isBarGrabbed: boolean = false;

    handleBarMouseDown(e: MouseEvent | TouchEvent): void {
        this.dragAnchorAbsolute = calcClientX(e);
        this.isBarGrabbed = true;
        if (e instanceof MouseEvent) {
            e.stopPropagation();
            e.preventDefault();
        }
    }

    handleBarMouseUp(e: MouseEvent | TouchEvent): void {
        this.isBarGrabbed = false;
    }

    handleBarDragMouseMove(e: MouseEvent): void {
        if (this.isBarGrabbed) {
            const dx = calcClientX(e) - this.dragAnchorAbsolute;
            const leftEdgeMeansMs = this.timeline.visibleRange.start;

            // there's a dilemma:
            const msPerBarPixel = this.timeline.visibleRange.duration / this.honestWidth; // or just this.width
            // using honest width allows to keep mouse pointer and the bar in sync, but may cause some bumps
            // using visual width has kinda contrary behaviour
            // for now, using honestWidth feels to produce better UX (@gbezyuk)

            const newLeftEdgeMs = leftEdgeMeansMs + msPerBarPixel * dx;
            this.timeline.jumpScrollTo(newLeftEdgeMs); // don't animate the jump!
            this.dragAnchorAbsolute = calcClientX(e); // unless you found a way to get rid of this update
            // yet if you managed it, animation could make UX less bumpy
            this.emit();
        }
    }
}
