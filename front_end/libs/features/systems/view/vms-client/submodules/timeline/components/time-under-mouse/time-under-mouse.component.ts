import { Component, ElementRef, OnInit } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import dateFormat from 'dateformat';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { px } from '@vms-client/utils/type-aliases';

import { TimelineService } from '../../services/timeline.service';
import { TimelineTimeUnderMouseService } from '../../services/timeline.time-under-mouse.service';

const MARGIN = 5;
const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;

// const MAIN_MOUSE_BUTTON = 0;

@UntilDestroy()
@Component({
    selector: 'nx-time-under-mouse',
    templateUrl: './time-under-mouse.component.html',
    styleUrls: ['./time-under-mouse.component.scss'],
})
export class TimeUnderMouseComponent implements OnInit {
    date: string = '';
    time: string = '';

    private honestOffset: px;
    private visualOffset: px;

    constructor(
        languageService: NxLanguageProviderService,
        private self: ElementRef,
        private vms: VideoManagementSystemService,
        private timeline: TimelineService,
        private timeUnderMouse: TimelineTimeUnderMouseService,
    ) {
        languageService.loadTimelineTranslations();
        this.self.nativeElement.style.opacity = 0.0;
    }

    ngOnInit(): void {
        this.timeUnderMouse.subject.pipe(untilDestroyed(this)).subscribe(s => {
            if (s.isMouseInside) {
                this.self.nativeElement.style.opacity = 1.0;
                let offset = s.offsetX;

                const marginLeft = MARGIN + PRIMARY_WIDTH / 2;
                if (offset < marginLeft) {
                    offset = marginLeft;
                }
                const marginRight =
                    this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr -
                    MARGIN -
                    PRIMARY_WIDTH / 2;
                if (offset > marginRight) {
                    offset = marginRight;
                }

                this.honestOffset = s.offsetX;
                this.visualOffset = offset;
                this.self.nativeElement.style.left = `${offset}px`;
                // sometimes Infinity comes in as the timestamp and dateformat fails
                try {
                    const TIME_FORMAT = 'HH:MM:ss';
                    const DATE_FORMAT = 'ddd mmm dd yyyy';
                    const tweakedT = this.vms.tweakT(s.timeUnderMouse);
                    this.time = dateFormat(tweakedT, TIME_FORMAT);
                    this.date = dateFormat(tweakedT, DATE_FORMAT);
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
        });
    }

    get svgArrowPoints(): string {
        const wwm = PRIMARY_WIDTH + 2 * MARGIN; // widthWithMargins
        const aw = ARROW_WIDTH; // arrowWidth

        let tl = Math.round((wwm - aw) / 2); // top left vertex
        let tr = Math.round((wwm + aw) / 2); // top right vertex
        let b = Math.round(wwm / 2); // bottom vertex

        const offset = this.visualOffset - this.honestOffset;

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

    get verticalLineLeftPx(): number {
        let result = PRIMARY_WIDTH / 2;
        const offset = this.visualOffset - this.honestOffset;
        if (Math.abs(offset) > 0) {
            result -= offset;
        }
        return result;
    }
}
