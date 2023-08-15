import { Injectable } from '@angular/core';
import { BehaviorSubject, fromEvent } from 'rxjs';
import { debounceTime, shareReplay, take } from 'rxjs/operators';

@Injectable({
    providedIn: 'root',
})
export class NxAppStateService {
    readySubject = new BehaviorSubject(false);
    authorizeSubject = new BehaviorSubject(false);
    ribbonSubject = new BehaviorSubject(false);
    headerContainerHeight$ = new BehaviorSubject(48);
    footerVisibleSubject = new BehaviorSubject(true);
    headerVisibleSubject = new BehaviorSubject(true);
    systemAvailable$ = new BehaviorSubject(true);
    lastErrorStatus$ = new BehaviorSubject<number>(undefined);
    // eslint-disable-next-line nx/ban-global-variables
    userInteracted$ = fromEvent(document, 'click').pipe(
        take(1),
        shareReplay({ bufferSize: 1, refCount: false }),
    );
    appContainerHeight = 'calc(100% - 48px)';
    altBackground = false;

    constructor() {
        this.headerContainerHeight$.pipe(debounceTime(50)).subscribe(value => {
            this.appContainerHeight = `calc(100% - ${value}px)`;
        });
    }

    set footerVisibility(visible: boolean) {
        this.footerVisibleSubject.next(visible);
    }

    get footerVisibility(): boolean {
        return this.footerVisibleSubject.getValue();
    }

    set headerVisibility(visible: boolean) {
        this.headerVisibleSubject.next(visible);
    }

    get headerVisibility(): boolean {
        return this.headerVisibleSubject.getValue();
    }

    set ribbonVisibility(visible: boolean) {
        this.ribbonSubject.next(visible);
    }

    get ribbonVisibility(): boolean {
        return this.ribbonSubject.getValue();
    }

    set ready(ready: boolean) {
        this.readySubject.next(ready);
    }

    get ready(): boolean {
        return this.readySubject.getValue();
    }

    // TODO: Remove as not used
    // set authorizing(authorize: boolean) {
    //     this.authorizeSubject.next(authorize);
    // }
    //
    // get authorizing() {
    //     return this.authorizeSubject.getValue();
    // }
}
