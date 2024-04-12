import { Directive, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { defer, map, repeat, startWith, switchMap, timer } from 'rxjs';

@Directive({
    standalone: true,
    selector: 'video',
    exportAs: 'nxVideoPlaying',
})
export class NxVideoPlayingDirective {
    private element = inject<ElementRef<HTMLVideoElement>>(ElementRef);

    playbackFrozen$$ = toSignal(
        defer(
            () =>
                new Promise<void>(resolve =>
                    this.element.nativeElement.requestVideoFrameCallback(() => resolve()),
                ),
        ).pipe(
            repeat(),
            switchMap(() =>
                timer(1000).pipe(
                    map(() => true),
                    startWith(false),
                ),
            ),
        ),
        { initialValue: true },
    );

    private playingState$$ = signal(false);

    public isPlaying$$ = computed(() => this.playingState$$() && !this.playbackFrozen$$());

    @HostListener('playing') protected onPlay(): void {
        this.playingState$$.set(true);
    }

    @HostListener('ended') protected onEnded(): void {
        this.playingState$$.set(false);
    }
}
