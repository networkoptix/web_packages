import { Injectable } from '@angular/core';
import { Observable, Subject, timer } from 'rxjs';
import { concatMap, takeUntil } from 'rxjs/operators';

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
 * examplePoll.cancel();
 */
export class NxPollService {
    unsub$ = new Subject();

    ngOnDestroy(): void {
        this.unsub$.next('done');
    }

    cancel(): void {
        this.unsub$.next('done');
    }

    createPoll<T>(
        apiCall: () => Observable<T> | Promise<T>,
        intervalDelay: number
    ): Observable<any> {
        return timer(0, intervalDelay)
            .pipe(
                concatMap(apiCall),
                takeUntil(this.unsub$),
            );
    }
}
