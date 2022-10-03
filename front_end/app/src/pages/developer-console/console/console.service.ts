import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

export type TargetState = {
    id: number;
    download: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class NxConsoleService {
    #targetStateSubject$ = new BehaviorSubject<TargetState>(undefined);
    targetState$ = this.#targetStateSubject$.pipe(filter(val => val !== undefined));
    unsavedAssets = {};

    constructor() { }

    set targetState(value: TargetState) {
        this.#targetStateSubject$.next(value);
    }

    get targetState() {
        return this.#targetStateSubject$.getValue();
    }
}
