import { CommonModule } from '@angular/common';
import { Component, computed, effect, ElementRef, ViewChild } from '@angular/core';
import { UntilDestroy } from '@ngneat/until-destroy';
import dateFormat from 'dateformat';

import { DATE_FORMAT, TIME_FORMAT } from '@components/nx-webgl-canvas/webgl-canvas.types';
import { NxLanguageProviderService } from '@services/nx-language-provider';

import { NxWebGLService } from '../../services/webgl.service';

const ARROW_WIDTH = 10;
const PRIMARY_WIDTH = 140;

@UntilDestroy()
@Component({
    selector: 'nx-webgl-time-under-mouse',
    templateUrl: './time-under-mouse.component.html',
    styleUrls: ['./time-under-mouse.component.scss'],
    standalone: true,
    imports: [CommonModule],
})
export class WebGlTimeUnderMouseComponent {
    position = this.webglService.currentPointer$$;

    timeUnderMouse$$ = computed(() =>
        this.webglService.xScale$$().invert(this.webglService.currentPointer$$() || 0),
    );

    public date$$ = computed(() => dateFormat(this.timeUnderMouse$$(), DATE_FORMAT));
    public time$$ = computed(() => dateFormat(this.timeUnderMouse$$(), TIME_FORMAT));

    svgArrow: string;
    vlPosition: number;

    @ViewChild('timeUnderEar', { static: true })
    protected timeUnderEar: ElementRef<HTMLDivElement>;

    constructor(
        languageService: NxLanguageProviderService,
        private webglService: NxWebGLService,
    ) {
        languageService.loadTimelineTranslations();

        effect(() => {
            if (this.position()) {
                this.setMarkerPosition();
            } else {
                this.timeUnderEar.nativeElement.style.opacity = '0';
            }
        });
    }

    private setMarkerPosition(): void {
        if (this.position()) {
            this.timeUnderEar.nativeElement.style.opacity = '1';
            this.svgArrow = this.svgArrowPoints();
        } else {
            this.timeUnderEar.nativeElement.style.opacity = '0';
            return;
        }

        if (this.position() - PRIMARY_WIDTH / 2 <= 0) {
            this.timeUnderEar.nativeElement.style.left = `${PRIMARY_WIDTH / 2}px`;
            this.vlPosition = this.position();
        } else if (this.position() + PRIMARY_WIDTH / 2 >= this.webglService.canvasWidth$.value) {
            this.timeUnderEar.nativeElement.style.left = `${
                this.webglService.canvasWidth$.value - PRIMARY_WIDTH / 2
            }px`;
            const padding =
                this.webglService.canvasWidth$.value - this.position() - PRIMARY_WIDTH / 2;
            this.vlPosition = PRIMARY_WIDTH / 2 - padding;
        } else {
            this.timeUnderEar.nativeElement.style.left = `${this.position()}px`;
            this.vlPosition = PRIMARY_WIDTH / 2;
        }
    }

    public svgArrowPoints(): string {
        if (this.position()) {
            const offset = this.position() - PRIMARY_WIDTH / 2;
            let tl = Math.round((PRIMARY_WIDTH - ARROW_WIDTH) / 2); // top left vertex
            let tr = Math.round((PRIMARY_WIDTH + ARROW_WIDTH) / 2); // top right vertex
            let b = Math.round(PRIMARY_WIDTH / 2); // bottom vertex

            if (offset < 0) {
                if (this.position() < ARROW_WIDTH) {
                    tl = 0;
                    tr = ARROW_WIDTH;
                    b = this.position();
                } else {
                    tl += offset;
                    tr += offset;
                    b += offset;
                }
            } else if (this.webglService.canvasWidth$.value - this.position() < PRIMARY_WIDTH / 2) {
                if (this.webglService.canvasWidth$.value - this.position() < ARROW_WIDTH) {
                    tl = PRIMARY_WIDTH - ARROW_WIDTH;
                    tr = PRIMARY_WIDTH;
                    b = PRIMARY_WIDTH - (this.webglService.canvasWidth$.value - this.position());
                } else {
                    const padding =
                        this.webglService.canvasWidth$.value - this.position() - PRIMARY_WIDTH / 2;
                    tl -= padding;
                    tr -= padding;
                    b -= padding;
                }
            }

            return `${tl},0 ${tr},0 ${b},5`;
        }
        return '';
    }
}
