import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter, switchMap, takeUntil } from 'rxjs/operators';

/**
 * State manager to encapsulate state and state updating logic.
 *
 * @param getState - Function that returns observable that accepts getStateArguments$'s value as an argument
 * @param getStateArguments$ - Observable that contains argument for getting updated state
 * @param initialState - Optionally initialize with state
 */
export class StateManager<State, GetStateArgs> {
    private _state$ = new BehaviorSubject<State>(null);
    private tearDown$ = new Subject<void>();
    private _args$ = new BehaviorSubject<GetStateArgs>(null);

    state$ = this._state$.pipe(filter(state => state !== null));

    constructor(
        private getState: (args: GetStateArgs) => Observable<State>,
        getStateArguments$?: Observable<GetStateArgs>,
        initialState: State = null
    ) {
        this._state$.next(initialState);
        getStateArguments$
            .pipe(takeUntil(this.tearDown$))
            .subscribe(this._args$);
        this._args$
            .pipe(
                filter(args => args !== null),
                switchMap(args => this.getState(args)),
                takeUntil(this.tearDown$)
            ).subscribe(this._state$);
    }

    /**
     * Refresh state using previous arguments. Or if replace with new state.
     */
    // refreshState = (overrideState?: State) => overrideState !== undefined
    //     ? this._state$.next(overrideState)
    //     : this._args$.next(this._args$.value);
}
