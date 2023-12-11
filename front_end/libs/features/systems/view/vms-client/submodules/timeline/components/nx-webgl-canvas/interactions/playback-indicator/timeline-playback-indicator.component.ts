import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import dateFormat from 'dateformat';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NgChanges } from '@utils/ng-changes';
import { NxWebGLService } from '@vms-client/submodules/timeline/components/nx-webgl-canvas/services/webgl.service';

// const MARGIN = 5;
const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;
// const WWM = PRIMARY_WIDTH + 2 * MARGIN; // widthWithMargins
// const WNM = PRIMARY_WIDTH - 2 * MARGIN; // widthWithMargins

const TIME_FORMAT = 'HH:MM:ss';
const DATE_FORMAT = 'ddd mmm dd yyyy';

@UntilDestroy()
@Component({
    selector: 'nx-webgl-timeline-playback-indicator',
    templateUrl: './timeline-playback-indicator.component.html',
    styleUrls: ['./timeline-playback-indicator.component.scss'],
})
export class WebGlTimelinePlaybackIndicatorComponent implements OnChanges {
    @Input() playbackPosition: number | undefined;
    @Input() playbackTime: Date;

    public date: string = '';
    public time: string = '';

    public visible: boolean = false;

    svgArrow: string;

    vlPosition: number;

    @ViewChild('timePlaybackEar', { static: true })
    protected timePlaybackEar: ElementRef<HTMLDivElement>;
    @ViewChild('timePlaybackLine', { static: true })
    protected timePlaybackLine: ElementRef<HTMLDivElement>;

    constructor(
        languageService: NxLanguageProviderService,
        private webglService: NxWebGLService,
    ) {
        languageService.loadTimelineTranslations();

        this.webglService.xScale$.subscribe(scale => {
            if (this.playbackPosition !== undefined && this.playbackTime) {
                this.playbackPosition = scale(this.playbackTime);
                this.setMarkerPosition();
            }
        });
    }

    ngOnChanges(changes: NgChanges<WebGlTimelinePlaybackIndicatorComponent>): void {
        if (changes.playbackPosition) {
            this.setMarkerPosition();

            this.time = dateFormat(this.playbackTime, TIME_FORMAT);
            this.date = dateFormat(this.playbackTime, DATE_FORMAT);
        }
    }

    private setMarkerPosition(): void {
        if (this.playbackPosition !== undefined) {
            if (this.playbackPosition > this.webglService.canvasWidth$.value) {
                this.playbackPosition = this.webglService.canvasWidth$.value;
            }

            if (this.playbackPosition < 0) {
                this.playbackPosition = 0;
            }
            this.timePlaybackEar.nativeElement.style.opacity = '1';
            this.svgArrow = this.svgArrowPoints();
        } else {
            this.timePlaybackEar.nativeElement.style.opacity = '0';
            return;
        }

        if (this.playbackPosition - PRIMARY_WIDTH / 2 <= 0) {
            this.timePlaybackEar.nativeElement.style.left = `${PRIMARY_WIDTH / 2}px`;
            this.vlPosition = this.playbackPosition;
        } else if (
            this.playbackPosition + PRIMARY_WIDTH / 2 >=
            this.webglService.canvasWidth$.value
        ) {
            this.timePlaybackEar.nativeElement.style.left = `${
                this.webglService.canvasWidth$.value - PRIMARY_WIDTH / 2
            }px`;
            const padding =
                this.webglService.canvasWidth$.value - this.playbackPosition - PRIMARY_WIDTH / 2;
            this.vlPosition = PRIMARY_WIDTH / 2 - padding;
        } else {
            this.timePlaybackEar.nativeElement.style.left = `${this.playbackPosition}px`;
            this.vlPosition = PRIMARY_WIDTH / 2;
        }

        this.timePlaybackLine.nativeElement.style.opacity = [0, PRIMARY_WIDTH].includes(
            this.vlPosition,
        )
            ? '0'
            : '1';
    }

    private svgArrowPoints(): string {
        if (this.playbackPosition === undefined) {
            return;
        }
        const offset = this.playbackPosition - PRIMARY_WIDTH / 2;
        let tl = Math.round((PRIMARY_WIDTH - ARROW_WIDTH) / 2); // top left vertex
        let tr = Math.round((PRIMARY_WIDTH + ARROW_WIDTH) / 2); // top right vertex
        let b = Math.round(PRIMARY_WIDTH / 2); // bottom vertex

        if (offset < 0) {
            if (this.playbackPosition < ARROW_WIDTH) {
                tl = 0;
                tr = ARROW_WIDTH;
                b = this.playbackPosition;
            } else {
                tl += offset;
                tr += offset;
                b += offset;
            }
        } else if (
            this.webglService.canvasWidth$.value - this.playbackPosition <
            PRIMARY_WIDTH / 2
        ) {
            if (this.webglService.canvasWidth$.value - this.playbackPosition < ARROW_WIDTH) {
                tl = PRIMARY_WIDTH - ARROW_WIDTH;
                tr = PRIMARY_WIDTH;
                b = PRIMARY_WIDTH - (this.webglService.canvasWidth$.value - this.playbackPosition);
            } else {
                const padding =
                    this.webglService.canvasWidth$.value -
                    this.playbackPosition -
                    PRIMARY_WIDTH / 2;
                tl -= padding;
                tr -= padding;
                b -= padding;
            }
        }

        return `${tl},0 ${tr},0 ${b},5`;
    }
}
