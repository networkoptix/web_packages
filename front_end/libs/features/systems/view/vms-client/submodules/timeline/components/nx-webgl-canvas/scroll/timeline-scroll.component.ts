import { CdkDrag, CdkDragStart } from '@angular/cdk/drag-drop';
import { Component, ElementRef, EventEmitter, Output, Input, ViewChild } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { images } from '@static-variables';
import { SCROLL_DIRECTION } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/scroll.types';
import { ExportSelection } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/selection/selection.types';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';

@UntilDestroy()
@Component({
    selector: 'nx-timeline-scroll',
    templateUrl: './timeline-scroll.component.html',
    styleUrls: ['./timeline-scroll.component.scss'],
})
export class TimelineScrollComponent {
    @Input() barWidth: number;
    @Input() barPos: number;
    @Input() playbackPos: number;

    @Output() singleScroll = new EventEmitter<SCROLL_DIRECTION>();
    @Output() constantScroll = new EventEmitter<{
        direction: SCROLL_DIRECTION;
        action: string;
    }>();
    @Output() scrollToPos = new EventEmitter<{
        direction: SCROLL_DIRECTION;
        position: number;
    }>();
    @Output() scrollEnd = new EventEmitter<boolean>();

    @ViewChild('background') backgroundView: ElementRef<HTMLDivElement>;
    @ViewChild('bar') barView: ElementRef<HTMLDivElement>;
    @ViewChild('left') leftView: ElementRef<HTMLDivElement>;
    @ViewChild('right') rightView: ElementRef<HTMLDivElement>;
    // @ViewChild('currentSelection') currentSelectionView: ElementRef<HTMLDivElement>;

    images = images;

    public isBarGrabbed: boolean = false;
    draggable: CdkDrag;
    selectionStart: number;
    selectionWidth: number;
    onSelectionDrag: boolean = false;
    onScrollBarScroll: boolean = false;
    canScrollLeft: boolean;
    canScrollRight: boolean;
    currentPos: number;

    continuousScroll: boolean = false;
    public disabled: boolean = false;
    public isSelected: boolean = false;

    SCROLL_DIRECTION = SCROLL_DIRECTION;

    constructor(public webglService: NxWebGLService) {
        webglService.canScroll$.pipe(untilDestroyed(this)).subscribe(subject => {
            this.canScrollLeft = subject.left;
            if (!subject.left) {
                this.constantScroll.emit({
                    direction: SCROLL_DIRECTION.left,
                    action: 'stop',
                });
            }
            this.canScrollRight = subject.right;
            if (!subject.right) {
                this.constantScroll.emit({
                    direction: SCROLL_DIRECTION.right,
                    action: 'stop',
                });
            }
        });

        webglService.selectionDrag$.pipe(untilDestroyed(this)).subscribe(value => {
            this.onSelectionDrag = value;
        });

        webglService.scrollBarScroll$.pipe(untilDestroyed(this)).subscribe(value => {
            this.onScrollBarScroll = value;
        });

        webglService.selection$.subscribe((selection: ExportSelection) => {
            const end: number = webglService.xScaleOriginal$.value(selection.endDate);
            this.selectionStart = webglService.xScaleOriginal$.value(selection.startDate);
            this.selectionWidth = end - this.selectionStart;
        });

        // webglService.canvasWidth$
        //     .pipe(untilDestroyed(this))
        //     .subscribe(value => {
        //         this.overallWidth = value * webglService.levelZoom$.value;
        //     });
        //
        // webglService.levelZoom$
        //     .pipe(untilDestroyed(this))
        //     .subscribe(value => {
        //         this.overallWidth = webglService.canvasWidth$.value * value;
        //     });
        // webglService.levelZoom$
        //     .pipe(untilDestroyed(this))
        //     .subscribe(level => {
        //         const zoom = Math.trunc(level);
        //         if (zoom === 1) {
        //             this.barWidth = '100%';
        //             this.draggable?.setFreeDragPosition({ x: 0, y: 0 });
        //         } else {
        //             this.barWidth = 100 - (zoom / 5) + '%';
        //             this.draggable?.setFreeDragPosition({ x: zoom, y: 0 });
        //         }
        //     });
    }

    // handleBarMouseUp(e: MouseEvent | TouchEvent): void {
    //     // this.isBarGrabbed = false;
    // }
    //
    // handleBarMouseDown(e: MouseEvent | TouchEvent): void {
    //     // debugger;
    // }

    // setDraggable(e: CdkDragStart): void {
    //     // this.draggable = e.source;
    //     e.event.preventDefault();
    // }

    // eslint-disable-next-line nx/no-untyped-arg
    handleBarClick(e): void {
        if (e.target.id === 'background') {
            const barLow = e.offsetX - this.barWidth / 2;
            const barHigh = e.offsetX + this.barWidth;
            // this.currentPos = bar > 0 ? bar : 0;
            this.barPos =
                barLow < 0
                    ? 0
                    : barHigh < this.webglService.canvasWidth$.value
                    ? barLow
                    : this.webglService.canvasWidth$.value - this.barWidth;

            this.scrollToPos.emit({ direction: SCROLL_DIRECTION.scrollTo, position: this.barPos });
        }
    }

    handleBarDragMove(e: CdkDragStart): void {
        // CdlDrag uses translate to manage element position
        this.currentPos = this.barPos + e.source.getFreeDragPosition().x;
        this.webglService.scrollBarScroll$.next(true);
        this.scrollToPos.emit({ direction: SCROLL_DIRECTION.scrollTo, position: this.currentPos });
    }

    // eslint-disable-next-line nx/no-untyped-arg
    handleBarDragEnd(e): void {
        e.source.reset();
        this.webglService.scrollBarScroll$.next(false);
        this.scrollEnd.emit(true);
    }

    scrollTo(direction: SCROLL_DIRECTION): void {
        if (
            direction === SCROLL_DIRECTION.constantLeft ||
            direction === SCROLL_DIRECTION.constantRight
        ) {
            this.continuousScroll = true;
            this.constantScroll.emit({
                direction,
                action: 'start',
            });
            return;
        }
        this.singleScroll.emit(direction);
    }

    // scrollStop(direction: SCROLL_DIRECTION): void {
    //     if (this.continuousScroll) {
    //         this.constantScroll.emit({
    //             direction,
    //             action: 'stop',
    //         });
    //         this.continuousScroll = false;
    //     }
    // }
}
