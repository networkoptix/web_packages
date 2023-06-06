import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent, map, shareReplay, startWith } from 'rxjs';

import { GridBreakpoints } from '@styles/theme-variables-common';

import { WINDOW } from './window-provider';

@Injectable({
    providedIn: 'root',
})
export class NxScrollMechanicsService {
    windowSizeSubject = fromEvent<Event>(this.window, 'resize').pipe(
        map(({ target }) => {
            const { innerWidth: width, innerHeight: height } = target as Window;
            return { width, height };
        }),
        startWith({ width: this.window.innerWidth, height: this.window.innerHeight }),
        shareReplay({ bufferSize: 1, refCount: false }),
    );
    windowScrollSubject = new BehaviorSubject(0);
    elementTableWidthSubject = new BehaviorSubject(0);
    elementViewWidthSubject = new BehaviorSubject(0);
    searchViewHeightSubject = new BehaviorSubject(0);
    private panelSubject = new BehaviorSubject(false);

    // trigger offset change
    offsetSubject = new BehaviorSubject<boolean>(undefined);
    isMobile$ = this.windowSizeSubject.pipe(map(({ width }) => width < GridBreakpoints.MD));

    public static HEADER_OFFSET: number = 48;
    public static SCROLL_OFFSET: number = 48 + 16; // header + padding

    constructor(@Inject(WINDOW) private window: Window) {}

    set elementTableWidth(width: number) {
        this.elementTableWidthSubject.next(width);
    }

    get elementTableWidth(): number {
        return this.elementTableWidthSubject.getValue();
    }

    set elementViewWidth(width: number) {
        this.elementViewWidthSubject.next(width);
    }

    get elementViewWidth(): number {
        return this.elementViewWidthSubject.getValue();
    }

    set searchViewHeight(height: number) {
        this.searchViewHeightSubject.next(height);
    }

    get searchViewHeight(): number {
        return this.searchViewHeightSubject.getValue();
    }

    set windowScroll(value: number) {
        this.windowScrollSubject.next(value);
    }

    get windowScroll(): number {
        return this.windowScrollSubject.getValue();
    }

    get panelVisible(): boolean {
        return this.panelSubject.getValue();
    }

    set panelVisible(value: boolean) {
        this.panelSubject.next(value);
    }

    mediaQueryMax(media: number): boolean {
        return this.window.matchMedia('(max-width: ' + media + 'px)').matches;
    }

    mediaQueryMin(media: number): boolean {
        return this.window.matchMedia('(min-width: ' + media + 'px)').matches;
    }
}
