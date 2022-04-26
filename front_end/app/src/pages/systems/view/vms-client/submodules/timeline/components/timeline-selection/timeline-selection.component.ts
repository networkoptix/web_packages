import {
    Component,
    OnInit,
    OnDestroy,
    HostListener,
    ElementRef,
    ViewChild,
    AfterViewInit,
} from '@angular/core';
import dateFormat from 'dateformat';
import { Subscription } from 'rxjs';

import { PLAYBACK_MODE } from '@vms-client/submodules/playback/datatypes/PlaybackState';
import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import type { ms } from '@vms-client/utils/type-aliases';

import {
    TimelineSelectionService,
} from '../../services/timeline.selection.service';
import { TimelineService } from '../../services/timeline.service';
import type {
    TimelineServiceStatus,
    TimelineSelectionServiceStatus,
} from '../../services/timeline.services.types';
import { TimelineTimeUnderMouseService } from '../../services/timeline.time-under-mouse.service';
import { TimelineWheelHandlerService } from '../../services/timeline.wheel-handler.service';

const DATE_FORMAT_STRING = 'dd mmmm yyyy';
const TIME_FORMAT_STRING = 'HH:MM:ss';

const PLAYBACK_OVERLAY_TRESHOLD_PX = 5;

@Component({
    selector: 'timeline-selection',
    templateUrl: './timeline-selection.component.html',
    styleUrls: ['./timeline-selection.component.scss']
})
export class TimelineSelectionComponent implements OnInit, OnDestroy, AfterViewInit {
    protected timelineSubscription: Subscription;
    protected selectionSubscription: Subscription;
    protected selectionStatus: TimelineSelectionServiceStatus;

    @ViewChild('selectedRange')
    protected selectedRangeView: ElementRef<HTMLDivElement>;

    @ViewChild('leftEar')
    protected leftEarView: ElementRef<HTMLDivElement>;

    @ViewChild('rightEar')
    protected rightEarView: ElementRef<HTMLDivElement>;

    public get dateStrings() {
        if (!this.selectionStatus || !this.selectionStatus.isActive) {
            return {
                left: {
                    date: '',
                    time: ''
                },
                right: {
                    date: '',
                    time: ''
                }
            };
        }
        return {
            left: {
                date: dateFormat(this.selectionStatus.range.start, DATE_FORMAT_STRING),
                time: dateFormat(this.selectionStatus.range.start, TIME_FORMAT_STRING)
            },
            right: {
                date: dateFormat(this.selectionStatus.range.end, DATE_FORMAT_STRING),
                time: dateFormat(this.selectionStatus.range.end, TIME_FORMAT_STRING)
            }
        };
    }

    constructor(
        private self: ElementRef,
        protected timeline: TimelineService,
        protected selection: TimelineSelectionService,
        protected playback: PlaybackService,
        protected wheel: TimelineWheelHandlerService,
        protected timeUnderMouse: TimelineTimeUnderMouseService
    ) {
        this.onSelectionSubjectChange = this.onSelectionSubjectChange.bind(this);
        this.onTimelineSubjectChange = this.onTimelineSubjectChange.bind(this);
    }

    public ngOnInit(): void {
        this.selectionSubscription = this.selection.subject.subscribe(
            this.onSelectionSubjectChange
        );
        this.timelineSubscription = this.timeline.subject.subscribe(
            this.onTimelineSubjectChange
        );
    }

    public ngAfterViewInit(): void {
        this.selection.$background = this.self.nativeElement;
        this.selection.leftEar = this.leftEarView.nativeElement;
        this.selection.rightEar = this.rightEarView.nativeElement;
    }

    public ngOnDestroy(): void {
        this.timelineSubscription && this.timelineSubscription.unsubscribe();
        this.selectionSubscription && this.selectionSubscription.unsubscribe();
    }

    protected _updateCss(): void {
        if (this.selectedRangeView && this.selectionStatus.isActive) {
            this.selectedRangeView.nativeElement.classList.add('active');
            const left = this.timeline.timeToDomOffsetX(
                this.selectionStatus.range.start
            );
            const width = this.timeline.durationToDomWidth(
                this.selectionStatus.range.duration
            );
            this.selectedRangeView.nativeElement.style.left = `${left}px`;
            this.selectedRangeView.nativeElement.style.width = `${width}px`;
            this.leftEarView.nativeElement.classList.toggle(
                'playback',
                this._leftEarOverPlayback
            );
            this.rightEarView.nativeElement.classList.toggle(
                'playback',
                this._rightEarOverPlayback
            );
        } else if (this.selectedRangeView) {
            this.selectedRangeView.nativeElement.classList.remove('active');
        }
    }

    protected _playbackOverlays(t: ms): boolean {
        if (this.playback.state.mode !== PLAYBACK_MODE.ARCHIVE) {
            return false;
        }
        const duration = Math.abs(t - this.playback.state.currentTime);
        const width = this.timeline.durationToDomWidth(duration);
        return width < PLAYBACK_OVERLAY_TRESHOLD_PX;
    }

    protected get _leftEarOverPlayback(): boolean {
        return this._playbackOverlays(this.selectionStatus.range.start);
    }

    protected get _rightEarOverPlayback(): boolean {
        return this._playbackOverlays(this.selectionStatus.range.end);
    }

    public onSelectionSubjectChange(s: TimelineSelectionServiceStatus): void {
        this.selectionStatus = s;
        this._updateCss();
    }

    public onTimelineSubjectChange(s: TimelineServiceStatus): void {
        this._updateCss();
    }

    @HostListener('mousedown', ['$event'])
    public mouseDownHandler(e: MouseEvent): void {
        this.selection.handleBackgroundMouseDown(e);
    }

    @HostListener('document:mouseup', ['$event'])
    public mouseUpHandler(e: MouseEvent): void {
        this.selection.handleMouseUp(e);
    }

    @HostListener('mouseenter', ['$event'])
    public mouseEnterHandler(e: MouseEvent): void {
        this.timeUnderMouse.handleMouseEnter(e);
    }

    @HostListener('mouseleave', ['$event'])
    public mouseLeaveHandler(e: MouseEvent): void {
        this.selection.handleMouseLeave(e);
        this.timeUnderMouse.handleMouseLeave(e);
    }

    @HostListener('document:mousemove', ['$event'])
    public mouseMoveHandler(e: MouseEvent): void {
        const $host = this.selectedRangeView.nativeElement.parentElement;
        // @ts-expect-error
        this.timeUnderMouse.handleMouseMove({
            offsetX:
                (e.target as HTMLElement).getBoundingClientRect().left -
                $host.getBoundingClientRect().left +
                e.offsetX
        });
        this.selection.handleMouseMove(e);
    }

    public selectedRangeMouseDownHandler(e: MouseEvent): void {
        this.selection.handleSelectedRangeMouseDown(e);
    }

    public selectedRangeDoubleClickHandler(e: MouseEvent): void {
        this.selection.reset();
    }

    public leftEarMouseDownHandler(e: MouseEvent): void {
        this.selection.handleLeftEarMouseDown(e);
    }

    public rightEarMouseDownHandler(e: MouseEvent): void {
        this.selection.handleRightEarMouseDown(e);
    }

    @HostListener('wheel', ['$event'])
    public wheelHandler(e: WheelEvent): void {
        e.preventDefault();
        const $host = this.selectedRangeView.nativeElement.parentElement;
        if (e.target !== $host) {
            // @ts-expect-error
            this.wheel.handleWheel({
                offsetX:
                    (e.target as HTMLElement).getBoundingClientRect().left -
                    $host.getBoundingClientRect().left +
                    e.offsetX,
                deltaX: e.deltaX,
                deltaY: e.deltaY
            });
        } else {
            this.wheel.handleWheel(e);
        }
    }
}
