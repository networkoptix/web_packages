import { BehaviorSubject, concat, Observable, of, interval, defer } from 'rxjs';
import { concatMap, delay, skip, tap }             from 'rxjs/operators';
import { Injectable }                              from '@angular/core';

@Injectable({
    providedIn: 'root'
})
/*
 * How to use the poll service.
 *
 * Declaring the poll.
 * const examplePoll = this.pollService.createPoll(this.cloudApi.systems(), 10000);
 * After the observable resolves it will make the call again in 10 seconds.
 *
 * To start the poll subscribe to it.
 * const currentSubscription = examplePoll.subscribe((data: T) => { console.log(data); });
 *
 * Stopping the poll.
 * currentSubscription.unsubscribe();
 *
 * To completely kill the poll.
 * examplePoll.unsubscribe();
 */
export class NxPollService {
    constructor() {
    }

    createPoll<T>(apiCall: () => Observable<T>, intervalDelay: number): Observable<T | string> {
        const load$    = new BehaviorSubject('');
        const refresh$ = of('').pipe(
            delay(intervalDelay),
            tap(_ => load$.next(''))
        );

        const poll$ = concat(defer(apiCall), refresh$);

        return load$.pipe(skip(1), concatMap(_ => poll$));
    }
}
