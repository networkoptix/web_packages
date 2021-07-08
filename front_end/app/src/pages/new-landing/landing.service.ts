import { ElementRef, Injectable } from '@angular/core';
import { NxScrollMechanicsService } from '@services/scroll-mechanics.service';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime, map, shareReplay, startWith, tap } from 'rxjs/operators';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
@UntilDestroy()
@Injectable()
export class NxLandingService {
    screenSize$: Observable<{ width:number, height: number }>
    scrollPosition$: Observable<number>;
    introAnimationFinished$ = new BehaviorSubject<boolean>(false);
    maskFinishedLoading$ = new BehaviorSubject<boolean>(false);
    backgroundGraphicFinishedLoading$ = new BehaviorSubject<boolean>(false);
    contentStartRef: ElementRef;
    scrollBreakpoints = {
        showGraphics : 1000,
        maskMaxSize  : 815
    }

    constructor(scrollMechanics: NxScrollMechanicsService) {
        this.screenSize$ = scrollMechanics.windowSizeSubject.pipe(debounceTime(40), untilDestroyed(this),  shareReplay(1));
        this.scrollPosition$ = scrollMechanics.windowScrollSubject.pipe(debounceTime(10), startWith(0), untilDestroyed(this), map(value => value < this.scrollBreakpoints.showGraphics ? value : this.scrollBreakpoints.showGraphics), shareReplay(1));
    }
}
