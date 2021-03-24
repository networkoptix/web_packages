import { Injectable }                from '@angular/core';
import { BehaviorSubject }           from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxAppStateService {
    readySubject = new BehaviorSubject(false);
    ribbonSubject = new BehaviorSubject(false);
    footerVisibleSubject = new BehaviorSubject(true);
    headerVisibleSubject = new BehaviorSubject(true);
    systemAvailable$ = new BehaviorSubject(true);
    lastErrorStatus$ = new BehaviorSubject(undefined);

    // Header height is hardcoded everywhere to 48px :(
    // Ribbon height is 33px ... for one row
    // Do we have multiple row ribbon? -- TT
    heightWithRibbon = 'calc(100% - 81px)';
    heightWithoutRibbon = 'calc(100% - 48px)';
    altBackground = false;

    constructor() {}

    set footerVisibility(visible: boolean) {
        this.footerVisibleSubject.next(visible);
    }

    get footerVisibility() {
        return this.footerVisibleSubject.getValue();
    }

    set headerVisibility(visible: boolean) {
        this.headerVisibleSubject.next(visible);
    }

    get headerVisibility() {
        return this.headerVisibleSubject.getValue();
    }

    set ribbonVisibility(visible: boolean) {
        this.ribbonSubject.next(visible);
    }

    get ribbonVisibility() {
        return this.ribbonSubject.getValue();
    }

    set ready(ready: boolean) {
        this.readySubject.next(ready);
    }

    get ready() {
        return this.readySubject.getValue();
    }
}
