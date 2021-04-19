import { Injectable }                        from '@angular/core';
import { Observable, defer, Subject, timer } from 'rxjs';
import { concatMap, map, takeUntil }              from 'rxjs/operators';

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
    unsub$ = new Subject();
    constructor() {
    }

    ngOnDestroy() {
        this.unsub$.next('done');
    }

    createPoll<T>(apiCall: () => Observable<T> | Promise<T>, intervalDelay: number): Observable<any> {
        return timer(0, intervalDelay).pipe(
            takeUntil(this.unsub$),
            map(apiCall)
        );
    }
}
