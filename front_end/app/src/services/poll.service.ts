import { BehaviorSubject, concat, of } from 'rxjs';
import { concatMap, delay, skip, tap } from 'rxjs/operators';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NxPollService {
    constructor() {}

    createPoll (apiCall, intervalDelay) {
        const load$ = new BehaviorSubject('');
        const refresh$ = of('').pipe(
            delay(intervalDelay),
            tap(_ => load$.next('')),
            skip(1));

        const poll$ = concat(apiCall, refresh$);

        return load$.pipe(concatMap(_ => poll$));
    }
}
