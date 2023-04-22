import { CdkDrag, CdkDragMove, CdkDragStart } from '@angular/cdk/drag-drop';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';

import { images } from '@lib/variables/static-variables';
import { NgChanges } from '@utils/ng-changes';
import { SCROLL_DIRECTION } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/scroll/scroll.types';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';

// const MIN_BAR_WIDTH_PX = 50;

@UntilDestroy()
@Component({
    selector: 'nx-timeline-scroll',
    templateUrl: './timeline-scroll.component.html',
    styleUrls: ['./timeline-scroll.component.scss']
})
export class TimelineScrollComponent implements OnChanges {
    @Input('zoomLevel') zoomLevel:number = 1;

    @Output() singleScroll = new EventEmitter<SCROLL_DIRECTION>();
    @Output() constantScroll = new EventEmitter<{
        direction: SCROLL_DIRECTION;
        action: string;
    }>();

    @ViewChild('background') backgroundView: ElementRef<HTMLDivElement>;
    @ViewChild('bar') barView: ElementRef<HTMLDivElement>;
    @ViewChild('honestBar') honestBarView: ElementRef<HTMLDivElement>;
    @ViewChild('currentPlayback') currentPlaybackView: ElementRef<HTMLDivElement>;
    @ViewChild('left') leftView: ElementRef<HTMLDivElement>;
    @ViewChild('right') rightView: ElementRef<HTMLDivElement>;
    @ViewChild('currentSelection') currentSelectionView: ElementRef<HTMLDivElement>;

    images = images;
    timeoutScroll: NodeJS.Timeout;

    draggable: CdkDrag;
    barWidth: string = '100%';
    public isBarGrabbed: boolean = false;
    public showHonestBar: boolean = false;

    // public barLeftPx: px = 0;
    // public barWidthPx: px = 0;
    // public honestBarLeftPx: px = 0;
    // public honestBarWidthPx: px = 0;
    onSelectionDrag: boolean = false;
    canScrollLeft: boolean;
    canScrollRight: boolean;
    currentPos: number;

    continuousScroll: boolean = false;
    public disabled: boolean = false;
    public isSelected: boolean = false;
    SCROLL_DIRECTION = SCROLL_DIRECTION;

    constructor(
        webglService: NxWebGLService,
    ) {
        webglService.canScroll$
            .pipe(untilDestroyed(this))
            .subscribe(subject => {
                this.canScrollLeft = subject.left;
                if (!subject.left) {
                    this.constantScroll.emit({
                        direction: SCROLL_DIRECTION.left,
                        action: 'stop'
                    });
                }
                this.canScrollRight = subject.right;
                if (!subject.right) {
                    this.constantScroll.emit({
                        direction: SCROLL_DIRECTION.right,
                        action: 'stop'
                    });
                }
            });

        webglService.selectionDrag$
            .pipe(untilDestroyed(this))
            .subscribe(value => {
                this.onSelectionDrag = value;
            });
    }

    ngOnChanges(changes: NgChanges<TimelineScrollComponent>): void {
        if (changes.zoomLevel?.currentValue) {
            const zoom = Math.trunc(changes.zoomLevel.currentValue);
            if (zoom === 1) {
                this.barWidth = '100%';
                this.draggable.setFreeDragPosition({ x: 0, y: 0 });
            } else {
                this.barWidth = 100 - zoom + '%';
                this.draggable.setFreeDragPosition({ x: zoom, y: 0 });
            }
        }
    }

    handleBarMouseUp(e: MouseEvent | TouchEvent): void {
        // this.isBarGrabbed = false;
    }

    handleBarMouseDown(e: MouseEvent | TouchEvent): void {
        // debugger;
    }

    setDraggable(e: CdkDragStart): void {
        this.draggable = e.source;
    }

    handleBarDragMouseMove(e: CdkDragMove): void {
        const dir = this.currentPos > e.source.getFreeDragPosition().x
            ? 0
            : 1;
        this.currentPos = e.source.getFreeDragPosition().x;
        // console.log('e => ', e.source.getFreeDragPosition());
        this.singleScroll.emit(dir);
    }

    scrollTo(direction: SCROLL_DIRECTION): void {
        if (direction === SCROLL_DIRECTION.constantLeft || direction === SCROLL_DIRECTION.constantRight) {
            this.continuousScroll = true;
            this.constantScroll.emit({
                direction,
                action: 'start'
            });
            return;
        }
        this.singleScroll.emit(direction);
    }

    scrollStop(direction: SCROLL_DIRECTION): void {
        if (this.continuousScroll) {
            this.constantScroll.emit({
                direction,
                action: 'stop'
            });
            this.continuousScroll = false;
        }
    }
}
