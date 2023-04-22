import { OperatorFunction, concat, identity, Observable, from, filter, tap } from 'rxjs';
import stringify from 'safe-stable-stringify';

import { NxDbService } from '@services/db.service';
import { nxConfig } from '@services/nx-config/config';

// import { getUser } from './user';

const getCachedResponse = <T>(requestArgs: string): Observable<T> =>
    from(
        NxDbService.personal.cachedRequest
            .where({ requestArgs })
            .first(request => request.response as T)
            .catch(() => null),
    ).pipe(
        filter(response => !!response),
        // tap(response => console.log(`${getUser()} - ${requestArgs}: ${response}`)),
    );

const saveResponse = <T>(requestArgs: string, response: T): Promise<string> =>
    NxDbService.personal.cachedRequest.put({
        requestArgs,
        response,
        lastUpdate: Date.now(),
    });

const saveHandlerFactory = (key: string) =>
    async function saveHandler<T>(val: T) {
        try {
            await saveResponse(key, val);
        } catch (e) {
            // Skip hashable response
            console.info(e);
        }
    };

const sanitizerFactory = (checkKey: (val: string) => boolean, checkVal: (val: string) => boolean) =>
    function sanitizer(toSanitize: unknown): unknown {
        if (Array.isArray(toSanitize)) {
            // Recursively sanitize array
            return toSanitize.map(sanitizer);
        }

        if (typeof toSanitize === 'string') {
            // Sanitize final values
            return checkVal(toSanitize) ? toSanitize : '***';
        }

        if (typeof toSanitize === 'object' && toSanitize !== null) {
            // Recursively sanitize object
            return Object.entries(toSanitize).reduce((acc, [key, val]) => {
                if (checkKey(key)) {
                    acc[key] = sanitizer(val);
                }
                return acc;
            }, {});
        }

        return toSanitize;
    };

const sanitizer = sanitizerFactory(
    key =>
        !['auth', 'authorization', 'code', 'refreshToken', 'accessToken'].includes(
            key.toLowerCase(),
        ),
    val => !val.includes('nxcdb'),
);

export function startWithCache<T>(...argsForKey: unknown[]): OperatorFunction<T, T> {
    if (!nxConfig.featureFlags.requestCaching) {
        return identity;
    }

    try {
        const key = stringify(sanitizer(argsForKey));
        return function <T>(source: Observable<T>): Observable<T> {
            return concat(getCachedResponse<T>(key), source.pipe(tap(saveHandlerFactory(key))));
        };
    } catch (e) {
        // Skip unhashable arguments
        console.info(e);
        return identity;
    }
}
