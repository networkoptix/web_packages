import { Injectable }                from '@angular/core';
import { BehaviorSubject }           from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class NxAppStateService {

    footerVisibleSubject = new BehaviorSubject(true);
    headerVisibleSubject = new BehaviorSubject(true);
    private readySubject = new BehaviorSubject(false);
    systemAvailable$ = new BehaviorSubject(true);
    lastErrorStatus$ = new BehaviorSubject(undefined);

    constructor() {}

    setFooterVisibility(visible: boolean) {
        this.footerVisibleSubject.next(visible);
    }

    setHeaderVisibility(visible: boolean) {
        this.headerVisibleSubject.next(visible);
    }

    set ready(ready: boolean) {
        this.readySubject.next(ready);
    }

    get ready() {
        return this.readySubject.getValue();
    }
}
