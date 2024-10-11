import {
    ChangeDetectorRef,
    computed,
    Directive,
    effect,
    ElementRef,
    HostListener,
    inject,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { bindCallback, defer, map, repeat, startWith, switchMap, timer } from 'rxjs';

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
