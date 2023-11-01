import { Component, AfterViewInit, ElementRef, ViewChild, HostListener } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { animationFrameScheduler, interval } from 'rxjs';

import { images } from '@static-variables';
import { PLAYBACK_MODE } from '@view/datatypes/PlaybackState';
import { px } from '@view/datatypes/type-aliases';
import { PlaybackService } from '@view/services/playback.service';

import { TimelineScrollbarAbsoluteService } from '../../services/timeline.scrollbarAbsolute.service';
import { TimelineScrollbarRelativeService } from '../../services/timeline.scrollbarRelative.service';
import { TimelineSelectionService } from '../../services/timeline.selection.service';
import { TimelineService } from '../../services/timeline.service';

// const MIN_BAR_WIDTH_PX = 50;

@UntilDestroy()
@Component({
    selector: 'nx-timeline-scrollbar',
    templateUrl: './timeline-scrollbar.component.html',
    styleUrls: ['./timeline-scrollbar.component.scss'],
})
export class TimelineScrollbarComponent implements AfterViewInit {
    images = images;

    @ViewChild('background') private backgroundView: ElementRef<HTMLDivElement>;
    @ViewChild('bar') private barView: ElementRef<HTMLDivElement>;
    @ViewChild('left') private leftView: ElementRef<HTMLDivElement>;
    @ViewChild('right') private rightView: ElementRef<HTMLDivElement>;

    canScrollLeft: boolean = false;
    canScrollRight: boolean = false;

    isBarGrabbed: boolean = false;
    private useTouch: boolean = false;
    private lastTouched: TouchEvent;

    showHonestBar: boolean = false;

    barLeftPx: px = 0;
    barWidthPx: px = 0;
    honestBarLeftPx: px = 0;
    honestBarWidthPx: px = 0;

    disabled: boolean = false;
    isPlaying: boolean = false;
    playbackLeftPixel: px = -1;

    isSelected: boolean = false;
    selectionLeftPixel: px = -1;
    selectionWidthPixel: px = 0;

    constructor(
        private timeline: TimelineService,
        private scrollbarAbsolute: TimelineScrollbarAbsoluteService,
        private scrollbarRelative: TimelineScrollbarRelativeService,
        private playback: PlaybackService,
        private selection: TimelineSelectionService,
        deviceService: DeviceDetectorService,
    ) {
        this.useTouch = deviceService.isTablet() || deviceService.isMobile();
    }

    ngAfterViewInit(): void {
        this.scrollbarAbsolute.subject.pipe(untilDestroyed(this)).subscribe(s => {
            setTimeout(() => {
                this.barLeftPx = s.left;
                this.barWidthPx = s.width;

                this.honestBarLeftPx = s.honestLeft;
                this.honestBarWidthPx = s.honestWidth;

                this.showHonestBar = s.isIllusionary;
                this.isBarGrabbed = s.isBarGrabbed;
                this.canScrollLeft = s.canScrollLeft;
                this.canScrollRight = s.canScrollRight;
            });
        });

        this.playback.subject.pipe(untilDestroyed(this)).subscribe(s => {
            if (s.mode === PLAYBACK_MODE.STOPPED) {
                this.isPlaying = false;
            } else {
                setTimeout(() => {
                    const ct = s.currentTime;
                    const vr = this.timeline.visibleRange;
                    const fr = this.timeline.fullRange;
                    if (ct >= vr.start && ct <= vr.end) {
                        // render on the scroll bar
                        const x0 = this.barLeftPx;
                        const width = this.barWidthPx;
                        const duration = vr.duration;
                        const t = ct - vr.start;
                        this.playbackLeftPixel = x0 + (width * t) / duration;
                    } else if (ct > vr.end) {
                        // after the bar
                        const duration = this.timeline.fullRange.end - vr.end;
                        const width =
                            this.backgroundView.nativeElement.getBoundingClientRect().width -
                            (this.barLeftPx + this.barWidthPx);
                        const x0 = this.barLeftPx + this.barWidthPx;
                        const t = ct - vr.end;
                        this.playbackLeftPixel = x0 + (width * t) / duration;
                    } else {
                        // before the bar
                        const duration = vr.start - this.timeline.fullRange.start;
                        const width = this.barLeftPx;
                        const x0 = 0;
                        const t = ct - fr.start;
                        this.playbackLeftPixel = x0 + (width * t) / duration;
                    }
                    this.isPlaying = true;
                }, 0);
            }
        });

        this.selection.subject.pipe(untilDestroyed(this)).subscribe(s => {
            this.isSelected = s.isActive;
            if (s.isActive) {
                const bgw = this.backgroundView.nativeElement.getBoundingClientRect().width;
                this.selectionLeftPixel =
                    (bgw * (s.range.start - this.timeline.fullRange.start)) /
                    this.timeline.fullRange.duration;
                this.selectionWidthPixel =
                    (bgw * s.range.duration) / this.timeline.fullRange.duration;
            } else {
                this.selectionLeftPixel = -1;
                this.selectionWidthPixel = 0;
            }

            this.disabled = !!s.dragMode || s.hoverMode;
        });

        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this.scrollbarRelative.updateIfMouseIsDown();
            });

        setTimeout(() => this.onResize(), 0);
    }

    barDblClickHandler(e: MouseEvent | TouchEvent): void {
        this.scrollbarRelative.handleBarDblClick(e);
    }

    barMouseDownHandler(e: MouseEvent | TouchEvent): void {
        this.scrollbarAbsolute.handleBarMouseDown(e);
    }

    @HostListener('touchstart', ['$event'])
    touchStartHandler(e: TouchEvent): void {
        if (!this.useTouch) {
            return;
        }
        const lastTouched = this.lastTouched;
        // Detect and handle double touches
        if (lastTouched?.target === e.target && lastTouched?.timeStamp + 500 > e.timeStamp) {
            switch (e.target) {
                case this.leftView.nativeElement:
                    this.buttonLeftDblClickHandler();
                    break;
                case this.rightView.nativeElement:
                    this.buttonRightDblClickHandler();
                    break;
                case this.backgroundView.nativeElement:
                    this.backgroundDblClickHandler(e);
                    break;
                case this.barView.nativeElement:
                    this.barDblClickHandler(e);
                    break;
                default:
                    break;
            }
        }
        this.lastTouched = e;
    }

    @HostListener('touchend', ['$event'])
    touchEndHandler(e: TouchEvent): void {
        if (!this.useTouch) {
            return;
        }
        setTimeout(() => {
            this.scrollbarRelative.handleBackgroundMouseUp(e);
            this.scrollbarAbsolute.handleBarMouseUp(e);
        }, 100);
    }

    @HostListener('touchmove', ['$event'])
    barTouchMoveHandler(e: MouseEvent): void {
        if (!this.useTouch) {
            return;
        }
        switch (e.target) {
            case this.barView.nativeElement:
                this.scrollbarAbsolute.handleBarDragMouseMove(e);
                break;
            case this.backgroundView.nativeElement:
                this.scrollbarRelative.handleBackgroundMouseDown(e);
                break;
            default:
                break;
        }
    }

    @HostListener('mouseup', ['$event'])
    mouseUpHandler(e: MouseEvent): void {
        if (this.useTouch) {
            return;
        }
        this.scrollbarRelative.handleBackgroundMouseUp(e);
        this.scrollbarAbsolute.handleBarMouseUp(e);
    }

    @HostListener('mousemove', ['$event'])
    barDragMouseMoveHandler(e: MouseEvent): void {
        if (this.useTouch) {
            return;
        }
        this.scrollbarAbsolute.handleBarDragMouseMove(e);
    }

    @HostListener('mouseleave', ['$event'])
    mouseLeaveHandler(e: MouseEvent): void {
        this.mouseUpHandler(e);
    }

    backgroundMouseDownHandler(e: MouseEvent): void {
        this.scrollbarRelative.handleBackgroundMouseDown(e);
    }

    backgroundDblClickHandler(e: MouseEvent | TouchEvent): void {
        this.scrollbarRelative.handleBackgroundDblClick(e);
    }

    buttonLeftMouseDownHandler(): void {
        this.scrollbarRelative.handleButtonLeftMouseDown();
    }

    buttonRightMouseDownHandler(): void {
        this.scrollbarRelative.handleButtonRightMouseDown();
    }

    private prevMouseUpTime: number;
    private doubleClickDelay: number = 300; // ms
    buttonLeftHandleMouseUp(): void {
        const now = Date.now();
        if (now - this.prevMouseUpTime < this.doubleClickDelay) {
            this.buttonLeftDblClickHandler();
        }
        this.prevMouseUpTime = now;
    }

    buttonRightHandleMouseUp(): void {
        const now = Date.now();
        if (now - this.prevMouseUpTime < this.doubleClickDelay) {
            this.buttonRightDblClickHandler();
        }
        this.prevMouseUpTime = now;
    }

    barHandleMouseUp(e: MouseEvent | TouchEvent): void {
        // this UX is a bit doubtful
        const now = Date.now();
        if (now - this.prevMouseUpTime < this.doubleClickDelay) {
            this.barDblClickHandler(e);
        }
        this.prevMouseUpTime = now;
    }

    buttonLeftDblClickHandler(): void {
        this.scrollbarRelative.handleButtonLeftDblClick();
    }

    buttonRightDblClickHandler(): void {
        this.scrollbarRelative.handleButtonRightDblClick();
    }

    @HostListener('window:resize', ['$event'])
    onResize(): void {
        setTimeout(() => {
            // wait native element to actually resize ... otherwise we're measuring old size -- TT
            this.scrollbarAbsolute.backgroundWidth =
                this.backgroundView.nativeElement.getBoundingClientRect().width;
        });
    }
}
