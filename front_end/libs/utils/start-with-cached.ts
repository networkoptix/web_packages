import { OperatorFunction, concat, identity, Observable, from, filter, tap } from 'rxjs';
import stringify from 'safe-stable-stringify';

import { nxConfig } from '@services/nx-config/config';

import { db } from '../db';

let user: string;

/**
 * We reload the whole app when the user changes.
 * If we ever change that then we should check localStorage each time.
 */
const getUser = (): string => {
    user ??= window.localStorage.getItem('ngx-webstorage|loginstate');
    return user;
};

const encrypt = (val: string): string => {
    // TODO: Use a real encryption method.
    // Will probably use public-key encryption that way private keys can be tied to a session so they won't be accessible from XSS attacks or once the user logs off.
    return getUser() + btoa(unescape(encodeURIComponent(val)));
};

const decrypt = (val: string): string => {
    // TODO: Use a real decryption method
    return decodeURIComponent(escape(atob(val.replace(getUser(), ''))));
};

const dehashify = <T>(hash: string): T => JSON.parse(decrypt(hash));

const hashify = <T>(val: T): string => encrypt(stringify(val));

const getCachedResponse = <T>(requestArgs: string): Observable<T> => from(db.cachedRequest.where('[requestArgs+user]').equals([requestArgs, encrypt(getUser())]).first(request => dehashify(request.response)).catch(() => null)).pipe(
    filter(response => !!response),
    tap(response => console.log(`${getUser()} - ${requestArgs}: ${response}`))
);

const saveResponse = (requestArgs: string, response: string): Promise<string> => db.cachedRequest.put({
    requestArgs,
    response,
    user: encrypt(getUser()),
    lastUpdate: Date.now()
});

const saveHandlerFactory = (key: string) => <T>(val: T) => {
    try {
        saveResponse(key, hashify(val));
    } catch (e) {
        // Skip hashable response
        console.info(e);
    }
};

const sanitizerFactory = (checkKey: (val: string) => boolean, checkVal: (val: string) => boolean) => function sanitizer(toSanitize: unknown): unknown {
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

const hashArgs = (...args: unknown[]): string => hashify(
    sanitizerFactory(
        key => !['auth', 'authorization', 'code', 'refreshToken', 'accessToken'].includes(key.toLowerCase()),
        val => !val.includes('nxcdb')
    )(args)
);

export function startWithCache<T>(...argsForKey: unknown[]): OperatorFunction<T, T> {
    if (!nxConfig.featureFlags.requestCaching) {
        return identity;
    }

    try {
        const key = hashArgs(...argsForKey);
        return function <T>(source: Observable<T>): Observable<T> {
            return concat(
                getCachedResponse<T>(key),
                source.pipe(
                    tap(saveHandlerFactory(key))
                )
            );
        };
    } catch (e) {
        // Skip unhashable arguments
        console.info(e);
        return identity;
    }
}
