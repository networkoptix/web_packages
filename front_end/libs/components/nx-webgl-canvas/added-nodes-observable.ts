import { Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { distinctUntilChanged, map, Observable, tap } from 'rxjs';

import { CheckIfAdded } from './render-state-model';

export class AddedNodesObservable extends Observable<CheckIfAdded> {
    getNotifierObservable = (
        selector: string,
        sideEffect?: (result: HTMLElement) => unknown,
    ): Observable<false | HTMLElement> =>
        this.pipe(
            map(check => check(selector)),
            tap(result => result && sideEffect?.(result)),
            distinctUntilChanged((a, b) => a === b),
        );

    getNotifierSignal = (
        selector: string,
        sideEffect?: (result: HTMLElement) => unknown,
    ): Signal<false | HTMLElement> =>
        toSignal(this.getNotifierObservable(selector, sideEffect), { initialValue: false });

    constructor(elementRef: Element = document.body) {
        super(subscriber => {
            const notify = (): void => {
                subscriber.next((selector: string) => {
                    const element = elementRef.querySelector(selector);
                    return element instanceof HTMLElement && element;
                });
            };
            notify();
            const observer = new MutationObserver(
                mutations =>
                    mutations.some(mutation => Array.from(mutation.addedNodes).length) && notify(),
            );
            observer.observe(elementRef, { childList: true, subtree: true });
            return () => observer.disconnect();
        });
    }
}
