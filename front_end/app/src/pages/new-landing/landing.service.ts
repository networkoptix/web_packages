import { Platform } from '@angular/cdk/platform';
import { ElementRef, Injectable } from '@angular/core';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime, map, shareReplay, startWith, take } from 'rxjs/operators';

import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
@UntilDestroy()
@Injectable()
export class NxLandingService {
    screenSize$: Observable<{ width:number, height: number }>;
    scrollPosition$: Observable<number>;
    introAnimationFinished$ = new BehaviorSubject<boolean>(false);
    // First maskFinishedLoading$ emits which triggers the backgroundGraphic to start loading
    // This is done so that on the initial render the backgroundGraphic svgs dont flicker into view before the mask loads and covers them.
    // Then, backgroundGraphicFinishedLoading$ triggers the intro animation to start on all the elements.
    // This is done so that all the intro animations start at the same time when all the components are ready.
    maskFinishedLoading$ = new BehaviorSubject<boolean>(false);
    backgroundGraphicFinishedLoading$ = new BehaviorSubject<boolean>(false);
    contentStartRef: ElementRef;
    scrollBreakpoints = {
        showGraphics: 1000,
        maskMaxSize: 815
    };

    animationDuration = 1800;

    constructor(scrollMechanics: NxScrollMechanicsService, platform: Platform) {
        let scrollDebounce = 10;
        if (platform.FIREFOX) {
            // small bandaid for firefox... i dont think its enough
            scrollDebounce = 14;
        }
        this.screenSize$ = scrollMechanics.windowSizeSubject.pipe(
            debounceTime(40),
            untilDestroyed(this),
            shareReplay(1)
        );

        this.scrollPosition$ = scrollMechanics.windowScrollSubject.pipe(
            debounceTime(scrollDebounce),
            startWith(0),
            untilDestroyed(this),
            map(value => value < this.scrollBreakpoints.showGraphics
                ? value
                : this.scrollBreakpoints.showGraphics),
            shareReplay(1)
        );

        this.backgroundGraphicFinishedLoading$
            .pipe(take(2), untilDestroyed(this))
            .subscribe(value => {
                if (value) {
                    setTimeout(() => {
                        this.introAnimationFinished$.next(true);
                    }, this.animationDuration);
                }
            });
    }
}
