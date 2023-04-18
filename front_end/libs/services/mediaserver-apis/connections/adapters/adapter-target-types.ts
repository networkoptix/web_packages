import { Observable } from 'rxjs';

/**
 * Defines our current api connection methods. This is used to move the endpoint definitions out of the classes.
 */
export abstract class MediaserverBaseConnection {
    protected readonly notImplementedMsg: string;
    protected abstract post<ResponseType = unknown>(
        url: string,
        data?: Record<string, unknown>,
        paramsToAdd?: Record<string, unknown>,
        customHeaders?: Record<string, unknown>,
        customTimeout?: number,
    ): Observable<ResponseType>;
    protected abstract get<ResponseType = unknown>(
        url: string,
        params?: Record<string, unknown>,
        customHttpHeaders?: Record<string, unknown>,
        requestTimeout?: number,
    ): Observable<ResponseType>;
    protected patch?<ResponseType = unknown>(
        url: string,
        data?: Record<string, unknown>,
        paramsToAdd?: Record<string, unknown>,
        customTimeout?: number,
    ): Observable<ResponseType>;
    protected put?<ResponseType = unknown>(
        url: string,
        data?: Record<string, unknown>,
        paramsToAdd?: Record<string, unknown>,
        customTimeout?: number,
    ): Observable<ResponseType>;
    protected delete?<ResponseType = unknown>(
        url: string,
        params?: Record<string, unknown>,
        customHttpHeaders?: Record<string, unknown>,
        requestTimeout?: number,
    ): Observable<ResponseType>;
}

/**
 * Typing legacy and rest versions this way is only required when the api classes inherit from each other.
 *
 * Once the classes are decoupled we can update these classes to have the correct typing.
 */
export abstract class MediaserverLegacyConnection extends MediaserverBaseConnection {}

/**
 * Typing legacy and rest versions this way is only required when the api classes inherit from each other.
 *
 * Once the classes are decoupled we can update these classes to have the correct typing.
 */
export abstract class MediaserverRestConnection
    extends MediaserverLegacyConnection
    implements Required<MediaserverBaseConnection> {}
