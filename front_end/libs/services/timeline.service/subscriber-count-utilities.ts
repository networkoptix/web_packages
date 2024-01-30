import { Observable, Subscriber } from 'rxjs';

import { SubscriberCount } from './timeline-service.types';

export const registerSubscriberCountUpdater = <T>(
    sourceObservable: Observable<T>,
    subscriberCount: SubscriberCount,
    key: string,
): Observable<T> =>
    new Observable((subscriber: Subscriber<T>) => {
        const subscription = sourceObservable.subscribe(subscriber);
        subscriberCount[key]++;
        subscriberCount.totalSubscribers++;

        return () => {
            subscription.unsubscribe();
            subscriberCount[key]--;
            subscriberCount.totalSubscribers--;
        };
    });
