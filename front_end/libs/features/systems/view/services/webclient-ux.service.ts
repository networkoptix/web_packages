import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { GridBreakpoints } from '@styles/theme-variables-common';

import type { WebClientUxState } from '../view.types';

const webClientUxInitialState = (): WebClientUxState => ({
    isFullScreen: false,
    isSidebarShown: true,
    isTimelineShown: true,
});

@Injectable({
    providedIn: 'root',
})
export class WebClientUxService {
    readonly MIN_WINDOW_WIDTH_FOR_SIDEBAR = GridBreakpoints.MD;

    subject = new BehaviorSubject<WebClientUxState>(webClientUxInitialState());

    private emit(): void {
        this.subject.next(this.state);
    }

    private _state: WebClientUxState = webClientUxInitialState();

    get state(): WebClientUxState {
        return { ...this._state };
    }

    set isFullScreen(nv: boolean) {
        if (this._state.isFullScreen === nv) {
            return;
        }
        this._state.isFullScreen = nv;
        this._state.isSidebarShown = !this._state.isFullScreen;
        this._state.isTimelineShown = !this._state.isFullScreen;
        this.emit();
    }

    set isSidebarShown(nv: boolean) {
        if (this._state.isSidebarShown === nv) {
            return;
        }
        this._state.isSidebarShown = nv;
        this.emit();
    }

    set isTimelineShown(nv: boolean) {
        if (this._state.isTimelineShown === nv) {
            return;
        }
        this._state.isTimelineShown = nv;
        this.emit();
    }
}
