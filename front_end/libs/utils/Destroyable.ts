import { Subject, takeUntil, Observable } from 'rxjs';

/**
 * Provides generic way to clean up observables.
 */
export class Destroyable {
    #destroy$ = new Subject<string>();

    /**
     * Operator for cleaning up observables for classes where lifecycle isn't handled by angular.
     *
     * Example:
     *
     * someObervable.pipe(this.onDestroyed).subscribe()
     *
     * @param source Observable<T>
     * @returns Observable<T>
     */
    public onDestroyed = <T>(source: Observable<T>): Observable<T> =>
        source.pipe(takeUntil(this.#destroy$));

    /**
     * Triggers subject to clean up observables.
     */
    public destroy(): void {
        this.#destroy$.next('destroy');
    }
}
