import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable, Subject } from 'rxjs';
import { catchError, switchMap, shareReplay, take, debounceTime } from 'rxjs/operators';

import { apiBase } from '@lib/variables/static-variables';

interface MappingCallbackFn<T> {
    (current: T): T | Promise<T> | Observable<T>
}

export class CustomAccountProperty<T> {
    static INSTANCES: Record<string, CustomAccountProperty<unknown>> = {};
    #endpoint: string;
    #value$ = new BehaviorSubject<T>(null);

    value$: Observable<T>;

    static getInstance<T>(
        http: HttpClient,
        property: string,
        initialValue: T,
        username: string,
        targetInstance: string
    ): CustomAccountProperty<T> {
        if (CustomAccountProperty.INSTANCES[property]) {
            CustomAccountProperty.INSTANCES[property].get(true, true);
        } else {
            CustomAccountProperty.INSTANCES[property] = new CustomAccountProperty(http, property, initialValue, username, targetInstance);
        }
        return CustomAccountProperty.INSTANCES[property] as CustomAccountProperty<T>;
    }

    constructor(
        private http: HttpClient,
        property: string,
        initialValue: T,
        username: string,
        targetInstance: string
    ) {
        this.#endpoint = `${targetInstance}${apiBase}/custom-properties/${property}${username ? '/' + username : ''}`;
        const updater$ = new Subject<T>();

        const saveValue = (val: T): Promise<T> => {
            updater$.next(val);
            return Promise.resolve(val);
        };

        const getValue = (): Observable<T> => this.http.get<T>(this.#endpoint).pipe(
            catchError(() => saveValue(initialValue))
        );

        updater$.pipe(
            debounceTime(1500),
            switchMap(val => this.http.post<T>(this.#endpoint, val))
        ).subscribe();

        this.value$ = this.#value$.pipe(
            switchMap(val => val
                ? saveValue(val)
                : getValue()
            ),
            shareReplay({ bufferSize: 1, refCount: false })
        );
    }

    get(forceUpdate?: boolean): Observable<T>;
    get(forceUpdate: boolean, toPromise: false): Observable<T>;
    get(forceUpdate: boolean, toPromise: true): Promise<T>;
    get(forceUpdate = false, toPromise = false): unknown {
        if (forceUpdate) {
            this.#value$.next(null);
        }
        return toPromise ? firstValueFrom(this.value$) : this.value$;
    }

    save(payload: T): Observable<T>;
    save(payload: T, toPromise: false): Observable<T>;
    save(payload: T, toPromise: true): Promise<T>;
    save(payload: T, toPromise = false): unknown {
        this.#value$.next(payload);
        return toPromise ? firstValueFrom(this.value$) : this.value$;
    }

    update(mappingCallback: MappingCallbackFn<T>): Observable<T>;
    update(mappingCallback: MappingCallbackFn<T>, toPromise: false): Observable<T>;
    update(mappingCallback: MappingCallbackFn<T>, toPromise: true): Promise<T>;
    update(mappingCallback: MappingCallbackFn<T>, toPromise = false): unknown {
        const observable = this.value$.pipe(
            take(1),
            switchMap(async current => {
                const result = mappingCallback(current);
                return result instanceof Observable ? firstValueFrom(result) : result;
            }),
            switchMap(updated => this.save(updated))
        );

        return toPromise ? firstValueFrom(observable) : observable;
    }
}
