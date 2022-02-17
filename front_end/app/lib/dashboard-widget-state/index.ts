import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Shared State between dashboard widgets
 */
export class SharedWidgetState {
    state$ = new BehaviorSubject(0)

    increment = (val = 1) => this.state$.next(this.state$.value + val)
    decrement = (val = 1) => this.state$.next(this.state$.value - val)

    constructor(public systems$: Observable<System[]>, public navigateByUrl: (url) => Promise<boolean>) { }
}

export interface System {
    name: string;
    id: string;
    ownerAccountEmail: string;
    ownerFullName: string;
    systemName: string;
    isMine: boolean;
    capabilities: Record<any, any>;
    state: string;
    stateOfHealth: string;
    system2faEnabled: boolean;
    canMerge: boolean;
    cloudStorageCapable: boolean;
    isOnline: boolean;
    stateMessage: string;
}
