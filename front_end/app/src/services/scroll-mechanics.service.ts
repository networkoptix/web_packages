import { Inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { WINDOW } from './window-provider';

enum GRID_BREAKPOINTS {
    xs = 0,
    sm = 576,
    md = 768,
    lg = 992,
    xl = 1280,
    xxl = 1440,
    xxxl = 1600,
    xxxxl = 1920,
}

@Injectable({
    providedIn: 'root'
})
export class NxScrollMechanicsService {
    windowSizeSubject = new BehaviorSubject({ height: 0, width: 0 });
    windowScrollSubject = new BehaviorSubject(0);
    elementTableWidthSubject = new BehaviorSubject(0);
    elementViewWidthSubject = new BehaviorSubject(0);
    searchViewHeightSubject = new BehaviorSubject(0);
    private panelSubject = new BehaviorSubject(false);

    // trigger offset change
    offsetSubject = new BehaviorSubject(undefined);

    public static HEADER_OFFSET: number = 48;
    public static SCROLL_OFFSET: number = 48 + 16; // header + padding
    public static MEDIA = GRID_BREAKPOINTS;

    constructor(
        @Inject(WINDOW) private window: Window
    ) {}

    set elementTableWidth(width: number) {
        this.elementTableWidthSubject.next(width);
    }

    get elementTableWidth() {
        return this.elementTableWidthSubject.getValue();
    }

    set elementViewWidth(width: number) {
        this.elementViewWidthSubject.next(width);
    }

    get elementViewWidth() {
        return this.elementViewWidthSubject.getValue();
    }

    set searchViewHeight(height: number) {
        this.searchViewHeightSubject.next(height);
    }

    get searchViewHeight() {
        return this.searchViewHeightSubject.getValue();
    }

    setWindowSize(height: number, width: number) {
        this.windowSizeSubject.next({ height, width });
    }

    set windowScroll(value: number) {
        this.windowScrollSubject.next(value);
    }

    get windowScroll() {
        return this.windowScrollSubject.getValue();
    }

    get panelVisible() {
        return this.panelSubject.getValue();
    }

    set panelVisible(value: boolean) {
        this.panelSubject.next(value);
    }

    mediaQueryMax(media: number) {
        return this.window.matchMedia('(max-width: ' + media + 'px)').matches;
    }

    mediaQueryMin(media: number) {
        return this.window.matchMedia('(min-width: ' + media + 'px)').matches;
    }
}
