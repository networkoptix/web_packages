import { CommonModule } from '@angular/common';
import {
    Component,
    computed,
    effect,
    ElementRef,
    inject,
    input,
    untracked,
    viewChild,
} from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import dateFormat from 'dateformat';
import { startWith, throttleTime } from 'rxjs';

import { NxWebGLService } from '@components/nx-webgl-canvas/services/webgl.service';
import { NxLanguageProviderService } from '@services/nx-language-provider';
import { pipeSignal } from '@utils/signals';

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
    standalone: true,
    imports: [CommonModule],
})
export class WebGlTimelinePlaybackIndicatorComponent {
    private webglService: NxWebGLService = inject(NxWebGLService);
    position = this.webglService.smoothPlaybackPosition$$;

    showGoToLive = input(false);

    showGoToLiveAndPlayingArchive = computed(() => {
        if (!this.showGoToLive()) {
            return false;
        }

        const playbackTime = this.currentTimestamp$$();
        const currentTime = Date.now() - 2000;
        return currentTime > playbackTime;
    });

    goToLive(): void {
        this.webglService.goToLive();
    }

    protected currentTimestamp$$ = pipeSignal(
        this.webglService.smoothPlaybackTimestamp$$,
        timestamp$ =>
            timestamp$.pipe(
                throttleTime(500),
                startWith(this.webglService.smoothPlaybackTimestamp$$()),
            ),
        this.webglService.smoothPlaybackTimestamp$$(),
    );

    protected date$$ = computed(() => dateFormat(this.currentTimestamp$$(), DATE_FORMAT));

    public time$$ = computed(() => dateFormat(this.currentTimestamp$$(), TIME_FORMAT));

    // public visible: boolean = false;

    svgArrow: string;

    vlPosition: number;

    protected timePlaybackEar$$ = viewChild<ElementRef<HTMLDivElement>>('timePlaybackEar');
    protected timePlaybackLine$$ = viewChild<ElementRef<HTMLDivElement>>('timePlaybackLine');

    constructor(languageService: NxLanguageProviderService) {
        languageService.loadTimelineTranslations();

        effect(() => {
            const timePlaybackEar = this.timePlaybackEar$$();
            if (!timePlaybackEar) {
                return;
            }

            if (this.position()) {
                this.setMarkerPosition();
            } else {
                timePlaybackEar.nativeElement.style.opacity = '0';
            }
        });

        this.webglService.levelZoom$.pipe(untilDestroyed(this)).subscribe(level => {
            if (this.position()) {
                this.setMarkerPosition();
            }
        });

        this.webglService.scrollBarScroll$.pipe(untilDestroyed(this)).subscribe(scroll => {
            if (this.position()) {
                this.setMarkerPosition();
            }
        });
    }

    private setMarkerPosition(): void {
        const position = this.position();
        if (position < 0) {
            return;
        }
        untracked(() => {
            if (position > this.webglService.canvasWidth$.value) {
                this.webglService.playbackPosition$$.update(
                    () => this.webglService.canvasWidth$.value,
                );
            } else if (position < 0) {
                this.webglService.playbackPosition$$.update(() => 0);
            }
        });

        const timePlaybackEar = this.timePlaybackEar$$();

        if (timePlaybackEar) {
            timePlaybackEar.nativeElement.style.opacity = '1';
            this.svgArrow = this.svgArrowPoints();
            if (position - PRIMARY_WIDTH / 2 <= 0) {
                timePlaybackEar.nativeElement.style.left = `${PRIMARY_WIDTH / 2}px`;
                this.vlPosition = position;
            } else if (position + PRIMARY_WIDTH / 2 >= this.webglService.canvasWidth$.value) {
                timePlaybackEar.nativeElement.style.left = `${
                    this.webglService.canvasWidth$.value - PRIMARY_WIDTH / 2
                }px`;
                const padding = this.webglService.canvasWidth$.value - position - PRIMARY_WIDTH / 2;
                this.vlPosition = PRIMARY_WIDTH / 2 - padding;
            } else {
                timePlaybackEar.nativeElement.style.left = `${position}px`;
                this.vlPosition = PRIMARY_WIDTH / 2;
            }
        }

        const timePlaybackLine = this.timePlaybackLine$$();

        if (timePlaybackLine) {
            timePlaybackLine.nativeElement.style.opacity = [0, PRIMARY_WIDTH].includes(
                this.vlPosition,
            )
                ? '0'
                : '1';
        }
    }

    private svgArrowPoints(): string {
        if (!this.position()) {
            return '';
        }
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
}
