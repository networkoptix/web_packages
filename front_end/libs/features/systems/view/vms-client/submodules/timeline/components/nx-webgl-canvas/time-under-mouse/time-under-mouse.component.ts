import { Component, ElementRef, Input, OnChanges, ViewChild } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import dateFormat from 'dateformat';

import { NxLanguageProviderService } from '@services/nx-language-provider';
import { NgChanges } from '@utils/ng-changes';
import { px } from '@vms-client/utils/type-aliases';

import { NxWebGLService } from '../services/webgl.service';

// const MARGIN = 5;
const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;
// const WNM = PRIMARY_WIDTH - 2 * MARGIN; // widthNoMargins
// const WWM = PRIMARY_WIDTH + 2 * MARGIN; // widthWithMargins

const TIME_FORMAT = 'HH:MM:ss';
const DATE_FORMAT = 'ddd mmm dd yyyy';

@UntilDestroy()
@Component({
    selector: 'nx-webgl-time-under-mouse',
    templateUrl: './time-under-mouse.component.html',
    styleUrls: ['./time-under-mouse.component.scss'],
})
export class WebGlTimeUnderMouseComponent implements OnChanges {
    @Input() position: number | undefined;
    @Input() timeUnder: Date;

    public date: string = '';
    public time: string = '';

    svgArrow: string;
    protected _honestOffset: px;
    protected _visualOffset: px;
    vlPosition: number;

    @ViewChild('timeUnderEar', { static: true })
    protected timeUnderEar: ElementRef<HTMLDivElement>;

    constructor(
        languageService: NxLanguageProviderService,
        private webglService: NxWebGLService,
    ) {
        languageService.loadTimelineTranslations();
    }

    ngOnChanges(changes: NgChanges<WebGlTimeUnderMouseComponent>): void {
        if (changes.position) {
            this.setMarkerPosition();

            this.time = dateFormat(this.timeUnder, TIME_FORMAT);
            this.date = dateFormat(this.timeUnder, DATE_FORMAT);
        }
    }

    private setMarkerPosition(): void {
        if (this.position !== undefined) {
            this.timeUnderEar.nativeElement.style.opacity = '1';
            this.svgArrow = this.svgArrowPoints();
        } else {
            this.timeUnderEar.nativeElement.style.opacity = '0';
            return;
        }

        if (this.position - PRIMARY_WIDTH / 2 <= 0) {
            this.timeUnderEar.nativeElement.style.left = `${PRIMARY_WIDTH / 2}px`;
            this.vlPosition = this.position;
        } else if (this.position + PRIMARY_WIDTH / 2 >= this.webglService.canvasWidth$.value) {
            this.timeUnderEar.nativeElement.style.left = `${this.webglService.canvasWidth$.value - PRIMARY_WIDTH / 2}px`;
            const padding = this.webglService.canvasWidth$.value - this.position - PRIMARY_WIDTH / 2;
            this.vlPosition = PRIMARY_WIDTH / 2 - padding;
        } else {
            this.timeUnderEar.nativeElement.style.left = `${this.position}px`;
            this.vlPosition = PRIMARY_WIDTH / 2;
        }
    }

    public svgArrowPoints(): string {
        const offset = this.position - PRIMARY_WIDTH / 2;
        let tl = Math.round((PRIMARY_WIDTH - ARROW_WIDTH) / 2); // top left vertex
        let tr = Math.round((PRIMARY_WIDTH + ARROW_WIDTH) / 2); // top right vertex
        let b = Math.round(PRIMARY_WIDTH / 2); // bottom vertex

        if (offset < 0) {
            if (this.position < ARROW_WIDTH) {
                tl = 0;
                tr = ARROW_WIDTH;
                b = this.position;
            } else {
                tl += offset;
                tr += offset;
                b += offset;
            }
        } else if (this.webglService.canvasWidth$.value - this.position < PRIMARY_WIDTH / 2) {
            if (this.webglService.canvasWidth$.value - this.position < ARROW_WIDTH) {
                tl = PRIMARY_WIDTH - ARROW_WIDTH;
                tr = PRIMARY_WIDTH;
                b = PRIMARY_WIDTH - (this.webglService.canvasWidth$.value - this.position);
            } else {
                const padding = this.webglService.canvasWidth$.value - this.position - PRIMARY_WIDTH / 2;
                tl -= padding;
                tr -= padding;
                b -= padding;
            }
        }

        return `${tl},0 ${tr},0 ${b},5`;
    }

    public get verticalLineLeftPx(): number {
        let result = PRIMARY_WIDTH / 2;
        const offset = this._visualOffset - this._honestOffset;
        if (Math.abs(offset) > 0) {
            result -= offset;
        }
        return result;
    }
}
