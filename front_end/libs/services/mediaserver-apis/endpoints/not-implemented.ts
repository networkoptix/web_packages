import { Observable } from 'rxjs';

import { MediaserverLegacyConnection } from '../connections/adapters/adapter-target-types';

/**
 * Used to mark methods as not implemented.
 *
 * Temporary solution to avoid type errors until new mediaserver classes are implemented.
 *
 * @param message - Custom error to throw
 * @returns Thows error
 */
export function notImplementedCustomMessage<T = unknown>(message?: string) {
    return function (this: MediaserverLegacyConnection, ...args: unknown[]): Observable<T> {
        throw new Error(
            message || this.notImplementedMsg || 'This method not implemented for this version',
        );
    };
}

/**
 * Used to mark methods as not implemented.
 *
 * Temporary solution to avoid type errors until new mediaserver classes are implemented.
 *
 * @param message - Custom error to throw
 * @returns Thows error
 */
export const notImplemented = notImplementedCustomMessage();
