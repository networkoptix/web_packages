import {
    Component,
    AfterViewInit,
    ElementRef,
    ViewChild,
    HostListener
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { DeviceDetectorService } from 'ngx-device-detector';
import { animationFrameScheduler, interval } from 'rxjs';

import type { IConfig } from '@services/nx-config/config-types';
import { NxConfigService } from '@services/nx-config/nx-config.service';
import {
    PlaybackState,
    PLAYBACK_MODE
} from '@vms-client/submodules/playback/datatypes/PlaybackState';
import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import { float, px } from '@vms-client/utils/type-aliases';

import {
    TimelineScrollbarAbsoluteService,
} from '../../services/timeline.scrollbarAbsolute.service';
import { TimelineScrollbarRelativeService } from '../../services/timeline.scrollbarRelative.service';
import {
    TimelineSelectionService,
} from '../../services/timeline.selection.service';
import { TimelineService } from '../../services/timeline.service';
import type {
    TimelineScrollbarAbsoluteServiceStatus,
    TimelineSelectionServiceStatus,
} from '../../services/timeline.services.types';

// const MIN_BAR_WIDTH_PX = 50;

@UntilDestroy()
@Component({
    selector: 'timeline-scrollbar',
    templateUrl: './timeline-scrollbar.component.html',
    styleUrls: ['./timeline-scrollbar.component.scss']
})
export class TimelineScrollbarComponent implements AfterViewInit {
    CONFIG: IConfig;

    @ViewChild('background') backgroundView: ElementRef<HTMLDivElement>;
    @ViewChild('bar') barView: ElementRef<HTMLDivElement>;
    @ViewChild('honestBar') honestBarView: ElementRef<HTMLDivElement>;
    @ViewChild('currentPlayback') currentPlaybackView: ElementRef<HTMLDivElement>;
    @ViewChild('left') leftView: ElementRef<HTMLDivElement>;
    @ViewChild('right') rightView: ElementRef<HTMLDivElement>;
    @ViewChild('currentSelection') currentSelectionView: ElementRef<HTMLDivElement>;

    public canScrollLeft: boolean = false;
    public canScrollRight: boolean = false;

    public isBarGrabbed: boolean = false;
    private useTouch: boolean = false;
    private lastTouched: TouchEvent;

    public showHonestBar: boolean = false;
    protected _magnification: float;

    public barLeftPx: px = 0;
    public barWidthPx: px = 0;
    public honestBarLeftPx: px = 0;
    public honestBarWidthPx: px = 0;

    public disabled: boolean = false;
    public isPlaying: boolean = false;
    public playbackLeftPixel: px = -1;

    public isSelected: boolean = false;
    public selectionLeftPixel: px = -1;
    public selectionWidthPixel: px = 0;

    constructor(
        protected timeline: TimelineService,
        protected scrollbarAbsolute: TimelineScrollbarAbsoluteService,
        protected scrollbarRelative: TimelineScrollbarRelativeService,
        protected playback: PlaybackService,
        protected selection: TimelineSelectionService,
        configService: NxConfigService,
        deviceService: DeviceDetectorService,
    ) {
        this.CONFIG = configService.getConfig();
        this.useTouch = deviceService.isTablet() || deviceService.isMobile();
    }

    public ngAfterViewInit(): void {
        this.scrollbarAbsolute.subject
            .pipe(untilDestroyed(this))
            .subscribe((s:TimelineScrollbarAbsoluteServiceStatus) => {
                setTimeout(() => {
                    this.onScrollBarSubjectChange(s);
                });
            });

        this.playback.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: PlaybackState) => {
                this.onPlaybackSubjectChange(s);
            });

        this.selection.subject
            .pipe(untilDestroyed(this))
            .subscribe((s: TimelineSelectionServiceStatus) => {
                this.onSelectionSubjectChange(s);
            });

        interval(0, animationFrameScheduler)
            .pipe(untilDestroyed(this))
            .subscribe(() => {
                this._onAnimationFrame();
            });

        setTimeout(() => this.onResize(), 0);
    }

    private _onAnimationFrame(): void {
        this.scrollbarRelative.updateIfMouseIsDown();
    }

    public onScrollBarSubjectChange(s: TimelineScrollbarAbsoluteServiceStatus): void {
        this.barLeftPx = s.left;
        this.barWidthPx = s.width;

        this.honestBarLeftPx = s.honestLeft;
        this.honestBarWidthPx = s.honestWidth;

        this.showHonestBar = s.isIllusionary;
        this.isBarGrabbed = s.isBarGrabbed;
        this.canScrollLeft = s.canScrollLeft;
        this.canScrollRight = s.canScrollRight;

        this._magnification = s.magnification;
    }

    public onPlaybackSubjectChange(s: PlaybackState): void {
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
                    this.playbackLeftPixel = x0 + width * t / duration;
                } else if (ct > vr.end) {
                    // after the bar
                    const duration = this.timeline.fullRange.end - vr.end;
                    const width = this.backgroundView.nativeElement
                        .getBoundingClientRect().width -
                        (this.barLeftPx + this.barWidthPx);
                    const x0 = this.barLeftPx + this.barWidthPx;
                    const t = ct - vr.end;
                    this.playbackLeftPixel = x0 + width * t / duration;
                } else {
                    // before the bar
                    const duration = vr.start - this.timeline.fullRange.start;
                    const width = this.barLeftPx;
                    const x0 = 0;
                    const t = ct - fr.start;
                    this.playbackLeftPixel = x0 + width * t / duration;
                }
                this.isPlaying = true;
            }, 0);
        }
    }

    public onSelectionSubjectChange(s: TimelineSelectionServiceStatus): void {
        this.isSelected = s.isActive;
        if (s.isActive) {
            const bgw = this.backgroundView.nativeElement
                .getBoundingClientRect().width;
            this.selectionLeftPixel = bgw *
                (s.range.start - this.timeline.fullRange.start) /
                this.timeline.fullRange.duration;
            this.selectionWidthPixel = bgw *
                s.range.duration /
                this.timeline.fullRange.duration;
        } else {
            this.selectionLeftPixel = -1;
            this.selectionWidthPixel = 0;
        }

        this.disabled = (s.dragMode as unknown as boolean) || s.hoverMode;
    }

    public barDblClickHandler(e: MouseEvent | TouchEvent): void {
        this.scrollbarRelative.handleBarDblClick(e);
    }

    public barMouseDownHandler(e: MouseEvent | TouchEvent): void {
        this.scrollbarAbsolute.handleBarMouseDown(e);
    }

    @HostListener('touchstart', ['$event'])
    public touchStartHandler(e: any): void {
        if (!this.useTouch) {
            return;
        }
        const lastTouched = this.lastTouched;
        // Detect and handle double touches
        if (
            lastTouched?.target === e.target &&
            lastTouched?.timeStamp + 500 > e.timeStamp
        ) {
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
    public touchEndHandler(e: TouchEvent): void {
        if (!this.useTouch) {
            return;
        }
        setTimeout(() => {
            this.scrollbarRelative.handleBackgroundMouseUp(e);
            this.scrollbarAbsolute.handleBarMouseUp(e);
        }, 100);
    }

    @HostListener('touchmove', ['$event'])
    public barTouchMoveHandler(e: MouseEvent): void {
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
    public mouseUpHandler(e: MouseEvent): void {
        if (this.useTouch) {
            return;
        }
        this.scrollbarRelative.handleBackgroundMouseUp(e);
        this.scrollbarAbsolute.handleBarMouseUp(e);
    }

    @HostListener('mousemove', ['$event'])
    public barDragMouseMoveHandler(e: MouseEvent): void {
        if (this.useTouch) {
            return;
        }
        this.scrollbarAbsolute.handleBarDragMouseMove(e);
    }

    @HostListener('mouseleave', ['$event'])
    public mouseLeaveHandler(e: MouseEvent): void {
        this.mouseUpHandler(e);
    }

    public backgroundMouseDownHandler(e: MouseEvent): void {
        this.scrollbarRelative.handleBackgroundMouseDown(e);
    }

    public backgroundDblClickHandler(e: MouseEvent): void {
        this.scrollbarRelative.handleBackgroundDblClick(e);
    }

    public buttonLeftMouseDownHandler(): void {
        this.scrollbarRelative.handleButtonLeftMouseDown();
    }

    public buttonRightMouseDownHandler(): void {
        this.scrollbarRelative.handleButtonRightMouseDown();
    }

    protected _prevMouseUpTime: number;
    protected _doubleClickDelay: number = 300; // ms
    public buttonLeftHandleMouseUp(): void {
        const now = Date.now();
        if (now - this._prevMouseUpTime < this._doubleClickDelay) {
            this.buttonLeftDblClickHandler();
        }
        this._prevMouseUpTime = now;
    }

    public buttonRightHandleMouseUp(): void {
        const now = Date.now();
        if (now - this._prevMouseUpTime < this._doubleClickDelay) {
            this.buttonRightDblClickHandler();
        }
        this._prevMouseUpTime = now;
    }

    public barHandleMouseUp(e: MouseEvent | TouchEvent): void { // this UX is a bit doubtful
        const now = Date.now();
        if (now - this._prevMouseUpTime < this._doubleClickDelay) {
            this.barDblClickHandler(e);
        }
        this._prevMouseUpTime = now;
    }

    public buttonLeftDblClickHandler(): void {
        this.scrollbarRelative.handleButtonLeftDblClick();
    }

    public buttonRightDblClickHandler(): void {
        this.scrollbarRelative.handleButtonRightDblClick();
    }

    @HostListener('window:resize', ['$event'])
    public onResize(): void {
        setTimeout(() => {
            // wait native element to actually resize ... otherwise we're measuring old size -- TT
            this.scrollbarAbsolute.backgroundWidth =
                this.backgroundView.nativeElement.getBoundingClientRect().width;
        });
    }
}
