import { Component, ElementRef, OnInit, OnDestroy } from '@angular/core';
import * as df from 'dateformat';
import { Subscription } from 'rxjs';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import VideoManagementSystemService from '@vms-client/submodules/vms/services/vms.service';
import { px } from '@vms-client/utils/type-aliases';

import TimelineService from '../../services/timeline.service';
import {
    TimelineTimeUnderMouseService,
    TimelineTimeUnderMouseServiceStatus
} from '../../services/timeline.time-under-mouse.service';

const dateformat = df.default || df;

const MARGIN = 5;
const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;

const MAIN_MOUSE_BUTTON = 0;

@Component({
    selector: 'time-under-mouse',
    templateUrl: './time-under-mouse.component.html',
    styleUrls: ['./time-under-mouse.component.scss']
})
export class TimeUnderMouseComponent implements OnInit, OnDestroy {
    protected subscription: Subscription

    public date: string = ''
    public time: string = ''

    protected _honestOffset: px
    protected _visualOffset: px

    constructor(
        languageService: NxLanguageProviderService,
        private self: ElementRef,
        private vms: VideoManagementSystemService,
        private timeline: TimelineService,
        public timeUnderMouse: TimelineTimeUnderMouseService
    ) {
        dateformat.i18n = languageService.loadTimelineTranslations();
        this.self.nativeElement.style.opacity = 0.0;
        this.onSubjectChange = this.onSubjectChange.bind(this);
    }

    public ngOnInit (): void {
        this.subscription = this.timeUnderMouse.subject.subscribe(
            this.onSubjectChange
        );
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
            if (
                offset > this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - MARGIN - PRIMARY_WIDTH / 2
            ) {
                offset = this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - MARGIN - PRIMARY_WIDTH / 2;
            }
            this._honestOffset = s.offsetX;
            this._visualOffset = offset;
            this.self.nativeElement.style.left = `${offset}px`;
            // sometimes Infinity comes in as the timestamp and dateformat fails
            try {
                const TIME_FORMAT = 'HH:MM:ss';
                const DATE_FORMAT = 'ddd mmm dd yyyy';
                const tweakedT = this.vms.tweakT(s.timeUnderMouse);
                this.time = dateformat(tweakedT, TIME_FORMAT);
                this.date = dateformat(tweakedT, DATE_FORMAT);
                if (s.pressed) {
                    this.self.nativeElement.classList.add('pressed');
                } else {
                    this.self.nativeElement.classList.remove('pressed');
                }
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
}

export default TimeUnderMouseComponent;
