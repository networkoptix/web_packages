import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import type { WebClientUxState } from '../view.types';

const webClientUxInitialState: WebClientUxState = {
    isFullScreen: false,
    isSidebarShown: true,
    isTimelineShown: true
};

@Injectable({
    providedIn: 'root'
})
export class WebClientUxService {
    constructor() {}

    protected _subject = new BehaviorSubject<WebClientUxState>({
        ...webClientUxInitialState
    });

    protected _emit(): void {
        this._subject.next(this.state);
    }

    public get subject(): BehaviorSubject<WebClientUxState> {
        return this._subject;
    }

    protected _state: WebClientUxState = { ...webClientUxInitialState };

    public get state(): WebClientUxState {
        return { ...this._state };
    }

    public set isFullScreen(nv: boolean) {
        if (this._state.isFullScreen === nv) { return; }
        this._state.isFullScreen = nv;
        this._state.isSidebarShown = !this._state.isFullScreen;
        this._state.isTimelineShown = !this._state.isFullScreen;
        this._emit();
    }

    public set isSidebarShown(nv: boolean) {
        if (this._state.isSidebarShown === nv) {
            return;
        }
        this._state.isSidebarShown = nv;
        this._emit();
    }

    public set isTimelineShown(nv: boolean) {
        if (this._state.isTimelineShown === nv) {
            return;
        }
        this._state.isTimelineShown = nv;
        this._emit();
    }
}
