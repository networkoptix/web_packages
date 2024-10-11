import { Injectable } from '@angular/core';
import { frameRateTracker$ } from 'nx-open-web/packages/webrtc-stream-manager';
import {
    defer,
    filter,
    firstValueFrom,
    merge,
    mergeAll,
    Observable,
    Subject,
    take,
    timer,
} from 'rxjs';

interface WithDequeue {
    dequeue$: Observable<number>;
}

@Injectable({
    providedIn: 'root',
})
export class NxVideoPlayerQueueService {
    private maxConcurrency = 8;
    maxTime = 2_500;
    performanceTimeout = 250;

    private queue$ = new Subject<Observable<unknown>>();

    async queue(target: WithDequeue): Promise<void> {
        const queueStart$ = new Subject<unknown>();
        const queueReady = firstValueFrom(queueStart$);
        this.queue$.next(
            defer(() => {
                merge(
                    timer(this.performanceTimeout),
                    frameRateTracker$.pipe(
                        filter(({ fps, maxFps }) => fps > (maxFps < 60 ? 30 : 20)),
                    ),
                )
                    .pipe(take(1))
                    .subscribe({
                        complete: () => {
                            queueStart$.next(Date.now());
                        },
                    });
                return merge(target.dequeue$.pipe(filter(Boolean)), timer(this.maxTime)).pipe(
                    take(1),
                );
            }),
        );
        await queueReady;
    }

    constructor() {
        this.queue$.pipe(mergeAll(this.maxConcurrency)).subscribe();
    }
}
