import {
    ChangeDetectorRef,
    computed,
    Directive,
    effect,
    ElementRef,
    HostListener,
    inject,
    Output,
    signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { bindCallback, defer, delay, map, NEVER, repeat, startWith, switchMap, timer } from 'rxjs';

import { frameRateTracker$, throttleByFrameRate } from '@openLibs/webrtc-stream-manager';

@Directive({
    standalone: true,
    selector: 'video',
    exportAs: 'nxVideoPlaying',
})
export class NxVideoPlayingDirective {
    private element = inject<ElementRef<HTMLVideoElement>>(ElementRef);

    playbackFrozen$$ = toSignal(
        defer(
            bindCallback(
                this.element.nativeElement.requestVideoFrameCallback.bind(
                    this.element.nativeElement,
                ),
            ),
        ).pipe(
            repeat(),
            switchMap(() =>
                timer(5_000).pipe(
                    map(() => true),
                    startWith(false),
                ),
            ),
        ),
        { initialValue: false },
    );

    private playingState$$ = signal(false);

    public isPlaying$$ = computed(() => this.playingState$$() && !this.playbackFrozen$$());

    private static canvas = document.createElement('canvas');

    previousFrame: string;

    private score$$ = toSignal(frameRateTracker$.pipe(map(({ score }) => score)), {
        initialValue: 0,
    });

    @Output() latestFrame = toObservable(this.isPlaying$$).pipe(
        switchMap(isPlaying =>
            isPlaying
                ? timer(0, 2_500 / (this.score$$() / 100)).pipe(delay(Math.random() * 1_000))
                : NEVER,
        ),
        throttleByFrameRate(),
        map(() => {
            NxVideoPlayingDirective.canvas.width = this.element.nativeElement.videoWidth;
            NxVideoPlayingDirective.canvas.height = this.element.nativeElement.videoHeight;
            const context = NxVideoPlayingDirective.canvas.getContext('2d')!;
            context.drawImage(this.element.nativeElement, 0, 0);
            URL.revokeObjectURL(this.previousFrame);
            this.previousFrame = NxVideoPlayingDirective.canvas.toDataURL();
            return this.previousFrame;
        }),
        takeUntilDestroyed(),
    );

    ngOnDestroy(): void {
        URL.revokeObjectURL(this.previousFrame);
    }

    public playbackStarted$$ = toSignal(
        defer(
            bindCallback(
                this.element.nativeElement.requestVideoFrameCallback.bind(
                    this.element.nativeElement,
                ),
            ),
        ).pipe(map(() => true)),
        { initialValue: false },
    );

    private cdr = inject(ChangeDetectorRef);

    detectChanges = effect(() => {
        this.isPlaying$$();
        this.cdr.detectChanges();
    });

    @HostListener('playing') protected onPlay(): void {
        this.playingState$$.set(true);
    }

    @HostListener('ended') protected onEnded(): void {
        this.playingState$$.set(false);
    }
}
