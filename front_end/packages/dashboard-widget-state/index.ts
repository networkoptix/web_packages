import { BehaviorSubject, Observable } from 'rxjs';

import type { System } from './types';

/**
 * Shared State between dashboard widgets
 */
export class SharedWidgetState {
    state$ = new BehaviorSubject(0);

    increment = (val: number = 1): void => this.state$.next(this.state$.value + val);
    decrement = (val: number = 1): void => this.state$.next(this.state$.value - val);

    constructor(
        public systems$: Observable<System[]>,
        public updateSystems: () => Observable<System[]>,
        public navigateByUrl: (url) => Promise<boolean>,
    ) {}
}
