import { Injectable }                from '@angular/core';
import { BehaviorSubject }           from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxAppStateService {
    private readySubject = new BehaviorSubject(false);
    private ribbonSubject = new BehaviorSubject(false);

    footerVisibleSubject = new BehaviorSubject(true);
    headerVisibleSubject = new BehaviorSubject(true);
    systemAvailable$ = new BehaviorSubject(true);
    lastErrorStatus$ = new BehaviorSubject(undefined);

    // Header height is hardcoded everywhere to 48px :(
    // Ribbon height is 33px ... for one row
    // Do we have multiple row ribbon? -- TT
    heightWithRibbon = 'calc(100% - 81px)';
    heightWithoutRibbon = 'calc(100% - 48px)';

    constructor() {}

    setFooterVisibility(visible: boolean) {
        this.footerVisibleSubject.next(visible);
    }

    setHeaderVisibility(visible: boolean) {
        this.headerVisibleSubject.next(visible);
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
