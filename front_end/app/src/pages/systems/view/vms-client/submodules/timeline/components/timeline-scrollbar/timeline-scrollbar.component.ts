import { Component, AfterViewInit, OnDestroy, ElementRef, ViewChild, OnInit, HostListener } from '@angular/core';
import { Subscription } from 'rxjs';
import PlaybackService from '../../../playback/services/playback.service';
import { PlaybackState, PLAYBACK_MODE } from '../../../playback/datatypes/PlaybackState';

import {
    TimelineScrollbarAbsoluteService,
    TimelineScrollbarAbsoluteServiceStatus
} from '../../services/timeline.scrollbarAbsolute.service';
import TimelineScrollbarRelativeService from '../../services/timeline.scrollbarRelative.service';
import TimelineService from '../../services/timeline.service';
import { float, px } from '../../../../utils/type-aliases';
import { LoggerDecorator } from '@pages/systems/view/vms-client/utils';
import { NxUtilsService } from '@services/utils.service';
import { IConfig, NxConfigService } from '@services/nx-config';

const MIN_BAR_WIDTH_PX = 50;

@Component({
    selector    : 'timeline-scrollbar',
    templateUrl : './timeline-scrollbar.component.html',
    styleUrls   : ['./timeline-scrollbar.component.scss']
})
@LoggerDecorator('TIMELINE SCROLLBAR ::', true)
export class TimelineScrollbarComponent implements AfterViewInit, OnDestroy {
    _log: Function
    _warn: Function

    CONFIG: IConfig;

    @ViewChild('background') backgroundView: ElementRef;
    @ViewChild('bar') barView: ElementRef;
    @ViewChild('honestBar') honestBarView: ElementRef;
    @ViewChild('currentPlayback') currentPlaybackView: ElementRef;
    @ViewChild('left') leftView: ElementRef;
    @ViewChild('right') rightView: ElementRef;

    protected scrollbarSubscription: Subscription;
    protected playbackSubscription: Subscription;

    public canScrollLeft: boolean = false;
    public canScrollRight: boolean = false;

    public isBarGrabbed: boolean = false
    private useTouch: boolean = false;
    private lastTouched: TouchEvent;

    public showHonestBar: boolean = false;

    constructor (
        private self: ElementRef,
        protected timeline: TimelineService,
        protected scrollbarAbsolute: TimelineScrollbarAbsoluteService,
        protected scrollbarRelative: TimelineScrollbarRelativeService,
        protected playback: PlaybackService,
        configService: NxConfigService,
        nxUtilsService: NxUtilsService
    ) {
        this.CONFIG = configService.getConfig();
        this.onScrollBarSubjectChange = this.onScrollBarSubjectChange.bind(this);
        this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this);
        this.useTouch = nxUtilsService.isTablet() || nxUtilsService.isMobile();
    }

    public ngAfterViewInit (): void {
        this.scrollbarSubscription = this.scrollbarAbsolute.subject.subscribe((s:TimelineScrollbarAbsoluteServiceStatus) => {
            setTimeout(() => {
                this.onScrollBarSubjectChange(s);
            });
        });
        this.playbackSubscription = this.playback.subject.subscribe(this.onPlaybackSubjectChange);
        this._animationFrameRequestHandler = requestAnimationFrame(() => this.onAnimationFrame());
        setTimeout(() => this.onResize(), 0);
    }

    public ngOnDestroy (): void {
        this.scrollbarSubscription.unsubscribe();
        this.playbackSubscription.unsubscribe();
        cancelAnimationFrame(this._animationFrameRequestHandler);
    }

    protected _magnification: float

    public barLeftPx: px = 0;
    public barWidthPx: px = 0;
    public honestBarLeftPx: px = 0;
    public honestBarWidthPx: px = 0;

    public onScrollBarSubjectChange (s: TimelineScrollbarAbsoluteServiceStatus) {
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

    public isPlaying: boolean = false;
    public playbackLeftPixel: px = -1;

    public onPlaybackSubjectChange (s: PlaybackState) {
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
                    const width = this.backgroundView.nativeElement.getBoundingClientRect().width - (this.barLeftPx + this.barWidthPx);
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

    public barDblClickHandler (e: MouseEvent|TouchEvent) {
        this.scrollbarRelative.handleBarDblClick(e);
    }

    public barMouseDownHandler (e: MouseEvent|TouchEvent) {
        this.scrollbarAbsolute.handleBarMouseDown(e);
    }

    @HostListener('document:touchstart', ['$event'])
    public touchStartHandler (e: any) {
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

    @HostListener('document:touchend', ['$event'])
    public touchEndHandler (e: TouchEvent) {
        if (!this.useTouch) {
            return;
        }
        setTimeout(() => {
            this.scrollbarRelative.handleBackgroundMouseUp(e);
            this.scrollbarAbsolute.handleBarMouseUp(e);
        }, 100);
    }

    @HostListener('document:touchmove', ['$event'])
    public barTouchMoveHandler (e: MouseEvent) {
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

    @HostListener('document:mouseup', ['$event'])
    public mouseUpHandler (e: MouseEvent) {
        if (this.useTouch) {
            return;
        }
        this.scrollbarRelative.handleBackgroundMouseUp(e);
        this.scrollbarAbsolute.handleBarMouseUp(e);
    }

    @HostListener('document:mousemove', ['$event'])
    public barDragMouseMoveHandler (e: MouseEvent) {
        if (this.useTouch) {
            return;
        }
        this.scrollbarAbsolute.handleBarDragMouseMove(e);
    }

    public backgroundMouseDownHandler (e: MouseEvent) {
        this.scrollbarRelative.handleBackgroundMouseDown(e);
    }

    public backgroundDblClickHandler (e: MouseEvent) {
        this.scrollbarRelative.handleBackgroundDblClick(e);
    }

    public buttonLeftMouseDownHandler () {
        this.scrollbarRelative.handleButtonLeftMouseDown();
    }

    public buttonRightMouseDownHandler () {
        this.scrollbarRelative.handleButtonRightMouseDown();
    }

    public buttonLeftDblClickHandler () {
        this.scrollbarRelative.handleButtonLeftDblClick();
    }

    public buttonRightDblClickHandler () {
        this.scrollbarRelative.handleButtonRightDblClick();
    }

    protected _animationFrameRequestHandler: number

    public onAnimationFrame (): void {
        this.scrollbarRelative.updateIfMouseIsDown();
        setTimeout(() => {
            this._animationFrameRequestHandler = requestAnimationFrame(() => this.onAnimationFrame());
        }, this.timeline.renderFps);
    }

    @HostListener('window:resize', ['$event'])
    public onResize (): void {
        setTimeout(() => {
            // wait native element to actually resize ... otherwise we're measuring old size -- TT
            this.scrollbarAbsolute.backgroundWidth = this.backgroundView.nativeElement.getBoundingClientRect().width;
        });
    }
}

export default TimelineScrollbarComponent;
