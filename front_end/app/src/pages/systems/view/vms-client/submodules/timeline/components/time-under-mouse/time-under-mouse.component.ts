import { Component, ElementRef, OnInit, OnDestroy, HostListener } from '@angular/core';
import {
    TimelineTimeUnderMouseService,
    TimelineTimeUnderMouseServiceStatus
} from '../../services/timeline.time-under-mouse.service';
import TimelineService from '../../services/timeline.service';
import { Subscription } from 'rxjs';
import * as df from 'dateformat';
import { px } from '../../../../utils/type-aliases';
import VideoManagementSystemService from '../../../vms/services/vms.service';

const dateformat = df.default || df;

const MARGIN = 5;
const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;

@Component({
    selector    : 'time-under-mouse',
    templateUrl : './time-under-mouse.component.html',
    styleUrls   : ['./time-under-mouse.component.scss']
})
export class TimeUnderMouseComponent implements OnInit, OnDestroy {
    protected subscription: Subscription

    public date: string = ''
    public time: string = ''

    protected _honestOffset: px
    protected _visualOffset: px

    constructor(
        private self: ElementRef,
        private vms: VideoManagementSystemService,
        private timeline: TimelineService,
        public timeUnderMouse: TimelineTimeUnderMouseService
    ) {
        this.self.nativeElement.style.opacity = 0.0;
        this.onSubjectChange = this.onSubjectChange.bind(this);
    }

    public ngOnInit (): void {
        this.subscription = this.timeUnderMouse.subject.subscribe(this.onSubjectChange);
    }

    public ngOnDestroy (): void {
        this.subscription.unsubscribe();
    }

    public onSubjectChange (s: TimelineTimeUnderMouseServiceStatus) {
        if (s.isMouseInside) {
            this.self.nativeElement.style.opacity = 1.0;
            let offset = s.offsetX;
            if (offset < MARGIN + PRIMARY_WIDTH / 2) {
                offset = MARGIN + PRIMARY_WIDTH / 2;
            }
            if (offset > this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - MARGIN - PRIMARY_WIDTH / 2) {
                offset = this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - MARGIN - PRIMARY_WIDTH / 2;
            }
            this._honestOffset = s.offsetX;
            this._visualOffset = offset;
            this.self.nativeElement.style.left = `${offset}px`;
            // sometimes Infinity comes in as the timestamp and dateformat fails
            try {
                this.date = dateformat(s.timeUnderMouse - this.vms.timeZoneOffset, 'ddd mmm dd yyyy');
                this.time = dateformat(s.timeUnderMouse - this.vms.timeZoneOffset, 'HH:MM:ss');
            } catch (e) {
                // console.error(e, s)
            }
        } else {
            this.self.nativeElement.style.opacity = 0.0;
        }
    }

    public get svgArrowPoints () {
        const wwm = PRIMARY_WIDTH + 2 * MARGIN; // widthWithMargins
        const aw = ARROW_WIDTH; // arrowWidth

        let tl = Math.round((wwm - aw) / 2); // top left vertex
        let tr = Math.round((wwm + aw) / 2); // top right vertex
        let b = Math.round(wwm / 2); // bottom vertex

        const offset = this._visualOffset - this._honestOffset;

        if (offset > 0) {
            tl -= offset;
            tr -= offset;
            if (tl < MARGIN) {
                tl = MARGIN;
            }
            if (tr < MARGIN + aw) {
                tr = MARGIN + aw;
            }
            b -= offset;
        } else if (offset < 0) {
            tl -= offset;
            tr -= offset;
            b -= offset;
            if (tl > wwm - MARGIN - aw) {
                tl = wwm - MARGIN - aw;
            }
            if (tr > wwm - MARGIN) {
                tr = wwm - MARGIN;
            }
        }

        return `${tl},0 ${tr},0 ${b},5`;
    }

    public get verticalLineLeftPx () {
        let result = PRIMARY_WIDTH / 2;
        const offset = this._visualOffset - this._honestOffset;
        if (Math.abs(offset) > 0) {
            result -= offset;
        }
        return result;
    }

    @HostListener('document:mousedown')
    onMouseDown () {
        this.self.nativeElement.classList.add('pressed');
    }

    @HostListener('document:mouseup')
    onMouseUp () {
        this.self.nativeElement.classList.remove('pressed');
    }
}

export default TimeUnderMouseComponent;
