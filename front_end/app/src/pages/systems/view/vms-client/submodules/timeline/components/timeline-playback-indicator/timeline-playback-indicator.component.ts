import {
    Component,
    OnInit,
    OnDestroy,
    ElementRef,
    HostListener,
} from '@angular/core';
import dateFormat from 'dateformat';
import { Subscription } from 'rxjs';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import {
    PlaybackState,
    PLAYBACK_MODE
} from '@vms-client/submodules/playback/datatypes/PlaybackState';
import { PlaybackService } from '@vms-client/submodules/playback/services/playback.service';
import { VideoManagementSystemService } from '@vms-client/submodules/vms/services/vms.service';
import { assertNever } from '@vms-client/utils';
import type { ms, px } from '@vms-client/utils/type-aliases';

import { TimelineService } from '../../services/timeline.service';
import type {
    TimelineServiceStatus
} from '../../services/timeline.services.types';

const MARGIN = 5;
const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;

@Component({
    selector: 'timeline-playback-indicator',
    templateUrl: './timeline-playback-indicator.component.html',
    styleUrls: ['./timeline-playback-indicator.component.scss']
})
export class TimelinePlaybackIndicatorComponent implements OnInit, OnDestroy {
    protected playbackSubscription: Subscription;
    protected timelineSubscription: Subscription;
    public visible: boolean = false;
    public timeMs: ms;
    public date: string;
    public time: string;
    public honestOffset: px;
    public visibleOffset: px;

    constructor(
        languageService: NxLanguageProviderService,
        private self: ElementRef,
        private timeline: TimelineService,
        private vms: VideoManagementSystemService,
        public playback: PlaybackService
    ) {
        languageService.loadTimelineTranslations();
        this.onPlaybackSubjectChange = this.onPlaybackSubjectChange.bind(this);
        this.onTimelineSubjectChange = this.onTimelineSubjectChange.bind(this);
    }

    @HostListener('click', ['$event'])
    onClick(e: MouseEvent): void {
        if (this.playback.state.mode === PLAYBACK_MODE.ARCHIVE) {
            this.timeline.jumpScrollTo(
                this.playback.state.currentTime -
                    Math.round(this.timeline.visibleRange.duration / 2),
                true
            );
        }
    }

    public ngOnInit(): void {
        this.playbackSubscription = this.playback.subject.subscribe(
            this.onPlaybackSubjectChange
        );
        this.timelineSubscription = this.timeline.subject.subscribe(
            this.onTimelineSubjectChange
        );
    }

    public ngOnDestroy(): void {
        this.playbackSubscription.unsubscribe();
        this.timelineSubscription.unsubscribe();
    }

    public get edgeCaseClasses(): Record<string, boolean> {
        this.self.nativeElement.classList[(this.visible ? 'add' : 'remove')]('visible');
        return {
            'left-most': this.honestOffset <= 0,
            leftish: this.honestOffset > 0 &&
                this.honestOffset < (MARGIN + PRIMARY_WIDTH) / 2,
            rightish: this.honestOffset < this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr &&
                this.honestOffset > this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr - (MARGIN + PRIMARY_WIDTH),
            'right-most': this.honestOffset >= this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr
        };
    }

    protected _svgArrowPoints: string = '';

    public get svgArrowPoints(): string {
        return this._svgArrowPoints;
    }

    protected _updateSvgArrowPoints(): void {
        // if (this.edgeCaseClasses['left-most'] || this.edgeCaseClasses['right-most']) {
        //   return ''
        // }

        const wwm = PRIMARY_WIDTH + 2 * MARGIN; // widthWithMargins
        const aw = ARROW_WIDTH; // arrowWidth

        let tl = Math.round((wwm - aw) / 2); // top left vertex
        let tr = Math.round((wwm + aw) / 2); // top right vertex
        let b = Math.round(wwm / 2); // bottom vertex

        const offset = Math.abs(this.visibleOffset - this.honestOffset);
        if (this.edgeCaseClasses.leftish) {
            tl -= offset;
            tr -= offset;
            if (tl < MARGIN) {
                tl = MARGIN;
            }
            if (tr < MARGIN + aw) {
                tr = MARGIN + aw;
            }
            b -= offset;
        } else if (this.edgeCaseClasses.rightish) {
            tl += offset;
            tr += offset;
            b += offset;
            if (tl > wwm - MARGIN - aw) {
                tl = wwm - MARGIN - aw;
            }
            if (tr > wwm - MARGIN) {
                tr = wwm - MARGIN;
            }
        }
        this._svgArrowPoints = `${tl},0 ${tr},0 ${b},5`;
    }

    public get verticalLineLeftPx(): number {
        let result = PRIMARY_WIDTH / 2;
        if (this.edgeCaseClasses.leftish) {
            const offset = Math.abs(this.visibleOffset - this.honestOffset);
            result -= offset;
        } else if (this.edgeCaseClasses.rightish) {
            const offset = Math.abs(this.visibleOffset - this.honestOffset);
            result += offset;
        }
        return result;
    }

    public onTimelineSubjectChange(s: TimelineServiceStatus): void {
        const ps = this.playback.state;
        if (this.visible && ps.mode === PLAYBACK_MODE.ARCHIVE) {
            this.timeMs = ps.currentTime; // prevents the weired jitter
            // const ho = this.honestOffset;
            // const vo = this.visibleOffset;
            this.honestOffset = this.timeline.timeToDomOffsetX(this.timeMs);
            this.visibleOffset = Math.max(
                MARGIN + PRIMARY_WIDTH / 2,
                Math.min(
                    this.honestOffset,
                    (this.timeline.canvasGeometry.width / this.timeline.canvasGeometry.dpr) - (MARGIN + PRIMARY_WIDTH / 2)
                )
            );
            // if (Math.abs(this.honestOffset - ho) > 1) {
            //     console.log('jump', Date.now(), 'time', this.timeMs, new Date(this.timeMs), 'honest', ho, '->', this.honestOffset, 'visible', vo, '->', this.visibleOffset)
            // }
            this.self.nativeElement.style.left = `${Math.round(this.visibleOffset)}px`;
            for (const klass in this.edgeCaseClasses) {
                if (this.edgeCaseClasses[klass]) {
                    this.self.nativeElement.classList.add(klass);
                } else {
                    this.self.nativeElement.classList.remove(klass);
                }
            }
            this._updateSvgArrowPoints();
        }
    }

    public onPlaybackSubjectChange(s: PlaybackState): void {
        // if (s.mode === PLAYBACK_MODE.ARCHIVE && s.started) {
        //     console.log('playback change', s.currentTime - this.timeMs, s.currentTime, new Date(s.currentTime))
        // }
        switch (s.mode) {
            case PLAYBACK_MODE.STOPPED:
                this.visible = false;
                break;
            case PLAYBACK_MODE.LIVE:
                this.visible = false;
                break;
            case PLAYBACK_MODE.ARCHIVE:
                this.visible = true;
                this.timeMs = s.currentTime;
                const TIME_FORMAT = 'HH:MM:ss';
                const DATE_FORMAT = 'dd mmmm yyyy';
                const tweakedT = this.vms.tweakT(this.timeMs);
                this.time = dateFormat(tweakedT, TIME_FORMAT);
                this.date = dateFormat(tweakedT, DATE_FORMAT);

                // a hack to keep the indicator in place while timeline animates a jump over the gap between records
                // this.timeMs -= (this.timeline.targetScrollMs - this.timeline.visibleRange.start);
                break;
            default:
                assertNever(s);
        }
    }
}
