import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { TimelineSelectionService, TimelineSelectionServiceStatus } from '../../services/timeline.selection.service';
import { Subscription } from 'rxjs';
import TimelineService from '../../services/timeline.service';
import * as df from 'dateformat';

const dateformat = df.default || df;

const DATE_FORMAT_STRING = 'ddd mmm dd yyyy';
const TIME_FORMAT_STRING = 'HH:MM:ss';

@Component({
    selector: 'timeline-selection',
    templateUrl: './timeline-selection.component.html',
    styleUrls: ['./timeline-selection.component.scss']
})
export class TimelineSelectionComponent implements OnInit, OnDestroy, AfterViewInit {
    protected subscription: Subscription
    protected status: TimelineSelectionServiceStatus

    @ViewChild('selectedRange')
    protected selectedRangeView: ElementRef

    public get dateStrings () {
        if (!this.status || !this.status.isActive) {
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
                date: dateformat(this.status.range.start, DATE_FORMAT_STRING),
                time: dateformat(this.status.range.start, TIME_FORMAT_STRING)
            },
            right: {
                date: dateformat(this.status.range.end, DATE_FORMAT_STRING),
                time: dateformat(this.status.range.end, TIME_FORMAT_STRING)
            }
        };
    }

    constructor(
        private self: ElementRef,
        protected timeline: TimelineService,
        protected selection: TimelineSelectionService
    ) {
        this.onSubjectChange = this.onSubjectChange.bind(this);
    }

    public ngOnInit (): void {
        this.subscription = this.selection.subject.subscribe(this.onSubjectChange);
    }

    public ngAfterViewInit (): void {
        this.selection.$background = this.self.nativeElement;
    }

    public ngOnDestroy (): void {
        this.subscription.unsubscribe();
    }

    public onSubjectChange (s: TimelineSelectionServiceStatus) {
        this.status = s;
        if (this.selectedRangeView && s.isActive) {
            this.selectedRangeView.nativeElement.classList.add('active');
            const left = this.timeline.timeToDomOffsetX(s.range.start);
            const width = this.timeline.durationToDomWidth(s.range.duration);
            this.selectedRangeView.nativeElement.style.left = `${left}px`;
            this.selectedRangeView.nativeElement.style.width = `${width}px`;
        } else if (this.selectedRangeView) {
            this.selectedRangeView.nativeElement.classList.remove('active');
        }
    }

    @HostListener('mousedown', ['$event'])
    public MouseDownHandler (e: MouseEvent): void {
        this.selection.handleBackgroundMouseDown(e);
    }

    @HostListener('document:mouseup', ['$event'])
    public mouseUpHandler (e: MouseEvent) {
        this.selection.handleMouseUp(e);
    }

    @HostListener('document:mouseleave', ['$event'])
    public mouseLeaveHandler (e: MouseEvent) {
        this.selection.handleMouseLeave(e);
    }

    @HostListener('document:mousemove', ['$event'])
    public mouseMoveHandler (e: MouseEvent) {
        this.selection.handleMouseMove(e);
    }

    public selectedRangeMouseDownHandler (e: MouseEvent) {
        this.selection.handleSelectedRangeMouseDown(e);
    }

    public leftEarMouseDownHandler (e: MouseEvent) {
        this.selection.handleLeftEarMouseDown(e);
    }

    public rightEarMouseDownHandler (e: MouseEvent) {
        this.selection.handleRightEarMouseDown(e);
    }
}

export default TimelineSelectionComponent;
